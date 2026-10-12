import { mkdir, writeFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import path from "node:path";
import { ApiError, dataDirectory } from "./store";
export const uploadDirectory = path.join(dataDirectory, "uploads");
export const mimeTypes: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  webp: "image/webp",
  pdf: "application/pdf",
};
export function detectFile(buffer: Buffer): string {
  if (
    buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
  )
    return "png";
  if (buffer[0] === 255 && buffer[1] === 216 && buffer[2] === 255) return "jpg";
  if (
    buffer.subarray(0, 4).toString() === "RIFF" &&
    buffer.subarray(8, 12).toString() === "WEBP"
  )
    return "webp";
  if (buffer.subarray(0, 5).toString() === "%PDF-") return "pdf";
  throw new ApiError("Please upload a PNG, JPEG, WebP or PDF file.");
}
export async function saveUpload(buffer: Buffer) {
  if (buffer.length > 10 * 1024 * 1024)
    throw new ApiError("Maximum file size is 10 MB.", 413);
  const extension = detectFile(buffer);
  await mkdir(uploadDirectory, { recursive: true });
  const filename = `${randomUUID()}.${extension}`;
  await writeFile(path.join(uploadDirectory, filename), buffer, {
    mode: 0o600,
  });
  return { url: `/api/uploads/${filename}` };
}
