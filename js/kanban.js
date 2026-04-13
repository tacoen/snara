/* ─────────────────────────────────────────────────
   js/snara/kanban.js — SnaraKanban

   A fully encapsulated Kanban board component.

   Usage:
     import { SnaraKanban } from './snara/kanban.js';
     const kanban = new SnaraKanban('#kanban-root', AppConfig.apiPath);
     await kanban.load(bookId);

   Multiple instances (different books, different roots):
     new SnaraKanban('#kanban-1', '/api.php');
     new SnaraKanban('#kanban-2', '/api.php');

   API endpoints consumed:
     GET  ?action=kanban.get&bookId=$n   → [column, …]
     POST ?action=kanban.set&bookId=$n   ← [column, …]

   Public API:
     load(bookId)    → Promise<void>   Fetch + render board
     destroy()       → void            Remove all listeners, null refs
─────────────────────────────────────────────────── */

const TAG = '[SnaraKanban]';

// Default columns seeded for a new book (mirrors kanban.php initial data)
const DEFAULT_COLUMNS = [
  { id: 'backlog',   title: 'Backlog',         cards: [] },
  { id: 'research',  title: 'Research/Outline', cards: [] },
  { id: 'drafting',  title: 'Drafting (WIP)',   cards: [] },
  { id: 'review',    title: 'Review/Edit',      cards: [] },
  { id: 'done',      title: 'Polished',         cards: [] },
];

export class SnaraKanban {

  /** @type {SnaraKanban|null} */
  static instance = null;

  // ── Constructor ────────────────────────────────────────────────

  /**
   * @param {string} rootSelector  CSS selector for the .kanban root element
   * @param {string} apiPath       e.g. '/api.php'
   */
  constructor(rootSelector, apiPath = '/api.php') {
    /** @type {Element|null} */
    this._root = document.querySelector(rootSelector);
    if (!this._root) {
      console.error(`${TAG} Root element not found: "${rootSelector}"`);
      return;
    }

    // Parse declarative config from data- attributes
    this._settings = this._parseSettings(this._root);

    // Override apiPath: constructor param > data-api > fallback
    this._apiPath = apiPath
      || this._settings.api
      || '/api.php';

    /** @type {number|null} */
    this._bookId = this._settings.bookid
      ? parseInt(this._settings.bookid, 10)
      : null;

    /** @type {Array<{id:string, title:string, cards:Array<{id:string,title:string}>}>} */
    this._columns = [];

    /** @type {Element|null} Actively dragged card element */
    this._dragCard = null;

    /** @type {string|null} Column id the drag started from */
    this._dragSrcCol = null;

    // Bound listener references (required for correct removeEventListener)
    this._onAddBtn    = this._handleAddBtn.bind(this);
    this._onQuickSave = this._handleQuickSave.bind(this);
    this._onQuickCancel = this._handleQuickCancel.bind(this);
    this._onQuickKey  = this._handleQuickKey.bind(this);
    this._onDelegate  = this._handleDelegate.bind(this);

    this._bindStatic();
    SnaraKanban.instance = this;

    this._log('init', { rootSelector, apiPath: this._apiPath, settings: this._settings });
  }

  // ── Settings parser ────────────────────────────────────────────

  /**
   * Reads data-* attributes off the root element into a typed object.
   * @param {Element} el
   * @returns {{ bookid: string|null, api: string|null }}
   */
  _parseSettings(el) {
    return {
      bookid: el.dataset.bookid  || null,
      api:    el.dataset.api     || null,
    };
  }

  // ── Static event binding (survives re-renders) ─────────────────

  _bindStatic() {
    const addBtn      = this._q('#kanban-add-btn');
    const quickSave   = this._q('#kanban-quick-save');
    const quickCancel = this._q('#kanban-quick-cancel');
    const quickInput  = this._q('#kanban-quick-input');

    addBtn?.addEventListener('click',   this._onAddBtn);
    quickSave?.addEventListener('click', this._onQuickSave);
    quickCancel?.addEventListener('click', this._onQuickCancel);
    quickInput?.addEventListener('keydown', this._onQuickKey);

    // Event delegation on board — covers all dynamically rendered cards/columns
    const board = this._q('#kanban-board');
    board?.addEventListener('click', this._onDelegate);
  }

