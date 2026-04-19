import { AppConfig }                          from '../snara.js';
import icx                                    from '../icons/ge-icon.js';
import { esc, fmtDate, fmtSize, iconFor,
         listSetState, confirmDeleteBar,
         apiFetch, postJson }                 from '../helpers.js';

const TAG          = '[SnaraFileMan]';
const EDITABLE_EXT   = ['txt', 'md'];
const PREVIEW_IMAGE  = ['jpg','jpeg','png','gif','webp','svg','bmp'];
const PREVIEW_VIDEO  = ['mp4','webm','mov','ogg','m4v'];
const PREVIEW_PDF    = ['pdf'];

function previewType(ext) {
  if (PREVIEW_IMAGE.includes(ext)) return 'image';
  if (PREVIEW_VIDEO.includes(ext)) return 'video';
  if (PREVIEW_PDF.includes(ext))   return 'pdf';
  return null;
}

export class SnaraFileMan {
  static instance = null;

  constructor() {
    SnaraFileMan.instance = this;
    this._bookId    = null;
    this._files     = [];
    this._textOnly  = false;
    this._editFile  = null;
    this._saveTimer = null;
    this._dirty     = false;

    // DOM refs resolved after DOMContentLoaded — panel is injected by the
    // template and may not exist at module evaluation time.
    this._panel    = null;
    this._list     = null;
    this._dz       = null;
    this._input    = null;
    this._editor   = null;
    this._textarea = null;
    this._preview  = null;
    this._status   = null;
    this._edFname  = null;

    const init = () => {
      this._panel    = document.getElementById('fpanel-share');
      this._list     = document.getElementById('fm-list');
      this._dz       = document.getElementById('fm-dropzone');
      this._input    = document.getElementById('fm-input');
      this._editor   = document.getElementById('fm-editor');
      this._textarea = document.getElementById('fm-textarea');
      this._preview  = document.getElementById('fm-preview');
      this._status   = document.getElementById('fm-editor-status');
      this._edFname  = document.getElementById('fm-editor-filename');

      if (!this._panel) {
        console.warn(`${TAG} #fpanel-share not found in DOM — skipping init.`);
        return;
      }

      this._bindStatic();
      this._bindBookChange();
    };

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', init, { once: true });
    } else {
      init();
    }
  }

  // ── Public API ──────────────────────────────────

  async load(bookId) {
    this._bookId = bookId || AppConfig.activeBookId;
    if (!this._bookId) {
      listSetState(this._list, 'empty', 'No active book — open a book first.');
      return;
    }
    this._showList();
    await this._fetchList();
  }

  // ── Event binding ───────────────────────────────

  _bindStatic() {
    // Dropzone drag events
    if (this._dz) {
      this._dz.addEventListener('dragover',  e => { e.preventDefault(); this._dz.classList.add('drag'); });
      this._dz.addEventListener('dragleave', () => this._dz.classList.remove('drag'));
      this._dz.addEventListener('drop', e => {
        e.preventDefault();
        this._dz.classList.remove('drag');
        this._uploadFiles(e.dataTransfer.files);
      });
      this._dz.addEventListener('click', () => this._input?.click());
    }

    // Hidden file input
    if (this._input) {
      this._input.addEventListener('change', e => {
        this._uploadFiles(e.target.files);
        e.target.value = '';
      });
    }

    // Editor: Ctrl+S saves
    if (this._textarea) {
      this._textarea.addEventListener('keydown', e => {
        if ((e.ctrlKey || e.metaKey) && e.key === 's') {
          e.preventDefault();
          this._saveEdit();
        }
      });
      this._textarea.addEventListener('input', () => {
        this._dirty = true;
        this._setStatus('');
      });
    }
  }

  _bindBookChange() {
    window.addEventListener('bookchange', e => {
      this._editFile = null;
      this._dirty    = false;
      this.load(e.detail.bookId);
    });
  }

  // ── Top-bar actions (called by files.js) ────────

  // Renders the upload + text-filter toggle into #files-topbar-actions.
  // Called by SnaraFiles._renderTopActions when sec === 'share'.
  renderTopActions() {
    const el = document.getElementById('files-topbar-actions');
    if (!el) return;
    el.innerHTML = `
      <label class="fcheck-row" title="Accept text and markdown only">
        <input type="checkbox" id="fm-text-only"
          style="accent-color:var(--primary);width:13px;height:13px;cursor:pointer"
          ${this._textOnly ? 'checked' : ''}>
        <span style="font-size:var(--f-xs);color:var(--fg-muted)">Text only</span>
      </label>
      <button class="btn-mini mute" id="fm-upload-btn">
        <i data-icon="upload"></i> Upload
      </button>
    `;
    el.querySelector('#fm-upload-btn').addEventListener('click', () => this._input?.click());
    el.querySelector('#fm-text-only').addEventListener('change', e => {
      this._textOnly = e.target.checked;
      this._input.accept = this._textOnly ? '.txt,.md' : '*';
    });
    icx.delayreplace('#files-topbar-actions [data-icon]');
  }

  // ── List view ───────────────────────────────────

  async _fetchList() {
    if (!this._list) return;
    listSetState(this._list, 'loading', 'Loading files…');
    try {
      const data       = await apiFetch(`${AppConfig.apiPath}?action=fileman.list&bookId=${encodeURIComponent(this._bookId)}`);
      this._files      = Array.isArray(data.files) ? data.files : [];
      this._renderList();
    } catch (e) {
      listSetState(this._list, 'error', `Error: ${e.message}`);
    }
  }

  _renderList() {
    if (!this._list) return;
    if (!this._files.length) {
      listSetState(this._list, 'empty', 'No files yet — drop some above.');
      return;
    }

    this._list.innerHTML = '';
    this._files.forEach(f => {
      this._list.appendChild(this._buildRow(f));
    });
    icx.delayreplace('#fm-list [data-icon]');
  }

  _buildRow(f) {
    const ext      = (f.filename.split('.').pop() || '').toLowerCase();
    const editable = EDITABLE_EXT.includes(ext);
    const preview  = previewType(ext);
    const dlUrl    = `${AppConfig.dataPath}/${this._bookId}/files/${encodeURIComponent(f.filename)}`;

    const li = document.createElement('li');
    li.className        = 'flist-item';
    li.dataset.filename = f.filename;

    li.innerHTML = `
      <i data-icon="${iconFor(ext)}" style="flex-shrink:0;opacity:.6"></i>
      <span class="fname" title="${esc(f.filename)}">${esc(f.filename)}</span>
      <span class="fbadge">${fmtSize(f.size)}</span>
      <span class="fbadge text-mono" style="opacity:.6">${fmtDate(f.mtime)}</span>
      <div class="ftools">
        ${preview ? `
        <button class="ftool fm-preview-btn" title="Preview" data-filename="${esc(f.filename)}">
          <i data-icon="eye"></i>
        </button>` : ''}
        ${editable ? `
        <button class="ftool fm-edit-btn" title="Edit" data-filename="${esc(f.filename)}">
          <i data-icon="pencil"></i>
        </button>` : ''}
        <a class="ftool" href="${esc(dlUrl)}" download="${esc(f.filename)}"
          title="Download" style="text-decoration:none">
          <i data-icon="download"></i>
        </a>
        <button class="ftool fm-rename-btn" title="Rename" data-filename="${esc(f.filename)}">
          <i data-icon="pencil"></i>
        </button>
        <button class="ftool erase-btn fm-delete-btn" title="Delete" data-filename="${esc(f.filename)}">
          <i data-icon="trash"></i>
        </button>
      </div>
    `;

    li.querySelector('.fm-preview-btn')?.addEventListener('click', e => {
      e.stopPropagation();
      this._openPreview(f.filename, preview, dlUrl);
    });

    li.querySelector('.fm-delete-btn')?.addEventListener('click', e => {
      e.stopPropagation();
      this._deleteFile(f.filename, li);
    });

    li.querySelector('.fm-rename-btn')?.addEventListener('click', e => {
      e.stopPropagation();
      this._openRename(li, f.filename);
    });

    li.querySelector('.fm-edit-btn')?.addEventListener('click', e => {
      e.stopPropagation();
      this._openEditor(f.filename);
    });

    return li;
  }

  // ── Preview modal ────────────────────────────────
  // type: 'image' | 'video' | 'pdf'
  // Builds a lightweight overlay directly on body — independent of app-overlay.

  _openPreview(filename, type, url) {
    // Remove any existing preview
    document.getElementById('fm-preview-overlay')?.remove();

    const overlay = document.createElement('div');
    overlay.id = 'fm-preview-overlay';
    overlay.style.cssText = [
      'position:fixed', 'inset:0', 'z-index:9000',
      'display:flex', 'flex-direction:column',
      'align-items:center', 'justify-content:center',
      'background:rgba(0,0,0,.82)',
      'padding:var(--s-lg)',
    ].join(';');

    // ── Toolbar ──────────────────────────────────
    const toolbar = document.createElement('div');
    toolbar.style.cssText = [
      'display:flex', 'align-items:center', 'gap:var(--s-sm)',
      'width:100%', 'max-width:960px',
      'padding-bottom:var(--s-sm)',
      'flex-shrink:0',
    ].join(';');

    const fnameLabel = document.createElement('span');
    fnameLabel.textContent = filename;
    fnameLabel.style.cssText = [
      'flex:1', 'font-family:var(--font-mono)', 'font-size:var(--f-xs)',
      'color:rgba(255,255,255,.7)', 'overflow:hidden',
      'text-overflow:ellipsis', 'white-space:nowrap',
    ].join(';');

    const dlBtn = document.createElement('a');
    dlBtn.href      = url;
    dlBtn.download  = filename;
    dlBtn.textContent = 'Download';
    dlBtn.style.cssText = [
      'font-family:var(--font-mono)', 'font-size:var(--f-xs)',
      'color:rgba(255,255,255,.6)', 'text-decoration:none',
      'padding:2px var(--s-sm)',
      'border:1px solid rgba(255,255,255,.2)', 'border-radius:4px',
      'transition:color .12s,border-color .12s',
    ].join(';');
    dlBtn.addEventListener('mouseenter', () => { dlBtn.style.color = '#fff'; dlBtn.style.borderColor = 'rgba(255,255,255,.5)'; });
    dlBtn.addEventListener('mouseleave', () => { dlBtn.style.color = 'rgba(255,255,255,.6)'; dlBtn.style.borderColor = 'rgba(255,255,255,.2)'; });

    const closeBtn = document.createElement('button');
    closeBtn.textContent = 'x';
    closeBtn.setAttribute('aria-label', 'Close preview');
    closeBtn.style.cssText = [
      'background:none', 'border:none', 'cursor:pointer',
      'color:rgba(255,255,255,.6)', 'font-size:1.2rem',
      'line-height:1', 'padding:2px var(--s-xs)',
      'transition:color .12s',
    ].join(';');
    closeBtn.addEventListener('mouseenter', () => closeBtn.style.color = '#fff');
    closeBtn.addEventListener('mouseleave', () => closeBtn.style.color = 'rgba(255,255,255,.6)');

    toolbar.appendChild(fnameLabel);
    toolbar.appendChild(dlBtn);
    toolbar.appendChild(closeBtn);

    // ── Content ───────────────────────────────────
    const wrap = document.createElement('div');
    wrap.style.cssText = [
      'flex:1', 'display:flex', 'align-items:center', 'justify-content:center',
      'width:100%', 'max-width:960px', 'min-height:0', 'overflow:hidden',
    ].join(';');

    if (type === 'image') {
      const img = document.createElement('img');
      img.src = url;
      img.alt = filename;
      img.style.cssText = 'max-width:100%;max-height:100%;object-fit:contain;border-radius:4px';
      wrap.appendChild(img);

    } else if (type === 'video') {
      const vid = document.createElement('video');
      vid.src      = url;
      vid.controls = true;
      vid.autoplay = true;
      vid.style.cssText = 'max-width:100%;max-height:100%;border-radius:4px';
      wrap.appendChild(vid);

    } else if (type === 'pdf') {
      const frame = document.createElement('iframe');
      frame.src    = url;
      frame.title  = filename;
      frame.style.cssText = [
        'width:100%', 'height:100%', 'min-height:70dvh',
        'border:none', 'border-radius:4px', 'background:#fff',
      ].join(';');
      wrap.appendChild(frame);
    }

    overlay.appendChild(toolbar);
    overlay.appendChild(wrap);
    document.body.appendChild(overlay);

    // ── Close handlers ────────────────────────────
    const close = () => overlay.remove();

    closeBtn.addEventListener('click', close);

    // Backdrop click (not on content)
    overlay.addEventListener('click', e => {
      if (e.target === overlay) close();
    });

    // Escape key — scoped to this overlay
    const onKey = e => {
      if (e.key === 'Escape') { close(); document.removeEventListener('keydown', onKey); }
    };
    document.addEventListener('keydown', onKey);

    // Clean up key listener when overlay is removed externally
    overlay.addEventListener('remove', () => document.removeEventListener('keydown', onKey));
  }

  // ── Upload ──────────────────────────────────────

  async _uploadFiles(files) {
    if (!this._bookId) { alert('No active book.'); return; }

    const list  = Array.from(files);
    const total = list.length;
    if (!total) return;

    // ── Progress bar ──────────────────────────────
    const bar = document.createElement('div');
    bar.style.cssText = [
      'position:fixed', 'bottom:0', 'left:0', 'width:100%', 'z-index:999',
      'display:flex', 'flex-direction:column', 'gap:4px',
      'padding:10px 16px 12px',
      'background:var(--bg-alt)', 'border-top:1px solid var(--border)',
      'box-shadow:0 -2px 12px var(--shadow)',
    ].join(';');

    const label = document.createElement('span');
    label.style.cssText = 'font-family:var(--font-mono);font-size:var(--f-xs);color:var(--fg-muted)';

    const track = document.createElement('div');
    track.style.cssText = 'height:3px;background:var(--border);border-radius:9999px;overflow:hidden';

    const fill = document.createElement('div');
    fill.style.cssText = 'height:100%;width:0%;background:var(--primary);border-radius:9999px;transition:width .2s ease';

    track.appendChild(fill);
    bar.appendChild(label);
    bar.appendChild(track);
    document.body.appendChild(bar);

    const setProgress = (n, filename, done = false) => {
      const pct = Math.round((n / total) * 100);
      fill.style.width  = pct + '%';
      label.textContent = done
        ? `Done — ${total} file${total === 1 ? '' : 's'} uploaded`
        : `Uploading ${n} / ${total} — ${filename}`;
      label.style.color = done ? 'var(--fg-main)' : 'var(--fg-muted)';
    };

    // ── Upload loop ───────────────────────────────
    const errors = [];
    let completed = 0;

    for (const file of list) {
      if (this._textOnly) {
        const ext = file.name.split('.').pop().toLowerCase();
        if (!EDITABLE_EXT.includes(ext)) {
          errors.push(`"${file.name}" skipped — text-only mode is on.`);
          completed++;
          setProgress(completed, file.name);
          continue;
        }
      }

      setProgress(completed, file.name);

      const fd = new FormData();
      fd.append('file', file);

      try {
        const json = await apiFetch(
          `${AppConfig.apiPath}?action=fileman.upload&bookId=${encodeURIComponent(this._bookId)}`,
          { method: 'POST', body: fd }
        );
        const existing = this._files.findIndex(f => f.filename === json.file.filename);
        if (existing !== -1) this._files.splice(existing, 1);
        this._files.unshift(json.file);
      } catch (e) {
        errors.push(`"${file.name}": ${e.message}`);
      }

      completed++;
      setProgress(completed, file.name);
    }

    // ── Done ──────────────────────────────────────
    this._renderList();
    setProgress(total, '', true);
    setTimeout(() => bar.remove(), 2000);

    if (errors.length) {
      setTimeout(() => alert('Some files had issues:\n\n' + errors.join('\n')), 100);
    }
  }

  // ── Delete ──────────────────────────────────────

  _deleteFile(filename, li) {
    confirmDeleteBar(
      `Delete "${filename}"?`,
      async () => {
        await apiFetch(
          `${AppConfig.apiPath}?action=fileman.delete&bookId=${encodeURIComponent(this._bookId)}&filename=${encodeURIComponent(filename)}`,
          { method: 'DELETE' }
        );
        this._files = this._files.filter(f => f.filename !== filename);
        li.remove();
        if (!this._files.length) {
          listSetState(this._list, 'empty', 'No files yet — drop some above.');
        }
      }
    );
  }

  // ── Rename ──────────────────────────────────────

  _openRename(li, filename) {
    // Close any other open rename boxes first
    document.querySelectorAll('.fm-rename-box').forEach(b => b.remove());

    const dotIdx   = filename.lastIndexOf('.');
    const basename = dotIdx > 0 ? filename.slice(0, dotIdx) : filename;
    const ext      = dotIdx > 0 ? filename.slice(dotIdx) : '';

    const fnameEl = li.querySelector('.fname');
    const toolsEl = li.querySelector('.ftools');
    if (!fnameEl || !toolsEl) return;

    // Hide original name and tools
    fnameEl.hidden = true;
    toolsEl.hidden = true;

    const box = document.createElement('div');
    box.className = 'fm-rename-box';
    box.innerHTML = `
      <input class="fm-rename-input" value="${esc(basename)}" spellcheck="false" autocomplete="off">
      ${ext ? `<span class="fm-rename-ext">${esc(ext)}</span>` : ''}
      <button class="btn-mini mute" style="padding:2px 8px;font-size:11px" data-action="cancel">Cancel</button>
      <button class="btn-mini primary" style="padding:2px 8px;font-size:11px" data-action="ok">Rename</button>
    `;
    // Insert between icon and hidden fname
    li.insertBefore(box, fnameEl);

    const input = box.querySelector('.fm-rename-input');
    input.focus();
    input.select();

    const restore = () => {
      box.remove();
      fnameEl.hidden = false;
      toolsEl.hidden = false;
    };

    const doRename = async () => {
      const newBase = input.value.trim();
      if (!newBase || newBase + ext === filename) { restore(); return; }

      const okBtn = box.querySelector('[data-action="ok"]');
      okBtn.disabled    = true;
      okBtn.textContent = '…';

      try {
        const json = await postJson(
          `${AppConfig.apiPath}?action=fileman.rename&bookId=${encodeURIComponent(this._bookId)}`,
          { from: filename, to: newBase }
        );
        const newFilename = json.filename;
        // Update local state
        const rec = this._files.find(f => f.filename === filename);
        if (rec) rec.filename = newFilename;
        li.dataset.filename = newFilename;
        fnameEl.textContent = newFilename;
        fnameEl.title       = newFilename;
        // Update data attributes on buttons
        li.querySelectorAll('[data-filename]').forEach(el => el.dataset.filename = newFilename);
        restore();
      } catch (e) {
        okBtn.disabled    = false;
        okBtn.textContent = 'Rename';
        input.style.borderColor = 'var(--danger)';
        input.title = e.message;
      }
    };

    box.querySelector('[data-action="cancel"]').addEventListener('click', restore);
    box.querySelector('[data-action="ok"]').addEventListener('click', doRename);
    input.addEventListener('keydown', e => {
      if (e.key === 'Enter')  { e.preventDefault(); doRename(); }
      if (e.key === 'Escape') restore();
    });
  }

  // ── Editor ──────────────────────────────────────

  async _openEditor(filename) {
    if (!this._editor || !this._textarea) return;

    // Warn if unsaved changes from a previous edit
    if (this._dirty && this._editFile) {
      if (!confirm(`Discard unsaved changes to "${this._editFile.filename}"?`)) return;
    }

    this._editFile = { filename };
    this._dirty    = false;
    this._setStatus('');

    // Show editor, hide list
    this._showEditor(filename);

    // Load content
    const url = `${AppConfig.dataPath}/${this._bookId}/files/${encodeURIComponent(filename)}`;
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const text = await res.text();
      this._textarea.value = text;
      this._textarea.focus();
    } catch (e) {
      this._setStatus('Load failed', 'error');
      this._textarea.value = '';
    }

    const ext = (filename.split('.').pop() || '').toLowerCase();
    this._updatePreviewToggle(ext === 'md');
  }

  async _saveEdit() {
    if (!this._editFile || !this._bookId) return;
    this._setStatus('Saving…');
    try {
      await postJson(`${AppConfig.apiPath}?action=fileman.save`, {
        bookId:   this._bookId,
        filename: this._editFile.filename,
        content:  this._textarea.value,
      });
      this._dirty = false;
      this._setStatus('Saved', 'ok');
      setTimeout(() => this._setStatus(''), 2000);
    } catch (e) {
      this._setStatus('Save failed', 'error');
    }
  }

  _updatePreviewToggle(isMarkdown) {
    const bar = this._editor?.querySelector('.fm-editor-bar');
    if (!bar) return;

    // Remove any existing preview toggle
    bar.querySelector('.fm-preview-toggle')?.remove();

    if (!isMarkdown) return;

    const toggle = document.createElement('button');
    toggle.className   = 'btn-mini mute fm-preview-toggle';
    toggle.textContent = 'Preview';
    toggle.addEventListener('click', () => {
      const showingPreview = !this._preview.hidden;
      if (showingPreview) {
        // Back to edit
        this._preview.hidden  = true;
        this._textarea.hidden = false;
        toggle.textContent    = 'Preview';
      } else {
        // Show preview
        const md = this._textarea.value;
        this._preview.innerHTML = typeof window.marked !== 'undefined'
          ? window.marked.parse(md, { breaks: true, gfm: true })
          : `<pre>${esc(md)}</pre>`;
        this._preview.hidden  = false;
        this._textarea.hidden = true;
        toggle.textContent    = 'Edit';
      }
    });

    // Insert before Save button
    const saveBtn = bar.querySelector('.fm-save-btn');
    if (saveBtn) bar.insertBefore(toggle, saveBtn);
    else         bar.appendChild(toggle);
  }

  // ── View switching ──────────────────────────────

  _showList() {
    if (this._editor)  this._editor.hidden = true;
    if (this._dz)      this._dz.hidden     = false;
    if (this._list)    this._list.hidden   = false;
    this._editFile = null;
    this._dirty    = false;
  }

  _showEditor(filename) {
    if (this._dz)   this._dz.hidden   = true;
    if (this._list) this._list.hidden = true;
    if (this._editor) {
      this._editor.hidden   = false;
      // Reset preview to edit mode
      this._textarea.hidden = false;
      if (this._preview) this._preview.hidden = true;
      // Update filename label
      if (this._edFname) this._edFname.textContent = filename;
    }
    // Re-render topbar with Back button
    this._renderEditorTopActions(filename);
  }

  _renderEditorTopActions(filename) {
    const el = document.getElementById('files-topbar-actions');
    if (!el) return;
    el.innerHTML = `
      <button class="btn-mini mute fm-back-btn">
        <i data-icon="arrow-left"></i> Back
      </button>
      <button class="btn-mini mute fm-save-btn">
        <i data-icon="device-floppy"></i> Save
      </button>
    `;
    el.querySelector('.fm-back-btn').addEventListener('click', () => {
      if (this._dirty && !confirm('Discard unsaved changes?')) return;
      this._showList();
      this.renderTopActions();
      this._fetchList();
    });
    el.querySelector('.fm-save-btn').addEventListener('click', () => this._saveEdit());
    icx.delayreplace('#files-topbar-actions [data-icon]');
  }

  // ── Helpers ─────────────────────────────────────

  _setStatus(msg, type = '') {
    if (!this._status) return;
    this._status.textContent = msg;
    this._status.className   = 'fm-editor-status' + (type ? ` ${type}` : '');
  }
}