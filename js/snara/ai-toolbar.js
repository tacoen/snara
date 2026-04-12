/**
 * SnaraAIToolbar
 * ──────────────────────────────────────────────────────────────────────────
 * Wires .ai-1 … .ai-4 popup buttons to json/preprompts.json.
 * On click: fetches AI response, creates a new contenteditable div.entry.beat
 * inserted immediately after the focused entry, fully bound via bindEntry.
 *
 * Public API
 *   const t = new SnaraAIToolbar('#popup', {
 *     getEntry:  () => ui.focusedEntry,
 *     bindEntry: (el) => editor._bindEntryEvents(el),
 *   })
 *   t.setActiveEntry(el)   ← optional explicit override
 *   t.destroy()
 * ──────────────────────────────────────────────────────────────────────────
 */
export class SnaraAIToolbar {

  /** @type {HTMLElement|null}       */ #root;
  /** @type {HTMLElement|null}       */ #activeEntry = null;
  /** @type {Function|null}          */ #getEntry;
  /** @type {Function|null}          */ #bindEntry;
  /** @type {Array<{label:string, value:string}>} */ #prompts = [];
  /** @type {boolean}                */ #busy = false;
  /** @type {AbortController|null}   */ #abort = null;
  /** @type {string}                 */ #endpoint;
  /** @type {string}                 */ #promptsUrl;
  /** @type {Function}               */ #boundClick;

  /**
   * @param {string|HTMLElement} root
   * @param {{
   *   getEntry?:  () => HTMLElement|null,
   *   bindEntry?: (el: HTMLElement) => void,
   *   preprompts?: string,
   *   endpoint?:  string
   * }} [opts]
   */
  constructor(root, opts = {}) {
    this.#root       = typeof root === 'string'
      ? document.querySelector(root)
      : root instanceof HTMLElement ? root : null;

    this.#getEntry   = typeof opts.getEntry  === 'function' ? opts.getEntry  : null;
    this.#bindEntry  = typeof opts.bindEntry === 'function' ? opts.bindEntry : null;
    this.#promptsUrl = opts.preprompts ?? 'json/preprompts.json';
    this.#endpoint   = opts.endpoint   ?? 'api.php?action=ai.chat';

    if (!this.#root) {
      console.warn('[SnaraAIToolbar] root element not found:', root);
      return;
    }

    this.#boundClick = this.#onClick.bind(this);
    this.#root.addEventListener('click', this.#boundClick);
    this.#loadPrompts();
  }

  // ── Public ─────────────────────────────────────────────────────────────

  /** Optional explicit override — not required when getEntry is provided. */
  setActiveEntry(el) {
    this.#activeEntry = el instanceof HTMLElement ? el : null;
  }

  destroy() {
    this.#root?.removeEventListener('click', this.#boundClick);
    this.#abort?.abort();
    this.#root        = null;
    this.#activeEntry = null;
    this.#prompts     = [];
  }

  // ── Private ────────────────────────────────────────────────────────────

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

    // Create response div — same structure as every other rendered entry.
    const responsediv = document.createElement('div');
    responsediv.className       = 'entry beat ai-response';
    responsediv.contentEditable = 'true';
    responsediv.textContent     = '…';

    entry.insertAdjacentElement('afterend', responsediv);

    // Register click-to-popup + markdown behaviour — same as _renderDocument does.
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