/* ─────────────────────────────────────────────────
   js/snara/gallery.js — SnaraGallery
   4-column masonry-style grid for images & videos.
   Features: upload, rename (with autocomplete from
   meta), delete (same confirm-bar pattern as import).
─────────────────────────────────────────────────── */
import { AppConfig } from '../snara.js';
import icx           from '../icons/ge-icon.js';

export class SnaraGallery {

  static instance = null;

  constructor() {
    SnaraGallery.instance = this;
    this._terms = [];   // autocomplete terms
  }

  // ── Public: load gallery for active book ─────

  async load() {
    const bookId = AppConfig.activeBookId;
    const grid   = document.getElementById('gallery-grid');
    if (!grid) return;

    if (!bookId) {
      grid.innerHTML = '<p class="flist-empty">No active book.</p>';
      return;
    }

    grid.innerHTML = '<p class="flist-empty" style="opacity:.5">Loading…</p>';

    // Prefetch autocomplete terms in background
    this._fetchTerms(bookId);

    try {
      const res   = await fetch(`${AppConfig.apiPath}?action=gallery.list&bookId=${bookId}`);
      const files = await res.json();

      if (!files.length) {
        grid.innerHTML = '<p class="flist-empty">No media yet — drop files above.</p>';
        return;
      }

      grid.innerHTML = '';
      files.forEach(f => grid.appendChild(this._makeCard(f, bookId)));

      // Replace icons after all cards are in the DOM
      icx.delayreplace('#gallery-grid [data-icon]');

    } catch (e) {
      grid.innerHTML = `<p class="flist-empty" style="color:var(--danger)">Error: ${_esc(e.message)}</p>`;
    }
  }

  // ── Card ──────────────────────────────────────
  // NOTE: does NOT call icx.delayreplace — caller does it after DOM insertion

  _makeCard(f, bookId) {
    const isVideo = f.mime.startsWith('video/');
    const url     = `${AppConfig.dataPath}/${bookId}/image/${encodeURIComponent(f.filename)}`;

    const card = document.createElement('div');
    card.className        = 'gallery-card';
    card.dataset.filename = f.filename;

    // Media element
    if (isVideo) {
      const vid = document.createElement('video');
      vid.src     = url;
      vid.muted   = true;
      vid.loop    = true;
      vid.preload = 'metadata';
      vid.addEventListener('mouseenter', () => vid.play().catch(() => {}));
      vid.addEventListener('mouseleave', () => { vid.pause(); vid.currentTime = 0; });
      card.appendChild(vid);
    } else {
      const img = document.createElement('img');
      img.src     = url;
      img.alt     = f.filename;
      img.loading = 'lazy';
      card.appendChild(img);
    }

    // Overlay bar with filename + tools
    const bar = document.createElement('div');
    bar.className = 'gallery-bar';
    bar.innerHTML = `
      <span class="gallery-name" title="${_esc(f.filename)}">${_esc(f.filename)}</span>
      <div class="gallery-tools">
        <button class="gtool" data-action="rename" title="Rename"><i data-icon="pencil"></i></button>
        <button class="gtool" data-action="delete" title="Delete"><i data-icon="trash"></i></button>
      </div>`;
    card.appendChild(bar);

    // Bind tool buttons
    bar.querySelector('[data-action="rename"]').addEventListener('click', e => {
      e.stopPropagation();
      this._openRename(card, f.filename, bookId);
    });

    bar.querySelector('[data-action="delete"]').addEventListener('click', e => {
      e.stopPropagation();
      this._confirmDelete(card, f.filename, bookId);
    });

    return card;
  }

  // ── Rename ────────────────────────────────────

