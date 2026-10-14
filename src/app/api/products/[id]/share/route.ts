import { api } from "@/lib/api";
import { findProduct } from "@/lib/store";
import { shareProduct, revokeProductShare } from "@/lib/products";
import { repository } from "@/lib/repository";
import { currentWorkspaceId } from "@/lib/workspace";
type Context = { params: Promise<{ id: string }> };
export function POST(_request: Request, context: Context) {
  return api(async () => {
    const { id } = await context.params;
    return repository.update(await currentWorkspaceId(), (database) => {
      return shareProduct(findProduct(database, id));
    });
  });
}
export function DELETE(_request: Request, context: Context) {
  return api(async () => {
    const { id } = await context.params;
    return repository.update(await currentWorkspaceId(), (database) => {
      revokeProductShare(findProduct(database, id));
      return { ok: true };
    });
  });
}
