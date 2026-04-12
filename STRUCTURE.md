# Project Structure

**Last scanned:** April 12, 2026

```
snara/
├── .gitignore
├── .htaccess                  # Apache clean URLs & security
├── api.php                    # REST API entry point
├── CHANGELOG.md
├── index.php                  # Main application entry point
├── marked.min.js              # Markdown processor
├── README.md
├── spa.html                   # Standalone SPA entry point
├── STRUCTURE.md               # This file
├── mycss.css                  # User-customizable styles
├── style.css                  # Main stylesheet (imports from css/)
│
├── css/                       # CSS modules (CSS 2.0)
│   ├── base.css
│   ├── components.css
│   ├── layout.css
│   ├── pages.css
│   ├── utils.css
│   └── custome/               # (custom folder — likely for overrides)
│
├── js/                        # Frontend JavaScript
│   ├── export.js
│   ├── helpers.js
│   ├── snara.js               # Main bootstrap
│   ├── tools.js
│   ├── icons/
│   │   ├── ge-icon.js
│   │   └── icons.js
│   └── snara/                 # Core ES modules (some duplication during refactor)
│       ├── chatbot.js
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
├── json/                      # Configuration & templates
│   ├── ai.example.json        # AI provider example
│   ├── ai.json
│   ├── config.json
│   ├── def-config.json
│   ├── default.json
│   └── preprompts.json        # AI quick-action prompts for toolbar
│
├── partials/                  # HTML fragments
│   ├── chatbot.html
│   ├── editor-side.html
│   ├── editor.html
│   ├── files.html
│   ├── header.html
│   ├── kanban.html
│   ├── meta.html
│   ├── nav.html
│   ├── notes.html
│   ├── popup.html
│   ├── pref.html
│   └── settings.html
│
├── php/                       # Backend modules
│   ├── ai.php
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