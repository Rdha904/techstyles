const { test } = require('node:test');
const assert = require('node:assert/strict');
require('./support/load-ts.cjs');
const { workspaceIdentity } = require('../src/lib/workspace-identity.ts');
const { emptyBrandProfile } = require('../src/lib/brand-types.ts');

const profile = (name) => ({ ...emptyBrandProfile(), name });

test('workspace uses the Brand Profile name and uppercase word initials', () => {
  assert.deepEqual(workspaceIdentity(profile('Atelier Nord')), {
    name: 'Atelier Nord',
    initials: 'AN',
  });
});

test('workspace trims the Brand Profile name', () => {
  assert.deepEqual(workspaceIdentity(profile(' \t Atelier Nord \n ')), {
    name: 'Atelier Nord',
    initials: 'AN',
  });
});

test('workspace falls back when the Brand Profile is missing or its name is empty', () => {
  for (const brandProfile of [null, profile(''), profile(' \t\n ')]) {
    assert.deepEqual(workspaceIdentity(brandProfile), {
      name: 'My workspace',
      initials: 'MW',
    });
  }
});

test('workspace initials use at most the first two words separated by whitespace', () => {
  assert.deepEqual(workspaceIdentity(profile('atelier \t nord design')), {
    name: 'atelier \t nord design',
    initials: 'AN',
  });
});

test('a one-word workspace name has one uppercase initial', () => {
  assert.deepEqual(workspaceIdentity(profile('yyyy')), {
    name: 'yyyy',
    initials: 'Y',
  });
});
