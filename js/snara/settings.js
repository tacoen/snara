/* ─────────────────────────────────────────────────
   snara/settings.js — SnaraSettings
   Three-tab config modal:
     General  — app/infra keys  (config.json)
     Defaults — per-book defaults (default.json)
     Editor   — font + entry tag colors + article
                area appearance (conf/editor.json)
   Depends on: AppConfig, AppDefaults, SnaraUI, icx
─────────────────────────────────────────────────── */

import { SnaraComponent }         from './component.js';
import { AppConfig, AppDefaults } from '../snara.js';
import { SnaraUI }                from './ui.js';
import icx                        from '../icons/ge-icon.js';
import { esc, splitCsv }          from '../helpers.js';

export class SnaraSettings extends SnaraComponent {

  constructor() {
    super('settings-modal', { defaultTab: 'general' });
    this._editorPrefs = null;
  }

  // ── DOM is static in partials/settings.html ──────────────────────

  _ensureDOM() {
    const el = document.getElementById(this.modalId);
    if (!el) return;
    if (el.dataset.defaultTab) this._activeTab = el.dataset.defaultTab;
  }

  // ── Open — load editor prefs first, then render ──────────────────

  async open() {
    await this._loadEditorPrefs();
    this._render();
    const { openModal } = await import('./modal.js');
    openModal(this.modalId);
  }

  // ── Render — called on every open ────────────────────────────────

  _render() {
    const body = document.getElementById('settings-body');
    if (!body) return;

    body.innerHTML = `
      <div class="cfg-tabs">
        <button class="cfg-tab${this._activeTab === 'general'  ? ' active' : ''}" data-tab="general">General</button>
        <button class="cfg-tab${this._activeTab === 'defaults' ? ' active' : ''}" data-tab="defaults">Defaults</button>
        <button class="cfg-tab${this._activeTab === 'editor'   ? ' active' : ''}" data-tab="editor">Editor</button>
      </div>
      <div class="cfg-tab-content" id="cfg-tab-content">
        ${this._renderTab(this._activeTab)}
      </div>
    `;

    this._bindTabs();
    this._bindSegmented();
    this._bindToggle();
    this._bindHmapAdd();
    this._bindHmapRemoves();
    icx.delayreplace('#settings-body [data-icon]');
  }

  _renderTab(tab) {
    if (tab === 'general')  return this._renderGeneral();
    if (tab === 'defaults') return this._renderDefaults();
    if (tab === 'editor')   return this._renderEditor();
    return '';
  }

  // ── Tab switching ─────────────────────────────────────────────────

