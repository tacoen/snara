/* ─────────────────────────────────────────────────
   snara/settings.js — SnaraSettings
   Three-tab config modal:
     General  — app/infra keys  (config.json)
     Defaults — per-book defaults (default.json)
     Editor   — font + entry tag colors (conf/editor.json)

   Save strategy: _snap holds all tab values.
   Each tab snapshots on switch + at save() time.
   save() reads _snap only — never the DOM directly.

   Color resolution: openModal() runs BEFORE _render()
   so the modal is visible when resolveToHex() calls
   getComputedStyle — var(--*) chains resolve correctly.

   applyEditorPrefs: vars.css already defines the
   defaults for --entry-*-bg and --entry-*-border.
   The JS only needs to override when the user has
   saved a custom value. Transparent bg is skipped
   (CSS default is already transparent).
─────────────────────────────────────────────────── */

import { SnaraComponent }         from './component.js';
import { AppConfig, AppDefaults } from '../snara.js';
import { SnaraUI }                from './ui.js';
import icx                        from '../icons/ge-icon.js';
import { esc, splitCsv }          from '../helpers.js';

// ── Resolve any CSS color value → #rrggbb ─────────────────────────────
// Appends a throw-away element to <body> so the full cascade applies,
// then reads getComputedStyle().color which is always a concrete rgb().
// Works for var(--*) at any nesting depth, hex, rgb(), named colors.
// Must be called while the modal is visible (not [hidden]).
function resolveToHex(value) {
  if (!value || value === 'transparent') return '#000000';
  if (/^#[0-9a-fA-F]{3,8}$/.test(value)) {
    const h = value.replace('#', '');
    if (h.length === 3) return '#' + h.split('').map(c => c + c).join('');
    return '#' + h.slice(0, 6);
  }
  const el = document.createElement('div');
  el.style.cssText = `position:absolute;visibility:hidden;pointer-events:none;color:${value}`;
  document.body.appendChild(el);
  const rgb = getComputedStyle(el).color;
  document.body.removeChild(el);
  const m = rgb.match(/(\d+),\s*(\d+),\s*(\d+)/);
  if (m) return '#' + [m[1], m[2], m[3]]
    .map(n => parseInt(n).toString(16).padStart(2, '0')).join('');
  return '#000000';
}

export class SnaraSettings extends SnaraComponent {

  constructor() {
    super('settings-modal', { defaultTab: 'defaults' });
    this._editorPrefs = null;
    this._snap = { general: null, defaults: null, editor: null };
  }

  // ── DOM is static in partials/settings.html ──────────────────────

  _ensureDOM() {
    const el = document.getElementById(this.modalId);
    if (!el) return;
    if (el.dataset.defaultTab) this._activeTab = el.dataset.defaultTab;
  }

  // ── Open ─────────────────────────────────────────────────────────
  // openModal() FIRST — modal must be visible before _render()
  // so resolveToHex() can call getComputedStyle correctly.

  async open() {
    await this._loadEditorPrefs();

    this._snap.general = {
      apiPath:    AppConfig.apiPath,
      dataPath:   AppConfig.dataPath,
      theme:      AppConfig.theme || 'light',
      classes:    (AppConfig.classes || []).join(', '),
      headingMap: AppConfig.headingMap || [],
    };
    this._snap.defaults = {
      act:              AppDefaults.act,
      defaultTag:       AppDefaults.defaultTag,
      autosave:         AppDefaults.autosave,
      autosaveInterval: AppDefaults.autosaveInterval,
      metaFields:       (AppDefaults.metaFields || []).join(', '),
    };
    this._snap.editor = this._editorPrefs ? { ...this._editorPrefs } : {};

    // ── visible FIRST ───────────────────────────────────────────────
    const { openModal } = await import('./modal.js');
    openModal(this.modalId);

    // ── render AFTER — resolveToHex() works now ─────────────────────
    this._render();
  }

  // ── Render shell ─────────────────────────────────────────────────

