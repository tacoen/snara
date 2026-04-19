import { esc, uid, debugLog } from './helpers.js';

export class SnaraNotes {
  static instance = null;
  constructor(selector, overrides = {}) {

    this._root = typeof selector === 'string'
      ? document.querySelector(selector)
      : selector;

    if (!(this._root instanceof HTMLElement)) {
      console.error('[SnaraNotes] Root element not found:', selector);
      return;
    }

    this._settings = this._parseSettings(overrides);

    this._notes    = [];
    this._view     = 'md';
    this._dirty    = false;
    this._saving   = false;
    this._abortCtrl = new AbortController();

    this._grid      = this._root.querySelector('#notes-grid');
    this._emptyMsg  = this._root.querySelector('#notes-empty');
    this._statusMsg = this._root.querySelector('#notes-status-msg');
    this._countEl   = this._root.querySelector('#notes-count');
    this._addBtn    = this._root.querySelector('#notes-add-btn');
    this._toggleBtns = this._root.querySelectorAll('.notes__toggle-btn');

    this._bindEvents();

    this.load();

    SnaraNotes.instance = this;
    this._bindKeyboard();
  }

  _parseSettings(overrides) {
    const d = this._root.dataset;
    return {
      cols:    parseInt(d.cols    ?? '5',        10) || 5,
      apiPath: String(d.api       ?? '/api.php'),
      ...overrides,
    };
  }

  _bindEvents() {
    const sig = { signal: this._abortCtrl.signal };

    this._root.addEventListener('click', (e) => {
      const btn = e.target.closest('.notes__toggle-btn');
      if (btn) {
        this.setView(btn.dataset.view);
        return;
      }

      if (e.target.closest('#notes-add-btn')) {
        this._addNote();
        return;
      }

      const delBtn = e.target.closest('.notes__card-btn--danger');
      if (delBtn) {
        const card = delBtn.closest('.notes__card');
        if (card) this._deleteNote(card.dataset.id);
        return;
      }
    }, sig);

    this._root.addEventListener('focusout', (e) => {
      if (
        e.target.matches('.notes__card-textarea') ||
        e.target.matches('.notes__card-title')
      ) {
        this._syncFromDOM();
        this._scheduleSave();
      }
    }, sig);

    this._root.addEventListener('input', (e) => {
      if (e.target.matches('.notes__card-textarea')) {
        this._dirty = true;
        e.target.style.height = 'auto';
        e.target.style.height = e.target.scrollHeight + 'px';
      }
      if (e.target.matches('.notes__card-title')) {
        this._dirty = true;
      }
    }, sig);
  }

  _bindKeyboard() {
    const handler = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        this._syncFromDOM();
        this._save();
      }

