import { SnaraComponent }                 from './component.js';
import { AppConfig }                      from '../snara.js';
import { SnaraStruct }                    from './struct.js';
import { SnaraGallery }                   from './gallery.js';
import { SnaraFileMan }                   from './fileman.js';
import icx                                from '../icons/ge-icon.js';
import { openModal, _modalHeader, _modalFooter } from './modal.js';
import { esc, fmtDate, fmtSize, iconFor, listSetState, confirmDeleteBar, apiFetch, postJson } from '../helpers.js';

export class SnaraFiles extends SnaraComponent {
  constructor() {
    super('files-import-modal');
    this._dragSrc         = null;
    this._section         = 'import';
    this._switching       = false;
    this._initialized     = false;
    this._bookChangeBound = false;
  }

  _init() {
    this._switching       = false;
    this._initialized     = false;
    this._bookChangeBound = false;
    super._init();
    this._bindDropzones();
    this._bindFileInputs();
    this._bindBookChange();
    this.switchSection('import');
  }

  _ensureDOM() {
    if (document.getElementById('files-import-modal')) return;
    const modal = document.createElement('div');
    modal.className = 'app-modal';
    modal.id = 'files-import-modal';
    modal.setAttribute('hidden', '');
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    document.getElementById('app-overlay').appendChild(modal);
  }

  _bindBookChange() {
    if (this._bookChangeBound) return;
    this._bookChangeBound = true;
    window.addEventListener('bookchange', () => {
      if (this._switching) return;
      this._reloadSection();
    });
  }

  _reloadSection() {
    const sec = this._section;
    if (sec === 'import')  this._loadImpList();
    if (sec === 'export')  window.SnaraExport?.instance?.load();
    if (sec === 'gallery') SnaraGallery.instance?.load();
    if (sec === 'cache')   this._loadCacheList();
    if (sec === 'share')   SnaraFileMan.instance?.load();
  }

  switchSection(sec) {
    if (this._switching) return;
    if (this._section === sec && this._initialized) return;
    this._switching = true;
    this._section = sec;
    document.querySelectorAll('.fnav-item').forEach(b =>
      b.classList.toggle('active', b.dataset.section === sec)
    );
    document.querySelectorAll('.fpanel').forEach(p => {
      p.hidden = p.id !== `fpanel-${sec}`;
    });

    const titles = { import: 'Import', export: 'Export', gallery: 'Gallery', cache: 'Cache', share: 'Files' };
    const titleEl = document.getElementById('files-section-title');
    if (titleEl) titleEl.textContent = titles[sec] || sec;
    this._renderTopActions(sec);
    this._reloadSection();
    icx.delayreplace(`#fpanel-${sec} [data-icon]`);
    icx.delayreplace('#files-topbar-actions [data-icon]');

    this._initialized = true;
    this._switching   = false;
  }

  _renderTopActions(sec) {
    const el = document.getElementById('files-topbar-actions');
    if (!el) return;
    if (sec === 'import') {
      el.innerHTML = `<button class="btn-mini mute" onclick="SnaraFiles.instance._triggerInput('files-input')"><i data-icon="upload"></i> Upload</button>`;
    } else if (sec === 'gallery') {
      el.innerHTML = `<button class="btn-mini mute" onclick="SnaraFiles.instance._triggerInput('files-img-input')"><i data-icon="upload"></i> Upload</button>`;
    } else if (sec === 'share') {
      SnaraFileMan.instance?.renderTopActions();
      return; // SnaraFileMan owns the topbar for this section
    } else {
      el.innerHTML = '';
    }
  }

  _triggerInput(id) { document.getElementById(id)?.click(); }

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

