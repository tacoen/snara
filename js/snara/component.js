
import { openModal, closeModal } from './modal.js';
export class SnaraComponent {
  static instance = null;
  constructor(modalId, options = {}) {

    if (new.target.instance) {
      console.warn(`[Snara] ${new.target.name} already instantiated — skipping.`);
      return new.target.instance;
    }
    new.target.instance = this;

    this.modalId      = modalId;
    this._closeable   = options.closeable  ?? true;
    this._defaultTab  = options.defaultTab ?? null;
    this._activeTab   = this._defaultTab;

    SnaraComponent._whenReady(() => this._init());
  }

  _init() {
    this._readDataAttributes();
    this._ensureDOM();
    this._bindGlobalKeys();
  }

  _bindGlobalKeys() {
    if (!this._closeable) return;
    document.addEventListener('keydown', e => {
      if (e.key !== 'Escape') return;
      const el = document.getElementById(this.modalId);
      if (el && !el.hasAttribute('hidden')) this.close();
    });
  }

  _readDataAttributes() {
    const el = document.getElementById(this.modalId);
    if (!el) return;
    if (el.dataset.defaultTab && !this._defaultTab) {
      this._activeTab = this._defaultTab = el.dataset.defaultTab;
    }
    if (el.dataset.closeable === 'false') {
      this._closeable = false;
    }
  }

  _ensureDOM() {  }
  _render()    {  }

  open() {
    this._render();
    openModal(this.modalId);
  }

  close() {
    closeModal(this.modalId);
  }

  static _whenReady(fn) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', fn, { once: true });
    } else {
      fn();
    }
  }
}