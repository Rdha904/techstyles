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
  supplier: string;
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
  excludedSections: string[];
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
