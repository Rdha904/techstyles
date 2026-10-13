import { api } from "@/lib/api";
import { ApiError } from "@/lib/store";
import { repository } from "@/lib/repository";
import { publishedBrandBook } from "@/lib/brand";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export function GET(
  _request: Request,
  context: { params: Promise<{ token: string }> },
) {
  return api(async () => {
    const { token } = await context.params;
    const found = await repository.findBrandBookByShareToken(token);
    if (!found)
      throw new ApiError(
        "This brand book link is unavailable or has been unpublished.",
        404,
      );
    return publishedBrandBook(found.profile, found.book);
  });
}
