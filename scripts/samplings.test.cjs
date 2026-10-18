const { test, after } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
require("./support/load-ts.cjs");

const temporary = fs.mkdtempSync(
  path.join(os.tmpdir(), "techstyles-samplings-"),
);
process.env.TECHSTYLES_DATA_DIR = temporary;
after(() => fs.rmSync(temporary, { recursive: true, force: true }));

const row = { id: "sample", size: "M", color: "Black", quantity: 2 };

test("Samplings migration preserves status text as a note without mutating rows and is idempotent", () => {
  const { migrateSamplings } = require("../src/lib/samplings.ts");
  const cases = [
    [
      { ...row, status: "Requested" },
      { ...row, note: "Requested" },
    ],
    [
      { ...row, note: "logo print", status: "no wash" },
      { ...row, note: "logo print · no wash" },
    ],
    [
      { ...row, note: "", status: "no wash" },
      { ...row, note: "no wash" },
    ],
    [{ ...row, status: "" }, row],
    [
      { ...row, note: "logo print", status: "  " },
      { ...row, note: "logo print" },
    ],
    [
      { ...row, note: "logo print" },
      { ...row, note: "logo print" },
    ],
    [row, row],
  ];
  for (const [input, expected] of cases) {
    const original = structuredClone(input);
    const result = migrateSamplings([input]);
    assert.deepEqual(result, [expected]);
    assert.deepEqual(input, original);
    assert.deepEqual(migrateSamplings(result), result);
  }
});

const { emptyProduct, snapshot } = require("../src/lib/store.ts");
const { repository } = require("../src/lib/repository.ts");
const { changedSinceSent } = require("../src/lib/quote-request-status.ts");

test("reading products and every saved version migrates Samplings durably without changing timestamps", async () => {
  const legacyRows = [
    { ...row, status: "Requested" },
    { ...row, id: "both", note: "logo print", status: "no wash" },
    { ...row, id: "empty", status: "" },
    { ...row, id: "migrated", note: "no wash" },
  ];
  const expected = [
    { ...row, note: "Requested" },
    { ...row, id: "both", note: "logo print · no wash" },
    { ...row, id: "empty" },
    { ...row, id: "migrated", note: "no wash" },
  ];
  const product = {
    ...emptyProduct(),
    samples: legacyRows,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-02-01T00:00:00.000Z",
    techPackUpdatedAt: "2026-01-15T00:00:00.000Z",
  };
  const versions = legacyRows.map((sample, index) => ({
    id: `version-${index}`,
    name: `Version ${index}`,
    createdAt: "2026-01-02T00:00:00.000Z",
    snapshot: { ...snapshot(emptyProduct()), samples: [sample] },
  }));
  const filename = path.join(temporary, "workspace.json");
  const request = {
    id: "request",
    productId: product.id,
    manufacturerId: "factory",
    status: "sent",
    sentAt: product.techPackUpdatedAt,
    quote: null,
    createdAt: product.createdAt,
    updatedAt: product.updatedAt,
  };
  for (const history of [[], versions]) {
    product.versions = history;
    const workspace = {
      products: [product],
      manufacturers: [],
      quoteRequests: [request],
      libraries: [],
    };
    const expectedProduct = {
      ...product,
      samples: expected,
      versions: history.map((version, index) => ({
        ...version,
        snapshot: { ...version.snapshot, samples: [expected[index]] },
      })),
    };
    for (const raw of [
      workspace,
      { version: 2, workspaces: { default: workspace, other: workspace } },
    ]) {
      fs.writeFileSync(filename, JSON.stringify(raw));
      const migrated = await repository.read("default");
      assert.deepEqual(migrated.products, [expectedProduct]);
      assert.deepEqual(migrated.quoteRequests, [request]);
      assert.equal(
        changedSinceSent(migrated.products[0], migrated.quoteRequests[0]),
        false,
      );
      const persisted = JSON.parse(fs.readFileSync(filename, "utf8"));
      for (const data of Object.values(persisted.workspaces))
        assert.deepEqual(data.products, [expectedProduct]);
      const bytes = fs.readFileSync(filename, "utf8");
      assert.deepEqual((await repository.read("default")).products, [
        expectedProduct,
      ]);
      assert.equal(fs.readFileSync(filename, "utf8"), bytes);
    }
  }
});

