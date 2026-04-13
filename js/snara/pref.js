import { AppConfig } from '../snara.js';
import icx           from '../icons/ge-icon.js';
import { openModal, closeModal } from './modal.js';
import { esc } from '../helpers.js';
import { _modalHeader, _modalFooter } from './modal.js';

const FALLBACKS = {
  '--bg-main': '#ffffff',
  '--bg-alt': '#f6f8fa',
  '--bg-mate': '#fcfcfc',
  '--bg-hover': '#f0f2f5',
  '--fg-main': '#24292f',
  '--fg-muted': '#57606a',
  '--fg-link': '#0969da',
  '--border': '#d0d7de',
  '--primary': '#0969da',
  '--danger': '#cf222e',
  '--overlay': 'rgba(0, 0, 0, 0.4)',
  '--selection': '#ddf4ff',
  '--sel-border': '#54aeff',
  '--success-bg': '#dafbe1',
  '--success-fg': '#2da44e',
  '--tag-act-fg': '#662211',
  '--tag-chapter-fg': '#993311',
  '--tag-scene-fg': '#bb4422',
  '--tag-beat-fg': '#cc1111',
};

let readingThemeValues = false;

export const getPropValue = (propertyName) => {
  const prop = propertyName.startsWith('--') ? propertyName : `--${propertyName}`;
  const value = getComputedStyle(document.documentElement)
    .getPropertyValue(prop)
    .trim();

  console.log(`[pref.js] ${prop} → "${value}"`);
  if (value) return value;
  console.warn(`[pref.js] CSS property ${prop} not found!`);
  return FALLBACKS[prop] || '#ffffff';
};

const getPropValueForTheme = (propertyName, forcedTheme) => {
  if (!forcedTheme || readingThemeValues) return getPropValue(propertyName);
  const html = document.documentElement;
  const originalTheme = html.getAttribute('data-theme') || html.getAttribute('theme');
  html.setAttribute('data-theme', forcedTheme);
  void html.offsetHeight;
  const value = getPropValue(propertyName);
  if (originalTheme) html.setAttribute('data-theme', originalTheme);
  else html.removeAttribute('data-theme');
  void html.offsetHeight;
  return value;
};

