import { AppConfig } from '../snara.js';
import icx           from '../icons/ge-icon.js';
import { openModal, closeModal } from './modal.js';
import { esc } from '../helpers.js';
import { _modalHeader, _modalFooter } from './modal.js';

// ── Static DEFAULTS — never mutated by DOM ────────
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
    '--bg-muted':       '#fcfcfc',
    '--bg-hover':       '#f0f2f5',
    '--fg-main':        '#24292f',
    '--fg-muted':       '#57606a',
    '--fg-link':        '#0969da',
    '--border':         '#d0d7de',
    '--primary':        '#0969da',
    '--danger':         '#cf222e',
    '--success':        '#2da44e',
    '--overlay':        'rgba(0, 0, 0, 0.6)',
    '--shadow':         'rgba(0, 0, 0, 0.9)',
    '--selection':      '#ddf4ff',
    '--tag-act-fg':     '#662211',
    '--tag-chapter-fg': '#993311',
    '--tag-scene-fg':   '#bb4422',
    '--tag-beat-fg':    '#cc1111',
  },
  dark: {
    '--bg-main':        '#0d1117',
    '--bg-alt':         '#161b22',
    '--bg-muted':       '#14181f',
    '--bg-hover':       '#21262d',
    '--fg-main':        '#c9d1d9',
    '--fg-muted':       '#8b949e',
    '--fg-link':        '#58a6ff',
    '--border':         '#30363d',
    '--primary':        '#1f6feb',
    '--danger':         '#f85149',
    '--success':        '#3fb950',
    '--overlay':        'rgba(0, 0, 0, 0.75)',
    '--shadow':         'rgba(0, 0, 0, 0.95)',
    '--selection':      'rgba(56, 139, 253, 0.15)',
    '--tag-act-fg':     '#ffcc33',
    '--tag-chapter-fg': '#ff9933',
    '--tag-scene-fg':   '#ff6b6b',
    '--tag-beat-fg':    '#cc5522',
  },
};

