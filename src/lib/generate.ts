import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { ApiError, getDatabase } from "./store";
import { brandContext } from "./brand";
import { localAssetUrl, object, string } from "./api";
import { detectFile, mimeTypes, saveUpload, uploadDirectory } from "./uploads";

const instructions: Record<string, string> = {
  sketch:
    "Create a precise fashion technical flat sketch, clean black outlines on white, showing garment construction and seam details, no decorative background.",
  mockup:
    "Create a photorealistic studio garment product mockup on a neutral background. Preserve the silhouette, seams, pockets, proportions and artwork of any supplied reference.",
  artwork:
    "Create print-ready fashion artwork as requested, clean composition without a garment mockup unless requested.",
  label:
    "Create a clear garment label design, faithfully rendering the requested text and symbols.",
};
async function referenceImage(url: string) {
  if (!localAssetUrl(url))
    throw new ApiError("Choose an uploaded or bundled reference image.");
  const file = url.startsWith("/api/uploads/")
    ? path.join(uploadDirectory, path.basename(url))
    : path.join(process.cwd(), "public", url);
  try {
    if ((await stat(file)).size > 10 * 1024 * 1024)
      throw new ApiError("Reference image is too large.");
    const bytes = await readFile(file);
    const extension = detectFile(bytes);
    if (extension === "pdf")
      throw new ApiError("Choose a PNG, JPEG or WebP reference image.");
    return new File([new Uint8Array(bytes)], `reference.${extension}`, {
      type: mimeTypes[extension],
    });
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError("Reference image not found.", 404);
  }
}
async function boundedJson(response: Response): Promise<unknown> {
  if (!response.body)
    throw new ApiError("Image service returned an empty response.", 502);
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let length = 0;
  while (true) {
    const result = await reader.read();
    if (result.done) break;
    length += result.value.byteLength;
    if (length > 16 * 1024 * 1024) {
      await reader.cancel();
      throw new ApiError(
        "Image service response exceeded the size limit.",
        502,
      );
    }
    chunks.push(result.value);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    throw new ApiError("Invalid response from image service.", 502);
  }
}
export async function generateImage(
  input: Record<string, unknown>,
  transport: typeof fetch = fetch,
) {
  const key = process.env.OPENAI_API_KEY;
  if (!key)
    throw new ApiError(
      "AI generation requires OPENAI_API_KEY in the local server environment. You can upload an image instead.",
      503,
    );
  const kind = string(input.kind, "generation type", 30);
  if (!instructions[kind])
    throw new ApiError("Choose sketch, mockup, artwork or label.");
  const prompt = string(input.prompt, "prompt", 6000).trim();
  if (!prompt) throw new ApiError("Describe the image you want to generate.");
  const model = process.env.OPENAI_IMAGE_MODEL || "gpt-image-1.5";
  const brand =
    input.useBrandProfile === true
      ? brandContext((await getDatabase()).brandProfile)
      : "";
  const fullPrompt = `${instructions[kind]}\n${input.image ? "Preserve reference design details unless the user explicitly asks to change them.\n" : ""}${prompt}\n${brand}`;
  const headers: Record<string, string> = { Authorization: `Bearer ${key}` };
  let payload: FormData | string;
  let endpoint = "generations";
  if (input.image) {
    endpoint = "edits";
    const form = new FormData();
    form.append("model", model);
    form.append("prompt", fullPrompt);
    form.append("n", "1");
    form.append("size", "1024x1024");
    form.append("output_format", "png");
    if (model === "gpt-image-1.5" || model === "gpt-image-1")
      form.append("input_fidelity", "high");
    form.append(
      "image[]",
      await referenceImage(string(input.image, "reference image", 1000)),
    );
    payload = form;
  } else {
    headers["Content-Type"] = "application/json";
    payload = JSON.stringify({
      model,
      prompt: fullPrompt,
      n: 1,
      size: "1024x1024",
      output_format: "png",
    });
  }
  try {
    const response = await transport(
      `https://api.openai.com/v1/images/${endpoint}`,
      {
        method: "POST",
        headers,
        body: payload,
        signal: AbortSignal.timeout(180_000),
      },
    );
    if (!response.ok) {
      await response.body?.cancel();
      throw new ApiError(
        response.status === 429
          ? "Image service capacity or account quota was exceeded. Try again later."
          : `Image generation failed (provider HTTP ${response.status}). Check your API key, model access and prompt.`,
        response.status === 429 ? 429 : 502,
      );
    }
    const result = object(await boundedJson(response));
    const encoded =
      Array.isArray(result.data) && result.data.length
        ? object(result.data[0]).b64_json
        : null;
    if (
      typeof encoded !== "string" ||
      !/^[A-Za-z0-9+/\r\n]+={0,2}$/.test(encoded)
    )
      throw new ApiError("Image service did not return an image.", 502);
    return saveUpload(Buffer.from(encoded, "base64"));
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(
      "The image service could not be reached or timed out. Please try again.",
      502,
    );
  }
}
