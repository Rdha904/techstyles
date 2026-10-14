import { api, body, string } from "@/lib/api";
import { findProduct } from "@/lib/store";
import { saveVersion } from "@/lib/products";
import { repository } from "@/lib/repository";
import { currentWorkspaceId } from "@/lib/workspace";
export function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  return api(async () => {
    const { id } = await context.params;
    const input = await body(request);
    const name = string(input.name ?? "Saved version", "version name", 200);
    return repository.update(await currentWorkspaceId(), (database) => {
      return saveVersion(findProduct(database, id), name);
    });
  });
}
