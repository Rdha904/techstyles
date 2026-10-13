import { randomBytes } from "node:crypto";
import { api } from "@/lib/api";
import { ApiError } from "@/lib/store";
import { repository } from "@/lib/repository";
import { currentWorkspaceId } from "@/lib/workspace";
import { emptyBrandBook } from "@/lib/brand-types";
export const runtime = "nodejs";
export function POST() {
  return api(async () =>
    repository.update(await currentWorkspaceId(), (data) => {
      if (!data.brandProfile)
        throw new ApiError("Save a brand profile before publishing.");
      const book = (data.brandBook ||= emptyBrandBook());
      book.shareToken ||= randomBytes(24).toString("hex");
      return {
        token: book.shareToken,
        url: `/share/brand-book/${book.shareToken}`,
      };
    }),
  );
}
export function DELETE() {
  return api(async () =>
    repository.update(await currentWorkspaceId(), (data) => {
      if (data.brandBook) data.brandBook.shareToken = null;
      return { ok: true };
    }),
  );
}
