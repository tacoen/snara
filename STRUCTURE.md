# Project Structure

```
snara/
├── .htaccess                  # Apache clean URL rules
├── api.php                    # Single REST API endpoint
├── index.php                  # Main application page
├── spa.html                   # Experimental pure-SPA entry point
├── style.css                  # Global styles (imports from css/)
├── structure.md               # This file
│
├── css/                       # Stylesheets (loaded via @import in style.css)
│   ├── vars.css               # CSS custom properties (design tokens)
│   ├── norm.css               # Reset / normalize
│   ├── buttons.css            # Button variants
│   ├── layout.css             # App shell & grid
│   ├── snara.css              # Core editor styles
│   ├── popup.css              # Popup / tooltip styles
│   ├── editor.css             # Entry & contenteditable styles
│   ├── index.css              # Book/document index panel
│   ├── toc.css                # Auto TOC sidebar
│   ├── modal.css              # Modal overlay styles
│   ├── pref.css               # Preferences / CSS variable editor
│   ├── files.css              # Files workspace (import/export/cache)
│   ├── gallery.css            # Gallery media grid
│   └── baru.css               # Additional layout overrides
│
├── data/                      # Book documents & media (auto-created)
│   └── {bookId}/
│       ├── *.json             # Document files
│       ├── conf/
│       │   └── act.json       # Act grouping index
│       ├── import/            # Staged import files
│       ├── image/             # Gallery media files
│       └── cache/             # Cached chapter data
│
├── json/                      # App config & indexes (auto-created)
│   ├── config.json            # Main app configuration
│   └── default.json           # Editor defaults
│
├── js/                        # Frontend JavaScript (ES modules)
│   ├── snara.js               # Entry point — boot, AppConfig, AppDefaults
│   ├── export.js              # SnaraExport — chapter export panel
│   ├── tools.js               # SnaraTools — Auto TOC builder & utilities
│   │
│   ├── snara/                 # Core modules
│   │   ├── core.js            # SnaraEditor — entry creation & editing
│   │   ├── ui.js              # SnaraUI — tabs, save, load document
│   │   ├── struct.js          # SnaraStruct — heading classifier & splitter
│   │   ├── tool.js            # SnaraTool — static helpers, htmlToMd, themes
│   │   ├── settings.js        # SnaraSettings — in-app config & heading map editor
│   │   ├── pref.js            # SnaraPref — live CSS variable editor
│   │   ├── index.js           # SnaraIndex — book & document index panel
│   │   ├── files.js           # SnaraFiles — import/export/gallery/cache workspace
│   │   ├── gallery.js         # SnaraGallery — masonry media grid
│   │   └── modal.js           # openModal / closeModal helpers
│   │
│   └── icons/
│       └── ge-icon.js         # Icon replacement utility (icx)
│
├── partials/                  # Reusable HTML fragments (loaded into index.php)
│   ├── nav.html               # Sidebar navigation
│   ├── files.html             # Files workspace shell (import/export/gallery/cache)
│   ├── kanban.html            # Kanban area scaffold (upcoming)
│   └── ...                    # Other partials
│
└── php/                       # Backend logic
    ├── book.php               # Book CRUD operations
    ├── config.php             # Config read/write
    ├── document.php           # Document CRUD + act index
    └── router.php             # Request routing for api.php
```