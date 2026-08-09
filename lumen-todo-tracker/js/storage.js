import { validateDataset } from './tasks.js';

const DATA_KEY = 'lumen.tasks';
const SETTINGS_KEY = 'lumen.github';

export function loadLocal(storage = localStorage) {
  try {
    const value = storage.getItem(DATA_KEY);
    return value ? validateDataset(JSON.parse(value)) : null;
  } catch {
    return null;
  }
}

export function saveLocal(storage = localStorage, dataset) {
  const valid = validateDataset(dataset);
  storage.setItem(DATA_KEY, JSON.stringify(valid));
  return valid;
}

export function loadSettings(storage = localStorage) {
  try {
    return JSON.parse(storage.getItem(SETTINGS_KEY)) ?? {};
  } catch {
    return {};
  }
}

export function saveSettings(storage = localStorage, settings) {
  const normalized = {
    owner: String(settings.owner ?? '').trim(),
    repo: String(settings.repo ?? '').trim(),
    branch: String(settings.branch ?? 'main').trim() || 'main',
    path: String(settings.path ?? 'data/tasks.json').trim() || 'data/tasks.json',
    token: String(settings.token ?? '').trim(),
  };
  storage.setItem(SETTINGS_KEY, JSON.stringify(normalized));
  return normalized;
}

export function exportDataset(dataset) {
  return `${JSON.stringify(validateDataset(dataset), null, 2)}\n`;
}

export function parseImportedDataset(text) {
  try {
    return validateDataset(JSON.parse(text));
  } catch (error) {
    throw new Error(`Invalid task data: ${error.message}`);
  }
}
