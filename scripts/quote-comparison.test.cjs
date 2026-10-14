const { test } = require('node:test');
const assert = require('node:assert/strict');
require('./support/load-ts.cjs');
const { comparisonProducts, comparisonRequests, rankQuotes } = require('../src/lib/quote-comparison.ts');

function request(id, price, lead, currency = 'EUR', status = 'quoted', productId = 'p1') {
  return {
    id, productId, status,
    quote: { unitPrice: price, productionLeadTimeDays: lead, currency },
  };
}

test('ranks the lowest unit price and shortest lead time independently, including chosen quotes', () => {
  const quotes = [request('a', 12, 20), request('b', 8, 30, 'EUR', 'chosen'), request('c', 10, 10)];
  const before = structuredClone(quotes);
  assert.deepEqual(rankQuotes(quotes), {
    mixedCurrencies: false, lowestPriceIds: ['b'], shortestLeadTimeIds: ['c'],
  });
  assert.deepEqual(quotes, before);
});

test('all ties win, and zero is a valid price and lead time', () => {
  assert.deepEqual(rankQuotes([request('a', 0, 0), request('b', 0, 0), request('c', 1, 1)]), {
    mixedCurrencies: false, lowestPriceIds: ['a', 'b'], shortestLeadTimeIds: ['a', 'b'],
  });
});

test('mixed currencies suppress every price highlight while lead times still rank', () => {
  assert.deepEqual(rankQuotes([request('a', 1, 10), request('b', 100, 5, 'USD'), request('c', 30, 5)]), {
    mixedCurrencies: true, lowestPriceIds: [], shortestLeadTimeIds: ['b', 'c'],
  });
});

test('null and absent values never win, even when every value is missing', () => {
  assert.deepEqual(rankQuotes([request('a', null, null), request('b', undefined, undefined), request('c', 0, 0)]), {
    mixedCurrencies: false, lowestPriceIds: ['c'], shortestLeadTimeIds: ['c'],
  });
  assert.deepEqual(rankQuotes([request('a', null, null), request('b', undefined, undefined)]), {
    mixedCurrencies: false, lowestPriceIds: [], shortestLeadTimeIds: [],
  });
  assert.deepEqual(rankQuotes([]), { mixedCurrencies: false, lowestPriceIds: [], shortestLeadTimeIds: [] });
});

test('declined, draft, sent and requests without a quote do not affect ranking', () => {
  assert.deepEqual(rankQuotes([
    request('a', 12, 20), request('declined', 0, 0, 'USD', 'declined'),
    request('draft', 0, 0, 'GBP', 'draft'), request('sent', 0, 0, 'GBP', 'sent'),
    { id: 'missing', status: 'quoted', quote: null },
  ]), { mixedCurrencies: false, lowestPriceIds: ['a'], shortestLeadTimeIds: ['a'] });
});

test('comparison shows only the selected product’s quoted and chosen requests with quotes', () => {
  const quotes = [request('a', 10, 20), request('b', 9, 30, 'EUR', 'chosen'),
    request('c', 1, 1, 'EUR', 'declined'), request('d', 1, 1, 'EUR', 'quoted', 'p2'),
    { id: 'missing', productId: 'p1', status: 'quoted', quote: null }];
  assert.deepEqual(comparisonRequests(quotes, 'p1').map(item => item.id), ['a', 'b']);
  assert.deepEqual(comparisonRequests(quotes, 'unknown'), []);
});

test('selector includes products with any recorded quote and excludes archived products without a chosen request', () => {
  const products = [
    { id: 'active', archived: false }, { id: 'no-quotes', archived: false },
    { id: 'archived', archived: true }, { id: 'archived-chosen', archived: true },
    { id: 'declined-only', archived: false },
  ];
  const requests = [request('a', 10, 20, 'EUR', 'quoted', 'active'),
    request('b', 10, 20, 'EUR', 'quoted', 'archived'),
    request('c', 10, 20, 'EUR', 'chosen', 'archived-chosen'),
    request('d', 10, 20, 'EUR', 'declined', 'declined-only')];
  assert.deepEqual(comparisonProducts(products, requests).map(item => item.id), ['active', 'archived-chosen', 'declined-only']);
  requests[2].status = 'quoted';
  assert.deepEqual(comparisonProducts(products, requests).map(item => item.id), ['active', 'declined-only']);
});
