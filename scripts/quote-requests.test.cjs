const { test, after } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
require("./support/load-ts.cjs");
const temporary = fs.mkdtempSync(path.join(os.tmpdir(), "techstyles-quotes-"));
process.env.TECHSTYLES_DATA_DIR = path.join(temporary, "data");
after(() => fs.rmSync(temporary, { recursive: true, force: true }));
const { emptyProduct, snapshot, ApiError } = require("../src/lib/store.ts");
const {
  createManufacturer,
  deleteManufacturer,
} = require("../src/lib/manufacturers.ts");
const {
  createQuoteRequest,
  updateQuoteRequest,
  deleteQuoteRequest,
  validateQuote,
  changedSinceSent,
} = require("../src/lib/quote-requests.ts");
const {
  saveVersion,
  restoreVersion,
  patchProduct,
} = require("../src/lib/products.ts");
const { sharedProduct } = require("../src/lib/share.ts");
const { productSections } = require("../src/lib/types.ts");
const { repository } = require("../src/lib/repository.ts");
const workspace = require("../src/lib/workspace.ts");
const routes = require("../src/app/api/quote-requests/route.ts");
const route = require("../src/app/api/quote-requests/[id]/route.ts");
const products = require("../src/app/api/products/route.ts");
const productRoute = require("../src/app/api/products/[id]/route.ts");
const restoreRoute = require("../src/app/api/products/[id]/versions/[versionId]/restore/route.ts");
const sharing = require("../src/app/api/products/[id]/share/route.ts");
const sharedRoute = require("../src/app/api/share/[token]/route.ts");
const manufacturers = require("../src/app/api/manufacturers/route.ts");
const manufacturerRoute = require("../src/app/api/manufacturers/[id]/route.ts");
const now = "2026-10-14T12:00:00.000Z";
const later = "2026-10-15T12:00:00.000Z";
const request = (json = {}, url = "http://localhost/api") =>
  new Request(url, { method: "POST", body: JSON.stringify(json) });
const context = (id) => ({ params: Promise.resolve({ id }) });
const errorStatus = (status) => (error) =>
  error instanceof ApiError && error.status === status;
const quote = {
  unitPrice: 12.5,
  currency: "EUR",
  moq: 100,
  productionLeadTimeDays: 30,
  sampleCost: 45,
  sampleLeadTimeDays: 7,
  receivedAt: "2026-10-14",
  notes: "Private terms",
  attachment: { name: "Private quote.pdf", url: "/api/uploads/quote.pdf" },
};
function fixture(status = "draft") {
  const product = {
    ...emptyProduct(),
    id: "product",
    stage: "Development",
    techPackUpdatedAt: now,
  };
  const manufacturer = {
    ...createManufacturer({ name: "Private Factory" }),
    id: "factory",
  };
  const data = {
    products: [product],
    manufacturers: [manufacturer],
    quoteRequests: [],
    libraries: [],
  };
  const qr = createQuoteRequest(
    data,
    { productId: product.id, manufacturerId: manufacturer.id },
    now,
    "request",
  );
  qr.status = status;
  qr.sentAt = status === "draft" ? null : now;
  qr.quote = ["quoted", "chosen"].includes(status)
    ? structuredClone(quote)
    : null;
  return { data, product, manufacturer, qr };
}

test("creation starts draft, validates IDs and rejects duplicates in every status", () => {
  const { data, qr } = fixture();
  assert.equal(qr.status, "draft");
  assert.equal(qr.sentAt, null);
  assert.equal(qr.quote, null);
  for (const status of ["draft", "sent", "quoted", "chosen", "declined"]) {
    qr.status = status;
    assert.throws(
      () =>
        createQuoteRequest(data, {
          productId: "product",
          manufacturerId: "factory",
        }),
      errorStatus(409),
    );
  }
  for (const input of [
    { productId: "unknown", manufacturerId: "factory" },
    { productId: "product", manufacturerId: "unknown" },
  ])
    assert.throws(() => createQuoteRequest(data, input), errorStatus(404));
  for (const input of [
    {},
    { productId: null, manufacturerId: "factory" },
    { productId: "product", manufacturerId: 3 },
  ])
    assert.throws(() => createQuoteRequest(data, input), errorStatus(400));
});

