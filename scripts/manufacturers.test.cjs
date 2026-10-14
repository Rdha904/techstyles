const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
require('./support/load-ts.cjs');

const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'techstyles-manufacturers-'));
process.env.TECHSTYLES_DATA_DIR = path.join(temporary, 'data');
after(() => fs.rmSync(temporary, { recursive: true, force: true }));

const { ApiError, emptyProduct, snapshot } = require('../src/lib/store.ts');
const { productSections } = require('../src/lib/types.ts');
const { productPatch } = require('../src/lib/api.ts');
const { saveVersion, restoreVersion } = require('../src/lib/products.ts');
const { sharedProduct } = require('../src/lib/share.ts');
const {
  manufacturerPatch, createManufacturer, migrateManufacturers,
  deleteManufacturer, validateManufacturerId,
} = require('../src/lib/manufacturers.ts');
const { repository } = require('../src/lib/repository.ts');
const workspace = require('../src/lib/workspace.ts');
const manufacturers = require('../src/app/api/manufacturers/route.ts');
const manufacturerRoute = require('../src/app/api/manufacturers/[id]/route.ts');
const products = require('../src/app/api/products/route.ts');
const productRoute = require('../src/app/api/products/[id]/route.ts');
const sharing = require('../src/app/api/products/[id]/share/route.ts');
const sharedRoute = require('../src/app/api/share/[token]/route.ts');
const context = id => ({ params: Promise.resolve({ id }) });
const request = payload => new Request('http://localhost/api', { method: 'POST', body: JSON.stringify(payload) });
const badRequest = error => error instanceof ApiError && error.status === 400;

function legacyProduct(name, supplier) {
  const product = { ...emptyProduct(), name, supplier };
  delete product.manufacturerId;
  product.versions = [{ id: 'old', name: 'Old', createdAt: product.createdAt,
    snapshot: { ...snapshot(product), supplier: 'Version-only factory' } }];
  return product;
}

function legacyWorkspace() {
  const materials = [{ id: 'cotton', name: 'Cotton', composition: '', weight: '', supplier: 'Fabric mill', placement: '' }];
  const libraries = [{ collection: 'materials', data: { supplier: 'Trim vendor' } }];
  const data = { products: [legacyProduct('Hoodie', '  First Factory  '),
    legacyProduct('T-shirt', 'first FACTORY'), legacyProduct('Jacket', 'Second Factory'),
    legacyProduct('Dress', '   '), legacyProduct('Skirt', '')], libraries };
  data.products[0].materials = materials;
  data.products[0].versions[0].snapshot.materials = structuredClone(materials);
  return data;
}

test('migration deduplicates trimmed names case-insensitively, keeps first spelling, and strips old sourcing', () => {
  const data = legacyWorkspace();
  const original = structuredClone(data);
  assert.equal(migrateManufacturers(data), true);
  assert.deepEqual(data.manufacturers.map(item => item.name), ['First Factory', 'Second Factory']);
  const [first, second] = data.manufacturers;
  assert.equal(data.products[0].manufacturerId, first.id);
  assert.equal(data.products[1].manufacturerId, first.id);
  assert.equal(data.products[2].manufacturerId, second.id);
  assert.equal(data.products[3].manufacturerId, null);
  assert.equal(data.products[4].manufacturerId, null);
  for (const product of data.products) {
    assert.equal(Object.hasOwn(product, 'supplier'), false);
    assert.equal(Object.hasOwn(product.versions[0].snapshot, 'supplier'), false);
    assert.equal(Object.hasOwn(product.versions[0].snapshot, 'manufacturerId'), false);
  }
  assert.deepEqual(data.products[0].materials, original.products[0].materials);
  assert.deepEqual(data.products[0].versions[0].snapshot.materials, original.products[0].versions[0].snapshot.materials);
  assert.deepEqual(data.libraries, original.libraries);
  assert.deepEqual(Object.keys(data).sort(), ['libraries', 'manufacturers', 'products']);
  assert.deepEqual(first.location, { country: '', city: '' });
  assert.deepEqual(first.categories, []);
  assert.equal(first.createdAt, first.updatedAt);
  const migrated = structuredClone(data);
  assert.equal(migrateManufacturers(data), false);
  assert.deepEqual(data, migrated);
});

