# Changelog

All notable changes to **Snara** will be documented in this file.

This project follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html) and the changelog format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

---

## [Unreleased]

### Added
- **Files Workspace** — four-section file manager replacing the old single-tab Files view:
  - **Import** section — drag-and-drop upload for `.txt` / `.md` files, inline preview modal with parsed structure, per-file delete with confirmation bar
  - **Export** section — chapter checklist grouped by act, select-all toggle, export as Markdown (`.md`) or HTML (`.html`); PDF and EPUB planned
  - **Gallery** section — 4-column masonry media grid for images and videos per book; hover-to-play on video cards; rename with meta-driven autocomplete; delete with confirmation
  - **Cache** section — system cache management stub
- **SnaraExport** (`js/export.js`) — standalone export module with act-grouped chapter selection, Markdown and HTML export with clean print-ready template
- **SnaraGallery** (`js/snara/gallery.js`) — media management module with upload, rename, delete, and autocomplete from document metadata
- **Multi-area navigation** via `switchArea()` — Editor, Meta, Files, and Kanban areas with sidebar nav button active states and `aside` TOC visibility sync
- **Kanban** area scaffold (`partials/kanban.html`, `kanban-area` in layout) — placeholder for upcoming kanban feature
- **`SnaraPref`** — live CSS variable editor in the Preferences panel covering root, light, dark, and per-tag (beat/scene/chapter/act) token groups
- **`default.get` / `default.set`** API actions for persisting editor defaults (`defaultTag`, `autosave`, `autosaveInterval`, `metaFields`, `act`)
- **Import preview modal** — parses staged files through `SnaraStruct.split()` before committing
- **`bookchange` event** — broadcast on active book switch so all file sections reload automatically
- **Gallery and import API endpoints**: `gallery.list`, `import.read`, `import.delete`

### Changed
- Navigation restructured: nav buttons now use `data-area` attributes and drive `switchArea()` instead of legacy `switchTab()`
- `SnaraFiles` expanded into a full tabbed workspace with `switchSection()`, section-specific top-bar actions, and dropzone wiring for both import and gallery
- `SnaraUI.switchTab()` wrapped to stay in sync with `switchArea()` for backwards compatibility
- `AppConfig` and `AppDefaults` now loaded in parallel at boot via `Promise.all`
- Icon replacement (`icx.replace` / `icx.delayreplace`) applied consistently across all dynamic panels and modals

### Fixed
- Gallery and import panels now correctly reload on book change via the `bookchange` event
- Export footer icons replaced after dynamic render
- File upload inputs cleared after selection to allow re-uploading the same file

---

## [0.2.0] - 2026-04-05

### Added
- Automatic Table of Contents feature
- Core Preferences / Settings panel
- Experimental SPA mode entry point (`spa.html`)
- `.htaccess` for cleaner URLs

### Changed
- Backend files reorganized into dedicated `/php/` folder
- Frontend JavaScript improved for better modularity

---

## [0.1.0] - 2026-04-04

### Added
- Initial public release
- Structured Markdown editor with hierarchical structure: **Acts → Chapters → Scenes → Beats**
- Full Document & Book management (CRUD operations, indexing, active book switching)
- Live Markdown preview and formatting tools (powered by marked.js)
- Autosave functionality
- Light / Dark theme support
- Keyboard shortcuts (`Ctrl/Cmd + S`, editor shortcuts)
- Complete REST API backend (`api.php`)
- Flat-file storage system (`/data/` for documents, `/json/` for config & indexes)
- Basic configuration system via `json/config.json`

---

## [0.0.1] - 2026-04-03

### Added
- Project foundation (PHP 7.4+ + Vanilla JavaScript)
- Basic file-based data layer
- Early UI scaffolding and editor prototype

---

**Snara is in active early development.**  
New features and improvements are being added frequently.  
Check back often or watch the repository for updates!