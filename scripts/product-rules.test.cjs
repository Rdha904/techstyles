const { test, after } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
require("./support/load-ts.cjs");

const temporary = fs.mkdtempSync(
  path.join(os.tmpdir(), "techstyles-product-rules-"),
);
process.env.TECHSTYLES_DATA_DIR = path.join(temporary, "data");
after(() => fs.rmSync(temporary, { recursive: true, force: true }));

const { ApiError, emptyProduct, snapshot } = require("../src/lib/store.ts");
const {
  emptyBrandProfile,
  emptyBrandBook,
} = require("../src/lib/brand-types.ts");
const {
  productVersionLimit,
  saveVersion,
  restoreVersion,
  shareProduct,
  revokeProductShare,
} = require("../src/lib/products.ts");
const { publishBrandBook, unpublishBrandBook } = require("../src/lib/brand.ts");

const now = "2026-10-14T12:00:00.000Z";
const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

function productFixture() {
  return {
    ...emptyProduct(),
    id: "product-id",
    name: "Original",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-02-01T00:00:00.000Z",
    shareToken: "existing-token",
    colors: [{ id: "color", name: "Black", hex: "#000000" }],
    measurements: [
      { id: "chest", name: "Chest", tolerance: "1", values: { M: "60" } },
    ],
  };
}

test("saveVersion prepends an independent snapshot with exact JSON field order", () => {
  const product = productFixture();
  const original = structuredClone(product);
  const content = snapshot(product);
  assert.equal(saveVersion(product, "Reviewed", now), product);
  const version = product.versions[0];
  assert.match(version.id, uuidPattern);
  assert.equal(
    JSON.stringify(product),
    JSON.stringify({
      ...original,
      versions: [
        { id: version.id, name: "Reviewed", createdAt: now, snapshot: content },
      ],
    }),
  );
  for (const field of [
    "id",
    "createdAt",
    "updatedAt",
    "versions",
    "shareToken",
  ]) {
    assert.equal(Object.hasOwn(version.snapshot, field), false);
  }
  product.name = "Edited";
  product.colors[0].name = "White";
  product.measurements[0].values.M = "70";
  assert.deepEqual(version.snapshot, content);
});

test("saveVersion keeps exactly 50 versions and drops the oldest on the 51st save", () => {
  assert.equal(productVersionLimit, 50);
  const product = productFixture();
  for (let index = 0; index < 50; index++)
    saveVersion(product, `Version ${index}`, now);
  const history = [...product.versions];
  assert.equal(history.length, 50);
  saveVersion(product, "Version 50", now);
  assert.equal(product.versions.length, 50);
  assert.deepEqual(product.versions.slice(1), history.slice(0, 49));
  assert.equal(
    product.versions.some((version) => version.id === history[49].id),
    false,
  );
});

test("restoreVersion restores content, backs up prior content, and preserves metadata and capped history", () => {
  const product = productFixture();
  saveVersion(product, "Original version", now);
  const target = product.versions[0];
  product.name = "Edited";
  product.colors[0].name = "White";
  product.measurements[0].values.M = "70";
  product.archived = true;
  product.excludedSections = ["sizes"];
  for (let index = 0; index < 49; index++)
    saveVersion(product, `Edit ${index}`, now);
  const before = structuredClone(product);
  const history = [...product.versions];
  assert.equal(history[49], target);
  assert.equal(restoreVersion(product, target.id, now), product);
  const backup = product.versions[0];
  assert.match(backup.id, uuidPattern);
  const expected = {
    ...before,
    ...structuredClone(target.snapshot),
    updatedAt: now,
    techPackUpdatedAt: now,
    versions: [
      {
        id: backup.id,
        name: "Before restore",
        createdAt: now,
        snapshot: snapshot(before),
      },
      ...history.slice(0, 49),
    ],
  };
  assert.equal(JSON.stringify(product), JSON.stringify(expected));
  assert.equal(product.id, before.id);
  assert.equal(product.createdAt, before.createdAt);
  assert.equal(product.shareToken, before.shareToken);
  assert.equal(product.versions.length, 50);
  assert.deepEqual(product.versions.slice(1), history.slice(0, 49));
  assert.deepEqual(snapshot(product), target.snapshot);
  assert.deepEqual(backup.snapshot, snapshot(before));
  product.colors[0].name = "Blue";
  product.measurements[0].values.M = "80";
  assert.equal(target.snapshot.colors[0].name, "Black");
  assert.equal(target.snapshot.measurements[0].values.M, "60");
  assert.equal(backup.snapshot.colors[0].name, "White");
  assert.equal(backup.snapshot.measurements[0].values.M, "70");
});