test('an existing manufacturers array prevents migration even when old supplier values appear', () => {
  for (const existing of [[], [createManufacturer({ name: 'Existing' })]]) {
    const product = { ...legacyProduct('Hoodie', 'Do not create'), manufacturerId: existing[0]?.id ?? null };
    product.versions[0].snapshot.manufacturerId = 'obsolete';
    const data = { manufacturers: existing, products: [product], libraries: [] };
    migrateManufacturers(data);
    assert.equal(data.manufacturers, existing);
    assert.equal(data.manufacturers.length, existing.length);
    assert.equal(product.manufacturerId, existing[0]?.id ?? null);
    assert.equal(Object.hasOwn(product, 'supplier'), false);
    assert.equal(Object.hasOwn(product.versions[0].snapshot, 'supplier'), false);
    assert.equal(Object.hasOwn(product.versions[0].snapshot, 'manufacturerId'), false);
    assert.equal(migrateManufacturers(data), false);
  }
});

test('repository read persists migration once for legacy and versioned files, including simultaneous reads', async () => {
  fs.mkdirSync(process.env.TECHSTYLES_DATA_DIR, { recursive: true });
  const filename = path.join(process.env.TECHSTYLES_DATA_DIR, 'workspace.json');
  for (const raw of [legacyWorkspace(), { version: 2, workspaces: { default: legacyWorkspace(), other: legacyWorkspace() } }]) {
    fs.writeFileSync(filename, JSON.stringify(raw));
    const reads = await Promise.all(Array.from({ length: 5 }, () => repository.read('default')));
    const persisted = JSON.parse(fs.readFileSync(filename, 'utf8'));
    assert.equal(persisted.version, 2);
    assert.equal(persisted.workspaces.default.manufacturers.length, 2);
    for (const data of reads) assert.deepEqual(data, persisted.workspaces.default);
    const before = fs.readFileSync(filename, 'utf8');
    await repository.read('default');
    assert.equal(fs.readFileSync(filename, 'utf8'), before);
    await Promise.all([repository.read('default'), repository.update('default', data => { data.products[0].description = 'Saved'; })]);
    assert.equal((await repository.read('default')).products[0].description, 'Saved');
    if (persisted.workspaces.other) {
      assert.notEqual(persisted.workspaces.other.manufacturers[0].id, persisted.workspaces.default.manufacturers[0].id);
      assert.equal((await repository.read('other')).products[0].description, '');
    }
  }
});

test('new and seeded workspaces have no manufacturers and products have a null manufacturer', async () => {
  assert.equal(emptyProduct().manufacturerId, null);
  assert.equal(Object.hasOwn(emptyProduct(), 'supplier'), false);
  const filename = path.join(process.env.TECHSTYLES_DATA_DIR, 'workspace.json');
  fs.rmSync(filename);
  const seeded = await repository.read('default');
  assert.deepEqual(seeded.manufacturers, []);
  assert.equal(seeded.products[0].manufacturerId, null);
  assert.deepEqual((await repository.read('new-brand')).manufacturers, []);
});