// ── Groups define what appears in the modal ───────
const COMMON_UI_GROUPS = [
  { heading: 'Backgrounds', vars: [
    { name: '--bg-main',  label: 'Main',   type: 'color' },
    { name: '--bg-alt',   label: 'Alt',    type: 'color' },
    { name: '--bg-muted', label: 'Muted',  type: 'color' },
    { name: '--border',   label: 'Border', type: 'color' },
  ]},
  { heading: 'Foregrounds', vars: [
    { name: '--fg-main',  label: 'Main',  type: 'color' },
    { name: '--fg-link',  label: 'Link',  type: 'color' },
    { name: '--fg-muted', label: 'Muted', type: 'color' },
  ]},
  { heading: 'Interaction', vars: [
    { name: '--bg-hover',  label: 'Hover',     type: 'text' },
    { name: '--selection', label: 'Selection', type: 'text' },
    { name: '--overlay',   label: 'Overlay',   type: 'text' },
    { name: '--shadow',    label: 'Shadow',    type: 'text' },
  ]},
  { heading: 'Chrome', vars: [
    { name: '--primary',        label: 'Primary', type: 'color' },
    { name: '--danger',         label: 'Danger',  type: 'color' },
    { name: '--success',        label: 'Success', type: 'color' },
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

// ── CSS helpers ───────────────────────────────────

function alignedVarsBlock(map) {
  const entries = Object.entries(map);
  if (!entries.length) return '';
  const maxLen = Math.max(...entries.map(([k]) => k.length));
  return entries
    .map(([k, v]) => `  ${k}:${' '.repeat(maxLen - k.length + 1)}${v};`)
    .join('\n');
}

function buildFullCss(saved) {
  const lightVars = { ...DEFAULTS.light, ...(saved.light ?? {}) };
  const darkVars  = { ...DEFAULTS.dark,  ...(saved.dark  ?? {}) };

  const header     = `/* Snara custom theme — generated ${new Date().toISOString()} */`;
  const lightBlock = `body {\n\n${alignedVarsBlock(lightVars)}\n\n}`;
  const darkBlock  = `html[data-theme="dark"] body {\n\n${alignedVarsBlock(darkVars)}\n\n}`;

  return [header, lightBlock, darkBlock].join('\n\n');
}

function rebuildStyle(saved) {
  let el = document.getElementById('snara-pref-style');
  if (!el) {
    el = document.createElement('style');
    el.id = 'snara-pref-style';
    document.head.appendChild(el);
  }
  const lv = saved.light ?? {};
  const dv = saved.dark  ?? {};
  const parts = [];
  if (Object.keys(lv).length) parts.push(`body {\n${alignedVarsBlock(lv)}\n}`);
  if (Object.keys(dv).length) parts.push(`html[data-theme="dark"] body {\n${alignedVarsBlock(dv)}\n}`);
  el.textContent = parts.join('\n\n');
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

  open() {
    this._render();
    openModal('pref-modal');
  }

  close() { closeModal('pref-modal'); }

  async _loadAndApply() {
    try {
      const res = await fetch(AppConfig.apiPath + '?action=pref.get');
      if (!res.ok) return;
      const css = await res.text();
      if (!css.trim()) return;

      // Inject into DOM for live preview
      let el = document.getElementById('snara-pref-style');
      if (!el) {
        el = document.createElement('style');
        el.id = 'snara-pref-style';
        document.head.appendChild(el);
      }
      el.textContent = css;

      // Parse file → populate _saved, fill gaps with DEFAULTS
      const parsed = this._parseCss(css);
      this._saved = {
        root:  { ...DEFAULTS.root  },
        light: { ...DEFAULTS.light, ...parsed.light },
        dark:  { ...DEFAULTS.dark,  ...parsed.dark  },
      };

    } catch { }
  }

  _parseCss(css) {
    const result  = { root: {}, light: {}, dark: {} };
    const blockRe = /([^{]+)\{([^}]+)\}/gs;
    let block;
    while ((block = blockRe.exec(css)) !== null) {
      const selector = block[1].trim();
      const body     = block[2];

      let scope = null;
      if (/html\[.*?dark.*?\]\s*body/.test(selector)) scope = 'dark';
      else if (selector === 'body')                   scope = 'light';

      if (!scope) continue;

      const declRe = /(--[\w-]+)\s*:\s*([^;]+);/g;
      let decl;
      while ((decl = declRe.exec(body)) !== null) {
        const name = decl[1].trim();
        const val  = decl[2].trim();
        if (name && val) result[scope][name] = val;
      }
    }
    return result;
  }

  _render() {
    const t = this._activeTab;
    this.modal.innerHTML = `
      ${_modalHeader('<i data-icon="adjustments-horizontal"></i> Theme Variables', 'pref-close')}
      <div class="tabs">
        <button class="cfg-tab${t==='light'?' active':''}" data-tab="light">☀ Light</button>
        <button class="cfg-tab${t==='dark'?' active':''}" data-tab="dark">☾ Dark</button>
        <button class="cfg-tab${t==='root'?' active':''}" data-tab="root">Spacing &amp; Type</button>
      </div>
      <div class="pref-body modal-body tab-${t}" id="pref-body">
	  ${this._renderTabBody(t)}
	  </div>
      ${_modalFooter(`
        <button class="btn-mini pref-reset-btn" id="pref-reset">Reset</button>
        <button class="btn-mini mute pref-export-btn" id="pref-export"><i data-icon="download"></i> Export vars.css</button>
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

    this.modal.querySelector('#pref-close').addEventListener('click',  () => this.close());
    this.modal.querySelector('#modal-cancel').addEventListener('click', () => this.close());
    this.modal.querySelector('#modal-save').addEventListener('click',   () => this.save());
    this.modal.querySelector('#pref-reset').addEventListener('click',   () => this._resetCurrentTab());
    this.modal.querySelector('#pref-export').addEventListener('click',  () => this.exportCss());

    this._bindInputs();
    icx.delayreplace('#pref-modal [data-icon]');
  }
  
  _preview(tab) {
		switch(tab) {
			case "root":
				return `
				<div class='pad' data-theme='${tab}'>
				<p><span class='title'>Header title</span></p>
				<button class='btn-mini'>Button</button>
				<div style='padding: var(--s-xs)'>xs we call it extra small</div>
				<div style='padding: var(--s-sm)'>sm stand for small</div>
				<div style='padding: var(--s-md)'>md</div>
				<div style='padding: var(--s-lg)'>lg</div>
				<div style='padding: var(--s-xl)'>xl</div>
				</div>
				<div class='entry'>
				<h1>Heading1 - Act</h1>
				<h2>Chapter</h2>
				<h3>Scene</h3>
				<h4>Beat</h4>
				<p>Quisque in sem hendrerit, sodales massa eget, dignissim arcu.</p>
				<p style='font-size: var(--f-xs)'>--f-xs Lorem ipsum dolor sit amet, consectetur adipiscing elit.</p>
				<p style='font-size: var(--f-md)'>--f-md Vestibulum luctus nunc at eros auctor, eget pellentesque augue pellentesque.</p>
				<p style='font-size: var(--f-sm)'>--f-sm Suspendisse dignissim elit sagittis egestas vestibulum</p>
				</div>
				</div>`;
				break;
			default:
				return `
				<div class='theme'>
				<div style='color:var(--fg-main); background: var(--border)'>In ${tab} theme, you see <span style='color:var(--fg-muted)'>a muted color</span> and <a href='#'>a links</a> together.</div>
				<div style='color:var(--fg-main); background: var(--bg-muted)'>In ${tab} theme, you see <span style='color:var(--fg-muted)'>a muted color</span> and <a href='#'>a links</a> together.</div>
				<div style='color:var(--fg-main); background: var(--bg-alt)'>In ${tab} theme, you see <span style='color:var(--fg-muted)'>a muted color</span> and <a href='#'>a links</a> together.</div>
				<div style='color:var(--fg-main); background: var(--bg-main)'>In ${tab} theme, you see <span style='color:var(--fg-muted)'>a muted color</span> and <a href='#'>a links</a> together.</div>
				</div>

				<header>
				
				<svg xmlns="http://www.w3.org/2000/svg" class="icx-edit" fill="none" height="32" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1" viewBox="0 0 32 32" width="32"><g transform="translate(4.0000, 4.0000) scale(1.0000)"> <path xmlns:default="http://www.w3.org/2000/svg" d="M7 7h-1a2 2 0 0 0 -2 2v9a2 2 0 0 0 2 2h9a2 2 0 0 0 2 -2v-1"></path> <path xmlns:default="http://www.w3.org/2000/svg" d="M20.385 6.585a2.1 2.1 0 0 0 -2.97 -2.97l-8.415 8.385v3h3l8.385 -8.415"></path> <path xmlns:default="http://www.w3.org/2000/svg" d="M16 5l3 3"></path></g></svg>
				
				<span class='title'>SECTION TITLE</span></header>

<div class="editor" contenteditable="true" data-placeholder="Write something…"></div>
				
				<div class='flex' data-theme='${tab}'>
				
	<button class="btn-icon">
      <svg xmlns="http://www.w3.org/2000/svg" class="icx-ai-agents" fill="none" height="32" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1" viewBox="0 0 32 32" width="32"><g transform="translate(4.0000, 4.0000) scale(1.0000)"> <path xmlns:default="http://www.w3.org/2000/svg" d="M17 19a2 2 0 1 0 4 0a2 2 0 1 0 -4 0"></path> <path xmlns:default="http://www.w3.org/2000/svg" d="M3 19a2 2 0 1 0 4 0a2 2 0 1 0 -4 0"></path> <path xmlns:default="http://www.w3.org/2000/svg" d="M10 5a2 2 0 1 0 4 0a2 2 0 1 0 -4 0"></path> <path xmlns:default="http://www.w3.org/2000/svg" d="M6 5a1 1 0 1 0 -2 0a1 1 0 0 0 2 0"></path> <path xmlns:default="http://www.w3.org/2000/svg" d="M18 5a1 1 0 1 0 2 0a1 1 0 0 0 -2 0"></path> <path xmlns:default="http://www.w3.org/2000/svg" d="M4 12a1 1 0 1 0 2 0a1 1 0 0 0 -2 0"></path> <path xmlns:default="http://www.w3.org/2000/svg" d="M11 12a1 1 0 1 0 2 0a1 1 0 0 0 -2 0"></path> <path xmlns:default="http://www.w3.org/2000/svg" d="M18 12a1 1 0 1 0 2 0a1 1 0 0 0 -2 0"></path> <path xmlns:default="http://www.w3.org/2000/svg" d="M11 19a1 1 0 1 0 2 0a1 1 0 0 0 -2 0"></path></g></svg>
    </button>
	
	<button class="btn-mini mute">Cancel</button>
	
				<button class='primary'>primary</button>
				<button class='warn'>Warn</button>
				<button class='success'>success</button>
				<button class='danger'>Danger</button>
				<div class='tags'>
				<div class='entry act'><h1>Act</h1></div>
				<div class='entry chapter'><h2>Chapter</h2></div>
				<div class='entry scene'><h3>Scene</h3></div>
				<div class='entry beat'><h4>Beat</h4></div>
				</div>
				</div>`;
				break;
		}
  }

  _renderTabBody(tab) {
    const groups   = GROUPS[tab]      ?? [];
    const saved    = this._saved[tab] ?? {};
    const defaults = DEFAULTS[tab]    ?? {};
    const formGroup = groups.map(g => `
      <section class="cfg-section pref-section">
        <h3 class="cfg-heading">${esc(g.heading)}</h3>
        ${g.vars.map(v => this._renderRow(v, saved[v.name] ?? defaults[v.name] ?? '')).join('')}
      </section>`
    ).join('');

	return `<div class='form'>${formGroup}</div>
	<div class='previewBox'>${this._preview(tab)}</div>`

	
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
      const tab     = this._activeTab;

      if (input.type === 'color') {
        input.addEventListener('input', () => {
          const textId = input.dataset.peer;
          if (textId) {
            const text = document.getElementById(textId);
            if (text) text.value = input.value;
          }
          this._saved[tab][varName] = input.value;
          document.documentElement.style.setProperty(varName, input.value);
		  document.body.style.setProperty(varName, input.value);
          if (varName === '--fg-link') this._syncInputValue(input.value, '--selection');
        });
      } else {
        input.addEventListener('input', () => {
          const val = input.value.trim();
          const h = toHex(val);
          if (h) {
            const colorInput = this.modal.querySelector(
              `.pref-color[data-peer="${CSS.escape(input.id)}"]`
            );
            if (colorInput) colorInput.value = h;
          }
          if (val) {
            this._saved[tab][varName] = val;
            document.documentElement.style.setProperty(varName, val);
		  document.body.style.setProperty(varName, val);			
            if (varName === '--fg-link') this._syncInputValue(val, '--selection');
          }
        });
      }
    });
  }

  _syncInputValue(hex, targetVar, opacity = '0.3') {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    const rgba = `rgba(${r}, ${g}, ${b}, ${opacity})`;
    this._saved[this._activeTab][targetVar] = rgba;
    const input = this.modal.querySelector(`.pref-input[data-var="${targetVar}"]`);
    if (input) input.value = rgba;
    document.documentElement.style.setProperty(targetVar, rgba);
	document.body.style.setProperty(targetVar, rgba);
  }

  _snapshotTab() {
    const tab = this._activeTab;
    const out = {};
    this.modal.querySelectorAll('.pref-input[data-canonical]').forEach(inp => {
      const name = inp.dataset.var;
      const val  = inp.value.trim();
      if (!name || !val) return;
      out[name] = val;
    });
    this._saved[tab] = { ...(this._saved[tab] ?? {}), ...out };
  }

  _resetCurrentTab() {
    const tab = this._activeTab;
    for (const name of Object.keys(DEFAULTS[tab] ?? {})) {
      document.documentElement.style.removeProperty(name);
	  document.body.style.removeProperty(name);
    }
    this._saved[tab] = { ...DEFAULTS[tab] };
    document.getElementById('pref-body').innerHTML = this._renderTabBody(tab);
    this._bindInputs();
    rebuildStyle(this._saved);
  }

  async save() {
    this._snapshotTab();
    const btn = this.modal.querySelector('#modal-save');
    btn.disabled = true; btn.textContent = 'saving…';
    const css = buildFullCss(this._saved);
    rebuildStyle(this._saved);
    try {
      await fetch(AppConfig.apiPath + '?action=pref.set', {
        method:  'POST',
        headers: { 'Content-Type': 'text/css' },
        body:    css,
      });
      btn.textContent = 'saved ✓';
    } catch { btn.textContent = 'error'; }
    setTimeout(() => { btn.disabled = false; btn.textContent = 'Save'; this.close(); }, 900);
  }

  exportCss() {
    this._snapshotTab();
    downloadFile('custom.css', buildFullCss(this._saved));
  }
}