import { api, body, productPatch } from "@/lib/api";
import { validateManufacturerId } from "@/lib/manufacturers";
import { patchProduct } from "@/lib/products";
import { findProduct } from "@/lib/store";
import { repository } from "@/lib/repository";
import { currentWorkspaceId } from "@/lib/workspace";
type Context = { params: Promise<{ id: string }> };
export function GET(_request: Request, context: Context) {
  return api(async () =>
    findProduct(
      await repository.read(await currentWorkspaceId()),
      (await context.params).id,
    ),
  );
}
export function PATCH(request: Request, context: Context) {
  return api(async () => {
    const { id } = await context.params;
    const patch = productPatch(await body(request));
    return repository.update(await currentWorkspaceId(), (database) => {
      const product = findProduct(database, id);
      validateManufacturerId(database, patch.manufacturerId);
      return patchProduct(product, patch);
    });
  });
}
export function DELETE(_request: Request, context: Context) {
  return api(async () => {
    const { id } = await context.params;
    return repository.update(await currentWorkspaceId(), (database) => {
      findProduct(database, id);
      database.quoteRequests = database.quoteRequests.filter(
        (item) => item.productId !== id,
      );
      database.products = database.products.filter((item) => item.id !== id);
      return { ok: true };
    });
  });
}