test("restoreVersion retains the target version when history has room", () => {
  const product = productFixture();
  saveVersion(product, "Original", now);
  const version = product.versions[0];
  restoreVersion(product, version.id, now);
  assert.equal(product.versions.length, 2);
  assert.equal(product.versions[1], version);
});

test("restoreVersion throws ApiError 404 Version not found without changing the product", () => {
  const product = productFixture();
  const original = structuredClone(product);
  assert.throws(
    () => restoreVersion(product, "unknown", now),
    (error) =>
      error instanceof ApiError &&
      error.status === 404 &&
      error.message === "Version not found",
  );
  assert.deepEqual(product, original);
});

test("version rules default to ISO timestamps and preserve separate restore clock reads", (t) => {
  const product = productFixture();
  const timestamps = [
    now,
    "2026-10-14T12:00:00.001Z",
    "2026-10-14T12:00:00.002Z",
  ];
  let reads = 0;
  t.mock.method(Date.prototype, "toISOString", () => timestamps[reads++]);
  saveVersion(product, "Default timestamp");
  const version = product.versions[0];
  assert.equal(version.createdAt, timestamps[0]);
  restoreVersion(product, version.id);
  assert.equal(product.versions[0].createdAt, timestamps[1]);
  assert.equal(product.updatedAt, timestamps[2]);
  assert.equal(reads, 3);
});

test("shareProduct issues an idempotent 48-hex token and revokeProductShare allows a new token", () => {
  const product = { ...productFixture(), shareToken: null };
  const original = structuredClone(product);
  const shared = shareProduct(product);
  assert.match(shared.token, /^[0-9a-f]{48}$/);
  assert.equal(
    JSON.stringify(shared),
    JSON.stringify({ token: shared.token, url: `/share/${shared.token}` }),
  );
  assert.deepEqual(shareProduct(product), shared);
  assert.deepEqual(product, { ...original, shareToken: shared.token });
  assert.equal(revokeProductShare(product), undefined);
  assert.equal(product.shareToken, null);
  const next = shareProduct(product);
  assert.notEqual(next.token, shared.token);
  assert.equal(next.url, `/share/${next.token}`);
  const existing = productFixture();
  assert.deepEqual(shareProduct(existing), {
    token: "existing-token",
    url: "/share/existing-token",
  });
});

test("publishBrandBook requires a saved profile with the existing ApiError 400 message", () => {
  for (const brandProfile of [undefined, null]) {
    const data = { products: [], libraries: [], brandProfile };
    const before = structuredClone(data);
    assert.throws(
      () => publishBrandBook(data),
      (error) =>
        error instanceof ApiError &&
        error.status === 400 &&
        error.message === "Save a brand profile before publishing.",
    );
    assert.deepEqual(data, before);
  }
});

test("publishBrandBook creates a missing book, preserves its JSON shape, and is idempotent", () => {
  for (const brandBook of [undefined, null]) {
    const data = {
      products: [],
      libraries: [],
      brandProfile: { ...emptyBrandProfile(), name: "Brand" },
      brandBook,
    };
    const published = publishBrandBook(data);
    assert.match(published.token, /^[0-9a-f]{48}$/);
    assert.equal(
      JSON.stringify(published),
      JSON.stringify({
        token: published.token,
        url: `/share/brand-book/${published.token}`,
      }),
    );
    assert.equal(
      JSON.stringify(data.brandBook),
      JSON.stringify({ ...emptyBrandBook(), shareToken: published.token }),
    );
    const book = data.brandBook;
    assert.deepEqual(publishBrandBook(data), published);
    assert.equal(data.brandBook, book);
  }
});

test("unpublishBrandBook clears only the token, is a no-op without a book, and permits republishing", () => {
  const book = {
    coverUrl: "/api/uploads/cover.png",
    imageUrls: ["/api/uploads/image.png"],
    shareToken: "existing",
    updatedAt: now,
  };
  const data = {
    products: [],
    libraries: [],
    brandProfile: emptyBrandProfile(),
    brandBook: book,
  };
  assert.deepEqual(publishBrandBook(data), {
    token: "existing",
    url: "/share/brand-book/existing",
  });
  assert.equal(unpublishBrandBook(data), undefined);
  assert.equal(data.brandBook, book);
  assert.deepEqual(book, {
    coverUrl: "/api/uploads/cover.png",
    imageUrls: ["/api/uploads/image.png"],
    shareToken: null,
    updatedAt: now,
  });
  assert.notEqual(publishBrandBook(data).token, "existing");
  for (const absent of [
    { products: [], libraries: [] },
    { products: [], libraries: [], brandBook: null },
  ]) {
    const original = structuredClone(absent);
    assert.equal(unpublishBrandBook(absent), undefined);
    assert.deepEqual(absent, original);
  }
});
