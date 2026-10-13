import { randomBytes } from "node:crypto";
import { api } from "@/lib/api";
import { findProduct } from "@/lib/store";
import { repository } from "@/lib/repository";
import { currentWorkspaceId } from "@/lib/workspace";
type Context = { params: Promise<{ id: string }> };
export function POST(_request: Request, context: Context) {
  return api(async () => {
    const { id } = await context.params;
    return repository.update(await currentWorkspaceId(), (database) => {
      const product = findProduct(database, id);
      product.shareToken ||= randomBytes(24).toString("hex");
      return { token: product.shareToken, url: `/share/${product.shareToken}` };
    });
  });
}
export function DELETE(_request: Request, context: Context) {
  return api(async () => {
    const { id } = await context.params;
    return repository.update(await currentWorkspaceId(), (database) => {
      findProduct(database, id).shareToken = null;
      return { ok: true };
    });
  });
}
