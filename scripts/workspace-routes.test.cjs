const { test } = require("node:test");
const assert = require("node:assert/strict");
require("./support/load-ts.cjs");
const {
  resolveView,
  viewOwnsPageHeading,
  navRoutes,
  moduleRoutes,
  pageSlug,
} = require("../src/components/sites/techstyles/workspace-routes.ts");

// Route expectations, including the single workspace dashboard.
const cases = [
  [[], "module-home", "Dashboard", "home", "Overview"],
  [["dashboard"], "module-home", "Dashboard", "home", "Overview"],
  [["products"], "product-library", "Products"],
  [
    ["products", "p1"],
    "product",
    "Products",
    "design",
    undefined,
    { productId: "p1" },
  ],
  [
    ["products", "p1", "canvas"],
    "product-canvas",
    "Products",
    "design",
    undefined,
    { productId: "p1" },
  ],
  [
    ["products", "p1", "print"],
    "product-print",
    "Products",
    "design",
    undefined,
    { productId: "p1" },
  ],
  [
    ["share", "tok"],
    "shared-product",
    "Settings",
    "design",
    undefined,
    { token: "tok" },
  ],
  [
    ["share", "brand-book", "tok"],
    "shared-brand-book",
    "Settings",
    "design",
    undefined,
    { token: "tok" },
  ],
  [["share"], "shared-product", "Settings", "design", undefined, { token: "" }],
  [["modules", "home"], "module-home", "Dashboard", "home", "Overview"],
  [
    ["modules", "home", "overview"],
    "module-home",
    "Dashboard",
    "home",
    "Overview",
  ],
  [
    ["modules", "concept"],
    "concept-overview",
    "Overview",
    "concept",
    "Overview",
  ],
  [
    ["modules", "concept", "overview"],
    "concept-overview",
    "Overview",
    "concept",
    "Overview",
  ],
  [
    ["modules", "concept", "brand-profile"],
    "brand-profile",
    "Brand Profile",
    "concept",
    "Brand Profile",
  ],
  [
    ["modules", "concept", "brand-book"],
    "brand-book",
    "Brand Book",
    "concept",
    "Brand Book",
  ],
  [
    ["modules", "concept", "brand-book", "print"],
    "brand-book-print",
    "Brand Book",
    "concept",
    "Brand Book",
  ],
  [
    ["modules", "concept", "moodboards"],
    "module-page",
    "Moodboards",
    "concept",
    "Moodboards",
  ],
  [
    ["modules", "marketing"],
    "module-page",
    "Overview",
    "marketing",
    "Overview",
  ],
  [
    ["modules", "marketing", "brand-profile"],
    "module-page",
    "Brand Profile",
    "marketing",
    "Brand Profile",
  ],
  [
    ["modules", "manufacturers", "manufacturers"],
    "manufacturers",
    "Manufacturers",
    "manufacturers",
    "Manufacturers",
  ],
  [
    ["modules", "manufacturers"],
    "manufacturers-overview",
    "Overview",
    "manufacturers",
    "Overview",
  ],
  [
    ["modules", "manufacturers", "overview"],
    "manufacturers-overview",
    "Overview",
    "manufacturers",
    "Overview",
  ],
  [
    ["modules", "manufacturers", "quote-comparison"],
    "quote-comparison",
    "Quote Comparison",
    "manufacturers",
    "Quote Comparison",
  ],
  [
    ["modules", "manufacturers", "manufacturers", "other"],
    "module-page",
    "Manufacturers",
    "manufacturers",
    "Manufacturers",
  ],
  [
    ["modules", "manufacturers", "quote-requests"],
    "quote-requests",
    "Quote Requests",
    "manufacturers",
    "Quote Requests",
  ],
  [
    ["modules", "manufacturers", "quote-comparison", "p1"],
    "quote-comparison",
    "Quote Comparison",
    "manufacturers",
    "Quote Comparison",
    { productId: "p1" },
  ],
  [
    ["modules", "manufacturers", "quote-comparison", "p1", "other"],
    "module-page",
    "Quote Comparison",
    "manufacturers",
    "Quote Comparison",
  ],
  [
    ["modules", "manufacturers", "quote-comparison", ""],
    "module-page",
    "Quote Comparison",
    "manufacturers",
    "Quote Comparison",
  ],
  [
    ["modules", "manufacturers", "quote-requests", "other"],
    "module-page",
    "Quote Requests",
    "manufacturers",
    "Quote Requests",
  ],
  [
    ["modules", "manufacturers", "overview", "other"],
    "module-page",
    "Overview",
    "manufacturers",
    "Overview",
  ],
  [
    ["modules", "samples", "quote-comparison", "p1"],
    "not-found",
    "Page not found",
    "samples",
  ],
  [["modules", "unknown"], "not-found", "Page not found"],
  [
    ["modules", "concept", "unknown-page"],
    "not-found",
    "Page not found",
    "concept",
  ],
  [
    ["projects"],
    "library",
    "Projects",
    "design",
    undefined,
    { collection: "projects" },
  ],
  [
    ["materials"],
    "library",
    "Materials",
    "design",
    undefined,
    { collection: "materials" },
  ],
  [
    ["size-charts"],
    "library",
    "Size Charts",
    "design",
    undefined,
    { collection: "size-charts" },
  ],
  [
    ["attachments"],
    "library",
    "Attachments Library",
    "design",
    undefined,
    { collection: "attachments" },
  ],
  [["settings"], "settings", "Settings"],
  [["nonsense"], "not-found", "Settings"],
  [["nonsense", "deeper"], "not-found", "Settings"],
  [["modules", "home", "unknown-page"], "module-home", "Dashboard", "home"],
  [["modules"], "not-found", "Page not found"],
  [["modules", "design"], "not-found", "Page not found"],
  [
    ["share", "brand-book"],
    "shared-brand-book",
    "Settings",
    "design",
    undefined,
    { token: "" },
  ],
  [
    ["products", "p1", "unknown-page"],
    "product",
    "Products",
    "design",
    undefined,
    { productId: "p1" },
  ],
  [
    ["products", "", "canvas"],
    "product-canvas",
    "Products",
    "design",
    undefined,
    { productId: "" },
  ],
  [
    ["products", "", "print"],
    "product-print",
    "Products",
    "design",
    undefined,
    { productId: "" },
  ],
  [
    ["modules", "concept", "", "print"],
    "concept-overview",
    "Overview",
    "concept",
    "Overview",
  ],
  [
    ["modules", "concept", "brand-book", "other"],
    "brand-book",
    "Brand Book",
    "concept",
    "Brand Book",
  ],
  [
    ["share", "brand-book", "tok", "deeper"],
    "shared-brand-book",
    "Settings",
    "design",
    undefined,
    { token: "tok" },
  ],
  [[""], "module-home", "Dashboard", "home", "Overview"],
];

