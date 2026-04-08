/* ─────────────────────────────────────────────────
   snara/files.js — SnaraFiles
   Manages the Files area: Import, Export, Gallery, Cache.

   Sections map to:
     import  → data/$bookId/import
     export  → data/$bookId/export  (chapter list)
     gallery → data/$bookId/image
     cache   → data/$bookId/cache
─────────────────────────────────────────────────── */
import { AppConfig } from '../snara.js';
import icx           from '../icons/ge-icon.js';

export class SnaraFiles {

  static instance = null;

  constructor() {
    SnaraFiles.instance = this;

    this._state = {
      import:  [],   // { name, ext, size, imported, raw }
      gallery: [],   // { name, ext, size }
      cache:   [],   // { name, ext, size }
    };

    this._dragSrc = null;
    this._section = 'import';

    this._bindDropzones();
    this._bindFileInputs();
    this.switchSection('import');
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

    if (sec === 'export')  this._renderExport();
    if (sec === 'gallery') this._renderList('gallery');
    if (sec === 'cache')   this._renderList('cache');
    if (sec === 'import')  this._renderImpList();

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

  _triggerInput(id) {
    document.getElementById(id)?.click();
  }

  // ── Dropzone & file input binding ────────────

  _bindDropzones() {
    const wire = (id, type) => {
      const el = document.getElementById(id);
      if (!el) return;
      el.addEventListener('dragover',  e => { e.preventDefault(); el.classList.add('drag'); });
      el.addEventListener('dragleave', () => el.classList.remove('drag'));
      el.addEventListener('drop',      e => {
        e.preventDefault();
        el.classList.remove('drag');
        this._addFiles(e.dataTransfer.files, type);
      });
    };
    wire('files-dropzone',   'import');
    wire('files-gallery-dz', 'gallery');
  }

  _bindFileInputs() {
    const wire = (id, type) => {
      const el = document.getElementById(id);
      if (!el) return;
      el.addEventListener('change', e => {
        this._addFiles(e.target.files, type);
        e.target.value = '';
      });
    };
    wire('files-input',     'import');
    wire('files-img-input', 'gallery');
  }

  _addFiles(files, type) {
    [...files].forEach(file => {
      const x = this._ext(file.name);
      if (type === 'import') {
        if (!['txt', 'md'].includes(x)) {
          alert('Only .txt and .md files are accepted for import.');
          return;
        }
        this._state.import.push({ name: file.name, ext: x, size: this._fmt(file.size), imported: false, raw: file });
        this._renderImpList();
      } else if (type === 'gallery') {
        this._state.gallery.push({ name: file.name, ext: x, size: this._fmt(file.size) });
        this._renderList('gallery');
      }
    });
  }

  // ── Import list ───────────────────────────────

  _renderImpList() {
    const ul = document.getElementById('files-imp-list');
    if (!ul) return;

    if (!this._state.import.length) {
      ul.innerHTML = '<li class="flist-empty">No files yet — drop some above</li>';
      this._updateDeleteBar('import');
      return;
    }

    ul.innerHTML = this._state.import.map((f, i) => `
      <li id="fi-${i}" draggable="true" class="flist-item">
        <span class="fhandle"><i data-icon="grip-vertical"></i></span>
        <i data-icon="${this._iconFor(f.ext)}"></i>
        <span class="fname">${f.name}</span>
        <span class="fbadge">${f.ext.toUpperCase()}</span>
        <span class="fstatus ${f.imported ? 'fs-ok' : 'fs-ready'}">${f.imported ? 'imported' : 'ready'}</span>
        <div class="ftools">
          <button class="ftool" title="Convert &amp; import" data-action="import" data-idx="${i}"><i data-icon="download"></i></button>
          <button class="ftool erase-btn" id="fe-fi-${i}" title="Mark for deletion" data-action="erase" data-prefix="fi" data-idx="${i}" data-sec="import"><i data-icon="trash"></i></button>
        </div>
      </li>`).join('');

    this._bindListEvents(ul, 'import');
    this._updateDeleteBar('import');
    icx.delayreplace('#files-imp-list [data-icon]');
  }

  importFile(i) {
    const f = this._state.import[i];
    if (!f || f.imported) return;
    // TODO: read f.raw → SnaraStruct.split() → POST ?action=doc.save
    const bookId = AppConfig.activeBookId;
    alert(`Import "${f.name}"\n→ parse structure → POST to ${AppConfig.apiPath}?action=doc.save&book=${bookId}`);
    f.imported = true;
    this._renderImpList();
  }

  // ── Generic sortable list (gallery / cache) ───

  _renderList(sec) {
    const listIds = { gallery: 'files-gallery-list', cache: 'files-cache-list' };
    const ul = document.getElementById(listIds[sec]);
    if (!ul) return;

    const data = this._state[sec];
    if (!data.length) {
      ul.innerHTML = '<li class="flist-empty">No files in this folder</li>';
      return;
    }

    ul.innerHTML = data.map((f, i) => `
      <li id="${sec}-${i}" draggable="true" class="flist-item">
        <span class="fhandle"><i data-icon="grip-vertical"></i></span>
        <i data-icon="${this._iconFor(f.ext)}"></i>
        <span class="fname">${f.name}</span>
        <span class="fbadge">${f.size || f.ext}</span>
        <div class="ftools">
          ${sec === 'gallery' ? `<button class="ftool" title="Preview" data-action="preview" data-idx="${i}"><i data-icon="photo"></i></button>` : ''}
          <button class="ftool" title="Download" data-action="download" data-idx="${i}"><i data-icon="download"></i></button>
          <button class="ftool erase-btn" id="fe-${sec}-${i}" title="Mark for deletion" data-action="erase" data-prefix="${sec}" data-idx="${i}" data-sec="${sec}"><i data-icon="trash"></i></button>
        </div>
      </li>`).join('');

    this._bindListEvents(ul, sec);
    this._updateDeleteBar(sec);
    icx.delayreplace(`#${listIds[sec]} [data-icon]`);
  }

  // ── Export list ───────────────────────────────

  _renderExport() {
    const ul = document.getElementById('files-exp-list');
    if (!ul) return;

    const chapters = AppConfig._exportChapters || [];
    if (!chapters.length) {
      ul.innerHTML = `<li class="flist-empty">No chapters loaded.<br>Open a book first, or wire to ?action=book.chapters&id=${AppConfig.activeBookId || '...'}</li>`;
      return;
    }

    const grouped = {};
    chapters.forEach(ch => { (grouped[ch.act] = grouped[ch.act] || []).push(ch); });

    ul.innerHTML = Object.entries(grouped).map(([act, chs]) => `
      <li class="flist-act-hdr">${act}</li>
      ${chs.map(ch => `
        <li class="flist-item">
          <input type="checkbox" class="fexp-cb" value="${ch.filename}" style="accent-color:var(--primary);width:13px;height:13px;flex-shrink:0">
          <label style="flex:1;cursor:pointer;font-size:var(--f-xs)">${ch.title || ch.filename}</label>
          <span class="fbadge">${ch.entries ?? ''} entries</span>
        </li>`).join('')}
    `).join('');

    document.getElementById('files-exp-all').onchange = e => {
      ul.querySelectorAll('.fexp-cb').forEach(cb => cb.checked = e.target.checked);
    };
  }

  exportSelected(fmt) {
    const sel = [...document.querySelectorAll('.fexp-cb:checked')].map(c => c.value);
    if (!sel.length) { alert('Select at least one chapter.'); return; }
    // TODO: fetch each via ?action=doc.get&book=...&file=... then convert + download
    alert(`Export ${sel.length} chapter(s) as .${fmt}:\n${sel.join(', ')}`);
  }

  // ── Erase toggle ──────────────────────────────

  _toggleErase(prefix, i, sec) {
    const liId  = prefix === 'fi' ? `fi-${i}` : `${prefix}-${i}`;
    const btnId = `fe-${prefix}-${i}`;
    const li    = document.getElementById(liId);
    const btn   = document.getElementById(btnId);
    if (!li || !btn) return;

    const wasDelete = li.classList.contains('delete');
    li.classList.toggle('delete', !wasDelete);
    btn.innerHTML = wasDelete ? '<i data-icon="trash"></i>' : '<i data-icon="x"></i>';
    this._updateDeleteBar(sec);
    icx.delayreplace(`#${btnId} [data-icon]`);
  }

  _updateDeleteBar(sec) {
    const barId  = sec === 'import' ? 'files-delete-bar' : `files-delete-bar-${sec}`;
    const cntId  = sec === 'import' ? 'files-delete-count' : `files-delete-count-${sec}`;
    const selMap = {
      import:  '#files-imp-list li.delete',
      gallery: '#files-gallery-list li.delete',
      cache:   '#files-cache-list li.delete',
    };
    const bar   = document.getElementById(barId);
    const cntEl = document.getElementById(cntId);
    if (!bar) return;
    const n = document.querySelectorAll(selMap[sec] || '').length;
    bar.hidden = n === 0;
    if (cntEl) cntEl.textContent = `${n} file${n !== 1 ? 's' : ''} marked for deletion`;
  }

  clearDeletes(sec) {
    const selMap = {
      import:  '#files-imp-list li.delete',
      gallery: '#files-gallery-list li.delete',
      cache:   '#files-cache-list li.delete',
    };
    document.querySelectorAll(selMap[sec] || '').forEach(li => {
      li.classList.remove('delete');
      const btn = li.querySelector('.erase-btn');
      if (btn) { btn.innerHTML = '<i data-icon="trash"></i>'; icx.delayreplace(btn); }
    });
    this._updateDeleteBar(sec);
  }

  applyDeletes(sec) {
    const selMap = {
      import:  '#files-imp-list li.delete',
      gallery: '#files-gallery-list li.delete',
      cache:   '#files-cache-list li.delete',
    };
    const indices = [...document.querySelectorAll(selMap[sec] || '')]
      .map(li => parseInt(li.id.split('-').pop()))
      .sort((a, b) => b - a);
    indices.forEach(i => this._state[sec].splice(i, 1));
    if (sec === 'import') this._renderImpList();
    else this._renderList(sec);
  }

  rebuildCache() {
    const bookId = AppConfig.activeBookId;
    alert(`Rebuild cache for book "${bookId}"\n→ Hook to: ${AppConfig.apiPath}?action=book.chapters&id=${bookId}`);
  }

  // ── Drag-to-reorder ───────────────────────────

  _bindListEvents(ul, sec) {
    ul.querySelectorAll('li[draggable]').forEach((li, i) => {
      li.addEventListener('dragstart', () => { this._dragSrc = { i, sec }; li.style.opacity = '.4'; });
      li.addEventListener('dragend',   () => { li.style.opacity = ''; });
      li.addEventListener('dragover',  e => { e.preventDefault(); li.classList.add('drag-over'); });
      li.addEventListener('dragleave', () => li.classList.remove('drag-over'));
      li.addEventListener('drop', e => {
        e.preventDefault();
        li.classList.remove('drag-over');
        if (!this._dragSrc || this._dragSrc.sec !== sec || this._dragSrc.i === i) {
          this._dragSrc = null; return;
        }
        const arr   = this._state[sec];
        const moved = arr.splice(this._dragSrc.i, 1)[0];
        arr.splice(i, 0, moved);
        this._dragSrc = null;
        if (sec === 'import') this._renderImpList();
        else this._renderList(sec);
      });
    });

    ul.addEventListener('click', e => {
      const btn = e.target.closest('[data-action]');
      if (!btn) return;
      const { action, idx, prefix, sec: btnSec } = btn.dataset;
      const i = parseInt(idx);
      if (action === 'import')   this.importFile(i);
      if (action === 'erase')    this._toggleErase(prefix, i, btnSec);
      if (action === 'preview')  alert(`Preview: ${this._state[sec][i]?.name}`);
      if (action === 'download') alert(`Download: ${this._state[sec][i]?.name}`);
    });
  }

  // ── Helpers ───────────────────────────────────

  _ext(name)  { return (name.split('.').pop() || '').toLowerCase(); }
  _fmt(bytes) { return bytes < 1024 ? bytes + ' B' : (bytes / 1024).toFixed(1) + ' KB'; }

  _iconFor(ext) {
    if (['jpg','jpeg','png','gif','webp','svg','bmp'].includes(ext)) return 'photo';
    if (ext === 'txt')   return 'file-text';
    if (ext === 'md')   return 'markdown';
    if (ext === 'json') return 'checkup-list';
    return 'file-text';
  }
}