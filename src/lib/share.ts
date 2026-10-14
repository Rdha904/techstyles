import {
  productSections,
  type Product,
  type ProductSection,
  type ProductSnapshot,
} from "./types";
import { snapshot } from "./store";
const redactions: Record<ProductSection, (content: ProductSnapshot) => void> = {
  overview: (content) => {
    Object.assign(content, {
      category: "",
      stage: "",
      baseSize: "",
      project: "",
      description: "",
      cover: "",
    });
  },
  sketch: (content) => {
    Object.assign(content, {
      sketch: "",
      mockup: "",
      annotations: [],
      cover: "",
    });
  },
  colorways: (content) => {
    content.colors = [];
  },
  bom: (content) => {
    content.materials = [];
  },
  artworks: (content) => {
    content.artworks = [];
  },
  instructions: (content) => {
    content.instructions = "";
  },
  sizes: (content) => {
    content.measurements = [];
  },
  attachments: (content) => {
    content.attachments = [];
  },
  samplings: (content) => {
    content.samples = [];
  },
  packaging: (content) => {
    content.labels = "";
  },
  // snapshot() already strips versions from shared payloads.
  versions: () => {},
};
export function sharedProduct(product: Product) {
  const content = snapshot(product);
  content.comments = [];
  const excluded = new Set(content.excludedSections);
  for (const section of productSections)
    if (excluded.has(section)) redactions[section](content);
  return {
    ...content,
    id: product.id,
    createdAt: product.createdAt,
    updatedAt: product.updatedAt,
  };
}