const allowed = {
  draft: { send: "sent", decline: "declined" },
  sent: { decline: "declined" },
  quoted: { choose: "chosen", decline: "declined" },
  chosen: { unchoose: "quoted" },
  declined: { reopen: "sent" },
};
for (const status of Object.keys(allowed)) {
  for (const action of [
    "send",
    "decline",
    "reopen",
    "choose",
    "unchoose",
    "unknown",
  ]) {
    test(`${status} -> ${action}: ${allowed[status][action] ? "allowed" : "rejected"}`, () => {
      const { data, qr, product } = fixture(status);
      const before = structuredClone(data);
      if (!allowed[status][action]) {
        assert.throws(
          () => updateQuoteRequest(data, qr.id, { action }, later),
          errorStatus(400),
        );
        assert.deepEqual(data, before);
      } else {
        updateQuoteRequest(data, qr.id, { action }, later);
        assert.equal(qr.status, allowed[status][action]);
        assert.equal(qr.updatedAt, later);
        assert.equal(
          qr.sentAt,
          action === "send" ? later : before.quoteRequests[0].sentAt,
        );
        assert.equal(product.stage, before.products[0].stage);
        assert.equal(product.techPackUpdatedAt, now);
      }
    });
  }
  test(`saving a quote on ${status}`, () => {
    const { data, qr, product } = fixture(status);
    const before = structuredClone(data);
    if (["sent", "quoted", "chosen"].includes(status)) {
      updateQuoteRequest(data, qr.id, { quote }, later);
      assert.deepEqual(qr.quote, quote);
      assert.equal(qr.status, status === "sent" ? "quoted" : status);
      assert.deepEqual(product, before.products[0]);
      updateQuoteRequest(
        data,
        qr.id,
        { quote: { ...quote, unitPrice: 20 } },
        later,
      );
      assert.equal(qr.quote.unitPrice, 20);
    } else {
      assert.throws(
        () => updateQuoteRequest(data, qr.id, { quote }, later),
        errorStatus(400),
      );
      assert.deepEqual(data, before);
    }
  });
  test(`deleting a ${status} request leaves product unchanged`, () => {
    const { data, qr, product } = fixture(status);
    const before = structuredClone(product);
    deleteQuoteRequest(data, qr.id);
    assert.deepEqual(data.quoteRequests, []);
    assert.deepEqual(product, before);
  });
}

test("reopening resolves to quoted, sent or draft while preserving dates and quote", () => {
  for (const [sentAt, savedQuote, expected] of [
    [null, null, "draft"],
    [now, null, "sent"],
    [now, quote, "quoted"],
  ]) {
    const { data, qr } = fixture("declined");
    Object.assign(qr, { sentAt, quote: savedQuote });
    updateQuoteRequest(data, qr.id, { action: "reopen" }, later);
    assert.equal(qr.status, expected);
    assert.equal(qr.sentAt, sentAt);
    assert.deepEqual(qr.quote, savedQuote);
  }
});

