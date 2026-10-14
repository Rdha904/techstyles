import { randomBytes, randomUUID } from "node:crypto";
import { ApiError, snapshot } from "./store";
import type { Product } from "./types";

export const productVersionLimit = 50;

export function saveVersion(
  product: Product,
  name: string,
  now?: string,
): Product {
  product.versions.unshift({
    id: randomUUID(),
    name,
    createdAt: now ?? new Date().toISOString(),
    snapshot: snapshot(product),
  });
  product.versions = product.versions.slice(0, productVersionLimit);
  return product;
}

export function restoreVersion(
  product: Product,
  versionId: string,
  now?: string,
): Product {
  const version = product.versions.find((item) => item.id === versionId);
  if (!version) throw new ApiError("Version not found", 404);
  const previous = {
    id: randomUUID(),
    name: "Before restore",
    createdAt: now ?? new Date().toISOString(),
    snapshot: snapshot(product),
  };
  const restoredAt = now ?? new Date().toISOString();
  Object.assign(product, snapshot({ ...product, ...version.snapshot }), {
    updatedAt: restoredAt,
    techPackUpdatedAt: restoredAt,
  });
  product.versions.unshift(previous);
  product.versions = product.versions.slice(0, productVersionLimit);
  return product;
}

export function shareProduct(product: Product): { token: string; url: string } {
  product.shareToken ||= randomBytes(24).toString("hex");
  return { token: product.shareToken, url: `/share/${product.shareToken}` };
}

export function revokeProductShare(product: Product): void {
  product.shareToken = null;
}

export function patchProduct(
  product: Product,
  patch: Partial<Product>,
  now = new Date().toISOString(),
) {
  const content = (value: Product) => {
    // Stage tracks workflow, not the specification a manufacturer quotes against.
    const { comments, archived, stage, ...pack } = snapshot(value);
    void comments;
    void archived;
    void stage;
    return pack;
  };
  const changed =
    JSON.stringify(content(product)) !==
    JSON.stringify(content({ ...product, ...patch }));
  Object.assign(product, patch, { updatedAt: now });
  if (changed) product.techPackUpdatedAt = now;
  return product;
}
