import { uid, debugLog, apiFetch, postJson } from "./helpers.js";

const TAG = "[SnaraKanban]";

// Fallback config — used if json/kanban.json fails to load.
const DEFAULT_COLUMNS = [
  { id: "backlog", title: "Backlog", cards: [] },
  { id: "research", title: "Research/Outline", cards: [] },
  { id: "drafting", title: "Drafting (WIP)", cards: [] },
  { id: "review", title: "Review/Edit", cards: [] },
  { id: "done", title: "Polished", cards: [] },
];
const DEFAULT_REF_TAG_MAP = {
  4: "beat",
  3: "scene",
  2: "chapter",
  1: "act",
};

export class SnaraKanban {
  static instance = null;

  constructor(rootSelector, apiPath = "/api.php") {
    this._root = document.querySelector(rootSelector);
    if (!this._root) {
      console.error(`${TAG} Root element not found: "${rootSelector}"`);
      return;
    }

    this._log = debugLog(TAG, "kanban");

    this._settings = this._parseSettings(this._root);

    this._apiPath = apiPath || this._settings.api || "/api.php";

    this._bookId = this._settings.bookid
      ? parseInt(this._settings.bookid, 10)
      : null;

    this._columns = [];
    this._refTagMap = DEFAULT_REF_TAG_MAP;
    this._defaultColumns = structuredClone(DEFAULT_COLUMNS);
    this._dragCard = null;
    this._dragSrcCol = null;

    this._onAddBtn = this._handleAddBtn.bind(this);
    this._onQuickSave = this._handleQuickSave.bind(this);
    this._onQuickCancel = this._handleQuickCancel.bind(this);
    this._onQuickKey = this._handleQuickKey.bind(this);
    this._onDelegate = this._handleDelegate.bind(this);

    // _ready resolves once kanban.json is loaded (or falls back).
    this._ready = this._loadConfig();

    this._bindStatic();
    SnaraKanban.instance = this;

    this._log("init", {
      rootSelector,
      apiPath: this._apiPath,
      settings: this._settings,
    });
  }

  // Fetch user-editable config; fall back silently to hardcoded defaults.
  async _loadConfig() {
    try {
      const res = await fetch("/json/kanban.json");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const cfg = await res.json();

      if (Array.isArray(cfg.columns) && cfg.columns.length > 0) {
        this._defaultColumns = cfg.columns.map((col) => ({
          id: col.id,
          title: col.title,
          cards: [],
        }));
      }

      if (cfg.refTagMap && typeof cfg.refTagMap === "object") {
        // JSON keys are strings; cast to int to match original map shape.
        this._refTagMap = Object.fromEntries(
          Object.entries(cfg.refTagMap).map(([k, v]) => [parseInt(k, 10), v])
        );
      }

      this._log("config loaded from json/kanban.json");
    } catch (err) {
      this._log("kanban.json load failed, using defaults:", err);
      this._defaultColumns = structuredClone(DEFAULT_COLUMNS);
      this._refTagMap = DEFAULT_REF_TAG_MAP;
    }
  }

  _parseSettings(el) {
    return {
      bookid: el.dataset.bookid || null,
      api: el.dataset.api || null,
    };
  }

  _bindStatic() {
    const addBtn = this._q("#kanban-add-btn");
    const quickSave = this._q("#kanban-quick-save");
    const quickCancel = this._q("#kanban-quick-cancel");
    const quickInput = this._q("#kanban-quick-input");
    addBtn?.addEventListener("click", this._onAddBtn);
    quickSave?.addEventListener("click", this._onQuickSave);
    quickCancel?.addEventListener("click", this._onQuickCancel);
    quickInput?.addEventListener("keydown", this._onQuickKey);
    const board = this._q("#kanban-board");
    board?.addEventListener("click", this._onDelegate);

    // Inject save status indicator next to the add-scene button
    if (addBtn?.parentElement) {
      const status = document.createElement("span");
      status.id = "kanban-save-status";
      status.style.cssText = [
        "font-family:var(--font-mono)",
        "font-size:10px",
        "color:var(--fg-muted)",
        "opacity:0",
        "transition:opacity .3s",
        "white-space:nowrap",
        "align-self:center",
      ].join(";");
      addBtn.insertAdjacentElement("beforebegin", status);
      this._saveStatus = status;
    }
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
      this._columns = await apiFetch(
        `${this._apiPath}?action=kanban.get&bookId=${encodeURIComponent(
          this._bookId
        )}`
      );
      if (!Array.isArray(this._columns) || !this._columns.length) {
        this._columns = structuredClone(this._defaultColumns);
      }
    } catch (err) {
      console.warn(`${TAG} load failed, using defaults:`, err);
      this._columns = structuredClone(this._defaultColumns);
    }