test("quote bounds, required fields, currency, calendar date and local attachment validation", () => {
  assert.deepEqual(validateQuote(quote), quote);
  assert.deepEqual(
    validateQuote({ unitPrice: 0, currency: "USD" }, "2026-10-14"),
    {
      unitPrice: 0,
      currency: "USD",
      moq: null,
      productionLeadTimeDays: null,
      sampleCost: null,
      sampleLeadTimeDays: null,
      receivedAt: "2026-10-14",
      notes: "",
      attachment: null,
    },
  );
  for (const key of [
    "unitPrice",
    "sampleCost",
    "moq",
    "productionLeadTimeDays",
    "sampleLeadTimeDays",
  ]) {
    for (const value of [-1, NaN, Infinity, "2", {}, false])
      assert.throws(
        () => validateQuote({ ...quote, [key]: value }),
        errorStatus(400),
      );
    assert.equal(validateQuote({ ...quote, [key]: 0 })[key], 0);
    if (["moq", "productionLeadTimeDays", "sampleLeadTimeDays"].includes(key)) {
      for (const value of [1.5, Number.MAX_SAFE_INTEGER + 1])
        assert.throws(
          () => validateQuote({ ...quote, [key]: value }),
          errorStatus(400),
        );
    } else assert.equal(validateQuote({ ...quote, [key]: 1.5 })[key], 1.5);
  }
  for (const unitPrice of [undefined, null])
    assert.throws(
      () => validateQuote({ ...quote, unitPrice }),
      errorStatus(400),
    );
  for (const currency of [undefined, null, "eur", "EU", "EURO", "E1R", " EUR"])
    assert.throws(
      () => validateQuote({ ...quote, currency }),
      errorStatus(400),
    );
  for (const receivedAt of [
    "2026-02-30",
    "2026-13-01",
    "today",
    "2026-1-01",
    null,
  ])
    assert.throws(
      () => validateQuote({ ...quote, receivedAt }),
      errorStatus(400),
    );
  for (const url of [
    "https://example.com/quote.pdf",
    "//example.com/quote.pdf",
    "/api/uploads/../secret",
    "data:application/pdf;base64,x",
    "/api/uploads/%2e%2e/secret",
    "/etc/file",
    "/sites/techstyles/quote.pdf",
    "/api/uploads/quote.pdf?x=1",
  ])
    assert.throws(
      () => validateQuote({ ...quote, attachment: { name: "quote", url } }),
      errorStatus(400),
    );
  for (const attachment of [
    [],
    {},
    { name: "", url: "/api/uploads/quote.pdf" },
  ])
    assert.throws(
      () => validateQuote({ ...quote, attachment }),
      errorStatus(400),
    );
  assert.throws(() => validateQuote({ ...quote, notes: 3 }), errorStatus(400));
  assert.throws(() => validateQuote(null), errorStatus(400));
});

test("choose replaces only the prior chosen request, preserves stage; unchoose and delete keep manufacturer", () => {
  const { data, qr, product } = fixture("quoted");
  for (const [id, status, productId] of [
    ["other", "chosen", "product"],
    ["untouched", "declined", "product"],
    ["separate", "chosen", "elsewhere"],
  ])
    data.quoteRequests.push({
      ...structuredClone(qr),
      id,
      status,
      productId,
      manufacturerId: id,
    });
  const before = structuredClone(data.quoteRequests);
  const result = updateQuoteRequest(data, qr.id, { action: "choose" }, later);
  assert.deepEqual(result.product, {
    id: product.id,
    manufacturerId: qr.manufacturerId,
  });
  assert.equal(product.stage, "Development");
  assert.equal(product.techPackUpdatedAt, now);
  assert.equal(data.quoteRequests[1].status, "quoted");
  assert.deepEqual(data.quoteRequests.slice(2), before.slice(2));
  updateQuoteRequest(data, qr.id, { action: "unchoose" }, later);
  assert.equal(product.manufacturerId, qr.manufacturerId);
  deleteQuoteRequest(data, qr.id);
  assert.equal(product.manufacturerId, qr.manufacturerId);
});

