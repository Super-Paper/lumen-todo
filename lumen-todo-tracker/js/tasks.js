const STATUSES = new Set(['pending', 'completed', 'archived']);
const KINDS = new Set(['daily', 'dated']);

function requireTitle(value) {
  const title = String(value ?? '').trim();
  if (!title) throw new Error('Task title is required');
  return title;
}

function requireDate(kind, value) {
  if (kind === 'daily') return null;
  const date = String(value ?? '');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(`${date}T00:00:00Z`))) {
    throw new Error('A valid due date is required');
  }
  return date;
}

function newId(now) {
  const random = globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2);
  return `task_${now.getTime().toString(36)}_${random}`;
}

export function createTask(input, now = new Date()) {
  const kind = KINDS.has(input.kind) ? input.kind : 'daily';
  return {
    id: newId(now),
    title: requireTitle(input.title),
    notes: String(input.notes ?? '').trim(),
    kind,
    dueDate: requireDate(kind, input.dueDate),
    status: 'pending',
    createdAt: now.toISOString(),
    completedAt: null,
    archivedAt: null,
  };
}

export function updateTask(task, changes) {
  const kind = KINDS.has(changes.kind) ? changes.kind : task.kind;
  return {
    ...task,
    title: requireTitle(changes.title ?? task.title),
    notes: String(changes.notes ?? task.notes ?? '').trim(),
    kind,
    dueDate: requireDate(kind, changes.dueDate ?? task.dueDate),
  };
}

export function transitionTask(task, nextStatus, now = new Date()) {
  if (!STATUSES.has(nextStatus)) throw new Error('Invalid task status');
  if (nextStatus === 'completed') {
    return { ...task, status: 'completed', completedAt: now.toISOString(), archivedAt: null };
  }
  if (nextStatus === 'archived') {
    if (task.status !== 'completed') throw new Error('Only completed tasks can be archived');
    return { ...task, status: 'archived', archivedAt: now.toISOString() };
  }
  return { ...task, status: 'pending', completedAt: null, archivedAt: null };
}

function sanitizeTask(task) {
  if (!task || typeof task !== 'object' || typeof task.id !== 'string' || !task.id) throw new Error('Invalid task');
  if (!KINDS.has(task.kind) || !STATUSES.has(task.status)) throw new Error('Invalid task');
  const title = requireTitle(task.title);
  const dueDate = requireDate(task.kind, task.dueDate);
  if (typeof task.createdAt !== 'string' || Number.isNaN(Date.parse(task.createdAt))) throw new Error('Invalid task');
  return {
    id: task.id,
    title,
    notes: String(task.notes ?? '').trim(),
    kind: task.kind,
    dueDate,
    status: task.status,
    createdAt: task.createdAt,
    completedAt: task.completedAt ?? null,
    archivedAt: task.archivedAt ?? null,
  };
}

export function validateDataset(value) {
  if (!value || typeof value !== 'object' || value.version !== 1 || !Array.isArray(value.tasks)) {
    throw new Error('Invalid dataset');
  }
  return {
    version: 1,
    updatedAt: typeof value.updatedAt === 'string' ? value.updatedAt : new Date(0).toISOString(),
    tasks: value.tasks.map(sanitizeTask),
  };
}

export function getStats(tasks) {
  return {
    pending: tasks.filter((task) => task.status === 'pending').length,
    archived: tasks.filter((task) => task.status === 'archived').length,
    dated: tasks.filter((task) => task.kind === 'dated').length,
    total: tasks.length,
  };
}

export function groupActiveTasks(tasks, today) {
  const active = tasks.filter((task) => task.status !== 'archived');
  const byDate = (a, b) => (a.dueDate ?? '').localeCompare(b.dueDate ?? '') || a.createdAt.localeCompare(b.createdAt);
  return {
    overdue: active.filter((task) => task.kind === 'dated' && task.dueDate < today).sort(byDate),
    today: active.filter((task) => task.kind === 'dated' && task.dueDate === today).sort(byDate),
    daily: active.filter((task) => task.kind === 'daily').sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
    future: active.filter((task) => task.kind === 'dated' && task.dueDate > today).sort(byDate),
  };
}