  _render() {
    const body = document.getElementById('settings-body');
    if (!body) return;

    body.innerHTML = `
      <div class="cfg-tabs">
        <button class="cfg-tab${this._activeTab === 'defaults' ? ' active' : ''}" data-tab="defaults">Defaults</button>
        <button class="cfg-tab${this._activeTab === 'editor'   ? ' active' : ''}" data-tab="editor">Editor</button>
        <button class="cfg-tab${this._activeTab === 'general'  ? ' active' : ''}" data-tab="general">General</button>
      </div>
      <div class="cfg-tab-content" id="cfg-tab-content">
        ${this._renderTab(this._activeTab)}
      </div>
    `;

    this._bindTabs();
    this._bindCurrentTab();
    icx.delayreplace('#settings-body [data-icon]');
  }

  _renderTab(tab) {
    if (tab === 'general')  return this._renderGeneral();
    if (tab === 'defaults') return this._renderDefaults();
    if (tab === 'editor')   return this._renderEditor();
    return '';
  }

  // ── Tab switching — snapshot BEFORE switching ─────────────────────

  _switchTab(newTab) {
    this._snapshotTab(this._activeTab);
    this._activeTab = newTab;

    document.querySelectorAll('#settings-body .cfg-tab').forEach(b =>
      b.classList.toggle('active', b.dataset.tab === newTab)
    );

    const content = document.getElementById('cfg-tab-content');
    if (!content) return;
    // Modal already visible — resolveToHex works immediately
    content.innerHTML = this._renderTab(newTab);
    this._bindCurrentTab();
    icx.delayreplace('#settings-body [data-icon]');
  }

  _bindTabs() {
    document.querySelectorAll('#settings-body .cfg-tab').forEach(btn => {
      btn.addEventListener('click', () => this._switchTab(btn.dataset.tab));
    });
  }

  _bindCurrentTab() {
    this._bindSegmented();
    this._bindToggle();
    this._bindColorPickers();
    if (this._activeTab === 'general') {
      this._bindHmapAdd();
      this._bindHmapRemoves();
    }
  }

  // ── Snapshot active tab into _snap ────────────────────────────────

  _snapshotTab(tab) {
    if (tab === 'general')  this._snapshotGeneral();
    if (tab === 'defaults') this._snapshotDefaults();
    if (tab === 'editor')   this._snapshotEditor();
  }

  _snapshotGeneral() {
    const apiPath  = document.getElementById('cfg-apiPath');
    const dataPath = document.getElementById('cfg-dataPath');
    const theme    = document.querySelector('#cfg-theme .cfg-seg.active');
    const classes  = document.getElementById('cfg-classes');
    if (!apiPath && !theme) return;

    const headingMap = [];
    document.querySelectorAll('.cfg-hmap-row').forEach(row => {
      const prefix = row.querySelector('.cfg-hmap-prefix')?.value ?? '';
      const cls    = row.querySelector('.cfg-hmap-cls')?.value.trim() ?? '';
      if (prefix || cls) headingMap.push({ prefix, cls });
    });

    this._snap.general = {
      apiPath:    apiPath?.value     || this._snap.general?.apiPath    || AppConfig.apiPath,
      dataPath:   dataPath?.value    || this._snap.general?.dataPath   || AppConfig.dataPath,
      theme:      theme?.dataset.val || this._snap.general?.theme      || AppConfig.theme || 'light',
      classes:    classes?.value     || this._snap.general?.classes    || (AppConfig.classes || []).join(', '),
      headingMap: headingMap.length  ? headingMap : (this._snap.general?.headingMap || AppConfig.headingMap || []),
    };
  }

  _snapshotDefaults() {
    const actEl      = document.getElementById('cfg-act');
    const tagEl      = document.querySelector('#cfg-defaultTag .cfg-seg.active');
    const autosaveEl = document.getElementById('cfg-autosave');
    const intervalEl = document.getElementById('cfg-autosaveInterval');
    const metaEl     = document.getElementById('cfg-metaFields');
    if (!actEl && !tagEl) return;

    this._snap.defaults = {
      act:              actEl?.value                         ?? this._snap.defaults?.act              ?? AppDefaults.act,
      defaultTag:       tagEl?.dataset.val                   ?? this._snap.defaults?.defaultTag       ?? AppDefaults.defaultTag,
      autosave:         autosaveEl?.classList.contains('on') ?? this._snap.defaults?.autosave         ?? AppDefaults.autosave,
      autosaveInterval: parseInt(intervalEl?.value)          || this._snap.defaults?.autosaveInterval || AppDefaults.autosaveInterval,
      metaFields:       metaEl?.value                        ?? this._snap.defaults?.metaFields       ?? (AppDefaults.metaFields || []).join(', '),
    };
  }

