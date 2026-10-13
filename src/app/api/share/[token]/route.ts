import { api } from "@/lib/api";
import { ApiError } from "@/lib/store";
import { repository } from "@/lib/repository";
import { sharedProduct } from "@/lib/share";
export const dynamic = "force-dynamic";
export function GET(
  _request: Request,
  context: { params: Promise<{ token: string }> },
) {
  return api(async () => {
    const { token } = await context.params;
    const product = await repository.findProductByShareToken(token);
    if (!product)
      throw new ApiError(
        "This share link is unavailable or has been revoked.",
        404,
      );
    return sharedProduct(product);
  });
}
