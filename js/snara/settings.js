/* ─────────────────────────────────────────────────
   snara/settings.js — SnaraSettings
   Two-tab config modal:
     General  — app/infra keys  (config.json)
     Defaults — per-app/book defaults (default.json)
   Depends on: AppConfig, AppDefaults, SnaraUI, icx
─────────────────────────────────────────────────── */
import { AppConfig, AppDefaults } from '../snara.js';
import { SnaraUI }                from './ui.js';
import icx                        from '../icons/ge-icon.js';
import { openModal, closeModal }  from './modal.js';

export class SnaraSettings {

  static instance     = null;
  // FIX: one-time flag so _bindClose() never stacks a second keydown listener
  // on the document. Previously, every constructor call (even accidental ones)
  // added another Escape handler — each pressing Escape fired closeModal()
  // N times, compounding with other listeners.
  static _escapeBound = false;

  constructor() {
    SnaraSettings.instance = this;
    this.modal      = document.getElementById('settings-modal');
    this._activeTab = 'general';
    this._bindClose();
  }

  // ── Open / Close ──────────────────────────────

  open()  { this._render(); openModal('settings-modal'); }
  close() { closeModal('settings-modal'); }

  // FIX: guarded — listener is added exactly once, ever.
  _bindClose() {
    if (SnaraSettings._escapeBound) return;
    SnaraSettings._escapeBound = true;

    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') closeModal('settings-modal');
    });
  }

  // ── Render ────────────────────────────────────

  _render() {
    const body = document.getElementById('settings-body');
    body.innerHTML = `
      <div class="cfg-tabs">
        <button class="cfg-tab${this._activeTab === 'general'  ? ' active' : ''}" data-tab="general">General</button>
        <button class="cfg-tab${this._activeTab === 'defaults' ? ' active' : ''}" data-tab="defaults">Defaults</button>
      </div>
      <div class="cfg-tab-content" id="cfg-tab-content">
        ${this._activeTab === 'general' ? this._renderGeneral() : this._renderDefaults()}
      </div>
    `;

    this._bindTabs();
    this._bindSegmented();
    this._bindToggle();
    this._bindHmapAdd();
    this._bindHmapRemoves();
    icx.delayreplace('#settings-body [data-icon]');
  }

  _switchTab(tab) {
    this._activeTab = tab;
    document.querySelectorAll('.cfg-tab').forEach(b =>
      b.classList.toggle('active', b.dataset.tab === tab)
    );
    const content = document.getElementById('cfg-tab-content');
    content.innerHTML = tab === 'general' ? this._renderGeneral() : this._renderDefaults();
    this._bindSegmented();
    this._bindToggle();
    if (tab === 'general') { this._bindHmapAdd(); this._bindHmapRemoves(); }
    icx.delayreplace('#settings-body [data-icon]');
  }

  _bindTabs() {
    document.querySelectorAll('#settings-body .cfg-tab').forEach(btn => {
      btn.addEventListener('click', () => this._switchTab(btn.dataset.tab));
    });
  }

  // ── General tab ───────────────────────────────

  _renderGeneral() {
    const c = AppConfig;
    return `
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

      <section class="cfg-section">
        <h3 class="cfg-heading">Appearance</h3>
        <div class="cfg-row">
          <label class="cfg-label">Theme</label>
          <div class="cfg-segmented" id="cfg-theme">
            ${['light', 'dark', 'system'].map(t =>
              `<button class="cfg-seg${c.theme === t ? ' active' : ''}" data-val="${t}">${t}</button>`
            ).join('')}
          </div>
        </div>
      </section>

      <section class="cfg-section">
        <h3 class="cfg-heading">Editor</h3>
        <div class="cfg-row">
          <label class="cfg-label">Classes</label>
          <input class="cfg-input cfg-input-full" id="cfg-classes"
            value="${esc((c.classes || []).join(', '))}">
        </div>
      </section>

      <section class="cfg-section">
        <h3 class="cfg-heading">Heading map</h3>
        <div id="cfg-headingMap" class="cfg-hmap">
          ${(c.headingMap || []).map((row, i) => this._hmapRow(row, i)).join('')}
        </div>
        <button class="cfg-add-row" id="cfg-hmap-add">+ add rule</button>
      </section>
    `;
  }

  // ── Defaults tab ──────────────────────────────

  _renderDefaults() {
    const d = AppDefaults;
    return `
      <section class="cfg-section">
        <h3 class="cfg-heading">Act default
          <span class="cfg-hint">label when no act entry found</span>
        </h3>
        <div class="cfg-row">
          <label class="cfg-label">Act label</label>
          <input class="cfg-input" id="cfg-act" value="${esc(d.act)}">
        </div>
      </section>

      <section class="cfg-section">
        <h3 class="cfg-heading">Editor defaults</h3>
        <div class="cfg-row">
          <label class="cfg-label">Default tag</label>
          <div class="cfg-segmented" id="cfg-defaultTag">
            ${(AppConfig.classes || ['act', 'chapter', 'scene', 'beat']).map(t =>
              `<button class="cfg-seg${d.defaultTag === t ? ' active' : ''}" data-val="${t}">${t}</button>`
            ).join('')}
          </div>
        </div>
        <div class="cfg-row">
          <label class="cfg-label">Autosave</label>
          <button class="cfg-toggle${d.autosave ? ' on' : ''}" id="cfg-autosave" aria-pressed="${d.autosave}">
            <span class="cfg-toggle-thumb"></span>
          </button>
        </div>
        <div class="cfg-row">
          <label class="cfg-label">Interval (s)</label>
          <input class="cfg-input cfg-input-sm" id="cfg-autosaveInterval"
            type="number" min="5" max="600" value="${d.autosaveInterval}">
        </div>
      </section>

      <section class="cfg-section">
        <h3 class="cfg-heading">Meta fields
          <span class="cfg-hint">comma-separated</span>
        </h3>
        <div class="cfg-row">
          <input class="cfg-input cfg-input-full" id="cfg-metaFields"
            value="${esc((d.metaFields || []).join(', '))}">
        </div>
      </section>
    `;
  }

  // ── Heading map row ───────────────────────────

  _hmapRow({ prefix = '', cls = '' } = {}, i = Date.now()) {
    return `
      <div class="cfg-hmap-row">
        <input class="cfg-input cfg-hmap-prefix" placeholder='e.g. "# "' value="${esc(prefix)}">
        <span class="cfg-arrow">→</span>
        <input class="cfg-input cfg-hmap-cls" placeholder="cls" value="${esc(cls)}">
        <button class="cfg-hmap-remove" title="Remove rule"><i data-icon="x"></i></button>
      </div>`;
  }

  // ── Control bindings ──────────────────────────

  _bindSegmented() {
    document.querySelectorAll('#settings-body .cfg-segmented').forEach(group => {
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
      tmp.innerHTML = this._hmapRow({});
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

  // ── Save — always writes both tabs ───────────

  async save() {
    const btn = document.getElementById('cfg-save-btn');
    btn.disabled    = true;
    btn.textContent = 'saving…';

    try {
      await Promise.all([
        this._saveGeneral(),
        this._saveDefaults(),
      ]);
      btn.textContent = 'saved ✓';
    } catch {
      btn.textContent = 'error';
    }

    setTimeout(() => {
      btn.disabled    = false;
      btn.textContent = 'save';
      this.close();
    }, 900);
  }

  async _saveGeneral() {
    const theme = document.querySelector('#cfg-theme .cfg-seg.active')?.dataset.val || 'light';

    const headingMap = [];
    document.querySelectorAll('.cfg-hmap-row').forEach(row => {
      const prefix = row.querySelector('.cfg-hmap-prefix')?.value ?? '';
      const cls    = row.querySelector('.cfg-hmap-cls')?.value.trim() ?? '';
      if (prefix || cls) headingMap.push({ prefix, cls });
    });

    const updated = {
      apiPath:    document.getElementById('cfg-apiPath')?.value  || AppConfig.apiPath,
      dataPath:   document.getElementById('cfg-dataPath')?.value || AppConfig.dataPath,
      theme,
      classes:    splitCsv(document.getElementById('cfg-classes')?.value),
      headingMap,
    };

    Object.assign(AppConfig, updated);

    const resolved = theme === 'system'
      ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
      : theme;
    SnaraUI.instance.toggleTheme(resolved);

    await fetch(AppConfig.apiPath + '?action=config.set', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(updated),
    });
  }

  async _saveDefaults() {
    const defaultTag = document.querySelector('#cfg-defaultTag .cfg-seg.active')?.dataset.val
      || AppDefaults.defaultTag;

    const updated = {
      act:              document.getElementById('cfg-act')?.value ?? AppDefaults.act,
      defaultTag,
      autosave:         document.getElementById('cfg-autosave')?.classList.contains('on')
                          ?? AppDefaults.autosave,
      autosaveInterval: parseInt(document.getElementById('cfg-autosaveInterval')?.value)
                          || AppDefaults.autosaveInterval,
      metaFields:       splitCsv(document.getElementById('cfg-metaFields')?.value),
    };

    Object.assign(AppDefaults, updated);

    const bookId = AppConfig.activeBookId;
    if (!bookId) {
      console.warn('[snara] No active book — defaults not saved.');
      return;
    }

    await fetch(AppConfig.apiPath + `?action=bookdefault.set&bookId=${encodeURIComponent(bookId)}`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ defaults: updated }),
    });
  }
}

// ── Helpers ───────────────────────────────────────
function esc(str) {
  return String(str ?? '').replace(/"/g, '&quot;').replace(/</g, '&lt;');
}
function splitCsv(str) {
  return (str || '').split(',').map(s => s.trim()).filter(Boolean);
}