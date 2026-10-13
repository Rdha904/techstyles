import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import type { LibraryItem, Product } from "./types";
import { dataDirectory, emptyProduct, type WorkspaceData } from "./store";
import { DEFAULT_WORKSPACE_ID } from "./workspace";
import type { WorkspaceRepository } from "./repository";

/** On-disk format. Version 1 files stored one workspace at the top level. */
interface DatabaseFile {
  version: 2;
  workspaces: Record<string, WorkspaceData>;
}

const databasePath = path.join(dataDirectory, "workspace.json");
const globalStore = globalThis as typeof globalThis & {
  techstylesWrites?: Promise<unknown>;
};

function seed(): WorkspaceData {
  const hoodie = emptyProduct();
  Object.assign(hoodie, {
    id: "demo-hoodie",
    name: "Hoodie",
    code: "HOO-HOO-56J",
    category: "Hoodies",
    stage: "Sampling",
    project: "",
    description: "80/20 Fleece Hoodie",
    mockup: "/sites/techstyles/hero-mockup-hoodie.jpg",
    cover: "/sites/techstyles/hero-sketch-hoodie.png",
    sketch: "/sites/techstyles/hero-sketch-hoodie.png",
    instructions:
      "Double needle stitching at hems. Reinforce pocket corners. Pre-shrink fabric before cutting.",
    labels:
      "Woven main label at center back neck. Care label at left side seam.",
    colors: [
      { id: "color-1", name: "YELLOW", hex: "#f6e24a" },
      { id: "color-2", name: "Black", hex: "#2c2c2e" },
    ],
    materials: [
      {
        id: "mat-1",
        name: "Cotton-Polyester Brushed Fleece",
        composition: "80% Cotton, 20% Recycled Polyester",
        weight: "320 GSM",
        supplier: "",
        placement: "Hood, body and sleeves",
      },
      {
        id: "mat-2",
        name: "Cotton-Polyester 2x2 Rib Knit",
        composition: "80% Cotton, 20% Polyester",
        weight: "360 GSM",
        supplier: "",
        placement: "Cuffs and hem",
      },
      {
        id: "mat-3",
        name: "Polyester Embroidery Thread",
        composition: "100% Polyester",
        weight: "",
        supplier: "",
        placement: "Front embroidery",
      },
    ],
    measurements: [
      {
        id: "measure-1",
        name: "Body length",
        tolerance: "±1",
        values: { XS: "64", S: "66", M: "68", L: "70", XL: "72" },
      },
      {
        id: "measure-2",
        name: "Chest width",
        tolerance: "±1",
        values: { XS: "54", S: "57", M: "60", L: "63", XL: "66" },
      },
      {
        id: "measure-3",
        name: "Sleeve length",
        tolerance: "±0.5",
        values: { XS: "57", S: "58", M: "59", L: "60", XL: "61" },
      },
    ],
  });
  const libraries: LibraryItem[] = hoodie.materials.map((material, index) => ({
    id: `demo-library-material-${index + 1}`,
    collection: "materials",
    name: material.name,
    description: material.placement,
    color: "",
    createdAt: hoodie.createdAt,
    data: {
      type: index === 2 ? "Thread" : "Fabric",
      composition: material.composition,
      gsm: material.weight,
      supplier: material.supplier,
      placement: material.placement,
    },
  }));
  libraries.push(
    ...hoodie.colors.map((color) => ({
      id: `demo-library-${color.id}`,
      collection: "colors",
      name: color.name,
      description: "",
      color: color.hex,
      data: {},
      createdAt: hoodie.createdAt,
    })),
  );
  libraries.push(
    {
      id: "demo-library-hoodie-sketch",
      collection: "sketches",
      name: "Hoodie",
      description: "80/20 Fleece Hoodie — technical flat",
      color: "",
      data: { url: hoodie.sketch },
      createdAt: hoodie.createdAt,
    },
    {
      id: "demo-library-hoodie-size-chart",
      collection: "size-charts",
      name: "Hoodie",
      description: "Relaxed fit hoodie measurements",
      color: "",
      data: {
        unit: "cm",
        sizes: "XS,S,M,L,XL",
        measurements: hoodie.measurements
          .map(
            (measurement) =>
              `${measurement.name}: ${["XS", "S", "M", "L", "XL"].map((size) => measurement.values[size]).join(", ")}`,
          )
          .join("\n"),
      },
      createdAt: hoodie.createdAt,
    },
  );
  return { products: [hoodie], libraries };
}

function normalize(data: WorkspaceData) {
  for (const product of data.products) {
    const defaults = {
      measurementUnit: "cm" as const,
      attachments: [],
      artworks: [],
      samples: [],
      excludedSections: [],
      archived: false,
    };
    Object.assign(product, { ...defaults, ...product });
    for (const version of product.versions)
      version.snapshot = { ...defaults, ...version.snapshot };
  }
  return data;
}
async function readFileDatabase(): Promise<DatabaseFile> {
  try {
    const raw = JSON.parse(await readFile(databasePath, "utf8"));
    if (raw.version === 2) {
      const file = raw as DatabaseFile;
      for (const data of Object.values(file.workspaces)) normalize(data);
      return file;
    }
    // Migrate the version 1 single-workspace file.
    return {
      version: 2,
      workspaces: { [DEFAULT_WORKSPACE_ID]: normalize(raw as WorkspaceData) },
    };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT")
      return { version: 2, workspaces: {} };
    throw error;
  }
}
async function persist(file: DatabaseFile) {
  await mkdir(dataDirectory, { recursive: true });
  const temporary = `${databasePath}.${randomUUID()}.tmp`;
  await writeFile(temporary, JSON.stringify(file, null, 2), { mode: 0o600 });
  await rename(temporary, databasePath);
}
function workspaceOf(file: DatabaseFile, workspaceId: string) {
  return (file.workspaces[workspaceId] ??=
    workspaceId === DEFAULT_WORKSPACE_ID
      ? seed()
      : { brandProfile: null, products: [], libraries: [] });
}
function settled() {
  return (globalStore.techstylesWrites || Promise.resolve()).catch(
    () => undefined,
  );
}

/** Single-process JSON file storage. Writes are serialized and committed by atomic rename. */
export class JsonWorkspaceRepository implements WorkspaceRepository {
  async read(workspaceId: string) {
    await settled();
    return workspaceOf(await readFileDatabase(), workspaceId);
  }
  update<T>(
    workspaceId: string,
    operation: (data: WorkspaceData) => T | Promise<T>,
  ): Promise<T> {
    const pending = settled().then(async () => {
      const file = await readFileDatabase();
      const result = await operation(workspaceOf(file, workspaceId));
      await persist(file);
      return result;
    });
    globalStore.techstylesWrites = pending;
    return pending;
  }
  async findProductByShareToken(token: string): Promise<Product | null> {
    await settled();
    const file = await readFileDatabase();
    for (const data of Object.values(file.workspaces)) {
      const product = data.products.find((item) => item.shareToken === token);
      if (product) return product;
    }
    return null;
  }
}
