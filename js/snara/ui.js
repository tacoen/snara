import { SnaraTool }             from './tools.js';
import { AppConfig, AppDefaults } from '../snara.js';
import { SnaraEditor }           from './core.js';
import icx                       from '../icons/ge-icon.js';
import { esc, apiFetch, postJson } from '../helpers.js';

export class SnaraUI {
  static instance = null;

  constructor() {
    SnaraUI.instance = this;
    this.article       = document.getElementById('article');
    this.entriesEl     = this.article.querySelector('.entries');
    this.metaEl        = document.querySelector('.meta');
    this.editorArea    = document.querySelector('.editor-area');
    this.popup         = document.getElementById('popup');
    this.focusedEntry  = null;
    this._popupTimeout = null;
    this._bindPopup();
    this._initTheme();
    const initial = document.querySelector('.tabmenu li.active')?.dataset.tab || 'editor';
    this.switchTab(initial);
  }

  switchTab(tab) {
    const isEditor = tab === 'editor';
    this.entriesEl.hidden  = !isEditor;
    this.editorArea.hidden = !isEditor;
  }

  _bindPopup() {
    this.popup.addEventListener('mouseenter', () => clearTimeout(this._popupTimeout));
    this.popup.addEventListener('mouseleave', () => this.scheduleHidePopup());
  }

  focusEntry(div) {
    if (!div || !this.popup) return;
    this.focusedEntry = div;
    clearTimeout(this._popupTimeout);
    const rect       = div.getBoundingClientRect();
    const popupWidth = this.popup.offsetWidth;
    const rcenter    = `${rect.left + (rect.width / 2) - (popupWidth / 2)}`;

    this.popup.style.left = `${rcenter}px`;
    this.popup.style.top  = `${rect.top - 18}px`;
    this.popup.classList.add('visible');

    const currentClass = SnaraEditor.CLASSES.find(c => div.classList.contains(c));
    this.popup.querySelectorAll('.pop-pill').forEach(pill => pill.classList.remove('sel'));
    if (currentClass) {
      this.popup.querySelector(`.pop-pill.${currentClass}`)?.classList.add('sel');
    }
  }

  scheduleHidePopup() {
    this._popupTimeout = setTimeout(() => {
      if (!this.popup.matches(':hover')) this.popup.classList.remove('visible');
    }, 180);
  }

  setEntryClass(cls) {
    const div = this.focusedEntry;
    if (!div) return;
    const already = div.classList.contains(cls);
    div.classList.remove(...SnaraEditor.CLASSES);
    this.popup.querySelectorAll('.pop-pill').forEach(p => p.classList.remove('sel'));
    if (!already) {
      div.classList.add(cls);
      this.popup.querySelector(`.pop-pill.${cls}`)?.classList.add('sel');
    }
  }

  removeEntry() {
    if (!this.focusedEntry) return;
    this.focusedEntry.remove();
    this.focusedEntry = null;
    this.popup.classList.remove('visible');
  }

  async saveDocument() {
    const btn      = document.getElementById('save-btn');
    const filename = document.getElementById('filename').innerText.trim() || 'untitled';
    const bookId   = AppConfig.activeBookId ?? null;

    // commit any open entry first so its HTML is rendered before collection
    const openEntry = this.entriesEl.querySelector('.entry[data-editing]');
    if (openEntry) SnaraEditor.instance?._commitEntry(openEntry);

    const article = [];
    this.entriesEl.querySelectorAll('.entry').forEach(div => {
      const cls  = AppConfig.classes.find(c => div.classList.contains(c)) || 'beat';
      const html = div.children.length > 0
        ? div.innerHTML
        : marked.parse(div.innerText.trim(), { breaks: true });
      article.push({ class: cls, content: html });
    });

    const meta = {};
    document.querySelectorAll('.meta-field').forEach(row => {
      const key = row.dataset.key || row.querySelector('.field-key')?.innerText.trim();
      if (!key) return;
      const pillContainer = row.querySelector('.field-pills');
      if (pillContainer) {
        const vals = [...pillContainer.querySelectorAll('.field-pill')]
          .map(p => (p.querySelector('.pill-text') ?? p.firstChild)?.textContent.trim() ?? '')
          .filter(Boolean);
        meta[key] = vals.join(', ');
      } else {
        meta[key] = row.querySelector('.field-val')?.innerText.trim() || '';
      }
    });

    const payload = { filename, bookId, meta, article };
    if (btn) { btn.disabled = true; btn.classList.add('saving'); }

    try {
      await postJson(AppConfig.apiPath + '?action=doc.save', payload);
      if (btn) {
        btn.classList.remove('saving');
        btn.classList.add('saved');
        setTimeout(() => btn.classList.remove('saved'), 1800);
      }
      // clear dirty indicators — document is now in sync with saved state
      this.entriesEl.querySelectorAll('.entry[data-advice]').forEach(el =>
        delete el.dataset.advice
      );
    } catch (err) {
      if (btn) {
        btn.classList.remove('saving');
        btn.classList.add('save-error');
        setTimeout(() => btn.classList.remove('save-error'), 2500);
      }
      console.error('[snara] save failed:', err);
    } finally {
      if (btn) btn.disabled = false;
    }
  }

