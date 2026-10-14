const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
require('./support/load-ts.cjs');

const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'techstyles-loader-test-'));
process.env.TECHSTYLES_DATA_DIR = path.join(temporary, 'data');
after(() => fs.rmSync(temporary, { recursive: true, force: true }));

test('loader requires a source module absent from the old compile lists', () => {
  const { clothingBrandTemplates } = require('../src/lib/brand-templates.ts');
  assert.ok(clothingBrandTemplates.length > 0);
  assert.equal(clothingBrandTemplates[0].name, 'Everyday Essentials');
});

test('loader resolves an extensionless @/lib import to the real source module', () => {
  const store = require('@/lib/store');
  assert.equal(store, require('../src/lib/store.ts'));
  // Parameter properties require transpilation, rather than type stripping.
  assert.equal(new store.ApiError('Test', 409).status, 409);
});

test('loader transpiles TSX and resolves aliases outside lib', () => {
  const { default: Page } = require('../src/app/page.tsx');
  const { Workspace } = require('@/components/sites/techstyles/workspace-loader');
  const element = Page();
  assert.equal(element.type, Workspace);
  assert.deepEqual(element.props.path, ['dashboard']);
});

test('loader resolves route aliases and transitive extensionless relative imports', async () => {
  const route = require('../src/app/api/products/route.ts');
  const response = await route.POST(new Request('http://localhost/api/products', {
    method: 'POST',
    body: JSON.stringify({ name: 'Loader product' }),
  }));
  assert.equal(response.status, 200);
  assert.equal((await response.json()).name, 'Loader product');
  const { repository } = require('../src/lib/repository.ts');
  assert.equal((await repository.read('default')).products[0].name, 'Loader product');
  assert.ok(fs.existsSync(path.join(temporary, 'data/workspace.json')));
});
