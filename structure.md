# Snara — Project Structure

```
snara/
├── index.html
├── style.css
│
├── css/
│   ├── vars.css
│   ├── norm.css
│   └── snara.css
│
├── js/
│   ├── snara.js
│   └── snara/
│       ├── tool.js
│       ├── core.js
│       └── ui.js
│
├── json/
│   └── config.json
│
├── data/
│   └── {filename}.json
│
└── php/
    ├── api.php
    └── lib/
```

---

## `index.html`

Entry point. Contains all markup — `<header>`, `<article>`, `.editor-area`, and the popup toolbar. Links `style.css` and loads `js/snara.js` as an ES module.

```html
<link rel="stylesheet" href="style.css">
<script src="https://cdnjs.cloudflare.com/ajax/libs/marked/9.1.6/marked.min.js"></script>
<script type="module" src="js/snara.js"></script>
```

---

## CSS

### `style.css`

Import-only entry point. No rules — just pulls in the three partials in order.

```css
@import url('./css/vars.css');
@import url('./css/norm.css');
@import url('./css/snara.css');
```

### `css/vars.css`

Design tokens and theme variables. The only file to edit when customizing colors, spacing, or adding a new theme.

| Group | Tokens |
|---|---|
| Spacing | `--s-xs` `--s-sm` `--s-md` `--s-lg` `--s-xl` |
| Type scale | `--f-xs` `--f-sm` `--f-md` |
| Light theme | `--bg-main` `--bg-alt` `--bg-hover` `--fg-main` `--fg-muted` `--fg-link` `--border` `--primary` `--danger` `--overlay` `--selection` `--sel-border` |
| Dark theme | same tokens, overridden under `html[theme="dark"]` |
| Tag accents | `--tag-{draft|beat|chapter|act}-{bg|fg|bd}` |

### `css/norm.css`

Reset and base element styles. Box-sizing, margin/padding zero, and `html`/`body` font and color defaults. Consumes tokens from `vars.css`.

### `css/snara.css`

All app-specific component styles. Organized top-to-bottom in layout order:

| Section | Selectors |
|---|---|
| App shell | `#app` |
| Header | `header` `.filename` `#filename` |
| Theme toggle | `#theme-toggle` |
| Tab menu | `.tabmenu` `.tabmenu li` |
| Article | `#article` |
| Entries | `.entries` `.entries:empty` |
| Entry | `.entry` `.label-tag` + markdown content rules |
| Meta panel | `.meta` `.meta-field` `.field-key` `.field-sep` `.field-val` `.field-remove` `.add-field-btn` |
| Editor area | `.editor-area` `.toolbar-row` `.tb-btn` `.tb-sep` `.hint` `#editor` |
| Submit row | `.submit-row` `.tag-pills` `.tag-pill` `.submit-btn` |
| Popup toolbar | `.popup-toolbar` `.pop-pill` `.pop-sep` `.pop-remove` |

---

## JavaScript

### `js/snara.js`

ES module entry point. Imports the three classes, instantiates them, and assigns methods to `window.*` so HTML `onclick` attributes work across the module boundary.

```
imports → SnaraTool, SnaraEditor, SnaraUI
instantiates → editor, ui
exposes → window.submitEntry, setTag, fmt, wrapMd, wrapInline,
           setEntryClass, removeEntry, addField, removeField, toggleTheme
```

> **Note:** requires a local server (`npx serve .`) — ES module imports are blocked on `file://`.

### `js/snara/tool.js` → `SnaraTool`

Pure static helper class. No DOM state, no side effects. Safe to import anywhere.

| Method | Description |
|---|---|
| `htmlToMd(html)` | Converts rendered entry HTML back to Markdown string |
| `insertAtCursor(el, text)` | Inserts text at current caret position in a contenteditable |
| `wrapSelection(el, before, after, placeholder)` | Wraps selected text (or placeholder) with markdown syntax |
| `syncLabelTag(div)` | Removes and re-attaches the `.label-tag` badge on an entry after re-render |
| `applyTheme(theme)` | Sets `html[theme]` attribute and updates the toggle button icon |
| `savedTheme()` | Returns saved theme from `localStorage`, falls back to `prefers-color-scheme` |

### `js/snara/core.js` → `SnaraEditor`

Manages the write area, entry lifecycle, and toolbar actions. Depends on `SnaraTool` and `SnaraUI`.

