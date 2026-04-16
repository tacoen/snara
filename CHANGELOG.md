# Changelog

All notable changes to **Snara** will be documented in this file.

This project follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html) and the changelog format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

---

## [Unreleased]

### Added
- AI Toolbar (`SnaraAIToolbar`) with contextual quick actions powered by `json/preprompts.json` (presets: 3-Act Structure, Summarize, Characters, Professional, Unfiltered Dialog, etc.)
- Full AI Chatbot panel with dedicated UI and backend integration
- `json/preprompts.json` and `json/ai.example.json` for easy AI configuration
- **CSS 2.0** modular redesign (`base.css`, `components.css`, `layout.css`, `pages.css`, `utils.css`, `mycss.css`) with improved theming and consistency
- Full **Files Workspace** with Import, Export, Media Gallery, and Cache management
- `SnaraExport` and `SnaraGallery` modules
- Multi-area navigation system (`switchArea()`) — Editor, Meta, Files, Kanban
- Kanban board area (scaffolded)
- Live CSS variable editor in Preferences (`SnaraPref`)
- Import preview modal with structure parsing
- `bookchange` event for automatic panel refresh on book switch
- Gallery and import API endpoints

### Changed
- Major navigation refactor using `data-area` attributes
- Significant CSS modernization and component consistency improvements
- Expanded `SnaraFiles` into a full tabbed workspace
- Updated AI backend (`php/ai.php`) for better Groq support and provider switching
- Consistent icon system (`icx.replace`) across dynamic UI elements

### Fixed
- Gallery and Import panels now reload correctly on book change
- Export footer icons and file upload handling
- Various stability improvements in modals and dynamic panels

### Other
- Minor meta adjustments and helper improvements (April 2026)

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
