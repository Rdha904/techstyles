import { randomBytes } from "node:crypto";
import { api } from "@/lib/api";
import { findProduct, transaction } from "@/lib/store";
type Context = { params: Promise<{ id: string }> };
export function POST(_request: Request, context: Context) {
  return api(async () => {
    const { id } = await context.params;
    return transaction((database) => {
      const product = findProduct(database, id);
      product.shareToken ||= randomBytes(24).toString("hex");
      return { token: product.shareToken, url: `/share/${product.shareToken}` };
    });
  });
}
export function DELETE(_request: Request, context: Context) {
  return api(async () => {
    const { id } = await context.params;
    return transaction((database) => {
      findProduct(database, id).shareToken = null;
      return { ok: true };
    });
  });
}
