export const productSections = [
  "overview",
  "sketch",
  "colorways",
  "bom",
  "artworks",
  "instructions",
  "sizes",
  "attachments",
  "samplings",
  "packaging",
  "versions",
] as const;
export type ProductSection = (typeof productSections)[number];

export const libraryCollections = [
  "projects",
  "sketches",
  "materials",
  "artworks",
  "colors",
  "size-charts",
  "attachments",
] as const;
export type LibraryCollection = (typeof libraryCollections)[number];

export interface ProductColor {
  id: string;
  name: string;
  hex: string;
  image?: string;
}
export interface Material {
  id: string;
  name: string;
  composition: string;
  weight: string;
  supplier: string;
  placement: string;
}
export interface Measurement {
  id: string;
  name: string;
  tolerance: string;
  values: Record<string, string>;
}
export interface ProductComment {
  id: string;
  section: string;
  author: string;
  text: string;
  createdAt: string;
}
export interface Annotation {
  id: string;
  x: number;
  y: number;
  x2?: number;
  y2?: number;
  text: string;
}
export interface ProductAsset {
  id: string;
  name: string;
  url: string;
}
export interface ProductSample {
  id: string;
  size: string;
  color: string;
  quantity: number;
  status: string;
}
export interface ProductSnapshot {
  name: string;
  code: string;
  category: string;
  stage: string;
  baseSize: string;
  project: string;
  description: string;
  cover: string;
  sketch: string;
  mockup: string;
  instructions: string;
  labels: string;
  colors: ProductColor[];
  materials: Material[];
  measurements: Measurement[];
  comments: ProductComment[];
  annotations: Annotation[];
  attachments: ProductAsset[];
  artworks: ProductAsset[];
  samples: ProductSample[];
  excludedSections: ProductSection[];
  archived: boolean;
  measurementUnit: "cm" | "in";
}
export interface ProductVersion {
  id: string;
  name: string;
  createdAt: string;
  snapshot: ProductSnapshot;
}
export interface Product extends ProductSnapshot {
  id: string;
  createdAt: string;
  updatedAt: string;
  versions: ProductVersion[];
  shareToken: string | null;
  manufacturerId: string | null;
  techPackUpdatedAt: string;
}
export interface LibraryItem {
  id: string;
  collection: string;
  name: string;
  description: string;
  color: string;
  data: Record<string, unknown>;
  createdAt: string;
}

export interface Manufacturer {
  id: string;
  name: string;
  contactName: string;
  email: string;
  phone: string;
  location: { country: string; city: string };
  categories: string[];
  typicalMoq: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface Quote {
  unitPrice: number;
  currency: string;
  moq: number | null;
  productionLeadTimeDays: number | null;
  sampleCost: number | null;
  sampleLeadTimeDays: number | null;
  receivedAt: string;
  notes: string;
  attachment: { name: string; url: string } | null;
}
export type QuoteRequestStatus =
  "draft" | "sent" | "quoted" | "chosen" | "declined";
export type QuoteRequestAction =
  "send" | "decline" | "reopen" | "choose" | "unchoose";
export interface QuoteRequest {
  id: string;
  productId: string;
  manufacturerId: string;
  status: QuoteRequestStatus;
  sentAt: string | null;
  quote: Quote | null;
  createdAt: string;
  updatedAt: string;
}
