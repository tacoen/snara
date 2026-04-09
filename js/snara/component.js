/* ─────────────────────────────────────────────────
   js/snara/component.js — SnaraComponent
   Base class for every modal-backed panel in Snara.

   Solves three pitfalls exactly, nothing more:

   PITFALL 1 — Scope Creep
     This class ONLY handles: DOM readiness guard,
     open/close lifecycle, and Escape-key binding.
     Tab switching, save logic, and render logic
     are NOT here. Subclasses own those concerns.

   PITFALL 2 — DOM Readiness
     _whenReady() defers construction until the
     document is fully parsed. Constructors never
     touch the DOM directly — they always go through
     this guard so the script is safe whether it
     runs from <head> or end-of-<body>.

   PITFALL 3 — Naming Collisions
     This file is an ES module. Nothing leaks to
     window. The `static instance` guard prevents
     a second construction if a subclass is ever
     imported from two different modules.

   Drop-in for: SnaraSettings, SnaraPref,
                SnaraFiles, SnaraIndex
─────────────────────────────────────────────────── */

import { openModal, closeModal } from './modal.js';

export class SnaraComponent {

  // ── Pitfall 3: one canonical reference per subclass,
  //    lives on the subclass itself via this.constructor
  static instance = null;

  /**
   * @param {string} modalId   — the id of the .app-modal element
   * @param {object} [options] — optional data-attribute overrides
   *   options.defaultTab  {string}  first active tab name
   *   options.closeable   {boolean} whether Escape closes it
   */
  constructor(modalId, options = {}) {

    // ── Pitfall 3: abort silently if already alive ──
    if (new.target.instance) {
      console.warn(`[Snara] ${new.target.name} already instantiated — skipping.`);
      return new.target.instance;
    }
    new.target.instance = this;

    this.modalId      = modalId;
    this._closeable   = options.closeable  ?? true;
    this._defaultTab  = options.defaultTab ?? null;
    this._activeTab   = this._defaultTab;

    // ── Pitfall 2: never touch the DOM until it is ready ──
    SnaraComponent._whenReady(() => this._init());
  }

  // ── Lifecycle (called once DOM is confirmed ready) ──

  _init() {
    this._readDataAttributes();   // honour HTML config
    this._ensureDOM();            // subclass builds its shell
    this._bindGlobalKeys();       // Escape only — nothing else
  }

  // ── Pitfall 1: this is the ONLY global event this class owns.
  //    It does not bind clicks, tabs, saves, or anything else.

  _bindGlobalKeys() {
    if (!this._closeable) return;
    document.addEventListener('keydown', e => {
      if (e.key !== 'Escape') return;
      const el = document.getElementById(this.modalId);
      if (el && !el.hasAttribute('hidden')) this.close();
    });
  }

  // ── Read data-* from the modal element itself ──────────────
  //    Lets HTML configure behaviour without touching JS.
  //    e.g. <div id="settings-modal" data-default-tab="general"
  //               data-closeable="false">

  _readDataAttributes() {
    // Defer until the element exists (safe: called from _whenReady)
    const el = document.getElementById(this.modalId);
    if (!el) return;

    if (el.dataset.defaultTab && !this._defaultTab) {
      this._activeTab = this._defaultTab = el.dataset.defaultTab;
    }
    if (el.dataset.closeable === 'false') {
      this._closeable = false;
    }
  }

  // ── Subclasses override this to build their modal shell ────
  //    Called once, after DOM is ready.
  _ensureDOM() { /* override in subclass */ }

  // ── Subclasses override this to (re)render modal content ──
  //    Called on every open().
  _render()    { /* override in subclass */ }

  // ── Public API ─────────────────────────────────────────────

  open() {
    this._render();
    openModal(this.modalId);
  }

  close() {
    closeModal(this.modalId);
  }

  // ── Pitfall 2: DOM readiness guard ────────────────────────
  //    Works regardless of where <script> tag sits in the HTML.

  static _whenReady(fn) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', fn, { once: true });
    } else {
      // Already interactive or complete — run immediately
      fn();
    }
  }
}