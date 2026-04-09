/* ─────────────────────────────────────────────────
   js/snara/router.js — SnaraRouter

   Query-string based routing — no .htaccess needed.
   Works on Apache, Nginx, PHP built-in server, anything.

   URL scheme (all on same page, no reload):
     /                          → restore from localStorage
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

   Document <title> is also updated on every navigation:
     Snara
     Snara — Book Title
     Snara — Book Title: filename
     Snara — Settings
     Snara — Preferences
─────────────────────────────────────────────────── */

import { AppConfig } from '../snara.js';

const LS_KEY   = 'snara:lastRoute';
const APP_NAME = 'Snara';

const AREAS    = ['editor', 'meta', 'kanban', 'files'];
const SECTIONS = ['import', 'export', 'gallery', 'cache'];

export class SnaraRouter {

  static instance = null;

  constructor() {
    SnaraRouter.instance = this;

    // Browser back / forward — re-read ?r= from the new URL
    window.addEventListener('popstate', () => {
      this._apply(this._readParam());
    });

    // Global helper so any module can navigate without importing the router
    window.navigate = (route) => this.navigate(route);
  }

  // ── Boot ──────────────────────────────────────────────────
  // Called once, after snara.js finishes creating all instances.

  boot() {
    const route = this._readParam();

    if (!route) {
      // Bare "/" — try to restore from localStorage
      const saved = this._loadSaved();
      if (saved) {
        this._pushState(saved);
        this._apply(saved);
        return;
      }
      // Nothing saved — just set default title
      this._setTitle();
      return;
    }

    this._apply(route);
  }

  // ── Navigate ──────────────────────────────────────────────
  // Single entry point. Call this instead of switchArea() etc.

  navigate(route) {
    this._pushState(route);
    this._save(route);
    this._apply(route);
  }

  // ── Parse + dispatch ──────────────────────────────────────

  _apply(route) {
    if (!route) return;

    const parts = route.replace(/^\//, '').split('/');
    // parts: ['book','1','files','gallery'] etc.

    // /?r=settings
    if (parts[0] === 'settings') {
      this._setTitle('Settings');
      window.openSettings?.();
      return;
    }

    // /?r=pref
    if (parts[0] === 'pref') {
      this._setTitle('Preferences');
      window.openPref?.();
      return;
    }

    // /?r=book/:id[/:area[/:sub]]
    if (parts[0] === 'book' && parts[1]) {
      const bookId  = parts[1];
      const area    = parts[2] || 'editor';
      const sub     = parts[3] || null;

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

      // Unknown area fallback
      window.switchArea?.('editor');
      this._setTitle();
      return;
    }
  }

  // ── Document <title> ──────────────────────────────────────
  // subtitle = 'Settings' | 'Preferences' | 'import' | filename | null

  _setTitle(subtitle = null, detail = null) {
    const bookTitle = AppConfig.activeBookTitle || null;
    let title = APP_NAME;

    if (subtitle) {
      // Fixed labels like "Settings", "Preferences"
      title = `${APP_NAME} — ${subtitle}`;
    } else if (bookTitle && detail) {
      // Book active + chapter/section detail
      title = `${APP_NAME} — ${bookTitle}: ${detail}`;
    } else if (bookTitle) {
      // Book active, no detail
      title = `${APP_NAME} — ${bookTitle}`;
    }

    document.title = title;
  }

  // ── Book activation ───────────────────────────────────────

  _activateBook(bookId) {
    if (String(AppConfig.activeBookId) === String(bookId)) return;

    const idx = window.SnaraIndex?.instance;
    if (idx && typeof idx._setActiveBook === 'function') {
      const currentTitle = document.getElementById('active-book-label')?.textContent;
      const title = (currentTitle && currentTitle !== '—')
        ? currentTitle
        : `Book ${bookId}`;
      idx._setActiveBook(bookId, title);
    } else {
      AppConfig.activeBookId    = bookId;
      AppConfig.activeBookTitle = `Book ${bookId}`;
      window.dispatchEvent(new CustomEvent('bookchange', {
        detail: { bookId, title: AppConfig.activeBookTitle }
      }));
    }
  }

  // ── Query string helpers ──────────────────────────────────

  _readParam() {
    return new URLSearchParams(location.search).get('r') || '';
  }

  _pushState(route) {
    const url = route ? `?r=${encodeURIComponent(route)}` : '/';
    if (location.search !== `?r=${encodeURIComponent(route)}`) {
      history.pushState(null, '', url);
    }
  }

  // ── localStorage ──────────────────────────────────────────

  _save(route) {
    try { localStorage.setItem(LS_KEY, route); } catch { /* quota */ }
  }

  _loadSaved() {
    try { return localStorage.getItem(LS_KEY) || ''; } catch { return ''; }
  }

  // ── Static path builders ──────────────────────────────────
  // Use these to generate route strings consistently.

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