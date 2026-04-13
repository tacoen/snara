
export function esc(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

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