import { AppConfig }                  from '../snara.js';
import icx                            from '../icons/ge-icon.js';
import { openModal, closeModal }      from './modal.js';
import { esc, fmtDate, apiFetch, postJson } from '../helpers.js';

function ensureModal(id) {
  if (document.getElementById(id)) return document.getElementById(id);
  const overlay = document.createElement('div');
  overlay.className = 'app-overlay';
  overlay.id = id + '-overlay';
  const modal = document.createElement('div');
  modal.className = 'app-modal idx-modal';
  modal.id = id;
  modal.setAttribute('role', 'dialog');
  modal.setAttribute('aria-modal', 'true');
  document.body.appendChild(overlay);
  document.body.appendChild(modal);
  overlay.addEventListener('click', () => closeModal(id));
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && modal.classList.contains('open')) closeModal(id);
  });

  return modal;
}

export class SnaraIndex {
  static instance = null;
  constructor() {
    SnaraIndex.instance = this;
    this.activeBookId    = AppConfig.activeBookId ?? null;
    this.activeBookTitle = AppConfig.activeBookTitle ?? '';
    this._ensureDOM();
  }

  _ensureDOM() {
    ['book-index-modal', 'chapter-index-modal'].forEach(id => {
      if (document.getElementById(id)) return;
      const modal = document.createElement('div');
      modal.className = 'app-modal idx-modal';
      modal.id = id;
      modal.setAttribute('hidden', '');
      modal.setAttribute('role', 'dialog');
      modal.setAttribute('aria-modal', 'true');
      document.getElementById('app-overlay').appendChild(modal);
    });
  }

  async openBookIndex() {
    const modal = document.getElementById('book-index-modal');
    modal.innerHTML = this._shell('book-index-modal', 'Books', this._bookIndexBody('loading'));
    openModal('book-index-modal');
    icx.delayreplace('#book-index-modal [data-icon]');
    modal.querySelector('#idx-new-book')?.addEventListener('click', () => this._createBook(modal));
    try {
      const books = await apiFetch(AppConfig.apiPath + '?action=book.index');
      modal.querySelector('.idx-body').innerHTML = this._bookListHTML(books);
      this._bindBookRows(modal);
    } catch (e) {
      modal.querySelector('.idx-body').innerHTML =
        `<p class="idx-empty">Could not load books: ${esc(e.message)}</p>`;
    }
  }

  _bookIndexBody(state) {
    if (state === 'loading') return `<p class="idx-empty idx-loading">Loading books…</p>`;
    return '';
  }

  _bookListHTML(books) {
    if (!books.length) {
      return `<p class="idx-empty">No books yet. Create your first one above.</p>`;
    }
    return books.map(b => `
      <div class="idx-row${this.activeBookId == b.id ? ' idx-row-active' : ''}"
           data-book-id="${esc(b.id)}" data-book-title="${esc(b.title)}" role="button" tabindex="0">
        <span class="idx-row-icon"><i data-icon="book"></i></span>
        <span class="idx-row-main">
          <span class="idx-row-title">${esc(b.title || 'untitled')}</span>
          <span class="idx-row-sub">id ${esc(String(b.id))} · ${fmtDate(b.mtime)}</span>
        </span>
        <span class="idx-row-badge">${esc(String(b.chapters ?? 0))} ch</span>
        ${this.activeBookId == b.id
          ? '<span class="idx-row-active-dot" title="Active book"></span>'
          : ''}
      </div>`).join('');
  }

  _bindBookRows(modal) {
    modal.querySelectorAll('.idx-row').forEach(row => {
      const activate = () => {
        const id    = row.dataset.bookId;
        const title = row.dataset.bookTitle;
        this._setActiveBook(id, title);
        closeModal('book-index-modal');
        this.openChapterIndex();
      };
      row.addEventListener('click', activate);
      row.addEventListener('keydown', e => { if (e.key === 'Enter') activate(); });
    });
    icx.delayreplace('#book-index-modal [data-icon]');
  }

