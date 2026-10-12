import { api, body, productPatch } from "@/lib/api";
import { emptyProduct, getDatabase, transaction } from "@/lib/store";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export function GET() {
  return api(async () => (await getDatabase()).products);
}
export function POST(request: Request) {
  return api(async () => {
    const patch = productPatch(await body(request));
    return transaction((database) => {
      const product = { ...emptyProduct(), ...patch };
      database.products.unshift(product);
      return product;
    });
  });
}