  // ── Public API ─────────────────────────────────────────────────

  /**
   * Fetch board data for a book and render it.
   * Safe to call again when the active book changes.
   * @param {number} bookId
   * @returns {Promise<void>}
   */
  async load(bookId) {
    if (!bookId) {
      console.warn(`${TAG} load() called without bookId`);
      return;
    }

    this._bookId = parseInt(bookId, 10);
    this._root.dataset.bookid = this._bookId;

    this._renderSpinner();

    try {
      const res = await fetch(
        `${this._apiPath}?action=kanban.get&bookId=${encodeURIComponent(this._bookId)}`
      );

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const data = await res.json();
      this._columns = Array.isArray(data) && data.length > 0
        ? data
        : structuredClone(DEFAULT_COLUMNS);

    } catch (err) {
      console.warn(`${TAG} load failed, using defaults:`, err);
      this._columns = structuredClone(DEFAULT_COLUMNS);
    }

    this._render();
  }

  /**
   * Remove all event listeners and null out DOM references.
   * Call before removing the component from the page.
   */
  destroy() {
    this._log('destroy called');

    const addBtn      = this._q('#kanban-add-btn');
    const quickSave   = this._q('#kanban-quick-save');
    const quickCancel = this._q('#kanban-quick-cancel');
    const quickInput  = this._q('#kanban-quick-input');
    const board       = this._q('#kanban-board');

    addBtn?.removeEventListener('click',    this._onAddBtn);
    quickSave?.removeEventListener('click', this._onQuickSave);
    quickCancel?.removeEventListener('click', this._onQuickCancel);
    quickInput?.removeEventListener('keydown', this._onQuickKey);
    board?.removeEventListener('click', this._onDelegate);

    this._dragCard   = null;
    this._dragSrcCol = null;
    this._columns    = [];
    this._root       = null;

    SnaraKanban.instance = null;
    this._log('destroy complete');
  }

  // ── Rendering ──────────────────────────────────────────────────

  _renderSpinner() {
    const board = this._q('#kanban-board');
    if (!board) return;
    board.innerHTML = `<div class="kanban__spinner">Loading…</div>`;
    this._updateCount();
  }

  _render() {
    const board = this._q('#kanban-board');
    if (!board) return;

    board.innerHTML = '';

    this._columns.forEach(col => {
      board.appendChild(this._buildColumn(col));
    });

    this._updateCount();
    this._log('rendered', this._columns.length, 'columns');
  }

  /**
   * Build a column DOM element with its cards and drag listeners.
   * @param {{ id:string, title:string, cards:Array }} col
   * @returns {Element}
   */
  _buildColumn(col) {
    const colEl = document.createElement('div');
    colEl.className  = 'kanban__column';
    colEl.dataset.colId = col.id;
    colEl.setAttribute('role', 'listitem');

    // Column header
    const header = document.createElement('div');
    header.className = 'kanban__col-header';
    header.innerHTML = `
      <span class="kanban__col-title">${this._escape(col.title)}</span>
      <span class="kanban__col-count">${col.cards.length}</span>
    `;
    colEl.appendChild(header);

    // Cards container
    const cardsEl = document.createElement('div');
    cardsEl.className = 'kanban__cards';
    cardsEl.dataset.colId = col.id;

    if (col.cards.length === 0) {
      cardsEl.appendChild(this._buildEmpty());
    } else {
      col.cards.forEach(card => {
        cardsEl.appendChild(this._buildCard(card, col.id));
      });
    }

    // Drag-over on cards container (not on column header)
    cardsEl.addEventListener('dragover', e => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      colEl.classList.add('kanban__column--drag-over');
      this._insertDragGhost(e, cardsEl);
    });

