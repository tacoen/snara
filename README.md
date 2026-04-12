# Snara

**A lightweight, self-hosted structured writing tool for storytellers.**

Snara is a clean, minimalist web-based editor built specifically for long-form narrative writing — novels, screenplays, web novels, or any story-driven project. It helps you organize your writing with a clear hierarchical structure: **Acts → Chapters → Scenes → Beats**.

Everything runs on your own server with flat-file storage. No database, no heavy frameworks, no bloat.

---

## ✨ Features

- Structured Markdown editor with automatic section detection
- Live Auto Table of Contents (Acts / Chapters / Scenes / Beats)
- Full document & book management (multiple books supported)
- **Files Workspace** — Import, Export, Media Gallery, and Cache management
- Built-in **AI Chatbot** + **AI Toolbar** for brainstorming, rewriting, and quick actions (Groq ready)
- Metadata support (characters, settings, custom fields)
- Media gallery (images & videos) with rename/delete/autocomplete
- Advanced Preferences panel with live CSS variable editing
- Autosave, themes, keyboard shortcuts, and export options (Markdown + HTML)
- Kanban board (scaffolded)
- Simple REST API backend

**Fully self-hosted** — your stories never leave your server.

---

## AI Tools

Snara includes a flexible AI assistant (Chatbot + Toolbar).

### How it works
- Chatbot panel for general assistance (brainstorming, continuing scenes, etc.).
- AI Toolbar in the editor for instant context-aware actions using `preprompts.json`.
- Backend (`php/ai.php`) forwards requests to any OpenAI-compatible provider.

### Current Setup (Groq)
- Default provider: **Groq.com** (very fast, generous free tier)
- Recommended model: `llama-3.3-70b-versatile`
- Easy to switch: edit `php/ai.php` or use the in-app settings + `json/ai.example.json`

Test it:
```bash
bash test.sh
```

Recommended free/low-cost providers → **[no-cost-ai](https://github.com/zebbern/no-cost-ai)**

---

## Quick Start

1. Clone the repository:
   ```bash
   git clone https://github.com/tacoen/snara.git
   cd snara
   ```

2. Set write permissions for the web server on these folders:
   - `/data/`
   - `/json/`

3. Run the app:
   - Quick testing: `php -S localhost:8000`
   - Production: Use Apache (`.htaccess` included) or Nginx

4. Open `http://localhost:8000` (or `spa.html` for experimental SPA mode)

The app automatically creates missing folders and config files on first run.

---

## Tech Stack

- Backend: PHP 7.4+
- Frontend: Vanilla JavaScript + HTML5 + CSS3 (modular)
- Markdown: marked.js
- Storage: Flat files (Markdown + JSON)

---

## Project Structure

See [STRUCTURE.md](STRUCTURE.md) for the detailed folder layout.

---

## Configuration

Main settings are in `json/config.json` (auto-generated). Most options are also editable from the in-app **Settings** panel.

---

## License

Open source. Feel free to fork, modify, and improve it.

Made for storytellers who want structure without complexity.

Questions or suggestions? Open an issue!