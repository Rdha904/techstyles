import { api } from "@/lib/api";
import { ApiError } from "@/lib/store";
import { saveUpload } from "@/lib/uploads";
export function POST(request: Request) {
  return api(async () => {
    if (Number(request.headers.get("content-length")) > 11 * 1024 * 1024)
      throw new ApiError("Maximum file size is 10 MB.", 413);
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) throw new ApiError("Choose a file to upload.");
    if (file.size > 10 * 1024 * 1024)
      throw new ApiError("Maximum file size is 10 MB.", 413);
    return saveUpload(Buffer.from(await file.arrayBuffer()));
  });
}
