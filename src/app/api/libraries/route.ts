import { randomUUID } from "node:crypto";
import { api, body } from "@/lib/api";
import { getDatabase, transaction } from "@/lib/store";
import { libraryPatch } from "@/lib/library";
export function GET() {
  return api(async () => (await getDatabase()).libraries);
}
export function POST(request: Request) {
  return api(async () => {
    const patch = libraryPatch(await body(request), true);
    return transaction((database) => {
      const item = {
        id: randomUUID(),
        collection: "materials",
        name: "",
        description: "",
        color: "",
        data: {},
        createdAt: new Date().toISOString(),
        ...patch,
      };
      database.libraries.unshift(item);
      return item;
    });
  });
}