    this._render();
  }

  destroy() {
    this._log("destroy called");
    const addBtn = this._q("#kanban-add-btn");
    const quickSave = this._q("#kanban-quick-save");
    const quickCancel = this._q("#kanban-quick-cancel");
    const quickInput = this._q("#kanban-quick-input");
    const board = this._q("#kanban-board");
    addBtn?.removeEventListener("click", this._onAddBtn);
    quickSave?.removeEventListener("click", this._onQuickSave);
    quickCancel?.removeEventListener("click", this._onQuickCancel);
    quickInput?.removeEventListener("keydown", this._onQuickKey);
    board?.removeEventListener("click", this._onDelegate);
    this._dragCard = null;
    this._dragSrcCol = null;
    this._columns = [];
    this._root = null;
    SnaraKanban.instance = null;
    this._log("destroy complete");
  }

  _renderSpinner() {
    const board = this._q("#kanban-board");
    if (!board) return;
    board.innerHTML = `<div class="kanban__spinner">Loading...</div>`;
    this._updateCount();
  }

  _render() {
    const board = this._q("#kanban-board");
    if (!board) return;
    board.innerHTML = "";
    this._columns.forEach((col) => {
      board.appendChild(this._buildColumn(col));
    });
    this._updateCount();
    this._log("rendered", this._columns.length, "columns");
  }

  _buildColumn(col) {
    const colEl = document.createElement("div");
    colEl.className = "kanban__column";
    colEl.dataset.colId = col.id;
    colEl.setAttribute("role", "listitem");

    const header = document.createElement("div");
    header.className = "kanban__col-header";
    header.innerHTML = `
      <span class="kanban__col-title">${this._esc(col.title)}</span>
      <span class="kanban__col-count">${col.cards.length}</span>
    `;
    colEl.appendChild(header);

    const cardsEl = document.createElement("div");
    cardsEl.className = "kanban__cards";
    cardsEl.dataset.colId = col.id;

    if (col.cards.length === 0) {
      cardsEl.appendChild(this._buildEmpty());
    } else {
      col.cards.forEach((card) => {
        cardsEl.appendChild(this._buildCard(card, col.id));
      });
    }

    cardsEl.addEventListener("dragover", (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
      colEl.classList.add("kanban__column--drag-over");
      this._insertDragGhost(e, cardsEl);
    });

    cardsEl.addEventListener("dragleave", (e) => {
      if (!cardsEl.contains(e.relatedTarget)) {
        colEl.classList.remove("kanban__column--drag-over");
      }
    });

    cardsEl.addEventListener("drop", (e) => {
      e.preventDefault();
      colEl.classList.remove("kanban__column--drag-over");
      this._commitDrop(cardsEl, col.id);
    });

    colEl.appendChild(cardsEl);
    return colEl;
  }

  _buildCard(card, colId) {
    const el = document.createElement("div");
    const elh = document.createElement("header");
    el.className = "kanban__card";
    el.draggable = true;
    el.dataset.cardId = card.id;
    el.dataset.colId = colId;
    if (card.tag) el.dataset.tag = card.tag;

    const handle = document.createElement("span");
    handle.className = "kanban__card-drag";
    handle.textContent = "⠿";
    handle.setAttribute("aria-hidden", "true");
    handle.contentEditable = "false";
    elh.appendChild(handle);

    const titleEl = document.createElement("span");
    titleEl.className = "kanban__card-title";
    titleEl.contentEditable = "true";
    titleEl.textContent = card.title ?? "";
    titleEl.setAttribute("aria-label", "Scene title");
    titleEl.addEventListener("blur", () => {
      card.title = titleEl.textContent.trim().slice(0, 120);
      this._scheduleSave();
    });
    titleEl.addEventListener("mousedown", (e) => e.stopPropagation());
    elh.appendChild(titleEl);
    el.appendChild(elh);

    const COLS_WITH_DESC = ["research", "drafting", "review", "done"];
    if (COLS_WITH_DESC.includes(colId)) {
      el.appendChild(this._buildChecklist(card));
    }

    if (colId === "drafting") {
      const refEl = document.createElement("span");
      refEl.className = "kanban__card-ref";
      refEl.contentEditable = "true";
      refEl.textContent = card.ref ?? "";
      refEl.setAttribute("aria-label", "Reference");
      refEl.setAttribute("data-placeholder", "Add leading # filename");

      refEl.addEventListener("blur", () => {
        const raw = refEl.textContent.trim().slice(0, 160);
        card.ref = raw;
        const match = raw.match(/^(#{1,4})\s*(.*)/);
        if (match) {
          card.tag = this._refTagMap[Math.min(match[1].length, 4)];
          el.dataset.tag = card.tag;
          // Try to resolve the filename portion as a doc link
          const name = match[2].trim();
          if (name) this._resolveRefLink(el, name, card);
        } else {
          card.tag = "";
          delete el.dataset.tag;
          el.querySelector(".kanban__ref-link")?.remove();
        }
        this._scheduleSave();
      });

      // When user focuses the ref field, hide the link so it doesn't confuse editing
      refEl.addEventListener("focus", () => {
        el.querySelector(".kanban__ref-link")?.remove();
      });

      refEl.addEventListener("mousedown", (e) => e.stopPropagation());
      el.appendChild(refEl);

      // Render existing saved ref link on card build
      if (card.ref) {
        const m = card.ref.match(/^#{1,4}\s*(.*)/);
        if (m && m[1].trim()) this._resolveRefLink(el, m[1].trim(), card);
      }
    }

    if (colId === "review") {
      const revEl = document.createElement("span");
      revEl.className = "kanban__card-rev";
      revEl.contentEditable = "true";
      revEl.textContent = card.revision ?? "";
      revEl.setAttribute("aria-label", "Revision note");
      revEl.setAttribute("data-placeholder", "Add a revision...");
      revEl.addEventListener("blur", () => {
        card.revision = revEl.textContent.trim();
        this._scheduleSave();
      });
      revEl.addEventListener("mousedown", (e) => e.stopPropagation());
      el.appendChild(revEl);
    }

    if (colId === "done") {
      el.appendChild(this._buildDoneButton(card, colId));
    }

    const menuBtn = document.createElement("button");
    menuBtn.className = "kanban__card-menu-btn";
    menuBtn.setAttribute("aria-label", "Card options");
    menuBtn.dataset.cardId = card.id;
    menuBtn.dataset.colId = colId;
    menuBtn.textContent = "⋯";
    el.appendChild(menuBtn);

    const menu = document.createElement("div");
    menu.className = "kanban__card-menu kanban__card-menu--hidden";
    menu.dataset.menuFor = card.id;
    menu.innerHTML = `
      <button class="kanban__menu-item kanban__menu-item--danger"
        data-action="card.delete"
        data-card-id="${this._esc(card.id)}"
        data-col-id="${this._esc(colId)}"
      >Delete</button>
    `;
    el.appendChild(menu);

    // Save when focus leaves the card entirely.
    // focusout bubbles; relatedTarget is where focus is going.
    // If it is still inside el, this is just internal tab — skip.
    el.addEventListener("focusout", (e) => {
      if (el.contains(e.relatedTarget)) return;
      this._syncCardFromDOM(card, el);
      this._scheduleSave();
    });

    el.addEventListener("dragstart", () => {
      this._dragCard = el;
      this._dragSrcCol = colId;
      requestAnimationFrame(() => el.classList.add("kanban__card--dragging"));
    });
    el.addEventListener("dragend", () => {
      el.classList.remove("kanban__card--dragging");
      this._removeGhosts();
      this._dragCard = null;
      this._dragSrcCol = null;
    });

    return el;
  }

  // ── Checklist helpers ─────────────────────────
  // card.desc stored as array: [{ text: string, done: boolean }, ...]
  // Legacy string values are migrated on first render.

  _normalizeDesc(raw) {
    if (Array.isArray(raw)) return raw;
    // Legacy string migration
    const text = (typeof raw === "string" ? raw : "").trim();
    return text ? [{ text, done: false }] : [];
  }

  _syncChecklist(ul, card) {
    card.desc = [...ul.querySelectorAll(".kanban__todo-item")]
      .map((li) => ({
        text: li.querySelector(".kanban__todo-text")?.textContent.trim() ?? "",
        done: li.querySelector(".kanban__todo-cb")?.checked ?? false,
      }))
      .filter((item) => item.text !== "");
    // Debounce: focus may shift between elements within the same card.
    // A short delay lets any sibling focus settle before persisting.
    this._scheduleSave();
  }

  _buildChecklist(card) {
    const items = this._normalizeDesc(card.desc);
    if (!Array.isArray(card.desc)) card.desc = items;

    const ul = document.createElement("ul");
    ul.className = "kanban__card-desc";
    ul.setAttribute("aria-label", "Todo checklist");

    const addItem = (item = { text: "", done: false }, focusAfter = false) => {
      const li = document.createElement("li");
      li.className = "kanban__todo-item";

      const cb = document.createElement("input");
      cb.type = "checkbox";
      cb.className = "kanban__todo-cb";
      cb.checked = item.done ?? false;
      cb.setAttribute("aria-label", "Mark done");
      cb.addEventListener("mousedown", (e) => e.stopPropagation());
      cb.addEventListener("change", () => {
        li.classList.toggle("kanban__todo-done", cb.checked);
        this._syncChecklist(ul, card);
      });

      const span = document.createElement("span");
      span.className = "kanban__todo-text";
      span.contentEditable = "true";
      span.textContent = item.text;
      span.setAttribute("data-placeholder", "New item…");
      if (item.done) li.classList.add("kanban__todo-done");

      span.addEventListener("mousedown", (e) => e.stopPropagation());
      span.addEventListener("blur", () => this._syncChecklist(ul, card));

      span.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          this._syncChecklist(ul, card);
          // addItem inserts before addBtn; place it after the current li instead
          const newLi = addItem({ text: "", done: false });
          li.after(newLi); // move from before addBtn to directly after current item
          newLi.querySelector(".kanban__todo-text")?.focus();
        }
        if (e.key === "Backspace" && span.textContent === "") {
          e.preventDefault();
          const prev = li.previousElementSibling;
          li.remove();
          this._syncChecklist(ul, card);
          // Focus previous item text if exists
          prev?.querySelector(".kanban__todo-text")?.focus();
        }
      });

      li.appendChild(cb);
      li.appendChild(span);
      ul.insertBefore(li, addBtn);

      if (focusAfter) span.focus();
      return li;
    };

    // "Add item" row at the bottom
    const addBtn = document.createElement("li");
    addBtn.className = "kanban__todo-add";
    addBtn.textContent = "+ add item";
    addBtn.addEventListener("mousedown", (e) => e.stopPropagation());
    addBtn.addEventListener("click", () => {
      const li = addItem({ text: "", done: false });
      li.querySelector(".kanban__todo-text")?.focus();
    });
    ul.appendChild(addBtn);

    // Render existing items
    items.forEach((item) => addItem(item));

    return ul;
  }

  _buildDoneButton(card, colId) {
    const btn = document.createElement("button");
    btn.className = "kanban__done-btn";
    btn.dataset.action = "card.done";
    btn.dataset.cardId = card.id;
    btn.dataset.colId = colId;
    btn.setAttribute("aria-label", "Mark as done and remove card");
    btn.textContent = "DONE";
    btn.addEventListener("mousedown", (e) => e.stopPropagation());
    return btn;
  }

  _buildEmpty() {
    const el = document.createElement("div");
    el.className = "kanban__empty";
    el.innerHTML = `
      <span class="kanban__empty-icon">&#9729;&#65038;</span>
      <span>Drop scenes here</span>
    `;
    return el;
  }

  _insertDragGhost(e, cardsEl) {
    if (!this._dragCard) return;
    const siblings = [
      ...cardsEl.querySelectorAll(
        ".kanban__card:not(.kanban__card--ghost):not(.kanban__card--dragging)"
      ),
    ];
    let insertBefore = null;
    for (const sibling of siblings) {
      const rect = sibling.getBoundingClientRect();
      if (e.clientY < rect.top + rect.height / 2) {
        insertBefore = sibling;
        break;
      }
    }

    let ghost = cardsEl.querySelector(".kanban__card--ghost");
    if (!ghost) {
      ghost = document.createElement("div");
      ghost.className = "kanban__card kanban__card--ghost";
      ghost.style.height = (this._dragCard.offsetHeight || 40) + "px";
    }

    if (insertBefore) {
      cardsEl.insertBefore(ghost, insertBefore);
    } else {
      cardsEl.appendChild(ghost);
    }
  }

  _removeGhosts() {
    this._root
      ?.querySelectorAll(".kanban__card--ghost")
      .forEach((g) => g.remove());
  }

  _commitDrop(targetCardsEl, targetColId) {
    if (!this._dragCard) return;
    const cardId = this._dragCard.dataset.cardId;
    const srcColId = this._dragSrcCol;
    const ghost = targetCardsEl.querySelector(".kanban__card--ghost");
    const allCards = [
      ...targetCardsEl.querySelectorAll(
        ".kanban__card:not(.kanban__card--ghost):not(.kanban__card--dragging)"
      ),
    ];
    const insertIdx = ghost ? allCards.indexOf(ghost) : allCards.length;
    const srcCol = this._columns.find((c) => c.id === srcColId);
    const tgtCol = this._columns.find((c) => c.id === targetColId);
    if (!srcCol || !tgtCol) return;
    const cardIdx = srcCol.cards.findIndex((c) => c.id === cardId);
    if (cardIdx === -1) return;
    const [card] = srcCol.cards.splice(cardIdx, 1);
    const safeIdx = Math.max(
      0,
      insertIdx === -1 ? tgtCol.cards.length : insertIdx
    );
    tgtCol.cards.splice(safeIdx, 0, card);
    this._render();
    this._save();
  }

  _handleDelegate(e) {
    const menuBtn = e.target.closest(".kanban__card-menu-btn");
    const menuItem = e.target.closest(".kanban__menu-item");
    const doneBtn = e.target.closest(".kanban__done-btn");

    if (doneBtn) {
      e.stopPropagation();
      const cardId = doneBtn.dataset.cardId;
      const colId = doneBtn.dataset.colId;
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
      const colId = menuItem.dataset.colId;
      if (action === "card.delete") {
        this._deleteCard(cardId, colId);
      }
      this._closeAllMenus();
      return;
    }

    if (!e.target.closest(".kanban__card-menu")) {
      this._closeAllMenus();
    }
  }

  _toggleCardMenu(cardId) {
    const menu = this._root?.querySelector(
      `.kanban__card-menu[data-menu-for="${cardId}"]`
    );
    if (!menu) return;
    const isHidden = menu.classList.contains("kanban__card-menu--hidden");
    this._closeAllMenus();
    if (isHidden) menu.classList.remove("kanban__card-menu--hidden");
  }

  _closeAllMenus() {
    this._root?.querySelectorAll(".kanban__card-menu").forEach((m) => {
      m.classList.add("kanban__card-menu--hidden");
    });
  }

  _handleAddBtn() {
    const form = this._q("#kanban-quick-form");
    const input = this._q("#kanban-quick-input");
    if (!form) return;
    form.classList.remove("kanban__quick-form--hidden");
    input?.focus();
  }

  _handleQuickSave() {
    const input = this._q("#kanban-quick-input");
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
    if (e.key === "Enter") this._handleQuickSave();
    if (e.key === "Escape") this._handleQuickCancel();
  }

  _hideQuickForm() {
    const form = this._q("#kanban-quick-form");
    const input = this._q("#kanban-quick-input");
    if (form) form.classList.add("kanban__quick-form--hidden");
    if (input) input.value = "";
  }

  _addCard(title) {
    if (!this._columns.length) return;
    const card = {
      id: uid("c"),
      title: title.slice(0, 120),
      references: [],
      revisions: [],
    };
    this._columns[0].cards.push(card);
    this._render();
    this._save();
  }

  _deleteCard(cardId, colId) {
    const col = this._columns.find((c) => c.id === colId);
    if (!col) return;
    col.cards = col.cards.filter((c) => c.id !== cardId);
    this._render();
    this._save();
  }

  // Reads all editable fields from a rendered card el back into card object.
  // Called on card focusout so the data is always fresh before saving.
  _syncCardFromDOM(card, el) {
    const titleEl = el.querySelector(".kanban__card-title");
    if (titleEl) card.title = titleEl.textContent.trim().slice(0, 120);

    const refEl = el.querySelector(".kanban__card-ref");
    if (refEl) {
      const raw = refEl.textContent.trim().slice(0, 160);
      card.ref = raw;
      const match = raw.match(/^(#{1,4})\s*/);
      if (match) {
        card.tag = this._refTagMap[Math.min(match[1].length, 4)];
        el.dataset.tag = card.tag;
      } else {
        card.tag = "";
        delete el.dataset.tag;
      }
    }

    const revEl = el.querySelector(".kanban__card-rev");
    if (revEl) card.revision = revEl.textContent.trim();

    const ul = el.querySelector(".kanban__card-desc");
    if (ul) {
      card.desc = [...ul.querySelectorAll(".kanban__todo-item")]
        .map((li) => ({
          text:
            li.querySelector(".kanban__todo-text")?.textContent.trim() ?? "",
          done: li.querySelector(".kanban__todo-cb")?.checked ?? false,
        }))
        .filter((item) => item.text !== "");
    }
  }

  // Fetches the doc list for the active book and, if the given name matches
  // a filename, injects a clickable link below the ref field on the card.
  async _resolveRefLink(el, name, card) {
    el.querySelector(".kanban__ref-link")?.remove();

    const bookId = this._bookId;
    if (!bookId) return;

    // Slugify: lowercase, spaces to dashes, strip non-alphanumeric
    const slug = name
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9\-_]/g, "");
    if (!slug) return;

    let docs = [];
    try {
      const res = await fetch(
        `${this._apiPath}?action=doc.list&bookId=${encodeURIComponent(bookId)}`
      );
      if (!res.ok) return;
      docs = await res.json();
    } catch {
      return;
    }

    // doc.list returns filenames without extension — match exact or prefix
    const match = docs.find((f) => f === slug || f.startsWith(slug));
    if (!match) return;

    const filename = match;

    const href = `?p=editor&bid=${encodeURIComponent(
      bookId
    )}&file=${encodeURIComponent(filename)}`;

    const link = document.createElement("a");
    link.className = "kanban__ref-link";
    link.href = href;
    link.textContent = filename;
    link.title = `Open "${filename}" in editor`;
    link.style.cssText = [
      "display:block",
      "font-size:10px",
      "font-family:var(--font-mono)",
      "color:var(--fg-link)",
      "text-decoration:none",
      "overflow:hidden",
      "text-overflow:ellipsis",
      "white-space:nowrap",
      "padding:1px 0",
      "opacity:.8",
      "transition:opacity .12s",
    ].join(";");
    link.addEventListener("mouseenter", () => (link.style.opacity = "1"));
    link.addEventListener("mouseleave", () => (link.style.opacity = ".8"));
    link.addEventListener("mousedown", (e) => e.stopPropagation());
    link.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      window.loadDocument?.(bookId, filename);
    });

    // Insert after refEl
    const refEl = el.querySelector(".kanban__card-ref");
    if (refEl) refEl.insertAdjacentElement("afterend", link);
  }

  _scheduleSave() {
    this._setSaveStatus("saving…", "");
    clearTimeout(this._saveTimer);
    this._saveTimer = setTimeout(() => this._save(), 300);
  }

  async _save() {
    if (!this._bookId) {
      console.warn(`${TAG} _save() skipped — no bookId`);
      return;
    }
    try {
      const res = await fetch(
        `${this._apiPath}?action=kanban.set&bookId=${encodeURIComponent(
          this._bookId
        )}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(this._columns),
        }
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      this._log("saved");
      this._setSaveStatus("saved", "ok");
      clearTimeout(this._statusTimer);
      this._statusTimer = setTimeout(() => this._setSaveStatus("", ""), 2000);
    } catch (err) {
      console.error(`${TAG} save failed:`, err);
      this._setSaveStatus("save failed", "error");
    }
  }

  _setSaveStatus(msg, type) {
    const el = this._saveStatus;
    if (!el) return;
    el.textContent = msg;
    el.style.color =
      type === "ok"
        ? "var(--success, #2da44e)"
        : type === "error"
        ? "var(--danger)"
        : "var(--fg-muted)";
    el.style.opacity = msg ? "1" : "0";
  }

  _updateCount() {
    const countEl = this._q("#kanban-card-count");
    if (!countEl) return;
    const total = this._columns.reduce((n, col) => n + col.cards.length, 0);
    countEl.textContent = total === 1 ? "1 scene" : `${total} scenes`;
  }

  _q(selector) {
    return this._root?.querySelector(selector) ?? null;
  }

  // Local esc kept intentionally: kanban builds HTML in innerHTML strings
  // where the canonical helpers.js esc() is identical in output.
  // Import avoided to keep this module's dependency surface minimal for
  // the one method that uses it (_buildCard menu innerHTML).
  _esc(str) {
    return String(str ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }
}
