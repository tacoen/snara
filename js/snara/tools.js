import icx from "../icons/ge-icon.js";
import { SnaraEditor } from "./core.js";

export class SnaraTool {
  static instance = null;

  constructor() {
    SnaraTool.instance = this;
    this.aside = document.querySelector("aside.side-panel");
    this.entries = document.querySelector(".entries");
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

    const ul = document.createElement("ul");
    ul.className = "toc-list";

    items.forEach(({ level, text, anchor }) => {
      const li = document.createElement("li");
      li.className = `toc-item toc-${level}`;

      const a = document.createElement("a");
      a.href = `#${anchor}`;
      a.textContent = text;
      a.addEventListener("click", (e) => {
        e.preventDefault();
        const target = document.getElementById(anchor);
        if (target) SnaraEditor.instance?._openEntry(target, { scroll: true });
      });

      li.appendChild(a);
      ul.appendChild(li);
    });

    this.aside.innerHTML = `<div class="toc-label">Contents</div>`;
    this.aside.appendChild(ul);
  }

  _collect() {
    const items = [];
    const entries = this.entries.querySelectorAll(".entry");

    entries.forEach((div, idx) => {
      const level = this._levelOf(div);
      if (!level) return;
      const hEl = div.querySelector("h1, h2, h3, h4");
      const text = hEl
        ? hEl.textContent.trim()
        : div.textContent.trim().split("\n")[0].trim();
      if (!text) return;

      const anchor = `entry-${idx}`;
      div.id = anchor;
      items.push({ level, text, anchor });
    });

    return items;
  }

  _levelOf(div) {
    if (div.classList.contains("act")) return "act";
    if (div.classList.contains("chapter")) return "chapter";
    if (div.classList.contains("scene")) return "scene";
    if (div.classList.contains("beat") && div.querySelector("h1,h2,h3,h4"))
      return "beat";
    return null;
  }

  _slug(text) {
    return text
      .toLowerCase()
      .replace(/[^\w\s-]/g, "")
      .trim()
      .replace(/[\s_]+/g, "-")
      .replace(/-+/g, "-")
      .slice(0, 64);
  }

  _observe() {
    this._mo = new MutationObserver(() => {
      clearTimeout(this._moTimer);
      this._moTimer = setTimeout(() => this._buildToc(), 120);
    });

    this._mo.observe(this.entries, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: false,
    });
  }

  refresh() {
    this._buildToc();
  }

  static htmlToMd(html) {
    const tmp = document.createElement("div");
    tmp.innerHTML = html;
    tmp.querySelectorAll(".label-tag").forEach((el) => el.remove());

    function nodeToMd(node) {
      if (node.nodeType === Node.TEXT_NODE) return node.textContent.trim();
      if (node.nodeType !== Node.ELEMENT_NODE) return "";
      const tag = node.tagName?.toLowerCase();
      const inner = () => {
        let content = Array.from(node.childNodes).map(nodeToMd).join("");
        content = content.replace(/\s*>\s*</g, "><");
        return content.trim();
      };

      switch (tag) {
        case "h1":
          return `# ${inner()}\n\n`;
        case "h2":
          return `## ${inner()}\n\n`;
        case "h3":
          return `### ${inner()}\n\n`;
        case "h4":
          return `#### ${inner()}\n\n`;
        case "strong":
        case "b":
          return `**${inner()}**`;
        case "em":
        case "i":
          return `*${inner()}*`;
        case "code":
          return node.closest("pre") ? inner() : `\`${inner()}\``;
        case "pre":
          return `\`\`\`\n${inner().trim()}\n\`\`\`\n\n`;
        case "blockquote":
          return (
            inner()
              .split("\n")
              .map((l) => `> ${l}`)
              .join("\n") + "\n\n"
          );
        case "a":
          return `[${inner()}](${node.href || ""})`;
        case "li":
          return `- ${inner().trim()}\n`;
        case "ul":
        case "ol":
          return inner() + "\n";
        case "br":
          return "\n";
        case "p": {
          // noprint p was written as -[text]- or -[cls:text]- — restore on round-trip.
          if (node.classList.contains("noprint")) {
            const extras = Array.from(node.classList).filter((c) => c !== "noprint");
            const prefix = extras.length ? `${extras[0]}:` : "";
            return `-[${prefix}${inner()}]-\n\n`;
          }
          return `${inner().trim()}\n\n`;
        }
        case "div":
          return inner() + "\n\n";
        case "hr":
          return `---\n\n`;
        default:
          return inner();
      }
    }

    let md = Array.from(tmp.childNodes)
      .map(nodeToMd)
      .join("\n\n")
      .replace(/\n{4,}/g, "\n\n")
      .trim();
    md = md.replace(/^\s*-\s*$/gm, "");
    md = md.replace(/\n\s*\n\s*-\s/g, "\n- ");
    return md;
  }

  static insertAtCursor(el, text) {
    el.focus();
    const sel = window.getSelection();
    if (!sel || !sel.rangeCount) return;
    const range = sel.getRangeAt(0);
    const node = document.createTextNode(text);
    range.insertNode(node);
    range.setStartAfter(node);
    range.collapse(true);
    sel.removeAllRanges();
    sel.addRange(range);
  }

  static wrapSelection(el, before, after, placeholder = "text") {
    el.focus();
    const sel = window.getSelection();
    if (!sel || !sel.rangeCount) return;
    const range = sel.getRangeAt(0);
    const selected = range.toString();
    const node = document.createTextNode(
      before + (selected || placeholder) + after
    );
    range.deleteContents();
    range.insertNode(node);
    range.setStartAfter(node);
    range.collapse(true);
    sel.removeAllRanges();
    sel.addRange(range);
  }

  static applyTheme(theme) {
    if (theme === "system" || !theme) {
      theme = window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light";
    }
    document.documentElement.setAttribute("data-theme", theme);
    const btn = document.getElementById("theme-toggle");
    if (btn) {
      let i = btn.querySelector("i[data-icon]");
      if (i) {
        i.setAttribute("data-icon", theme === "dark" ? "moon" : "sun");
        icx.delayreplace("#theme-toggle [data-icon]");
      } else {
        btn.textContent = "";
        const newI = document.createElement("i");
        newI.setAttribute("data-icon", theme === "dark" ? "moon" : "sun");
        btn.appendChild(newI);
        icx.delayreplace("#theme-toggle [data-icon]");
      }
    }
  }

  static savedTheme() {
    return (
      localStorage.getItem("theme") ||
      (window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light")
    );
  }
}