  async loadDocument(bookId, filename, tab = 'editor') {
    const url = AppConfig.apiPath
      + `?action=doc.get&filename=${encodeURIComponent(filename)}&bookId=${encodeURIComponent(bookId)}`;
    try {
      const data = await apiFetch(url);
      this._renderDocument(data, tab);
    } catch (err) {
      console.error('[snara] load failed:', err);
    }
  }

  _renderDocument(data, tab = 'editor') {

// guard against discarding unsaved work
    if (SnaraEditor.instance?._isDirty()) {
      const ok = confirm('You have unsaved edits. Discard and load new document?');
      if (!ok) return;
      // strip editing state directly — DOM is about to be wiped,
      // no need to commit or dirty-check, just clean the attributes.
      const open = this.entriesEl.querySelector('.entry[data-editing]');
      if (open) {
        delete open.dataset.editing;
        delete open.dataset.originalHtml;
      }
    }
	
    const fnEl = document.getElementById('filename');
    if (fnEl) fnEl.innerText = data.filename ?? '';
    if (this.article) {
      this.article.dataset.filename = data.filename ?? '';
      this.article.dataset.bookid   = AppConfig.activeBookId ?? '';
    }

    try {
      localStorage.setItem('page', tab);
      localStorage.setItem('editor-filename', data.filename ?? '');
      localStorage.setItem('bookid', String(AppConfig.activeBookId ?? ''));
    } catch { }

    const bookTitle = AppConfig.activeBookTitle;
    document.title = data.filename
      ? (bookTitle ? `Snara — ${bookTitle} : ${data.filename}` : `Snara — ${data.filename}`)
      : 'Snara';

    this.entriesEl.innerHTML = '';
    const article = Array.isArray(data.article) ? data.article : [];
    article.forEach(item => {
      const div = document.createElement('div');
      div.contentEditable = 'true';
      div.className = `entry ${item.class ?? 'beat'}`;
      div.innerHTML = item.content ?? '';
      const editor = SnaraEditor.instance ?? null;
      if (editor) editor._bindEntryEvents(div);
      this.entriesEl.appendChild(div);
    });

    const metaFields = this.metaEl.querySelector('.meta-fields');
    if (metaFields) {
      metaFields.innerHTML = '';
      const savedMeta     = (data.meta && typeof data.meta === 'object') ? data.meta : {};

	  const defaultFields = AppDefaults.metaFields ?? ['characters', 'settings', 'prompts'];	  

      const keys = [
        ...Object.keys(savedMeta),
        ...defaultFields.filter(k => !Object.keys(savedMeta).includes(k)),
      ];
      keys.forEach(key => {
        metaFields.appendChild(this._buildMetaRow(key, savedMeta[key] ?? ''));
      });
    }

    document.getElementById('add-field-btn').onclick = () => this.addField();

    this.switchTab(tab);
    this.entriesEl.scrollTop = 0;
  }

  _buildMetaRow(key, val) {
    const PILL_FIELDS = ['characters', 'settings'];
    const isOrder     = key === 'order';
    const isPill      = PILL_FIELDS.includes(key);

    const row = document.createElement('div');
    row.className = 'meta-field';

    if (isOrder) {
      row.dataset.key = key;
      row.innerHTML = `
        <span class="field-key">${esc(key)}</span>
        <span class="field-sep">:</span>
        <span class="field-val field-val--readonly">${esc(val)}</span>
      `;
      return row;
    }

    if (isPill) {
      row.dataset.key = key;
      const pills = String(val || '').split(',').map(s => s.trim()).filter(Boolean);
      row.innerHTML = `
        <span class="field-key" style="cursor:pointer" onclick="SnaraAIToolbar.helper('${esc(key)}')" title="Auto-populate from article">${esc(key)}</span>
        <span class="field-sep">:</span>
        <div class="field-pills">
          ${pills.map(p => `<span class="field-pill"><span class="pill-text">${esc(p)}</span><button class="pill-remove" data-val="${esc(p)}" title="Remove">x</button></span>`).join('')}
          <input class="pill-input" type="text" placeholder="add…" spellcheck="false">
        </div>
        <button class="field-remove" title="Remove field">x</button>
      `;
      const input = row.querySelector('.pill-input');
      row.querySelectorAll('.field-pill').forEach(pillEl => {
        const v = pillEl.querySelector('.pill-text')?.textContent.trim();
        if (v) this._bindPillSearch(pillEl, v);
      });
      input.addEventListener('keydown', e => {
        if (e.key === 'Enter' || e.key === ',') {
          e.preventDefault();
          const v = input.value.replace(',', '').trim();
          if (v) { this._addPill(input, v); input.value = ''; }
        }
      });
      row.querySelector('.field-pills').addEventListener('click', e => {
        if (e.target.classList.contains('pill-remove')) {
          e.target.closest('.field-pill').remove();
        }
      });
      row.querySelector('.field-remove').addEventListener('click', () => row.remove());
      return row;
    }

    // default — contenteditable key and value
    row.innerHTML = `
      <span class="field-key" contenteditable spellcheck="false">${esc(key)}</span>
      <span class="field-sep">:</span>
      <span class="field-val" contenteditable spellcheck="false">${esc(val)}</span>
      <button class="field-remove" title="Remove field">x</button>
    `;
    row.querySelector('.field-remove').addEventListener('click', () => row.remove());
    return row;
  }

