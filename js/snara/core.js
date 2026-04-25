import { SnaraTool } from "./tools.js";
import { SnaraUI } from "./ui.js";
import { SnaraStruct } from "./struct.js";

export class SnaraEditor {
  static CLASSES = SnaraStruct.CLASSES;
  static instance = null;

  constructor() {
    SnaraEditor.instance = this;
    this.editorEl = document.getElementById("editor");
    this.entriesEl = document.querySelector(".entries");
    this.editorArea = document.querySelector(".editor-area");
    this.activeTag = null;
    this._bindEditor();
    this.bindAllExistingEntries();
  }

  _bindEditor() {
    this.editorEl.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && e.ctrlKey) {
        e.preventDefault();
        this.submit();
      }
    });
    this.editorEl.addEventListener("focus", () =>
      this.editorArea.classList.add("editor-active")
    );
    this.editorEl.addEventListener("blur", () =>
      setTimeout(() => this.editorArea.classList.remove("editor-active"), 150)
    );
  }

  bindAllExistingEntries() {
    document
      .querySelectorAll(".entry")
      .forEach((div) => this._bindEntryEvents(div));
  }

  setTag(cls) {
    document
      .querySelectorAll(".tag-pill")
      .forEach((p) =>
        SnaraStruct.CLASSES.forEach((c) => p.classList.remove(`active-${c}`))
      );
    if (this.activeTag === cls) {
      this.activeTag = null;
      return;
    }
    this.activeTag = cls;
    document
      .querySelector(`.tag-pill[data-tag="${cls}"]`)
      ?.classList.add(`active-${cls}`);
  }

  _buildEntry(md, cls) {
    const div = document.createElement("div");
    div.contentEditable = "true";
    div.className = `entry ${cls}`;
    div.innerHTML = marked.parse(md, { breaks: true });
    this._bindEntryEvents(div);
    return div;
  }

  submit() {
    const raw = this.editorEl.innerText.trim();
    if (!raw) return;
    const blocks = SnaraStruct.split(raw, this.activeTag);
    let lastDiv = null;
    for (const { md, cls } of blocks) {
      const div = this._buildEntry(md, cls);
      this.entriesEl.appendChild(div);
      lastDiv = div;
    }
    this.editorEl.innerText = "";
    this.editorEl.focus();
    lastDiv?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  // Returns true if any entry is either open (editing) or marked dirty (advice).
  // Used by ui.js _renderDocument to guard against discarding unsaved work.
  _isDirty() {
    return (
      this.entriesEl.querySelector(".entry[data-editing]") !== null ||
      this.entriesEl.querySelector(".entry[data-advice]") !== null
    );
  }

  // Normalize HTML string for dirty comparison.
  // Parses into a temp element and reads back innerHTML to strip
  // whitespace noise introduced by the MD round-trip.
  _normalizeHtml(html) {
    const tmp = document.createElement("div");
    tmp.innerHTML = html;
    return tmp.innerHTML;
  }

  // Scroll #article so target entry is visible.
  // target: HTMLElement or string id (e.g. "entry-3" from TOC).
  _scrollToEntry(target) {
    const div =
      typeof target === "string" ? document.getElementById(target) : target;
    if (!div) return;
    const frame = document.getElementById("article");
    if (!frame) return;
    const scValue =
      frame.scrollTop +
      div.getBoundingClientRect().top -
      frame.getBoundingClientRect().top;
    frame.scrollTo({ top: scValue, behavior: "smooth" });
  }

  // Purge all open entries (each committed: MD -> HTML, dirty check),
  // open target entry (HTML -> MD), scroll to it.
  // Called from focus handler and TOC click.
  _openEntry(div) {
    this.entriesEl.querySelectorAll(".entry[data-editing]").forEach((open) => {
      if (open !== div) this._commitEntry(open);
    });

    if (div.dataset.editing) return;

    // snapshot original HTML before converting to MD
    div.dataset.originalHtml = div.innerHTML;
    div.dataset.editing = "1";
    document.body.classList.add("entry-edit");

    // use the snapshot as source so both sides of the dirty check share the same origin
    div.innerText = SnaraTool.htmlToMd(div.dataset.originalHtml);

    setTimeout(() => this._scrollToEntry(div), 10);
  }

  _bindEntryEvents(div) {
    div.addEventListener("focus", () => {
      SnaraUI.instance.focusEntry(div);
      if (!div.dataset.editing) this._openEntry(div);
    });

    div.addEventListener("mouseup", () => SnaraUI.instance.focusEntry(div));

    div.addEventListener("blur", () => {
      SnaraUI.instance.scheduleHidePopup();
      document.body.classList.remove("entry-edit");
      // silent=true: element is already blurring, skip div.blur() inside _commitEntry
      // to prevent focus stealing and double _openEntry on the next entry.
      if (div.dataset.editing) this._commitEntry(div, { silent: true });
    });

    div.addEventListener("blur", () => {
      SnaraUI.instance.scheduleHidePopup();
      document.body.classList.remove("entry-edit");
      // commit on blur so MD is always converted back to HTML before losing focus.
      // _commitEntry deletes data-editing before calling blur(), preventing recursion.
      if (div.dataset.editing) this._commitEntry(div);
    });

    div.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && e.ctrlKey) {
        e.preventDefault();
        this._commitEntry(div);
      }
      // ESC commits (MD -> HTML, dirty check) rather than discarding
      if (e.key === "Escape") {
        this._commitEntry(div);
      }
    });
  }

  _commitEntry(div, { silent = false } = {}) {
    const raw = div.innerText.trim();
    if (!raw) {
      div.remove();
      return;
    }

    const blocks = SnaraStruct.split(raw);

    if (blocks.length === 1) {
      const { md, cls } = blocks[0];
      SnaraStruct.CLASSES.forEach((c) => div.classList.remove(c));
      div.classList.add(cls);

      const newHtml = marked.parse(md, { breaks: true });

      // dirty check — compare normalized HTML to detect real changes
      if (
        this._normalizeHtml(newHtml) !==
        this._normalizeHtml(div.dataset.originalHtml || "")
      ) {
        div.dataset.advice = "Edited, need to be saved";
      } else {
        delete div.dataset.advice;
      }

      div.innerHTML = newHtml;
      delete div.dataset.originalHtml;
      delete div.dataset.editing;
      // skip blur() when called from blur handler — element is already blurring,
      // calling blur() again would steal focus and cause double _openEntry on next entry.
      if (!silent) div.blur();
    } else {
      // multi-block split — mark all resulting entries dirty
      let anchor = div;
      for (const { md, cls } of blocks) {
        const newDiv = this._buildEntry(md, cls);
        newDiv.dataset.advice = "Edited, need to be saved";
        anchor.after(newDiv);
        anchor = newDiv;
      }
      div.remove();
      anchor.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }

  fmt(cmd) {
    this.editorEl.focus();
    document.execCommand(cmd);
  }

  wrapMd(prefix) {
    SnaraTool.insertAtCursor(this.editorEl, prefix);
  }

  wrapInline(before, after) {
    SnaraTool.wrapSelection(this.editorEl, before, after, "code");
  }
}
