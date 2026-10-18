const { test, after } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
require("./support/load-ts.cjs");

const temporary = fs.mkdtempSync(path.join(os.tmpdir(), "techstyles-delete-"));
process.env.TECHSTYLES_DATA_DIR = path.join(temporary, "data");
after(() => fs.rmSync(temporary, { recursive: true, force: true }));

const { productsApi } = require("../src/lib/client-api.ts");
const { repository } = require("../src/lib/repository.ts");
const products = require("../src/app/api/products/route.ts");
const product = require("../src/app/api/products/[id]/route.ts");
const manufacturers = require("../src/app/api/manufacturers/route.ts");
const quotes = require("../src/app/api/quote-requests/route.ts");
const sharing = require("../src/app/api/products/[id]/share/route.ts");
const shared = require("../src/app/api/share/[token]/route.ts");
const versions = require("../src/app/api/products/[id]/versions/route.ts");
const { dashboardSummary } = require("../src/lib/dashboard.ts");
const context = (id) => ({ params: Promise.resolve({ id }) });
const request = (json) =>
  new Request("http://localhost/api", {
    method: "POST",
    body: JSON.stringify(json),
  });
const json = async (response) => {
  const result = await response;
  assert.equal(result.status, 200);
  return result.json();
};

function connectClient(t) {
  t.mock.method(globalThis, "fetch", async (url, init) => {
    assert.equal(init.method, "DELETE");
    assert.equal(init.body, undefined);
    const match = /^\/api\/products\/([^/]+)$/.exec(url);
    assert.ok(match, "delete uses the product endpoint with an encoded id");
    return product.DELETE(
      new Request(`http://localhost${url}`, init),
      context(decodeURIComponent(match[1])),
    );
  });
}

test("client deletion removes the product and its Quote Requests, preserving other products, Manufacturers and Workspaces", async (t) => {
  const factory = await json(
    manufacturers.POST(request({ name: "Test Factory" })),
  );
  const target = await json(
    products.POST(request({ name: "Test Hoodie", manufacturerId: factory.id })),
  );
  const kept = await json(
    products.POST(request({ name: "Keep Tee", manufacturerId: factory.id })),
  );
  await json(
    quotes.POST(request({ productId: target.id, manufacturerId: factory.id })),
  );
  const keptQuote = await json(
    quotes.POST(request({ productId: kept.id, manufacturerId: factory.id })),
  );
  const beforeProducts = await json(products.GET());
  const beforeManufacturers = await json(manufacturers.GET());
  const before = await repository.read("default");
  await repository.update("another-brand", (data) =>
    Object.assign(data, structuredClone(before)),
  );
  const otherWorkspace = await repository.read("another-brand");

  connectClient(t);
  assert.deepEqual(await productsApi.delete(target.id), { ok: true });

  assert.deepEqual(
    await json(products.GET()),
    beforeProducts.filter((p) => p.id !== target.id),
  );
  assert.equal((await product.GET(request(), context(target.id))).status, 404);
  assert.deepEqual(await json(quotes.GET(request())), [keptQuote]);
  assert.deepEqual(await json(manufacturers.GET()), beforeManufacturers);
  assert.deepEqual(await repository.read("another-brand"), otherWorkspace);
});

test("deleting a shared product with versions invalidates its share link and removes it from Dashboard counts and recent activity", async (t) => {
  const target = await json(
    products.POST(request({ name: "Shared Test Jacket" })),
  );
  await json(
    versions.POST(request({ name: "Original tech pack" }), context(target.id)),
  );
  const { token } = await json(sharing.POST(request(), context(target.id)));
  const shareContext = { params: Promise.resolve({ token }) };
  assert.equal(
    (await json(shared.GET(request(), shareContext))).name,
    "Shared Test Jacket",
  );
  const before = dashboardSummary(await json(products.GET()));

  connectClient(t);
  await productsApi.delete(target.id);

  const response = await shared.GET(request(), shareContext);
  assert.equal(response.status, 404);
  assert.deepEqual(await response.json(), {
    error: "This share link is unavailable or has been revoked.",
  });
  const after = dashboardSummary(await json(products.GET()));
  assert.equal(after.activeProducts, before.activeProducts - 1);
  assert.equal(after.sharedTechPacks, before.sharedTechPacks - 1);
  assert.ok(after.recentActivity.every((p) => p.id !== target.id));
});

test("deleting an unknown id returns the existing not-found error without changing the Workspace", async (t) => {
  const before = await repository.read("default");
  const response = await product.DELETE(
    request(),
    context("unknown / product"),
  );
  assert.equal(response.status, 404);
  assert.deepEqual(await response.json(), { error: "Product not found" });
  connectClient(t);
  await assert.rejects(productsApi.delete("unknown / product"), {
    message: "Product not found",
  });
  assert.deepEqual(await repository.read("default"), before);
});