export const getLiveDefaults = () => {
  readingThemeValues = true;
  console.log('[pref.js] Reading LIVE defaults from color.css (light + dark)');
  const result = {
    root: {
      '--s-xs': getPropValue('--s-xs'),
      '--s-sm': getPropValue('--s-sm'),
      '--s-md': getPropValue('--s-md'),
      '--s-lg': getPropValue('--s-lg'),
      '--s-xl': getPropValue('--s-xl'),
      '--f-xs': getPropValue('--f-xs'),
      '--f-sm': getPropValue('--f-sm'),
      '--f-md': getPropValue('--f-md'),
    },

    light: {
      '--bg-main':    getPropValueForTheme('--bg-main', 'light'),
      '--bg-alt':     getPropValueForTheme('--bg-alt', 'light'),
      '--bg-mate':    getPropValueForTheme('--bg-mate', 'light'),
      '--bg-hover':   getPropValueForTheme('--bg-hover', 'light'),
      '--fg-main':    getPropValueForTheme('--fg-main', 'light'),
      '--fg-muted':   getPropValueForTheme('--fg-muted', 'light'),
      '--fg-link':    getPropValueForTheme('--fg-link', 'light'),
      '--border':     getPropValueForTheme('--border', 'light'),
      '--primary':    getPropValueForTheme('--primary', 'light'),
      '--danger':     getPropValueForTheme('--danger', 'light'),
      '--overlay':    getPropValueForTheme('--overlay', 'light'),
      '--selection':  getPropValueForTheme('--selection', 'light'),
      '--sel-border': getPropValueForTheme('--sel-border', 'light'),
      '--success-bg': getPropValueForTheme('--success-bg', 'light'),
      '--success-fg': getPropValueForTheme('--success-fg', 'light'),
      '--tag-act-fg':     getPropValueForTheme('--tag-act-fg', 'light'),
      '--tag-chapter-fg': getPropValueForTheme('--tag-chapter-fg', 'light'),
      '--tag-scene-fg':   getPropValueForTheme('--tag-scene-fg', 'light'),
      '--tag-beat-fg':    getPropValueForTheme('--tag-beat-fg', 'light'),
    },

    dark: {
      '--bg-main':    getPropValueForTheme('--bg-main', 'dark'),
      '--bg-alt':     getPropValueForTheme('--bg-alt', 'dark'),
      '--bg-mate':    getPropValueForTheme('--bg-mate', 'dark'),
      '--bg-hover':   getPropValueForTheme('--bg-hover', 'dark'),
      '--fg-main':    getPropValueForTheme('--fg-main', 'dark'),
      '--fg-muted':   getPropValueForTheme('--fg-muted', 'dark'),
      '--fg-link':    getPropValueForTheme('--fg-link', 'dark'),
      '--border':     getPropValueForTheme('--border', 'dark'),
      '--primary':    getPropValueForTheme('--primary', 'dark'),
      '--danger':     getPropValueForTheme('--danger', 'dark'),
      '--overlay':    getPropValueForTheme('--overlay', 'dark'),
      '--selection':  getPropValueForTheme('--selection', 'dark'),
      '--sel-border': getPropValueForTheme('--sel-border', 'dark'),
      '--success-bg': getPropValueForTheme('--success-bg', 'dark'),
      '--success-fg': getPropValueForTheme('--success-fg', 'dark'),
      '--tag-act-fg':     getPropValueForTheme('--tag-act-fg', 'dark'),
      '--tag-chapter-fg': getPropValueForTheme('--tag-chapter-fg', 'dark'),
      '--tag-scene-fg':   getPropValueForTheme('--tag-scene-fg', 'dark'),
      '--tag-beat-fg':    getPropValueForTheme('--tag-beat-fg', 'dark'),
    },
  };

  readingThemeValues = false;
  return result;
};

export let DEFAULTS = getLiveDefaults();

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

const COMMON_UI_GROUPS = [
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
    { name: '--sel-border', label: 'Sel border', type: 'color' },
    { name: '--selection',  label: 'Selection',  type: 'text' },
    { name: '--overlay',    label: 'Overlay',    type: 'text'  },
  ]},
  { heading: 'Tag', vars: [
    { name: '--tag-act-fg',     label: 'Act',     type: 'color' },
    { name: '--tag-chapter-fg', label: 'Chapter', type: 'color' },
    { name: '--tag-scene-fg',   label: 'Scene',   type: 'color' },
    { name: '--tag-beat-fg',    label: 'Beat',    type: 'color' },
  ]},
];

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
  light: COMMON_UI_GROUPS,
  dark:  COMMON_UI_GROUPS,
};

function alignedVarsBlock(map) {
  const entries = Object.entries(map);
  if (!entries.length) return '';
  const maxLen = Math.max(...entries.map(([k]) => k.length));
  return entries
    .map(([k, v]) => `  ${k}:${' '.repeat(maxLen - k.length + 1)}${v};`)
    .join('\n');
}

