/* ─────────────────────────────────────────────────
   js/snara/router.js — SnaraRouter

   Query-string based routing — no .htaccess needed.
   Works on Apache, Nginx, PHP built-in server, anything.

   URL scheme (all on same page, no reload):
     /                        → restore from localStorage
     /?r=book/1               → book 1, editor
     /?r=book/1/editor        → book 1, editor area
     /?r=book/1/meta          → book 1, meta area
     /?r=book/1/kanban        → book 1, kanban area
     /?r=book/1/files         → book 1, files (always import internally)
     /?r=book/1/editor/file   → book 1, open document
     /?r=settings             → settings modal
     /?r=pref                 → pref modal
     /?=book                  → book index modal
     /?=chapter               → chapter index modal

   NOTE: /?r=book/1/files/import|export|gallery|cache are
   intentionally NOT supported in the URL. The files area
   always lands on import; sub-sections are internal state only.

   Document <title> is updated on every navigation:
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

// Strips /files/anything → /files — single source of truth
const normalise = (route) =>
  route.replace(/^(book\/[^/]+\/files)(\/\S+)?$/, '$1');

export class SnaraRouter {

  static instance = null;

  constructor() {
    SnaraRouter.instance = this;
    this._applying = false;

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
      const saved = this._loadSaved();
      if (saved) {
        this._pushState(saved);
        this._applyOnBoot(saved);
        return;
      }
      this._setTitle();
      return;
    }

    this._applyOnBoot(route);
  }

  // ── Navigate (guarded) ────────────────────────────────────
  // Single public entry point — always normalises before saving.

  navigate(route) {
    if (this._applying) return;
    this._applying = true;
    const clean = normalise(route);
    this._pushState(clean);
    this._save(clean);
    this._apply(clean);
    this._applying = false;
  }

  // ── Boot-time apply ───────────────────────────────────────
  // Handles direct links and page refreshes.
  // Opens a document immediately if the URL contains a filename.

  _applyOnBoot(route) {
    const clean = normalise(route);
    const parts = clean.replace(/^\//, '').split('/');

    // Direct link: /?r=book/1/editor/filename
    if (parts[0] === 'book' && parts[1] && parts[2] === 'editor' && parts[3]) {
      const bookId   = parts[1];
      const filename = decodeURIComponent(parts[3]);

      this._activateBook(bookId);

      this._applying = true;
      window.switchArea?.('editor');
      this._applying = false;

      setTimeout(() => window.loadDocument?.(bookId, filename), 0);
      this._setTitleForFile(filename);
      return;
    }

    this._apply(clean);
  }

  // ── Parse + dispatch ──────────────────────────────────────

  _apply(route) {
    if (!route) return;

    const parts = route.replace(/^\//, '').split('/');

    // ── Index modals (special query-string: ?=book / ?=chapter)
    if (parts[0] === 'book-index') {
      this._setTitle('Books');
      window.SnaraIndex?.instance?.openBookIndex();
      return;
    }
    if (parts[0] === 'chapter-index') {
      this._setTitle('Chapters');
      window.SnaraIndex?.instance?.openChapterIndex();
      return;
    }

    // ── Config modals
    if (parts[0] === 'settings') {
      this._setTitle('Settings');
      window.openSettings?.();
      return;
    }
    if (parts[0] === 'pref') {
      this._setTitle('Preferences');
      window.openPref?.();
      return;
    }

    // ── Book routes: /?r=book/:id[/:area[/:sub]]
    if (parts[0] === 'book' && parts[1]) {
      const bookId = parts[1];
      const area   = parts[2] || 'editor';   // default area = editor
      const sub    = parts[3] || null;

      this._activateBook(bookId);

      // Files — sub-sections are internal state, never in the URL
      if (area === 'files') {
        window.switchArea?.('files');
        setTimeout(() => {
          window.SnaraFiles?.instance?.switchSection?.('import');
        }, 0);
        this._setTitle();
        return;
      }

      // Editor with open document: /?r=book/1/editor/filename
      if (area === 'editor' && sub) {
        const filename = decodeURIComponent(sub);
        window.switchArea?.('editor');
        this._setTitleForFile(filename);
        return;
      }

      // All other known areas (editor, meta, kanban)
      if (AREAS.includes(area)) {
        window.switchArea?.(area);
        this._setTitle();
        return;
      }

      // Unknown area — fall back to editor
      window.switchArea?.('editor');
      this._setTitle();
      return;
    }

    // Bare fallback
    this._setTitle();
  }

  // ── Document <title> ──────────────────────────────────────

  _setTitle(subtitle = null) {
    const bookTitle = AppConfig.activeBookTitle || null;
    let title = APP_NAME;

    if (subtitle) {
      title = `${APP_NAME} — ${subtitle}`;
    } else if (bookTitle) {
      title = `${APP_NAME} — ${bookTitle}`;
    }

    document.title = title;
  }

  _setTitleForFile(filename) {
    const bookTitle = AppConfig.activeBookTitle;
    document.title = bookTitle
      ? `${APP_NAME} — ${bookTitle}: ${filename}`
      : `${APP_NAME} — ${filename}`;
  }

  // ── Book activation ───────────────────────────────────────
  // No-ops if the book is already active (avoids redundant bookchange events).

  _activateBook(bookId) {
    if (String(AppConfig.activeBookId) === String(bookId)) return;

    const idx = window.SnaraIndex?.instance;
    if (idx && typeof idx._setActiveBook === 'function') {
      const currentLabel = document.getElementById('active-book-label')?.textContent;
      const title = (currentLabel && currentLabel !== '—')
        ? currentLabel
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

  // ── Query-string helpers ──────────────────────────────────

  _readParam() {
    const qs   = new URLSearchParams(location.search);
    const bare = qs.get('');
    if (bare === 'book')    return 'book-index';
    if (bare === 'chapter') return 'chapter-index';
    return qs.get('r') || '';
  }

  _pushState(route) {
    if (route === 'book-index') {
      if (location.search !== '?=book')    history.pushState(null, '', '?=book');
      return;
    }
    if (route === 'chapter-index') {
      if (location.search !== '?=chapter') history.pushState(null, '', '?=chapter');
      return;
    }
    const url = `?r=${encodeURIComponent(route)}`;
    if (location.search !== url) history.pushState(null, '', url);
  }

  // ── localStorage ──────────────────────────────────────────

  _save(route) {
    try { localStorage.setItem(LS_KEY, route); } catch {}
  }

  _loadSaved() {
    try { return localStorage.getItem(LS_KEY) || ''; } catch { return ''; }
  }

  // ── Static path builders ──────────────────────────────────

  static bookPath(bookId, area = 'editor', sub = null) {
    if (area === 'editor' && sub == null) return `book/${bookId}`;
    let r = `book/${bookId}/${area}`;
    if (sub != null) r += `/${encodeURIComponent(sub)}`;
    return r;
  }

  static filesPath(bookId) {
    // Always returns the clean /files path — no sub-section
    return `book/${bookId}/files`;
  }

  static editorPath(bookId, filename) {
    return `book/${bookId}/editor/${encodeURIComponent(filename)}`;
  }
}