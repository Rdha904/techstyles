import { api } from "@/lib/api";
import { findProduct } from "@/lib/store";
import { restoreVersion } from "@/lib/products";
import { repository } from "@/lib/repository";
import { currentWorkspaceId } from "@/lib/workspace";
export function POST(
  _request: Request,
  context: { params: Promise<{ id: string; versionId: string }> },
) {
  return api(async () => {
    const { id, versionId } = await context.params;
    return repository.update(await currentWorkspaceId(), (database) => {
      return restoreVersion(findProduct(database, id), versionId);
    });
  });
}
