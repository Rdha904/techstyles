import { randomUUID } from "node:crypto";
import { api, body } from "@/lib/api";
import { repository } from "@/lib/repository";
import { currentWorkspaceId } from "@/lib/workspace";
import { libraryPatch } from "@/lib/library";
export function GET() {
  return api(
    async () => (await repository.read(await currentWorkspaceId())).libraries,
  );
}
export function POST(request: Request) {
  return api(async () => {
    const patch = libraryPatch(await body(request), true);
    return repository.update(await currentWorkspaceId(), (database) => {
      const item = {
        id: randomUUID(),
        collection: "materials",
        name: "",
        description: "",
        color: "",
        data: {},
        createdAt: new Date().toISOString(),
        ...patch,
      };
      database.libraries.unshift(item);
      return item;
    });
  });
}