test("restoring a legacy version and saving its backup preserves Samplings notes through snapshots", () => {
  const { restoreVersion } = require("../src/lib/products.ts");
  const product = {
    ...emptyProduct(),
    samples: [{ ...row, status: "Current instructions" }],
  };
  const legacy = {
    ...snapshot(emptyProduct()),
    samples: [{ ...row, note: "logo print", status: "no wash" }],
  };
  product.versions = [
    {
      id: "old",
      name: "Old",
      createdAt: "2026-01-01T00:00:00.000Z",
      snapshot: legacy,
    },
  ];
  restoreVersion(product, "old", "2026-10-18T00:00:00.000Z");
  assert.deepEqual(product.samples, [{ ...row, note: "logo print · no wash" }]);
  assert.deepEqual(product.versions[0].snapshot.samples, [
    { ...row, note: "Current instructions" },
  ]);
  assert.equal(product.updatedAt, "2026-10-18T00:00:00.000Z");
  assert.equal(product.techPackUpdatedAt, "2026-10-18T00:00:00.000Z");
  product.samples[0].note = "Edited";
  assert.equal(legacy.samples[0].note, "logo print");
});

test("Samplings validation accepts optional string notes and drops status like other unknown fields", () => {
  const { productPatch } = require("../src/lib/api.ts");
  const { ApiError } = require("../src/lib/store.ts");
  for (const extra of [
    {},
    { note: "" },
    { note: "logo print, no wash" },
    { note: "x".repeat(20000) },
  ]) {
    assert.deepEqual(
      productPatch({
        samples: [{ ...row, ...extra, status: "Ignored", unknown: true }],
      }),
      {
        samples: [{ ...row, ...extra }],
      },
    );
  }
  for (const note of [null, 42, false, [], {}, "x".repeat(20001)]) {
    assert.throws(
      () => productPatch({ samples: [{ ...row, note }] }),
      (error) =>
        error instanceof ApiError &&
        error.status === 400 &&
        error.message === "Invalid note",
    );
  }
  for (const quantity of [-1, 1.5, 1000001, "2"]) {
    assert.throws(
      () => productPatch({ samples: [{ ...row, quantity }] }),
      (error) =>
        error instanceof ApiError &&
        error.message === "Invalid sample quantity",
    );
  }
});

test("share payload includes Samplings notes and removes the entire excluded section", () => {
  const { sharedProduct } = require("../src/lib/share.ts");
  const product = {
    ...emptyProduct(),
    samples: [{ ...row, note: "logo print, no wash" }],
  };
  const original = structuredClone(product);
  assert.deepEqual(sharedProduct(product).samples, [
    { ...row, note: "logo print, no wash" },
  ]);
  assert.deepEqual(
    sharedProduct({ ...product, excludedSections: ["samplings"] }).samples,
    [],
  );
  assert.deepEqual(product, original);
});

test("editor shows a Note column and share and print show notes without an empty trailing separator", (t) => {
  const extensions = require("node:module")._extensions;
  const previous = extensions[".css"];
  extensions[".css"] = () => {};
  t.after(() => {
    if (previous) extensions[".css"] = previous;
    else delete extensions[".css"];
  });
  const React = require("react");
  const { renderToStaticMarkup } = require("react-dom/server");
  const { load } = require("cheerio");
  const {
    ProductEditor,
    SharedProduct,
  } = require("../src/components/sites/techstyles/product-editor.tsx");
  const { sharedProduct } = require("../src/lib/share.ts");
  const product = {
    ...emptyProduct(),
    samples: [
      { ...row, note: "logo print, no wash" },
      { ...row, id: "blank", note: "" },
      { ...row, id: "absent" },
    ],
  };
  const editor = load(
    renderToStaticMarkup(
      React.createElement(ProductEditor, {
        product,
        manufacturers: [],
        onChange() {},
        onToggleSidebar() {},
        identity: { name: "My workspace", initials: "MW" },
      }),
    ),
  );
  assert.deepEqual(
    editor(".samplings-table th")
      .map((_, el) => editor(el).text())
      .get(),
    ["Size", "Colorway", "Quantity", "Note", ""],
  );
  assert.equal(
    editor('input[aria-label="Sample note"]').first().val(),
    "logo print, no wash",
  );
  assert.equal(editor('input[aria-label="Sample status"]').length, 0);
  for (const props of [
    { product },
    { token: "share", product: sharedProduct(product) },
  ]) {
    const rendered = load(
      renderToStaticMarkup(React.createElement(SharedProduct, props)),
    );
    assert.deepEqual(
      rendered("#samplings p")
        .map((_, el) => rendered(el).text())
        .get(),
      [
        "M · Black · 2 units · logo print, no wash",
        "M · Black · 2 units",
        "M · Black · 2 units",
      ],
    );
    const excluded = load(
      renderToStaticMarkup(
        React.createElement(SharedProduct, {
          ...props,
          product: { ...props.product, excludedSections: ["samplings"] },
        }),
      ),
    );
    assert.equal(excluded("#samplings").length, 0);
  }
});
