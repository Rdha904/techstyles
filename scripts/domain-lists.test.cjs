const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
require('./support/load-ts.cjs');

const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'techstyles-domain-lists-'));
process.env.TECHSTYLES_DATA_DIR = path.join(temporary, 'data');
after(() => fs.rmSync(temporary, { recursive: true, force: true }));

const { productSections, libraryCollections } = require('../src/lib/types.ts');
const { brandLimits, emptyBrandProfile } = require('../src/lib/brand-types.ts');
const { ApiError, emptyProduct, snapshot } = require('../src/lib/store.ts');
const { sharedProduct } = require('../src/lib/share.ts');
const { productPatch } = require('../src/lib/api.ts');
const { libraryPatch } = require('../src/lib/library.ts');
const { validateBrand } = require('../src/lib/brand.ts');

function populatedProduct() {
  return {
    ...emptyProduct(),
    project: 'Collection',
    manufacturerId: 'manufacturer-id',
    description: 'Description',
    cover: '/api/uploads/cover.png',
    sketch: '/api/uploads/sketch.png',
    mockup: '/api/uploads/mockup.png',
    instructions: 'Instructions',
    labels: 'Labels',
    colors: [{ id: 'c', name: 'Black', hex: '#000000' }],
    materials: [{ id: 'm', name: 'Cotton', composition: '100% cotton', weight: '200', supplier: 'Supplier', placement: 'Body' }],
    measurements: [{ id: 'm', name: 'Chest', tolerance: '1', values: { M: '60' } }],
    comments: [{ id: 'c', section: 'overview', author: 'Me', text: 'Private', createdAt: 'now' }],
    annotations: [{ id: 'a', x: 10, y: 20, text: 'Annotation' }],
    attachments: [{ id: 'a', name: 'File', url: '/api/uploads/file.pdf' }],
    artworks: [{ id: 'a', name: 'Print', url: '/api/uploads/print.png' }],
    samples: [{ id: 's', size: 'M', color: 'Black', quantity: 2, status: 'Requested' }],
    versions: [{ id: 'v', name: 'Original', createdAt: 'now', snapshot: snapshot(emptyProduct()) }],
    shareToken: 'private-token',
  };
}

// Expected wire changes, independent of the production redaction implementation.
const redactedFields = {
  overview: { category: '', stage: '', baseSize: '', project: '', description: '', cover: '' },
  sketch: { sketch: '', mockup: '', annotations: [], cover: '' },
  colorways: { colors: [] },
  bom: { materials: [] },
  artworks: { artworks: [] },
  instructions: { instructions: '' },
  sizes: { measurements: [] },
  attachments: { attachments: [] },
  samplings: { samples: [] },
  packaging: { labels: '' },
  versions: {},
};

function visibleContent(product) {
  return {
    ...snapshot(product),
    comments: [],
    id: product.id,
    createdAt: product.createdAt,
    updatedAt: product.updatedAt,
  };
}

test('sharedProduct preserves unexcluded content and redacts every product section', () => {
  const product = populatedProduct();
  const original = structuredClone(product);
  const baseline = visibleContent(product);
  assert.deepEqual(sharedProduct(product), baseline);
  assert.equal('versions' in sharedProduct(product), false);
  assert.equal('shareToken' in sharedProduct(product), false);
  for (const section of productSections) {
    const shared = sharedProduct({ ...product, excludedSections: [section] });
    const expected = { ...baseline, excludedSections: [section], ...redactedFields[section] };
    assert.equal(JSON.stringify(shared), JSON.stringify(expected), section);
    // Ignore the exclusion metadata so it cannot masquerade as a working rule.
    const content = { ...shared, excludedSections: [] };
    if (section === 'versions') assert.deepEqual(content, baseline);
    else assert.notDeepEqual(content, baseline, section);
  }
  assert.deepEqual(product, original);
});

test('sharedProduct preserves exact wire output for all section combinations', () => {
  const product = populatedProduct();
  for (let mask = 0; mask < 2 ** productSections.length; mask++) {
    const excludedSections = productSections.filter((_, index) => mask & (1 << index));
    const input = { ...product, excludedSections };
    const expected = visibleContent(input);
    for (const section of excludedSections) Object.assign(expected, redactedFields[section]);
    assert.equal(JSON.stringify(sharedProduct(input)), JSON.stringify(expected), excludedSections.join(','));
  }
});

test('productPatch accepts known excluded sections, de-duplicates, and rejects invalid entries', () => {
  assert.deepEqual(productPatch({ excludedSections: productSections }).excludedSections, productSections);
  assert.deepEqual(
    productPatch({ excludedSections: [...productSections, ...productSections] }).excludedSections,
    productSections,
  );
  assert.deepEqual(productPatch({ excludedSections: [] }), { excludedSections: [] });
  for (const value of ['unknown', 'toString', '', 'x'.repeat(101), null, 1, {}]) {
    assert.throws(() => productPatch({ excludedSections: [value] }),
      error => error instanceof ApiError && error.status === 400 && error.message === 'Invalid excluded section');
  }
  assert.throws(() => productPatch({ excludedSections: 'overview' }), /Invalid excluded sections/);
  assert.equal(productPatch({ excludedSections: Array(50).fill('overview') }).excludedSections.length, 1);
  assert.throws(() => productPatch({ excludedSections: Array(51).fill('overview') }), /Invalid excluded sections/);
});

test('libraryPatch accepts every library collection and rejects unknown collections', () => {
  for (const collection of libraryCollections) {
    assert.equal(libraryPatch({ collection }).collection, collection);
    assert.equal(libraryPatch({ name: 'Item', collection }, true).collection, collection);
  }
  assert.throws(() => libraryPatch({ collection: 'unknown' }),
    error => error instanceof ApiError && error.status === 400 && error.message === 'Unknown library collection');
});

test('validateBrand accepts each brand limit and rejects one over every limit', () => {
  const base = { ...emptyBrandProfile(), name: 'Brand' };
  const entries = {
    colors: index => `#${index.toString(16).padStart(6, '0')}`,
    fonts: index => `Font ${index}`,
    referenceImages: index => ({ name: `Image ${index}`, url: `/api/uploads/image-${index}.png` }),
    evidence: () => ({ field: 'name', value: 'Brand', source: 'brief.txt', excerpt: 'Brand' }),
  };
  const messages = { colors: 'colors', fonts: 'fonts', referenceImages: 'reference images', evidence: 'source records' };
  for (const [field, limit] of Object.entries(brandLimits)) {
    const values = Array.from({ length: limit }, (_, index) => entries[field](index));
    assert.equal(validateBrand({ ...base, [field]: values })[field].length, limit, field);
    assert.throws(() => validateBrand({ ...base, [field]: [...values, entries[field](limit)] }),
      error => error instanceof ApiError && error.status === 400 && error.message === `Too many or invalid ${messages[field]}.`, field);
  }
});
