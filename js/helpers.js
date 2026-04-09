/* ─────────────────────────────────────────────────
   js/helpers.js — Snara shared utilities
   Single source of truth. Import from here — never
   redeclare locally.

   Consolidated from:
     esc / _esc  → 7 files, 3 broken variants
     fmtDate     → index.js
     fmtSize     → files.js
     splitCsv    → settings.js
     slug        → export.js
     download    → export.js
     iconFor     → files.js (gallery.js will need it too)
─────────────────────────────────────────────────── */


// ── HTML escaping ─────────────────────────────────
// Canonical version — escapes all four characters.
// Previous local copies in ui.js and settings.js
// were silently missing &amp; or &quot; respectively.

export function esc(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}


// ── Date formatting ───────────────────────────────
// Converts a Unix timestamp (seconds) to a readable date.

export function fmtDate(ts) {
  if (!ts) return '—';
  return new Date(ts * 1000).toLocaleDateString(undefined, {
    year: 'numeric', month: 'short', day: 'numeric',
  });
}


// ── File size formatting ──────────────────────────
// Converts bytes to a human-readable string.
// Old local version in files.js stopped at KB —
// this one also handles MB.

export function fmtSize(bytes) {
  if (!bytes) return '';
  if (bytes < 1024)    return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
}


// ── CSV string → array ────────────────────────────
// Splits a comma-separated string into a trimmed array.

export function splitCsv(str) {
  return (str || '').split(',').map(s => s.trim()).filter(Boolean);
}


// ── URL-safe slug ─────────────────────────────────
// Converts a display string to a lowercase hyphenated slug.

export function slug(str) {
  return String(str ?? 'export')
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/[\s_]+/g, '-')
    .slice(0, 60) || 'export';
}


// ── File download trigger ─────────────────────────
// Creates a temporary <a> and clicks it to save a file.

export function download(filename, content, mime) {
  const blob = new Blob([content], { type: `${mime};charset=utf-8` });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}


// ── File extension → icon name ────────────────────
// Maps a lowercase file extension to a Snara icon key.
// Used by files.js, gallery.js, and any future module
// that renders file lists.
//
// Usage:
//   import { iconFor } from '../helpers.js';
//   `<i data-icon="${iconFor(f.ext)}"></i>`

export function iconFor(ext) {
  const e = (ext || '').toLowerCase();
  if (['jpg','jpeg','png','gif','webp','svg','bmp'].includes(e)) return 'photo';
  if (['mp4','webm','mov','ogg','m4v'].includes(e))              return 'video';
  if (e === 'md')   return 'markdown';
  if (e === 'json') return 'checkup-list';
  return 'file-text';
}