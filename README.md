# Snara

**A lightweight, self-hosted structured writing tool for storytellers.**

Snara is a minimalist web-based editor designed for long-form narrative writing (novels, screenplays, or any story-driven project). It lets you organize your work with a clear hierarchical structure: **Acts → Chapters → Scenes → Beats**.

Built with a clean Markdown editor, it combines distraction-free writing, automatic section tagging, document management, media management, and book-level organization — all in a simple PHP + Vanilla JS stack. No databases, no heavy frameworks, just flat files and instant feedback.

---

## ✨ Features

- **Structured Markdown Editor**  
  Automatic classification using headings (`# Act`, `## Chapter`, `### Scene`, `#### Beat`).

- **Auto Table of Contents (Auto TOC)**  
  Dynamically generated from your document structure (Act → Chapter → Scene → Beat), with anchor links and live DOM observation.

- **Document & Book Management**  
  Full CRUD for documents + support for multiple books, active book switching, and chapter indexing.

- **Metadata Fields**  
  Track characters, settings, prompts, and any custom fields per document.

- **Live Formatting Tools**  
  Markdown helpers, inline wrapping, and preview powered by [marked.js](https://github.com/markedjs/marked).

- **Autosave**  
  Configurable automatic saving (default: every 30 seconds).

- **Preferences / Settings Panel**  
  Full in-app configuration with live CSS variable editing, theme customization, heading map rules, and editor defaults.

- **Multi-area Navigation**  
  Switch between Editor, Meta, Files, and Kanban areas via the sidebar nav.

- **Files Workspace**  
  Four-section file manager covering:
  - **Import** — stage `.txt` / `.md` files with drag-and-drop upload and inline preview
  - **Export** — select chapters by act, export as Markdown or HTML (PDF and EPUB coming soon)
  - **Gallery** — masonry-style media grid for images and videos, with upload, rename (with autocomplete from meta), and delete
  - **Cache** — system cache management

- **Export**  
  Export selected chapters as `.md` (Markdown) or `.html` with a clean, print-ready template. Acts group chapters for easy selection.

- **Gallery**  
  Upload and manage images and videos per book. Video cards support hover-to-play preview.

- **Themes & CSS Variables**  
  Light/dark mode support plus full in-app CSS variable editor (colors, borders, tag styles) via the Preferences panel.

- **Keyboard Shortcuts**  
  `Ctrl/Cmd + S` to save, plus editor-specific shortcuts.

- **REST API**  
  Clean, extensible backend for all operations.

- **Self-hosted & Portable**  
  Runs on any PHP server; data stored as simple flat files.

---

## Tech Stack

- **Backend**: PHP 7.4+ (flat-file storage)
- **Frontend**: HTML5 + CSS3 + Vanilla ES6+ JavaScript (ES modules)
- **Markdown Rendering**: [marked.js](https://github.com/markedjs/marked)
- **Storage**: Markdown/JSON files under `/data/` and `/json/`

---

## Quick Start

1. **Clone the repo**
   ```bash
   git clone https://github.com/tacoen/snara.git
   cd snara
   ```

2. **Set permissions**  
   Your web server needs write access to:
   - `/data/` — stores your writing documents and media
   - `/json/` — stores configuration and indexes

3. **Run the app**
   - **Quick test**: `php -S localhost:8000`
   - **Production**: Point Apache/Nginx to the project root (`.htaccess` included for clean URLs).

4. Open `http://localhost:8000` (or `spa.html` for the experimental SPA mode) in your browser.

The app will auto-create missing directories and use sensible defaults.

---

## Project Structure

See [structure.md](structure.md) for the detailed project directory layout.

```
snara/
├── .htaccess              # Apache clean URL rules
├── api.php                # Single REST API endpoint
├── index.php              # Main application page
├── spa.html               # Experimental pure-SPA entry point
├── style.css              # Global styles
├── css/                   # Additional styles
├── data/                  # Your documents and media (auto-created)
├── json/                  # config.json + indexes (auto-created)
├── js/                    # Frontend entry point + modular components
│   ├── snara.js           # Boot, AppConfig, AppDefaults
│   ├── export.js          # SnaraExport — chapter export panel
│   ├── tools.js           # SnaraTools — TOC and utilities
│   └── snara/
│       ├── core.js        # SnaraEditor
│       ├── ui.js          # SnaraUI — tabs, save/load
│       ├── files.js       # SnaraFiles — import/export/gallery/cache
│       ├── gallery.js     # SnaraGallery — media grid
│       ├── settings.js    # SnaraSettings — in-app config panel
│       ├── pref.js        # SnaraPref — CSS variable editor
│       ├── index.js       # SnaraIndex — book/document index
│       ├── struct.js      # SnaraStruct — heading classification
│       └── tool.js        # SnaraTool — static helpers, htmlToMd
├── partials/              # Reusable HTML fragments (nav, files, kanban…)
└── php/                   # Backend logic
    ├── book.php
    ├── config.php
    ├── document.php
    └── router.php
```

---

## Configuration

All settings live in `json/config.json` (created automatically on first run).  
You can also edit them via the in-app **Settings** or **Preferences** panel.

Key defaults:

| Setting | Default |
|---|---|
| Story structure | `act`, `chapter`, `scene`, `beat` |
| Metadata fields | `characters`, `settings`, `prompts` |
| Autosave interval | 30 seconds |
| Default tag | `beat` |
| Theme | `light` |

---

## API

Snara uses a simple query-param-based REST API at `api.php`:

| Action | Method | Description |
|---|---|---|
| `config.get` / `config.set` | GET/POST | Read or update app settings |
| `default.get` / `default.set` | GET/POST | Read or update editor defaults |
| `doc.list` | GET | List documents (optional book filter) |
| `doc.get` | GET | Load a document |
| `doc.save` | POST | Save document content |
| `doc.delete` | DELETE | Delete a document |
| `book.index` | GET | List all books |
| `book.create` | POST | Create a new book |
| `book.chapters` | GET | Get chapters for a book |
| `book.setActive` | POST | Switch active book |
| `import.read` | GET | Preview a staged import file |
| `import.delete` | DELETE | Remove a staged import file |
| `gallery.list` | GET | List media files for a book |

Full routing logic is in `php/router.php`.

---

## Changelog

See [CHANGELOG.md](CHANGELOG.md) for detailed version history.

---

## License

This project is open source. Feel free to use, modify, and adapt it for personal or commercial projects.

---

Made with ❤️ for writers who love structure without the bloat.

**Questions or ideas?** Open an issue or pull request!