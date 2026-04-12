# PHP Backend Documentation

**Snara** uses a lightweight, flat-file PHP backend (no database, no frameworks).  
Everything is handled via a single REST-style API entry point (`api.php`) that routes requests to modular PHP files in the `/php/` folder.

**Last updated:** April 12, 2026  
**PHP version required:** 7.4+

---

## Architecture Overview

- **Entry point:** `api.php` → loads `php/router.php`
- **Routing:** Simple query-string based (`?action=...`) with HTTP method validation
- **Storage:** Flat JSON files under `/data/{bookId}/` + `/json/`
- **Security:** Basic path sanitization, no direct user input to `file_put_contents` without checks
- **Caching:** Per-book cache in `/data/{bookId}/cache/`
- **AI:** OpenAI-compatible (default: Groq) via cURL
- **No sessions:** State is persisted in JSON files

All modules are **static classes** for simplicity and fast execution.

---

## API Entry Point: `api.php`

The single public endpoint. It:
- Includes the router
- Sets JSON headers + error handling
- Forwards all `?action=XXX` requests to `Router::dispatch()`

---

## Router: `php/router.php`

Central dispatcher. Defines all allowed actions and routes them to the correct class/method.

### Supported Actions (as of April 2026)

| Action                  | Method | Description                          | Module              |
|-------------------------|--------|--------------------------------------|---------------------|
| `chatlog.get`           | GET    | Get chat history                     | (internal)          |
| `chatlog.save`          | POST   | Save chat entry                      | (internal)          |
| `chatlog.clear`         | DELETE | Clear chat log                       | (internal)          |
| `config.get` / `config.set` | GET/POST | Global config                     | `config.php`        |
| `default.get` / `default.set` | GET/POST | Global defaults                   | `config.php`        |
| `bookdefault.get` / `bookdefault.set` | GET/POST | Per-book defaults              | `config.php`        |
| `doc.list` / `doc.get` / `doc.save` / `doc.delete` / `doc.setOrder` | GET/POST/DELETE | Document CRUD | `document.php`      |
| `book.index` / `book.chapters` / `book.create` / `book.setActive` | GET/POST | Book management | `book.php` |
| `state.get` / `state.set` | GET/POST | Chapter lock/unlock/delete state | `state.php`         |
| `pref.get` / `pref.set` | GET/POST | CSS variables (root/light/dark)     | `pref.php`          |
| `editorpref.get` / `editorpref.set` | GET/POST | Editor preferences (per-book) | `editor-pref.php` |
| `import.upload` / `import.list` / `import.delete` / `import.read` | POST/GET/DELETE/GET | Import staging | `import.php` |
| `gallery.upload` / `gallery.list` / `gallery.delete` / `gallery.rename` / `gallery.autocomplete` | POST/GET/DELETE/POST/GET | Media gallery | `gallery.php` |
| `cache.list` / `cache.rebuild` | GET/POST | Cache management                  | `cache.php`         |
| `ai.chat` / `ai.get` / `ai.set` | POST/GET/POST | AI chatbot + config             | `ai.php`            |

---

## Module-by-Module Documentation

### `php/ai.php` – AI Integration
**Class:** `AI` (static)  
**Purpose:** Thin wrapper for any OpenAI-compatible provider (default: Groq).

**Key methods:**
- `query(string $message)` → sends message, returns full API response
- `get()` → safe config for frontend (no API key)
- `set(array $body)` → updates URL + model (key is never changed from UI)

**Security:** API key is **never** exposed to frontend or writable via API.

---

### `php/book.php` – Book Management
**Purpose:** CRUD for books + chapter listing.

**Key methods:**
- `create(string $title)` → creates new book + folders
- `chapters(int $bookId)` → enriched list of chapters (cached)
- `setActive(int $bookId)` → updates global active book

---

### `php/cache.php` – Caching Layer
**Class:** `Cache` (static)  
**Purpose:** Fast chapter/act index caching with automatic invalidation.

**Key methods:**
- `getChapters()` / `putChapters()` / `clearChapters()`
- `list()` / `rebuild()` / `clear()`

---

### `php/config.php` – Configuration
**Class:** `Config` (static)  
**Purpose:** Central config loader, path resolver, and defaults manager.

**Features:**
- Global + per-book defaults
- Automatic folder creation (`ensureBookDirs`)
- Path helpers (`dataDir()`, `jsonDir()`)

---

### `php/document.php` – Document CRUD
**Class:** `Document` (static)  
**Purpose:** Core document (chapter) storage and act-index generation.

**Key methods:**
- `save()` / `get()` / `delete()` / `listAll()`
- `rebuildActIndex()` / `readActIndex()`
- `setOrder()`

Documents are stored as `data/{bookId}/{filename}.json`.

---

### `php/editor-pref.php` – Editor Preferences
**Purpose:** Per-book editor settings (currently minimal; mainly forwards to config system).

---

### `php/gallery.php` – Media Gallery
**Class:** `Gallery` (static)  
**Purpose:** Image/video upload, management, and autocomplete.

**Key features:**
- Supports images + videos
- Safe filename handling + duplicate prevention
- `autocomplete()` → pulls character names, settings, and chapter titles (cached)

---

### `php/import.php` – Import Staging
**Class:** `Import` (static)  
**Purpose:** Temporary storage for `.txt` / `.md` files before importing into documents.

**Key methods:**
- `upload()` / `list()` / `delete()` / `read()`

---

### `php/pref.php` – CSS Variables
**Class:** `Pref` (static)  
**Purpose:** Stores custom CSS variables (`--var: value`) for live theming.

**Scopes:** `root`, `light`, `dark`

---

### `php/state.php` – Chapter State
**Class:** `ChapterState` (static)  
**Purpose:** Per-chapter UI state (unlock / lock / delete flag).

Stored in `data/{bookId}/cache/states.json`.

---

### `php/state.php` wait, already covered.

---

## Data Flow Example (typical request)

1. Frontend calls `api.php?action=doc.save&bookId=1`
2. `api.php` → `router.php`
3. Router validates action + HTTP method
4. Calls `Document::save(...)`
5. `Document` writes JSON to `data/1/filename.json`
6. `Cache` is invalidated automatically on next read

---

## Security & Best Practices Used

- Path sanitization on all filenames
- No direct filesystem writes from raw user input
- JSON-only responses
- cURL timeout + error handling in AI
- Cache invalidation on document changes

---

## Future Improvements (suggestions)

- Add rate limiting / basic auth (optional)
- Move chatlog to its own dedicated file
- Add proper PHPDoc blocks + type hints
- Consider PSR-4 autoloading if project grows

---

**This file is auto-maintainable** — just run a quick scan when you add new actions.
