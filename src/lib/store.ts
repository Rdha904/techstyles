import path from "node:path";
import { randomUUID } from "node:crypto";
import type {
  Product,
  ProductSnapshot,
  LibraryItem,
  Manufacturer,
  QuoteRequest,
} from "./types";
import type { BrandBook, BrandProfile } from "./brand-types";

/** Everything that belongs to one workspace (one brand / customer). */
export interface WorkspaceData {
  brandProfile?: BrandProfile | null;
  brandBook?: BrandBook | null;
  products: Product[];
  manufacturers: Manufacturer[];
  quoteRequests: QuoteRequest[];
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
    techPackUpdatedAt: now,
  };
}
export function findProduct(database: WorkspaceData, id: string) {
  const product = database.products.find((item) => item.id === id);
  if (!product) throw new ApiError("Product not found", 404);
  return product;
}
const snapshotFields = new Set<keyof ProductSnapshot>([
  "name",
  "code",
  "category",
  "stage",
  "baseSize",
  "project",
  "description",
  "cover",
  "sketch",
  "mockup",
  "instructions",
  "labels",
  "colors",
  "materials",
  "measurements",
  "comments",
  "annotations",
  "attachments",
  "artworks",
  "samples",
  "excludedSections",
  "archived",
  "measurementUnit",
]);
export function snapshot(product: Product): ProductSnapshot {
  return structuredClone(
    Object.fromEntries(
      Object.entries(product).filter(([key]) =>
        snapshotFields.has(key as keyof ProductSnapshot),
      ),
    ),
  ) as unknown as ProductSnapshot;
}
