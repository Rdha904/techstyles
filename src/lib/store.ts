import path from "node:path";
import { randomUUID } from "node:crypto";
import type {
  Product,
  ProductSnapshot,
  LibraryItem,
  Manufacturer,
} from "./types";
import type { BrandBook, BrandProfile } from "./brand-types";

/** Everything that belongs to one workspace (one brand / customer). */
export interface WorkspaceData {
  brandProfile?: BrandProfile | null;
  brandBook?: BrandBook | null;
  products: Product[];
  manufacturers: Manufacturer[];
  libraries: LibraryItem[];
}
export const dataDirectory =
  process.env.TECHSTYLES_DATA_DIR || path.join(process.cwd(), "data");
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
    manufacturerId: null,
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
export function findProduct(database: WorkspaceData, id: string) {
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
    manufacturerId: _manufacturer,
    supplier: _supplier,
    ...content
  } = product as Product & { supplier?: unknown };
  void _id;
  void _created;
  void _updated;
  void _versions;
  void _token;
  void _manufacturer;
  void _supplier;
  return structuredClone(content);
}
