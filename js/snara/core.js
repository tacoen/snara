
import { SnaraTool }   from './tools.js';
import { SnaraUI }     from './ui.js';
import { SnaraStruct } from './struct.js';
export class SnaraEditor {
  static CLASSES  = SnaraStruct.CLASSES;
  static instance = null;
  constructor() {
    SnaraEditor.instance = this;
    this.editorEl   = document.getElementById('editor');
    this.entriesEl  = document.querySelector('.entries');
    this.editorArea = document.querySelector('.editor-area');
    this.activeTag  = null;
    this._bindEditor();
    this.bindAllExistingEntries();
  }

  _bindEditor() {
    this.editorEl.addEventListener('keydown', e => {
      if (e.key === 'Enter' && e.ctrlKey) { e.preventDefault(); this.submit(); }
    });
    this.editorEl.addEventListener('focus', () =>
      this.editorArea.classList.add('editor-active')
    );
    this.editorEl.addEventListener('blur', () =>
      setTimeout(() => this.editorArea.classList.remove('editor-active'), 150)
    );
  }

  bindAllExistingEntries() {
    document.querySelectorAll('.entry').forEach(div => this._bindEntryEvents(div));
  }

  setTag(cls) {
    document.querySelectorAll('.tag-pill').forEach(p =>
      SnaraStruct.CLASSES.forEach(c => p.classList.remove(`active-${c}`))
    );
    if (this.activeTag === cls) { this.activeTag = null; return; }
    this.activeTag = cls;
    document.querySelector(`.tag-pill[data-tag="${cls}"]`)
      ?.classList.add(`active-${cls}`);
  }

  _buildEntry(md, cls) {
    const div = document.createElement('div');
    div.contentEditable = 'true';
    div.className = `entry ${cls}`;
    div.innerHTML = marked.parse(md, { breaks: true });
    this._bindEntryEvents(div);
    return div;
  }

  submit() {
    const raw = this.editorEl.innerText.trim();
    if (!raw) return;
    const blocks  = SnaraStruct.split(raw, this.activeTag);
    let   lastDiv = null;
    for (const { md, cls } of blocks) {
      const div = this._buildEntry(md, cls);
      this.entriesEl.appendChild(div);
      lastDiv = div;
    }

    this.editorEl.innerText = '';
    this.editorEl.focus();
    lastDiv?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  _bindEntryEvents(div) {
    div.addEventListener('focus', () => {
      SnaraUI.instance.focusEntry(div);
      if (!div.dataset.editing) {
        div.dataset.editing = '1';
        document.body.classList.add('entry-edit');
        div.dataset.rawMd   = SnaraTool.htmlToMd(div.innerHTML);
        div.innerText       = div.dataset.rawMd || '';
      }
    });

    div.addEventListener('mouseup', () => SnaraUI.instance.focusEntry(div));

    div.addEventListener('blur', () => {
      SnaraUI.instance.scheduleHidePopup();
      document.body.classList.remove('entry-edit');
      div.removeAttribute('data-editing');
    });

    div.addEventListener('keydown', e => {
      if (e.key === 'Enter' && e.ctrlKey) {
        e.preventDefault();
        this._commitEntry(div);
      }
      if (e.key === 'Escape') {
        this._cancelEntry(div);
      }
    });
  }

  _commitEntry(div) {
    const raw = div.innerText.trim();
    if (!raw) { div.remove(); return; }

    const blocks = SnaraStruct.split(raw);

    if (blocks.length === 1) {
      const { md, cls } = blocks[0];
      SnaraStruct.CLASSES.forEach(c => div.classList.remove(c));
      div.classList.add(cls);
      div.innerHTML = marked.parse(md, { breaks: true });
      delete div.dataset.editing;
      delete div.dataset.rawMd;
      div.blur();
    } else {
      let anchor = div;
      for (const { md, cls } of blocks) {
        const newDiv = this._buildEntry(md, cls);
        anchor.after(newDiv);
        anchor = newDiv;
      }
      div.remove();
      anchor.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }

  _cancelEntry(div) {
    if (div.dataset.rawMd !== undefined) {
      div.innerHTML = marked.parse(div.dataset.rawMd, { breaks: true });
      delete div.dataset.editing;
      delete div.dataset.rawMd;
    }
    div.blur();
  }

  fmt(cmd) {
    this.editorEl.focus();
    document.execCommand(cmd);
  }

  wrapMd(prefix) {
    SnaraTool.insertAtCursor(this.editorEl, prefix);
  }

  wrapInline(before, after) {
    SnaraTool.wrapSelection(this.editorEl, before, after, 'code');
  }
}