import { fileStorage } from "@/lib/file-storage";
import { mimeTypes } from "@/lib/uploads";
import { currentWorkspaceId } from "@/lib/workspace";
export async function GET(
  _request: Request,
  context: { params: Promise<{ filename: string }> },
) {
  const { filename } = await context.params;
  if (!/^[0-9a-f-]{36}\.(png|jpg|webp|pdf)$/.test(filename))
    return new Response("Not found", { status: 404 });
  try {
    const bytes = await fileStorage.read(await currentWorkspaceId(), filename);
    if (!bytes) return new Response("Not found", { status: 404 });
    return new Response(new Uint8Array(bytes), {
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
