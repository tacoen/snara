export class SnaraAIToolbar {
  // ── Private instance fields ───────────────────
  #root;
  #activeEntry = null;
  #getEntry;
  #bindEntry;
  #prompts = [];
  #busy = false;
  #abort = null;
  #endpoint;
  #promptsUrl;
  #boundClick;

  // ── Static fields ─────────────────────────────
  static instance = null;
  static #builderPrompts = null;

  constructor(root, opts = {}) {
    SnaraAIToolbar.instance = this;

    this.#root       = typeof root === 'string'
      ? document.querySelector(root)
      : root instanceof HTMLElement ? root : null;

    this.#getEntry   = typeof opts.getEntry  === 'function' ? opts.getEntry  : null;
    this.#bindEntry  = typeof opts.bindEntry === 'function' ? opts.bindEntry : null;
    this.#promptsUrl = opts.preprompts ?? 'json/preprompts.json';
    this.#endpoint   = opts.endpoint   ?? 'api.php?action=ai.chat';
    this._endpoint   = this.#endpoint;

    if (!this.#root) {
      console.warn('[SnaraAIToolbar] root element not found:', root);
      return;
    }

    this.#boundClick = this.#onClick.bind(this);
    this.#root.addEventListener('click', this.#boundClick);
    this.#loadPrompts();
  }

  setActiveEntry(el) {
    this.#activeEntry = el instanceof HTMLElement ? el : null;
  }

  static async helper(fieldKey) {
    // 1. Load builder-prompts (cached)
    if (!SnaraAIToolbar.#builderPrompts) {
      try {
        const res = await fetch('json/builder-prompts.json');
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        SnaraAIToolbar.#builderPrompts = await res.json();
      } catch (err) {
        console.error('[SnaraAIToolbar] builder-prompts load failed:', err);
        return;
      }
    }

    // 2. Find matching prompt
    const prompt = SnaraAIToolbar.#builderPrompts.find(p => p.label === fieldKey);
    if (!prompt) {
      console.warn('[SnaraAIToolbar] No builder prompt for field:', fieldKey);
      return;
    }

    // 3. Get article context
    const context = [...document.querySelectorAll('.entries .entry')]
      .map(el => el.innerText.trim())
      .filter(Boolean)
      .join('\n\n');

    if (!context) {
      console.warn('[SnaraAIToolbar] No article content found.');
      return;
    }

    // 4. POST to ai.chat
    const endpoint = SnaraAIToolbar.instance?._endpoint ?? 'api.php?action=ai.chat';
    let text = '';
    try {
      const res = await fetch(endpoint, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ message: prompt.value + context }),
      });
      if (!res.ok) throw new Error(`Server error ${res.status}`);
      const data = await res.json();
      text = (
        data?.choices?.[0]?.message?.content ??
        data?.reply   ??
        data?.content ??
        data?.message ??
        ''
      ).trim();
    } catch (err) {
      console.error('[SnaraAIToolbar] helper fetch failed:', err);
      return;
    }

    if (!text) return;

    // 5. Populate the meta field
    if (fieldKey === 'characters') {
      const row = [...document.querySelectorAll('.meta-field')]
        .find(r => r.dataset.key === 'characters');
      if (!row) return;
      const input = row.querySelector('.pill-input');
      if (!input) return;
      const ui = (await import('./ui.js')).SnaraUI.instance;
      text.split(',').map(s => s.trim()).filter(Boolean).forEach(name => {
        ui?._addPill(input, name);
      });
    } else {
      const row = [...document.querySelectorAll('.meta-field')]
        .find(r => (r.dataset.key === fieldKey) ||
                   (r.querySelector('.field-key')?.innerText.trim() === fieldKey));
      if (!row) return;
      const valEl = row.querySelector('.field-val');
      if (valEl) valEl.innerText = text;
    }
  }

  destroy() {
    this.#root?.removeEventListener('click', this.#boundClick);
    this.#abort?.abort();
    this.#root        = null;
    this.#activeEntry = null;
    this.#prompts     = [];
  }

  async #loadPrompts() {
    try {
      const res = await fetch(this.#promptsUrl);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (!Array.isArray(data)) throw new TypeError('preprompts.json must be an array');
      this.#prompts = data;
      this.#stampButtons();
    } catch (err) {
      console.error('[SnaraAIToolbar] preprompts load failed:', err);
    }
  }

  #stampButtons() {
    if (!this.#root) return;
    [1, 2, 3, 4].forEach((n, i) => {
      const btn = this.#root.querySelector(`.ai-${n}`);
      if (!btn || !this.#prompts[i]) return;
      btn.dataset.prepromptIndex = String(i);
      btn.setAttribute('title', this.#prompts[i].label);
    });
  }

  #onClick(e) {
    const btn = e.target.closest('[data-preprompt-index]');
    if (!btn) return;
    const prompt = this.#prompts[parseInt(btn.dataset.prepromptIndex, 10)];
    if (prompt) this.#dispatch(prompt);
  }

  async #dispatch(prompt) {
    if (this.#busy) return;
    const entry = this.#activeEntry ?? this.#getEntry?.();
    if (!entry) {
      console.warn('[SnaraAIToolbar] No focused entry found.');
      return;
    }

    const responsediv = document.createElement('div');
    responsediv.className       = 'entry beat ai-response';
    responsediv.contentEditable = 'true';
    responsediv.textContent     = '…';

    entry.insertAdjacentElement('afterend', responsediv);
    this.#bindEntry?.(responsediv);

    this.#abort?.abort();
    this.#abort = new AbortController();
    this.#busy  = true;

    try {
      const selection = window.getSelection()?.toString().trim();
      const context   = selection || entry.innerText.trim();
      const res = await fetch(this.#endpoint, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ message: prompt.value + context }),
        signal:  this.#abort.signal,
      });

      if (!res.ok) throw new Error(`Server error ${res.status}`);
      const data = await res.json();
      const text = (
        data?.choices?.[0]?.message?.content ??
        data?.reply   ??
        data?.content ??
        data?.message ??
        ''
      ).trim();
      const output = `#### AI Response:\n\n${text}`;
      responsediv.innerHTML = typeof marked !== 'undefined'
        ? marked.parse(output)
        : output.replace(/</g, '&lt;').replace(/\n/g, '<br>');

    } catch (err) {
      if (err.name === 'AbortError') { responsediv.remove(); return; }
      responsediv.textContent = `⚠ ${err.message}`;
    } finally {
      this.#busy = false;
    }
  }
}