  _snapshotEditor() {
    const fontGroup = document.getElementById('cfg-entry-font');
    if (!fontGroup) return;

    const font = fontGroup.querySelector('.cfg-seg.active')?.dataset.val || 'var(--font-sans)';
    const tags = {};

    for (const tag of ['act', 'chapter', 'scene', 'beat']) {
      const bgPicker = document.querySelector(`#settings-body .cfg-color-input[data-tag="${tag}"][data-prop="bg"]`);
      const bdPicker = document.querySelector(`#settings-body .cfg-color-input[data-tag="${tag}"][data-prop="border"]`);
      const noneBox  = document.querySelector(`#settings-body .cfg-color-none[data-tag="${tag}"]`);
      tags[tag] = {
        bg:     noneBox?.checked ? 'transparent' : (bgPicker?.value || 'transparent'),
        border: bdPicker?.value  || `var(--tag-${tag}-fg)`,
      };
    }

    this._snap.editor = { font, ...tags };
    this._editorPrefs = this._snap.editor;
  }

  // ── General tab ───────────────────────────────────────────────────

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

  // ── Defaults tab ──────────────────────────────────────────────────

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

  // ── Editor tab ────────────────────────────────────────────────────

  _renderEditor() {
    const p    = this._editorPrefs || {};
    const font = p.font || 'var(--font-sans)';

    return `
      <section class="cfg-section">
        <h3 class="cfg-heading">Typography
          <span class="cfg-hint">font family for #article .entries</span>
        </h3>
        <div class="cfg-row">
          <label class="cfg-label">Font</label>
          <div class="cfg-segmented" id="cfg-entry-font">
            ${[
              { val: 'var(--font-sans)',  label: 'Sans'  },
              { val: 'var(--font-serif)', label: 'Serif' },
              { val: 'var(--font-mono)',  label: 'Mono'  },
            ].map(f =>
              `<button class="cfg-seg${font === f.val ? ' active' : ''}" data-val="${f.val}">${f.label}</button>`
            ).join('')}
          </div>
        </div>
        <div class="cfg-row">
          <label class="cfg-label"></label>
          <span id="cfg-font-preview" style="font-family:${font};font-size:0.9375rem;color:var(--fg-muted);line-height:1.6">
            The quick brown fox jumps over the lazy dog.
          </span>
        </div>
      </section>

      <section class="cfg-section">
        <h3 class="cfg-heading">Entry colors
          <span class="cfg-hint">background &amp; left-border per tag</span>
        </h3>
        ${['act', 'chapter', 'scene', 'beat'].map(id => this._renderTagColorRow(id)).join('')}
      </section>
    `;
  }

  // ── Tag color row ─────────────────────────────────────────────────
  // Called while modal is already visible — resolveToHex() works.

  _renderTagColorRow(id) {
    const label = id.charAt(0).toUpperCase() + id.slice(1);
    const p     = this._editorPrefs || {};

    const defaultBorder = id === 'beat' ? 'var(--tag-draft-fg)' : `var(--tag-${id}-fg)`;
    const curBg         = p[id]?.bg     || 'transparent';
    const curBorder     = p[id]?.border || defaultBorder;

    const bgIsNone  = curBg === 'transparent';
    const bgHex     = bgIsNone ? '#ffffff' : resolveToHex(curBg);
    const borderHex = resolveToHex(curBorder);

    return `
      <div class="cfg-color-row">

        <div class="cfg-row" style="margin-bottom:var(--s-sm)">
          <span class="cfg-label" style="display:flex;align-items:center;gap:8px;font-weight:500;color:var(--fg-main)">
            <span class="cfg-color-preview" data-tag="${id}" style="
              background:${bgIsNone ? 'transparent' : bgHex};
              border-left:3px solid ${borderHex};
              transition:background 0.1s,border-color 0.1s;
            ">${label}</span>
          </span>
        </div>

        <div class="cfg-row" style="margin-bottom:var(--s-xs)">
          <label class="cfg-label" style="font-size:10px;opacity:.7">Background</label>
          <div style="display:flex;align-items:center;gap:var(--s-sm)">
            <input type="color" class="cfg-color-input"
              data-tag="${id}" data-prop="bg"
              value="${bgHex}"
              ${bgIsNone ? 'disabled' : ''}
              title="Background color"
              style="width:32px;height:26px;padding:1px 2px;border:1px solid var(--border);
                     border-radius:4px;cursor:pointer;background:none;">
            <label style="display:flex;align-items:center;gap:4px;font-size:var(--f-xs);
                          color:var(--fg-muted);cursor:pointer;user-select:none">
              <input type="checkbox" class="cfg-color-none"
                data-tag="${id}" data-prop="bg"
                ${bgIsNone ? 'checked' : ''}
                style="accent-color:var(--primary);cursor:pointer">
              None
            </label>
          </div>
        </div>

        <div class="cfg-row">
          <label class="cfg-label" style="font-size:10px;opacity:.7">Border</label>
          <input type="color" class="cfg-color-input"
            data-tag="${id}" data-prop="border"
            value="${borderHex}"
            title="Left-border color"
            style="width:32px;height:26px;padding:1px 2px;border:1px solid var(--border);
                   border-radius:4px;cursor:pointer;background:none;">
        </div>

      </div>`;
  }

