/* ─────────────────────────────────────────────────
   snara/settings.js — SnaraSettings
   Config modal. Reads from AppConfig (already loaded
   by boot()), writes back via API + updates AppConfig.
   Depends on: SnaraTool, AppConfig, icx
─────────────────────────────────────────────────── */
import { SnaraTool } from './tool.js';
import { AppConfig } from '../snara.js';
import icx           from '../icons/ge-icon.js';

export class SnaraSettings {

  static instance = null;

  constructor() {
    SnaraSettings.instance = this;
    this.modal   = document.getElementById('settings-modal');
    this.overlay = document.getElementById('settings-overlay');
    this._bindClose();
  }

  // ── Open / Close ──────────────────────────────

  open() {
    this._render();
    this.modal.classList.add('open');
    this.overlay.classList.add('open');
    document.body.classList.add('modal-open');
  }

  close() {
    this.modal.classList.remove('open');
    this.overlay.classList.remove('open');
    document.body.classList.remove('modal-open');
  }

  _bindClose() {
    this.overlay.addEventListener('click', () => this.close());
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && this.modal.classList.contains('open')) this.close();
    });
  }

  // ── Render form from AppConfig ────────────────

  _render() {
    const c    = AppConfig;
    const body = document.getElementById('settings-body');

    body.innerHTML = `

      <!-- Paths -->
      <section class="cfg-section">
        <h3 class="cfg-heading">Paths</h3>
        <div class="cfg-row">
          <label class="cfg-label">API path</label>
          <input class="cfg-input" id="cfg-apiPath" value="${esc(c.apiPath)}">
        </div>
        <div class="cfg-row">
          <label class="cfg-label">Data path</label>
          <input class="cfg-input" id="cfg-dataPath" value="${esc(c.dataPath)}">
        </div>
      </section>

      <!-- Appearance -->
      <section class="cfg-section">
        <h3 class="cfg-heading">Appearance</h3>
        <div class="cfg-row">
          <label class="cfg-label">Theme</label>
          <div class="cfg-segmented" id="cfg-theme">
            ${['light','dark','system'].map(t =>
              `<button class="cfg-seg${c.theme === t ? ' active' : ''}" data-val="${t}">${t}</button>`
            ).join('')}
          </div>
        </div>
      </section>

      <!-- Editor -->
      <section class="cfg-section">
        <h3 class="cfg-heading">Editor</h3>
        <div class="cfg-row">
          <label class="cfg-label">Default tag</label>
          <div class="cfg-segmented" id="cfg-defaultTag">
            ${(c.classes || ['act','chapter','scene','beat']).map(t =>
              `<button class="cfg-seg${c.defaultTag === t ? ' active' : ''}" data-val="${t}">${t}</button>`
            ).join('')}
          </div>
        </div>
        <div class="cfg-row">
          <label class="cfg-label">Autosave</label>
          <button class="cfg-toggle${c.autosave ? ' on' : ''}" id="cfg-autosave" aria-pressed="${c.autosave}">
            <span class="cfg-toggle-thumb"></span>
          </button>
        </div>
        <div class="cfg-row">
          <label class="cfg-label">Interval (s)</label>
          <input class="cfg-input cfg-input-sm" id="cfg-autosaveInterval"
            type="number" min="5" max="600" value="${c.autosaveInterval}">
        </div>
      </section>

      <!-- Classes -->
      <section class="cfg-section">
        <h3 class="cfg-heading">Classes
          <span class="cfg-hint">comma-separated</span>
        </h3>
        <div class="cfg-row">
          <input class="cfg-input cfg-input-full" id="cfg-classes"
            value="${esc((c.classes || []).join(', '))}">
        </div>
      </section>

      <!-- Meta fields -->
      <section class="cfg-section">
        <h3 class="cfg-heading">Meta fields
          <span class="cfg-hint">comma-separated</span>
        </h3>
        <div class="cfg-row">
          <input class="cfg-input cfg-input-full" id="cfg-metaFields"
            value="${esc((c.metaFields || []).join(', '))}">
        </div>
      </section>

      <!-- Heading map -->
      <section class="cfg-section">
        <h3 class="cfg-heading">Heading map</h3>
        <div id="cfg-headingMap" class="cfg-hmap">
          ${(c.headingMap || []).map((row, i) => this._hmapRow(row, i)).join('')}
        </div>
        <button class="cfg-add-row" id="cfg-hmap-add">+ add rule</button>
      </section>
    `;

    this._bindSegmented();
    this._bindToggle();
    this._bindHmapAdd();
    this._bindHmapRemoves();
    icx.delayreplace('#settings-body [data-icon]');
  }

  _hmapRow({ prefix = '', cls = '' } = {}, i = Date.now()) {
    return `
      <div class="cfg-hmap-row" data-idx="${i}">
        <input class="cfg-input cfg-hmap-prefix" placeholder='e.g. "# "' value="${esc(prefix)}">
        <span class="cfg-arrow">→</span>
        <input class="cfg-input cfg-hmap-cls" placeholder="cls" value="${esc(cls)}">
        <button class="cfg-hmap-remove" title="Remove rule"><i data-icon="x"></i></button>
      </div>`;
  }

  // ── Control bindings ──────────────────────────

  _bindSegmented() {
    document.querySelectorAll('.cfg-segmented').forEach(group => {
      group.addEventListener('click', e => {
        const btn = e.target.closest('.cfg-seg');
        if (!btn) return;
        group.querySelectorAll('.cfg-seg').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
      });
    });
  }

  _bindToggle() {
    document.getElementById('cfg-autosave')?.addEventListener('click', function () {
      const on = this.classList.toggle('on');
      this.setAttribute('aria-pressed', on);
    });
  }

  _bindHmapAdd() {
    document.getElementById('cfg-hmap-add')?.addEventListener('click', () => {
      const container = document.getElementById('cfg-headingMap');
      const tmp = document.createElement('div');
      tmp.innerHTML = this._hmapRow({}, Date.now());
      const row = tmp.firstElementChild;
      container.appendChild(row);
      row.querySelector('.cfg-hmap-remove').addEventListener('click', () => row.remove());
      row.querySelector('.cfg-hmap-prefix').focus();
      icx.delayreplace('.cfg-hmap-row:last-child [data-icon]');
    });
  }

  _bindHmapRemoves() {
    document.querySelectorAll('.cfg-hmap-remove').forEach(btn => {
      btn.addEventListener('click', () => btn.closest('.cfg-hmap-row').remove());
    });
  }

  // ── Collect & Save ────────────────────────────

  async save() {
    const btn = document.getElementById('cfg-save-btn');
    btn.disabled    = true;
    btn.textContent = 'saving…';

    const theme      = document.querySelector('#cfg-theme .cfg-seg.active')?.dataset.val      || 'light';
    const defaultTag = document.querySelector('#cfg-defaultTag .cfg-seg.active')?.dataset.val || 'beat';

    const headingMap = [];
    document.querySelectorAll('.cfg-hmap-row').forEach(row => {
      const prefix = row.querySelector('.cfg-hmap-prefix')?.value ?? '';
      const cls    = row.querySelector('.cfg-hmap-cls')?.value.trim() ?? '';
      if (prefix || cls) headingMap.push({ prefix, cls });
    });

    const updated = {
      ...AppConfig,
      apiPath:          document.getElementById('cfg-apiPath')?.value          || AppConfig.apiPath,
      dataPath:         document.getElementById('cfg-dataPath')?.value         || AppConfig.dataPath,
      theme,
      defaultTag,
      autosave:         document.getElementById('cfg-autosave')?.classList.contains('on') ?? AppConfig.autosave,
      autosaveInterval: parseInt(document.getElementById('cfg-autosaveInterval')?.value)    || AppConfig.autosaveInterval,
      metaFields:       splitCsv(document.getElementById('cfg-metaFields')?.value),
      classes:          splitCsv(document.getElementById('cfg-classes')?.value),
      headingMap,
    };

    // Merge into live AppConfig so rest of app sees changes immediately
    Object.assign(AppConfig, updated);

    // Apply theme immediately
    const resolved = updated.theme === 'system'
      ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
      : updated.theme;
    localStorage.setItem('theme', updated.theme === 'system' ? '' : updated.theme);
    SnaraTool.applyTheme(resolved);
    icx.delayreplace('#theme-toggle [data-icon]');

    // Persist to server
    try {
      await fetch(AppConfig.apiPath + '?action=config.set', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(updated),
      });
      btn.textContent = 'saved ✓';
    } catch {
      btn.textContent = 'saved locally ✓';
    }

    setTimeout(() => {
      btn.disabled    = false;
      btn.textContent = 'save';
      this.close();
    }, 900);
  }
}

// ── Helpers ───────────────────────────────────────
function esc(str) {
  return String(str ?? '').replace(/"/g, '&quot;').replace(/</g, '&lt;');
}
function splitCsv(str) {
  return (str || '').split(',').map(s => s.trim()).filter(Boolean);
}