import { createTask, updateTask, transitionTask, validateDataset, getStats, groupActiveTasks } from './tasks.js';
import { loadLocal, saveLocal, loadSettings, saveSettings, exportDataset, parseImportedDataset } from './storage.js';
import { pullDataset, pushDataset } from './github.js';
import { taskViewModel, timelineGroups, escapeHtml } from './render.js';

const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
const initial = { version: 1, updatedAt: new Date().toISOString(), tasks: [] };
let state = loadLocal() ?? initial;
let remoteSha = null;
let editingId = null;
let toastTimer;

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];

function persist(message = '已保存到本地') {
  state.updatedAt = new Date().toISOString();
  try { saveLocal(localStorage, state); $('#storage-warning').hidden = true; $('#save-status').textContent = `● ${message}`; }
  catch { $('#storage-warning').hidden = false; $('#save-status').textContent = '● 仅本次会话'; }
}

function notify(message, isError = false) {
  const toast = $('#toast');
  toast.textContent = message;
  toast.style.borderColor = isError ? 'rgba(255,128,150,.5)' : '';
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 2800);
}

function taskCard(task) {
  const vm = taskViewModel(task, today());
  return `<article class="task-card ${vm.checked ? 'completed' : ''}" data-id="${escapeHtml(task.id)}">
    <input class="task-check" type="checkbox" aria-label="完成 ${escapeHtml(task.title)}" ${vm.checked ? 'checked' : ''}>
    <div><div class="task-title">${escapeHtml(task.title)}</div>${task.notes ? `<div class="task-note">${escapeHtml(task.notes)}</div>` : ''}<div class="task-meta">${escapeHtml(vm.badge)}</div></div>
    <div class="task-actions"><button data-action="edit">编辑</button>${vm.canArchive ? '<button class="confirm" data-action="archive">确认归档</button>' : ''}<button class="delete" data-action="delete">删除</button></div>
  </article>`;
}

function groupMarkup(title, tasks) {
  if (!tasks.length) return '';
  return `<section class="task-group"><div class="group-title"><span>${escapeHtml(title)}</span><span>${tasks.length} 项</span></div><div class="task-list">${tasks.map(taskCard).join('')}</div></section>`;
}

function render() {
  const day = today();
  const stats = getStats(state.tasks);
  Object.entries(stats).forEach(([key, value]) => $(`#stat-${key}`).textContent = value);
  const grouped = groupActiveTasks(state.tasks, day);
  const todayMarkup = groupMarkup('逾期提醒', grouped.overdue) + groupMarkup('今天到期', grouped.today) + groupMarkup('每日节奏', grouped.daily);
  $('#today-groups').innerHTML = todayMarkup || '<div class="empty"><strong>今天很轻盈</strong>添加一项任务，给今天一个清晰的起点。</div>';
  const hint = $('#future-hint');
  hint.hidden = grouped.future.length === 0;
  hint.textContent = `日历中还有 ${grouped.future.length} 项未来任务 →`;
  const timeline = timelineGroups(state.tasks, day);
  $('#timeline-groups').innerHTML = timeline.length ? timeline.map((group) => groupMarkup(group.date === day ? `${group.date} · 今天` : group.date, group.items)).join('') : '<div class="empty"><strong>时间线还是空的</strong>添加带日期的任务后会出现在这里。</div>';
  const archived = state.tasks.filter((task) => task.status === 'archived').sort((a, b) => (b.archivedAt ?? '').localeCompare(a.archivedAt ?? ''));
  $('#archive-count').textContent = `${archived.length} 项`;
  $('#archive-list').innerHTML = archived.length ? archived.map((task) => `<article class="task-card" data-id="${escapeHtml(task.id)}"><span aria-hidden="true">✓</span><div><div class="task-title">${escapeHtml(task.title)}</div><div class="task-meta">${escapeHtml((task.archivedAt ?? '').slice(0, 10))} 完成</div></div><div class="task-actions"><button data-action="restore">恢复</button><button class="delete" data-action="delete">删除</button></div></article>`).join('') : '<div class="empty">还没有归档任务。</div>';
}

function switchView(name) {
  const isToday = name === 'today';
  $('#today-view').hidden = !isToday;
  $('#timeline-view').hidden = isToday;
  $$('.tab').forEach((tab) => { const active = tab.dataset.view === name; tab.classList.toggle('active', active); tab.setAttribute('aria-selected', String(active)); });
}