  _openRename(card, filename, bookId) {
    card.querySelector('.gallery-rename-box')?.remove();

    const ext      = filename.split('.').pop();
    const basename = filename.slice(0, -(ext.length + 1));

    const box = document.createElement('div');
    box.className = 'gallery-rename-box';
    box.innerHTML = `
      <input class="gallery-rename-input cfg-input" value="${_esc(basename)}"
        placeholder="new name…" autocomplete="off" spellcheck="false" list="gallery-ac-list">
      <datalist id="gallery-ac-list"></datalist>
      <div class="gallery-rename-actions">
        <button class="cfg-btn cfg-btn-ghost gallery-rename-cancel" style="font-size:11px;padding:2px 8px">Cancel</button>
        <button class="cfg-btn cfg-btn-primary gallery-rename-ok"  style="font-size:11px;padding:2px 8px">Rename</button>
      </div>`;
    card.appendChild(box);

    // Icons in rename box (none currently, but safe to call)
    icx.delayreplace('#gallery-grid [data-icon]');

    const input    = box.querySelector('input');
    const datalist = box.querySelector('datalist');

    this._populateDatalist(datalist);
    input.addEventListener('input', () => this._populateDatalist(datalist, input.value));

    input.focus();
    input.select();

    box.querySelector('.gallery-rename-cancel').addEventListener('click', () => box.remove());

    const doRename = async () => {
      const newBase = input.value.trim();
      if (!newBase || newBase === basename) { box.remove(); return; }

      const btn = box.querySelector('.gallery-rename-ok');
      btn.disabled    = true;
      btn.textContent = '…';

      try {
        const res  = await fetch(`${AppConfig.apiPath}?action=gallery.rename&bookId=${bookId}`, {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ from: filename, to: newBase }),
        });
        const json = await res.json();
        if (!res.ok || json.error) throw new Error(json.error || `HTTP ${res.status}`);

        const newFilename = json.filename;
        card.dataset.filename = newFilename;
        card.querySelector('.gallery-name').textContent = newFilename;
        card.querySelector('.gallery-name').title       = newFilename;

        const newUrl = `${AppConfig.dataPath}/${bookId}/image/${encodeURIComponent(newFilename)}`;
        const media  = card.querySelector('img, video');
        if (media) media.src = newUrl;

        box.remove();

      } catch (e) {
        btn.disabled    = false;
        btn.textContent = 'Rename';
        input.style.borderColor = 'var(--danger)';
        input.title = e.message;
      }
    };

    box.querySelector('.gallery-rename-ok').addEventListener('click', doRename);
    input.addEventListener('keydown', e => {
      if (e.key === 'Enter')  { e.preventDefault(); doRename(); }
      if (e.key === 'Escape') box.remove();
    });
  }

  _populateDatalist(datalist, query = '') {
    const q = query.toLowerCase();
    const matches = q
      ? this._terms.filter(t => t.toLowerCase().includes(q)).slice(0, 20)
      : this._terms.slice(0, 20);

    datalist.innerHTML = matches
      .map(t => `<option value="${_esc(t)}">`)
      .join('');
  }

  async _fetchTerms(bookId) {
    try {
      const res  = await fetch(`${AppConfig.apiPath}?action=gallery.autocomplete&bookId=${bookId}`);
      const data = await res.json();
      this._terms = data.terms || [];
    } catch {
      this._terms = [];
    }
  }

  // ── Delete (same confirm-bar pattern as import) ─

  _confirmDelete(card, filename, bookId) {
    if (!card.classList.contains('gallery-deleting')) {
      card.classList.add('gallery-deleting');

      const bar = document.createElement('div');
      bar.className = 'del-confirm';
      bar.innerHTML = `
        <span style="flex:1;color:var(--danger)">Delete "${_esc(filename)}"?</span>
        <button class="cfg-btn cfg-btn-ghost" style="padding:2px 8px;font-size:11px" data-action="del-no">No</button>
        <button class="cfg-btn" style="padding:2px 8px;font-size:11px;border-color:var(--danger);color:var(--danger)" data-action="del-yes">Yes, delete</button>
      `;
      document.body.appendChild(bar);

      bar.querySelector('[data-action="del-no"]').addEventListener('click', () => {
        card.classList.remove('gallery-deleting');
        bar.remove();
      });

      bar.querySelector('[data-action="del-yes"]').addEventListener('click', async () => {
        bar.innerHTML = `<span style="color:var(--fg-muted);font-size:11px;padding:2px 4px">Deleting…</span>`;
        try {
          const res  = await fetch(
            `${AppConfig.apiPath}?action=gallery.delete&bookId=${bookId}&filename=${encodeURIComponent(filename)}`,
            { method: 'DELETE' }
          );
          const json = await res.json();
          if (!res.ok || json.error) throw new Error(json.error || `HTTP ${res.status}`);
          bar.remove();
          card.remove();
        } catch (e) {
          alert(`Delete failed: ${e.message}`);
          card.classList.remove('gallery-deleting');
          bar.remove();
        }
      });
    }
  }

  // ── Upload files ──────────────────────────────

  async uploadFiles(files) {
    const bookId = AppConfig.activeBookId;
    if (!bookId) { alert('No active book — open a book first.'); return; }

    const allowed = ['jpg','jpeg','png','gif','webp','svg','bmp','mp4','webm','mov','ogg','m4v'];

    for (const file of files) {
      const ext = file.name.split('.').pop().toLowerCase();
      if (!allowed.includes(ext)) {
        alert(`"${file.name}" is not supported. Allowed: images and videos.`);
        continue;
      }

      const fd = new FormData();
      fd.append('file', file);

      try {
        const res  = await fetch(
          `${AppConfig.apiPath}?action=gallery.upload&bookId=${bookId}`,
          { method: 'POST', body: fd }
        );
        const json = await res.json();
        if (!res.ok || json.error) throw new Error(json.error || `HTTP ${res.status}`);

        const grid = document.getElementById('gallery-grid');
        if (grid) {
          const empty = grid.querySelector('.flist-empty');
          if (empty) empty.remove();

          const card = this._makeCard(json.file, bookId);
          grid.prepend(card);

          // Replace icons after card is in the DOM
          icx.delayreplace('#gallery-grid [data-icon]');
        }

      } catch (e) {
        alert(`Upload failed for "${file.name}": ${e.message}`);
      }
    }

    // Bust autocomplete cache so new filenames appear
    this._fetchTerms(bookId);
  }
}

// ── Module-private helpers ────────────────────────
function _esc(str) {
  return String(str ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
}