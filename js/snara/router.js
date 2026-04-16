
import { AppConfig } from '../snara.js';
const APP_NAME      = 'Snara';
const FILE_SECTIONS = ['import', 'export', 'gallery', 'cache'];
const BOOK_AREAS    = ['editor', 'meta', 'kanban'];
const GLOBAL_AREAS  = {
  chatbot: 'AI Assistant',
  notes:   'Notes',
};

export class SnaraRouter {
  static instance = null;
  constructor() {
    SnaraRouter.instance = this;
    this._busy      = false;
    this._rawSwitch = null;
    this._rawLoad   = null;
    window.addEventListener('popstate', () => this._dispatch(this._read()));
    window.navigate = (page, bookId = null, file = null) => this.go(page, bookId, file);
  }

  registerRawSwitch(fn) { this._rawSwitch = fn; }
  registerRawLoad(fn)   { this._rawLoad   = fn; }

  boot() {
    const params = this._read();
    if (!params.p) {
      const page = this._ls('page');
      const bid  = this._ls('bookid');
      const file = this._ls('editor-filename');
      if (page) { this.go(page, bid || null, file || null); return; }
      this._title();
      return;
    }

    this._dispatch(params);
  }

go(page, bookId = null, file = null) {
  if (this._busy) return;
  this._busy = true;

  // Carry the current file forward when switching between editor/meta
  if (!file && (page === 'editor' || page === 'meta')) {
    file = this._ls('editor-filename') || null;
  }

  this._push(page, bookId, file);
  this._persist(page, bookId, file);
  this._dispatch({ p: page, bid: bookId, file });
  this._busy = false;
}

  _dispatch({ p, bid, file }) {
    if (!p) return;
    if (p === 'books')         { this._title('Books');    window.SnaraIndex?.instance?.openBookIndex();    return; }
    if (p === 'chapters')      { this._title('Chapters'); window.SnaraIndex?.instance?.openChapterIndex(); return; }
    if (p === 'configuration') { this._title('Settings'); window.openSettings?.();                         return; }
    if (p === 'pref')          { this._title('Prefs');    window.openPref?.();                             return; }
    if (p in GLOBAL_AREAS) {
      this._rawSwitch?.(p);
      this._title(GLOBAL_AREAS[p]);
      return;
    }

    const bookId = bid || AppConfig.activeBookId;
    if (!bookId) { this._title(); return; }
    this._activateBook(bookId);
    if (FILE_SECTIONS.includes(p)) {
      this._rawSwitch?.('files');
      setTimeout(() => window.SnaraFiles?.instance?.switchSection?.(p), 0);
      this._title();
      return;
    }

    if (p === 'editor') {
  this._rawSwitch?.('editor');
  if (file) {
    setTimeout(() => this._rawLoad?.(bookId, file, 'editor'), 0)
    this._titleFile(file);
  } else {
    this._title();
  }
  return;
    }


if (BOOK_AREAS.includes(p)) {
  if (file && p === 'meta') {
    setTimeout(() => this._rawLoad?.(bookId, file, 'meta'), 0);
  } 
  this._rawSwitch?.(p);
  this._title();
  return;
}

    this._title();
  }

  _persist(page, bookId, file) {
    try {
      if (page)   localStorage.setItem('page',   page);
      if (bookId) localStorage.setItem('bookid', String(bookId));
	if (page === 'editor' || page === 'meta') localStorage.setItem('editor-filename', file ?? '');	  
    } catch {  }
  }

  _ls(key) {
    try { return localStorage.getItem(key) || ''; } catch { return ''; }
  }

  _read() {
    const qs = new URLSearchParams(location.search);
    return {
      p:    qs.get('p')    || '',
      bid:  qs.get('bid')  || '',
      file: qs.get('file') || '',
    };
  }

  _push(page, bookId, file) {
    const qs = new URLSearchParams();
    if (page)   qs.set('p',   page);
    if (bookId) qs.set('bid', String(bookId));
    if (file)   qs.set('file', file);
    const url = qs.toString() ? `?${qs}` : '/';
    if (location.search !== url) history.pushState(null, '', url);
  }

  _title(subtitle = null) {
    const book = AppConfig.activeBookTitle || null;
    document.title = subtitle
      ? `${APP_NAME} — ${subtitle}`
      : book ? `${APP_NAME} — ${book}` : APP_NAME;
  }

  _titleFile(filename) {
    const book = AppConfig.activeBookTitle;
    document.title = book
      ? `${APP_NAME} — ${book} : ${filename}`
      : `${APP_NAME} — ${filename}`;
  }

  _activateBook(bookId) {
    if (String(AppConfig.activeBookId) === String(bookId)) return;
    const idx = window.SnaraIndex?.instance;
    if (idx?._setActiveBook) {
      const label = document.getElementById('active-book-label')?.textContent;
      idx._setActiveBook(bookId, (label && label !== '—') ? label : `Book ${bookId}`);
    } else {
      AppConfig.activeBookId    = bookId;
      AppConfig.activeBookTitle = `Book ${bookId}`;
      window.dispatchEvent(new CustomEvent('bookchange', {
        detail: { bookId, title: AppConfig.activeBookTitle },
      }));
    }
  }

  static pageFor(area) {
    const map = {
      editor:  'editor',
      meta:    'meta',
      kanban:  'kanban',
      files:   'import',
      ...Object.fromEntries(Object.keys(GLOBAL_AREAS).map(k => [k, k])),
    };
    return map[area] ?? area;
  }

}