test('snapshots exclude manufacturer and legacy supplier; restore ignores both and keeps current sourcing', () => {
  const product = { ...emptyProduct(), manufacturerId: 'first' };
  saveVersion(product, 'Original');
  const version = product.versions[0];
  assert.equal(Object.hasOwn(version.snapshot, 'manufacturerId'), false);
  assert.equal(Object.hasOwn(snapshot({ ...product, supplier: 'Old factory' }), 'supplier'), false);
  version.snapshot.supplier = 'Old factory';
  version.snapshot.manufacturerId = 'obsolete';
  product.name = 'Edited';
  product.manufacturerId = 'current';
  restoreVersion(product, version.id);
  assert.equal(product.name, 'Untitled product');
  assert.equal(product.manufacturerId, 'current');
  assert.equal(Object.hasOwn(product, 'supplier'), false);
  assert.equal(Object.hasOwn(product.versions[0].snapshot, 'manufacturerId'), false);
  assert.equal(Object.hasOwn(product.versions[0].snapshot, 'supplier'), false);
});

test('sharedProduct strips product sourcing for every section combination while preserving material suppliers', () => {
  const product = { ...emptyProduct(), manufacturerId: 'private-factory', supplier: 'Private factory',
    materials: [{ id: 'cotton', name: 'Cotton', composition: '', weight: '', supplier: 'Fabric mill', placement: '' }] };
  const original = structuredClone(product);
  for (let mask = 0; mask < 2 ** productSections.length; mask++) {
    const excludedSections = productSections.filter((_, index) => mask & (1 << index));
    const shared = sharedProduct({ ...product, excludedSections });
    assert.equal(Object.hasOwn(shared, 'manufacturerId'), false);
    assert.equal(Object.hasOwn(shared, 'supplier'), false);
    assert.equal(JSON.stringify(shared).includes('Private factory'), false);
    assert.equal(JSON.stringify(shared).includes('private-factory'), false);
    if (!excludedSections.includes('bom')) assert.equal(shared.materials[0].supplier, 'Fabric mill');
  }
  assert.deepEqual(product, original);
});

test('manufacturer validation trims fields, requires a name, bounds strings and categories, and protects metadata', () => {
  assert.deepEqual(manufacturerPatch({ name: '  Studio  ', contactName: '  Jo ', email: ' jo@example.com ', phone: ' +49 123 ',
    location: { country: ' Germany ', city: ' Berlin ' }, categories: [' Hoodies ', 'T-Shirts'], typicalMoq: ' 100 ', notes: ' Notes ',
    id: 'injected', createdAt: 'old', updatedAt: 'old', ignored: 'ignored' }, true), {
    name: 'Studio', contactName: 'Jo', email: 'jo@example.com', phone: '+49 123', typicalMoq: '100', notes: 'Notes',
    location: { country: 'Germany', city: 'Berlin' }, categories: ['Hoodies', 'T-Shirts'],
  });
  assert.deepEqual(manufacturerPatch({}), {});
  for (const name of [undefined, '', '   ', null, 42])
    assert.throws(() => manufacturerPatch({ name }, true), badRequest);
  assert.throws(() => manufacturerPatch({ name: ' ' }), badRequest);
  for (const [field, limit] of Object.entries({ name: 200, contactName: 200, email: 320, phone: 100, typicalMoq: 200, notes: 20000 })) {
    assert.equal(manufacturerPatch({ [field]: 'x'.repeat(limit) })[field].length, limit);
    assert.throws(() => manufacturerPatch({ [field]: 'x'.repeat(limit + 1) }), badRequest);
    assert.throws(() => manufacturerPatch({ [field]: null }), badRequest);
  }
  for (const location of [null, [], '', { country: 1, city: '' }, { country: '', city: null }, { country: 'x'.repeat(201), city: '' }])
    assert.throws(() => manufacturerPatch({ location }), badRequest);
  assert.equal(manufacturerPatch({ categories: Array(50).fill('x'.repeat(100)) }).categories.length, 50);
  for (const categories of ['Hoodies', null, Array(51).fill('Hoodies'), [''], ['  '], [42], ['x'.repeat(101)]])
    assert.throws(() => manufacturerPatch({ categories }), badRequest);
});