function buildFullCss(saved) {
  const rootVars  = { ...DEFAULTS.root,  ...(saved.root  ?? {}) };
  const lightVars = { ...DEFAULTS.light, ...(saved.light ?? {}) };
  const darkVars  = { ...DEFAULTS.dark,  ...(saved.dark  ?? {}) };

  const tagBeat    = ['--tag-beat-bg','--tag-beat-fg','--tag-beat-bd'];
  const tagScene   = ['--tag-scene-bg','--tag-scene-fg','--tag-scene-bd'];
  const tagChapter = ['--tag-chapter-bg','--tag-chapter-fg','--tag-chapter-bd'];
  const tagAct     = ['--tag-act-bg','--tag-act-fg','--tag-act-bd'];
  const tagKeys    = [...tagBeat, ...tagScene, ...tagChapter, ...tagAct];

  function split(map) {
    const base = {}, tags = {};
    for (const [k, v] of Object.entries(map)) {
      if (tagKeys.includes(k)) tags[k] = v; else base[k] = v;
    }
    return { base, tags };
  }

  const rootSpacing = Object.fromEntries(Object.entries(rootVars).filter(([k]) => k.startsWith('--s-')));
  const rootFonts   = Object.fromEntries(Object.entries(rootVars).filter(([k]) => k.startsWith('--f-')));

  const rootBlock = `:root {\n${alignedVarsBlock(rootSpacing)}\n\n${alignedVarsBlock(rootFonts)}\n}`;
  const { base: lb, tags: lt } = split(lightVars);
  const lightLines = alignedVarsBlock(lb) + '\n\n' + _tagGroupLines(lt, tagBeat, tagScene, tagChapter, tagAct);
  const lightBlock = `:root {\n\n${lightLines}\n\n}`;
  const { base: db, tags: dt } = split(darkVars);
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

function rebuildStyle(saved) {
  let el = document.getElementById('snara-pref-style');
  if (!el) {
    el = document.createElement('style');
    el.id = 'snara-pref-style';
    document.head.appendChild(el);
  }
  const parts = [];
  const rv = saved.root ?? {};
  const lv = saved.light ?? {};
  const dv = saved.dark ?? {};
  if (Object.keys(rv).length) parts.push(`:root {\n${alignedVarsBlock(rv)}\n}`);
  if (Object.keys(lv).length) parts.push(`:root,\nhtml[theme="light"] {\n${alignedVarsBlock(lv)}\n}`);
  if (Object.keys(dv).length) parts.push(`html[theme="dark"] {\n${alignedVarsBlock(dv)}\n}`);
  el.textContent = parts.join('\n\n');
}

function downloadFile(name, content) {
  const blob = new Blob([content], { type: 'text/css' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = name; a.click();
  URL.revokeObjectURL(url);
}

export class SnaraPref {
  static instance = null;
  constructor() {
    SnaraPref.instance = this;
    this._saved     = { root: {}, light: {}, dark: {} };
    this._activeTab = 'root';
    this.modal      = null;
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
      if (data.vars && !data.light && !data.dark) {
        this._saved = { root: data.vars ?? {}, light: {}, dark: {} };
      } else {
        this._saved = { root: data.root ?? {}, light: data.light ?? {}, dark: data.dark ?? {} };
      }
      rebuildStyle(this._saved);
    } catch { }
  }

  _render() {
    const t = this._activeTab;
    this.modal.innerHTML = `
      ${_modalHeader('<i data-icon="adjustments-horizontal"></i> Theme Variables', 'pref-close')}
      <div class="cfg-tabs pref-tabs">
        <button class="cfg-tab${t==='light'?' active':''}" data-tab="light">☀ Light</button>
        <button class="cfg-tab${t==='dark'?' active':''}" data-tab="dark">☾ Dark</button>
        <button class="cfg-tab${t==='root'?' active':''}" data-tab="root">Spacing &amp; Type</button>
      </div>
      <div class="pref-body modal-body tab-${t}" id="pref-body">${this._renderTabBody(t)}</div>
      ${_modalFooter(`
        <button class="cfg-btn pref-reset-btn" id="pref-reset">Reset</button>
        <button class="cfg-btn mute pref-export-btn" id="pref-export"><i data-icon="download"></i> Export vars.css</button>
      `)}
    `;

    this.modal.querySelectorAll('.cfg-tab[data-tab]').forEach(btn => {
      btn.addEventListener('click', () => {
        this._snapshotTab();
        this._activeTab = btn.dataset.tab;
        this.modal.querySelectorAll('.cfg-tab').forEach(b => b.classList.toggle('active', b === btn));
        document.getElementById('pref-body').innerHTML = this._renderTabBody(this._activeTab);
        this._bindInputs();
        icx.delayreplace('#pref-modal [data-icon]');
      });
    });

    this.modal.querySelector('#pref-close').addEventListener('click', () => this.close());
    this.modal.querySelector('#modal-cancel').addEventListener('click', () => this.close());
    this.modal.querySelector('#modal-save').addEventListener('click', () => this.save());
    this.modal.querySelector('#pref-reset').addEventListener('click', () => this._resetCurrentTab());
    this.modal.querySelector('#pref-export').addEventListener('click', () => this.exportCss());

    this._bindInputs();
    icx.delayreplace('#pref-modal [data-icon]');
  }

  _renderTabBody(tab) {
    const groups   = GROUPS[tab] ?? [];
    const defaults = DEFAULTS[tab] ?? {};
    const saved    = this._saved[tab] ?? {};
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
          <input type="color" class="pref-color pref-input" data-var="${esc(name)}" data-peer="pt-${esc(safeId)}" value="${esc(hex)}">
          <input type="text" class="cfg-input pref-text pref-input" id="pt-${esc(safeId)}" data-var="${esc(name)}" data-peer="pc-${esc(safeId)}" data-canonical="1" value="${esc(current)}" placeholder="#rrggbb or rgba(…)">
        </div>`;
    }
    return `
      <div class="cfg-row pref-row">
        <label class="cfg-label pref-var-label" title="${esc(name)}">${esc(label)}</label>
        <code class="pref-var-name">${esc(name)}</code>
        <input type="text" class="cfg-input pref-text pref-input" data-var="${esc(name)}" data-canonical="1" value="${esc(current)}" placeholder="e.g. 1rem">
      </div>`;
  }

  _bindInputs() {
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
          const h = toHex(val);
          if (h) {
            const colorInput = this.modal.querySelector(`.pref-color[data-peer="${CSS.escape(input.id)}"]`);
            if (colorInput) colorInput.value = h;
          }
          if (val) document.documentElement.style.setProperty(varName, val);
        });
      }
    });
  }

  _snapshotTab() {
    const tab = this._activeTab;
    const out = {};
    this.modal.querySelectorAll('.pref-input[data-canonical]').forEach(inp => {
      const name = inp.dataset.var;
      const val = inp.value.trim();
      if (name && val) out[name] = val;
    });
    this._saved[tab] = out;
  }

  _resetCurrentTab() {
    const tab = this._activeTab;
    for (const name of Object.keys(DEFAULTS[tab] ?? {})) {
      document.documentElement.style.removeProperty(name);
    }
    this._saved[tab] = {};
    document.getElementById('pref-body').innerHTML = this._renderTabBody(tab);
    this._bindInputs();
    rebuildStyle(this._saved);
  }

  async save() {
    this._snapshotTab();
    const btn = this.modal.querySelector('#modal-save');
    btn.disabled = true; btn.textContent = 'saving…';
    rebuildStyle(this._saved);
    try {
      await fetch(AppConfig.apiPath + '?action=pref.set', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(this._saved)
      });
      btn.textContent = 'saved ✓';
    } catch { btn.textContent = 'error'; }
    setTimeout(() => { btn.disabled = false; btn.textContent = 'Save'; this.close(); }, 900);
  }

  exportCss() {
    this._snapshotTab();
    const header = `\n`;
    const body = buildFullCss(this._saved);
    downloadFile('vars.css', header + '\n' + body);
  }
}

function refreshDefaults() {
  if (readingThemeValues) return;
  DEFAULTS = getLiveDefaults();
  console.log('✅ pref.js defaults refreshed from color.css');
}

window.addEventListener('load', refreshDefaults);

const observer = new MutationObserver(() => {
  if (!readingThemeValues) refreshDefaults();
});
observer.observe(document.documentElement, {
  attributes: true,
  attributeFilter: ['data-theme', 'theme']
});

console.log('✅ pref.js fully loaded – infinite loop fixed');