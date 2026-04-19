import { AppConfig }              from '../snara.js';
import { truncate, debugLog, apiFetch, postJson } from '../helpers.js';

const TAG = '[chatbot]';

export class SnaraChat {
  static instance = null;
  constructor(selector) {
    if (SnaraChat.instance) {
      console.warn(`${TAG} Already instantiated — skipping duplicate.`);
      return SnaraChat.instance;
    }
    SnaraChat.instance = this;

    this._log = debugLog(TAG, 'chatbot');
    this._log('constructor called with selector:', selector);

    this._root = typeof selector === 'string'
      ? document.querySelector(selector)
      : selector;

    if (!(this._root instanceof HTMLElement)) {
      console.error(`${TAG} Root element not found for selector: "${selector}"`);
      return;
    }

    this._window   = this._root.querySelector('#chatbot-window');
    this._input    = this._root.querySelector('#chatbot-input');
    this._sendBtn  = this._root.querySelector('#chatbot-send');
    this._clearBtn = this._root.querySelector('#chatbot-clear');
    this._select   = this._root.querySelector('#chatbot-preprompt');
    this._aside    = this._root.querySelector('.chat-side');

    const missing = ['_window', '_input', '_sendBtn']
      .filter(k => !this[k]);
    if (missing.length) {
      console.error(`${TAG} Missing required child elements:`, missing);
      return;
    }

    this._endpoint = AppConfig.apiPath
      ? AppConfig.apiPath + '?action=ai.chat'
      : (this._root.dataset.endpoint || 'api.php?action=ai.chat');

    this._prepromptUrl = (AppConfig.jsonPath || '/json') + '/preprompts.json';

    this._log('endpoint:', this._endpoint);
    this._log('prepromptUrl:', this._prepromptUrl);

    this._busy     = false;
    this._maxLabel = parseInt(this._root.dataset.maxLabel || '30', 10);

    this._tocMap = new Map();

    this._onSend     = this._handleSend.bind(this);
    this._onKeypress = this._handleKeypress.bind(this);
    this._onClear    = this._handleClear.bind(this);
    this._onDelegate = this._handleDelegate.bind(this);
    this._onTocClick = this._handleTocClick.bind(this);

    this._bindEvents();
    this._loadPreprompts();
    this._loadHistory();
    this._appendMessage('ai', 'Hello! Ask me anything.');

    this._log('init complete');
  }

  _bindEvents() {
    this._sendBtn.addEventListener('click',   this._onSend);
    this._input.addEventListener('keypress',  this._onKeypress);
    this._clearBtn?.addEventListener('click', this._onClear);
    this._root.addEventListener('click',      this._onDelegate);
    this._aside?.addEventListener('click',    this._onTocClick);
    this._log('events bound');
  }

  _handleSend() {
    this._log('send triggered');
    this._send();
  }

