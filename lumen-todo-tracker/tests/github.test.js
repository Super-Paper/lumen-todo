import test from 'node:test';
import assert from 'node:assert/strict';
import { pullDataset, pushDataset } from '../js/github.js';

const settings = { owner: 'me', repo: 'todo', branch: 'main', path: 'data/tasks.json', token: 'tok' };
const dataset = { version: 1, updatedAt: '2026-08-09T00:00:00.000Z', tasks: [] };

test('pull decodes unicode dataset and returns the file SHA', async () => {
  const content = Buffer.from(JSON.stringify(dataset), 'utf8').toString('base64');
  const fakeFetch = async (url, options) => {
    assert.match(url, /repos\/me\/todo\/contents\/data%2Ftasks\.json\?ref=main/);
    assert.equal(options.headers.Authorization, 'Bearer tok');
    return { ok: true, json: async () => ({ content, sha: 'abc' }) };
  };
  assert.deepEqual(await pullDataset(settings, fakeFetch), { dataset, sha: 'abc' });
});

test('push includes SHA for updates and returns the new SHA', async () => {
  const fakeFetch = async (_url, options) => {
    const body = JSON.parse(options.body);
    assert.equal(options.method, 'PUT');
    assert.equal(body.sha, 'old');
    assert.deepEqual(JSON.parse(Buffer.from(body.content, 'base64').toString('utf8')), dataset);
    return { ok: true, json: async () => ({ content: { sha: 'new' } }) };
  };
  assert.equal((await pushDataset(settings, dataset, 'old', fakeFetch)).sha, 'new');
});

test('push classifies SHA conflicts and never retries a force overwrite', async () => {
  let calls = 0;
  const fakeFetch = async () => ({ ok: false, status: 409, json: async () => ({ message: 'conflict' }) , get body() { calls += 1; } });
  await assert.rejects(() => pushDataset(settings, dataset, 'stale', fakeFetch), (error) => error.code === 'conflict');
  assert.equal(calls, 0);
});
