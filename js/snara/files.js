/* ─────────────────────────────────────────────────
   snara/files.js — SnaraFiles
   Sections:
     import  → data/$bookId/import/   (staged raw files)
     export  → chapter checklist
     gallery → data/$bookId/image/
     cache   → data/$bookId/cache/
─────────────────────────────────────────────────── */
import { AppConfig }            from '../snara.js';
import { SnaraStruct }          from './struct.js';
import { SnaraGallery }         from './gallery.js';
import icx                      from '../icons/ge-icon.js';
import { openModal, closeModal } from './modal.js';

export class SnaraFiles {

  static instance = null;

  constructor() {
    SnaraFiles.instance = this;
    this._dragSrc = null;
    this._section = 'import';

    this._ensureModal();
    this._bindDropzones();
    this._bindFileInputs();
    this._bindBookChange();
    this.switchSection('import');
  }

  _bindBookChange() {
    window.addEventListener('bookchange', () => {
      if (this._section === 'import')  this._loadImpList();
      if (this._section === 'export')  window.SnaraExport?.instance?.load();
      if (this._section === 'gallery') SnaraGallery.instance?.load();
      if (this._section === 'cache')   this._loadCacheList();
    });
  }

  // ── Import preview modal ──────────────────────

  _ensureModal() {
    if (document.getElementById('files-import-modal')) return;
    const modal = document.createElement('div');
    modal.className = 'app-modal';
    modal.id = 'files-import-modal';
    modal.setAttribute('hidden', '');
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    document.getElementById('app-overlay').appendChild(modal);
  }

  async _openPreview(filename) {
    const bookId = AppConfig.activeBookId;
    if (!bookId) { alert('No active book.'); return; }

    const modal = document.getElementById('files-import-modal');
    modal.innerHTML = `
      <div class="modal-header">
        <span class="modal-title"><i data-icon="file-text"></i> Preview — ${_esc(filename)}</span>
        <button class="modal-close" onclick="closeModal()"><i data-icon="x"></i></button>
      </div>
      <div class="modal-body" style="display:flex;align-items:center;justify-content:center;padding:2rem">
        <span style="font-size:var(--f-xs);color:var(--fg-muted)">Parsing file…</span>
      </div>`;
    openModal('files-import-modal');
    icx.delayreplace('#files-import-modal [data-icon]');

    let text;
    try {
      const res = await fetch(
        `${AppConfig.apiPath}?action=import.read&bookId=${bookId}&filename=${encodeURIComponent(filename)}`
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      text = await res.text();
    } catch (e) {
      this._showPreviewError(modal, `Could not read file: ${e.message}`);
      return;
    }

    const blocks = SnaraStruct.split(text);
    if (!blocks.length) {
      this._showPreviewError(modal, 'File appears to be empty.');
      return;
    }

    const defaultFilename = filename
      .replace(/\.[^.]+$/, '')
      .replace(/\s+/g, '-')
      .toLowerCase();

    modal.innerHTML = `
      <div class="modal-header">
        <span class="modal-title"><i data-icon="file-text"></i> Preview — ${_esc(filename)}</span>
        <button class="modal-close" onclick="closeModal()"><i data-icon="x"></i></button>
      </div>
      <div class="modal-body" style="padding:var(--s-md);overflow-y:auto;display:flex;flex-direction:column;gap:var(--s-sm)">
        <div class="cfg-row">
          <label class="cfg-label" style="flex-shrink:0">Save as</label>
          <input class="cfg-input" id="imp-filename" value="${_esc(defaultFilename)}"
            placeholder="filename (no extension)" style="flex:1">
        </div>
        <div style="font-size:var(--f-xs);color:var(--fg-muted)">
          ${blocks.length} block${blocks.length !== 1 ? 's' : ''} detected — review before importing:
        </div>
        <div id="imp-preview-list" style="display:flex;flex-direction:column;gap:6px">
          ${blocks.map((b, bi) => `
            <div class="imp-block" style="border:1px solid var(--border);border-radius:6px;overflow:hidden">
              <div style="display:flex;align-items:center;gap:8px;padding:6px 10px;background:var(--bg-alt);border-bottom:1px solid var(--border)">
                <span class="fbadge imp-cls-badge" data-idx="${bi}" title="Click to cycle class" style="cursor:pointer">${_esc(b.cls)}</span>
                <span style="font-size:11px;color:var(--fg-muted);flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">
                  ${_esc(b.md.split('\n')[0].slice(0, 80))}
                </span>
                <label style="display:flex;align-items:center;gap:4px;font-size:11px;color:var(--fg-muted);cursor:pointer">
                  <input type="checkbox" class="imp-block-cb" data-idx="${bi}" checked
                    style="accent-color:var(--primary)"> include
                </label>
              </div>
              <pre style="margin:0;padding:8px 10px;font-size:11px;font-family:var(--font-mono);white-space:pre-wrap;color:var(--fg-muted);max-height:100px;overflow-y:auto;background:var(--bg-main)">${_esc(b.md)}</pre>
            </div>`).join('')}
        </div>
      </div>
      <div class="modal-footer">
        <button class="cfg-btn cfg-btn-ghost" onclick="closeModal()">Cancel</button>
        <button class="cfg-btn cfg-btn-primary" id="imp-confirm-btn">
          <i data-icon="download"></i> Import
        </button>
      </div>`;

    icx.delayreplace('#files-import-modal [data-icon]');
    modal._blocks   = blocks;
    modal._filename = filename;

    modal.querySelectorAll('.imp-cls-badge').forEach(badge => {
      badge.addEventListener('click', () => {
        const bi   = parseInt(badge.dataset.idx);
        const cls  = SnaraStruct.CLASSES;
        const next = cls[(cls.indexOf(blocks[bi].cls) + 1) % cls.length];
        blocks[bi].cls    = next;
        badge.textContent = next;
      });
    });

    modal.querySelector('#imp-confirm-btn').addEventListener('click', () => {
      this._confirmImport(modal, filename);
    });
  }

  _showPreviewError(modal, msg) {
    modal.innerHTML = `
      <div class="modal-header">
        <span class="modal-title">Import error</span>
        <button class="modal-close" onclick="closeModal()"><i data-icon="x"></i></button>
      </div>
      <div class="modal-body" style="padding:var(--s-lg);color:var(--danger);font-size:var(--f-xs)">${_esc(msg)}</div>
      <div class="modal-footer">
        <button class="cfg-btn cfg-btn-ghost" onclick="closeModal()">Close</button>
      </div>`;
    icx.delayreplace('#files-import-modal [data-icon]');
  }

  async _confirmImport(modal, srcFilename) {
    const bookId   = AppConfig.activeBookId;
    const blocks   = modal._blocks;
    const filename = document.getElementById('imp-filename')?.value.trim()
      || srcFilename.replace(/\.[^.]+$/, '').replace(/\s+/g, '-').toLowerCase();

    if (!bookId) { alert('No active book.'); return; }

    const checked = [...modal.querySelectorAll('.imp-block-cb')]
      .map((cb, bi) => cb.checked ? blocks[bi] : null)
      .filter(Boolean);

    if (!checked.length) { alert('No blocks selected.'); return; }

    const btn = modal.querySelector('#imp-confirm-btn');
    btn.disabled    = true;
    btn.textContent = 'Importing…';

    const article = checked.map(b => ({
      class:   b.cls,
      content: marked.parse(b.md, { breaks: true }),
    }));

    try {
      const res  = await fetch(AppConfig.apiPath + '?action=doc.save', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ filename, bookId, meta: {}, article }),
      });
      const json = await res.json();
      if (!res.ok || json.error) throw new Error(json.error || `HTTP ${res.status}`);