  async _createBook(modal) {
    const titleInput = modal.querySelector('#idx-new-book-title');
    const title = titleInput?.value.trim();
    if (!title) { titleInput?.focus(); return; }

    const btn = modal.querySelector('#idx-new-book');
    btn.disabled    = true;
    btn.textContent = 'creating…';

    try {
      const data = await postJson(AppConfig.apiPath + '?action=book.create', { title });
      this._setActiveBook(data.id, title);
      closeModal('book-index-modal');
      this.openChapterIndex();
    } catch (e) {
      btn.disabled    = false;
      btn.textContent = 'Create';
      console.error('[snara] book create failed:', e);
    }
  }

  async _createChapter(modal) {
    const input = modal.querySelector('#idx-new-chapter-file');
    const raw   = input?.value.trim();
    if (!raw) { input?.focus(); return; }

    const filename = raw
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9\-_]/g, '')
      .replace(/-+/g, '-')
      .slice(0, 80);

    if (!filename) { input?.focus(); return; }
    const bookId = this.activeBookId;
    const btn    = modal.querySelector('#idx-new-chapter');
    btn.disabled    = true;
    btn.textContent = 'creating…';
    try {
      await postJson(AppConfig.apiPath + '?action=doc.save', { filename, bookId, meta: {}, article: [] });
      input.value     = '';
      btn.disabled    = false;
      btn.textContent = 'Create';
      const [chapters, states] = await Promise.all([
        apiFetch(AppConfig.apiPath + `?action=book.chapters&id=${encodeURIComponent(bookId)}`),
        this._loadStates(bookId),
      ]);
      const surviving = chapters.filter(ch => states[ch.filename] !== 'delete');
      modal.querySelector('.idx-body').innerHTML = this._chapterListHTML(surviving);
      this._bindChapterRows(modal, states);
      icx.delayreplace('#chapter-index-modal [data-icon]');

    } catch (e) {
      btn.disabled    = false;
      btn.textContent = 'Create';
      console.error('[snara] chapter create failed:', e);
      input.insertAdjacentHTML('afterend',
        `<span style="color:var(--danger);font-size:11px;margin-top:2px">${esc(e.message)}</span>`);
      setTimeout(() => modal.querySelector('.idx-toolbar span[style]')?.remove(), 3000);
    }
  }

  _setActiveBook(id, title) {
    const switching = this.activeBookId != id;
    this.activeBookId    = id;
    this.activeBookTitle = title;
    AppConfig.activeBookId    = id;
    AppConfig.activeBookTitle = title;
    window.dispatchEvent(new CustomEvent('bookchange', {
      detail: { bookId: AppConfig.activeBookId, title: AppConfig.activeBookTitle }
    }));

    const label = document.getElementById('active-book-label');
    if (label) label.textContent = title || `Book ${id}`;
    if (switching) {
      const entries = document.querySelector('.entries');
      if (entries) entries.innerHTML = '';
      const fn = document.getElementById('filename');
      if (fn) fn.innerText = '';
    }

    postJson(AppConfig.apiPath + '?action=book.setActive', { bookId: id }).catch(() => {});
  }

  async openChapterIndex() {
    if (!this.activeBookId) {
      await this.openBookIndex();
      return;
    }

    const modal = document.getElementById('chapter-index-modal');
    const title = this.activeBookTitle || `Book ${this.activeBookId}`;
    modal.innerHTML = this._shell('chapter-index-modal', `${title}`,
      `<p class="idx-empty idx-loading">Loading chapters…</p>`);
    openModal('chapter-index-modal');

    modal.querySelector('#idx-new-chapter')?.addEventListener('click', () => this._createChapter(modal));
    modal.querySelector('#idx-new-chapter-file')?.addEventListener('keydown', e => {
      if (e.key === 'Enter') this._createChapter(modal);
    });

    try {
      const [chapters, states] = await Promise.all([
        apiFetch(AppConfig.apiPath + `?action=book.chapters&id=${encodeURIComponent(this.activeBookId)}`),
        this._loadStates(this.activeBookId),
      ]);

      const toDelete = chapters.filter(ch => states[ch.filename] === 'delete');
      if (toDelete.length > 0) {
        await Promise.all(toDelete.map(ch =>
          fetch(
            AppConfig.apiPath
              + '?action=doc.delete'
              + `&filename=${encodeURIComponent(ch.filename)}`
              + `&bookId=${encodeURIComponent(this.activeBookId)}`,
            { method: 'DELETE' }
          ).then(() => {
            delete states[ch.filename];
            this._saveState(this.activeBookId, ch.filename, 'unlock');
          })
        ));
      }

      const surviving = chapters.filter(ch => states[ch.filename] !== 'delete');
      modal.querySelector('.idx-body').innerHTML = this._chapterListHTML(surviving);
      this._bindChapterRows(modal, states);

    } catch (e) {
      modal.querySelector('.idx-body').innerHTML =
        `<p class="idx-empty">Could not load chapters: ${esc(e.message)}</p>`;
    }

    icx.delayreplace('#chapter-index-modal [data-icon]');
  }

  _chapterListHTML(chapters) {
    if (!chapters.length) {
      return `<p class="idx-empty">No chapters saved yet in this book.</p>`;
    }

    const groups  = [];
    const actSeen = new Map();

    for (const ch of chapters) {
      const actLabel = ch.act || '';
      if (actSeen.has(actLabel)) {
        groups[actSeen.get(actLabel)].chapters.push(ch);
      } else {
        actSeen.set(actLabel, groups.length);
        groups.push({ act: actLabel, chapters: [ch] });
      }
    }

    let html = '';
    let globalIdx = 0;

    for (const group of groups) {
      if (group.act) {
        html += `<div class="idx-act-header">${esc(group.act)}</div>`;
      }
      for (const ch of group.chapters) {
        globalIdx++;
        html += `
<div class="idx-row" data-filename="${esc(ch.filename)}"
     data-book-id="${esc(String(this.activeBookId))}"
     data-order="${ch.order}"
     role="button" tabindex="0" draggable="true">
  <span class="idx-drag-handle" title="Drag to reorder">&#10303;</span>
  <span class="idx-row-num">${globalIdx - 1}</span>
          <span class="idx-row-main">
            <span class="idx-row-title">${esc(ch.title || ch.filename)}</span>
            <span class="idx-row-sub">${fmtDate(ch.mtime)}${ch.order !== 99 ? ` · #${ch.order}` : ''}</span>
          </span>
          <span class="idx-row-badge">${esc(String(ch.entries ?? 0))} entries</span>
          <span class="idx-row-tool" data-state="unlock" title="Click to cycle: unlock -> lock -> delete">
            <i class="lock"   data-icon="lock"></i>
            <i class="unlock" data-icon="lock-open-2"></i>
            <i class="delete" data-icon="x"></i>
          </span>
        </div>`;
      }
    }

    return html;
  }

  _bindDnd(modal, bookId) {
    const body = modal.querySelector('.idx-body');
    let dragSrc = null;
    const rows = () => [...body.querySelectorAll('.idx-row:not([hidden])')];
    body.querySelectorAll('.idx-row').forEach(row => {
      row.addEventListener('dragstart', e => {
        dragSrc = row;
        row.classList.add('idx-row-dragging');
        e.dataTransfer.effectAllowed = 'move';
      });

      row.addEventListener('dragend', () => {
        dragSrc?.classList.remove('idx-row-dragging');
        body.querySelectorAll('.idx-row').forEach(r => r.classList.remove('idx-row-drag-over'));
        dragSrc = null;
      });

      row.addEventListener('dragover', e => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        if (row === dragSrc) return;
        body.querySelectorAll('.idx-row').forEach(r => r.classList.remove('idx-row-drag-over'));
        row.classList.add('idx-row-drag-over');
      });

      row.addEventListener('drop', e => {
        e.preventDefault();
        if (!dragSrc || dragSrc === row) return;
        row.classList.remove('idx-row-drag-over');
        const allRows = rows();
        const fromIdx = allRows.indexOf(dragSrc);
        const toIdx   = allRows.indexOf(row);
        if (fromIdx < toIdx) row.after(dragSrc);
        else                 row.before(dragSrc);
        this._renumberAndSave(modal, bookId);
      });
    });
  }

  _renumberAndSave(modal, bookId) {
    const rows = [...modal.querySelectorAll('.idx-body .idx-row:not([hidden])')];
    rows.forEach((row, i) => {
      const numEl = row.querySelector('.idx-row-num');
      if (numEl) numEl.textContent = i;
      row.dataset.order = i;
      const filename = row.dataset.filename;
      if (!filename) return;
      postJson(AppConfig.apiPath + '?action=doc.setOrder', { bookId, filename, order: i })
        .catch(() => {});
    });
  }

  _bindChapterRows(modal, states = {}) {
    const bookId = this.activeBookId;
    modal.querySelectorAll('.idx-row').forEach(row => {
      const filename = row.dataset.filename;
      const tool     = row.querySelector('.idx-row-tool');
      if (tool && states[filename] && states[filename] !== 'unlock') {
        tool.dataset.state = states[filename];
      }
    });

    this._bindDnd(modal, bookId);

    icx.delayreplace('#chapter-index-modal [data-icon]');

    modal.querySelectorAll('.idx-row').forEach(row => {
      const filename  = row.dataset.filename;
      const tool      = row.querySelector('.idx-row-tool');
      const onRowClick = (e) => {
        if (e.target.closest('.idx-row-tool')) return;
        if (tool?.dataset.state === 'lock') return;
        closeModal('chapter-index-modal');
		closeModal('book-index-modal');
        window.loadDocument?.(row.dataset.bookId, filename);
      };

      row.addEventListener('click', onRowClick);
      row.addEventListener('keydown', e => { if (e.key === 'Enter') onRowClick(e); });
      if (tool) {
        tool.addEventListener('click', e => {
          e.stopPropagation();
          const cycle   = { unlock: 'lock', lock: 'delete', delete: 'unlock' };
          const current = tool.dataset.state || 'unlock';
          const next    = cycle[current] ?? 'unlock';
          tool.dataset.state = next;
          states[filename]   = next;
          this._saveState(bookId, filename, next);
        });
      }
    });
  }

  async _loadStates(bookId) {
    if (!bookId) return {};
    try {
      const data = await apiFetch(AppConfig.apiPath + `?action=state.get&bookId=${encodeURIComponent(bookId)}`);
      return data.states ?? {};
    } catch {
      return {};
    }
  }

  _saveState(bookId, filename, state) {
    if (!bookId) return;
    postJson(AppConfig.apiPath + '?action=state.set', { bookId, filename, state })
      .catch(() => {});
  }

  _shell(id, heading, bodyHTML) {
    return `
      <div class="modal-header">
        <div class='flex'>
          <span class="modal-title">${esc(heading)}</span>
          ${ id !== 'book-index-modal' ? `<ul class='opt-menu'>
              <li><i data-icon="photo"></i><span>Cover</span></li>
            </ul>` : ''}
        </div>
        <button class="modal-close" onclick="closeModal('${id}')" title="Close">
          <i data-icon="x"></i>
        </button>
      </div>
      <div class="idx-toolbar">
        ${id === 'book-index-modal' ? `
        <div class="idx-create-row">
          <input class="cfg-input" id="idx-new-book-title" placeholder="New book title…">
          <button class="btn-mini primary" id="idx-new-book">Create</button>
        </div>` : `
        <div class="idx-create-row">
          <input class="cfg-input" id="idx-new-chapter-file" placeholder="New file…">
          <button class="btn-mini primary" id="idx-new-chapter">Create</button>
        </div>`}
      </div>
        <div class="idx-body modal-body">
          ${bodyHTML}
        </div>
      </div>`;
  }

  _filter(input, modalId) {
    const q = input.value.toLowerCase();
    document.querySelectorAll(`#${modalId} .idx-row`).forEach(row => {
      const text = row.querySelector('.idx-row-title')?.textContent.toLowerCase() ?? '';
      row.hidden = !text.includes(q);
    });
    document.querySelectorAll(`#${modalId} .idx-act-header`).forEach(header => {
      let next = header.nextElementSibling;
      let hasVisible = false;
      while (next && !next.classList.contains('idx-act-header')) {
        if (!next.hidden) hasVisible = true;
        next = next.nextElementSibling;
      }
      header.hidden = !hasVisible;
    });
  }
}

window.closeModal = closeModal;
