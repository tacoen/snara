
import { SnaraTool }   from './tool.js';
import { AppConfig }   from '../snara.js';
import { SnaraEditor } from './core.js';
import icx             from '../icons/ge-icon.js';
import { esc } from '../helpers.js';

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
    const rect = div.getBoundingClientRect();
	const popupWidth = this.popup.offsetWidth;
	const rcenter = `${rect.left + (rect.width / 2) - (popupWidth / 2)}`

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
    const article = [];
    document.querySelectorAll('.entries .entry').forEach(div => {
      const cls = AppConfig.classes.find(c => div.classList.contains(c)) || 'beat';
      const isRendered = div.children.length > 0 && !div.dataset.editing;
      const html = isRendered
        ? div.innerHTML
        : marked.parse(div.innerText.trim(), { breaks: true });
      article.push({ class: cls, content: html });
    });

// Replace the meta collect block in saveDocument():
const meta = {};
document.querySelectorAll('.meta-field').forEach(row => {
  const key = row.dataset.key || row.querySelector('.field-key')?.innerText.trim();
  if (!key) return;

  const pillContainer = row.querySelector('.field-pills');
  if (pillContainer) {
    // Pill field — collect all pill spans, ignore the input
    const vals = [...pillContainer.querySelectorAll('.field-pill')]
      .map(p => p.firstChild.textContent.trim())
      .filter(Boolean);
    meta[key] = vals.join(', ');
  } else {
    meta[key] = row.querySelector('.field-val')?.innerText.trim() || '';
  }
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
  const fnEl = document.getElementById('filename');
  if (fnEl) fnEl.innerText = data.filename ?? '';
  if (this.article) {
    this.article.dataset.filename = data.filename ?? '';
    this.article.dataset.bookid   = AppConfig.activeBookId ?? '';
  }

  try {
    localStorage.setItem('page', 'editor');
    localStorage.setItem('editor-filename', data.filename ?? '');
    localStorage.setItem('bookid',   String(AppConfig.activeBookId ?? ''));
  } catch {  }

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
if (metaFields && data.meta && typeof data.meta === 'object') {
  metaFields.innerHTML = '';
  Object.entries(data.meta).forEach(([key, val]) => {
    metaFields.appendChild(this._buildMetaRow(key, val));
  });
}

document.getElementById('add-field-btn').onclick = () => this.addField();


    this.switchTab('editor');
    this.entriesEl.scrollTop = 0;
  }

/*
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
*/
  
// New method — builds one meta row based on field type
_buildMetaRow(key, val) {
  const PILL_FIELDS = ['characters', 'settings'];
  const isOrder     = key === 'order';
  const isPill      = PILL_FIELDS.includes(key);

  const row = document.createElement('div');
  row.className = 'meta-field';

  if (isOrder) {
    row.dataset.key = key;          // readonly — key never changes
    row.innerHTML = `
      <span class="field-key">${esc(key)}</span>
      <span class="field-sep">:</span>
      <span class="field-val field-val--readonly">${esc(val)}</span>
    `;
    return row;
  }

  if (isPill) {
    row.dataset.key = key;          // pill key is fixed (characters/settings)
    const pills = String(val || '').split(',').map(s => s.trim()).filter(Boolean);
    row.innerHTML = `
      <span class="field-key">${esc(key)}</span>
      <span class="field-sep">:</span>
      <div class="field-pills">
        ${pills.map(p => `
          <span class="field-pill">
            ${esc(p)}<button class="pill-remove" data-val="${esc(p)}" title="Remove">×</button>
          </span>`).join('')}
        <input class="pill-input" type="text" placeholder="add…" spellcheck="false">
      </div>
      <button class="field-remove" title="Remove field">✕</button>
    `;
    const input = row.querySelector('.pill-input');
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

  // Default — contenteditable, key is editable so do NOT fix dataset.key
  // saveDocument() reads key from .field-key innerText for these rows
  row.innerHTML = `
    <span class="field-key" contenteditable spellcheck="false">${esc(key)}</span>
    <span class="field-sep">:</span>
    <span class="field-val" contenteditable spellcheck="false">${esc(val)}</span>
    <button class="field-remove" title="Remove field">✕</button>
  `;
  row.querySelector('.field-remove').addEventListener('click', () => row.remove());
  return row;
}


_addPill(inputEl, value) {
  const pill = document.createElement('span');
  pill.className = 'field-pill';
  pill.innerHTML = `${esc(value)}<button class="pill-remove" data-val="${esc(value)}" title="Remove">×</button>`;
  pill.querySelector('.pill-remove').addEventListener('click', () => pill.remove());
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
		  		console.log(next);

    SnaraTool.applyTheme(next);
    icx.delayreplace('#theme-toggle [data-icon]');
  }
}

