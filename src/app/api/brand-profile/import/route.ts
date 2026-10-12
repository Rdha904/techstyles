import { api, body, string } from "@/lib/api";
import { ApiError } from "@/lib/store";
import { importWebsite, importFiles } from "@/lib/brand-import";
export const runtime = "nodejs";
export const maxDuration = 90;
export function POST(request: Request) {
  return api(async () => {
    if (request.headers.get("content-type")?.includes("multipart/form-data")) {
      const reader = request.body?.getReader();
      if (!reader) throw new ApiError("Choose files to import.");
      const chunks: Uint8Array[] = [];
      let size = 0;
      while (true) {
        const part = await reader.read();
        if (part.done) break;
        size += part.value.length;
        if (size > 25 * 1024 * 1024) {
          await reader.cancel();
          throw new ApiError("Combined upload limit is 25 MB.", 413);
        }
        chunks.push(part.value);
      }
      const bounded = new Response(Buffer.concat(chunks), {
        headers: { "Content-Type": request.headers.get("content-type")! },
      });
      const form = await bounded.formData();
      return importFiles(
        form
          .getAll("files")
          .filter((file): file is File => file instanceof File),
      );
    }
    const input = await body(request);
    return importWebsite(string(input.url, "website URL", 2000));
  });
}
