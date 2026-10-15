const { test } = require("node:test");
const assert = require("node:assert/strict");
require("./support/load-ts.cjs");
const {
  dashboardSummary,
  dashboardHeroImages,
} = require("../src/lib/dashboard.ts");

function product(id, overrides = {}) {
  return {
    id,
    name: `Product ${id}`,
    project: "Summer",
    stage: "Design",
    archived: false,
    manufacturerId: null,
    shareToken: null,
    updatedAt: "2026-10-01T12:00:00.000Z",
    ...overrides,
  };
}

test("hero images use cover before sketch in most recently updated order without changing products", () => {
  const products = [
    product("older", { cover: "/older.jpg", sketch: "/unused.png" }),
    product("newer", {
      sketch: "/newer.png",
      updatedAt: "2026-10-10T12:00:00.000Z",
    }),
  ];
  const before = structuredClone(products);
  assert.deepEqual(dashboardHeroImages(products), ["/newer.png", "/older.jpg"]);
  assert.deepEqual(products, before);
});

test("hero images exclude archived products and skip missing covers and sketches", () => {
  assert.deepEqual(
    dashboardHeroImages([
      product("archived", { archived: true, cover: "/archived.jpg" }),
      product("missing"),
      product("empty", { cover: "", sketch: "" }),
      product("sketch", { cover: "", sketch: "/sketch.png" }),
      product("cover", { cover: "/cover.jpg" }),
    ]),
    ["/sketch.png", "/cover.jpg"],
  );
  assert.deepEqual(dashboardHeroImages([]), []);
});

test("hero images return at most six eligible images, newest first", () => {
  const products = Array.from({ length: 8 }, (_, index) =>
    product(String(index), {
      cover: `/cover-${index}.jpg`,
      updatedAt: `2026-10-0${index + 1}T12:00:00.000Z`,
    }),
  );
  products.push(
    product("newest-without-image", { updatedAt: "2026-10-15T12:00:00.000Z" }),
  );
  assert.deepEqual(dashboardHeroImages(products), [
    "/cover-7.jpg",
    "/cover-6.jpg",
    "/cover-5.jpg",
    "/cover-4.jpg",
    "/cover-3.jpg",
    "/cover-2.jpg",
  ]);
});

test("dashboard counts active products using the existing collection, sourcing, sharing and stage rules", () => {
  const summary = dashboardSummary([
    product("design", { project: " Summer ", manufacturerId: "maker" }),
    product("sampling", { stage: "Sampling", shareToken: "shared" }),
    product("production", {
      stage: "Production",
      project: "Winter",
      manufacturerId: "maker",
    }),
    product("completed", {
      stage: "Completed",
      project: "   ",
      shareToken: "other",
    }),
    product("archived-design", {
      archived: true,
      project: "Archived collection",
      manufacturerId: "maker",
      shareToken: "archived",
    }),
    product("archived-production", { archived: true, stage: "Production" }),
  ]);
  assert.deepEqual(
    {
      activeProducts: summary.activeProducts,
      collections: summary.collections,
      productsWithManufacturer: summary.productsWithManufacturer,
      sharedTechPacks: summary.sharedTechPacks,
      productsInDevelopment: summary.productsInDevelopment,
      productsInProduction: summary.productsInProduction,
    },
    {
      activeProducts: 4,
      collections: 2,
      productsWithManufacturer: 2,
      sharedTechPacks: 2,
      productsInDevelopment: 2,
      productsInProduction: 1,
    },
  );
});

test("recent activity contains only the latest five active product updates without changing the input", () => {
  const products = [
    product("oldest"),
    product("third", { updatedAt: "2026-10-04T12:00:00.000Z" }),
    product("archived", {
      archived: true,
      updatedAt: "2026-10-14T12:00:00.000Z",
    }),
    product("newest", { updatedAt: "2026-10-06T12:00:00.000Z" }),
    product("fifth", { updatedAt: "2026-10-02T12:00:00.000Z" }),
    product("second", { updatedAt: "2026-10-05T12:00:00.000Z" }),
    product("fourth", { updatedAt: "2026-10-03T12:00:00.000Z" }),
  ];
  const before = structuredClone(products);
  assert.deepEqual(dashboardSummary(products).recentActivity, [
    {
      id: "newest",
      name: "Product newest",
      updatedAt: "2026-10-06T12:00:00.000Z",
    },
    {
      id: "second",
      name: "Product second",
      updatedAt: "2026-10-05T12:00:00.000Z",
    },
    {
      id: "third",
      name: "Product third",
      updatedAt: "2026-10-04T12:00:00.000Z",
    },
    {
      id: "fourth",
      name: "Product fourth",
      updatedAt: "2026-10-03T12:00:00.000Z",
    },
    {
      id: "fifth",
      name: "Product fifth",
      updatedAt: "2026-10-02T12:00:00.000Z",
    },
  ]);
  assert.deepEqual(products, before);
});

test("empty and fully archived workspaces have zero stats and no recent activity", () => {
  for (const products of [[], [product("archived", { archived: true })]]) {
    assert.deepEqual(dashboardSummary(products), {
      activeProducts: 0,
      collections: 0,
      productsWithManufacturer: 0,
      sharedTechPacks: 0,
      productsInDevelopment: 0,
      productsInProduction: 0,
      recentActivity: [],
    });
  }
});
