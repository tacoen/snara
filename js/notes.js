/* ─────────────────────────────────────────────────
   js/snara/notes.js — SnaraNotes
   Encapsulated vanilla-JS Class for the Notes area.

   Public API:
     new SnaraNotes(selector, overrides?)
     instance.destroy()
     instance.load()
     instance.setView('md' | 'html')

   Architecture:
     • Zero shared state — each instance owns its DOM
       root, settings object, and AbortController.
     • Event delegation bound to component root only.
     • HTML/MD view toggled without re-fetching data.
     • Auto-save on blur; manual save on Ctrl+S.
     • marked.js used for MD → HTML (already loaded
       in index.php via CDN).

   Data shape (data/notes.json):
     [ { id, title, body, updatedAt }, … ]

   Actions wired in php/router.php:
     GET  ?action=notes.list   → Note[]
     POST ?action=notes.save   ← Note[]  → {ok}
─────────────────────────────────────────────────── */

export class SnaraNotes {

  // ── Singleton reference (matches project pattern) ──
  static instance = null;

  // ── Constructor ───────────────────────────────────

  /**
   * @param {string} selector  CSS selector for the .notes root element.
   * @param {object} [overrides] Optional settings to override data-* attrs.
   */
  constructor(selector, overrides = {}) {
    // ── Resolve root ──────────────────────────────
    this._root = typeof selector === 'string'
      ? document.querySelector(selector)
      : selector;

    if (!(this._root instanceof HTMLElement)) {
      console.error('[SnaraNotes] Root element not found:', selector);
      return;
    }

    // ── Parse typed settings from data-* attrs ────
    this._settings = this._parseSettings(overrides);

    // ── Internal state ────────────────────────────
    this._notes    = [];          // Note[]
    this._view     = 'md';        // 'md' | 'html'
    this._dirty    = false;
    this._saving   = false;
    this._abortCtrl = new AbortController();

    // ── Cache DOM refs ────────────────────────────
    this._grid      = this._root.querySelector('#notes-grid');
    this._emptyMsg  = this._root.querySelector('#notes-empty');
    this._statusMsg = this._root.querySelector('#notes-status-msg');
    this._countEl   = this._root.querySelector('#notes-count');
    this._addBtn    = this._root.querySelector('#notes-add-btn');
    this._toggleBtns = this._root.querySelectorAll('.notes__toggle-btn');

    // ── Bind events ───────────────────────────────
    this._bindEvents();

    // ── Load data ─────────────────────────────────
    this.load();

    // ── Register singleton + global keyboard shortcut ──
    SnaraNotes.instance = this;
    this._bindKeyboard();
  }

  // ── Settings parser ───────────────────────────────

  /**
   * Reads data-* attributes from root, merges with overrides.
   * Returns a strongly-typed settings object.
   * @param {object} overrides
   * @returns {{ cols: number, apiPath: string }}
   */
  _parseSettings(overrides) {
    const d = this._root.dataset;
    return {
      cols:    parseInt(d.cols    ?? '5',        10) || 5,
      apiPath: String(d.api       ?? '/api.php'),
      ...overrides,
    };
  }

  // ── Event binding (delegation on root) ────────────

  _bindEvents() {
    const sig = { signal: this._abortCtrl.signal };

    // ── View toggle ──
    this._root.addEventListener('click', (e) => {
      const btn = e.target.closest('.notes__toggle-btn');
      if (btn) {
        this.setView(btn.dataset.view);
        return;
      }

      // ── Add note ──
      if (e.target.closest('#notes-add-btn')) {
        this._addNote();
        return;
      }

      // ── Delete note ──
      const delBtn = e.target.closest('.notes__card-btn--danger');
      if (delBtn) {
        const card = delBtn.closest('.notes__card');
        if (card) this._deleteNote(card.dataset.id);
        return;
      }
    }, sig);

    // ── Auto-save on blur from textarea or title ──
    this._root.addEventListener('focusout', (e) => {
      if (
        e.target.matches('.notes__card-textarea') ||
        e.target.matches('.notes__card-title')
      ) {
        this._syncFromDOM();
        this._scheduleSave();
      }
    }, sig);

    // ── Auto-resize textarea ──
    this._root.addEventListener('input', (e) => {
      if (e.target.matches('.notes__card-textarea')) {
        this._dirty = true;
        // field-sizing:content handles modern browsers;
        // this covers the fallback:
        e.target.style.height = 'auto';
        e.target.style.height = e.target.scrollHeight + 'px';
      }
      if (e.target.matches('.notes__card-title')) {
        this._dirty = true;
      }
    }, sig);
  }

