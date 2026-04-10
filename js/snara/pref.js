/* ─────────────────────────────────────────────────
   js/snara/pref.js — SnaraPref
   
   
   
   
   CSS variable customizer with Light / Dark / Spacing tabs.
   Persists overrides to /json/cssvars.json via API.
   Applied on boot via injected <style> tag.

   Export produces a complete vars.css replacement:
   defaults merged with saved overrides, plus the
   static scrollbar rules appended verbatim.
─────────────────────────────────────────────────── */
import { AppConfig } from '../snara.js';
import icx           from '../icons/ge-icon.js';
import { openModal, closeModal } from './modal.js';
import { esc } from '../helpers.js';

// ── Defaults (mirrors css/vars.css exactly) ───────

const DEFAULTS = {
  root: {
    '--s-xs': '0.25rem',
    '--s-sm': '0.5rem',
    '--s-md': '1rem',
    '--s-lg': '1.25rem',
    '--s-xl': '1.5rem',
    '--f-xs': '0.75rem',
    '--f-sm': '1rem',
    '--f-md': '1.25rem',
  },
  light: {
    '--bg-main':        '#ffffff',
    '--bg-alt':         '#f6f8fa',
	'--bg-mate':        '#fcfcfc',
    '--bg-hover':       '#f0f2f5',
    '--fg-main':        '#24292f',
    '--fg-muted':       '#57606a',
    '--fg-link':        '#0969da',
    '--border':         '#d0d7de',
    '--primary':        '#0969da',
    '--danger':         '#cf222e',
    '--overlay':        'rgba(0, 0, 0, 0.4)',
    '--selection':      '#ddf4ff',
    '--sel-border':     '#54aeff',
    '--tag-beat-bg':    '#eeedfe',
    '--tag-beat-fg':    '#0f6e56',
    '--tag-beat-bd':    '#afa9ec',
    '--tag-draft-fg':   '#3c3489',
    '--tag-scene-bg':   '#e1f5ee',
    '--tag-scene-fg':   '#0f6e56',
    '--tag-scene-bd':   '#5dcaa5',
    '--tag-chapter-bg': '#faece7',
    '--tag-chapter-fg': '#993c1d',
    '--tag-chapter-bd': '#f0997b',
    '--tag-act-bg':     '#fbca33',
    '--tag-act-fg':     '#aa6600',
    '--tag-act-bd':     '#ed93b1',
  },
  dark: {
    '--bg-main':        '#0d1117',
    '--bg-alt':         '#161b22',
    '--bg-mate':        '#14181f',
    '--bg-hover':       '#21262d',
    '--fg-main':        '#c9d1d9',
    '--fg-muted':       '#8b949e',
    '--fg-link':        '#58a6ff',
    '--border':         '#30363d',
    '--primary':        '#1f6feb',
    '--danger':         '#f85149',
    '--overlay':        'rgba(0, 0, 0, 0.75)',
    '--selection':      'rgba(56, 139, 253, 0.15)',
    '--sel-border':     '#388bfd',
    '--tag-beat-bg':    '#eeedfe',
    '--tag-beat-fg':    '#0f6e56',
    '--tag-beat-bd':    '#afa9ec',
    '--tag-draft-fg':   '#3c3489',
    '--tag-scene-bg':   '#e1f5ee',
    '--tag-scene-fg':   '#0f6e56',
    '--tag-scene-bd':   '#5dcaa5',
    '--tag-chapter-bg': '#faece7',
    '--tag-chapter-fg': '#993c1d',
    '--tag-chapter-bd': '#f0997b',
    '--tag-act-bg':     '#fbca33',
    '--tag-act-fg':     '#aa6600',
    '--tag-act-bd':     '#ed93b1',
  },
};

// Static scrollbar rules appended verbatim to every export
const SCROLLBAR_CSS = `
::-webkit-scrollbar {
  width: 8px;
}

.entry::-webkit-scrollbar {
  width: 4px;
}

.entry::-webkit-scrollbar-thumb {
  background: var(--border);
  border-radius: 10px;
}

.entry::-webkit-scrollbar-thumb:hover {
  background: var(--bg-hover);
}
`;

