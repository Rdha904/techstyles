const { test } = require("node:test");
const assert = require("node:assert/strict");
require("./support/load-ts.cjs");
const {
  manufacturerMatches,
  manufacturerFilterOptions,
  parseManufacturerCategories,
  productsUsingManufacturer,
} = require("../src/lib/manufacturer-directory.ts");

const manufacturer = {
  id: "maker",
  name: "North Studio",
  contactName: "Alex Rivera",
  email: "alex@example.com",
  phone: "+49 123",
  location: { city: "Porto", country: "Portugal" },
  categories: ["Hoodies", "Knitwear"],
  typicalMoq: "200",
  notes: "Organic cotton specialists",
  createdAt: "",
  updatedAt: "",
};

test("search matches every directory search field case-insensitively", () => {
  for (const query of [
    "NORTH",
    "RIVERA",
    "EXAMPLE.COM",
    "PORTO",
    "PORTUGAL",
    "HOODIES",
    "KNITWEAR",
    "ORGANIC COTTON",
  ]) {
    assert.equal(manufacturerMatches(manufacturer, { query }), true, query);
  }
  assert.equal(manufacturerMatches(manufacturer, { query: "  north  " }), true);
  assert.equal(manufacturerMatches(manufacturer, { query: "missing" }), false);
});

test("empty search and filters match records with no optional data", () => {
  const empty = {
    ...manufacturer,
    contactName: "",
    email: "",
    location: { city: "", country: "" },
    categories: [],
    notes: "",
  };
  assert.equal(manufacturerMatches(empty), true);
  assert.equal(manufacturerMatches(empty, { query: "  " }), true);
  assert.equal(manufacturerMatches(empty, { country: "Portugal" }), false);
  assert.equal(manufacturerMatches(empty, { category: "Hoodies" }), false);
});

test("country and category filters use exact case-insensitive matches and combine with search", () => {
  assert.equal(
    manufacturerMatches(manufacturer, {
      country: " portugal ",
      category: "hoodies",
      query: "Alex",
    }),
    true,
  );
  for (const filters of [
    { country: "Port" },
    { category: "Hood" },
    { country: "Germany" },
    { category: "Dresses" },
    { country: "Portugal", category: "Hoodies", query: "missing" },
  ]) {
    assert.equal(manufacturerMatches(manufacturer, filters), false);
  }
});

test("category parsing trims, drops empty entries and deduplicates while preserving first spelling", () => {
  assert.deepEqual(
    parseManufacturerCategories(
      " Hoodies, ,Knitwear, hoodies, Knitwear , T-Shirts, ",
    ),
    ["Hoodies", "Knitwear", "T-Shirts"],
  );
  assert.deepEqual(parseManufacturerCategories(" , , "), []);
  assert.deepEqual(parseManufacturerCategories(""), []);
});

test("filter options come from every saved record, deduplicate and omit empty values", () => {
  const records = [
    manufacturer,
    {
      ...manufacturer,
      location: { city: "", country: " portugal " },
      categories: ["hoodies", "", " Dresses "],
    },
    {
      ...manufacturer,
      location: { city: "", country: "Germany" },
      categories: ["Knitwear"],
    },
    { ...manufacturer, location: { city: "", country: "" }, categories: [] },
  ];
  const before = structuredClone(records);
  assert.deepEqual(manufacturerFilterOptions(records), {
    countries: ["Germany", "Portugal"],
    categories: ["Dresses", "Hoodies", "Knitwear"],
  });
  assert.deepEqual(records, before);
  assert.deepEqual(manufacturerFilterOptions([]), {
    countries: [],
    categories: [],
  });
});

test("usage includes archived products and matches IDs rather than product names", () => {
  const products = [
    { id: "p1", name: "Hoodie", manufacturerId: "maker" },
    {
      id: "p2",
      name: "Archived jacket",
      manufacturerId: "maker",
      archived: true,
    },
    { id: "p3", name: "Hoodie", manufacturerId: "other" },
    { id: "p4", name: "North Studio", manufacturerId: null },
  ];
  const before = structuredClone(products);
  assert.deepEqual(
    productsUsingManufacturer(products, "maker"),
    products.slice(0, 2),
  );
  assert.deepEqual(productsUsingManufacturer(products, "missing"), []);
  assert.deepEqual(productsUsingManufacturer([], "maker"), []);
  assert.deepEqual(products, before);
});