  _handleKeypress(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      this._send();
    }
  }

  _handleClear() {
    this._log('clear triggered');
    this._window.innerHTML = '';
    if (this._aside) this._aside.innerHTML = '<p class="chat-side__heading">Responses</p>';
    this._tocMap.clear();
    if (AppConfig.activeBookId) {
      this._apiRequest('DELETE').catch(err =>
        console.warn(`${TAG} clear remote log failed:`, err.message)
      );
    }
    this._appendMessage('ai', 'Hello! Ask me anything.');
  }

  _handleDelegate(e) {
    const btn = e.target.closest('.chatbot__copy-btn');
    if (!btn) return;
    const textEl = btn.closest('.chatbot__message')?.querySelector('.chatbot__text');
    if (textEl) this._copyToClipboard(textEl.innerText, btn);
  }

  _handleTocClick(e) {
    const anchor = e.target.closest('.chat-side__item');
    if (!anchor) return;
    e.preventDefault();
    this._aside.querySelectorAll('.chat-side__item--active')
      .forEach(el => el.classList.remove('chat-side__item--active'));
    anchor.classList.add('chat-side__item--active');
    const bubble = this._window.querySelector(anchor.getAttribute('href'));
    bubble?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  async _send() {
    const userText = this._input.value.trim();
    if (!userText || this._busy) return;
    const preprompt  = this._select?.value ?? '';
    const fullPrompt = preprompt + userText;
    this._appendMessage('user', userText);
    this._input.value = '';
    this._setLoading(true);
    this._persistEntry('user', userText);
    const aiId        = this._randomId();
    const pendingSpan = this._createPendingBubble(aiId);
    try {
      this._log('fetch ->', this._endpoint);
      const data = await postJson(this._endpoint, { message: fullPrompt });
      this._log('response data:', data);

      let aiText;
      if (data.error) {
        console.warn(`${TAG} API returned error:`, data.error);
        aiText = `Error: ${data.error}`;
      } else if (data.choices?.[0]?.message?.content) {
        aiText = data.choices[0].message.content;
      } else {
        console.warn(`${TAG} Unexpected response shape:`, data);
        aiText = 'Error: Unexpected response from API.';
      }

      pendingSpan.innerText = aiText;

      this._addTocEntry(aiId, aiText);
      this._persistEntry('ai', aiText, aiId);

    } catch (err) {
      console.error(`${TAG} Fetch failed:`, err);
      pendingSpan.innerText = 'Error: Connection failed. Check the console.';
    } finally {
      this._setLoading(false);
      this._scrollBottom();
    }
  }

  _appendMessage(role, text, opts = {}) {
    const div = document.createElement('div');
    div.className = `chatbot__message chatbot__message--${role}`;

    if (opts.id) {
      div.id = `msg-${opts.id}`;
      div.setAttribute('data-timestamp', opts.timestamp || new Date().toISOString());
    }

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
      if (opts.addToc) this._addTocEntry(opts.id, text);
    }

    this._window.appendChild(div);
    this._scrollBottom();
    return span;
  }

  _createPendingBubble(id) {
    const div = document.createElement('div');
    div.className = 'chatbot__message chatbot__message--ai';
    div.id        = `msg-${id}`;

    const span = document.createElement('span');
    span.className = 'chatbot__text';
    span.innerText = '…';
    div.appendChild(span);

    const btn = document.createElement('button');
    btn.className = 'chatbot__copy-btn';
    btn.textContent = 'Copy';
    btn.setAttribute('aria-label', 'Copy message');
    div.appendChild(btn);

    this._window.appendChild(div);
    this._scrollBottom();
    return span;
  }

  _setLoading(state) {
    this._busy             = state;
    this._sendBtn.disabled = state;
    this._sendBtn.classList.toggle('chatbot__send--loading', state);
    this._log('loading state:', state);
  }

  _scrollBottom() {
    this._window.scrollTop = this._window.scrollHeight;
  }

  async _loadPreprompts() {
    if (!this._select) return;
    this._log('loading preprompts from:', this._prepromptUrl);
    try {
      const res = await fetch(this._prepromptUrl);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const opts = await res.json();

      this._log('preprompts loaded:', opts.length, 'options');

      this._select.innerHTML = '<option value="">Default</option>';
      opts.forEach(({ label, value }) => {
        const el       = document.createElement('option');
        el.value       = value;
        el.textContent = label;
        this._select.appendChild(el);
      });

    } catch (err) {
      console.warn(`${TAG} Could not load preprompts:`, err.message);
      this._select.innerHTML = '<option value="">Default</option>';
    }
  }

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
    } catch (err) {
      console.error(`${TAG} Fallback copy threw:`, err);
    }
    document.body.removeChild(ta);
  }

  _addTocEntry(id, content) {
    if (!this._aside || !id) return;
    const label = truncate(content, this._maxLabel);
    const time  = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const anchor       = document.createElement('a');
    anchor.className   = 'chat-side__item';
    anchor.href        = `#msg-${id}`;
    anchor.title       = content;
    const labelEl       = document.createElement('span');
    labelEl.className   = 'chat-side__label';
    labelEl.textContent = label;
    const timeEl       = document.createElement('span');
    timeEl.className   = 'chat-side__time';
    timeEl.textContent = time;
    anchor.append(labelEl, timeEl);
    this._aside.appendChild(anchor);
    this._tocMap.set(id, anchor);
  }

  async _loadHistory() {
    if (!AppConfig.activeBookId) return;
    try {
      const data = await this._apiRequest('GET');
      if (!Array.isArray(data?.log) || !data.log.length) return;
      data.log.forEach(entry => {
        if (!entry.id || !entry.content) return;
        if (!['user', 'ai'].includes(entry.role)) return;
        this._appendMessage(entry.role, entry.content, {
          id:        entry.id,
          timestamp: entry.timestamp,
          addToc:    entry.role === 'ai',
        });
      });

      this._log('history replayed:', data.log.length, 'entries');
    } catch (err) {
      console.warn(`${TAG} history load failed:`, err.message);
    }
  }

  _persistEntry(role, content, id) {
    if (!AppConfig.activeBookId) return;
    const entryId   = id ?? this._randomId();
    const timestamp = new Date().toISOString();
    const label     = truncate(content, this._maxLabel);
    this._apiRequest('POST', { id: entryId, role, content, label, timestamp })
      .catch(err => console.warn(`${TAG} persist failed:`, err.message));
  }

  async _apiRequest(method, body = null) {
    const ACTION_MAP = { GET: 'chatlog.get', POST: 'chatlog.save', DELETE: 'chatlog.clear' };
    const url  = `${AppConfig.apiPath}?action=${ACTION_MAP[method]}&bookId=${encodeURIComponent(AppConfig.activeBookId)}`;
    const opts = { method, headers: { 'Content-Type': 'application/json' }, credentials: 'same-origin' };
    if (body) opts.body = JSON.stringify(body);
    // Raw fetch used here — chatlog endpoints do not return json.error shape,
    // and DELETE returns no body on some servers, so apiFetch is not appropriate.
    const res = await fetch(url, opts);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  }

  _randomId() {
    return String(Math.floor(Math.random() * 900_000 + 100_000));
  }

  destroy() {
    this._log('destroy called');
    this._sendBtn?.removeEventListener('click',   this._onSend);
    this._input?.removeEventListener('keypress',  this._onKeypress);
    this._clearBtn?.removeEventListener('click',  this._onClear);
    this._root?.removeEventListener('click',      this._onDelegate);
    this._aside?.removeEventListener('click',     this._onTocClick);
    this._tocMap?.clear();
    this._tocMap = null;
    SnaraChat.instance = null;
    this._root = null;
    this._log('destroy complete');
  }
}