    cardsEl.addEventListener('dragleave', e => {
      // Only fire if we're leaving the container entirely
      if (!cardsEl.contains(e.relatedTarget)) {
        colEl.classList.remove('kanban__column--drag-over');
      }
    });

    cardsEl.addEventListener('drop', e => {
      e.preventDefault();
      colEl.classList.remove('kanban__column--drag-over');
      this._commitDrop(cardsEl, col.id);
    });

    colEl.appendChild(cardsEl);
    return colEl;
  }

  /**
   * @param {{ id:string, title:string }} card
   * @param {string} colId
   * @returns {Element}
   */
_buildCard(card, colId) {
  const el = document.createElement('div');
  const elh = document.createElement('header');

  el.className      = 'kanban__card';
  el.draggable      = true;
  el.dataset.cardId = card.id;
  el.dataset.colId  = colId;

  // ── Drag handle
  const handle = document.createElement('span');
  handle.className    = 'kanban__card-drag';
  handle.textContent  = '⠿';
  handle.setAttribute('aria-hidden', 'true');
  // Prevent drag handle from triggering contenteditable
  handle.contentEditable = 'false';
  
  elh.appendChild(handle);

  // ── Title (all columns)
  const titleEl = document.createElement('span');
  titleEl.className       = 'kanban__card-title';
  titleEl.contentEditable = 'true';
  titleEl.textContent     = card.title ?? '';
  titleEl.setAttribute('aria-label', 'Scene title');
  titleEl.addEventListener('blur', () => {
    card.title = titleEl.textContent.trim().slice(0, 120);
    this._save();
  });
  // Prevent drag firing while typing
  titleEl.addEventListener('mousedown', e => e.stopPropagation());

  elh.appendChild(titleEl);
  el.appendChild(elh);

  // ── Desc (Research/Outline and beyond)
  const COLS_WITH_DESC = ['research', 'drafting', 'review', 'done'];
  if (COLS_WITH_DESC.includes(colId)) {
    const descEl = document.createElement('span');
    descEl.className       = 'kanban__card-desc';
    descEl.contentEditable = 'true';
    descEl.textContent     = card.desc ?? '';
    descEl.setAttribute('aria-label', 'Scene description');
    descEl.setAttribute('data-placeholder', 'Add a note…');
    descEl.addEventListener('blur', () => {
      card.desc = descEl.textContent.trim();
      this._save();
    });
    descEl.addEventListener('mousedown', e => e.stopPropagation());
    el.appendChild(descEl);
  }

  // ── Context menu button
  const menuBtn = document.createElement('button');
  menuBtn.className = 'kanban__card-menu-btn';
  menuBtn.setAttribute('aria-label', 'Card options');
  menuBtn.dataset.cardId = card.id;
  menuBtn.dataset.colId  = colId;
  menuBtn.textContent    = '⋯';
  el.appendChild(menuBtn);

  // ── Context menu
  const menu = document.createElement('div');
  menu.className = 'kanban__card-menu kanban__card-menu--hidden';
  menu.dataset.menuFor = card.id;
  menu.innerHTML = `
    <button class="kanban__menu-item kanban__menu-item--danger"
      data-action="card.delete"
      data-card-id="${this._escape(card.id)}"
      data-col-id="${this._escape(colId)}"
    >Delete</button>
  `;
  el.appendChild(menu);

  // ── Drag events
  el.addEventListener('dragstart', () => {
    this._dragCard   = el;
    this._dragSrcCol = colId;
    requestAnimationFrame(() => el.classList.add('kanban__card--dragging'));
  });
  el.addEventListener('dragend', () => {
    el.classList.remove('kanban__card--dragging');
    this._removeGhosts();
    this._dragCard   = null;
    this._dragSrcCol = null;
  });

  return el;
}

  _buildEmpty() {
    const el = document.createElement('div');
    el.className = 'kanban__empty';
    el.innerHTML = `
      <span class="kanban__empty-icon">☁︎</span>
      <span>Drop scenes here</span>
    `;
    return el;
  }

  // ── Drag-and-drop helpers ──────────────────────────────────────

  /**
   * Insert a ghost placeholder at the correct drop position.
   * Avoids appending behind itself if already in this column.
   * @param {DragEvent} e
   * @param {Element}   cardsEl
   */
  _insertDragGhost(e, cardsEl) {
    if (!this._dragCard) return;

    const siblings = [...cardsEl.querySelectorAll(
      '.kanban__card:not(.kanban__card--ghost):not(.kanban__card--dragging)'
    )];

    let insertBefore = null;
    for (const sibling of siblings) {
      const rect = sibling.getBoundingClientRect();
      if (e.clientY < rect.top + rect.height / 2) {
        insertBefore = sibling;
        break;
      }
    }

    // Get or create ghost
    let ghost = cardsEl.querySelector('.kanban__card--ghost');
    if (!ghost) {
      ghost = document.createElement('div');
      ghost.className = 'kanban__card kanban__card--ghost';
      ghost.style.height = (this._dragCard.offsetHeight || 40) + 'px';
    }

    if (insertBefore) {
      cardsEl.insertBefore(ghost, insertBefore);
    } else {
      cardsEl.appendChild(ghost);
    }
  }

  _removeGhosts() {
    this._root?.querySelectorAll('.kanban__card--ghost').forEach(g => g.remove());
  }

  /**
   * Commit the drop: move card in data model + re-render + save.
   * @param {Element} targetCardsEl  The .kanban__cards container dropped onto
   * @param {string}  targetColId
   */
  _commitDrop(targetCardsEl, targetColId) {
    if (!this._dragCard) return;

    const cardId    = this._dragCard.dataset.cardId;
    const srcColId  = this._dragSrcCol;
    const ghost     = targetCardsEl.querySelector('.kanban__card--ghost');

    // Determine insertion index from ghost position
    const allCards  = [...targetCardsEl.querySelectorAll(
      '.kanban__card:not(.kanban__card--ghost):not(.kanban__card--dragging)'
    )];
    const insertIdx = ghost
      ? allCards.indexOf(ghost)    // indexOf returns -1 if not found
      : allCards.length;

    // Mutate data model
    const srcCol    = this._columns.find(c => c.id === srcColId);
    const tgtCol    = this._columns.find(c => c.id === targetColId);
    if (!srcCol || !tgtCol) return;

    const cardIdx   = srcCol.cards.findIndex(c => c.id === cardId);
    if (cardIdx === -1) return;

    const [card]    = srcCol.cards.splice(cardIdx, 1);

    // If same column + ghost would come after card's original position,
    // the splice already shifted indices — no correction needed because
    // we rebuilt the list without the card first.
    const safeIdx   = Math.max(0, insertIdx === -1 ? tgtCol.cards.length : insertIdx);
    tgtCol.cards.splice(safeIdx, 0, card);

    this._render();
    this._save();
  }

  // ── Event delegation on board ─────────────────────────────────

  /**
   * Single delegated click handler for the entire board.
   * @param {MouseEvent} e
   */
  _handleDelegate(e) {
    const menuBtn    = e.target.closest('.kanban__card-menu-btn');
    const menuItem   = e.target.closest('.kanban__menu-item');
    const card       = e.target.closest('.kanban__card');

    // Toggle card context menu
    if (menuBtn) {
      e.stopPropagation();
      const cardId = menuBtn.dataset.cardId;
      this._toggleCardMenu(cardId);
      return;
    }

    // Menu item action
    if (menuItem) {
      const action  = menuItem.dataset.action;
      const cardId  = menuItem.dataset.cardId;
      const colId   = menuItem.dataset.colId;

      if (action === 'card.delete') {
        this._deleteCard(cardId, colId);
      }
      this._closeAllMenus();
      return;
    }

    // Click anywhere else → close menus
    if (!e.target.closest('.kanban__card-menu')) {
      this._closeAllMenus();
    }
  }

  _toggleCardMenu(cardId) {
    const menu = this._root?.querySelector(
      `.kanban__card-menu[data-menu-for="${cardId}"]`
    );
    if (!menu) return;
    const isHidden = menu.classList.contains('kanban__card-menu--hidden');
    this._closeAllMenus();
    if (isHidden) menu.classList.remove('kanban__card-menu--hidden');
  }

  _closeAllMenus() {
    this._root?.querySelectorAll('.kanban__card-menu').forEach(m => {
      m.classList.add('kanban__card-menu--hidden');
    });
  }

  // ── Quick-add form ─────────────────────────────────────────────

  _handleAddBtn() {
    const form  = this._q('#kanban-quick-form');
    const input = this._q('#kanban-quick-input');
    if (!form) return;

    form.classList.remove('kanban__quick-form--hidden');
    input?.focus();
  }

  _handleQuickSave() {
    const input = this._q('#kanban-quick-input');
    const title = input?.value.trim();

    if (!title) {
      input?.focus();
      return;
    }

    this._addCard(title);
    this._hideQuickForm();
  }

  _handleQuickCancel() {
    this._hideQuickForm();
  }

  /** @param {KeyboardEvent} e */
  _handleQuickKey(e) {
    if (e.key === 'Enter')  this._handleQuickSave();
    if (e.key === 'Escape') this._handleQuickCancel();
  }

  _hideQuickForm() {
    const form  = this._q('#kanban-quick-form');
    const input = this._q('#kanban-quick-input');
    if (form)  form.classList.add('kanban__quick-form--hidden');
    if (input) input.value = '';
  }

  // ── Data mutations ─────────────────────────────────────────────

  /**
   * Add a new card to the first column (Backlog).
   * @param {string} title
   */
  _addCard(title) {
    if (!this._columns.length) return;

    const card = {
      id:    'c' + Date.now() + '_' + Math.random().toString(36).slice(2, 7),
      title: title.slice(0, 120),
    };

    this._columns[0].cards.push(card);
    this._render();
    this._save();
  }

  /**
   * Delete a card by id from its column.
   * @param {string} cardId
   * @param {string} colId
   */
  _deleteCard(cardId, colId) {
    const col = this._columns.find(c => c.id === colId);
    if (!col) return;

    col.cards = col.cards.filter(c => c.id !== cardId);
    this._render();
    this._save();
  }

  // ── Persistence ────────────────────────────────────────────────

  /**
   * POST current board state to api.php?action=kanban.set
   * Reads DOM order to capture drag-reorder before calling.
   * (Order is already canonical in this._columns after _commitDrop.)
   */
  async _save() {
    if (!this._bookId) {
      console.warn(`${TAG} _save() skipped — no bookId`);
      return;
    }

    try {
      const res = await fetch(
        `${this._apiPath}?action=kanban.set&bookId=${encodeURIComponent(this._bookId)}`,
        {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify(this._columns),
        }
      );

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      this._log('saved');
    } catch (err) {
      console.error(`${TAG} save failed:`, err);
    }
  }

  // ── UI helpers ─────────────────────────────────────────────────

  _updateCount() {
    const countEl = this._q('#kanban-card-count');
    if (!countEl) return;

    const total = this._columns.reduce((n, col) => n + col.cards.length, 0);
    countEl.textContent = total === 1 ? '1 scene' : `${total} scenes`;
  }

  /**
   * Scoped querySelector — only searches within this component's root.
   * Prevents collisions with other instances on the same page.
   * @param {string} selector
   * @returns {Element|null}
   */
  _q(selector) {
    return this._root?.querySelector(selector) ?? null;
  }

  /**
   * HTML-escape a string to prevent XSS when injecting into innerHTML.
   * @param {string} str
   * @returns {string}
   */
  _escape(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  // ── Debug logger ───────────────────────────────────────────────
  // Enable:  localStorage.setItem('debug', 'kanban')  then reload

  _log(...args) {
    try {
      if (localStorage.getItem('debug') === 'kanban') {
        console.log(TAG, ...args);
      }
    } catch { /* storage unavailable */ }
  }
}