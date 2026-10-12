import { api, body } from "@/lib/api";
import { generateImage } from "@/lib/generate";
export const runtime = "nodejs";
export const maxDuration = 180;
export function POST(request: Request) {
  return api(async () => generateImage(await body(request)));
}
