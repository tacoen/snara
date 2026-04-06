/* ─────────────────────────────────────────────────
   snara/ui.js — SnaraUI
   Manages tabs, popup toolbar, meta fields, theme.
   Depends on: SnaraTool, SnaraEditor, AppConfig
─────────────────────────────────────────────────── */
import { SnaraTool }   from './tool.js';
import { AppConfig }   from '../snara.js';
import { SnaraEditor } from './core.js';
import icx             from '../icons/ge-icon.js';

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

    // this._bindTabs();
    this._bindPopup();
    this._initTheme();

    const initial = document.querySelector('.tabmenu li.active')?.dataset.tab || 'editor';
    this.switchTab(initial);
  }

  // ── Tabs ──────────────────────────────────────

  _bindTabs() {
    document.querySelector('.tabmenu').addEventListener('click', e => {
      const li = e.target.closest('li[data-tab]');
      if (li) this.switchTab(li.dataset.tab);
    });
  }

	switchTab(tab) {
		const isEditor = tab === 'editor';
		this.entriesEl.hidden  = !isEditor;
		this.editorArea.hidden = !isEditor;
		// .meta visibility is now handled by parent #meta-area via switchArea()
	}


  // ── Popup toolbar ─────────────────────────────

  _bindPopup() {
    this.popup.addEventListener('mouseenter', () => clearTimeout(this._popupTimeout));
    this.popup.addEventListener('mouseleave', () => this.scheduleHidePopup());
  }

  focusEntry(div) {
    if (!div || !this.popup) return;

    this.focusedEntry = div;
    clearTimeout(this._popupTimeout);

    const rect = div.getBoundingClientRect();
    this.popup.style.left = `${rect.right + 8}px`;
    this.popup.style.top  = `${rect.top}px`;
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

  // ── Save to server ────────────────────────────

  async saveDocument() {
    const btn      = document.getElementById('save-btn');
    const filename = document.getElementById('filename').innerText.trim() || 'untitled';
    const bookId   = AppConfig.activeBookId ?? null;

    // Collect entries
    const article = [];
    document.querySelectorAll('.entries .entry').forEach(div => {
      const cls = AppConfig.classes.find(c => div.classList.contains(c)) || 'beat';
      const isRendered = div.children.length > 0 && !div.dataset.editing;
      const html = isRendered
        ? div.innerHTML
        : marked.parse(div.innerText.trim(), { breaks: true });
      article.push({ class: cls, content: html });
    });

    // Collect meta fields
    const meta = {};
    document.querySelectorAll('.meta-field').forEach(row => {
      const key = row.querySelector('.field-key')?.innerText.trim();
      const val = row.querySelector('.field-val')?.innerText.trim();
      if (key) meta[key] = val || '';
    });

    const payload = { filename, bookId, meta, article };

    if (btn) { btn.disabled = true; btn.classList.add('saving'); }

    try {
      const res  = await fetch(AppConfig.apiPath + '?action=doc.save', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok || json.error) throw new Error(json.error || `HTTP ${res.status}`);

      if (btn) {
        btn.classList.remove('saving');
        btn.classList.add('saved');
        setTimeout(() => btn.classList.remove('saved'), 1800);
      }

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

  // ── Load from server ──────────────────────────

  async loadDocument(bookId, filename) {
    const url = AppConfig.apiPath
      + `?action=doc.get&filename=${encodeURIComponent(filename)}&bookId=${encodeURIComponent(bookId)}`;

    try {
      const res  = await fetch(url);
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || `HTTP ${res.status}`);

      this._renderDocument(data);

    } catch (err) {
      console.error('[snara] load failed:', err);
    }
  }

  _renderDocument(data) {
    // ── Update filename in header ──────────────
    const fnEl = document.getElementById('filename');
    if (fnEl) fnEl.innerText = data.filename ?? '';

    // ── Clear and rebuild entries ──────────────
    this.entriesEl.innerHTML = '';

    const article = Array.isArray(data.article) ? data.article : [];

    article.forEach(item => {
      const div = document.createElement('div');
      div.contentEditable = 'true';
      div.className = `entry ${item.class ?? 'beat'}`;
      // content is already stored as rendered HTML
      div.innerHTML = item.content ?? '';

      // Bind entry events via SnaraEditor singleton
      const editor = SnaraEditor.instance ?? null;
      if (editor) editor._bindEntryEvents(div);

      this.entriesEl.appendChild(div);
    });

    // ── Restore meta fields ────────────────────
    const metaFields = this.metaEl.querySelector('.meta-fields');
    if (metaFields && data.meta && typeof data.meta === 'object') {
      metaFields.innerHTML = '';
      Object.entries(data.meta).forEach(([key, val]) => {
        const row = document.createElement('div');
        row.className = 'meta-field';
        row.innerHTML = `
          <span class="field-key" contenteditable spellcheck="false">${_esc(key)}</span>
          <span class="field-sep">:</span>
          <span class="field-val" contenteditable spellcheck="false">${_esc(val)}</span>
          <button class="field-remove" onclick="removeField(this)" title="Remove field">✕</button>
        `;
        metaFields.appendChild(row);
      });
    }

    // ── Switch to editor tab and scroll top ────
    this.switchTab('editor');
    this.entriesEl.scrollTop = 0;
  }

  // ── Meta fields ───────────────────────────────

  addField() {
    const list = document.querySelector('.meta-fields');
    const row  = document.createElement('div');
    row.className = 'meta-field';
    row.innerHTML = `
      <span class="field-key" contenteditable spellcheck="false">field</span>
      <span class="field-sep">:</span>
      <span class="field-val" contenteditable spellcheck="false"></span>
      <button class="field-remove" onclick="removeField(this)" title="Remove"><i data-icon="x"></i></button>
    `;
    list.appendChild(row);
    icx.delayreplace('.meta-field:last-child [data-icon]');
    row.querySelector('.field-key').focus();
  }

  removeField(btn) {
    btn.closest('.meta-field').remove();
  }

  // ── Theme ─────────────────────────────────────

  _initTheme() {
    SnaraTool.applyTheme(SnaraTool.savedTheme());
  }

  toggleTheme() {
    const next = document.documentElement.getAttribute('theme') === 'dark' ? 'light' : 'dark';
    localStorage.setItem('theme', next);
    SnaraTool.applyTheme(next);
    icx.delayreplace('#theme-toggle [data-icon]');
  }
}

// ── Module-private escape helper ──────────────────
function _esc(str) {
  return String(str ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;');
}