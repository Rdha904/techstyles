import type { Product } from "./types";
import { snapshot } from "./store";
export function sharedProduct(product: Product) {
  const content = snapshot(product);
  content.comments = [];
  const excluded = new Set(content.excludedSections);
  if (excluded.has("overview"))
    Object.assign(content, {
      category: "",
      stage: "",
      baseSize: "",
      project: "",
      supplier: "",
      description: "",
      cover: "",
    });
  if (excluded.has("sketch"))
    Object.assign(content, {
      sketch: "",
      mockup: "",
      annotations: [],
      cover: "",
    });
  if (excluded.has("colorways")) content.colors = [];
  if (excluded.has("bom")) content.materials = [];
  if (excluded.has("artworks")) content.artworks = [];
  if (excluded.has("instructions")) content.instructions = "";
  if (excluded.has("sizes")) content.measurements = [];
  if (excluded.has("attachments")) content.attachments = [];
  if (excluded.has("samplings")) content.samples = [];
  if (excluded.has("packaging")) content.labels = "";
  return {
    ...content,
    id: product.id,
    createdAt: product.createdAt,
    updatedAt: product.updatedAt,
  };
}