      closeModal();

      try {
        await fetch(
          `${AppConfig.apiPath}?action=import.delete&bookId=${bookId}&filename=${encodeURIComponent(srcFilename)}`,
          { method: 'DELETE' }
        );
      } catch { /* non-fatal */ }

      this._loadImpList();
      window.dispatchEvent(new CustomEvent('chapteradded', { detail: { bookId, filename } }));

    } catch (e) {
      btn.disabled  = false;
      btn.innerHTML = '<i data-icon="download"></i> Import';
      icx.delayreplace('#files-import-modal #imp-confirm-btn [data-icon]');
      const errEl = modal.querySelector('.imp-err');
      if (errEl) errEl.remove();
      btn.insertAdjacentHTML('beforebegin',
        `<span class="imp-err" style="color:var(--danger);font-size:11px">Error: ${_esc(e.message)}</span>`);
    }
  }

  // ── Section switching ─────────────────────────

  switchSection(sec) {
    this._section = sec;

    document.querySelectorAll('.fnav-item').forEach(b =>
      b.classList.toggle('active', b.dataset.section === sec)
    );
    document.querySelectorAll('.fpanel').forEach(p => {
      p.hidden = p.id !== `fpanel-${sec}`;
    });

    const titles = { import: 'Import', export: 'Export', gallery: 'Gallery', cache: 'Cache' };
    const titleEl = document.getElementById('files-section-title');
    if (titleEl) titleEl.textContent = titles[sec] || sec;

    this._renderTopActions(sec);

    if (sec === 'import')  this._loadImpList();
    if (sec === 'export')  window.SnaraExport?.instance?.load();
    if (sec === 'gallery') SnaraGallery.instance?.load();
    if (sec === 'cache')   this._loadCacheList();

    icx.delayreplace(`#fpanel-${sec} [data-icon]`);
    icx.delayreplace('#files-topbar-actions [data-icon]');
  }

  _renderTopActions(sec) {
    const el = document.getElementById('files-topbar-actions');
    if (!el) return;
    if (sec === 'import') {
      el.innerHTML = `<button class="cfg-btn cfg-btn-ghost" onclick="SnaraFiles.instance._triggerInput('files-input')"><i data-icon="upload"></i> Upload</button>`;
    } else if (sec === 'gallery') {
      el.innerHTML = `<button class="cfg-btn cfg-btn-ghost" onclick="SnaraFiles.instance._triggerInput('files-img-input')"><i data-icon="upload"></i> Upload</button>`;
    } else {
      el.innerHTML = '';
    }
  }

  _triggerInput(id) { document.getElementById(id)?.click(); }

  // ── Dropzone & file input ─────────────────────

  _bindDropzones() {
    const wire = (id, type) => {
      const el = document.getElementById(id);
      if (!el) return;
      el.addEventListener('dragover',  e => { e.preventDefault(); el.classList.add('drag'); });
      el.addEventListener('dragleave', () => el.classList.remove('drag'));
      el.addEventListener('drop', e => {
        e.preventDefault();
        el.classList.remove('drag');
        this._uploadFiles(e.dataTransfer.files, type);
      });
    };
    wire('files-dropzone',   'import');
    wire('files-gallery-dz', 'gallery');
  }

