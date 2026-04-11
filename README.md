
# Snara

**A lightweight, self-hosted structured writing tool for storytellers.**

Snara is a clean, minimalist web-based editor built specifically for long-form narrative writing — novels, screenplays, web novels, or any story-driven project. It helps you organize your writing with a clear hierarchical structure: **Acts → Chapters → Scenes → Beats**.

Everything runs on your own server with flat-file storage. No database, no heavy frameworks, no bloat.

---

## ✨ Features

- Structured Markdown editor with automatic section detection
- Live Auto Table of Contents (Acts / Chapters / Scenes / Beats)
- Full document & book management (multiple books supported)
- Built-in AI Chatbot for brainstorming, continuing scenes, rewriting, and idea generation
- Metadata support (characters, settings, custom fields)
- Media gallery (images & videos)
- Autosave, themes, keyboard shortcuts, and export options
- Simple REST API backend

**Fully self-hosted** — your stories never leave your server.

---

## AI Chatbot Implementation

Snara includes a simple and flexible AI assistant to help with your writing.

### How it works
- Frontend sends the user message via POST to `?action=ai.chat`
- Backend (`php/ai.php`) forwards the request to an external AI provider using OpenAI-compatible format
- The raw JSON response is returned to the client

### Current Setup (Tested with Groq)

We are currently using **Groq.com** because it is very fast and has a generous free tier.

- `php/ai.php` has been updated to use Groq's endpoint (`https://api.groq.com/openai/v1/chat/completions`)
- Recommended model: `llama-3.3-70b-versatile`
- A `test.sh` script is included for quick testing via cURL
- There is also a `test.php` file for easy browser-based testing

To test the AI:
```bash
bash test.sh
```

Just replace the API key in `php/ai.php` with your own Groq key.

### Recommended Free AI Providers

If you want to switch providers or keep everything free/low-cost, check this excellent living index:

→ **[https://github.com/zebbern/no-cost-ai](https://github.com/zebbern/no-cost-ai)**  
*A living index of no-cost AI APIs for developers, researchers & curious builders.*  
Contributions are welcome and appreciated!

You can easily change the AI backend by editing only a few lines in `php/ai.php` (URL, key, and model).

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
   - For quick testing: `php -S localhost:8000`
   - For production: Use Apache or Nginx (`.htaccess` is included)

4. Open `http://localhost:8000` in your browser

The app will automatically create missing folders and config files.

---

## Tech Stack

- Backend: PHP 7.4+
- Frontend: Vanilla JavaScript + HTML5 + CSS3
- Markdown: marked.js
- Storage: Flat files (Markdown + JSON)

---

## Project Structure

See [structure.md](structure.md) for detailed folder layout.

---

## Configuration

Main settings are stored in `json/config.json` (auto-generated). You can also adjust most options from the in-app **Settings** panel.

---

## API

Snara uses a clean router in `php/router.php`.  
New action added: `ai.chat` (POST) — handles AI requests.

---

## License

Open source. Feel free to fork, modify, and improve it.

Made for storytellers who want structure without complexity.

Questions or suggestions? Open an issue!
```

```