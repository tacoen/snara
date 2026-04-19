const TAG = '[SnaraKanban]';

// Fallback config — used if json/kanban.json fails to load.
const DEFAULT_COLUMNS = [
  { id: 'backlog',  title: 'Backlog',          cards: [] },
  { id: 'research', title: 'Research/Outline',  cards: [] },
  { id: 'drafting', title: 'Drafting (WIP)',    cards: [] },
  { id: 'review',   title: 'Review/Edit',       cards: [] },
  { id: 'done',     title: 'Polished',          cards: [] },
];
const DEFAULT_REF_TAG_MAP = {
  4: 'beat',
  3: 'scene',
  2: 'chapter',
  1: 'act',
};

export class SnaraKanban {
  static instance = null;

  constructor(rootSelector, apiPath = '/api.php') {
    this._root = document.querySelector(rootSelector);
    if (!this._root) {
      console.error(`${TAG} Root element not found: "${rootSelector}"`);
      return;
    }

    this._settings = this._parseSettings(this._root);

    this._apiPath = apiPath
      || this._settings.api
      || '/api.php';

    this._bookId = this._settings.bookid
      ? parseInt(this._settings.bookid, 10)
      : null;

    this._columns        = [];
    this._refTagMap      = DEFAULT_REF_TAG_MAP;
    this._defaultColumns = structuredClone(DEFAULT_COLUMNS);
    this._dragCard       = null;
    this._dragSrcCol     = null;

    this._onAddBtn      = this._handleAddBtn.bind(this);
    this._onQuickSave   = this._handleQuickSave.bind(this);
    this._onQuickCancel = this._handleQuickCancel.bind(this);
    this._onQuickKey    = this._handleQuickKey.bind(this);
    this._onDelegate    = this._handleDelegate.bind(this);

    // _ready resolves once kanban.json is loaded (or falls back).
    this._ready = this._loadConfig();

    this._bindStatic();
    SnaraKanban.instance = this;

    this._log('init', { rootSelector, apiPath: this._apiPath, settings: this._settings });
  }

  // Fetch user-editable config; fall back silently to hardcoded defaults.
  async _loadConfig() {
    try {
      const res = await fetch('/json/kanban.json');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const cfg = await res.json();

      if (Array.isArray(cfg.columns) && cfg.columns.length > 0) {
        this._defaultColumns = cfg.columns.map(col => ({
          id:    col.id,
          title: col.title,
          cards: [],
        }));
      }

      if (cfg.refTagMap && typeof cfg.refTagMap === 'object') {
        // JSON keys are strings; cast to int to match original map shape.
        this._refTagMap = Object.fromEntries(
          Object.entries(cfg.refTagMap).map(([k, v]) => [parseInt(k, 10), v])
        );
      }

      this._log('config loaded from json/kanban.json');
    } catch (err) {
      this._log('kanban.json load failed, using defaults:', err);
      this._defaultColumns = structuredClone(DEFAULT_COLUMNS);
      this._refTagMap      = DEFAULT_REF_TAG_MAP;
    }
  }

  _parseSettings(el) {
    return {
      bookid: el.dataset.bookid || null,
      api:    el.dataset.api    || null,
    };
  }

  _bindStatic() {
    const addBtn      = this._q('#kanban-add-btn');
    const quickSave   = this._q('#kanban-quick-save');
    const quickCancel = this._q('#kanban-quick-cancel');
    const quickInput  = this._q('#kanban-quick-input');
    addBtn?.addEventListener('click',     this._onAddBtn);
    quickSave?.addEventListener('click',  this._onQuickSave);
    quickCancel?.addEventListener('click',this._onQuickCancel);
    quickInput?.addEventListener('keydown', this._onQuickKey);
    const board = this._q('#kanban-board');
    board?.addEventListener('click', this._onDelegate);
  }

