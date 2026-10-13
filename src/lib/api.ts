import { ApiError } from "./store";
import { productSections, type ProductSnapshot } from "./types";

export async function api(action: () => unknown | Promise<unknown>) {
  try {
    return Response.json(await action(), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    if (error instanceof ApiError)
      return Response.json({ error: error.message }, { status: error.status });
    console.error("Techstyles request failed:", error);
    return Response.json(
      { error: "The request could not be completed." },
      { status: 500 },
    );
  }
}
export function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new ApiError("Expected an object");
  return value as Record<string, unknown>;
}
export async function body(request: Request) {
  const text = await request.text();
  if (text.length > 2_000_000) throw new ApiError("Request is too large", 413);
  try {
    return object(JSON.parse(text));
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError("Invalid JSON");
  }
}
export function string(value: unknown, label: string, max = 20000): string {
  if (typeof value !== "string" || value.length > max)
    throw new ApiError(`Invalid ${label}`);
  return value;
}
const stringFields = [
  "name",
  "code",
  "category",
  "stage",
  "baseSize",
  "project",
  "supplier",
  "description",
  "cover",
  "sketch",
  "mockup",
  "instructions",
  "labels",
] as const;
const rows = {
  colors: ["id", "name", "hex"],
  materials: ["id", "name", "composition", "weight", "supplier", "placement"],
  measurements: ["id", "name", "tolerance"],
  comments: ["id", "section", "author", "text", "createdAt"],
  annotations: ["id", "text"],
  attachments: ["id", "name", "url"],
  artworks: ["id", "name", "url"],
  samples: ["id", "size", "color", "status"],
} as const;
export function localAssetUrl(value: string) {
  return (
    /^\/(?:sites\/techstyles\/|api\/uploads\/)[a-zA-Z0-9_./-]+$/.test(value) &&
    !value.split("/").includes("..")
  );
}
export function productPatch(
  input: Record<string, unknown>,
): Partial<ProductSnapshot> {
  const patch: Record<string, unknown> = {};
  if (input.measurementUnit !== undefined) {
    if (input.measurementUnit !== "cm" && input.measurementUnit !== "in")
      throw new ApiError("Invalid measurement unit");
    patch.measurementUnit = input.measurementUnit;
  }
  if (input.archived !== undefined) {
    if (typeof input.archived !== "boolean")
      throw new ApiError("Invalid archive status");
    patch.archived = input.archived;
  }
  if (input.excludedSections !== undefined) {
    if (
      !Array.isArray(input.excludedSections) ||
      input.excludedSections.length > 50
    )
      throw new ApiError("Invalid excluded sections");
    patch.excludedSections = [
      ...new Set(
        input.excludedSections.map((value) => {
          const section = productSections.find((id) => id === value);
          if (!section) throw new ApiError("Invalid excluded section");
          return section;
        }),
      ),
    ];
  }
  for (const key of stringFields)
    if (input[key] !== undefined) {
      patch[key] = string(input[key], key);
      if (key === "name" && !(patch[key] as string).trim())
        throw new ApiError("Product name is required");
      if (
        ["cover", "sketch", "mockup"].includes(key) &&
        patch[key] &&
        !localAssetUrl(patch[key] as string)
      )
        throw new ApiError("Use an uploaded or bundled image");
    }
  for (const [key, fields] of Object.entries(rows))
    if (input[key] !== undefined) {
      const list = input[key];
      if (!Array.isArray(list) || list.length > 1000)
        throw new ApiError(`Invalid ${key}`);
      patch[key] = list.map((value) => {
        const row = object(value);
        const clean: Record<string, unknown> = {};
        for (const field of fields) clean[field] = string(row[field], field);
        if (key === "attachments" || key === "artworks") {
          if (!localAssetUrl(clean.url as string))
            throw new ApiError("Use an uploaded or bundled asset");
        }
        if (key === "samples") {
          if (
            typeof row.quantity !== "number" ||
            !Number.isInteger(row.quantity) ||
            row.quantity < 0 ||
            row.quantity > 1_000_000
          )
            throw new ApiError("Invalid sample quantity");
          clean.quantity = row.quantity;
        }
        if (key === "colors" && !/^#[0-9a-fA-F]{6}$/.test(clean.hex as string))
          throw new ApiError("Invalid color");
        if (key === "colors" && row.image !== undefined) {
          const image = string(row.image, "colorway image", 1000);
          if (!localAssetUrl(image))
            throw new ApiError("Use an uploaded or bundled colorway image");
          clean.image = image;
        }
        if (key === "measurements") {
          const values = object(row.values);
          const sizes: Record<string, string> = {};
          if (Object.keys(values).length > 30)
            throw new ApiError("Too many sizes");
          for (const [size, amount] of Object.entries(values)) {
            if (!/^[a-zA-Z0-9 -]{1,20}$/.test(size))
              throw new ApiError("Invalid size");
            sizes[size] = string(amount, "measurement", 100);
          }
          clean.values = sizes;
        }
        if (key === "annotations")
          for (const coordinate of ["x", "y", "x2", "y2"]) {
            if (
              (coordinate === "x2" || coordinate === "y2") &&
              row[coordinate] === undefined
            )
              continue;
            const value = row[coordinate];
            if (
              typeof value !== "number" ||
              !Number.isFinite(value) ||
              value < 0 ||
              value > 100
            )
              throw new ApiError("Invalid annotation position");
            clean[coordinate] = value;
          }
        return clean;
      });
    }
  return patch as Partial<ProductSnapshot>;
}