  _switchTab(tab) {
    this._activeTab = tab;
    document.querySelectorAll('#settings-body .cfg-tab').forEach(b =>
      b.classList.toggle('active', b.dataset.tab === tab)
    );
    const content = document.getElementById('cfg-tab-content');
    if (!content) return;
    content.innerHTML = this._renderTab(tab);
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

    const tagDefs = [
      { id: 'act',     label: 'Act',     bg: p.act?.bg,     border: p.act?.border     },
      { id: 'chapter', label: 'Chapter', bg: p.chapter?.bg, border: p.chapter?.border },
      { id: 'scene',   label: 'Scene',   bg: p.scene?.bg,   border: p.scene?.border   },
      { id: 'beat',    label: 'Beat',    bg: p.beat?.bg,    border: p.beat?.border     },
    ];

    // ── Article area — color-theory options ──────────────────────────
    // Primary   = act     (amber/golden)
    // Secondary = chapter (coral/peach)
    // Tertiary  = scene   (mint green)
    const art   = p.article ?? {};
    const artBg = art.bg     || 'transparent';
    const artBd = art.border || 'var(--tag-chapter-bd)';

    const artBgOptions = [
      { val: 'transparent',           label: 'None'      },
      { val: 'var(--tag-act-bg)',     label: 'Primary'   },
      { val: 'var(--tag-chapter-bg)', label: 'Secondary' },
      { val: 'var(--tag-scene-bg)',   label: 'Tertiary'  },
    ];

    const artBdOptions = [
      { val: 'var(--border)',         label: 'Subtle'    },
      { val: 'var(--tag-act-bd)',     label: 'Primary'   },
      { val: 'var(--tag-chapter-bd)', label: 'Secondary' },
      { val: 'var(--tag-scene-bd)',   label: 'Tertiary'  },
    ];

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
          <span class="cfg-hint">background &amp; left border per tag</span>
        </h3>
        ${tagDefs.map(t => this._renderTagColorRow(t)).join('')}
      </section>

      <section class="cfg-section">
        <h3 class="cfg-heading">Article area
          <span class="cfg-hint">background &amp; left border of #article — color theory</span>
        </h3>
        <div style="padding:var(--s-sm) 0">
          <div class="cfg-row">
            <span class="cfg-label" style="display:flex;align-items:center;gap:6px;font-weight:500;color:var(--fg-main)">
              <span style="display:inline-block;width:10px;height:10px;border-radius:2px;
                background:var(--tag-chapter-bg);
                border:1.5px solid var(--tag-chapter-bd)">
              </span>
              Article
            </span>
          </div>
          <div class="cfg-row">
            <label class="cfg-label" style="font-size:10px;opacity:.7">Background</label>
            <div class="cfg-segmented cfg-article-bg">
              ${artBgOptions.map(o =>
                `<button class="cfg-seg${artBg === o.val ? ' active' : ''}" data-val="${o.val}">${o.label}</button>`
              ).join('')}
            </div>
          </div>
          <div class="cfg-row" style="margin-top:4px">
            <label class="cfg-label" style="font-size:10px;opacity:.7">Border</label>
            <div class="cfg-segmented cfg-article-bd">
              ${artBdOptions.map(o =>
                `<button class="cfg-seg${artBd === o.val ? ' active' : ''}" data-val="${o.val}">${o.label}</button>`
              ).join('')}
            </div>
          </div>
        </div>
      </section>
    `;
  }

  // ── Tag color row ─────────────────────────────────────────────────

  _renderTagColorRow({ id, label, bg, border }) {
    const bgOptions = [
      { val: 'transparent',          label: 'None'  },
      { val: `var(--tag-${id}-bg)`,  label: 'Tint'  },
      { val: `var(--tag-${id}-bd)`,  label: 'Muted' },
    ];

    const bdOptions = id === 'beat'
      ? [
          { val: 'var(--tag-draft-fg)', label: 'Draft'  },
          { val: 'var(--tag-beat-bd)',  label: 'Accent' },
          { val: 'var(--border)',       label: 'Subtle' },
        ]
      : [
          { val: `var(--tag-${id}-fg)`, label: 'Primary'   },
          { val: `var(--tag-${id}-bd)`, label: 'Secondary' },
          { val: 'var(--border)',        label: 'Subtle'    },
        ];

    const defaultBd = id === 'beat' ? 'var(--tag-draft-fg)' : `var(--tag-${id}-fg)`;
    const curBg = bg     || 'transparent';
    const curBd = border || defaultBd;

    return `
      <div style="padding:var(--s-sm) 0;border-bottom:1px solid var(--border)">
        <div class="cfg-row" style="margin-bottom:var(--s-xs)">
          <span class="cfg-label" style="display:flex;align-items:center;gap:6px;font-weight:500;color:var(--fg-main)">
            <span style="display:inline-block;width:10px;height:10px;border-radius:2px;
              background:var(--tag-${id}-bg);
              border:1.5px solid ${id === 'beat' ? 'var(--tag-draft-fg)' : `var(--tag-${id}-fg)`}">
            </span>
            ${label}
          </span>
        </div>
        <div class="cfg-row">
          <label class="cfg-label" style="font-size:10px;opacity:.7">Background</label>
          <div class="cfg-segmented cfg-entry-bg" data-tag="${id}">
            ${bgOptions.map(o =>
              `<button class="cfg-seg${curBg === o.val ? ' active' : ''}" data-val="${o.val}">${o.label}</button>`
            ).join('')}
          </div>
        </div>
        <div class="cfg-row" style="margin-top:4px">
          <label class="cfg-label" style="font-size:10px;opacity:.7">Border</label>
          <div class="cfg-segmented cfg-entry-bd" data-tag="${id}">
            ${bdOptions.map(o =>
              `<button class="cfg-seg${curBd === o.val ? ' active' : ''}" data-val="${o.val}">${o.label}</button>`
            ).join('')}
          </div>
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

  // ── Snapshot editor prefs from current DOM ────────────────────────
  // Called on every segmented click — NOT at save time.
  // Guard: if Editor tab not rendered, fontGroup is null → returns
  // early without mutating _editorPrefs (safe across all tabs).

  _snapshotEditorPrefs() {
    const fontGroup = document.getElementById('cfg-entry-font');
    if (!fontGroup) return;

    const font = fontGroup.querySelector('.cfg-seg.active')?.dataset.val || 'var(--font-sans)';

    // Entry tag bg + border
    const tags = {};
    document.querySelectorAll('.cfg-entry-bg[data-tag]').forEach(bgGroup => {
      const tag     = bgGroup.dataset.tag;
      const bg      = bgGroup.querySelector('.cfg-seg.active')?.dataset.val || 'transparent';
      const bdGroup = document.querySelector(`.cfg-entry-bd[data-tag="${tag}"]`);
      const border  = bdGroup?.querySelector('.cfg-seg.active')?.dataset.val
        || `var(--tag-${tag}-fg)`;
      tags[tag] = { bg, border };
    });

    // Article container bg + border (color-theory)
    const artBgGroup = document.querySelector('.cfg-article-bg');
    const artBdGroup = document.querySelector('.cfg-article-bd');
    const article = {
      bg:     artBgGroup?.querySelector('.cfg-seg.active')?.dataset.val ?? 'transparent',
      border: artBdGroup?.querySelector('.cfg-seg.active')?.dataset.val ?? 'var(--tag-chapter-bd)',
    };

    this._editorPrefs = { font, ...tags, article };
  }

  // ── Bind segmented button groups ──────────────────────────────────

  _bindSegmented() {
    document.querySelectorAll('#settings-body .cfg-segmented').forEach(group => {
      group.addEventListener('click', e => {
        const btn = e.target.closest('.cfg-seg');
        if (!btn) return;
        group.querySelectorAll('.cfg-seg').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        // Live font preview
        if (group.id === 'cfg-entry-font') {
          const preview = document.getElementById('cfg-font-preview');
          if (preview) preview.style.fontFamily = btn.dataset.val;
        }

        // Live preview — entry tag bg
        if (group.classList.contains('cfg-entry-bg')) {
          const tag = group.dataset.tag;
          if (tag) document.documentElement.style.setProperty(`--entry-${tag}-bg`, btn.dataset.val);
        }

        // Live preview — entry tag border
        if (group.classList.contains('cfg-entry-bd')) {
          const tag = group.dataset.tag;
          if (tag) document.documentElement.style.setProperty(`--entry-${tag}-border`, btn.dataset.val);
        }

        // Live preview — article background
        if (group.classList.contains('cfg-article-bg')) {
          document.documentElement.style.setProperty('--article-bg', btn.dataset.val);
        }

        // Live preview — article border
        if (group.classList.contains('cfg-article-bd')) {
          document.documentElement.style.setProperty('--article-border', btn.dataset.val);
        }

        // Snapshot editor state to memory on every change
        this._snapshotEditorPrefs();
      });
    });
  }

  // ── Bind toggle (autosave) ────────────────────────────────────────

  _bindToggle() {
    document.getElementById('cfg-autosave')?.addEventListener('click', function () {
      const on = this.classList.toggle('on');
      this.setAttribute('aria-pressed', on);
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

  // ── Save — writes all three tabs ─────────────────────────────────

  async save() {
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
    } catch {
      btn.textContent = 'error';
    }

    setTimeout(() => {
      btn.disabled    = false;
      btn.textContent = 'save';
      this.close();
    }, 900);
  }

  // ── Save: General tab ─────────────────────────────────────────────

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

  // ── Save: Defaults tab ────────────────────────────────────────────

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

  // ── Save: Editor tab ──────────────────────────────────────────────
  // Original guard: snapshot fires on click via _bindSegmented(),
  // not here. _editorPrefs is always populated by _loadEditorPrefs()
  // on open(), so the !_editorPrefs guard is a safety net only.

  async _saveEditor() {
    const bookId = AppConfig.activeBookId;
    if (!bookId || !this._editorPrefs) return;

    SnaraSettings.applyEditorPrefs(this._editorPrefs);

    await fetch(AppConfig.apiPath + `?action=editorpref.set&bookId=${encodeURIComponent(bookId)}`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(this._editorPrefs),
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

  // ── Static: apply all CSS variables to :root ─────────────────────
  // Called on boot (snara.js) and immediately after _saveEditor().

  static applyEditorPrefs(prefs) {
    if (!prefs) return;
    const r = document.documentElement;

    // Font family for #article .entries
    if (prefs.font) r.style.setProperty('--entry-font', prefs.font);

    // Entry tag bg + border — original loop, unchanged
    for (const tag of ['act', 'chapter', 'scene', 'beat']) {
      const t = prefs[tag];
      if (!t) continue;
      if (t.bg)     r.style.setProperty(`--entry-${tag}-bg`,     t.bg);
      if (t.border) r.style.setProperty(`--entry-${tag}-border`,  t.border);
    }

    // Article container — additive, skipped if key absent (old prefs)
    const a = prefs.article;
    if (a) {
      if (a.bg)     r.style.setProperty('--article-bg',     a.bg);
      if (a.border) r.style.setProperty('--article-border', a.border);
    }
  }
}