function openTask(task = null) {
  editingId = task?.id ?? null;
  const form = $('#task-form');
  form.reset();
  form.elements.id.value = editingId ?? '';
  form.elements.title.value = task?.title ?? '';
  form.elements.notes.value = task?.notes ?? '';
  form.elements.kind.value = task?.kind ?? 'daily';
  form.elements.dueDate.value = task?.dueDate ?? '';
  $('#task-dialog-title').textContent = task ? '编辑待办' : '添加待办';
  $('#task-error').textContent = '';
  syncDateField();
  $('#task-dialog').showModal();
  form.elements.title.focus();
}

function syncDateField() {
  const dated = $('#task-form').elements.kind.value === 'dated';
  $('#due-date-field').hidden = !dated;
  $('#task-form').elements.dueDate.required = dated;
}

function handleTaskAction(event) {
  const card = event.target.closest('[data-id]');
  if (!card) return;
  const task = state.tasks.find((item) => item.id === card.dataset.id);
  if (!task) return;
  if (event.target.matches('.task-check')) {
    state.tasks = state.tasks.map((item) => item.id === task.id ? transitionTask(item, event.target.checked ? 'completed' : 'pending') : item);
  } else {
    const action = event.target.dataset.action;
    if (action === 'edit') return openTask(task);
    if (action === 'archive') state.tasks = state.tasks.map((item) => item.id === task.id ? transitionTask(item, 'archived') : item);
    if (action === 'restore') state.tasks = state.tasks.map((item) => item.id === task.id ? transitionTask(item, 'pending') : item);
    if (action === 'delete' && confirm(`删除“${task.title}”？`)) state.tasks = state.tasks.filter((item) => item.id !== task.id);
  }
  persist(); render();
}

function requireSettings() {
  const settings = loadSettings();
  if (!settings.owner || !settings.repo || !settings.token) { $('#settings-dialog').showModal(); throw new Error('请先完成 GitHub 同步设置'); }
  return settings;
}

$$('[data-view]').forEach((button) => button.addEventListener('click', () => switchView(button.dataset.view)));
$('#add-task').addEventListener('click', () => openTask());
$('[data-action="add"]').addEventListener('click', () => openTask());
$('#task-form').addEventListener('change', (event) => { if (event.target.name === 'kind') syncDateField(); });
$('#task-form').addEventListener('submit', (event) => {
  event.preventDefault(); const form = event.currentTarget; const input = Object.fromEntries(new FormData(form));
  try {
    state.tasks = editingId ? state.tasks.map((task) => task.id === editingId ? updateTask(task, input) : task) : [...state.tasks, createTask(input)];
    persist(); render(); $('#task-dialog').close(); notify(editingId ? '任务已更新' : '任务已添加');
  } catch (error) { $('#task-error').textContent = error.message; form.elements.title.focus(); }
});
document.addEventListener('click', handleTaskAction);
$$('[data-close]').forEach((button) => button.addEventListener('click', () => $(`#${button.dataset.close}`).close()));
$('#open-settings').addEventListener('click', () => { const s = loadSettings(); Object.entries(s).forEach(([key, value]) => { if ($('#settings-form').elements[key]) $('#settings-form').elements[key].value = value; }); $('#settings-dialog').showModal(); });
$('#settings-form').addEventListener('submit', (event) => { event.preventDefault(); saveSettings(localStorage, Object.fromEntries(new FormData(event.currentTarget))); $('#settings-dialog').close(); notify('同步设置已保存在当前浏览器'); });
$('#export-data').addEventListener('click', () => { const blob = new Blob([exportDataset(state)], { type: 'application/json' }); const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `lumen-tasks-${today()}.json`; a.click(); URL.revokeObjectURL(a.href); });
$('#import-data').addEventListener('click', () => $('#import-file').click());
$('#import-file').addEventListener('change', async (event) => { try { state = parseImportedDataset(await event.target.files[0].text()); persist('已导入'); render(); notify('数据导入成功'); } catch (error) { notify(error.message, true); } event.target.value = ''; });
$('#reset-data').addEventListener('click', () => { if (confirm('清空全部任务并恢复默认数据？')) { state = { ...initial, updatedAt: new Date().toISOString(), tasks: [] }; remoteSha = null; persist('已重置'); render(); } });
$('#pull-data').addEventListener('click', async () => { try { const result = await pullDataset(requireSettings()); if (state.tasks.length && !confirm('用 GitHub 数据替换当前浏览器数据？')) return; state = result.dataset; remoteSha = result.sha; persist('已从 GitHub 拉取'); render(); notify('GitHub 数据已拉取'); } catch (error) { notify(error.message, true); } });
$('#push-data').addEventListener('click', async () => { try { const result = await pushDataset(requireSettings(), state, remoteSha); remoteSha = result.sha; notify('数据已推送到 GitHub'); } catch (error) { notify(error.code === 'conflict' ? '远端已变化，请先拉取后再推送' : error.message, true); } });

render();
