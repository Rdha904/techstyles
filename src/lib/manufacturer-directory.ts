import type { Manufacturer, Product } from "./types";

function uniqueValues(values: string[]) {
  const seen = new Set<string>();
  return values
    .map((value) => value.trim())
    .filter((value) => {
      const key = value.toLowerCase();
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

export function parseManufacturerCategories(input: string) {
  return uniqueValues(input.split(","));
}

export function manufacturerMatches(
  manufacturer: Manufacturer,
  { query = "", country = "", category = "" } = {},
) {
  const normalize = (value: string) => value.trim().toLowerCase();
  const searchable = [
    manufacturer.name,
    manufacturer.contactName,
    manufacturer.email,
    manufacturer.location.city,
    manufacturer.location.country,
    ...manufacturer.categories,
    manufacturer.notes,
  ]
    .join(" ")
    .toLowerCase();
  return (
    searchable.includes(normalize(query)) &&
    (!country ||
      normalize(manufacturer.location.country) === normalize(country)) &&
    (!category ||
      manufacturer.categories.some(
        (value) => normalize(value) === normalize(category),
      ))
  );
}

export function manufacturerFilterOptions(manufacturers: Manufacturer[]) {
  return {
    countries: uniqueValues(
      manufacturers.map((item) => item.location.country),
    ).sort((a, b) => a.localeCompare(b)),
    categories: uniqueValues(
      manufacturers.flatMap((item) => item.categories),
    ).sort((a, b) => a.localeCompare(b)),
  };
}

export function productsUsingManufacturer(
  products: Product[],
  manufacturerId: string,
) {
  return products.filter(
    (product) => product.manufacturerId === manufacturerId,
  );
}