for (const [
  path,
  kind,
  title,
  moduleId = "design",
  modulePage,
  params = {},
] of cases) {
  test(`resolveView maps ${JSON.stringify(path)}`, () => {
    const before = [...path];
    assert.deepEqual(resolveView(path), {
      section: path[0] || "dashboard",
      moduleId,
      modulePage,
      title,
      itemId: path[1],
      view: { kind, ...params },
    });
    assert.deepEqual(path, before);
  });
}

test("every nav key and module page slug resolves to a known view", () => {
  for (const [key] of navRoutes) {
    assert.notEqual(resolveView([key]).view.kind, "not-found", key);
  }
  for (const module of moduleRoutes) {
    for (const page of module.pages) {
      const path = ["modules", module.id, pageSlug(page)];
      const result = resolveView(path);
      assert.notEqual(result.view.kind, "not-found", path.join("/"));
      assert.equal(result.moduleId, module.id);
      assert.equal(result.modulePage, page);
    }
  }
});

test("Design & Tech Packs secondary navigation starts with Products and has no dashboard", () => {
  assert.deepEqual(navRoutes[0], ["products", "Products"]);
  assert.equal(
    navRoutes.some(([key]) => key === "dashboard"),
    false,
  );
});

test("pages with their own heading keep the h1; other workspace pages use the shell h1", () => {
  const pageHeadings = [
    "settings",
    "projects",
    "sketches",
    "materials",
    "artworks",
    "colors",
    "size-charts",
    "attachments",
    "modules/manufacturers/manufacturers",
    "modules/manufacturers/quote-requests",
    "modules/manufacturers/quote-comparison",
    "modules/manufacturers/quote-comparison/p1",
    "modules/concept/brand-book",
  ];
  const shellHeadings = [
    "",
    "products",
    "products/p1",
    "products/p1/canvas",
    "modules/concept/overview",
    "modules/concept/brand-profile",
    "modules/concept/audience-market",
    "modules/concept/moodboards",
    "modules/manufacturers/overview",
    "modules/manufacturers/manufacturers/other",
    "modules/manufacturers/quote-requests/other",
    "modules/manufacturers/quote-comparison/p1/other",
    ...moduleRoutes
      .filter(({ id }) => !["concept", "manufacturers"].includes(id))
      .flatMap(({ id, pages }) =>
        pages.map((page) => `modules/${id}/${pageSlug(page)}`),
      ),
  ];

  for (const path of pageHeadings) {
    assert.equal(
      viewOwnsPageHeading(resolveView(path.split("/")).view),
      true,
      path,
    );
  }
  for (const path of shellHeadings) {
    assert.equal(
      viewOwnsPageHeading(resolveView(path.split("/")).view),
      false,
      path || "/",
    );
  }
});
