import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('page exposes the landmarks and controls required by the application', async () => {
  const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
  for (const contract of ['<main', '<nav', 'id="today-view"', 'id="timeline-view"', 'id="task-dialog"', 'id="settings-dialog"', 'aria-live="polite"', 'src="js/app.js"']) {
    assert.ok(html.includes(contract), `missing ${contract}`);
  }
  assert.match(html, /<button[^>]+id="add-task"/);
  assert.match(html, /<form[^>]+id="task-form"/);
});