  async load(bookId) {
    if (!bookId) {
      console.warn(`${TAG} load() called without bookId`);
      return;
    }

    this._bookId = parseInt(bookId, 10);
    this._root.dataset.bookid = this._bookId;

    this._renderSpinner();

    // Wait for config fetch to settle before rendering.
    await this._ready;

    try {
      const res = await fetch(
        `${this._apiPath}?action=kanban.get&bookId=${encodeURIComponent(this._bookId)}`
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      this._columns = Array.isArray(data) && data.length > 0
        ? data
        : structuredClone(this._defaultColumns);
    } catch (err) {
      console.warn(`${TAG} load failed, using defaults:`, err);
      this._columns = structuredClone(this._defaultColumns);
    }

    this._render();
  }

  destroy() {
    this._log('destroy called');
    const addBtn      = this._q('#kanban-add-btn');
    const quickSave   = this._q('#kanban-quick-save');
    const quickCancel = this._q('#kanban-quick-cancel');
    const quickInput  = this._q('#kanban-quick-input');
    const board       = this._q('#kanban-board');
    addBtn?.removeEventListener('click',     this._onAddBtn);
    quickSave?.removeEventListener('click',  this._onQuickSave);
    quickCancel?.removeEventListener('click',this._onQuickCancel);
    quickInput?.removeEventListener('keydown', this._onQuickKey);
    board?.removeEventListener('click', this._onDelegate);
    this._dragCard   = null;
    this._dragSrcCol = null;
    this._columns    = [];
    this._root       = null;
    SnaraKanban.instance = null;
    this._log('destroy complete');
  }

  _renderSpinner() {
    const board = this._q('#kanban-board');
    if (!board) return;
    board.innerHTML = `<div class="kanban__spinner">Loading...</div>`;
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

  _buildColumn(col) {
    const colEl = document.createElement('div');
    colEl.className     = 'kanban__column';
    colEl.dataset.colId = col.id;
    colEl.setAttribute('role', 'listitem');

    const header = document.createElement('div');
    header.className = 'kanban__col-header';
    header.innerHTML = `
      <span class="kanban__col-title">${this._escape(col.title)}</span>
      <span class="kanban__col-count">${col.cards.length}</span>
    `;
    colEl.appendChild(header);

    const cardsEl = document.createElement('div');
    cardsEl.className     = 'kanban__cards';
    cardsEl.dataset.colId = col.id;

    if (col.cards.length === 0) {
      cardsEl.appendChild(this._buildEmpty());
    } else {
      col.cards.forEach(card => {
        cardsEl.appendChild(this._buildCard(card, col.id));
      });
    }

    cardsEl.addEventListener('dragover', e => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      colEl.classList.add('kanban__column--drag-over');
      this._insertDragGhost(e, cardsEl);
    });

    cardsEl.addEventListener('dragleave', e => {
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

  _buildCard(card, colId) {
    const el  = document.createElement('div');
    const elh = document.createElement('header');
    el.className      = 'kanban__card';
    el.draggable      = true;
    el.dataset.cardId = card.id;
    el.dataset.colId  = colId;
    if (card.tag) el.dataset.tag = card.tag;

    const handle = document.createElement('span');
    handle.className       = 'kanban__card-drag';
    handle.textContent     = '⠿';
    handle.setAttribute('aria-hidden', 'true');
    handle.contentEditable = 'false';
    elh.appendChild(handle);

    const titleEl = document.createElement('span');
    titleEl.className       = 'kanban__card-title';
    titleEl.contentEditable = 'true';
    titleEl.textContent     = card.title ?? '';
    titleEl.setAttribute('aria-label', 'Scene title');
    titleEl.addEventListener('blur', () => {
      card.title = titleEl.textContent.trim().slice(0, 120);
      this._save();
    });
    titleEl.addEventListener('mousedown', e => e.stopPropagation());
    elh.appendChild(titleEl);
    el.appendChild(elh);

    const COLS_WITH_DESC = ['research', 'drafting', 'review', 'done'];
    if (COLS_WITH_DESC.includes(colId)) {
      const descEl = document.createElement('span');
      descEl.className       = 'kanban__card-desc';
      descEl.contentEditable = 'true';
      descEl.textContent     = card.desc ?? '';
      descEl.setAttribute('aria-label', 'Scene description');
      descEl.setAttribute('data-placeholder', 'Add a note...');
      descEl.addEventListener('blur', () => {
        card.desc = descEl.textContent.trim();
        this._save();
      });
      descEl.addEventListener('mousedown', e => e.stopPropagation());
      el.appendChild(descEl);
    }

    if (colId === 'drafting') {
      const refEl = document.createElement('span');
      refEl.className       = 'kanban__card-ref';
      refEl.contentEditable = 'true';
      refEl.textContent     = card.ref ?? '';
      refEl.setAttribute('aria-label', 'Reference');
      refEl.setAttribute('data-placeholder', 'Add leading #');
      refEl.addEventListener('blur', () => {
        const raw = refEl.textContent.trim().slice(0, 160);
        card.ref = raw;
        const match = raw.match(/^(#{1,4})\s*/);
        if (match) {
          card.tag = this._refTagMap[Math.min(match[1].length, 4)];
          el.dataset.tag = card.tag;
        } else {
          card.tag = '';
          delete el.dataset.tag;
        }
        this._save();
      });
      refEl.addEventListener('mousedown', e => e.stopPropagation());
      el.appendChild(refEl);
    }

    if (colId === 'review') {
      const revEl = document.createElement('span');
      revEl.className       = 'kanban__card-rev';
      revEl.contentEditable = 'true';
      revEl.textContent     = card.revision ?? '';
      revEl.setAttribute('aria-label', 'Revision note');
      revEl.setAttribute('data-placeholder', 'Add a revision...');
      revEl.addEventListener('blur', () => {
        card.revision = revEl.textContent.trim();
        this._save();
      });
      revEl.addEventListener('mousedown', e => e.stopPropagation());
      el.appendChild(revEl);
    }

    if (colId === 'done') {
      el.appendChild(this._buildDoneButton(card, colId));
    }

    const menuBtn = document.createElement('button');
    menuBtn.className = 'kanban__card-menu-btn';
    menuBtn.setAttribute('aria-label', 'Card options');
    menuBtn.dataset.cardId = card.id;
    menuBtn.dataset.colId  = colId;
    menuBtn.textContent    = '⋯';
    el.appendChild(menuBtn);

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

  _buildDoneButton(card, colId) {
    const btn = document.createElement('button');
    btn.className      = 'kanban__done-btn';
    btn.dataset.action = 'card.done';
    btn.dataset.cardId = card.id;
    btn.dataset.colId  = colId;
    btn.setAttribute('aria-label', 'Mark as done and remove card');
    btn.textContent = 'DONE';
    btn.addEventListener('mousedown', e => e.stopPropagation());
    return btn;
  }

  _buildEmpty() {
    const el = document.createElement('div');
    el.className = 'kanban__empty';
    el.innerHTML = `
      <span class="kanban__empty-icon">&#9729;&#65038;</span>
      <span>Drop scenes here</span>
    `;
    return el;
  }

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

  _commitDrop(targetCardsEl, targetColId) {
    if (!this._dragCard) return;
    const cardId   = this._dragCard.dataset.cardId;
    const srcColId = this._dragSrcCol;
    const ghost    = targetCardsEl.querySelector('.kanban__card--ghost');
    const allCards = [...targetCardsEl.querySelectorAll(
      '.kanban__card:not(.kanban__card--ghost):not(.kanban__card--dragging)'
    )];
    const insertIdx = ghost ? allCards.indexOf(ghost) : allCards.length;
    const srcCol = this._columns.find(c => c.id === srcColId);
    const tgtCol = this._columns.find(c => c.id === targetColId);
    if (!srcCol || !tgtCol) return;
    const cardIdx = srcCol.cards.findIndex(c => c.id === cardId);
    if (cardIdx === -1) return;
    const [card] = srcCol.cards.splice(cardIdx, 1);
    const safeIdx = Math.max(0, insertIdx === -1 ? tgtCol.cards.length : insertIdx);
    tgtCol.cards.splice(safeIdx, 0, card);
    this._render();
    this._save();
  }

  _handleDelegate(e) {
    const menuBtn  = e.target.closest('.kanban__card-menu-btn');
    const menuItem = e.target.closest('.kanban__menu-item');
    const doneBtn  = e.target.closest('.kanban__done-btn');

    if (doneBtn) {
      e.stopPropagation();
      const cardId = doneBtn.dataset.cardId;
      const colId  = doneBtn.dataset.colId;
      if (cardId && colId) this._deleteCard(cardId, colId);
      return;
    }

    if (menuBtn) {
      e.stopPropagation();
      const cardId = menuBtn.dataset.cardId;
      this._toggleCardMenu(cardId);
      return;
    }

    if (menuItem) {
      const action = menuItem.dataset.action;
      const cardId = menuItem.dataset.cardId;
      const colId  = menuItem.dataset.colId;
      if (action === 'card.delete') {
        this._deleteCard(cardId, colId);
      }
      this._closeAllMenus();
      return;
    }

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

  _addCard(title) {
    if (!this._columns.length) return;
    const card = {
      id:         'c' + Date.now() + '_' + Math.random().toString(36).slice(2, 7),
      title:      title.slice(0, 120),
      references: [],
      revisions:  [],
    };
    this._columns[0].cards.push(card);
    this._render();
    this._save();
  }

  _deleteCard(cardId, colId) {
    const col = this._columns.find(c => c.id === colId);
    if (!col) return;
    col.cards = col.cards.filter(c => c.id !== cardId);
    this._render();
    this._save();
  }

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

  _updateCount() {
    const countEl = this._q('#kanban-card-count');
    if (!countEl) return;
    const total = this._columns.reduce((n, col) => n + col.cards.length, 0);
    countEl.textContent = total === 1 ? '1 scene' : `${total} scenes`;
  }

  _q(selector) {
    return this._root?.querySelector(selector) ?? null;
  }

  _escape(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  _log(...args) {
    try {
      if (localStorage.getItem('debug') === 'kanban') {
        console.log(TAG, ...args);
      }
    } catch { }
  }
}