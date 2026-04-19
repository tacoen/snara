// helpers.js — shared pure utilities, no framework dependencies

// ── String escaping ───────────────────────────────
export function esc(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ── Date formatting ───────────────────────────────
// ts: Unix timestamp in seconds
export function fmtDate(ts) {
  if (!ts) return '—';
  return new Date(ts * 1000).toLocaleDateString(undefined, {
    year: 'numeric', month: 'short', day: 'numeric',
  });
}

export function fmtSize(bytes) {
  if (!bytes) return '';
  if (bytes < 1024)    return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
}

export function splitCsv(str) {
  return (str || '').split(',').map(s => s.trim()).filter(Boolean);
}

export function slug(str) {
  return String(str ?? 'export')
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/[\s_]+/g, '-')
    .slice(0, 60) || 'export';
}

export function download(filename, content, mime) {
  const blob = new Blob([content], { type: `${mime};charset=utf-8` });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export function iconFor(ext) {
  const e = (ext || '').toLowerCase();
  if (['jpg','jpeg','png','gif','webp','svg','bmp'].includes(e)) return 'photo';
  if (['mp4','webm','mov','ogg','m4v'].includes(e))              return 'video';
  if (e === 'md')   return 'markdown';
  if (e === 'json') return 'checkup-list';
  return 'file-text';
}

// ── Unique ID generation ──────────────────────────
// prefix: optional string prepended to the id
export function uid(prefix = '') {
  return prefix + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

// ── String truncation ─────────────────────────────
// Appends ellipsis if str exceeds max characters
export function truncate(str, max) {
  if (typeof str !== 'string') return '';
  return str.length <= max ? str : str.slice(0, max).trimEnd() + '\u2026';
}

// ── Debug logger factory ──────────────────────────
// tag:  log prefix e.g. '[SnaraKanban]'
// key:  localStorage key value that enables logging e.g. 'kanban'
// Returns a log function with the same call signature as console.log.
// Usage: this._log = debugLog('[MyClass]', 'myclass');
export function debugLog(tag, key) {
  return function (...args) {
    try {
      const stored = localStorage.getItem('debug') ?? '';
      if (stored === key || stored.includes(key)) {
        console.log(tag, ...args);
      }
    } catch { }
  };
}

// ── List state helper ─────────────────────────────
// Sets a <ul> to one of three visual states without repeating inline HTML.
// state: 'loading' | 'empty' | 'error'
// msg:   override the default message for that state
export function listSetState(ul, state, msg = '') {
  if (!ul) return;
  const defaults = {
    loading: { text: 'Loading…',        style: 'opacity:.5'             },
    empty:   { text: 'Nothing here yet.', style: ''                     },
    error:   { text: msg || 'Error.',    style: 'color:var(--danger)'   },
  };
  const cfg = defaults[state] ?? defaults.empty;
  const text = msg && state !== 'error' ? msg : cfg.text;
  ul.innerHTML = `<li class="flist-empty"${cfg.style ? ` style="${cfg.style}"` : ''}>${esc(text)}</li>`;
}

// ── Confirm delete bar ────────────────────────────
// Appends a fixed bottom confirmation bar to document.body.
// label:     text shown in the bar e.g. 'Delete "filename"?'
// onConfirm: async () => void — called when user clicks Yes
// onCancel:  () => void       — called when user clicks No or after confirm
// Returns a cleanup function that removes the bar.
export function confirmDeleteBar(label, onConfirm, onCancel = null) {
  const bar = document.createElement('div');
  bar.className = 'del-confirm';
  bar.style.cssText = [
    'position:fixed', 'bottom:0', 'left:0', 'width:100%', 'z-index:999',
    'display:flex', 'align-items:center', 'gap:8px',
    'padding:10px 16px', 'font-size:12px',
    'background:var(--bg-alt)', 'border-top:1px solid var(--border)',
    'box-shadow:0 -2px 12px var(--shadow)',
  ].join(';');

  bar.innerHTML = `
    <span style="flex:1;color:var(--danger)">${esc(label)}</span>
    <button class="btn-mini mute" style="padding:2px 8px;font-size:11px" data-action="no">No</button>
    <button class="btn-mini" style="padding:2px 8px;font-size:11px;border-color:var(--danger);color:var(--danger)" data-action="yes">Yes, delete</button>
  `;
  document.body.appendChild(bar);

  const cleanup = () => bar.remove();

  bar.querySelector('[data-action="no"]').addEventListener('click', () => {
    cleanup();
    onCancel?.();
  });

  bar.querySelector('[data-action="yes"]').addEventListener('click', async () => {
    bar.innerHTML = `<span style="color:var(--fg-muted);font-size:11px;padding:2px 4px">Deleting…</span>`;
    try {
      await onConfirm();
      cleanup();
    } catch (e) {
      cleanup();
      onCancel?.();
      alert(`Delete failed: ${e.message}`);
    }
  });

  return cleanup;
}

// ── Centralised fetch wrapper ─────────────────────
// Performs a fetch, parses JSON, and throws on HTTP error or json.error.
// Returns the parsed JSON object.
export async function apiFetch(url, opts = {}) {
  const res  = await fetch(url, opts);
  const json = await res.json();
  if (!res.ok || json.error) throw new Error(json.error || `HTTP ${res.status}`);
  return json;
}

// ── POST JSON shorthand ───────────────────────────
// Wraps apiFetch with POST method and JSON Content-Type header.
export async function postJson(url, body, opts = {}) {
  return apiFetch(url, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(body),
    ...opts,
  });
}
