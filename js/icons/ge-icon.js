import icons from './icons.js';

export class IconManager {

  constructor() {
    this.icons = {
      'blank': `<svg xmlns="http://www.w3.org/2000/svg" class='ge' width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path stroke="none" d="M0 0h24v24H0z" fill="none"/></svg>`
    };
  }

  mergeIcons(newIcons) {
    Object.assign(this.icons, newIcons);
  }

  // ── Render one icon as an HTML string ─────────
  // FIX: guard svgElement null before .outerHTML.
  // If the stored icon string was malformed, firstChild
  // could be null and the call would throw TypeError.

  icon(iconId, classes = '') {
    if (typeof this.icons[iconId] === 'undefined') {
      console.warn('icx - notfound:' + iconId);
      this.icons[iconId] = '<svg xmlns="http://www.w3.org/2000/svg"></svg>';
      classes = 'nan ' + classes;
    }

    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = this.icons[iconId];
    const svgElement = tempDiv.firstChild;

    // FIX: explicit null guard — return safe fallback instead of crashing
    if (!svgElement) return '<svg xmlns="http://www.w3.org/2000/svg"></svg>';

    svgElement.setAttribute('class', classes);
    return svgElement.outerHTML;
  }

  // ── Replace all [data-icon] globally (called once at boot) ──
  // FIX: use replaceWith() NOT element.outerHTML = ...
  // The outerHTML assignment mutates the DOM in a way that can
  // trigger MutationObservers which re-invoke replace() before
  // the forEach loop finishes → stack overflow.
  // replaceWith() is safe during iteration over a static NodeList.

  replace() {
    setTimeout(() => {
      document.querySelectorAll('[data-icon]').forEach(element => {
        const id      = element.dataset.icon;
        const classes = element.className;

        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = this.icon(id, classes);
        const newSvg = tempDiv.firstChild;

        if (!newSvg) return;

        Array.from(element.attributes).forEach(attr => {
          if (attr.name !== 'data-icon') {
            newSvg.setAttribute(attr.name, attr.value);
          }
        });

        element.replaceWith(newSvg);
      });
    }, 3);
  }

  // ── Scoped replacement — use after innerHTML updates ──
  // Same fix: replaceWith() instead of outerHTML mutation.

  delayreplace(selector = '[data-icon]') {
    document.querySelectorAll(selector).forEach(element => {
      const attrName = selector.includes('safe') ? 'safeicon' : 'icon';
      const id       = element.dataset[attrName];
      const classes  = element.className;

      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = this.icon(id, classes);
      const newSvg = tempDiv.firstChild;

      if (!newSvg) return;

      Array.from(element.attributes).forEach(attr => {
        if (attr.name !== `data-${attrName}`) {
          newSvg.setAttribute(attr.name, attr.value);
        }
      });

      element.replaceWith(newSvg);
    });
  }
}

let icx = new IconManager();
icx.mergeIcons(icons);

export default icx;