// ── Group layout ──────────────────────────────────

const GROUPS = {
  root: [
    { heading: 'Spacing', vars: [
      { name: '--s-xs', label: 'XS', type: 'size' },
      { name: '--s-sm', label: 'SM', type: 'size' },
      { name: '--s-md', label: 'MD', type: 'size' },
      { name: '--s-lg', label: 'LG', type: 'size' },
      { name: '--s-xl', label: 'XL', type: 'size' },
    ]},
    { heading: 'Font sizes', vars: [
      { name: '--f-xs', label: 'XS', type: 'size' },
      { name: '--f-sm', label: 'SM', type: 'size' },
      { name: '--f-md', label: 'MD', type: 'size' },
    ]},
  ],
  light: [
    { heading: 'Backgrounds', vars: [
      { name: '--bg-main',  label: 'Main',  type: 'color' },
      { name: '--bg-alt',   label: 'Alt',   type: 'color' },
      { name: '--bg-mate',  label: 'Mate',  type: 'color' },
      { name: '--bg-hover', label: 'Hover', type: 'color' },
    ]},
    { heading: 'Foregrounds', vars: [
      { name: '--fg-main',  label: 'Main',  type: 'color' },
      { name: '--fg-muted', label: 'Muted', type: 'color' },
      { name: '--fg-link',  label: 'Link',  type: 'color' },
    ]},
    { heading: 'Chrome', vars: [
      { name: '--border',     label: 'Border',     type: 'color' },
      { name: '--primary',    label: 'Primary',    type: 'color' },
      { name: '--danger',     label: 'Danger',     type: 'color' },
      { name: '--overlay',    label: 'Overlay',    type: 'text'  },
      { name: '--selection',  label: 'Selection',  type: 'color' },
      { name: '--sel-border', label: 'Sel border', type: 'color' },
    ]},
    { heading: 'Tag — beat', vars: [
      { name: '--tag-beat-bg',  label: 'Background', type: 'color' },
      { name: '--tag-beat-fg',  label: 'Text',       type: 'color' },
      { name: '--tag-beat-bd',  label: 'Border',     type: 'color' },
      { name: '--tag-draft-fg', label: 'Draft text', type: 'color' },
    ]},
    { heading: 'Tag — scene', vars: [
      { name: '--tag-scene-bg', label: 'Background', type: 'color' },
      { name: '--tag-scene-fg', label: 'Text',       type: 'color' },
      { name: '--tag-scene-bd', label: 'Border',     type: 'color' },
    ]},
    { heading: 'Tag — chapter', vars: [
      { name: '--tag-chapter-bg', label: 'Background', type: 'color' },
      { name: '--tag-chapter-fg', label: 'Text',       type: 'color' },
      { name: '--tag-chapter-bd', label: 'Border',     type: 'color' },
    ]},
    { heading: 'Tag — act', vars: [
      { name: '--tag-act-bg', label: 'Background', type: 'color' },
      { name: '--tag-act-fg', label: 'Text',       type: 'color' },
      { name: '--tag-act-bd', label: 'Border',     type: 'color' },
    ]},
  ],
  dark: [
    { heading: 'Backgrounds', vars: [
      { name: '--bg-main',  label: 'Main',  type: 'color' },
      { name: '--bg-alt',   label: 'Alt',   type: 'color' },
      { name: '--bg-mate',  label: 'Mate',  type: 'color' },
      { name: '--bg-hover', label: 'Hover', type: 'color' },
    ]},
    { heading: 'Foregrounds', vars: [
      { name: '--fg-main',  label: 'Main',  type: 'color' },
      { name: '--fg-muted', label: 'Muted', type: 'color' },
      { name: '--fg-link',  label: 'Link',  type: 'color' },
    ]},
    { heading: 'Chrome', vars: [
      { name: '--border',     label: 'Border',     type: 'color' },
      { name: '--primary',    label: 'Primary',    type: 'color' },
      { name: '--danger',     label: 'Danger',     type: 'color' },
      { name: '--overlay',    label: 'Overlay',    type: 'text'  },
      { name: '--selection',  label: 'Selection',  type: 'text'  },
      { name: '--sel-border', label: 'Sel border', type: 'color' },
    ]},
    { heading: 'Tag — beat', vars: [
      { name: '--tag-beat-bg',  label: 'Background', type: 'color' },
      { name: '--tag-beat-fg',  label: 'Text',       type: 'color' },
      { name: '--tag-beat-bd',  label: 'Border',     type: 'color' },
      { name: '--tag-draft-fg', label: 'Draft text', type: 'color' },
    ]},
    { heading: 'Tag — scene', vars: [
      { name: '--tag-scene-bg', label: 'Background', type: 'color' },
      { name: '--tag-scene-fg', label: 'Text',       type: 'color' },
      { name: '--tag-scene-bd', label: 'Border',     type: 'color' },
    ]},
    { heading: 'Tag — chapter', vars: [
      { name: '--tag-chapter-bg', label: 'Background', type: 'color' },
      { name: '--tag-chapter-fg', label: 'Text',       type: 'color' },
      { name: '--tag-chapter-bd', label: 'Border',     type: 'color' },
    ]},
    { heading: 'Tag — act', vars: [
      { name: '--tag-act-bg', label: 'Background', type: 'color' },
      { name: '--tag-act-fg', label: 'Text',       type: 'color' },
      { name: '--tag-act-bd', label: 'Border',     type: 'color' },
    ]},
  ],
};