_bindFileInputs() {
  const imp = document.getElementById('files-input');
  if (imp) {
    imp.addEventListener('change', e => {
      this._uploadFiles(e.target.files, 'import');
      e.target.value = '';
    });
  }

  const gal = document.getElementById('files-img-input');
  if (gal) {
    gal.addEventListener('change', e => {
      SnaraGallery.instance?.uploadFiles(e.target.files);
      e.target.value = '';
    });
  }
}

 

  // ── Upload dispatcher ─────────────────────────

async _uploadFiles(files, type) {
  if (type === 'gallery') {
    SnaraGallery.instance?.uploadFiles(files);
    return;
  }
  
    // Import
    const bookId = AppConfig.activeBookId;
    if (!bookId) { alert('No active book — open a book first.'); return; }

    for (const file of files) {
      const ext = file.name.split('.').pop().toLowerCase();
      if (!['txt', 'md'].includes(ext)) {
        alert(`"${file.name}" is not allowed here. Accepted: .txt, .md`);
        continue;
      }

      const fd = new FormData();
      fd.append('file', file);

      try {
        const res  = await fetch(
          `${AppConfig.apiPath}?action=import.upload&bookId=${bookId}`,
          { method: 'POST', body: fd }
        );
        const json = await res.json();
        if (!res.ok || json.error) throw new Error(json.error || `HTTP ${res.status}`);
      } catch (e) {
        alert(`Upload failed for "${file.name}": ${e.message}`);
      }
    }

    this._loadImpList();
  }

  // ── Import list ───────────────────────────────

  async _loadImpList() {
    const bookId = AppConfig.activeBookId;
    const ul     = document.getElementById('files-imp-list');
    if (!ul) return;

    if (!bookId) {
      ul.innerHTML = '<li class="flist-empty">No active book.</li>';
      return;
    }

    ul.innerHTML = '<li class="flist-empty" style="opacity:.5">Loading…</li>';

    try {
      const res   = await fetch(`${AppConfig.apiPath}?action=import.list&bookId=${bookId}`);
      const files = await res.json();

      if (!files.length) {
        ul.innerHTML = '<li class="flist-empty">No files yet — drop some above</li>';
        this._updateDeleteBar('import');
        return;
      }

      ul.innerHTML = files.map((f, i) => `
        <li id="fi-${i}" class="flist-item" data-filename="${_esc(f.filename)}">
          <i data-icon="${this._iconFor(f.ext)}"></i>
          <span class="fname">${_esc(f.filename)}</span>
          <span class="fbadge">${_fmtSize(f.size)}</span>
          <div class="ftools">
            <button class="ftool" title="Preview &amp; import"
              data-action="preview-import" data-filename="${_esc(f.filename)}">
              <i data-icon="eye"></i>
            </button>
            <button class="ftool erase-btn" title="Delete"
              data-action="delete-import" data-filename="${_esc(f.filename)}">
              <i data-icon="trash"></i>
            </button>
          </div>
        </li>`).join('');

      ul.addEventListener('click', this._impListClick.bind(this), { once: true });
      icx.delayreplace('#files-imp-list [data-icon]');

    } catch (e) {
      ul.innerHTML = `<li class="flist-empty" style="color:var(--danger)">Error: ${_esc(e.message)}</li>`;
    }
  }

  _impListClick(e) {
    const btn = e.target.closest('[data-action]');
    if (!btn) {
      document.getElementById('files-imp-list')
        ?.addEventListener('click', this._impListClick.bind(this), { once: true });
      return;
    }

    const { action, filename } = btn.dataset;
    if (action === 'preview-import') this._openPreview(filename);
    else if (action === 'delete-import') this._deleteImportFile(filename, btn.closest('li'));

    document.getElementById('files-imp-list')
      ?.addEventListener('click', this._impListClick.bind(this), { once: true });
  }

  _deleteImportFile(filename, li) {
    const bookId = AppConfig.activeBookId;
    if (!bookId) return;

    const btn = li.querySelector('[data-action="delete-import"]');

    if (!li.classList.contains('delete')) {
      li.classList.add('delete');
      if (btn) {
        btn.innerHTML = '<i data-icon="x"></i>';
        icx.delayreplace(`#${li.id} [data-action="delete-import"] [data-icon]`);
      }
      return;
    }

    if (li.querySelector('.del-confirm')) return;

    const confirm = document.createElement('div');
    confirm.className = 'del-confirm';
    confirm.style.cssText = `
      position:fixed;bottom:0;left:0;width:100%;z-index:999;
      display:flex;align-items:center;gap:8px;
      padding:10px 16px;font-size:12px;
      background:var(--bg-alt);border-top:1px solid var(--border);
      box-shadow:0 -2px 12px var(--overlay);
    `;
    confirm.innerHTML = `
      <span style="flex:1;color:var(--danger)">Delete "${_esc(filename)}"?</span>
      <button class="cfg-btn cfg-btn-ghost" style="padding:2px 8px;font-size:11px" data-action="del-no">No</button>
      <button class="cfg-btn" style="padding:2px 8px;font-size:11px;border-color:var(--danger);color:var(--danger)" data-action="del-yes">Yes, delete</button>
    `;
    document.body.appendChild(confirm);

    confirm.querySelector('[data-action="del-no"]').addEventListener('click', () => {
      li.classList.remove('delete');
      confirm.remove();
      if (btn) {
        btn.innerHTML = '<i data-icon="trash"></i>';
        icx.delayreplace(`#${li.id} [data-action="delete-import"] [data-icon]`);
      }
    });

    confirm.querySelector('[data-action="del-yes"]').addEventListener('click', async () => {
      confirm.innerHTML = `<span style="color:var(--fg-muted);font-size:11px;padding:2px 4px">Deleting…</span>`;
      try {
        const res  = await fetch(
          `${AppConfig.apiPath}?action=import.delete&bookId=${bookId}&filename=${encodeURIComponent(filename)}`,
          { method: 'DELETE' }
        );
        const json = await res.json();
        if (!res.ok || json.error) throw new Error(json.error || `HTTP ${res.status}`);
        confirm.remove();
        li.remove();
      } catch (e) {
        alert(`Delete failed: ${e.message}`);
        li.classList.remove('delete');
        confirm.remove();
        if (btn) {
          btn.innerHTML = '<i data-icon="trash"></i>';
          icx.delayreplace(`#${li.id} [data-action="delete-import"] [data-icon]`);
        }
      }
    });
  }

  // ── Cache list (stub) ─────────────────────────

  async _loadCacheList() {
    const ul = document.getElementById('files-cache-list');
    if (!ul) return;
    ul.innerHTML = '<li class="flist-empty" style="opacity:.5">No cached files</li>';
  }

  // ── Delete bar helpers ────────────────────────

  _updateDeleteBar(sec) {
    const barId = sec === 'import' ? 'files-delete-bar' : `files-delete-bar-${sec}`;
    const bar   = document.getElementById(barId);
    if (bar) bar.hidden = true;
  }

  rebuildCache() {
    const bookId = AppConfig.activeBookId;
    if (!bookId) { alert('No active book.'); return; }
    fetch(`${AppConfig.apiPath}?action=book.chapters&id=${bookId}`)
      .then(r => r.json())
      .then(() => alert('Cache rebuilt.'))
      .catch(e => alert(`Rebuild failed: ${e.message}`));
  }

  // ── Helpers ───────────────────────────────────

  _iconFor(ext) {
    if (['jpg','jpeg','png','gif','webp','svg','bmp'].includes(ext)) return 'photo';
    if (['mp4','webm','mov','ogg','m4v'].includes(ext))              return 'video';
    if (ext === 'md')   return 'markdown';
    if (ext === 'json') return 'checkup-list';
    return 'file-text';
  }
}

// ── Module-private helpers ────────────────────────
function _esc(str) {
  return String(str ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
}
function _fmtSize(bytes) {
  if (!bytes) return '';
  return bytes < 1024 ? bytes + ' B' : (bytes / 1024).toFixed(1) + ' KB';
}