import test from 'node:test';
import assert from 'node:assert/strict';
import { taskViewModel, timelineGroups } from '../js/render.js';

const base = { id: '1', title: 'Task', notes: '', kind: 'dated', dueDate: '2026-08-08', status: 'pending', createdAt: '2026-08-01T00:00:00.000Z', completedAt: null, archivedAt: null };

test('taskViewModel labels overdue, today, daily, and completed states', () => {
  assert.equal(taskViewModel(base, '2026-08-09').badge, '已逾期');
  assert.equal(taskViewModel({ ...base, dueDate: '2026-08-09' }, '2026-08-09').badge, '今天');
  assert.equal(taskViewModel({ ...base, kind: 'daily', dueDate: null }, '2026-08-09').badge, '每日');
  assert.equal(taskViewModel({ ...base, status: 'completed' }, '2026-08-09').canArchive, true);
});

test('timelineGroups sorts active dated tasks and excludes archived tasks', () => {
  const groups = timelineGroups([
    { ...base, id: '2', dueDate: '2026-08-11' },
    { ...base, id: '1', dueDate: '2026-08-10' },
    { ...base, id: '3', dueDate: '2026-08-09', status: 'archived' },
  ], '2026-08-09');
  assert.deepEqual(groups.map((group) => group.date), ['2026-08-10', '2026-08-11']);
});
