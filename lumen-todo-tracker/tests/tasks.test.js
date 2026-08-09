import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createTask,
  updateTask,
  transitionTask,
  validateDataset,
  getStats,
  groupActiveTasks,
} from '../js/tasks.js';

const NOW = new Date('2026-08-09T04:00:00.000Z');

test('createTask rejects a blank title', () => {
  assert.throws(() => createTask({ title: '  ', kind: 'daily' }, NOW), /title/i);
});

test('createTask requires a due date for dated tasks', () => {
  assert.throws(() => createTask({ title: 'Report', kind: 'dated' }, NOW), /date/i);
});

test('createTask normalizes a valid daily task', () => {
  const task = createTask({ title: '  Review notes  ', notes: '  chapter 2 ', kind: 'daily' }, NOW);
  assert.equal(task.title, 'Review notes');
  assert.equal(task.notes, 'chapter 2');
  assert.equal(task.dueDate, null);
  assert.equal(task.status, 'pending');
  assert.equal(task.createdAt, NOW.toISOString());
  assert.match(task.id, /^task_/);
});

test('updateTask preserves identity and lifecycle fields', () => {
  const task = createTask({ title: 'Old', kind: 'daily' }, NOW);
  const updated = updateTask(task, { title: 'New', kind: 'dated', dueDate: '2026-08-12' });
  assert.equal(updated.id, task.id);
  assert.equal(updated.createdAt, task.createdAt);
  assert.equal(updated.title, 'New');
  assert.equal(updated.dueDate, '2026-08-12');
});

test('transitionTask completes, archives, and restores without mutation', () => {
  const task = createTask({ title: 'Ship', kind: 'daily' }, NOW);
  const completed = transitionTask(task, 'completed', NOW);
  const archived = transitionTask(completed, 'archived', NOW);
  const restored = transitionTask(archived, 'pending', NOW);
  assert.equal(task.status, 'pending');
  assert.equal(completed.completedAt, NOW.toISOString());
  assert.equal(archived.archivedAt, NOW.toISOString());
  assert.equal(restored.status, 'pending');
  assert.equal(restored.completedAt, null);
  assert.equal(restored.archivedAt, null);
});

test('validateDataset rejects malformed data and ignores unknown fields', () => {
  assert.throws(() => validateDataset({ version: 1, tasks: [{ title: 'Missing fields' }] }), /invalid/i);
  const task = createTask({ title: 'Valid', kind: 'daily' }, NOW);
  const result = validateDataset({ version: 1, updatedAt: NOW.toISOString(), extra: true, tasks: [{ ...task, extra: true }] });
  assert.equal(result.tasks[0].extra, undefined);
});

test('getStats counts each public dashboard category', () => {
  const base = createTask({ title: 'A', kind: 'dated', dueDate: '2026-08-09' }, NOW);
  const completed = transitionTask(createTask({ title: 'B', kind: 'daily' }, NOW), 'completed', NOW);
  const archived = transitionTask(completed, 'archived', NOW);
  assert.deepEqual(getStats([base, completed, archived]), { pending: 1, archived: 1, dated: 1, total: 3 });
});

test('groupActiveTasks separates overdue, today, daily, and future tasks', () => {
  const tasks = [
    createTask({ title: 'Late', kind: 'dated', dueDate: '2026-08-08' }, NOW),
    createTask({ title: 'Today', kind: 'dated', dueDate: '2026-08-09' }, NOW),
    createTask({ title: 'Habit', kind: 'daily' }, NOW),
    createTask({ title: 'Future', kind: 'dated', dueDate: '2026-08-12' }, NOW),
  ];
  const grouped = groupActiveTasks(tasks, '2026-08-09');
  assert.deepEqual(grouped.overdue.map((task) => task.title), ['Late']);
  assert.deepEqual(grouped.today.map((task) => task.title), ['Today']);
  assert.deepEqual(grouped.daily.map((task) => task.title), ['Habit']);
  assert.deepEqual(grouped.future.map((task) => task.title), ['Future']);
});
