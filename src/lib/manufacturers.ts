import { randomUUID } from "node:crypto";
import { object, string } from "./api";
import { ApiError, type WorkspaceData } from "./store";
import type { Manufacturer } from "./types";

export function manufacturerPatch(
  input: Record<string, unknown>,
  required = false,
): Partial<Manufacturer> {
  const patch: Partial<Manufacturer> = {};
  const limits = {
    name: 200,
    contactName: 200,
    email: 320,
    phone: 100,
    typicalMoq: 200,
    notes: 20000,
  } as const;
  for (const field of Object.keys(limits) as (keyof typeof limits)[])
    if (input[field] !== undefined || (required && field === "name"))
      patch[field] = string(input[field], field, limits[field]).trim();
  if (patch.name !== undefined && !patch.name)
    throw new ApiError("Manufacturer name is required");
  if (input.location !== undefined) {
    const location = object(input.location);
    patch.location = {
      country: string(location.country, "country", 200).trim(),
      city: string(location.city, "city", 200).trim(),
    };
  }
  if (input.categories !== undefined) {
    if (!Array.isArray(input.categories) || input.categories.length > 50)
      throw new ApiError("Invalid manufacturer categories");
    patch.categories = input.categories.map((value) => {
      const category = string(value, "manufacturer category", 100).trim();
      if (!category) throw new ApiError("Invalid manufacturer category");
      return category;
    });
  }
  return patch;
}

export function createManufacturer(patch: Partial<Manufacturer>): Manufacturer {
  const now = new Date().toISOString();
  return {
    id: randomUUID(),
    name: "",
    contactName: "",
    email: "",
    phone: "",
    location: { country: "", city: "" },
    categories: [],
    typicalMoq: "",
    notes: "",
    createdAt: now,
    updatedAt: now,
    ...patch,
  };
}

export function findManufacturer(data: WorkspaceData, id: string) {
  const manufacturer = data.manufacturers.find((item) => item.id === id);
  if (!manufacturer) throw new ApiError("Manufacturer not found", 404);
  return manufacturer;
}

export function validateManufacturerId(
  data: WorkspaceData,
  id: string | null | undefined,
) {
  if (
    id !== undefined &&
    id !== null &&
    !data.manufacturers.some((item) => item.id === id)
  )
    throw new ApiError("Unknown manufacturer");
}

export function deleteManufacturer(data: WorkspaceData, id: string) {
  findManufacturer(data, id);
  const products = data.products.filter(
    (product) => product.manufacturerId === id,
  );
  if (products.length)
    throw new ApiError(
      `Manufacturer is used by products: ${products.map((product) => product.name).join(", ")}`,
      409,
    );
  data.manufacturers = data.manufacturers.filter((item) => item.id !== id);
}

/** Returns whether legacy sourcing data was changed and needs persisting. */
export function migrateManufacturers(data: WorkspaceData): boolean {
  const migrate = !Array.isArray(data.manufacturers);
  let changed = migrate;
  if (migrate) data.manufacturers = [];
  const names = new Map<string, Manufacturer>();
  for (const product of data.products) {
    const legacy = product as typeof product & { supplier?: unknown };
    if (migrate) {
      const name =
        typeof legacy.supplier === "string" ? legacy.supplier.trim() : "";
      let manufacturer = names.get(name.toLowerCase());
      if (name && !manufacturer) {
        manufacturer = createManufacturer({ name });
        names.set(name.toLowerCase(), manufacturer);
        data.manufacturers.push(manufacturer);
      }
      product.manufacturerId = manufacturer?.id ?? null;
    } else if (product.manufacturerId === undefined) {
      product.manufacturerId = null;
      changed = true;
    }
    if ("supplier" in legacy) {
      delete legacy.supplier;
      changed = true;
    }
    for (const version of product.versions) {
      const content = version.snapshot as typeof version.snapshot & {
        supplier?: unknown;
        manufacturerId?: unknown;
      };
      if ("supplier" in content || "manufacturerId" in content) {
        delete content.supplier;
        delete content.manufacturerId;
        changed = true;
      }
    }
  }
  return changed;
}
