import { validateDataset } from './tasks.js';

function encodeBase64(text) {
  if (typeof Buffer !== 'undefined') return Buffer.from(text, 'utf8').toString('base64');
  const bytes = new TextEncoder().encode(text);
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function decodeBase64(value) {
  if (typeof Buffer !== 'undefined') return Buffer.from(value.replace(/\s/g, ''), 'base64').toString('utf8');
  const binary = atob(value.replace(/\s/g, ''));
  return new TextDecoder().decode(Uint8Array.from(binary, (char) => char.charCodeAt(0)));
}

function endpoint(settings) {
  return `https://api.github.com/repos/${encodeURIComponent(settings.owner)}/${encodeURIComponent(settings.repo)}/contents/${encodeURIComponent(settings.path)}`;
}

function headers(settings) {
  return {
    Accept: 'application/vnd.github+json',
    Authorization: `Bearer ${settings.token}`,
    'X-GitHub-Api-Version': '2022-11-28',
  };
}

async function failure(response) {
  const detail = await response.json().catch(() => ({}));
  const error = new Error(detail.message || `GitHub request failed (${response.status})`);
  error.code = response.status === 409 || response.status === 422 ? 'conflict' : response.status === 401 || response.status === 403 ? 'auth' : 'network';
  throw error;
}

export async function pullDataset(settings, fetchFn = fetch) {
  const response = await fetchFn(`${endpoint(settings)}?ref=${encodeURIComponent(settings.branch)}`, { headers: headers(settings) });
  if (!response.ok) await failure(response);
  const file = await response.json();
  return { dataset: validateDataset(JSON.parse(decodeBase64(file.content))), sha: file.sha };
}

export async function pushDataset(settings, dataset, sha, fetchFn = fetch) {
  const body = {
    message: 'chore: sync todo data',
    content: encodeBase64(`${JSON.stringify(validateDataset(dataset), null, 2)}\n`),
    branch: settings.branch,
  };
  if (sha) body.sha = sha;
  const response = await fetchFn(endpoint(settings), {
    method: 'PUT',
    headers: { ...headers(settings), 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!response.ok) await failure(response);
  const result = await response.json();
  return { sha: result.content.sha };
}
