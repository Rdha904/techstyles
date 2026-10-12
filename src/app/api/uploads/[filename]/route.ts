import { readFile } from "node:fs/promises";
import path from "node:path";
import { mimeTypes, uploadDirectory } from "@/lib/uploads";
export async function GET(
  _request: Request,
  context: { params: Promise<{ filename: string }> },
) {
  const { filename } = await context.params;
  if (!/^[0-9a-f-]{36}\.(png|jpg|webp|pdf)$/.test(filename))
    return new Response("Not found", { status: 404 });
  try {
    const bytes = await readFile(path.join(uploadDirectory, filename));
    return new Response(bytes, {
      headers: {
        "Content-Type": mimeTypes[filename.split(".").pop()!],
        "X-Content-Type-Options": "nosniff",
        "Content-Disposition": `${filename.endsWith(".pdf") ? "attachment" : "inline"}; filename="${filename}"`,
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