  // ── Heading map row ───────────────────────────────────────────────

  _hmapRow({ prefix = '', cls = '' } = {}, i = Date.now()) {
    return `
      <div class="cfg-hmap-row">
        <input class="cfg-input cfg-hmap-prefix" placeholder='e.g. "# "' value="${esc(prefix)}">
        <span class="cfg-arrow">→</span>
        <input class="cfg-input cfg-hmap-cls" placeholder="cls" value="${esc(cls)}">
        <button class="cfg-hmap-remove" title="Remove rule"><i data-icon="x"></i></button>
      </div>`;
  }

  // ── Bind color pickers ────────────────────────────────────────────

  _bindColorPickers() {
    document.querySelectorAll('#settings-body .cfg-color-input').forEach(input => {
      input.addEventListener('input', () => {
        const { tag, prop } = input.dataset;
        document.documentElement.style.setProperty(
          prop === 'bg' ? `--entry-${tag}-bg` : `--entry-${tag}-border`,
          input.value
        );
        this._updatePreviewStrip(tag);
        this._snapshotEditor();
      });
    });

    document.querySelectorAll('#settings-body .cfg-color-none').forEach(checkbox => {
      checkbox.addEventListener('change', () => {
        const { tag } = checkbox.dataset;
        const picker  = document.querySelector(
          `#settings-body .cfg-color-input[data-tag="${tag}"][data-prop="bg"]`
        );
        if (!picker) return;
        picker.disabled = checkbox.checked;
        document.documentElement.style.setProperty(
          `--entry-${tag}-bg`,
          checkbox.checked ? 'transparent' : picker.value
        );
        this._updatePreviewStrip(tag);
        this._snapshotEditor();
      });
    });
  }

  _updatePreviewStrip(tag) {
    const strip    = document.querySelector(`#settings-body .cfg-color-preview[data-tag="${tag}"]`);
    const bgPicker = document.querySelector(`#settings-body .cfg-color-input[data-tag="${tag}"][data-prop="bg"]`);
    const bdPicker = document.querySelector(`#settings-body .cfg-color-input[data-tag="${tag}"][data-prop="border"]`);
    const noneBox  = document.querySelector(`#settings-body .cfg-color-none[data-tag="${tag}"]`);
    if (!strip) return;
    if (bgPicker) strip.style.background      = noneBox?.checked ? 'transparent' : bgPicker.value;
    if (bdPicker) strip.style.borderLeftColor = bdPicker.value;
  }

  // ── Bind segmented buttons ────────────────────────────────────────

  _bindSegmented() {
    document.querySelectorAll('#settings-body .cfg-segmented').forEach(group => {
      group.addEventListener('click', e => {
        const btn = e.target.closest('.cfg-seg');
        if (!btn) return;
        group.querySelectorAll('.cfg-seg').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        if (group.id === 'cfg-entry-font') {
          const preview = document.getElementById('cfg-font-preview');
          if (preview) preview.style.fontFamily = btn.dataset.val;
          this._snapshotEditor();
        }
      });
    });
  }

  // ── Bind toggle (autosave) ────────────────────────────────────────

  _bindToggle() {
    document.getElementById('cfg-autosave')?.addEventListener('click', function () {
      this.classList.toggle('on');
      this.setAttribute('aria-pressed', this.classList.contains('on'));
    });
  }

