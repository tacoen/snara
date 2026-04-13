/* ─────────────────────────────────────────────────
   js/snara/router.js — SnaraRouter

   Flat query-string routing. No path segments.
   No .htaccess needed. Works everywhere.

   URL scheme:
     /                              → restore from localStorage
     ?p=editor&bid=1&file=chapter1  → book 1, editor, file open
     ?p=editor&bid=1                → book 1, editor, no file
     ?p=meta&bid=1                  → book 1, meta area
     ?p=kanban&bid=1                → book 1, kanban area
     ?p=chatbot                     → AI chatbot (no bid required)
     ?p=notes                       → notes (no bid required)
     ?p=import&bid=1                → book 1, files › import
     ?p=export&bid=1                → book 1, files › export
     ?p=gallery&bid=1               → book 1, files › gallery
     ?p=cache&bid=1                 → book 1, files › cache
     ?p=books                       → book index modal
     ?p=chapters                    → chapter index modal
     ?p=configuration               → settings modal
     ?p=pref                        → pref modal

   localStorage keys:
     page             — last page name
     bookid           — last active book id
     editor-filename  — last open filename (editor only)

   Loop prevention:
     _rawSwitch and _rawLoad are the PRE-WRAP originals.
     _dispatch always calls those — never window.switchArea
     or window.loadDocument — so the wrappers never fire
     from inside the router.
─────────────────────────────────────────────────── */

import { AppConfig } from '../snara.js';

const APP_NAME      = 'Snara';
const FILE_SECTIONS = ['import', 'export', 'gallery', 'cache'];
const BOOK_AREAS    = ['editor', 'meta', 'kanban']; // bid required
const GLOBAL_AREAS  = {                              // bid never required
  chatbot: 'AI Assistant',
  notes:   'Notes',
};

export class SnaraRouter {

  static instance = null;

  constructor() {
    SnaraRouter.instance = this;
    this._busy      = false;
    this._rawSwitch = null; // set by snara.js before boot()
    this._rawLoad   = null; // set by snara.js before boot()

    window.addEventListener('popstate', () => this._dispatch(this._read()));
    window.navigate = (page, bookId = null, file = null) => this.go(page, bookId, file);
  }

  // ── Register raw pre-wrap functions ───────────
  // Call these from snara.js BEFORE wrapping.

  registerRawSwitch(fn) { this._rawSwitch = fn; }
  registerRawLoad(fn)   { this._rawLoad   = fn; }

  // ── Boot ──────────────────────────────────────

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

  // ── Public entry point ────────────────────────

  go(page, bookId = null, file = null) {
    if (this._busy) return;
    this._busy = true;
    this._push(page, bookId, file);
    this._persist(page, bookId, file);
    this._dispatch({ p: page, bid: bookId, file });
    this._busy = false;
  }

  // ── Core dispatcher ───────────────────────────
  // ONLY uses this._rawSwitch and this._rawLoad.
  // Never calls window.switchArea or window.loadDocument.

  _dispatch({ p, bid, file }) {
    if (!p) return;

    // ── Modals (no bookid) ────────────────────
    if (p === 'books')         { this._title('Books');    window.SnaraIndex?.instance?.openBookIndex();    return; }
    if (p === 'chapters')      { this._title('Chapters'); window.SnaraIndex?.instance?.openChapterIndex(); return; }
    if (p === 'configuration') { this._title('Settings'); window.openSettings?.();                         return; }
    if (p === 'pref')          { this._title('Prefs');    window.openPref?.();                             return; }

    // ── Global areas — bid never required ─────
    // To add a new one: extend GLOBAL_AREAS at the top. No code changes here.
    if (p in GLOBAL_AREAS) {
      this._rawSwitch?.(p);
      this._title(GLOBAL_AREAS[p]);
      return;
    }

    // ── Pages that need a bookid ──────────────
    const bookId = bid || AppConfig.activeBookId;
    if (!bookId) { this._title(); return; }

    this._activateBook(bookId);

    // Files sections
    if (FILE_SECTIONS.includes(p)) {
      this._rawSwitch?.('files');
      setTimeout(() => window.SnaraFiles?.instance?.switchSection?.(p), 0);
      this._title();
      return;
    }

    // Editor
    if (p === 'editor') {
      this._rawSwitch?.('editor');
      if (file) {
        setTimeout(() => this._rawLoad?.(bookId, file), 0);
        this._titleFile(file);
      } else {
        this._title();
      }
      return;
    }

    // Meta / Kanban
    if (BOOK_AREAS.includes(p)) {
      this._rawSwitch?.(p);
      this._title();
      return;
    }

    // Unknown fallback
    this._title();
  }

  // ── localStorage ──────────────────────────────

  _persist(page, bookId, file) {
    try {
      if (page)   localStorage.setItem('page',   page);
      if (bookId) localStorage.setItem('bookid', String(bookId));
      if (page === 'editor') localStorage.setItem('editor-filename', file ?? '');
    } catch { /* quota */ }
  }

  _ls(key) {
    try { return localStorage.getItem(key) || ''; } catch { return ''; }
  }

  // ── URL ───────────────────────────────────────

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

  // ── Title ─────────────────────────────────────

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

  // ── Book activation ───────────────────────────

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

  // ── Static helpers ────────────────────────────

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