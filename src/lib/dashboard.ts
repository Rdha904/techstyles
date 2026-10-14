import type { Product } from "./types";

export function dashboardHeroImages(products: readonly Product[]): string[] {
  return products
    .filter((product) => !product.archived && (product.cover || product.sketch))
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .slice(0, 6)
    .map((product) => product.cover || product.sketch);
}

export function dashboardSummary(products: readonly Product[]) {
  const active = products.filter((product) => !product.archived);
  return {
    activeProducts: active.length,
    collections: new Set(
      active.map((product) => product.project.trim()).filter(Boolean),
    ).size,
    productsWithManufacturer: active.filter(
      (product) => product.manufacturerId !== null,
    ).length,
    sharedTechPacks: active.filter((product) => product.shareToken).length,
    productsInDevelopment: active.filter(
      (product) => !["Production", "Completed"].includes(product.stage),
    ).length,
    productsInProduction: active.filter(
      (product) => product.stage === "Production",
    ).length,
    recentActivity: [...active]
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
      .slice(0, 5)
      .map(({ id, name, updatedAt }) => ({ id, name, updatedAt })),
  };
}