  _bindPillSearch(pillEl, value) {
    const pillText = pillEl.querySelector('.pill-text');
    if (!pillText) return;
    pillText.style.cursor = 'pointer';
    pillText.title = `Search "${value}"`;

    pillText.addEventListener('click', (e) => {
      e.stopImmediatePropagation();

      const bid         = AppConfig.activeBookId;
      const url         = `${AppConfig.apiPath}?action=query.search&bookId=${encodeURIComponent(bid)}&query=${encodeURIComponent(value.trim())}`;
      const contentArea = document.querySelector('aside .content');
      if (!contentArea) return;

      contentArea.innerHTML = '<div class="loading">Loading...</div>';

      fetch(url)
        .then(r => r.json())
        .then(data => {
          if (data.error) { contentArea.innerHTML = `<p class='danger'>${data.error}</p>`; return; }
          let html = `<div class='header between'>
            <h4>Found ${data.count} paragraph(s) for <code>${data.query}</code></h4>
            <button class="btn-mini naked">Keep checked</button></div>`;
          data.results.forEach(item => {
            html += `<div class="query" data-id="${item.id}">
              <div class="header"><input type="checkbox" class="query-check" checked data-id="${item.id}"><small><strong>${item.filename}</strong> — ${item.class}</small></div>
              <div class="text">${item.content}</div>
            </div>`;
          });
          contentArea.innerHTML = html;
          contentArea.querySelector('.build-results-btn')?.addEventListener('click', () => {
            this._buildResults(bid, value.trim(), contentArea);
          });
        })
        .catch(err => {
          console.error('[query.search]', err);
          contentArea.innerHTML = `<p class='danger'>Error searching for "${value}"</p>`;
        });
    });
  }

  _buildResults(bid, query, contentArea) {
    const unchecked = [...contentArea.querySelectorAll('.query-check:not(:checked)')]
      .map(cb => cb.dataset.id)
      .filter(Boolean);

    fetch(`${AppConfig.apiPath}?action=query.build`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ bookId: bid, query, remove: unchecked }),
    })
      .then(r => r.json())
      .then(data => {
        if (data.error) { console.error('[query.build]', data.error); return; }
        unchecked.forEach(id => {
          contentArea.querySelector(`.query[data-id="${id}"]`)?.remove();
        });
        const remaining = contentArea.querySelectorAll('.query').length;
        const h4 = contentArea.querySelector('h4');
        if (h4) h4.textContent = `${remaining} paragraph(s) kept for "${query}"`;
      })
      .catch(err => console.error('[query.build] fetch failed:', err));
  }

  _addPill(inputEl, value) {
    const pill = document.createElement('span');
    pill.className = 'field-pill';
    const safeValue = esc(value);
    pill.innerHTML = `<span class="pill-text">${safeValue}</span><button class="pill-remove" data-val="${safeValue}" title="Remove">x</button>`;
    pill.querySelector('.pill-remove').addEventListener('click', (e) => {
      e.stopImmediatePropagation();
      pill.remove();
    });
    this._bindPillSearch(pill, value);
    inputEl.parentElement.insertBefore(pill, inputEl);
  }

  addField() {
    const list = document.querySelector('.meta-fields');
    const row  = this._buildMetaRow('field', '');
    list.appendChild(row);
    icx.delayreplace('.meta-field:last-child [data-icon]');
    row.querySelector('.field-key')?.focus();
  }

  removeField(btn) {
    btn.closest('.meta-field').remove();
  }

  _initTheme() {
    SnaraTool.applyTheme(SnaraTool.savedTheme());
  }

  toggleTheme(theme) {
    const next = theme ?? (
      document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark'
    );
    localStorage.setItem('theme', next);
    SnaraTool.applyTheme(next);
    icx.delayreplace('#theme-toggle [data-icon]');
  }
}