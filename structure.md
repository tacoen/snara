# Snara — Project Structure

```
snara/
├── index.html              # App shell, HTML layout, inline globals
├── api.php                 # Single-entry REST endpoint (delegates to router)
├── style.css               # Master CSS (imports css/*.css)
│
├── css/
│   ├── vars.css            # CSS custom properties (light + dark theme tokens)
│   ├── norm.css            # CSS reset / base typography
│   ├── snara.css           # App shell & component styles (nav, header, editor, modal, etc.)
│   ├── snara2.css          # Alternate/legacy component styles (partial overlap with snara.css)
│   └── index.css           # Book index & chapter index modal styles
│
├── js/
│   ├── snara.js            # ES module entry point — boot(), AppConfig, global window bindings
│   │
│   └── snara/
│       ├── core.js         # SnaraEditor — write area, entry submit, toolbar actions
│       ├── ui.js           # SnaraUI — tabs, popup toolbar, meta fields, theme toggle, save/load
│       ├── tool.js         # SnaraTool — static helpers (htmlToMd, insertAtCursor, theme utils)
│       ├── struct.js       # SnaraStruct — hierarchy classifier, heading map, entry splitter
│       ├── settings.js     # SnaraSettings — settings modal, config read/write
│       └── index.js        # SnaraIndex — book index modal, chapter index modal
│
└── php/
    ├── router.php          # Router::dispatch() — parses ?action= and routes to handlers
    ├── config.php          # Config — reads/writes json/config.json, resolves all paths
    ├── document.php        # Document — CRUD for data/*.json (or data/$bookId/*.json)
    └── book.php            # Book — bookindex.json management, chapter listing
```

---

## Data Layout

```
data/
├── bookindex.json          # [{id, title}] — master list of books
├── 1/                      # Book ID 1
│   ├── chapter-one.json
│   └── chapter-two.json
└── 2/                      # Book ID 2
    └── …

json/
└── config.json             # App configuration (the ONE hardcoded path in Config.php)
```

---

## Module Responsibilities

| File | Class | Role |
|---|---|---|
| `js/snara.js` | — | Boot, `AppConfig`, wires all globals |
| `js/snara/core.js` | `SnaraEditor` | Write area, entry submit/edit/commit |
| `js/snara/ui.js` | `SnaraUI` | Tabs, popup toolbar, save/load document |
| `js/snara/tool.js` | `SnaraTool` | `htmlToMd`, cursor helpers, theme |
| `js/snara/struct.js` | `SnaraStruct` | Hierarchy detection, entry splitting |
| `js/snara/settings.js` | `SnaraSettings` | Settings modal, config persistence |
| `js/snara/index.js` | `SnaraIndex` | Book & chapter index modals |
| `php/router.php` | `Router` | REST dispatch by `?action=` |
| `php/config.php` | `Config` | Config file read/write, path resolution |
| `php/document.php` | `Document` | JSON document CRUD |
| `php/book.php` | `Book` | Book index + chapter listing |

---

## API Actions

| Method | Action | Description |
|---|---|---|
| GET | `config.get` | Load config.json |
| POST | `config.set` | Write config.json |
| GET | `doc.list` | List documents (optional `?bookId=`) |
| GET | `doc.get&filename=` | Load a document |
| POST | `doc.save` | Save a document |
| DELETE | `doc.delete&filename=` | Delete a document |
| GET | `book.index` | List all books with chapter count |
| GET | `book.chapters&id=` | List chapters for a book |
| POST | `book.create` | Create a new book |
| POST | `book.setActive` | Persist active book to config |

---

## Entry Class Hierarchy

Largest → smallest structural unit:

| Class | Heading prefix | Left border indent |
|---|---|---|
| `act` | `# ` | 1× |
| `chapter` | `## ` | 2× |
| `scene` | `### ` | 3× |
| `beat` | `#### ` (or default) | 4× |

Both `classes` and `headingMap` are configurable via `config.json` and the Settings modal.

---

## Boot Sequence

1. `api.php?action=config.get` — fetch server config
2. `SnaraStruct.configure(AppConfig)` — apply heading map + classes
3. `SnaraTool.applyTheme(...)` — apply saved/system theme
4. Instantiate: `SnaraEditor` → `SnaraUI` → `SnaraSettings` → `SnaraIndex`
5. `icx.replace()` — render icon sprites
6. Register all `window.*` globals used by inline HTML handlers
