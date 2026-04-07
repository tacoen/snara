# Changelog

All notable changes to **Snara** will be documented in this file.

This project follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html) and the changelog format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

### Added
- Full in-app **Preferences / Settings** management panel
- **Automatic Table of Contents (Auto TOC)** – dynamically generated from document headings (Act → Chapter → Scene → Beat)

### Changed
- Major layout and CSS refactoring for improved consistency
- Re-applied and polished overall UI layout ("Snara 1 / Snara 2" iterations)
- Better code organization and modularity

### Fixed
- Overlay positioning and z-index issues
- Various styling and visual polish improvements

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

