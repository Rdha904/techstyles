import { api, body, productPatch } from "@/lib/api";
import { validateManufacturerId } from "@/lib/manufacturers";
import { emptyProduct } from "@/lib/store";
import { repository } from "@/lib/repository";
import { currentWorkspaceId } from "@/lib/workspace";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export function GET() {
  return api(
    async () => (await repository.read(await currentWorkspaceId())).products,
  );
}
export function POST(request: Request) {
  return api(async () => {
    const patch = productPatch(await body(request));
    return repository.update(await currentWorkspaceId(), (database) => {
      validateManufacturerId(database, patch.manufacturerId);
      const product = { ...emptyProduct(), ...patch };
      database.products.unshift(product);
      return product;
    });
  });
}