// ── Align value column (pad to longest key + 1) ───

function alignedVarsBlock(map) {
  const entries = Object.entries(map);
  if (!entries.length) return '';
  const maxLen = Math.max(...entries.map(([k]) => k.length));
  return entries
    .map(([k, v]) => `  ${k}:${' '.repeat(maxLen - k.length + 1)}${v};`)
    .join('\n');
}

// ── Build a full, complete vars.css string ─────────
// Merges DEFAULTS for each scope with saved overrides,
// so the file is always complete and usable as-is.

function buildFullCss(saved) {
  const rootVars  = { ...DEFAULTS.root,  ...(saved.root  ?? {}) };
  const lightVars = { ...DEFAULTS.light, ...(saved.light ?? {}) };
  const darkVars  = { ...DEFAULTS.dark,  ...(saved.dark  ?? {}) };

  // Split light vars into logical groups for readability
  const chromeSpacer     = ['--overlay', '--selection', '--sel-border'];
  const tagBeat          = ['--tag-beat-bg','--tag-beat-fg','--tag-beat-bd','--tag-draft-fg'];
  const tagScene         = ['--tag-scene-bg','--tag-scene-fg','--tag-scene-bd'];
  const tagChapter       = ['--tag-chapter-bg','--tag-chapter-fg','--tag-chapter-bd'];
  const tagAct           = ['--tag-act-bg','--tag-act-fg','--tag-act-bd'];
  const tagKeys          = [...tagBeat, ...tagScene, ...tagChapter, ...tagAct];

  function splitLight(map) {
    const base = {}, tags = {};
    for (const [k, v] of Object.entries(map)) {
      if (tagKeys.includes(k)) tags[k] = v; else base[k] = v;
    }
    return { base, tags };
  }

  function splitDark(map) {
    return splitLight(map);  // same structure
  }

  // root block (spacing + fonts)
  const rootSpacing = Object.fromEntries(
    Object.entries(rootVars).filter(([k]) => k.startsWith('--s-'))
  );
  const rootFonts = Object.fromEntries(
    Object.entries(rootVars).filter(([k]) => k.startsWith('--f-'))
  );

  const rootBlock = `:root {\n${alignedVarsBlock(rootSpacing)}\n\n${alignedVarsBlock(rootFonts)}\n}`;

  // light block
  const { base: lb, tags: lt } = splitLight(lightVars);
  const lightLines = alignedVarsBlock(lb) + '\n\n' + _tagGroupLines(lt, tagBeat, tagScene, tagChapter, tagAct);
  const lightBlock = `:root {\n\n${lightLines}\n\n}`;

  // dark block
  const { base: db, tags: dt } = splitDark(darkVars);
  const darkLines = alignedVarsBlock(db) + '\n\n' + _tagGroupLines(dt, tagBeat, tagScene, tagChapter, tagAct);
  const darkBlock = `html[theme="dark"] {\n${darkLines}\n\n}`;

  return [rootBlock, lightBlock, darkBlock, SCROLLBAR_CSS].join('\n\n');
}

