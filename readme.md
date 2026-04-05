# Snara

**A lightweight, self-hosted structured writing tool for storytellers.**

Snara is a minimalist web-based editor designed for long-form narrative writing (novels, screenplays, or any story-driven project). It lets you organize your work with a clear hierarchical structure: **Acts → Chapters → Scenes → Beats**.

Built with a clean Markdown editor, it combines distraction-free writing, automatic section tagging, document management, and book-level organization — all in a simple PHP + Vanilla JS stack. No databases, no heavy frameworks, just flat files and instant feedback.

## ✨ Features

- **Structured Markdown Editor**  
  Automatic classification using headings (`# Act`, `## Chapter`, `### Scene`, `#### Beat`).
- **Document & Book Management**  
  Full CRUD for documents + support for multiple books, active book switching, and chapter indexing.
- **Metadata Fields**  
  Track characters, settings, prompts, and any custom fields per document.
- **Live Formatting Tools**  
  Markdown helpers, inline wrapping, and preview powered by Marked.js.
- **Autosave**  
  Configurable automatic saving (default: every 30 seconds).
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
   ```bash
   git clone https://github.com/tacoen/snara.git
   cd snara
   ```