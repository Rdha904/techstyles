import { randomUUID } from "node:crypto";
import { api, body, string } from "@/lib/api";
import { findProduct, snapshot, transaction } from "@/lib/store";
export function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  return api(async () => {
    const { id } = await context.params;
    const input = await body(request);
    const name = string(input.name ?? "Saved version", "version name", 200);
    return transaction((database) => {
      const product = findProduct(database, id);
      product.versions.unshift({
        id: randomUUID(),
        name,
        createdAt: new Date().toISOString(),
        snapshot: snapshot(product),
      });
      product.versions = product.versions.slice(0, 50);
      return product;
    });
  });
}
