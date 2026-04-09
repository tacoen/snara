// routes.js
// Query-string based routing for Snara
// Exact match to your spec — no .htaccess, works everywhere

import { AppConfig } from '../snara.js';

const LS_KEY = 'snara:lastRoute';
const APP_NAME = 'Snara';
const AREAS = ['editor', 'meta', 'kanban', 'files'];

export class SnaraRouter {
  static instance = null;

  constructor() {
    SnaraRouter.instance = this;
    this._applying = false;

    // Browser back / forward support
    window.addEventListener('popstate', () => {
      this._apply(this._readParam());
    });

    // Global navigate helper
    window.navigate = (route) => this.navigate(route);
  }

  // ── Boot ──────────────────────────────────────────────────
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
  navigate(route) {
    if (this._applying) return;
    this._applying = true;
    this._pushState(route);
    this._save(route);
    this._apply(route);
    this._applying = false;
  }

  // ── Boot-time apply (handles direct link / page refresh) ──
  _applyOnBoot(route) {
    const parts = route.replace(/^\//, '').split('/');

    // Direct link to open file: /book/1/editor/filename
    if (parts[0] === 'book' && parts[1] && parts[2] === 'editor' && parts[3]) {
      const bookId = parts[1];
      const filename = decodeURIComponent(parts[3]);

      this._activateBook(bookId);

      this._applying = true;
      window.switchArea?.('editor');
      this._applying = false;

      // Load document (page-refresh case)
      setTimeout(() => window.loadDocument?.(bookId, filename), 0);
      this._setTitleForFile(filename);
      return;
    }

    this._apply(route);
  }

  // ── Parse + dispatch ──────────────────────────────────────
  _apply(route) {
    if (!route) return;

    const parts = route.replace(/^\//, '').split('/');

    // ── Modals
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

    // ── Book routes
    if (parts[0] === 'book' && parts[1]) {
      const bookId = parts[1];
      const area = parts[2] || 'editor';   // default = editor
      const sub  = parts[3] || null;

      this._activateBook(bookId);

      // Files area — always clean /files (no sub-section in URL)
      if (area === 'files') {
        window.switchArea?.('files');
        setTimeout(() => {
          window.SnaraFiles?.instance?.switchSection?.('import');
        }, 0);
        this._setTitle();                 // "Snara — Book Title"
        return;
      }

      // Editor with open file: /book/1/editor/filename
      if (area === 'editor' && sub) {
        const filename = decodeURIComponent(sub);
        window.switchArea?.('editor');
        this._setTitleForFile(filename);
        return;
      }

      // All other areas (meta, kanban, or plain editor)
      if (AREAS.includes(area)) {
        window.switchArea?.(area);
      } else {
        window.switchArea?.('editor');
      }
      this._setTitle();                   // "Snara — Book Title"
      return;
    }

    // Fallback
    this._setTitle();
  }

  // ── Title helpers ─────────────────────────────────────────
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
  _activateBook(bookId) {
    if (String(AppConfig.activeBookId) === String(bookId)) return;

    const idx = window.SnaraIndex?.instance;
    if (idx && typeof idx._setActiveBook === 'function') {
      const current = document.getElementById('active-book-label')?.textContent;
      const title = (current && current !== '—') ? current : `Book ${bookId}`;
      idx._setActiveBook(bookId, title);
    } else {
      AppConfig.activeBookId = bookId;
      AppConfig.activeBookTitle = `Book ${bookId}`;
      window.dispatchEvent(new CustomEvent('bookchange', {
        detail: { bookId, title: AppConfig.activeBookTitle }
      }));
    }
  }

  // ── Query-string helpers ──────────────────────────────────
  _readParam() {
    const qs = new URLSearchParams(location.search);
    const bare = qs.get('');
    if (bare === 'book') return 'book-index';
    if (bare === 'chapter') return 'chapter-index';
    return qs.get('r') || '';
  }

  _pushState(route) {
    if (route === 'book-index') {
      if (location.search !== '?=book') history.pushState(null, '', '?=book');
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
    // Plain book → editor (no /editor in URL)
    if (area === 'editor' && sub == null) {
      return `book/${bookId}`;
    }
    let r = `book/${bookId}/${area}`;
    if (sub != null) r += `/${encodeURIComponent(sub)}`;
    return r;
  }

  static filesPath(bookId) {
    return `book/${bookId}/files`;
  }

  static editorPath(bookId, filename) {
    return `book/${bookId}/editor/${encodeURIComponent(filename)}`;
  }
}