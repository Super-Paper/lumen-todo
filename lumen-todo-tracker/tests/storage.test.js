import test from 'node:test';
import assert from 'node:assert/strict';
import { loadLocal, saveLocal, loadSettings, saveSettings, exportDataset, parseImportedDataset } from '../js/storage.js';

function memoryStorage() {
  const data = new Map();
  return { getItem: (key) => data.get(key) ?? null, setItem: (key, value) => data.set(key, value) };
}

const dataset = { version: 1, updatedAt: '2026-08-09T00:00:00.000Z', tasks: [] };

test('local data round-trips and malformed storage falls back safely', () => {
  const storage = memoryStorage();
  saveLocal(storage, dataset);
  assert.deepEqual(loadLocal(storage), dataset);
  storage.setItem('lumen.tasks', '{bad');
  assert.equal(loadLocal(storage), null);
});

test('settings keep token separate from exported task data', () => {
  const storage = memoryStorage();
  saveSettings(storage, { owner: 'me', repo: 'todo', branch: 'main', path: 'data/tasks.json', token: 'secret' });
  assert.equal(loadSettings(storage).token, 'secret');
  assert.doesNotMatch(exportDataset(dataset), /secret/);
});

test('import rejects invalid JSON without returning replacement data', () => {
  assert.throws(() => parseImportedDataset('{"version":1,"tasks":[{}]}'), /invalid/i);
  assert.deepEqual(parseImportedDataset(JSON.stringify(dataset)), dataset);
});