  // ── Bind heading map add / remove ─────────────────────────────────

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

  // ── Save ─────────────────────────────────────────────────────────

  async save() {
    this._snapshotTab(this._activeTab);

    const btn = document.getElementById('cfg-save-btn');
    btn.disabled    = true;
    btn.textContent = 'saving…';

    try {
      await Promise.all([
        this._saveGeneral(),
        this._saveDefaults(),
        this._saveEditor(),
      ]);
      btn.textContent = 'saved ✓';
    } catch (e) {
      console.error('[settings] save error', e);
      btn.textContent = 'error';
    }

    setTimeout(() => {
      btn.disabled    = false;
      btn.textContent = 'save';
      this.close();
    }, 900);
  }

  async _saveGeneral() {
    const s = this._snap.general;
    if (!s) return;
    const updated = {
      apiPath:    s.apiPath,
      dataPath:   s.dataPath,
      theme:      s.theme,
      classes:    splitCsv(s.classes),
      headingMap: s.headingMap,
    };
    Object.assign(AppConfig, updated);
    const resolved = s.theme === 'system'
      ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
      : s.theme;
    SnaraUI.instance.toggleTheme(resolved);
    await fetch(AppConfig.apiPath + '?action=config.set', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updated),
    });
  }

  async _saveDefaults() {
    const s = this._snap.defaults;
    if (!s) return;
    const updated = {
      act:              s.act,
      defaultTag:       s.defaultTag,
      autosave:         s.autosave,
      autosaveInterval: s.autosaveInterval,
      metaFields:       splitCsv(s.metaFields),
    };
    Object.assign(AppDefaults, updated);
    const bookId = AppConfig.activeBookId;
    if (!bookId) { console.warn('[snara] No active book — defaults not saved.'); return; }
    await fetch(AppConfig.apiPath + `?action=bookdefault.set&bookId=${encodeURIComponent(bookId)}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ defaults: updated }),
    });
  }

  async _saveEditor() {
    const bookId = AppConfig.activeBookId;
    const s      = this._snap.editor;
    if (!bookId || !s) return;
    this._editorPrefs = s;
    SnaraSettings.applyEditorPrefs(s);
    await fetch(AppConfig.apiPath + `?action=editorpref.set&bookId=${encodeURIComponent(bookId)}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(s),
    });
  }

  // ── Load editor prefs from server ─────────────────────────────────

  async _loadEditorPrefs() {
    const bookId = AppConfig.activeBookId;
    if (!bookId) { this._editorPrefs = {}; return; }
    try {
      const res = await fetch(`${AppConfig.apiPath}?action=editorpref.get&bookId=${bookId}`);
      if (res.ok) this._editorPrefs = await res.json();
      else        this._editorPrefs = {};
    } catch {
      this._editorPrefs = {};
    }
  }

  // ── Static: apply saved custom properties to :root ───────────────
  // vars.css already defines the defaults:
  //   --entry-act-bg:         transparent
  //   --entry-act-border:     var(--tag-act-fg)
  //   --entry-chapter-bg:     transparent
  //   --entry-chapter-border: var(--tag-chapter-fg)
  //   --entry-scene-bg:       transparent
  //   --entry-scene-border:   var(--tag-scene-fg)
  //   --entry-beat-bg:        transparent
  //   --entry-beat-border:    var(--tag-draft-fg)
  //
  // So we only set a property when the user has saved a custom value.
  // transparent bg is skipped — CSS default is already transparent.

  static applyEditorPrefs(prefs) {
    if (!prefs) return;
    const r = document.documentElement;

    if (prefs.font) r.style.setProperty('--entry-font', prefs.font);

    for (const tag of ['act', 'chapter', 'scene', 'beat']) {
      const t = prefs[tag];
      if (!t) continue;
      // Only override bg if it's a real color (not transparent — CSS handles that)
      if (t.bg && t.bg !== 'transparent') {
        r.style.setProperty(`--entry-${tag}-bg`, t.bg);
      } else {
        // Remove any previous override — let vars.css default (transparent) apply
        r.style.removeProperty(`--entry-${tag}-bg`);
      }
      // Always set border — user may have changed it from the CSS default
      if (t.border) {
        r.style.setProperty(`--entry-${tag}-border`, t.border);
      } else {
        r.style.removeProperty(`--entry-${tag}-border`);
      }
    }
  }
}