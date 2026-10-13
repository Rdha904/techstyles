import { api, body } from "@/lib/api";
import { ApiError } from "@/lib/store";
import { repository } from "@/lib/repository";
import { currentWorkspaceId } from "@/lib/workspace";
import { libraryPatch } from "@/lib/library";
type Context = { params: Promise<{ id: string }> };
export function PATCH(request: Request, context: Context) {
  return api(async () => {
    const { id } = await context.params;
    const patch = libraryPatch(await body(request));
    return repository.update(await currentWorkspaceId(), (database) => {
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
    return repository.update(await currentWorkspaceId(), (database) => {
      if (!database.libraries.some((item) => item.id === id))
        throw new ApiError("Item not found", 404);
      database.libraries = database.libraries.filter((item) => item.id !== id);
      return { ok: true };
    });
  });
}
