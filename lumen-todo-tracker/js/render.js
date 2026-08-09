export function taskViewModel(task, today) {
  let badge = '每日';
  if (task.kind === 'dated') badge = task.dueDate < today ? '已逾期' : task.dueDate === today ? '今天' : task.dueDate;
  return { ...task, badge, checked: task.status === 'completed', canArchive: task.status === 'completed' };
}

export function timelineGroups(tasks, today) {
  const map = new Map();
  tasks.filter((task) => task.kind === 'dated' && task.status !== 'archived').sort((a, b) => a.dueDate.localeCompare(b.dueDate)).forEach((task) => {
    if (!map.has(task.dueDate)) map.set(task.dueDate, []);
    map.get(task.dueDate).push(taskViewModel(task, today));
  });
  return [...map].map(([date, items]) => ({ date, items, tone: date < today ? 'overdue' : date === today ? 'today' : 'future' }));
}

export function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[char]);
}
