import { randomUUID } from "node:crypto";
import { api } from "@/lib/api";
import { ApiError, findProduct, snapshot, transaction } from "@/lib/store";
export function POST(
  _request: Request,
  context: { params: Promise<{ id: string; versionId: string }> },
) {
  return api(async () => {
    const { id, versionId } = await context.params;
    return transaction((database) => {
      const product = findProduct(database, id);
      const version = product.versions.find((item) => item.id === versionId);
      if (!version) throw new ApiError("Version not found", 404);
      const previous = {
        id: randomUUID(),
        name: "Before restore",
        createdAt: new Date().toISOString(),
        snapshot: snapshot(product),
      };
      Object.assign(product, structuredClone(version.snapshot), {
        updatedAt: new Date().toISOString(),
      });
      product.versions.unshift(previous);
      product.versions = product.versions.slice(0, 50);
      return product;
    });
  });
}
