import { api, body } from "@/lib/api";
import { repository } from "@/lib/repository";
import { currentWorkspaceId } from "@/lib/workspace";
import { createManufacturer, manufacturerPatch } from "@/lib/manufacturers";
export function GET() {
  return api(
    async () =>
      (await repository.read(await currentWorkspaceId())).manufacturers,
  );
}
export function POST(request: Request) {
  return api(async () => {
    const patch = manufacturerPatch(await body(request), true);
    return repository.update(await currentWorkspaceId(), (database) => {
      const manufacturer = createManufacturer(patch);
      database.manufacturers.unshift(manufacturer);
      return manufacturer;
    });
  });
}