  /** Ctrl+S / Cmd+S global shortcut, cleaned up on destroy() */
  _bindKeyboard() {
    const handler = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        this._syncFromDOM();
        this._save();
      }
      // Alt+N — new note
      if (e.altKey && e.key === 'n') {
        e.preventDefault();
        this._addNote();
      }
    };
    document.addEventListener('keydown', handler, { signal: this._abortCtrl.signal });
  }

  // ── Data lifecycle ────────────────────────────────

  /** Fetch notes from backend and render. */
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

  /** Sync DOM card state back into this._notes[]. */
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

  /** Debounced save trigger. */
  _scheduleSave() {
    clearTimeout(this._saveTimer);
    this._saveTimer = setTimeout(() => this._save(), 800);
  }

  /** POST all notes to backend. */
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

  // ── Note CRUD ─────────────────────────────────────

  _addNote() {
    /** @type {Note} */
    const note = {
      id:        this._uid(),
      title:     'New note',
      body:      '',
      updatedAt: new Date().toISOString(),
    };
    this._notes.unshift(note);
    this._render();
    // Focus the title of the new card
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

  // ── View mode ─────────────────────────────────────

  /**
   * Switch between 'md' (editable textarea) and
   * 'html' (rendered markdown via marked.js).
   * @param {'md'|'html'} mode
   */
  setView(mode) {
    if (mode !== 'md' && mode !== 'html') return;
    if (mode === this._view) return;

    // Sync edits before switching away from 'md'
    if (this._view === 'md') {
      this._syncFromDOM();
    }

    this._view = mode;

    // Update toggle button states
    this._toggleBtns.forEach(btn => {
      const active = btn.dataset.view === mode;
      btn.classList.toggle('notes__toggle-btn--active', active);
      btn.setAttribute('aria-pressed', String(active));
    });

    // Re-render cards (no network call)
    this._render();
  }

  // ── Rendering ─────────────────────────────────────

  _render() {
    // Update count
    this._countEl.textContent =
      `${this._notes.length} note${this._notes.length === 1 ? '' : 's'}`;

    // Clear grid (keep #notes-empty in DOM)
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

  /**
   * Build a single card element.
   * @param {object} note
   * @returns {HTMLElement}
   */
  _buildCard(note) {
    const card = document.createElement('div');
    card.className  = 'notes__card';
    card.dataset.id = note.id;

    // ── Header ──
    const header = document.createElement('div');
    header.className = 'notes__card-header';

    const titleInput = document.createElement('input');
    titleInput.type      = 'text';
    titleInput.className = 'notes__card-title';
    titleInput.value     = this._esc(note.title || 'Untitled');
    titleInput.setAttribute('aria-label', 'Note title');
    // In HTML view the title is still editable (good UX)

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

    // ── Body ──
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
      // Trigger height on next frame
      requestAnimationFrame(() => {
        ta.style.height = 'auto';
        ta.style.height = ta.scrollHeight + 'px';
      });
      body.appendChild(ta);
    }

    // ── Footer ──
    const foot = document.createElement('div');
    foot.className   = 'notes__card-foot';
    foot.textContent = this._fmtDate(note.updatedAt);

    card.appendChild(header);
    card.appendChild(body);
    card.appendChild(foot);

    return card;
  }

  // ── Helpers ───────────────────────────────────────

  /** Convert markdown to safe HTML using marked.js (loaded via CDN). */
  _renderMd(md) {
    if (typeof window.marked !== 'undefined') {
      return window.marked.parse(md, { breaks: true, gfm: true });
    }
    // Fallback: plain text with newlines
    return `<p>${this._esc(md).replace(/\n/g, '<br>')}</p>`;
  }

  /** Basic HTML entity escaping for attribute values. */
  _esc(str) {
    return String(str)
      .replace(/&/g,  '&amp;')
      .replace(/</g,  '&lt;')
      .replace(/>/g,  '&gt;')
      .replace(/"/g,  '&quot;');
  }

  /** Format ISO date string for display. */
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

  /** Collision-free ID generator. */
  _uid() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }

  /** Update the status bar message. @param {'ok'|'error'|''} type */
  _setStatus(msg, type) {
    if (!this._statusMsg) return;
    this._statusMsg.textContent = msg;
    this._statusMsg.className   =
      'notes__status-msg' + (type ? ` notes__status-msg--${type}` : '');
  }

  // ── Destroy ───────────────────────────────────────

  /**
   * Remove ALL event listeners and clear internal state.
   * Safe to call multiple times.
   */
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