function _tagGroupLines(tags, ...groups) {
  return groups
    .map(keys => {
      const sub = {};
      for (const k of keys) if (tags[k] !== undefined) sub[k] = tags[k];
      return Object.keys(sub).length ? alignedVarsBlock(sub) : '';
    })
    .filter(Boolean)
    .join('\n\n');
}

// ── Misc helpers ──────────────────────────────────

function toHex(value) {
  if (!value) return null;
  value = String(value).trim();
  if (/^#[0-9a-fA-F]{6}$/.test(value)) return value;
  if (/^#[0-9a-fA-F]{3}$/.test(value)) {
    const [, r, g, b] = value.match(/^#(.)(.)(.)$/);
    return `#${r+r}${g+g}${b+b}`;
  }
  try {
    const ctx = document.createElement('canvas').getContext('2d');
    ctx.fillStyle = value;
    const h = ctx.fillStyle;
    if (/^#[0-9a-fA-F]{6}$/.test(h)) return h;
  } catch {}
  return null;
}

/** Rebuild the injected <style id="snara-pref-style"> */
function rebuildStyle(saved) {
  let el = document.getElementById('snara-pref-style');
  if (!el) {
    el = document.createElement('style');
    el.id = 'snara-pref-style';
    document.head.appendChild(el);
  }
  const parts = [];
  const rv = saved.root  ?? {};
  const lv = saved.light ?? {};
  const dv = saved.dark  ?? {};
  if (Object.keys(rv).length)
    parts.push(`:root {\n${alignedVarsBlock(rv)}\n}`);
  if (Object.keys(lv).length)
    parts.push(`:root,\nhtml[theme="light"] {\n${alignedVarsBlock(lv)}\n}`);
  if (Object.keys(dv).length)
    parts.push(`html[theme="dark"] {\n${alignedVarsBlock(dv)}\n}`);
  el.textContent = parts.join('\n\n');
}

function downloadFile(name, content) {
  const blob = new Blob([content], { type: 'text/css' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = name; a.click();
  URL.revokeObjectURL(url);
}

// ── SnaraPref ─────────────────────────────────────

export class SnaraPref {

  static instance = null;

  constructor() {
    SnaraPref.instance = this;
    // _saved stores only the user's overrides (deltas)
    this._saved     = { root: {}, light: {}, dark: {} };
    this._activeTab = 'root';
    this.modal      = null;
    this.overlay    = null;
    this._ensureDOM();
    this._loadAndApply();
  }
  
_ensureDOM() {
  if (document.getElementById('pref-modal')) {
    this.modal = document.getElementById('pref-modal');
    return;
  }
  const modal = document.createElement('div');
  modal.className = 'app-modal pref-modal';
  modal.id = 'pref-modal';
  modal.setAttribute('hidden', '');
  modal.setAttribute('role', 'dialog');
  modal.setAttribute('aria-modal', 'true');


  this.modal = modal;

	document.getElementById('app-overlay').appendChild(modal);

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && !modal.hasAttribute('hidden')) closeModal('pref-modal');
  });
}

open()  { this._render(); openModal('pref-modal'); }

close() { closeModal('pref-modal'); console.log('closepref'); }


  async _loadAndApply() {
    try {
      const res = await fetch(AppConfig.apiPath + '?action=pref.get');
      if (!res.ok) return;
      const data = await res.json();
      // Support old flat {vars:{}} format
      if (data.vars && !data.light && !data.dark) {
        this._saved = { root: data.vars ?? {}, light: {}, dark: {} };
      } else {
        this._saved = {
          root:  data.root  ?? {},
          light: data.light ?? {},
          dark:  data.dark  ?? {},
        };
      }
      rebuildStyle(this._saved);
    } catch { /* endpoint may not exist yet */ }
  }



  // ── Render shell ──────────────────────────────

  _render() {
    const t = this._activeTab;
    this.modal.innerHTML = `
      <div class="modal-header">
        <span class="modal-title"><i data-icon="adjustments-horizontal"></i> Theme Variables</span>
		<button class="cfg-btn cfg-btn-ghost" id="pref-cancel">Cancel</button>		
      </div>

      <div class="cfg-tabs pref-tabs">
        <button class="cfg-tab${t==='light'?' active':''}" data-tab="light">☀ Light</button>
        <button class="cfg-tab${t==='dark' ?' active':''}" data-tab="dark">☾ Dark</button>
        <button class="cfg-tab${t==='root' ?' active':''}" data-tab="root">Spacing &amp; Type</button>
      </div>

      <div class="pref-body modal-body" id="pref-body">
        ${this._renderTabBody(t)}
      </div>

      <div class="modal-footer pref-footer">
        <button class="cfg-btn pref-reset-btn" id="pref-reset">Reset</button>
        <button class="cfg-btn cfg-btn-ghost pref-export-btn" id="pref-export">
          <i data-icon="download"></i> Export vars.css
        </button>
        <button class="cfg-btn cfg-btn-ghost" id="pref-cancel">Cancel</button>
        <button class="cfg-btn cfg-btn-primary" id="pref-save">Save</button>
      </div>
    `;

    this.modal.querySelectorAll('.cfg-tab[data-tab]').forEach(btn => {
      btn.addEventListener('click', () => {
        this._snapshotTab();
        this._activeTab = btn.dataset.tab;
        this.modal.querySelectorAll('.cfg-tab')
          .forEach(b => b.classList.toggle('active', b === btn));
        document.getElementById('pref-body').innerHTML =
          this._renderTabBody(this._activeTab);
        this._bindInputs();
        icx.delayreplace('#pref-modal [data-icon]');
      });
    });

    this.modal.querySelector('#pref-close').addEventListener('click',  () => this.close());
    this.modal.querySelector('#pref-cancel').addEventListener('click', () => this.close());
    this.modal.querySelector('#pref-save').addEventListener('click',   () => this.save());
    this.modal.querySelector('#pref-reset').addEventListener('click',  () => this._resetCurrentTab());
    this.modal.querySelector('#pref-export').addEventListener('click', () => this.exportCss());

    this._bindInputs();
    icx.delayreplace('#pref-modal [data-icon]');
  }

  // ── Tab body HTML ─────────────────────────────

  _renderTabBody(tab) {
    const groups   = GROUPS[tab]      ?? [];
    const defaults = DEFAULTS[tab]    ?? {};
    const saved    = this._saved[tab] ?? {};

    // Show saved value if exists, else default
    return groups.map(g => `
      <section class="cfg-section pref-section">
        <h3 class="cfg-heading">${esc(g.heading)}</h3>
        ${g.vars.map(v => this._renderRow(v, saved[v.name] ?? defaults[v.name] ?? '')).join('')}
      </section>`
    ).join('');
  }

  _renderRow({ name, label, type }, current) {
    const safeId = name.replace(/[^a-z0-9]/gi, '-');

    if (type === 'color') {
      const hex = toHex(current) || '#ffffff';
      return `
        <div class="cfg-row pref-row">
          <label class="cfg-label pref-var-label" title="${esc(name)}">${esc(label)}</label>
          <code class="pref-var-name">${esc(name)}</code>
          <input type="color"
                 class="pref-color pref-input"
                 data-var="${esc(name)}"
                 data-peer="pt-${esc(safeId)}"
                 value="${esc(hex)}">
          <input type="text"
                 class="cfg-input pref-text pref-input"
                 id="pt-${esc(safeId)}"
                 data-var="${esc(name)}"
                 data-peer="pc-${esc(safeId)}"
                 data-canonical="1"
                 value="${esc(current)}"
                 placeholder="#rrggbb or rgba(…)">
        </div>`;
    }

    return `
      <div class="cfg-row pref-row">
        <label class="cfg-label pref-var-label" title="${esc(name)}">${esc(label)}</label>
        <code class="pref-var-name">${esc(name)}</code>
        <input type="text"
               class="cfg-input pref-text pref-input"
               data-var="${esc(name)}"
               data-canonical="1"
               value="${esc(current)}"
               placeholder="e.g. 1rem">
      </div>`;
  }

  // ── Live preview binding ───────────────────────

  _bindInputs() {
    const tab = this._activeTab;
    this.modal.querySelectorAll('.pref-input').forEach(input => {
      const varName = input.dataset.var;

      if (input.type === 'color') {
        input.addEventListener('input', () => {
          const textId = input.dataset.peer;
          if (textId) {
            const text = document.getElementById(textId);
            if (text) text.value = input.value;
          }
          document.documentElement.style.setProperty(varName, input.value);
        });
      } else {
        input.addEventListener('input', () => {
          const val = input.value.trim();
          // Sync colour picker companion
          const h = toHex(val);
          if (h) {
            const colorInput = this.modal.querySelector(
              `.pref-color[data-peer="${CSS.escape(input.id)}"]`
            );
            if (colorInput) colorInput.value = h;
          }
          if (val) document.documentElement.style.setProperty(varName, val);
        });
      }
    });
  }

  // ── Snapshot current tab inputs → _saved[tab] ─
  // Only stores values that differ from the default.

  _snapshotTab() {
    const tab      = this._activeTab;
    const defaults = DEFAULTS[tab] ?? {};
    const out      = {};

    this.modal.querySelectorAll('.pref-input[data-canonical]').forEach(inp => {
      const name = inp.dataset.var;
      const val  = inp.value.trim();
      if (!name || !val) return;
      // Store even if same as default — keeps UI consistent,
      // PHP backend is the sanitisation layer.
      out[name] = val;
    });

    this._saved[tab] = out;
  }

  // ── Reset current tab ─────────────────────────

  _resetCurrentTab() {
    const tab      = this._activeTab;
    const defaults = DEFAULTS[tab] ?? {};
    for (const name of Object.keys(defaults)) {
      document.documentElement.style.removeProperty(name);
    }
    this._saved[tab] = {};
    document.getElementById('pref-body').innerHTML = this._renderTabBody(tab);
    this._bindInputs();
    rebuildStyle(this._saved);
  }

  // ── Save ──────────────────────────────────────

  async save() {
    this._snapshotTab();

    const btn = this.modal.querySelector('#pref-save');
    btn.disabled    = true;
    btn.textContent = 'saving…';

    rebuildStyle(this._saved);

    try {
      await fetch(AppConfig.apiPath + '?action=pref.set', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(this._saved),
      });
      btn.textContent = 'saved ✓';
    } catch {
      btn.textContent = 'error';
    }

    setTimeout(() => {
      btn.disabled    = false;
      btn.textContent = 'Save';
      this.close();
    }, 900);
  }

  // ── Export — full vars.css replacement ────────
  // Takes DEFAULTS for every scope, overlays saved
  // overrides, and writes a complete, formatted file
  // identical in structure to the original vars.css.

  exportCss() {
    this._snapshotTab();   // make sure current tab is captured

    const header = `/* Snara custom theme — generated ${new Date().toISOString()} */\n/* Drop this file in as css/vars.css */\n`;
    const body   = buildFullCss(this._saved);

    downloadFile('vars.css', header + '\n' + body);
  }
}