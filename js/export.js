/* ─────────────────────────────────────────────────
   js/export.js — SnaraExport
   Export panel for the Files › Export section.

   Loads data/$bookId/*.json, extracts first h2 as
   title, groups by act, lets user pick files and
   export format.

   Formats:
     1. Markdown  (.md)   — native, immediate
     2. HTML      (.html) — wrapped in minimal template
     3. PDF       (.pdf)  — print-to-PDF via browser (later)
     4. EPUB      (.epub) — basic zip structure (later)
─────────────────────────────────────────────────── */

import { AppConfig } from './snara.js';
import { SnaraTool } from './snara/tool.js';
import icx           from './icons/ge-icon.js';
import { esc, slug, download } from './helpers.js';
import { _modalFooter } from './snara/modal.js';


export class SnaraExport {

  static instance = null;

  constructor() {
    SnaraExport.instance = this;
    this._chapters = [];   // [{ filename, act, title, order, entries }]
    this._docs     = {};   // { filename: docJson } — cache
  }

  // ── Public: called by SnaraFiles when export section opens ──

  async load() {
    const bookId = AppConfig.activeBookId;
    const ul     = document.getElementById('files-exp-list');
    const footer = document.getElementById('files-exp-footer');
    if (!ul) return;

    if (!bookId) {
      ul.innerHTML = '<li class="flist-empty">No active book — open a book first.</li>';
      return;
    }

    ul.innerHTML = '<li class="flist-empty" style="opacity:.5">Loading chapters…</li>';

    try {
      // 1. Get flat file list
      const listRes = await fetch(`${AppConfig.apiPath}?action=doc.list&bookId=${bookId}`);
      const filenames = await listRes.json();

      if (!filenames.length) {
        ul.innerHTML = '<li class="flist-empty">No documents in this book yet.</li>';
        return;
      }

      // 2. Fetch act.json for grouping (already built by backend on each save)
      let actMap = {};
      try {
        const actRes  = await fetch(`${AppConfig.dataPath}/${bookId}/conf/act.json`);
        const actData = await actRes.json();
        actData.forEach(row => { actMap[row.filename] = row.act || 'Uncategorized'; });
      } catch {
        // act.json may not exist yet — fall back to ungrouped
      }

      // 3. Fetch each doc to extract title + meta.order + entry count
      this._docs     = {};
      this._chapters = [];

      await Promise.all(filenames.map(async filename => {
        try {
          const res = await fetch(
            `${AppConfig.apiPath}?action=doc.get&bookId=${bookId}&filename=${encodeURIComponent(filename)}`
          );
          const doc = await res.json();
          this._docs[filename] = doc;

          const title   = this._extractTitle(doc);
          const order   = parseInt(doc.meta?.order ?? 99);
          const act     = actMap[filename] || 'Uncategorized';
          const entries = Array.isArray(doc.article) ? doc.article.length : 0;

          this._chapters.push({ filename, act, title, order, entries });
        } catch {
          this._chapters.push({
            filename,
            act:     actMap[filename] || 'Uncategorized',
            title:   filename,
            order:   99,
            entries: 0,
          });
        }
      }));

      // 4. Sort by meta.order ASC within each act, then filename as tiebreaker
      this._chapters.sort((a, b) => {
        if (a.act !== b.act) return a.act.localeCompare(b.act);
        return a.order !== b.order ? a.order - b.order : a.filename.localeCompare(b.filename);
      });

      this._renderList(ul);
      this._renderFooter(footer);

    } catch (e) {
      ul.innerHTML = `<li class="flist-empty" style="color:var(--danger)">Error: ${esc(e.message)}</li>`;
    }
  }

  // ── Extract chapter title from article ────────
  // act  = h1 → skip (that's the group label, not the chapter title)
  // chapter = h2 ✓ prefer this
  // scene   = h3 ✓ fallback
  // beat    = h4 ✓ last resort
  // then fall back to filename

  _extractTitle(doc) {
    const article = doc.article || [];
    for (const entry of article) {
      const tmp = document.createElement('div');
      tmp.innerHTML = entry.content || '';
      const h = tmp.querySelector('h2') || tmp.querySelector('h3') || tmp.querySelector('h4');
      if (h) return h.textContent.trim();
    }
    return doc.filename || '—';
  }

  // ── Render chapter checklist ──────────────────

  _renderList(ul) {
    const grouped  = {};
    const actOrder = [];

    this._chapters.forEach(ch => {
      if (!grouped[ch.act]) { grouped[ch.act] = []; actOrder.push(ch.act); }
      grouped[ch.act].push(ch);
    });

    ul.innerHTML = actOrder.map(act => `
      <li class="flist-act-hdr" style="display:flex;align-items:center;gap:6px">
        <input type="checkbox" class="fexp-act-cb" data-act="${esc(act)}" checked
          style="accent-color:var(--primary);width:13px;height:13px;cursor:pointer"
          title="Toggle all in this act">
        <span>${esc(act)}</span>
      </li>
      ${grouped[act].map(ch => `
        <li class="flist-item fexp-item" data-filename="${esc(ch.filename)}" data-act="${esc(ch.act)}">
          <input type="checkbox" class="fexp-cb" value="${esc(ch.filename)}" checked
            style="accent-color:var(--primary);width:13px;height:13px;flex-shrink:0;cursor:pointer">
          <span class="fname" style="flex:1">${esc(ch.title || ch.filename)}</span>
          <span class="fbadge">${ch.entries} entr${ch.entries === 1 ? 'y' : 'ies'}</span>
        </li>`).join('')}
    `).join('');

    // Act-level checkbox toggles all its children
    ul.querySelectorAll('.fexp-act-cb').forEach(actCb => {
      actCb.addEventListener('change', () => {
        ul.querySelectorAll(`.fexp-item[data-act="${actCb.dataset.act}"] .fexp-cb`)
          .forEach(cb => cb.checked = actCb.checked);
        this._syncSelectAll();
      });
    });

    // Child checkbox syncs its act checkbox
    ul.querySelectorAll('.fexp-cb').forEach(cb => {
      cb.addEventListener('change', () => {
        const act   = cb.closest('.fexp-item').dataset.act;
        const actCb = ul.querySelector(`.fexp-act-cb[data-act="${act}"]`);
        const peers = [...ul.querySelectorAll(`.fexp-item[data-act="${act}"] .fexp-cb`)];
        if (actCb) actCb.checked = peers.every(p => p.checked);
        this._syncSelectAll();
      });
    });

    // Select-all header checkbox
    const selAll = document.getElementById('files-exp-all');
    if (selAll) {
      selAll.checked = true;
      selAll.onchange = e => {
        ul.querySelectorAll('.fexp-cb, .fexp-act-cb').forEach(cb => cb.checked = e.target.checked);
      };
    }
  }