test('delete rules list every referencing product and allow deletion once unused', () => {
  const manufacturer = createManufacturer({ name: 'Factory' });
  const data = { manufacturers: [manufacturer], libraries: [], products: [
    { ...emptyProduct(), name: 'Hoodie', manufacturerId: manufacturer.id },
    { ...emptyProduct(), name: 'Archived dress', archived: true, manufacturerId: manufacturer.id },
  ] };
  const before = structuredClone(data);
  assert.throws(() => deleteManufacturer(data, manufacturer.id), error =>
    error instanceof ApiError && error.status === 409 && error.message === 'Manufacturer is used by products: Hoodie, Archived dress');
  assert.deepEqual(data, before);
  data.products.forEach(product => { product.manufacturerId = null; });
  deleteManufacturer(data, manufacturer.id);
  assert.deepEqual(data.manufacturers, []);
  assert.throws(() => deleteManufacturer(data, manufacturer.id), error => error.status === 404);
});

test('product patches validate manufacturer ID types and workspace membership', () => {
  assert.deepEqual(productPatch({ manufacturerId: null, supplier: 'Ignored' }), { manufacturerId: null });
  assert.deepEqual(productPatch({ manufacturerId: 'factory' }), { manufacturerId: 'factory' });
  for (const manufacturerId of [1, false, [], {}, 'x'.repeat(201)])
    assert.throws(() => productPatch({ manufacturerId }), badRequest);
  const data = { manufacturers: [{ id: 'factory' }] };
  for (const id of ['unknown', '']) assert.throws(() => validateManufacturerId(data, id), badRequest);
  for (const id of ['factory', null, undefined]) validateManufacturerId(data, id);
});

test('manufacturer CRUD and product APIs enforce workspace references, block deletion, and keep shares and versions clean', async (t) => {
  assert.equal((await manufacturers.POST(request({ name: ' ' }))).status, 400);
  const response = await manufacturers.POST(request({ name: '  Private Factory  ', categories: ['Hoodies'] }));
  assert.equal(response.status, 200);
  const manufacturer = await response.json();
  const ctx = context(manufacturer.id);
  assert.equal(manufacturer.name, 'Private Factory');
  assert.ok(manufacturer.id);
  assert.equal((await (await manufacturers.GET()).json()).length, 1);
  assert.deepEqual(await (await manufacturerRoute.GET(request({}), ctx)).json(), manufacturer);
  const updated = await (await manufacturerRoute.PATCH(request({ name: 'New Private Factory', location: { country: 'DE', city: 'Berlin' }, id: 'injected' }), ctx)).json();
  assert.equal(updated.id, manufacturer.id);
  assert.equal(updated.name, 'New Private Factory');
  assert.deepEqual(updated.location, { country: 'DE', city: 'Berlin' });
  assert.equal((await manufacturerRoute.PATCH(request({ name: '' }), ctx)).status, 400);
  assert.equal((await products.POST(request({ name: 'Unknown', manufacturerId: 'missing' }))).status, 400);
  const created = await (await products.POST(request({ name: 'Linked Hoodie', manufacturerId: manufacturer.id, supplier: 'Ignored' }))).json();
  assert.equal(created.manufacturerId, manufacturer.id);
  assert.equal(Object.hasOwn(created, 'supplier'), false);
  const productCtx = context(created.id);
  assert.equal((await productRoute.PATCH(request({ manufacturerId: 'missing' }), productCtx)).status, 400);
  assert.deepEqual(await (await productRoute.GET(request({}), productCtx)).json(), created);
  await repository.update('default', data => saveVersion(data.products.find(item => item.id === created.id), 'Original'));
  const saved = await (await productRoute.GET(request({}), productCtx)).json();
  const cleared = await (await productRoute.PATCH(request({ manufacturerId: null }), productCtx)).json();
  assert.deepEqual(cleared.versions, saved.versions);
  assert.deepEqual(snapshot(cleared), snapshot(saved));
  await productRoute.PATCH(request({ manufacturerId: manufacturer.id }), productCtx);
  const blocked = await manufacturerRoute.DELETE(request({}), ctx);
  assert.equal(blocked.status, 409);
  assert.match((await blocked.json()).error, /Linked Hoodie/);
  const share = await (await sharing.POST(request({}), productCtx)).json();
  const shareCtx = { params: Promise.resolve({ token: share.token }) };
  for (const excludedSections of [[], ['overview'], [...productSections]]) {
    await productRoute.PATCH(request({ excludedSections }), productCtx);
    const visible = await (await sharedRoute.GET(request({}), shareCtx)).json();
    assert.equal(Object.hasOwn(visible, 'supplier'), false);
    assert.equal(Object.hasOwn(visible, 'manufacturerId'), false);
    assert.equal(JSON.stringify(visible).includes('New Private Factory'), false);
    assert.equal(JSON.stringify(visible).includes(manufacturer.id), false);
  }
  const resolveWorkspace = t.mock.method(workspace, 'currentWorkspaceId', async () => 'isolated');
  assert.deepEqual(await (await manufacturers.GET()).json(), []);
  assert.equal((await manufacturerRoute.GET(request({}), ctx)).status, 404);
  assert.equal((await manufacturerRoute.PATCH(request({ name: 'Intrusion' }), ctx)).status, 404);
  assert.equal((await manufacturerRoute.DELETE(request({}), ctx)).status, 404);
  assert.equal((await products.POST(request({ name: 'Cross-workspace', manufacturerId: manufacturer.id }))).status, 400);
  const isolated = await (await products.POST(request({ name: 'Isolated' }))).json();
  assert.equal((await productRoute.PATCH(request({ manufacturerId: manufacturer.id }), context(isolated.id))).status, 400);
  resolveWorkspace.mock.restore();
  await productRoute.PATCH(request({ manufacturerId: null }), productCtx);
  assert.equal((await manufacturerRoute.DELETE(request({}), ctx)).status, 200);
  assert.equal((await manufacturerRoute.GET(request({}), ctx)).status, 404);
});

