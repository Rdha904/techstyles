import { api, body } from "@/lib/api";
import { ApiError, getDatabase, transaction } from "@/lib/store";
import { validateBrand } from "@/lib/brand";
export const runtime = "nodejs";
export function GET() {
  return api(async () => ({
    profile: (await getDatabase()).brandProfile || null,
  }));
}
export function PUT(request: Request) {
  return api(async () => {
    const input = await body(request);
    if (input.reviewed !== true)
      throw new ApiError("Review your profile before saving.");
    const profile = validateBrand(input);
    return transaction((database) => {
      if (input.revision !== (database.brandProfile?.revision || 0))
        throw new ApiError(
          "The brand profile changed in another tab. Reload the saved profile before saving again.",
          409,
        );
      profile.revision = (database.brandProfile?.revision || 0) + 1;
      profile.updatedAt = new Date().toISOString();
      database.brandProfile = profile;
      return { profile };
    });
  });
}
