# Snara

**A lightweight, self-hosted structured writing tool for storytellers.**

Snara is a minimalist web-based editor designed for long-form narrative writing (novels, screenplays, or any story-driven project). It lets you organize your work with a clear hierarchical structure: **Acts → Chapters → Scenes → Beats**.

Built with a clean Markdown editor, it combines distraction-free writing, automatic section tagging, document management, and book-level organization — all in a simple PHP + Vanilla JS stack. No databases, no heavy frameworks, just flat files and instant feedback.

## ✨ Features

- **Structured Markdown Editor**  
  Automatic classification using headings (`# Act`, `## Chapter`, `### Scene`, `#### Beat`).
- **Auto Table of Contents (Auto TOC)**  
  Automatically generated from your document structure.
- **Document & Book Management**  
  Full CRUD for documents + support for multiple books, active book switching, and chapter indexing.
- **Metadata Fields**  
  Track characters, settings, prompts, and any custom fields per document.
- **Live Formatting Tools**  
  Markdown helpers, inline wrapping, and preview powered by Marked.js.
- **Autosave**  
  Configurable automatic saving.
- **Preferences / Settings Panel**  
  Full in-app configuration management.
- **Themes**  
  Light/dark mode support.
- **Keyboard Shortcuts**  
  `Ctrl/Cmd + S` to save, plus editor-specific shortcuts.
- **REST API**  
  Clean, extensible backend for all operations.
- **Self-hosted & Portable**  
  Runs on any PHP server; data stored as simple files.

## Tech Stack

- **Backend**: PHP 7.4+ (flat-file storage)
- **Frontend**: HTML5 + CSS3 + Vanilla ES6+ JavaScript (ES modules)
- **Markdown Rendering**: [marked.js](https://github.com/markedjs/marked)
- **Storage**: Markdown files (`/data/`) + JSON config (`/json/`)

## Quick Start

1. **Clone the repo**
   ```
   bash
   git clone https://github.com/tacoen/snara.git
   cd snara
   ```

## Quick Start

1. **Clone the repo**
   ```bash
   git clone https://github.com/tacoen/snara.git
   cd snara
   ```

2. **Set permissions**  
   Your web server needs write access to:
   - `/data/` (stores your writing documents)
   - `/json/` (stores configuration and indexes)

3. **Run the app**
   - **Quick test**: `php -S localhost:8000`
   - **Production**: Point Apache/Nginx to the project root (`.htaccess` included for clean URLs).

4. Open `http://localhost:8000` (or `spa.html` for the experimental SPA mode) in your browser.

The app will auto-create missing directories and use sensible defaults.

## Project Structure

See [structure.md](structure.md) for the detailed project directory layout.

## Configuration

All settings live in `json/config.json` (created automatically on first run).  
You can also edit them via the in-app **Preferences** panel.

Key defaults:
- Story structure: `act`, `chapter`, `scene`, `beat`
- Metadata fields: `characters`, `settings`, `prompts`
- Autosave interval: 30 seconds
- Default tag: `beat`

## API

Snara uses a simple query-param-based REST API at `api.php`:

| Action                      | Method | Description                          |
|-----------------------------|--------|--------------------------------------|
| `config.get` / `config.set` | GET/POST | Read or update app settings         |
| `doc.list`                  | GET    | List documents (optional book)      |
| `doc.get`                   | GET    | Load a document                     |
| `doc.save`                  | POST   | Save document content               |
| `doc.delete`                | DELETE | Delete a document                   |
| `book.index`                | GET    | List all books                      |
| `book.create`               | POST   | Create a new book                   |
| `book.chapters`             | GET    | Get chapters for a book             |
| `book.setActive`            | POST   | Switch active book                  |

Full routing logic is in `php/router.php`.

## Changelog

See [CHANGELOG.md](CHANGELOG.md) for detailed version history.

## License

This project is open source. Feel free to use, modify, and adapt it for personal or commercial projects.

---

Made with ❤️ for writers who love structure without the bloat.

**Questions or ideas?** Open an issue or pull request!

```
