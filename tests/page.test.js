import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('hub page exposes semantic catalog and status hooks', async () => {
  const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
  for (const token of ['<main', 'id="tool-grid"', 'id="tool-count"', 'aria-live="polite"', 'src="hub.js"']) assert.ok(html.includes(token), `missing ${token}`);
});
