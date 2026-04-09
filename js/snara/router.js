/* ─────────────────────────────────────────────────
   js/snara/router.js — SnaraRouter

   Query-string based routing — no .htaccess needed.

   URL scheme:
     /?r=book/1                 → book 1, editor
     /?r=book/1/editor          → book 1, editor area
     /?r=book/1/meta            → book 1, meta area
     /?r=book/1/kanban          → book 1, kanban area
     /?r=book/1/files           → book 1, files / import
     /?r=book/1/files/import    → book 1, files, import section
     /?r=book/1/files/export    → book 1, files, export section
     /?r=book/1/files/gallery   → book 1, files, gallery section
     /?r=book/1/files/cache     → book 1, files, cache section
     /?r=book/1/edit/filename   → book 1, open document
     /?r=settings               → settings modal
     /?r=pref                   → pref modal
─────────────────────────────────────────────────── */

import { AppConfig } from '../snara.js';

const LS_KEY   = 'snara:lastRoute';
const APP_NAME = 'Snara';

const AREAS    = ['editor', 'meta', 'kanban', 'files'];
const SECTIONS = ['import', 'export', 'gallery', 'cache'];

// Routes that open modals — never persist to localStorage.
// Restoring them on the next load would auto-open a modal
// before the user does anything.
const MODAL_ROUTES = new Set(['settings', 'pref']);

export class SnaraRouter {

  static instance = null;

  constructor() {
    SnaraRouter.instance = this;

    window.addEventListener('popstate', () => {
      this._apply(this._readParam());
    });

    // Global so any module can navigate without importing the router.
    // IMPORTANT: window.openSettings and window.openPref must NOT
    // call window.navigate() — that would create an infinite loop
    // through _apply(). See snara.js for the correct wiring.
    window.navigate = (route) => this.navigate(route);
  }

  // ── Boot ──────────────────────────────────────
  // Called once, at the very end of snara.js boot(),
  // after ALL window.* globals are defined.

  boot() {
    const route = this._readParam();

    if (!route) {
      const saved = this._loadSaved();
      if (saved) {
        this._pushState(saved);
        this._apply(saved);
        return;
      }
      this._setTitle();
      return;
    }

    this._apply(route);
  }

  // ── Navigate ──────────────────────────────────

  navigate(route) {
    this._pushState(route);
    this._save(route);
    this._apply(route);
  }

  // ── Parse + dispatch ──────────────────────────

  _apply(route) {
    if (!route) return;

    const parts = route.replace(/^\//, '').split('/');

    // /?r=settings
    if (parts[0] === 'settings') {
      this._setTitle('Settings');
      // Calls settings.open() directly in snara.js — no navigate() inside
      window.openSettings?.();
      return;
    }

    // /?r=pref
    if (parts[0] === 'pref') {
      this._setTitle('Preferences');
      // Same: calls pref.open() directly — no navigate() inside
      window.openPref?.();
      return;
    }

    // Any page-based route — close any open modal first.
    // Prevents a modal staying open when the user navigates
    // back/forward through the browser history.
    window.closeModal?.();

    // /?r=book/:id[/:area[/:sub]]
    if (parts[0] === 'book' && parts[1]) {
      const bookId = parts[1];
      const area   = parts[2] || 'editor';
      const sub    = parts[3] || null;

      this._activateBook(bookId);

      // /?r=book/1/files[/:section]
      if (area === 'files') {
        const section = SECTIONS.includes(sub) ? sub : 'import';
        window.switchArea?.('files');
        setTimeout(() => {
          window.SnaraFiles?.instance?.switchSection(section);
        }, 0);
        this._setTitle(null, section);
        return;
      }

      // /?r=book/1/edit/:filename
      if (area === 'edit' && sub) {
        const filename = decodeURIComponent(sub);
        window.switchArea?.('editor');
        setTimeout(() => {
          window.loadDocument?.(bookId, filename);
        }, 0);
        this._setTitle(null, filename);
        return;
      }

      // /?r=book/1/editor|meta|kanban
      if (AREAS.includes(area)) {
        window.switchArea?.(area);
        this._setTitle();
        return;
      }

      // Unknown area — fallback
      window.switchArea?.('editor');
      this._setTitle();
      return;
    }
  }

  // ── Document <title> ──────────────────────────

  _setTitle(subtitle = null, detail = null) {
    const bookTitle = AppConfig.activeBookTitle || null;
    let title = APP_NAME;

    if (subtitle) {
      title = `${APP_NAME} — ${subtitle}`;
    } else if (bookTitle && detail) {
      title = `${APP_NAME} — ${bookTitle}: ${detail}`;
    } else if (bookTitle) {
      title = `${APP_NAME} — ${bookTitle}`;
    }

    document.title = title;
  }

  // ── Book activation ───────────────────────────

  _activateBook(bookId) {
    if (String(AppConfig.activeBookId) === String(bookId)) return;

    const idx = window.SnaraIndex?.instance;
    if (idx && typeof idx._setActiveBook === 'function') {
      const label = document.getElementById('active-book-label');
      const currentTitle = label?.textContent?.trim();
      const title = (currentTitle && currentTitle !== '—')
        ? currentTitle
        : `Book ${bookId}`;
      idx._setActiveBook(bookId, title);
    } else {
      AppConfig.activeBookId    = bookId;
      AppConfig.activeBookTitle = `Book ${bookId}`;
      window.dispatchEvent(new CustomEvent('bookchange', {
        detail: { bookId, title: AppConfig.activeBookTitle },
      }));
    }
  }

  // ── Query string helpers ──────────────────────

  _readParam() {
    // URLSearchParams.get() auto-decodes — handles raw and encoded values
    return new URLSearchParams(location.search).get('r') || '';
  }

  // FIX: do NOT encodeURIComponent the whole route.
  // Slashes are valid inside query-string values and don't need encoding.
  // The old version produced ugly ?r=book%2F1%2Feditor URLs and also
  // broke the location.search comparison so pushState fired on every call.
  _pushState(route) {
    const current = new URLSearchParams(location.search).get('r') || '';
    if (current === route) return;   // already here — no duplicate history entry
    const url = route ? `?r=${route}` : '/';
    history.pushState(null, '', url);
  }

  // ── localStorage ──────────────────────────────

  // FIX: never persist modal routes — they'd auto-open a modal on
  // every fresh page load, before the user has done anything.
  _save(route) {
    const base = route.split('/')[0];
    if (MODAL_ROUTES.has(base)) return;
    try { localStorage.setItem(LS_KEY, route); } catch { /* quota */ }
  }

  _loadSaved() {
    try {
      const saved = localStorage.getItem(LS_KEY) || '';
      // Defensive: clear any stale modal route stored by an older version
      const base = saved.split('/')[0];
      return MODAL_ROUTES.has(base) ? '' : saved;
    } catch {
      return '';
    }
  }

  // ── Static path builders ──────────────────────

  static bookPath(bookId, area = 'editor', sub = null) {
    let r = `book/${bookId}/${area}`;
    if (sub) r += `/${encodeURIComponent(sub)}`;
    return r;
  }

  static filesPath(bookId, section = 'import') {
    return `book/${bookId}/files/${section}`;
  }

  static editPath(bookId, filename) {
    return `book/${bookId}/edit/${encodeURIComponent(filename)}`;
  }
}