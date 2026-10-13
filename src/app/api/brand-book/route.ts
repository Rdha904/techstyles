import { api, body } from "@/lib/api";
import { repository } from "@/lib/repository";
import { currentWorkspaceId } from "@/lib/workspace";
import { validateBrandBook } from "@/lib/brand";
import { emptyBrandBook } from "@/lib/brand-types";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export function GET() {
  return api(async () => {
    const data = await repository.read(await currentWorkspaceId());
    return {
      profile: data.brandProfile || null,
      book: data.brandBook || emptyBrandBook(),
    };
  });
}
export function PUT(request: Request) {
  return api(async () => {
    const settings = validateBrandBook(await body(request));
    return repository.update(await currentWorkspaceId(), (data) => {
      const book = {
        ...(data.brandBook || emptyBrandBook()),
        ...settings,
        updatedAt: new Date().toISOString(),
      };
      data.brandBook = book;
      return { book };
    });
  });
}
