/* ─────────────────────────────────────────────────
   js/snara/chatbot.js  —  SnaraChat
   
   Reads AppConfig.jsonPath for preprompts.
   Reads AppConfig.apiPath for the AI endpoint,
   falling back to the data-endpoint attribute.

   Debug output: set localStorage.debug = 'chatbot'
   in the browser console to enable verbose logs.
   
   Public API:
     new SnaraChat('#chatbot-root')
     instance.destroy()
─────────────────────────────────────────────────── */

import { AppConfig } from '../snara.js';

const TAG = '[chatbot]';

export class SnaraChat {

  static instance = null;

  // ── Constructor ──────────────────────────────────────────────────

  constructor(selector) {
    if (SnaraChat.instance) {
      console.warn(`${TAG} Already instantiated — skipping duplicate.`);
      return SnaraChat.instance;
    }
    SnaraChat.instance = this;

    // Debug gate: localStorage.debug = 'chatbot' to enable
    this._debugEnabled = (localStorage.getItem('debug') ?? '').includes('chatbot');

    this._log('constructor called with selector:', selector);

    // ── Resolve root element ──
    this._root = typeof selector === 'string'
      ? document.querySelector(selector)
      : selector;

    if (!(this._root instanceof HTMLElement)) {
      console.error(`${TAG} Root element not found for selector: "${selector}"`);
      return;
    }

    this._log('root element found:', this._root.id);

    // ── Child elements (all scoped to root) ──
    this._window   = this._root.querySelector('#chatbot-window');
    this._input    = this._root.querySelector('#chatbot-input');
    this._sendBtn  = this._root.querySelector('#chatbot-send');
    this._clearBtn = this._root.querySelector('#chatbot-clear');
    this._select   = this._root.querySelector('#chatbot-preprompt');

    const missing = ['_window','_input','_sendBtn']
      .filter(k => !this[k]);
    if (missing.length) {
      console.error(`${TAG} Missing required child elements:`, missing);
      return;
    }

    // ── Settings — AppConfig wins over data-attrs ──
    this._endpoint = AppConfig.apiPath
      ? AppConfig.apiPath + '?action=ai.chat'
      : (this._root.dataset.endpoint || 'php/ai.php');

    this._prepromptUrl = AppConfig.jsonPath
      ? AppConfig.jsonPath + '/preprompts.json'
      : '/json/preprompts.json';

    this._log('endpoint:', this._endpoint);
    this._log('prepromptUrl:', this._prepromptUrl);

    // ── Internal state ──
    this._busy = false;

    // ── Bind handlers (stored refs for destroy()) ──
    this._onSend      = this._handleSend.bind(this);
    this._onKeypress  = this._handleKeypress.bind(this);
    this._onClear     = this._handleClear.bind(this);
    this._onDelegate  = this._handleDelegate.bind(this); // copy buttons

    this._bindEvents();
    this._loadPreprompts();
    this._appendMessage('ai', 'Hello! Ask me anything.');

    this._log('init complete');
  }

  // ── Events ──────────────────────────────────────────────────────

  _bindEvents() {
    this._sendBtn.addEventListener('click',    this._onSend);
    this._input.addEventListener('keypress',   this._onKeypress);
    this._clearBtn?.addEventListener('click',  this._onClear);

    // Event delegation — catches .chatbot__copy-btn clicks (dynamic elements)
    this._root.addEventListener('click', this._onDelegate);

    this._log('events bound');
  }

  _handleSend() {
    this._log('send triggered');
    this._send();
  }

