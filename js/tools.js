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

  _collect() {
    const items   = [];
    const entries = this.entries.querySelectorAll('.entry');
    let   counter = {};

entries.forEach((div, idx) => {
  const level = this._levelOf(div);
  if (!level) return;
  const hEl  = div.querySelector('h1, h2, h3, h4');
  const text = hEl
    ? hEl.textContent.trim()
    : div.textContent.trim().split('\n')[0].trim();
  if (!text) return;

  const anchor = `entry-${idx}`;  // stable, always unique, index-based
  div.id = anchor;
  items.push({ level, text, anchor });
});

    return items;
  }

  _levelOf(div) {
    if (div.classList.contains('act'))     return 'act';
    if (div.classList.contains('chapter')) return 'chapter';
    if (div.classList.contains('scene'))   return 'scene';
    if (div.classList.contains('beat') && div.querySelector('h1,h2,h3,h4')) return 'beat';
    return null;
  }

  _slug(text) {
    return text
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .trim()
      .replace(/[\s_]+/g, '-')
      .replace(/-+/g, '-')
      .slice(0, 64);
  }

  _observe() {
    this._mo = new MutationObserver(() => {
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

  refresh() {
    this._buildToc();
  }
}