test('founder overview shows manufacturer while share and print overview omit it regardless of sections', (t) => {
  const extensions = require('node:module')._extensions;
  const previous = extensions['.css'];
  extensions['.css'] = () => {};
  t.after(() => {
    if (previous) extensions['.css'] = previous;
    else delete extensions['.css'];
  });
  const React = require('react');
  const { renderToStaticMarkup } = require('react-dom/server');
  const { ProductEditor, SharedProduct } = require('../src/components/sites/techstyles/product-editor.tsx');
  const manufacturer = createManufacturer({ name: 'Confidential Factory' });
  const product = { ...emptyProduct(), manufacturerId: manufacturer.id, supplier: 'Legacy confidential factory' };
  const founder = renderToStaticMarkup(React.createElement(ProductEditor, {
    product, manufacturers: [manufacturer], onChange() {}, onToggleSidebar() {},
    identity: { name: 'My workspace', initials: 'MW' },
  }));
  assert.match(founder, /manufacturer<\/small>/i);
  assert.match(founder, /Confidential Factory/);
  const unlinked = renderToStaticMarkup(React.createElement(ProductEditor, {
    product: { ...product, manufacturerId: null }, manufacturers: [manufacturer], onChange() {}, onToggleSidebar() {},
    identity: { name: 'My workspace', initials: 'MW' },
  }));
  assert.match(unlinked, /manufacturer<\/small>—/i);
  for (const excludedSections of [[], ['overview'], [...productSections]]) {
    for (const props of [{ product: { ...product, excludedSections } },
      { token: 'share', product: sharedProduct({ ...product, excludedSections }) }]) {
      const html = renderToStaticMarkup(React.createElement(SharedProduct, props));
      assert.doesNotMatch(html, /Confidential Factory|Legacy confidential factory|manufacturer<\/small>/i);
    }
  }
});
