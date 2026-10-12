import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import type { Product, ProductSnapshot, LibraryItem } from "./types";

import type { BrandProfile } from "./brand-types";

export interface Database {
  brandProfile?: BrandProfile | null;
  products: Product[];
  libraries: LibraryItem[];
}
export const dataDirectory =
  process.env.TECHSTYLES_DATA_DIR || path.join(process.cwd(), "data");
const databasePath = path.join(dataDirectory, "workspace.json");
const globalStore = globalThis as typeof globalThis & {
  techstylesWrites?: Promise<unknown>;
};
export class ApiError extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}
export function emptyProduct(): Product {
  const now = new Date().toISOString();
  return {
    id: randomUUID(),
    name: "Untitled product",
    code: "",
    category: "Hoodie",
    stage: "Draft",
    baseSize: "M",
    measurementUnit: "cm",
    project: "",
    supplier: "",
    description: "",
    cover: "",
    sketch: "",
    mockup: "",
    instructions: "",
    labels: "",
    colors: [],
    materials: [],
    measurements: [],
    comments: [],
    annotations: [],
    attachments: [],
    artworks: [],
    samples: [],
    excludedSections: [],
    archived: false,
    versions: [],
    shareToken: null,
    createdAt: now,
    updatedAt: now,
  };
}
function seed(): Database {
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
async function readDatabase(): Promise<Database> {
  try {
    const database = JSON.parse(
      await readFile(databasePath, "utf8"),
    ) as Database;
    for (const product of database.products) {
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
    return database;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return seed();
    throw error;
  }
}
async function persist(database: Database) {
  await mkdir(dataDirectory, { recursive: true });
  const temporary = `${databasePath}.${randomUUID()}.tmp`;
  await writeFile(temporary, JSON.stringify(database, null, 2), {
    mode: 0o600,
  });
  await rename(temporary, databasePath);
}
export function transaction<T>(
  operation: (database: Database) => T | Promise<T>,
): Promise<T> {
  const pending = (globalStore.techstylesWrites || Promise.resolve())
    .catch(() => undefined)
    .then(async () => {
      const database = await readDatabase();
      const result = await operation(database);
      await persist(database);
      return result;
    });
  globalStore.techstylesWrites = pending;
  return pending;
}
export async function getDatabase() {
  await (globalStore.techstylesWrites || Promise.resolve()).catch(
    () => undefined,
  );
  return readDatabase();
}
export function findProduct(database: Database, id: string) {
  const product = database.products.find((item) => item.id === id);
  if (!product) throw new ApiError("Product not found", 404);
  return product;
}
export function snapshot(product: Product): ProductSnapshot {
  const {
    id: _id,
    createdAt: _created,
    updatedAt: _updated,
    versions: _versions,
    shareToken: _token,
    ...content
  } = product;
  void _id;
  void _created;
  void _updated;
  void _versions;
  void _token;
  return structuredClone(content);
}
