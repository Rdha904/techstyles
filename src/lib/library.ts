import { object, string } from "./api";
import { ApiError } from "./store";
import type { LibraryItem } from "./types";
export function libraryPatch(
  input: Record<string, unknown>,
  required = false,
): Partial<LibraryItem> {
  const result: Partial<LibraryItem> = {};
  for (const field of ["name", "collection", "description", "color"] as const) {
    if (
      input[field] !== undefined ||
      (required && ["name", "collection"].includes(field))
    )
      result[field] = string(input[field], field);
  }
  if ("name" in result && !result.name?.trim())
    throw new ApiError("Name is required");
  if (
    result.collection &&
    ![
      "projects",
      "sketches",
      "materials",
      "artworks",
      "colors",
      "size-charts",
      "attachments",
    ].includes(result.collection)
  )
    throw new ApiError("Unknown library collection");
  if (input.data !== undefined) {
    result.data = object(input.data);
    if (JSON.stringify(result.data).length > 100_000)
      throw new ApiError("Library item is too large");
  }
  return result;
}
