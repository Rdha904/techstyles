import { api, body } from "@/lib/api";
import { repository } from "@/lib/repository";
import { currentWorkspaceId } from "@/lib/workspace";
import {
  deleteManufacturer,
  findManufacturer,
  manufacturerPatch,
} from "@/lib/manufacturers";
type Context = { params: Promise<{ id: string }> };
export function GET(_request: Request, context: Context) {
  return api(async () =>
    findManufacturer(
      await repository.read(await currentWorkspaceId()),
      (await context.params).id,
    ),
  );
}
export function PATCH(request: Request, context: Context) {
  return api(async () => {
    const { id } = await context.params;
    const patch = manufacturerPatch(await body(request));
    return repository.update(await currentWorkspaceId(), (database) =>
      Object.assign(findManufacturer(database, id), patch, {
        updatedAt: new Date().toISOString(),
      }),
    );
  });
}
export function DELETE(_request: Request, context: Context) {
  return api(async () => {
    const { id } = await context.params;
    return repository.update(await currentWorkspaceId(), (database) => {
      deleteManufacturer(database, id);
      return { ok: true };
    });
  });
}
