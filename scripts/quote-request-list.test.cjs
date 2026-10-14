const { test } = require('node:test');
const assert = require('node:assert/strict');
require('./support/load-ts.cjs');
const { filterQuoteRequests, sourcingOverviewCounts, quoteRequestStatuses } = require('../src/lib/quote-request-list.ts');

const products = [{ id: 'hoodie', name: 'Cotton Hoodie', archived: false },
  { id: 'tee', name: 'Basic Tee', archived: false }, { id: 'old', name: 'Old Jacket', archived: true }];
const manufacturers = [{ id: 'm1', name: 'North Studio' }, { id: 'm2', name: 'South Garments' }];
const requests = [
  { id: 'a', productId: 'hoodie', manufacturerId: 'm1', status: 'draft' },
  { id: 'b', productId: 'hoodie', manufacturerId: 'm2', status: 'chosen' },
  { id: 'c', productId: 'tee', manufacturerId: 'm1', status: 'sent' },
  { id: 'd', productId: 'old', manufacturerId: 'm2', status: 'chosen' },
  { id: 'e', productId: 'missing', manufacturerId: 'm1', status: 'quoted' },
];
const ids = filters => filterQuoteRequests(requests, products, manufacturers, filters).map(item => item.id);

test('archived products are hidden by default and explicitly included by the checkbox filter', () => {
  assert.deepEqual(ids(), ['a', 'b', 'c']);
  assert.deepEqual(ids({ showArchived: true }), ['a', 'b', 'c', 'd']);
  assert.deepEqual(ids({ productId: 'old' }), []);
  assert.deepEqual(ids({ productId: 'old', showArchived: true }), ['d']);
});

test('status, manufacturer and product filters work separately and together', () => {
  assert.deepEqual(ids({ status: 'chosen' }), ['b']);
  assert.deepEqual(ids({ manufacturerId: 'm1' }), ['a', 'c']);
  assert.deepEqual(ids({ productId: 'hoodie' }), ['a', 'b']);
  assert.deepEqual(ids({ status: 'draft', manufacturerId: 'm1', productId: 'hoodie' }), ['a']);
  assert.deepEqual(ids({ status: 'chosen', manufacturerId: 'm1' }), []);
});

test('search matches product or manufacturer names, trims and ignores case, and composes with filters', () => {
  assert.deepEqual(ids({ query: '  HOODIE  ' }), ['a', 'b']);
  assert.deepEqual(ids({ query: 'north' }), ['a', 'c']);
  assert.deepEqual(ids({ query: 'south', status: 'chosen' }), ['b']);
  assert.deepEqual(ids({ query: '  ' }), ['a', 'b', 'c']);
  assert.deepEqual(ids({ query: 'unknown' }), []);
});

test('missing manufacturers do not hide existing products, and filtering does not mutate input', () => {
  const before = structuredClone({ requests, products, manufacturers });
  assert.equal(filterQuoteRequests(requests, products, []).length, 3);
  assert.equal(filterQuoteRequests(requests, products, [], { query: 'hoodie' }).length, 2);
  assert.deepEqual({ requests, products, manufacturers }, before);
});

test('overview counts all five statuses on active products and distinct products with chosen requests', () => {
  const all = [...requests,
    { id: 'f', productId: 'tee', status: 'quoted' },
    { id: 'g', productId: 'tee', status: 'declined' },
    { id: 'h', productId: 'hoodie', status: 'chosen' }];
  assert.deepEqual(sourcingOverviewCounts(products, all), {
    byStatus: { draft: 1, sent: 1, quoted: 1, chosen: 2, declined: 1 }, chosenProducts: 1,
  });
  assert.deepEqual(quoteRequestStatuses, ['draft', 'sent', 'quoted', 'chosen', 'declined']);
  assert.deepEqual(sourcingOverviewCounts([], all), {
    byStatus: { draft: 0, sent: 0, quoted: 0, chosen: 0, declined: 0 }, chosenProducts: 0,
  });
});
