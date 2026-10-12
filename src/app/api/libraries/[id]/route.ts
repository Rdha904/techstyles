import { api, body } from "@/lib/api";
import { ApiError, transaction } from "@/lib/store";
import { libraryPatch } from "@/lib/library";
type Context = { params: Promise<{ id: string }> };
export function PATCH(request: Request, context: Context) {
  return api(async () => {
    const { id } = await context.params;
    const patch = libraryPatch(await body(request));
    return transaction((database) => {
      const item = database.libraries.find((item) => item.id === id);
      if (!item) throw new ApiError("Item not found", 404);
      Object.assign(item, patch);
      return item;
    });
  });
}
export function DELETE(_request: Request, context: Context) {
  return api(async () => {
    const { id } = await context.params;
    return transaction((database) => {
      if (!database.libraries.some((item) => item.id === id))
        throw new ApiError("Item not found", 404);
      database.libraries = database.libraries.filter((item) => item.id !== id);
      return { ok: true };
    });
  });
}
