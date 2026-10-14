import { api } from "@/lib/api";
import { publishBrandBook, unpublishBrandBook } from "@/lib/brand";
import { repository } from "@/lib/repository";
import { currentWorkspaceId } from "@/lib/workspace";
export const runtime = "nodejs";
export function POST() {
  return api(async () =>
    repository.update(await currentWorkspaceId(), (data) =>
      publishBrandBook(data),
    ),
  );
}
export function DELETE() {
  return api(async () =>
    repository.update(await currentWorkspaceId(), (data) => {
      unpublishBrandBook(data);
      return { ok: true };
    }),
  );
}
