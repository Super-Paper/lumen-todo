import test from 'node:test';
import assert from 'node:assert/strict';
import { validateCatalog, safeRelativeHref, siteViewModel } from '../hub.js';

const ready = { id: 'todo', name: 'Todo', description: 'Tasks', href: './todo/', icon: '✓', accent: 'cyan', status: 'ready' };

test('validateCatalog accepts a versioned catalog and rejects missing fields', () => {
  assert.deepEqual(validateCatalog({ version: 1, sites: [ready] }).sites[0], ready);
  assert.throws(() => validateCatalog({ version: 1, sites: [{ name: 'Broken' }] }), /invalid/i);
});

test('safeRelativeHref permits child paths and rejects external or traversal URLs', () => {
  assert.equal(safeRelativeHref('./lumen-todo-tracker/'), './lumen-todo-tracker/');
  assert.throws(() => safeRelativeHref('https://evil.example/'), /unsafe/i);
  assert.throws(() => safeRelativeHref('../secret/'), /unsafe/i);
});

test('siteViewModel makes ready cards navigable and planned cards inert', () => {
  assert.deepEqual(siteViewModel(ready), { ...ready, href: './todo/', available: true, label: '打开工具' });
  const planned = siteViewModel({ ...ready, status: 'planned' });
  assert.equal(planned.available, false);
  assert.equal(planned.href, null);
  assert.equal(planned.label, '即将推出');
});