test("invalid updates and unknown requests do not change data", () => {
  const { data, qr } = fixture("sent");
  for (const input of [
    {},
    { action: "decline", quote },
    { quote: { ...quote, unitPrice: -1 } },
  ]) {
    const before = structuredClone(data);
    assert.throws(
      () => updateQuoteRequest(data, qr.id, input),
      errorStatus(400),
    );
    assert.deepEqual(data, before);
  }
  assert.throws(
    () => updateQuoteRequest(data, "missing", { action: "send" }),
    errorStatus(404),
  );
  assert.throws(() => deleteQuoteRequest(data, "missing"), errorStatus(404));
});

test("manufacturer delete blocked by every request status even without a product link", () => {
  for (const status of Object.keys(allowed)) {
    const { data, manufacturer, qr } = fixture(status);
    assert.throws(
      () => deleteManufacturer(data, manufacturer.id),
      (error) =>
        errorStatus(409)(error) &&
        error.message === "Manufacturer is used by 1 Quote Request",
    );
    deleteQuoteRequest(data, qr.id);
    deleteManufacturer(data, manufacturer.id);
    assert.deepEqual(data.manufacturers, []);
  }
});

test("manufacturer delete messages omit empty usage and handle singular and plural requests", () => {
  for (const [count, linked, expected] of [
    [1, false, "Manufacturer is used by 1 Quote Request"],
    [2, false, "Manufacturer is used by 2 Quote Requests"],
    [
      1,
      true,
      "Manufacturer is used by products: Studio Hoodie and by 1 Quote Request",
    ],
    [
      2,
      true,
      "Manufacturer is used by products: Studio Hoodie and by 2 Quote Requests",
    ],
  ]) {
    const { data, manufacturer, product, qr } = fixture();
    product.name = "Studio Hoodie";
    if (linked) product.manufacturerId = manufacturer.id;
    if (count === 2) data.quoteRequests.push({ ...qr, id: "second-request" });
    assert.throws(
      () => deleteManufacturer(data, manufacturer.id),
      (error) => errorStatus(409)(error) && error.message === expected,
    );
  }
});

test("tech pack clock ignores manufacturer, comments, archived, stage and no-op patches; restore always sets it", () => {
  const { product } = fixture();
  const previous = snapshot(product);
  saveVersion(product, "Original", now);
  patchProduct(
    product,
    {
      manufacturerId: "another",
      comments: [
        {
          id: "comment",
          section: "overview",
          author: "Me",
          text: "Private",
          createdAt: now,
        },
      ],
      archived: true,
    },
    later,
  );
  assert.equal(product.techPackUpdatedAt, now);
  patchProduct(product, { name: product.name }, later);
  assert.equal(product.techPackUpdatedAt, now);
  patchProduct(product, { stage: "Sampling" }, later);
  assert.equal(product.stage, "Sampling");
  assert.equal(product.techPackUpdatedAt, now);
  patchProduct(product, { description: "Changed specification" }, later);
  assert.equal(product.techPackUpdatedAt, later);
  restoreVersion(product, product.versions[0].id, "2026-10-16T00:00:00.000Z");
  assert.equal(product.techPackUpdatedAt, "2026-10-16T00:00:00.000Z");
  assert.equal(product.manufacturerId, "another");
  assert.deepEqual(snapshot(product), previous);
});

test("changed since sent uses the tech pack clock for active sent requests only", () => {
  for (const status of Object.keys(allowed)) {
    const { product, qr } = fixture(status);
    qr.sentAt = now;
    assert.equal(changedSinceSent(product, qr), false);
    product.techPackUpdatedAt = later;
    assert.equal(
      changedSinceSent(product, qr),
      ["sent", "quoted", "chosen"].includes(status),
    );
    qr.sentAt = null;
    assert.equal(changedSinceSent(product, qr), false);
  }
});