| Member | Description |
|---|---|
| `static TAGS` | `['draft', 'beat', 'chapter', 'act']` — shared tag list |
| `setTag(tag)` | Toggles active tag pill in the submit row |
| `submit()` | Parses editor markdown, creates a `.entry` div, appends to `.entries` |
| `fmt(cmd)` | Runs `document.execCommand` on the editor (bold, italic) |
| `wrapMd(prefix)` | Inserts a markdown prefix at cursor (headings, list, blockquote) |
| `wrapInline(before, after)` | Wraps selection with inline syntax (e.g. backticks) |
| `_bindEntryEvents(div)` | Attaches focus/blur/keydown to a posted entry for edit-in-place |
| `_commitEntry(div)` | `Ctrl+Enter` — re-renders entry markdown → HTML |
| `_cancelEntry(div)` | `Escape` — restores previous render, discards edits |

### `js/snara/ui.js` → `SnaraUI`

Manages tabs, popup toolbar, meta fields, and theme. Sets `SnaraUI.instance` on construction so `SnaraEditor` can reach it without circular imports.

| Member | Description |
|---|---|
| `static instance` | Singleton reference, set in constructor |
| `switchTab(tab)` | Shows/hides `.entries`, `.meta`, `.editor-area` based on active tab |
| `focusEntry(div)` | Positions and shows the popup toolbar above the focused entry |
| `scheduleHidePopup()` | Hides popup after 180ms delay unless cursor is over it |
| `setEntryClass(cls)` | Toggles a tag class on the focused entry, syncs label badge |
| `removeEntry()` | Removes the focused entry from the DOM |
| `addField()` | Appends a new editable key:value row to `.meta-fields` |
| `removeField(btn)` | Removes the row containing the clicked remove button |
| `toggleTheme()` | Flips theme between light/dark, persists to `localStorage` |

---

---

## `json/`

Stores webapp configuration as JSON. Read by the frontend on load and written back via the PHP API.

| File | Description |
|---|---|
| `config.json` | App-wide settings — theme preference, default tag, autosave interval, any user-defined meta field presets |

### `config.json` shape

```json
{
  "theme": "light",
  "defaultTag": null,
  "autosave": true,
  "autosaveInterval": 30,
  "metaFields": ["characters", "settings", "prompts"]
}
```

---

## `data/`

Where the editor saves documents. Each file maps to one editor session — entries, meta fields, and filename — serialized as JSON.

| File | Description |
|---|---|
| `{filename}.json` | One file per document, named after `#filename` value |

### Document shape

```json
{
  "filename": "chapter-one",
  "meta": {
    "characters": "...",
    "settings": "...",
    "prompts": "..."
  },
  "entries": [
    { "tag": "beat", "md": "It was a dark and stormy night." },
    { "tag": "chapter", "md": "## Act One\n\nThe story begins..." }
  ]
}
```

---

## `php/`

Backend API and its supporting libraries. Handles reading and writing `json/` and `data/` files so the frontend never touches the filesystem directly.

| Path | Description |
|---|---|
| `api.php` | Single-entry REST-style endpoint — routes by `?action=` query param |
| `lib/` | Helper classes loaded by `api.php` |

### `api.php` actions

| `?action=` | Method | Description |
|---|---|---|
| `config.get` | GET | Returns `json/config.json` |
| `config.set` | POST | Writes `json/config.json` |
| `doc.list` | GET | Returns list of filenames in `data/` |
| `doc.get` | GET | Returns a single `data/{filename}.json` |
| `doc.save` | POST | Writes or overwrites `data/{filename}.json` |
| `doc.delete` | DELETE | Removes `data/{filename}.json` |

### `lib/` layout

```
php/lib/
├── Config.php    — read/write json/config.json
├── Document.php  — read/write/list/delete data/*.json
└── Router.php    — parses ?action= and dispatches to the right class
```

---

## Dependency graph

```
snara.js
├── snara/tool.js      (no deps)
├── snara/core.js  ←── tool.js
└── snara/ui.js    ←── tool.js, core.js
```

## HTML structure

```
<header>
  .filename > #filename
  .tabmenu > li[data-tab="editor"] li[data-tab="meta"]
  #theme-toggle

<article#article>
  .entries
    .entry[class="entry draft|beat|chapter|act"]
      .label-tag
  .meta[hidden]
    .meta-fields
      .meta-field > .field-key .field-sep .field-val .field-remove
    .add-field-btn

<div.editor-area>
  .toolbar-row > .tb-btn .tb-sep .hint
  #editor[contenteditable]
  .submit-row > .tag-pills .submit-btn

<div.popup-toolbar#popup>
  .pop-pill[class="draft|beat|chapter|act"]
  .pop-sep
  .pop-pill.pop-remove
```