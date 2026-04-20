# Snara

**Finally — a lightweight, self-hosted platform made for long-form storytellers.**

If you've spent years jumping between bloated apps, cloud services that change pricing, or simple editors that lose your structure the moment your novel grows past 50 pages… I built Snara for you.

Snara is a clean, distraction-minimal web-based writing tool designed specifically for **novels, screenplays, web novels, and any large narrative project**. It gives you automatic hierarchical organization without forcing you into rigid templates:

**Acts → Chapters → Scenes → Beats**

Everything stays on your own server using simple flat files. No database. No tracking. No monthly fees. Just you, your story, and the tools that actually help.

---

## Why Snara Exists

After trying many “writing apps,” I got tired of:
- Losing overview when the manuscript gets big
- Paying for features I rarely use
- Worrying about data ownership
- Switching between five different tools for planning, writing, and organizing

Snara brings the essentials together in one focused place — with the structure serious writers need and the simplicity they crave.

---

## ✨ Core Features for Long-Form Writing

- **Structured Markdown Editor**  
  Automatically detects and organizes your writing into Acts, Chapters, Scenes, and Beats as you type.

- **Live Auto-Generated Table of Contents**  
  Always up-to-date. Jump anywhere in your story instantly.

- **Multi-Book / Multi-Project Support**  
  Manage several novels or screenplays in the same instance without confusion.

- **Files Workspace** (powered by **fileman.js**)  
  - Clean file browser for your documents  
  - Import & Export (Markdown + HTML)  
  - Media Gallery for images and videos — with rename, delete, and smart autocomplete  
  - Cache and workspace management so nothing gets lost

- **Metadata System**  
  Keep track of characters, locations, settings, and custom fields — all linked to your scenes.

- **Kanban Board** (fully working)  
  Visual drag-and-drop planning for scenes, chapters, or story arcs.

- **Built-in AI Assistant** (Chatbot + Context-Aware Toolbar)  
  Brainstorm ideas, rewrite awkward paragraphs, continue a scene, summarize chapters, or get plot suggestions — all while keeping full context of your story.  
  Works with any OpenAI-compatible provider (default: fast & affordable Groq + Llama 3.3).

- **Advanced Preferences Panel**  
  Live CSS variable editing, multiple themes, keyboard shortcuts, and deep customization.

- **Autosave + Clean Exports**  
  Never lose progress. Export your entire manuscript or individual sections anytime.

- **Simple REST API** for future extensions or custom workflows.

Fully **self-hosted** — your words stay private and under your control.

---

## Kanban Board

One of the most requested features for long-form writing is a way to **see the big picture** without losing the details of your manuscript.

Snara now includes a **fully working Kanban Board** that lets you visually plan and track your story progress.

### What You Can Do with the Kanban Board

- **Drag & Drop Cards** representing Scenes, Chapters, or even entire Acts  
- Move them between customizable columns such as:  
  - **Backlog / To Do**  
  - **In Progress / Writing**  
  - **Review / Editing**  
  - **Done / Completed**  
  (You can add or rename columns to fit your personal workflow.)

- **Seamless Integration** with your structured editor  
  Cards are directly linked to your Markdown content. When you move a card, the status updates in your story files and metadata.

- **Visual Progress Tracking**  
  Instantly see which parts of your novel are stuck, which are flowing well, and where you need to focus next. Perfect for avoiding the “middle muddle” that plagues many long projects.

- **Story Planning Power**  
  Use it to outline new arcs, rearrange scenes, or manage multiple plot threads without scrolling through thousands of lines of text.

- **Clean & Minimalist Design**  
  The board matches Snara’s distraction-free aesthetic — no unnecessary buttons or clutter, just your story elements and smooth interactions.

You can switch between the main structured editor and the Kanban Board effortlessly. Changes sync in real time with autosave, so your writing and planning always stay in harmony.

This feature was built specifically for writers who need both **deep focused writing** and **high-level visual organization** — something that’s surprisingly rare in most long-form tools.

---

## AI Tools for Storytellers

The AI is designed to feel like a helpful writing partner, not a replacement.

- Chatbot panel for big-picture brainstorming
- Floating Toolbar for quick in-context actions (rewrite, expand, tone shift, etc.)
- Easy to switch models or providers in settings

Default setup uses **Groq** (very fast, generous free tier). Test it with `bash test.sh`.

---

## Quick Start

1. Clone the repo:
   ```bash
   git clone https://github.com/tacoen/snara.git
   cd snara
   ```

2. Give write permissions to:
   - `/data/`
   - `/json/`

3. Run the app:
   - For quick testing: `php -S localhost:8000`  
     (Snara is served through `develope.php`, which auto-generates a clean `index.html` entry point)
   - For production: Use Apache (`.htaccess` included) or Nginx

### .htaccess

```
DirectoryIndex index.html develope.php
```

Snara auto-creates needed folders and config files on first run.


---

## Customization & TODO

Snara is designed to be flexible so you can shape it to match **your** writing process:

- **`preprompts.json`** – Contains predefined system prompts for the AI.  
  You can edit or replace them to better suit your style, genre, or workflow. Easily accessible and modifiable through the **Configuration / Preferences** tab.

- **`builder-prompts.json`** – Predefined prompts used by the AI Builder / Toolbar.  
  Feel free to customize these as well to improve how the AI assists you with rewriting, expanding scenes, or generating ideas.

- **Hierarchy Flexibility**  
  The default structure (Acts → Chapters → Scenes → Beats) works great for many long-form projects, but if it doesn’t perfectly fit your writing style, you can adjust or simplify it.  
  Snara is built to be adaptable — change headings, reduce levels, or create your own conventions. The editor, Table of Contents, and Kanban Board will still work with your custom approach.

These files and settings are all stored locally in the `/json/` folder and can be edited directly or through the in-app interface.

---

## Tech Stack

- Backend: PHP 7.4+
- Frontend: Vanilla JavaScript + HTML5 + CSS3 (lightweight & modular)
- Markdown: marked.js
- Storage: Flat files (Markdown + JSON)

---

## Project Structure

See [STRUCTURE.md](STRUCTURE.md) for details.

Other docs: [PHP_BACKEND.md](PHP_BACKEND.md) • [CHANGELOG.md](CHANGELOG.md)

---

## Configuration

Most settings live in `json/config.json` (auto-generated).  
You can also change almost everything through the in-app Preferences panel.

---

## License

Open source and free to use, fork, or improve.

If you've been patiently waiting for a long-form writing platform that respects your workflow, keeps things simple, and actually grows with your story — welcome to Snara.

Questions? Ideas? Found a bug?  
Open an issue or pull request. I'd love to hear from fellow storytellers.

That's it!