const privateFields = [
  "manufacturer",
  "manufacturerId",
  "manufacturers",
  "supplier",
  "quote",
  "quoteRequest",
  "quoteRequests",
  "techPackUpdatedAt",
];
function assertPrivate(content) {
  for (const key of privateFields)
    assert.equal(Object.hasOwn(content, key), false, key);
  assert.doesNotMatch(
    JSON.stringify(content),
    /Private Factory|Private terms|Private quote/,
  );
}
test("snapshot, versions and sharedProduct allow only tech pack content regardless of exclusions", () => {
  const { product, qr, manufacturer } = fixture("chosen");
  Object.assign(product, {
    manufacturerId: manufacturer.id,
    manufacturer,
    manufacturers: [manufacturer],
    quoteRequests: [qr],
    quoteRequest: qr,
    quote,
    supplier: manufacturer.name,
  });
  for (const excludedSections of [[], ["overview"], [...productSections]]) {
    product.excludedSections = excludedSections;
    assertPrivate(snapshot(product));
    assertPrivate(sharedProduct(product));
    saveVersion(product, "Safe");
    for (const version of product.versions) assertPrivate(version.snapshot);
  }
});

test("workspace normalization initializes requests and tech pack clocks and sanitizes legacy versions", async () => {
  const product = emptyProduct();
  delete product.techPackUpdatedAt;
  product.versions = [
    {
      id: "legacy",
      name: "Legacy",
      createdAt: now,
      snapshot: {
        ...snapshot(product),
        techPackUpdatedAt: now,
        quote,
        quoteRequests: [quote],
        manufacturer: "Private Factory",
      },
    },
  ];
  fs.mkdirSync(process.env.TECHSTYLES_DATA_DIR, { recursive: true });
  fs.writeFileSync(
    path.join(process.env.TECHSTYLES_DATA_DIR, "workspace.json"),
    JSON.stringify({
      version: 2,
      workspaces: {
        legacy: { products: [product], manufacturers: [], libraries: [] },
      },
    }),
  );
  const migrated = await repository.read("legacy");
  assert.deepEqual(migrated.quoteRequests, []);
  assert.equal(migrated.products[0].techPackUpdatedAt, product.updatedAt);
  assertPrivate(migrated.products[0].versions[0].snapshot);
  const persisted = JSON.parse(
    fs.readFileSync(
      path.join(process.env.TECHSTYLES_DATA_DIR, "workspace.json"),
    ),
  );
  assert.deepEqual(persisted.workspaces.legacy.quoteRequests, []);
  assert.equal(
    persisted.workspaces.legacy.products[0].techPackUpdatedAt,
    product.updatedAt,
  );
  assert.deepEqual((await repository.read("new-workspace")).quoteRequests, []);
  assert.deepEqual((await repository.read("default")).quoteRequests, []);
});

