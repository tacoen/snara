/* ─────────────────────────────────────────────────
   snara-tool.js — SnaraTool static helper utilities
───────────────────────────────────────────────── */
export class SnaraTool {

  // Convert HTML string → Markdown string (fixed line breaks + better block handling)
  static htmlToMd(html) {
    const tmp = document.createElement('div');
    tmp.innerHTML = html;
    tmp.querySelectorAll('.label-tag').forEach(el => el.remove());

    function nodeToMd(node) {
      if (node.nodeType === Node.TEXT_NODE) return node.textContent.trim();
      if (node.nodeType !== Node.ELEMENT_NODE) return '';

      const tag = node.tagName?.toLowerCase();
//       const inner = () => Array.from(node.childNodes).map(nodeToMd).join('');

	  const inner = () => {
        let content = Array.from(node.childNodes).map(nodeToMd).join('');
        // Remove excessive whitespace between tags
        content = content.replace(/\s*>\s*</g, '><');
        return content.trim();
      };

      switch (tag) {
        case 'h1':         return `# ${inner()}\n\n`;
        case 'h2':         return `## ${inner()}\n\n`;
        case 'h3':         return `### ${inner()}\n\n`;
        case 'strong':
        case 'b':          return `**${inner()}**`;
        case 'em':
        case 'i':          return `*${inner()}*`;
        case 'code':       return node.closest('pre') ? inner() : `\`${inner()}\``;
        case 'pre':        return `\`\`\`\n${inner().trim()}\n\`\`\`\n\n`;
        case 'blockquote': return inner().split('\n').map(l => `> ${l}`).join('\n') + '\n\n';
        case 'a':          return `[${inner()}](${node.href || ''})`;
        case 'li':         return `- ${inner().trim()}\n`;
        case 'ul':
        case 'ol':         return inner() + '\n';
        case 'br':         return '\n';
        case 'p':          return `${inner().trim()}\n\n`;
        case 'div':        return inner() + '\n\n';
		case 'hr':         return `---\n\n`;		
        default:           return inner();
      }
    }

    let md = Array.from(tmp.childNodes)
      .map(nodeToMd)
      .join('\n\n')           // ← fixed line breaks between blocks
      .replace(/\n{4,}/g, '\n\n')
      .trim();

    md = md.replace(/^\s*-\s*$/gm, '');
    md = md.replace(/\n\s*\n\s*-\s/g, '\n- ');

    return md;
  }

  // Insert text at current cursor position in a contenteditable
  static insertAtCursor(el, text) {
    el.focus();
    const sel = window.getSelection();
    if (!sel || !sel.rangeCount) return;
    const range = sel.getRangeAt(0);
    const node  = document.createTextNode(text);
    range.insertNode(node);
    range.setStartAfter(node);
    range.collapse(true);
    sel.removeAllRanges();
    sel.addRange(range);
  }

  // Wrap selection (or placeholder) with before/after strings
  static wrapSelection(el, before, after, placeholder = 'text') {
    el.focus();
    const sel = window.getSelection();
    if (!sel || !sel.rangeCount) return;
    const range    = sel.getRangeAt(0);
    const selected = range.toString();
    const node     = document.createTextNode(before + (selected || placeholder) + after);
    range.deleteContents();
    range.insertNode(node);
    range.setStartAfter(node);
    range.collapse(true);
    sel.removeAllRanges();
    sel.addRange(range);
  }

  // Apply a theme attribute on <html> and update the toggle button
  static applyTheme(theme) {
    document.documentElement.setAttribute('theme', theme);
    const btn = document.getElementById('theme-toggle');
    if (btn) {
      let i = btn.querySelector('i[data-icon]');
      if (!i) { i = btn.querySelector('i') || btn; }
      i.setAttribute('data-icon', theme === 'dark' ? 'moon' : 'sun');
    }
	//console.log(btn);
  }

  // Read saved theme or fall back to system preference
  static savedTheme() {
    return localStorage.getItem('theme')
      || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  }
}