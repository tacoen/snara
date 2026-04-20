# Snara — Self-Hosted Novel Editor with Automatic Structure, Kanban & AI

**A lightweight, self-hosted structured writing tool designed for novelists, screenwriters, and long-form storytellers.**

Tired of bloated cloud apps, lost structure in big manuscripts, or paying monthly fees?  
**Snara** gives you automatic hierarchical organization (**Acts → Chapters → Scenes → Beats**), a built-in Kanban board, and a context-aware AI assistant — all running on your own server with simple flat files.

No database. No tracking. No subscriptions. Just you and your story.

## Screenshots

## Screenshots

<div align="center">

<img src="https://raw.githubusercontent.com/tacoen/snara/main/screenshots/s1.jpg" width="48%" alt="Main Editor">
<img src="https://raw.githubusercontent.com/tacoen/snara/main/screenshots/s2.jpg" width="48%" alt="Kanban with todo">

<img src="https://raw.githubusercontent.com/tacoen/snara/main/screenshots/s3.jpg" width="48%" alt="Notes">
<img src="https://raw.githubusercontent.com/tacoen/snara/main/screenshots/s4.jpg" width="48%" alt="Exports">

</div>

## ✨ Why Writers Love Snara

- **Automatic Structure** — Write naturally in Markdown; Snara intelligently detects and organizes Acts, Chapters, Scenes, and Beats.
- **Live Table of Contents** — Always up-to-date, click to jump anywhere instantly.
- **Multi-Book Support** — Manage multiple novels or screenplays in one clean workspace.
- **Kanban Board** — Visual drag-and-drop planning for scenes, chapters, and story arcs with real-time sync to your manuscript.
- **AI Writing Assistant** — Context-aware chatbot + floating toolbar for brainstorming, rewriting, expanding scenes, tone adjustments, and more (works with Groq, OpenAI, or any compatible provider).
- **Files & Media Workspace** — Import/export Markdown & HTML, media gallery with rename/delete, and smart autocomplete.
- **Metadata System** — Track characters, locations, settings, and custom fields linked directly to your scenes.
- **Fully Self-Hosted & Private** — Your words stay on your server.

Perfect for **novels, web novels, screenplays, fanfiction**, and any large narrative project.

## 🚀 Quick Start

1. Clone the repository:
   ```bash
   git clone https://github.com/tacoen/snara.git
   cd snara
   ```

2. Set write permissions for the web server on these folders:
   - `/data/`
   - `/json/`

3. Run the app:
   - For testing: `php -S localhost:8000`
   - For production: Use Apache (`.htaccess` included) or Nginx

4. Open `http://localhost:8000` in your browser.

Snara auto-creates required folders and config files on first run.

### Test the AI
Run `bash test.sh` (default uses fast Groq + Llama 3.3).

## Core Features

### Structured Markdown Editor
Automatic hierarchy detection with live Table of Contents.

### Kanban Board
Drag-and-drop cards for scenes/chapters. Fully integrated with your writing files — move a card and the status updates in your manuscript.

### AI Tools for Storytellers
- Chatbot for big-picture brainstorming
- Context-aware toolbar for quick rewrites, expansions, summaries, and plot ideas
- Easy to switch between providers (Groq recommended for speed and free tier)

### Additional Highlights
- Advanced Preferences panel (live CSS theming, shortcuts)
- Autosave + clean exports (Markdown & HTML)
- Simple REST API for extensions
- Lightweight: PHP 7.4+ backend + Vanilla JS frontend

## Tech Stack

- **Backend**: PHP 7.4+
- **Frontend**: Vanilla JavaScript + HTML5 + CSS3
- **Markdown**: marked.js
- **Storage**: Flat files (Markdown + JSON)
- **AI**: OpenAI-compatible API (Groq, OpenAI, etc.)

## Configuration

Most settings are in `json/config.json` (auto-generated) and fully editable via the in-app Preferences panel.  
Customize AI prompts in `preprompts.json` and `builder-prompts.json`.

See also:  
- [STRUCTURE.md](STRUCTURE.md)  
- [PHP_BACKEND.md](PHP_BACKEND.md)  
- [CHANGELOG.md](CHANGELOG.md)

## License

Open source under the **MIT License** — free to use, fork, modify, and improve.

Made with ❤️ for fellow storytellers who want structure without complexity and full ownership of their work.

## Contributing

Found a bug? Have an idea for a new feature (more AI tools, export formats, themes)?  
Open an **issue** or submit a **pull request**. All contributions welcome!

Star ⭐ this repo if Snara sounds useful for your writing journey!