  async _uploadFiles(files, type) {
    if (type === 'gallery') {
      SnaraGallery.instance?.uploadFiles(files);
      return;
    }

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
        await apiFetch(
          `${AppConfig.apiPath}?action=import.upload&bookId=${bookId}`,
          { method: 'POST', body: fd }
        );
      } catch (e) {
        alert(`Upload failed for "${file.name}": ${e.message}`);
      }
    }

    this._loadImpList();
  }

  async _loadImpList() {
    const bookId = AppConfig.activeBookId;
    const ul     = document.getElementById('files-imp-list');
    if (!ul) return;
    if (!bookId) {
      listSetState(ul, 'empty', 'No active book.');
      return;
    }

    listSetState(ul, 'loading', 'Loading…');

    try {
      const files = await apiFetch(`${AppConfig.apiPath}?action=import.list&bookId=${bookId}`);

      if (!files.length) {
        listSetState(ul, 'empty', 'No files yet — drop some above');
        this._updateDeleteBar('import');
        return;
      }

      ul.innerHTML = files.map((f, i) => `
        <li id="fi-${i}" class="flist-item" data-filename="${esc(f.filename)}">
          <i data-icon="${iconFor(f.ext)}"></i>
          <span class="fname">${esc(f.filename)}</span>
          <span class="fbadge">${fmtSize(f.size)}</span>
          <div class="ftools">
            <button class="ftool" title="Preview &amp; import"
              data-action="preview-import" data-filename="${esc(f.filename)}">
              <i data-icon="eye"></i>
            </button>
            <button class="ftool erase-btn" title="Delete"
              data-action="delete-import" data-filename="${esc(f.filename)}">
              <i data-icon="trash"></i>
            </button>
          </div>
        </li>`).join('');

      ul.addEventListener('click', this._impListClick.bind(this), { once: true });
      icx.delayreplace('#files-imp-list [data-icon]');
    } catch (e) {
      listSetState(ul, 'error', `Error: ${e.message}`);
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

  async _openPreview(filename) {
    const bookId = AppConfig.activeBookId;
    if (!bookId) { alert('No active book.'); return; }

    const modal = document.getElementById('files-import-modal');
    modal.innerHTML = `
      ${_modalHeader(`<i data-icon="file-text"></i> Preview — ${esc(filename)}`)}
      <div class="modal-body" style="display:flex;align-items:center;justify-content:center;padding:2rem">
        <span style="font-size:var(--f-xs);color:var(--fg-muted)">Parsing file…</span>
      </div>`;
    modal.querySelector('#modal-close').dataset.action = 'close';
    openModal('files-import-modal');
    icx.delayreplace('#files-import-modal [data-icon]');

    let text;
    try {
      const res = await fetch(
        `${AppConfig.apiPath}?action=import.read&bookId=${bookId}&filename=${encodeURIComponent(filename)}`
      );
      // Raw text response — cannot use apiFetch (which expects JSON)
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
      ${_modalHeader(`<i data-icon="file-text"></i> Preview — ${esc(filename)}`)}
      <div class="modal-body" style="padding:var(--s-md);overflow-y:auto;display:flex;flex-direction:column;gap:var(--s-sm)">
        <div class="cfg-row">
          <label class="cfg-label" style="flex-shrink:0">Save as</label>
          <input class="cfg-input" id="imp-filename" value="${esc(defaultFilename)}"
            placeholder="filename (no extension)" style="flex:1">
        </div>
        <div style="font-size:var(--f-xs);color:var(--fg-muted)">
          ${blocks.length} block${blocks.length !== 1 ? 's' : ''} detected — review before importing:
        </div>
        <div id="imp-preview-list" style="display:flex;flex-direction:column;gap:6px">
          ${blocks.map((b, bi) => `
            <div class="imp-block" style="border:1px solid var(--border);border-radius:6px;overflow:hidden">
              <div style="display:flex;align-items:center;gap:8px;padding:6px 10px;background:var(--bg-alt);border-bottom:1px solid var(--border)">
                <span class="fbadge imp-cls-badge" data-idx="${bi}" title="Click to cycle class" style="cursor:pointer">${esc(b.cls)}</span>
                <span style="font-size:11px;color:var(--fg-muted);flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">
                  ${esc(b.md.split('\n')[0].slice(0, 80))}
                </span>
                <label style="display:flex;align-items:center;gap:4px;font-size:11px;color:var(--fg-muted);cursor:pointer">
                  <input type="checkbox" class="imp-block-cb" data-idx="${bi}" checked
                    style="accent-color:var(--primary)"> include
                </label>
              </div>
              <pre style="margin:0;padding:8px 10px;font-size:11px;font-family:var(--font-mono);white-space:pre-wrap;color:var(--fg-muted);max-height:100px;overflow-y:auto;background:var(--bg-main)">${esc(b.md)}</pre>
            </div>`).join('')}
        </div>
      </div>
      ${_modalFooter(`
        <button class="btn-mini primary" id="imp-confirm-btn">
          <i data-icon="download"></i> Import
        </button>
      `)}`;

    modal.querySelector('#modal-close').dataset.action  = 'close';
    modal.querySelector('#modal-cancel').dataset.action = 'close';

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
      ${_modalHeader('Import error')}
      <div class="modal-body" style="padding:var(--s-lg);color:var(--danger);font-size:var(--f-xs)">${esc(msg)}</div>
      <div class="modal-footer">
        <button class="btn-mini mute" data-action="close">Close</button>
      </div>`;
    modal.querySelector('#modal-close').dataset.action = 'close';
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
      await postJson(AppConfig.apiPath + '?action=doc.save', { filename, bookId, meta: {}, article });
      this.close();
      try {
        await fetch(
          `${AppConfig.apiPath}?action=import.delete&bookId=${bookId}&filename=${encodeURIComponent(srcFilename)}`,
          { method: 'DELETE' }
        );
      } catch { }

      this._loadImpList();
      window.dispatchEvent(new CustomEvent('chapteradded', { detail: { bookId, filename } }));
    } catch (e) {
      btn.disabled  = false;
      btn.innerHTML = '<i data-icon="download"></i> Import';
      icx.delayreplace('#files-import-modal #imp-confirm-btn [data-icon]');
      const errEl = modal.querySelector('.imp-err');
      if (errEl) errEl.remove();
      btn.insertAdjacentHTML('beforebegin',
        `<span class="imp-err" style="color:var(--danger);font-size:11px">Error: ${esc(e.message)}</span>`);
    }
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

    const restoreBtn = () => {
      li.classList.remove('delete');
      if (btn) {
        btn.innerHTML = '<i data-icon="trash"></i>';
        icx.delayreplace(`#${li.id} [data-action="delete-import"] [data-icon]`);
      }
    };

    confirmDeleteBar(
      `Delete "${filename}"?`,
      async () => {
        await apiFetch(
          `${AppConfig.apiPath}?action=import.delete&bookId=${bookId}&filename=${encodeURIComponent(filename)}`,
          { method: 'DELETE' }
        );
        li.remove();
      },
      restoreBtn
    );
  }

  async _loadCacheList() {
    const bookId = AppConfig.activeBookId;
    const ul     = document.getElementById('files-cache-list');
    if (!ul) return;
    if (!bookId) {
      listSetState(ul, 'empty', 'No active book.');
      return;
    }

    listSetState(ul, 'loading', 'Loading cache files…');

    try {
      const data = await apiFetch(`${AppConfig.apiPath}?action=cache.list&bookId=${bookId}`);

      if (!Array.isArray(data)) {
        listSetState(ul, 'error', `API error: ${data?.error ?? 'unexpected response'}`);
        return;
      }

      if (!data.length) {
        listSetState(ul, 'empty', 'No cache files yet — try rebuilding.');
        return;
      }

      ul.innerHTML = data.map(f => {
        const staleWarning = f.stale
          ? `<span style="color:var(--danger);font-size:10px;font-family:monospace">stale</span>`
          : '';
        return `
          <li class="flist-item" style="flex-direction:column;align-items:flex-start;gap:4px;padding:var(--s-sm) var(--s-md)">
            <div style="display:flex;align-items:center;gap:8px;width:100%">
              <i data-icon="checkup-list"></i>
              <span class="fname" style="flex:1">
                <span style="font-size:10px;color:var(--fg-muted);font-family:monospace">cache/</span>${esc(f.name)}
              </span>
              ${staleWarning}
              <span class="fbadge">${fmtSize(f.size)}</span>
            </div>
            <div style="display:flex;gap:var(--s-lg);padding-left:22px;font-size:10px;font-family:monospace;color:var(--fg-muted)">
              <span title="Created">created ${fmtDate(f.ctime)}</span>
              <span title="Modified">modified ${fmtDate(f.mtime)}</span>
            </div>
          </li>`;
      }).join('');

      icx.delayreplace('#files-cache-list [data-icon]');

    } catch (e) {
      listSetState(ul, 'error', `Error: ${e.message}`);
    }
  }

  async rebuildCache() {
    const bookId = AppConfig.activeBookId;
    if (!bookId) { alert('No active book.'); return; }

    const btn    = document.querySelector('#fpanel-cache .fpanel-footer .btn-mini');
    const footer = document.querySelector('#fpanel-cache .fpanel-footer');
    if (!footer) return;

    const progressId = 'cache-rebuild-progress';
    let prog = document.getElementById(progressId);
    if (prog) prog.remove();

    prog = document.createElement('div');
    prog.id = progressId;
    prog.style.cssText = `
      padding: var(--s-sm) var(--s-md);
      font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
      font-size: 11px;
      display: flex;
      flex-direction: column;
      gap: 4px;
      border-top: 1px solid var(--border);
      margin-top: var(--s-xs);
    `;
    prog.innerHTML = `<span style="color:var(--fg-muted)">Rebuilding…</span>`;
    footer.after(prog);

    if (btn) { btn.disabled = true; btn.textContent = 'Rebuilding…'; }
    try {
      const json  = await postJson(`${AppConfig.apiPath}?action=cache.rebuild&bookId=${bookId}`, {});
      const steps = json.steps || [];

      prog.innerHTML = steps.map(s => {
        const icon   = s.status === 'ok' ? 'v' : 'x';
        const color  = s.status === 'ok' ? 'var(--fg-main)' : 'var(--danger)';
        const detail = s.count !== undefined
          ? ` - ${s.count} items`
          : s.error ? ` - ${s.error}` : '';
        return `
          <div style="display:flex;gap:8px;color:${color}">
            <span>${icon}</span>
            <span style="flex:1">${esc(s.step)}${esc(detail)}</span>
            <span style="color:var(--fg-muted)">${s.ms}ms</span>
          </div>`;
      }).join('');

      setTimeout(() => {
        prog.remove();
        this._loadCacheList();
      }, 3000);

    } catch (e) {
      prog.innerHTML = `<span style="color:var(--danger)">Rebuild failed: ${esc(e.message)}</span>`;
    } finally {
      if (btn) { btn.disabled = false; btn.innerHTML = '<i data-icon="refresh"></i> Rebuild cache'; }
      icx.delayreplace('#fpanel-cache .fpanel-footer [data-icon]');
    }
  }

  _updateDeleteBar(sec) {
    const barId = sec === 'import' ? 'files-delete-bar' : `files-delete-bar-${sec}`;
    const bar   = document.getElementById(barId);
    if (bar) bar.hidden = true;
  }
}