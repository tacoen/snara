# Project Structure

**Last scanned:** April 10, 2026

```
snara/
├── .gitignore
├── .htaccess                  # Apache clean URLs & security
├── api.php                    # REST API entry point
├── CHANGELOG.md
├── index.php                  # Main application entry point
├── marked.min.js              # Markdown processor (newly added)
├── README.md
├── spa.html                   # Standalone SPA entry point
├── style.css                  # Main stylesheet (@import for css/ modules)
├── STRUCTURE.md               # This file
│
├── css/                       # CSS modules
│   ├── baru.css
│   ├── buttons.css
│   ├── editor.css
│   ├── files.css
│   ├── gallery.css
│   ├── index.css
│   ├── layout.css
│   ├── modal.css
│   ├── norm.css
│   ├── popup.css
│   ├── pref.css
│   ├── settings-tabs.css
│   ├── snara.css
│   ├── toc.css
│   └── vars.css
│
├── js/                        # Frontend JavaScript
│   ├── export.js
│   ├── helpers.js
│   ├── snara.js               # Main bootstrap
│   ├── tools.js
│   ├── icons/
│   │   ├── ge-icon.js
│   │   └── icons.js
│   └── snara/                 # Core ES modules (note: some duplication during refactor)
│       ├── component.js
│       ├── core.js
│       ├── files.js
│       ├── gallery.js
│       ├── index.js
│       ├── modal.js
│       ├── pref.js
│       ├── router.js
│       ├── settings.js
│       ├── struct.js
│       ├── tool.js
│       ├── ui.js
│       ├── export.js
│       ├── helpers.js
│       ├── snara.js
│       └── tools.js
│
├── json/                      # Configuration templates (some committed)
│   ├── config.json
│   ├── def-config.json
│   └── default.json
│
├── partials/                  # HTML fragments
│   ├── editor-side.html
│   ├── editor.html
│   ├── files.html
│   ├── header.html
│   ├── kanban.html
│   ├── meta.html
│   ├── nav.html
│   ├── popup.html
│   ├── pref.html
│   └── settings.html
│
├── php/                       # Backend modules
│   ├── book.php
│   ├── cache.php
│   ├── config.php
│   ├── document.php
│   ├── editor-pref.php
│   ├── gallery.php
│   ├── import.php
│   ├── pref.php
│   ├── router.php
│   └── state.php
│
└── data/              # Runtime data (gitignored – auto-created at first run)
└── {book-slug}/
    ├── *.json             # Documents
    ├── conf/act.json      # Structure index
    ├── import/            # Import staging
    ├── image/             # Uploaded media
    └── cache/             # Caches
```
