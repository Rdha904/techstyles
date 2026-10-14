const { test, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
require('./support/load-ts.cjs');
const { request, uploadFile, assetsPath } = require('../src/lib/client-api.ts');

const originalFetch = globalThis.fetch;
afterEach(() => { globalThis.fetch = originalFetch; });

test('JSON request sends method, Content-Type and body and returns parsed JSON', async () => {
  globalThis.fetch = async (url, init) => {
    assert.equal(url, '/api/example');
    assert.equal(init.method, 'PATCH');
    assert.equal(new Headers(init.headers).get('Content-Type'), 'application/json');
    assert.equal(init.body, JSON.stringify({ name: 'Example' }));
    return Response.json({ saved: true });
  };
  assert.deepEqual(await request('/api/example', { method: 'PATCH', json: { name: 'Example' } }), { saved: true });
  assert.equal(assetsPath, '/sites/techstyles/');
});

test('JSON request serializes falsy payloads', async () => {
  for (const json of [false, 0, '', null]) {
    globalThis.fetch = async (_url, init) => {
      assert.equal(init.body, JSON.stringify(json));
      assert.equal(new Headers(init.headers).get('Content-Type'), 'application/json');
      return Response.json({});
    };
    await request('/api/example', { method: 'POST', json });
  }
});

test('FormData request passes body through without JSON Content-Type', async () => {
  const form = new FormData();
  form.append('files', 'example');
  globalThis.fetch = async (_url, init) => {
    assert.equal(init.body, form);
    assert.equal(init.method, 'POST');
    assert.equal(new Headers(init.headers).has('Content-Type'), false);
    return Response.json({ imported: true });
  };
  assert.deepEqual(await request('/api/import', { method: 'POST', form }), { imported: true });
});

test('non-OK JSON response throws the server error message', async () => {
  globalThis.fetch = async () => Response.json({ error: 'Server detail' }, { status: 422 });
  await assert.rejects(request('/api/example'), { message: 'Server detail' });
});

test('non-OK non-JSON response throws the default error message', async () => {
  globalThis.fetch = async () => new Response('Bad gateway', { status: 502 });
  await assert.rejects(request('/api/example'), { message: 'The request could not be completed.' });
});

test('non-OK JSON without an error string throws the default error message', async () => {
  for (const body of [{}, { error: 42 }, null]) {
    globalThis.fetch = async () => Response.json(body, { status: 400 });
    await assert.rejects(request('/api/example'), { message: 'The request could not be completed.' });
  }
});

test('AbortError from fetch propagates unchanged and signal is forwarded', async () => {
  const controller = new AbortController();
  const error = new DOMException('Aborted', 'AbortError');
  globalThis.fetch = async (_url, init) => {
    assert.equal(init.signal, controller.signal);
    throw error;
  };
  await assert.rejects(request('/api/example', { signal: controller.signal }), failure => {
    assert.equal(failure, error);
    assert.equal(failure.name, 'AbortError');
    return true;
  });
});

test('uploadFile posts the file field to /api/uploads and returns its URL', async () => {
  const file = new File(['image'], 'IMAGE.JPEG', { type: 'image/jpeg' });
  globalThis.fetch = async (url, init) => {
    assert.equal(url, '/api/uploads');
    assert.equal(init.method, 'POST');
    assert.equal(new Headers(init.headers).has('Content-Type'), false);
    assert.deepEqual([...init.body.keys()], ['file']);
    assert.equal(init.body.get('file'), file);
    return Response.json({ url: '/api/uploads/image.jpeg' });
  };
  assert.equal(await uploadFile(file, { imagesOnly: true }), '/api/uploads/image.jpeg');
});

test('imagesOnly rejects a PDF before calling fetch', async () => {
  let calls = 0;
  globalThis.fetch = async () => { calls++; return Response.json({}); };
  await assert.rejects(uploadFile(new File(['pdf'], 'file.pdf'), { imagesOnly: true }), {
    message: 'Choose PNG, JPEG or WebP images.',
  });
  assert.equal(calls, 0);
});

test('uploadFile sends PDFs when imagesOnly is omitted', async () => {
  const file = new File(['pdf'], 'file.pdf', { type: 'application/pdf' });
  globalThis.fetch = async (url, init) => {
    assert.equal(url, '/api/uploads');
    assert.equal(init.body.get('file'), file);
    return Response.json({ url: '/api/uploads/file.pdf' });
  };
  assert.equal(await uploadFile(file), '/api/uploads/file.pdf');
});

test('product-editor no longer imports from workspace', () => {
  const source = fs.readFileSync(path.join(__dirname, '../src/components/sites/techstyles/product-editor.tsx'), 'utf8');
  assert.doesNotMatch(source, /\bfrom\s+["']\.\/workspace["']/);
});


test('quoteRequestsApi encodes IDs, filters by product and forwards quote/action payloads and errors', async () => {
  const { quoteRequestsApi } = require('../src/lib/client-api.ts');
  const calls = [];
  globalThis.fetch = async (url, init) => {
    calls.push({ url, method: init.method, json: init.body && JSON.parse(init.body) });
    return Response.json({ saved: true });
  };
  await quoteRequestsApi.list();
  await quoteRequestsApi.list('product / 1');
  await quoteRequestsApi.create({ productId: 'p', manufacturerId: 'm' });
  await quoteRequestsApi.update('request / 1', { action: 'choose' });
  await quoteRequestsApi.update('request / 1', { quote: { unitPrice: 0, currency: 'EUR' } });
  await quoteRequestsApi.delete('request / 1');
  assert.deepEqual(calls, [
    { url: '/api/quote-requests', method: 'GET', json: undefined },
    { url: '/api/quote-requests?productId=product%20%2F%201', method: 'GET', json: undefined },
    { url: '/api/quote-requests', method: 'POST', json: { productId: 'p', manufacturerId: 'm' } },
    { url: '/api/quote-requests/request%20%2F%201', method: 'PATCH', json: { action: 'choose' } },
    { url: '/api/quote-requests/request%20%2F%201', method: 'PATCH', json: { quote: { unitPrice: 0, currency: 'EUR' } } },
    { url: '/api/quote-requests/request%20%2F%201', method: 'DELETE', json: undefined },
  ]);
  globalThis.fetch = async () => Response.json({ error: 'Request already exists' }, { status: 409 });
  await assert.rejects(quoteRequestsApi.create({ productId: 'p', manufacturerId: 'm' }), { message: 'Request already exists' });
});