      if (e.altKey && e.key === 'n') {
        e.preventDefault();
        this._addNote();
      }
    };
    document.addEventListener('keydown', handler, { signal: this._abortCtrl.signal });
  }

  async load() {
    this._setStatus('Loading…', '');
    try {
      const res = await fetch(`${this._settings.apiPath}?action=notes.list`, {
        signal: this._abortCtrl.signal,
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      this._notes = Array.isArray(data) ? data : [];
    } catch (err) {
      if (err.name === 'AbortError') return;
      this._notes = [];
      this._setStatus('Failed to load notes', 'error');
    }
    this._render();
    this._setStatus('', '');
  }

  _syncFromDOM() {
    this._root.querySelectorAll('.notes__card').forEach(card => {
      const id    = card.dataset.id;
      const note  = this._notes.find(n => n.id === id);
      if (!note) return;
      const titleEl = card.querySelector('.notes__card-title');
      const bodyEl  = card.querySelector('.notes__card-textarea');
      if (titleEl) note.title = titleEl.value.trim() || 'Untitled';
      if (bodyEl)  note.body  = bodyEl.value;
      note.updatedAt = new Date().toISOString();
    });
  }

  _scheduleSave() {
    clearTimeout(this._saveTimer);
    this._saveTimer = setTimeout(() => this._save(), 800);
  }

  async _save() {
    if (this._saving) return;
    this._saving = true;
    this._setStatus('Saving…', '');
    try {
      const res = await fetch(`${this._settings.apiPath}?action=notes.save`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(this._notes),
        signal:  this._abortCtrl.signal,
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      this._dirty = false;
      this._setStatus('Saved ✓', 'ok');
      setTimeout(() => this._setStatus('', ''), 2000);
    } catch (err) {
      if (err.name === 'AbortError') return;
      this._setStatus('Save failed', 'error');
    } finally {
      this._saving = false;
    }
  }

  _addNote() {
    const note = {
      id:        uid(),
      title:     'New note',
      body:      '',
      updatedAt: new Date().toISOString(),
    };
    this._notes.unshift(note);
    this._render();

    const card = this._grid.querySelector(`.notes__card[data-id="${note.id}"]`);
    const titleInput = card?.querySelector('.notes__card-title');
    if (titleInput) {
      titleInput.focus();
      titleInput.select();
    }
    this._dirty = true;
    this._scheduleSave();
  }

  _deleteNote(id) {
    if (!id) return;
    const idx = this._notes.findIndex(n => n.id === id);
    if (idx === -1) return;
    this._notes.splice(idx, 1);
    this._render();
    this._dirty = true;
    this._scheduleSave();
  }

  setView(mode) {
    if (mode !== 'md' && mode !== 'html') return;
    if (mode === this._view) return;
    if (this._view === 'md') {
      this._syncFromDOM();
    }

    this._view = mode;

    this._toggleBtns.forEach(btn => {
      const active = btn.dataset.view === mode;
      btn.classList.toggle('notes__toggle-btn--active', active);
      btn.setAttribute('aria-pressed', String(active));
    });

    this._render();
  }

  _render() {
    this._countEl.textContent =
      `${this._notes.length} note${this._notes.length === 1 ? '' : 's'}`;

    this._grid.querySelectorAll('.notes__card').forEach(c => c.remove());

    if (this._notes.length === 0) {
      this._emptyMsg.hidden = false;
      return;
    }
    this._emptyMsg.hidden = true;

    this._notes.forEach(note => {
      this._grid.appendChild(this._buildCard(note));
    });
  }

  _buildCard(note) {
    const card = document.createElement('div');
    card.className  = 'notes__card';
    card.dataset.id = note.id;
    const header = document.createElement('div');
    header.className = 'notes__card-header';
    const titleInput = document.createElement('input');
    titleInput.type      = 'text';
    titleInput.className = 'notes__card-title';
    titleInput.value     = esc(note.title || 'Untitled');
    titleInput.setAttribute('aria-label', 'Note title');
    const actions = document.createElement('div');
    actions.className = 'notes__card-actions';
    const delBtn = document.createElement('button');
    delBtn.className = 'notes__card-btn notes__card-btn--danger';
    delBtn.title     = 'Delete note';
    delBtn.setAttribute('aria-label', 'Delete note');
    delBtn.textContent = '×';
    actions.appendChild(delBtn);
    header.appendChild(titleInput);
    header.appendChild(actions);
    const body = document.createElement('div');
    body.className = 'notes__card-body';
    if (this._view === 'html') {
      const preview = document.createElement('div');
      preview.className = 'notes__card-preview';
      preview.innerHTML = this._renderMd(note.body || '');
      body.appendChild(preview);
    } else {
      const ta = document.createElement('textarea');
      ta.className = 'notes__card-textarea';
      ta.value     = note.body || '';
      ta.setAttribute('placeholder', 'Write in Markdown…');
      ta.setAttribute('aria-label', 'Note body');

      requestAnimationFrame(() => {
        ta.style.height = 'auto';
        ta.style.height = ta.scrollHeight + 'px';
      });
      body.appendChild(ta);
    }

    const foot = document.createElement('div');
    foot.className   = 'notes__card-foot';
    foot.textContent = this._fmtDate(note.updatedAt);

    card.appendChild(header);
    card.appendChild(body);
    card.appendChild(foot);

    return card;
  }

  _renderMd(md) {
    if (typeof window.marked !== 'undefined') {
      return window.marked.parse(md, { breaks: true, gfm: true });
    }

    return `<p>${esc(md).replace(/\n/g, '<br>')}</p>`;
  }

  // ISO date string formatter — intentionally distinct from helpers.fmtDate
  // which takes a Unix timestamp. This takes an ISO string from note.updatedAt.
  _fmtDate(iso) {
    if (!iso) return '';
    try {
      return new Date(iso).toLocaleString(undefined, {
        month: 'short', day: 'numeric',
        hour:  '2-digit', minute: '2-digit',
      });
    } catch {
      return '';
    }
  }

  _setStatus(msg, type) {
    if (!this._statusMsg) return;
    this._statusMsg.textContent = msg;
    this._statusMsg.className   =
      'notes__status-msg' + (type ? ` notes__status-msg--${type}` : '');
  }

  destroy() {
    clearTimeout(this._saveTimer);
    this._abortCtrl.abort();
    this._notes    = [];
    this._root     = null;
    this._grid     = null;
    this._settings = {};
    if (SnaraNotes.instance === this) SnaraNotes.instance = null;
  }
}