test("API persists workflow, scopes requests, protects shares, advances content clock and cascades product deletion", async (t) => {
  const m = await (
    await manufacturers.POST(request({ name: "Private Factory" }))
  ).json();
  const p = await (
    await products.POST(
      request({ name: "Quote Product", stage: "Development" }),
    )
  ).json();
  const pc = context(p.id);
  await repository.update("default", (data) => {
    const product = data.products.find((item) => item.id === p.id);
    product.techPackUpdatedAt = "2026-01-01T00:00:00.000Z";
    saveVersion(product, "Original", now);
  });
  const created = await (
    await routes.POST(request({ productId: p.id, manufacturerId: m.id }))
  ).json();
  const ctx = context(created.id);
  assert.equal(created.status, "draft");
  assert.equal(
    (await routes.POST(request({ productId: p.id, manufacturerId: m.id })))
      .status,
    409,
  );
  assert.equal(
    (await routes.POST(request({ productId: "missing", manufacturerId: m.id })))
      .status,
    404,
  );
  assert.equal(
    (await routes.POST(request({ productId: p.id, manufacturerId: "missing" })))
      .status,
    404,
  );
  assert.deepEqual(
    await (
      await routes.GET(
        request({}, `http://localhost/api/quote-requests?productId=${p.id}`),
      )
    ).json(),
    [created],
  );
  assert.deepEqual(
    await (
      await routes.GET(
        request({}, "http://localhost/api/quote-requests?productId=missing"),
      )
    ).json(),
    [],
  );
  assert.equal((await route.PATCH(request({ quote }), ctx)).status, 400);
  const sent = await (
    await route.PATCH(request({ action: "send" }), ctx)
  ).json();
  assert.ok(sent.request.sentAt);
  assert.equal(sent.request.status, "sent");
  assert.equal(
    (await route.PATCH(request({ quote: { ...quote, unitPrice: -1 } }), ctx))
      .status,
    400,
  );
  const quoted = await (await route.PATCH(request({ quote }), ctx)).json();
  assert.equal(quoted.request.status, "quoted");
  const chosen = await (
    await route.PATCH(request({ action: "choose" }), ctx)
  ).json();
  assert.equal(chosen.product.manufacturerId, m.id);
  assert.equal(
    (await (await productRoute.GET(request(), pc)).json()).stage,
    "Development",
  );
  for (const patch of [
    { manufacturerId: m.id },
    {
      comments: [
        {
          id: "note",
          section: "overview",
          author: "Me",
          text: "Private",
          createdAt: now,
        },
      ],
    },
    { archived: true },
    { stage: "Sampling" },
  ]) {
    const updated = await (await productRoute.PATCH(request(patch), pc)).json();
    assert.equal(updated.techPackUpdatedAt, "2026-01-01T00:00:00.000Z");
    assert.equal(changedSinceSent(updated, chosen.request), false);
  }
  const edited = await (
    await productRoute.PATCH(request({ description: "New tech pack" }), pc)
  ).json();
  assert.notEqual(edited.techPackUpdatedAt, "2026-01-01T00:00:00.000Z");
  await repository.update("default", (data) => {
    data.products.find((item) => item.id === p.id).techPackUpdatedAt = later;
  });
  assert.equal(
    changedSinceSent(await (await productRoute.GET(request(), pc)).json(), {
      ...chosen.request,
      sentAt: now,
    }),
    true,
  );
  const share = await (await sharing.POST(request(), pc)).json();
  for (const excludedSections of [[], ["overview"], [...productSections]]) {
    await productRoute.PATCH(request({ excludedSections }), pc);
    const visible = await (
      await sharedRoute.GET(request(), {
        params: Promise.resolve({ token: share.token }),
      })
    ).json();
    assertPrivate(visible);
    assert.equal(JSON.stringify(visible).includes(m.id), false);
    assert.equal(JSON.stringify(visible).includes(created.id), false);
  }
  const beforeRestore = await (await productRoute.GET(request(), pc)).json();
  const restored = await (
    await restoreRoute.POST(request(), {
      params: Promise.resolve({
        id: p.id,
        versionId: beforeRestore.versions[0].id,
      }),
    })
  ).json();
  assert.notEqual(restored.techPackUpdatedAt, later);
  assert.equal(restored.manufacturerId, m.id);
  restored.versions.forEach((version) => assertPrivate(version.snapshot));
  await productRoute.PATCH(request({ manufacturerId: null }), pc);
  const blocked = await manufacturerRoute.DELETE(request(), context(m.id));
  assert.equal(blocked.status, 409);
  assert.equal(
    (await blocked.json()).error,
    "Manufacturer is used by 1 Quote Request",
  );
  const resolve = t.mock.method(
    workspace,
    "currentWorkspaceId",
    async () => "other-workspace",
  );
  assert.deepEqual(await (await routes.GET(request())).json(), []);
  assert.equal(
    (await routes.POST(request({ productId: p.id, manufacturerId: m.id })))
      .status,
    404,
  );
  assert.equal(
    (await route.PATCH(request({ action: "unchoose" }), ctx)).status,
    404,
  );
  assert.equal((await route.DELETE(request(), ctx)).status, 404);
  resolve.mock.restore();
  const unchosen = await (
    await route.PATCH(request({ action: "unchoose" }), ctx)
  ).json();
  assert.equal(unchosen.request.status, "quoted");
  assert.equal(unchosen.product.manufacturerId, null);
  const m2 = await (
    await manufacturers.POST(request({ name: "Second Factory" }))
  ).json();
  const other = await (
    await products.POST(request({ name: "Other Product" }))
  ).json();
  const otherRequest = await (
    await routes.POST(request({ productId: other.id, manufacturerId: m2.id }))
  ).json();
  await productRoute.DELETE(request(), pc);
  const remaining = await (await routes.GET(request())).json();
  assert.deepEqual(remaining, [otherRequest]);
  assert.equal(
    (await manufacturerRoute.DELETE(request(), context(m.id))).status,
    200,
  );
  assert.equal(
    (await route.DELETE(request(), context(otherRequest.id))).status,
    200,
  );
  assert.deepEqual(await (await routes.GET(request())).json(), []);
});

