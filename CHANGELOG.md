# Changelog

All notable changes to **Snara** will be documented in this file.

This project follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html) and the changelog format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

---

## [Unreleased]

### Added
- **AI Toolbar** (`SnaraAIToolbar`) — contextual quick-action toolbar directly in the editor. Powered by `json/preprompts.json` with presets (3-Act Structure, Summarize, Characters, Professional, Unfiltered Dialog). Inserts AI responses as new editable beats.
- Full **AI Chatbot** integration with dedicated panel (`chatbot.html`, `js/snara/chatbot.js`) and Groq support (fast LLM with generous free tier).
- `json/preprompts.json` and `json/ai.example.json` for easy AI configuration.
- **CSS 2.0** redesign — modular CSS (`base.css`, `components.css`, `layout.css`, `pages.css`, `utils.css`, `mycss.css`) with improved theming, toolbars, modals, gallery, and chatbot UI.
- Files Workspace (Import/Export/Gallery/Cache sections) with drag-and-drop, media management, and export tools.
- `SnaraExport` and `SnaraGallery` modules.
- Multi-area navigation (`switchArea()`) — Editor, Meta, Files, Kanban.
- Kanban area scaffold.
- `SnaraPref` live CSS variable editor in Preferences panel.
- Import preview modal with structure parsing.
- `bookchange` event for automatic panel refresh on book switch.
- Gallery and import API endpoints (`gallery.list`, `import.read`, `import.delete`).

### Changed
- Navigation restructured with `data-area` attributes and `switchArea()`.
- Major CSS modernization and component consistency.
- `SnaraFiles` expanded into full tabbed workspace.
- AI backend (`php/ai.php`) updated for Groq + easy provider switching.
- Icon system (`icx.replace`) applied consistently across dynamic UI.

### Fixed
- Gallery/Import panels now reload correctly on book change.
- Export footer icons and file upload clearing.
- Various stability improvements in modals and dynamic panels.

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
