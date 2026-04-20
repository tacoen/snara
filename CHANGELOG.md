# Changelog

All notable changes to **Snara** will be documented in this file.

This project follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html) and the changelog format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) .

---

## [Unreleased]

### ✨ duka & derita Updates (April 2026)

These recent update series focus on major UI/UX polishing, refactoring, and stability improvements:

- **derita series** ("derita", "derita 2", "derita kanban"):
  - Significant UI/UX refinements and visual polishing across the entire interface
  - Major improvements to **Kanban Board** (now fully working with smooth drag & drop, better integration with story structure, and real-time sync)
  - Enhanced CSS and component consistency
  - Refinements to navigation, modals, and overall responsiveness
  - Kanban area is now production-ready for visual story planning

- **duka series** ("duka 2", "duka 3 - refactor"):
  - Backend and configuration refinements
  - JSON structure improvements and cleanup
  - Refactoring of core files (including `.htaccess`)
  - **Renamed `index.php` → `develope.php`** — this is now the **main entry point** of the application
  - Stability and performance tweaks

### What is develope.php?

`develope.php` is the **primary PHP file** that serves the full Snara web application.  
It handles the initial request, loads the necessary frontend (HTML, CSS, JS), and acts as the central hub for the editor, Kanban Board, Files Workspace, AI tools, and other areas.

**Important behavior**:  
When you access `develope.php`, it will **automatically generate a new `index.html`** (compressed/minified version) as your clean entry point.  
This design prevents accidental changes to the main structure files and keeps the application stable during development and updates.

- For quick testing: Run `php -S localhost:8000` and open `http://localhost:8000`  
- For production: Use Apache with the included `.htaccess` (it routes everything to `develope.php`)

This rename and auto-generation system was introduced during the duka refactor to improve maintainability.

### Added

- AI Toolbar (SnaraAIToolbar) with contextual quick actions powered by `json/preprompts.json`
- Full AI Chatbot panel with dedicated UI and backend integration
- `json/preprompts.json` and `json/ai.example.json` for easy AI configuration
- **CSS 2.0** modular redesign (base.css, components.css, layout.css, pages.css, utils.css, mycss.css)
- Full **Files Workspace** powered by **fileman.js** (Import, Export, Media Gallery, Cache management)
- Multi-area navigation system (Editor, Meta, Files, Kanban)
- Live CSS variable editor in Preferences
- Import preview modal with structure parsing

### Changed

- Major navigation refactor using data-area attributes
- Significant CSS modernization and component consistency
- Expanded SnaraFiles into a full tabbed workspace
- Updated AI backend (`php/ai.php`) for better Groq support
- Renamed main entry file from `index.php` to `develope.php`

### Fixed

- Gallery and Import panels now reload correctly on book change
- Export footer icons and file upload handling
- Various stability improvements in modals and dynamic panels

---

## [0.2.0] - 2026-04-05

### Added

- Automatic Table of Contents
- Core Preferences / Settings panel
- Experimental SPA mode (`spa.html`)
- `.htaccess` for cleaner URLs

### Changed

- Backend files reorganized into `/php/` folder
- Improved frontend JavaScript modularity

---

## [0.1.0] - 2026-04-04

### Added

- Initial public release
- Structured Markdown editor with Acts → Chapters → Scenes → Beats hierarchy
- Document & Book management
- Live Markdown preview (marked.js)
- Autosave, themes, keyboard shortcuts
- REST API backend + flat-file storage

---

## [0.0.1] - 2026-04-03

### Added

- Project foundation (PHP 7.4+ + Vanilla JS)
- Basic file-based data layer
- Early UI and editor prototype

---

**Snara is in active early development.**

New features and improvements are being added frequently.  
Watch the repository for updates!