test("editor sourcing is separate from the pack, shows only valid actions, and stays absent from share and print", (t) => {
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
  const labels = {
    send: "Mark as sent",
    decline: "Decline",
    choose: "Choose",
    unchoose: "Unchoose",
    reopen: "Reopen",
  };
  for (const status of Object.keys(allowed)) {
    const { product, qr, manufacturer } = fixture(status);
    product.techPackUpdatedAt = later;
    product.manufacturerId = manufacturer.id;
    const props = {
      product,
      identity: { name: 'My workspace', initials: 'MW' },
      quoteRequests: [qr],
      manufacturers: [manufacturer],
      onChange() {},
      onToggleSidebar() {},
      onManufacturerSave() {},
    };
    const $ = load(
      renderToStaticMarkup(React.createElement(ProductEditor, props)),
    );
    assert.equal($(".pack-document .sourcing-panel").length, 0);
    assert.equal($(".pack-index .sourcing-panel").length, 0);
    assert.equal($(".sourcing-panel").length, 1);
    assert.match(
      $(".sourcing-heading").text(),
      /Only visible to you.*Never shared/,
    );
    assert.equal($('.sourcing-add option[value="factory"]').length, 0);
    assert.equal(
      $('.sourcing-add option[value="__new__"]').text(),
      "+ New manufacturer…",
    );
    const buttons = $(".sourcing-request button")
      .toArray()
      .map((node) => $(node).text());
    for (const [action, label] of Object.entries(labels))
      assert.equal(buttons.includes(label), !!allowed[status][action]);
    assert.equal(
      buttons.includes(qr.quote ? "Edit quote" : "Enter quote"),
      ["sent", "quoted", "chosen"].includes(status),
    );
    assert.ok(buttons.includes("Delete"));
    assert.equal(
      $(".sourcing-warning").length,
      ["sent", "quoted", "chosen"].includes(status) ? 1 : 0,
    );
    if (qr.quote) {
      assert.match($(".sourcing-summary").text(), /12.5 EUR/);
      assert.match($(".sourcing-summary").text(), /100/);
      assert.match($(".sourcing-summary").text(), /30 days/);
      assert.match($(".sourcing-summary").text(), /45 EUR/);
      assert.match($(".sourcing-summary").text(), /7 days/);
      assert.match($(".sourcing-request").text(), /Private terms/);
    }
    for (const excludedSections of [[], ["overview"], [...productSections]]) {
      const enriched = {
        ...product,
        excludedSections,
        quoteRequests: [qr],
        quote,
        manufacturer,
      };
      for (const publicProps of [
        { product: enriched },
        { token: "share", product: sharedProduct(enriched) },
      ]) {
        const html = renderToStaticMarkup(
          React.createElement(SharedProduct, publicProps),
        );
        assert.doesNotMatch(
          html,
          /Private Factory|Private terms|Private quote|sourcing-panel|Tech pack changed since sent/,
        );
      }
    }
  }
});