  _handleKeypress(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      this._log('Enter key → send');
      this._send();
    }
  }

  _handleClear() {
    this._log('clear triggered');
    this._window.innerHTML = '';
    this._appendMessage('ai', 'Hello! Ask me anything.');
  }

  /** Delegated: handles copy button clicks on dynamic AI bubbles */
  _handleDelegate(e) {
    const btn = e.target.closest('.chatbot__copy-btn');
    if (!btn) return;
    const textEl = btn.closest('.chatbot__message')?.querySelector('.chatbot__text');
    if (textEl) {
      this._log('copy triggered for message');
      this._copyToClipboard(textEl.innerText, btn);
    }
  }

  // ── Core: send ───────────────────────────────────────────────────

  async _send() {
    const userText = this._input.value.trim();
    if (!userText) {
      this._log('send aborted — empty input');
      return;
    }
    if (this._busy) {
      this._log('send aborted — already busy');
      return;
    }

    const preprompt  = this._select?.value ?? '';
    const fullPrompt = preprompt + userText;

    this._log('sending message. preprompt prefix length:', preprompt.length);

    this._appendMessage('user', userText);
    this._input.value = '';
    this._setLoading(true);

    const pendingText = this._appendMessage('ai', '…');

    try {
      this._log('fetch →', this._endpoint);

      const res = await fetch(this._endpoint, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ message: fullPrompt }),
      });

      this._log('fetch ← status:', res.status);

      if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);

      const data = await res.json();
      this._log('response data:', data);

      if (data.error) {
        console.warn(`${TAG} API returned error:`, data.error);
        pendingText.innerText = `Error: ${data.error}`;
      } else if (data.choices?.[0]?.message?.content) {
        pendingText.innerText = data.choices[0].message.content;
      } else {
        console.warn(`${TAG} Unexpected response shape:`, data);
        pendingText.innerText = 'Error: Unexpected response from API.';
      }

    } catch (err) {
      console.error(`${TAG} Fetch failed:`, err);
      pendingText.innerText = 'Error: Connection failed. Check the console.';
    } finally {
      this._setLoading(false);
      this._scrollBottom();
    }
  }

  // ── DOM helpers ──────────────────────────────────────────────────

  /**
   * @param {'user'|'ai'} role
   * @param {string}      text
   * @returns {HTMLElement}  The text <span> — caller can update `.innerText`
   */
  _appendMessage(role, text) {
    const div = document.createElement('div');
    div.className = `chatbot__message chatbot__message--${role}`;

    const span = document.createElement('span');
    span.className = 'chatbot__text';
    span.innerText = text;
    div.appendChild(span);

    if (role === 'ai') {
      const btn = document.createElement('button');
      btn.className = 'chatbot__copy-btn';
      btn.textContent = 'Copy';
      btn.setAttribute('aria-label', 'Copy message');
      div.appendChild(btn);
    }

    this._window.appendChild(div);
    this._scrollBottom();
    return span;
  }

  _setLoading(state) {
    this._busy = state;
    this._sendBtn.disabled = state;
    this._log('loading state:', state);
  }

  _scrollBottom() {
    this._window.scrollTop = this._window.scrollHeight;
  }

  // ── Preprompts ───────────────────────────────────────────────────

  async _loadPreprompts() {
    if (!this._select) return;
    this._log('loading preprompts from:', this._prepromptUrl);

    try {
      const res = await fetch(this._prepromptUrl);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const opts = await res.json();

      this._log('preprompts loaded:', opts.length, 'options');

      this._select.innerHTML = '<option value="">Default (No Prompt)</option>';
      opts.forEach(({ label, value }) => {
        const el = document.createElement('option');
        el.value = value;
        el.textContent = label;
        this._select.appendChild(el);
      });

    } catch (err) {
      console.warn(`${TAG} Could not load preprompts:`, err);
      this._select.innerHTML = '<option value="">Default</option>';
    }
  }

  // ── Clipboard ────────────────────────────────────────────────────

  _copyToClipboard(text, btn) {
    const onSuccess = () => {
      this._log('copy success');
      const orig = btn.textContent;
      btn.textContent = 'Copied!';
      btn.classList.add('chatbot__copy-btn--copied');
      setTimeout(() => {
        btn.textContent = orig;
        btn.classList.remove('chatbot__copy-btn--copied');
      }, 2000);
    };

    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text).then(onSuccess).catch(err => {
        console.warn(`${TAG} Clipboard API failed, using fallback:`, err);
        this._fallbackCopy(text, onSuccess);
      });
    } else {
      this._log('non-secure context — using execCommand fallback');
      this._fallbackCopy(text, onSuccess);
    }
  }

  _fallbackCopy(text, onSuccess) {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.cssText = 'position:fixed;left:-9999px;top:0;opacity:0';
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    try {
      if (document.execCommand('copy')) onSuccess();
      else console.warn(`${TAG} execCommand copy returned false`);
    } catch (err) {
      console.error(`${TAG} Fallback copy threw:`, err);
    }
    document.body.removeChild(ta);
  }

  // ── Debug logger ─────────────────────────────────────────────────
  // Enable:  localStorage.setItem('debug', 'chatbot')  then reload
  // Disable: localStorage.removeItem('debug')          then reload

  _log(...args) {
    if (this._debugEnabled) console.log(TAG, ...args);
  }

  // ── Public API ───────────────────────────────────────────────────

  destroy() {
    this._log('destroy called — removing all listeners');
    this._sendBtn?.removeEventListener('click',   this._onSend);
    this._input?.removeEventListener('keypress',  this._onKeypress);
    this._clearBtn?.removeEventListener('click',  this._onClear);
    this._root?.removeEventListener('click',      this._onDelegate);
    SnaraChat.instance = null;
    this._root = null;
    this._log('destroy complete');
  }
}