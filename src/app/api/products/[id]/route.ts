import { api, body, productPatch } from "@/lib/api";
import { findProduct, getDatabase, transaction } from "@/lib/store";
type Context = { params: Promise<{ id: string }> };
export function GET(_request: Request, context: Context) {
  return api(async () =>
    findProduct(await getDatabase(), (await context.params).id),
  );
}
export function PATCH(request: Request, context: Context) {
  return api(async () => {
    const { id } = await context.params;
    const patch = productPatch(await body(request));
    return transaction((database) =>
      Object.assign(findProduct(database, id), patch, {
        updatedAt: new Date().toISOString(),
      }),
    );
  });
}
export function DELETE(_request: Request, context: Context) {
  return api(async () => {
    const { id } = await context.params;
    return transaction((database) => {
      findProduct(database, id);
      database.products = database.products.filter((item) => item.id !== id);
      return { ok: true };
    });
  });
}
