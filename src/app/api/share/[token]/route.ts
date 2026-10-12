import { api } from "@/lib/api";
import { ApiError, getDatabase } from "@/lib/store";
import { sharedProduct } from "@/lib/share";
export const dynamic = "force-dynamic";
export function GET(
  _request: Request,
  context: { params: Promise<{ token: string }> },
) {
  return api(async () => {
    const { token } = await context.params;
    const product = (await getDatabase()).products.find(
      (item) => item.shareToken === token,
    );
    if (!product)
      throw new ApiError(
        "This share link is unavailable or has been revoked.",
        404,
      );
    return sharedProduct(product);
  });
}
