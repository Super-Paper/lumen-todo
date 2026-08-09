const ACCENTS = new Set(['cyan', 'violet', 'mint', 'amber']);

export function safeRelativeHref(value) {
  const href = String(value ?? '');
  if (!/^\.\/[a-zA-Z0-9][a-zA-Z0-9_\-/]*\/$/.test(href) || href.includes('../')) {
    throw new Error('Unsafe child-site URL');
  }
  return href;
}

function validText(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

export function validateCatalog(value) {
  if (!value || value.version !== 1 || !Array.isArray(value.sites)) throw new Error('Invalid site catalog');
  const ids = new Set();
  const sites = value.sites.map((site) => {
    if (!site || !validText(site.id) || ids.has(site.id) || !validText(site.name) || !validText(site.description) || !validText(site.icon)) throw new Error('Invalid site entry');
    if (!['ready', 'planned'].includes(site.status) || !ACCENTS.has(site.accent)) throw new Error('Invalid site entry');
    ids.add(site.id);
    return { id: site.id, name: site.name.trim(), description: site.description.trim(), href: safeRelativeHref(site.href), icon: site.icon.trim(), accent: site.accent, status: site.status };
  });
  return { version: 1, sites };
}

export function siteViewModel(site) {
  const available = site.status === 'ready';
  return { ...site, href: available ? safeRelativeHref(site.href) : null, available, label: available ? '打开工具' : '即将推出' };
}

function escapeHtml(value) {
  return String(value).replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[char]);
}

function cardMarkup(site) {
  const vm = siteViewModel(site);
  const body = `<span class="tool-icon ${vm.accent}" aria-hidden="true">${escapeHtml(vm.icon)}</span><span class="tool-copy"><strong>${escapeHtml(vm.name)}</strong><span>${escapeHtml(vm.description)}</span></span><span class="tool-status">${escapeHtml(vm.label)} <b aria-hidden="true">${vm.available ? '↗' : '·'}</b></span>`;
  return vm.available ? `<a class="tool-card" href="${escapeHtml(vm.href)}">${body}</a>` : `<article class="tool-card planned" aria-disabled="true">${body}</article>`;
}

async function boot() {
  const grid = document.querySelector('#tool-grid');
  const status = document.querySelector('#tool-count');
  try {
    const response = await fetch('./sites.json', { cache: 'no-store' });
    if (!response.ok) throw new Error('目录数据加载失败');
    const catalog = validateCatalog(await response.json());
    grid.innerHTML = catalog.sites.map(cardMarkup).join('');
    const ready = catalog.sites.filter((site) => site.status === 'ready').length;
    status.textContent = `${ready} 个工具可用`;
  } catch (error) {
    grid.innerHTML = `<div class="error-state"><strong>暂时无法加载工具</strong><span>${escapeHtml(error.message)}</span></div>`;
    status.textContent = '目录离线';
  }
}

if (typeof document !== 'undefined') boot();