  _syncSelectAll() {
    const selAll = document.getElementById('files-exp-all');
    if (!selAll) return;
    const all = [...document.querySelectorAll('#files-exp-list .fexp-cb')];
    selAll.checked = all.every(cb => cb.checked);
  }

  // ── Render export format footer ───────────────

  _renderFooter(footer) {
    if (!footer) return;
    // Export panel has no Cancel/Save — use additionalHTML only, then
    // render a footer-shaped div directly (no standard Save button here).
    footer.innerHTML = `
      <button class="cfg-btn cfg-btn-ghost" onclick="SnaraExport.instance.exportAs('md')">
        <i data-icon="download"></i> Markdown
      </button>
      <button class="cfg-btn cfg-btn-ghost" onclick="SnaraExport.instance.exportAs('html')">
        <i data-icon="download"></i> HTML
      </button>
      <button class="cfg-btn cfg-btn-ghost" style="opacity:.45;cursor:not-allowed" title="Coming soon" disabled>
        <i data-icon="download"></i> PDF
      </button>
      <button class="cfg-btn cfg-btn-ghost" style="opacity:.45;cursor:not-allowed" title="Coming soon" disabled>
        <i data-icon="download"></i> EPUB
      </button>
    `;
    icx.delayreplace('#files-exp-footer [data-icon]');
  }
  
  
  // ── Export ────────────────────────────────────

  async exportAs(fmt) {
    const selected = [...document.querySelectorAll('#files-exp-list .fexp-cb:checked')]
      .map(cb => cb.value);

    if (!selected.length) {
      alert('Select at least one chapter to export.');
      return;
    }

    // Preserve meta.order sort from this._chapters
    const ordered = this._chapters.filter(ch => selected.includes(ch.filename));

    // Gather docs — use cache, fetch if missing
    const bookId = AppConfig.activeBookId;
    for (const ch of ordered) {
      if (!this._docs[ch.filename]) {
        try {
          const res = await fetch(
            `${AppConfig.apiPath}?action=doc.get&bookId=${bookId}&filename=${encodeURIComponent(ch.filename)}`
          );
          this._docs[ch.filename] = await res.json();
        } catch {
          this._docs[ch.filename] = { filename: ch.filename, article: [] };
        }
      }
    }

    if (fmt === 'md')   this._exportMd(ordered);
    if (fmt === 'html') this._exportHtml(ordered);
  }

  // ── Markdown export ───────────────────────────

  _exportMd(ordered) {
    const parts = ordered.map(ch => {
      const doc     = this._docs[ch.filename] || {};
      const article = doc.article || [];
      return article
        .map(entry => SnaraTool.htmlToMd(entry.content || ''))
        .filter(Boolean)
        .join('\n\n');
    });

    const content   = parts.join('\n\n---\n\n');
    const bookTitle = AppConfig.activeBookTitle || 'export';
    download(`${slug(bookTitle)}.md`, content, 'text/markdown');
  }

  // ── HTML export ───────────────────────────────

  _exportHtml(ordered) {
    const bookTitle = AppConfig.activeBookTitle || 'Export';

    const body = ordered.map(ch => {
      const doc     = this._docs[ch.filename] || {};
      const article = doc.article || [];
      const content = article
        .map(e => `<section class="entry ${esc(e.class || '')}">${e.content || ''}</section>`)
        .join('\n');
      return `<article class="chapter" id="${esc(ch.filename)}">\n${content}\n</article>`;
    }).join('\n\n<hr>\n\n');

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${esc(bookTitle)}</title>
  <style>
    body { font-family: Georgia, serif; max-width: 720px; margin: 4rem auto; padding: 0 2rem; line-height: 1.8; color: #222; }
    h1, h2, h3 { font-weight: normal; }
    .entry { margin-bottom: 1.5rem; }
    .entry.act     h1 { font-size: 2rem;   border-bottom: 1px solid #ccc; padding-bottom: .5rem; }
    .entry.chapter h2 { font-size: 1.5rem; }
    .entry.scene   h3 { font-size: 1.1rem; color: #555; }
    hr { border: none; border-top: 1px solid #ddd; margin: 3rem 0; }
  </style>
</head>
<body>
  <h1>${esc(bookTitle)}</h1>
${body}
</body>
</html>`;

    download(`${slug(bookTitle)}.html`, html, 'text/html');
  }
}
