/* ─────────────────────────────────────────────────
   js/tools.js — SnaraTools
   Table of Contents generator.
   Reads heading entries (.act, .chapter, .scene)
   from .entries and renders a live TOC into
   aside.side-panel. Updates on DOM mutations.
─────────────────────────────────────────────────── */

export class SnaraTools {

  static instance = null;

  constructor() {
    SnaraTools.instance = this;

    this.aside    = document.querySelector('aside.side-panel');
    this.entries  = document.querySelector('.entries');

    if (!this.aside || !this.entries) return;

    this._buildToc();
    this._observe();
  }

  // ── Build / rebuild the TOC ───────────────────

  _buildToc() {
    const items = this._collect();

    if (!items.length) {
      this.aside.innerHTML = `<p class="toc-empty">No headings yet.</p>`;
      return;
    }

    const ul = document.createElement('ul');
    ul.className = 'toc-list';

    items.forEach(({ level, text, anchor }) => {
      const li = document.createElement('li');
      li.className = `toc-item toc-${level}`;

      const a = document.createElement('a');
      a.href        = `#${anchor}`;
      a.textContent = text;
      a.addEventListener('click', e => {
        e.preventDefault();
        document.getElementById(anchor)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });

      li.appendChild(a);
      ul.appendChild(li);
    });

    this.aside.innerHTML = `<div class="toc-label">Contents</div>`;
    this.aside.appendChild(ul);
  }

  // ── Collect headings from entries ─────────────

  _collect() {
    const items   = [];
    const entries = this.entries.querySelectorAll('.entry');
    let   counter = {};   // track duplicate text → unique anchors

    entries.forEach((div, idx) => {
      // Level derived from entry class
      const level = this._levelOf(div);
      if (!level) return;   // beat / scene-only entries skipped unless they have a heading

      // Try to grab the first heading element inside the entry
      const hEl = div.querySelector('h1, h2, h3, h4');
      const text = hEl
        ? hEl.textContent.trim()
        : div.textContent.trim().split('\n')[0].trim();

      if (!text) return;

      // Build a stable anchor id on the entry div itself
      const slug   = this._slug(text);
      const key    = slug || `entry`;
      counter[key] = (counter[key] || 0) + 1;
      const anchor = counter[key] === 1 ? key : `${key}-${counter[key]}`;

      // Stamp the anchor on the entry div so the link target exists
      div.id = anchor;

      items.push({ level, text, anchor });
    });

    return items;
  }

  // ── Map entry class → toc depth ──────────────

  _levelOf(div) {
    if (div.classList.contains('act'))     return 'act';
    if (div.classList.contains('chapter')) return 'chapter';
    if (div.classList.contains('scene'))   return 'scene';
    // Show beats only if they contain an explicit heading tag
    if (div.classList.contains('beat') && div.querySelector('h1,h2,h3,h4')) return 'beat';
    return null;
  }

  // ── Slug helper ───────────────────────────────

  _slug(text) {
    return text
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .trim()
      .replace(/[\s_]+/g, '-')
      .replace(/-+/g, '-')
      .slice(0, 64);
  }

  // ── Watch .entries for DOM changes ───────────

  _observe() {
    this._mo = new MutationObserver(() => {
      // Debounce slightly so rapid edits don't thrash
      clearTimeout(this._moTimer);
      this._moTimer = setTimeout(() => this._buildToc(), 120);
    });

    this._mo.observe(this.entries, {
      childList:     true,
      subtree:       true,
      characterData: true,
      attributes:    false,
    });
  }

  // ── Public: force a rebuild (e.g. after doc load) ──

  refresh() {
    this._buildToc();
  }
}