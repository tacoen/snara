<?php
/* ─────────────────────────────────────────────────
   Router.php — parses ?action= and dispatches

   Actions:
     GET  ?action=config.get
     POST ?action=config.set
     GET  ?action=default.get
     POST ?action=default.set
     GET  ?action=bookdefault.get&bookId=$n
     POST ?action=bookdefault.set&bookId=$n    ← {defaults:{…}}

     GET  ?action=doc.list
     GET  ?action=doc.get&filename=name
     POST ?action=doc.save
     POST ?action=doc.setOrder
     DELETE ?action=doc.delete&filename=name

     GET  ?action=book.index
     GET  ?action=book.chapters&id=$bookId
     POST ?action=book.create          ← {title}
     POST ?action=book.setActive       ← {bookId}

     GET  ?action=state.get&bookId=$n
     POST ?action=state.set            ← {bookId, filename, state}

     GET  ?action=pref.get
     POST ?action=pref.set             ← {root:{}, light:{}, dark:{}}

     GET  ?action=editorpref.get&bookId=$n
     POST ?action=editorpref.set&bookId=$n  ← editor prefs shape

     GET  ?action=import.list&bookId=$n
     POST ?action=import.upload&bookId=$n
     GET  ?action=import.read&bookId=$n&filename=name
     DELETE ?action=import.delete&bookId=$n&filename=name

     GET  ?action=gallery.list&bookId=$n
     POST ?action=gallery.upload&bookId=$n
     DELETE ?action=gallery.delete&bookId=$n&filename=name
     POST ?action=gallery.rename&bookId=$n  ← {from, to}
     GET  ?action=gallery.autocomplete&bookId=$n

     GET  ?action=cache.list&bookId=$n
     POST ?action=cache.rebuild&bookId=$n

     POST ?action=ai.chat              ← {message}
     GET  ?action=ai.get
     POST ?action=ai.set               ← {url, model}

     GET  ?action=chatlog.get&bookId=$n
     POST ?action=chatlog.save&bookId=$n ← {id, role, content, label, timestamp}
     DELETE ?action=chatlog.clear&bookId=$n

     GET  ?action=notes.list
     POST ?action=notes.save           ← Note[]
─────────────────────────────────────────────────── */
require_once __DIR__ . '/config.php';
require_once __DIR__ . '/document.php';
require_once __DIR__ . '/book.php';
require_once __DIR__ . '/state.php';
require_once __DIR__ . '/pref.php';
require_once __DIR__ . '/import.php';
require_once __DIR__ . '/cache.php';
require_once __DIR__ . '/gallery.php';
require_once __DIR__ . '/editor-pref.php';

require_once __DIR__ . '/ai.php';
require_once __DIR__ . '/chatlog.php';
require_once __DIR__ . '/notes.php';

class Router {

    public static function dispatch(): void {
        header('Content-Type: application/json');
        header('Access-Control-Allow-Origin: *');
        header('Access-Control-Allow-Methods: GET, POST, DELETE, OPTIONS');
        header('Access-Control-Allow-Headers: Content-Type');

        $method = self::requestMethod();

        if ($method === 'OPTIONS') {
            http_response_code(204);
            exit;
        }

        $action = $_GET['action'] ?? '';

        try {
            switch ($action) {

                // ── Notes ────────────────────────────────────
                case 'notes.list':
                    self::requireMethod($method, 'GET');
                    echo json_encode(Notes::list());
                    break;
 
					case 'notes.save':
                    self::requireMethod($method, 'POST');
                    $body = self::body();
                    // body() returns [] on empty input — that would wipe all notes
                    if (empty($body) && file_get_contents('php://input') !== '[]') {
                        self::error(400, 'Expected JSON array of notes');
                    }
                    Notes::save($body);
                    echo json_encode(['ok' => true]);
                    break;

// ── Chatlog ──────────────────────────────────
                case 'chatlog.get':
                    self::requireMethod($method, 'GET');
                    $bookId = (int) self::requireParam('bookId');
                    echo json_encode(['log' => Chatlog::get($bookId)]);
                    break;

                case 'chatlog.save':
                    self::requireMethod($method, 'POST');
                    $bookId = (int) self::requireParam('bookId');
                    $entry  = Chatlog::save($bookId, self::body());
                    echo json_encode(['ok' => true, 'entry' => $entry]);
                    break;

                case 'chatlog.clear':
                    self::requireMethod($method, 'DELETE');
                    $bookId = (int) self::requireParam('bookId');
                    Chatlog::clear($bookId);
                    echo json_encode(['ok' => true]);
                    break;
					
                // ── Config ───────────────────────────────────
                case 'config.get':
                    self::requireMethod($method, 'GET');
                    echo json_encode(Config::get());
                    break;

                case 'config.set':
                    self::requireMethod($method, 'POST');
                    Config::set(self::body());
                    echo json_encode(['ok' => true]);
                    break;

                // ── Global defaults ──────────────────────────
                case 'default.get':
                    self::requireMethod($method, 'GET');
                    echo json_encode(['defaults' => Config::getGlobalDefaults()]);
                    break;

                case 'default.set':
                    self::requireMethod($method, 'POST');
                    $body     = self::body();
                    $defaults = $body['defaults'] ?? $body;
                    Config::setGlobalDefaults($defaults);
                    echo json_encode(['ok' => true]);
                    break;

                // ── Per-book defaults ────────────────────────
                case 'bookdefault.get':
                    self::requireMethod($method, 'GET');
                    $bookId = (int) self::requireParam('bookId');
                    echo json_encode(['defaults' => Config::getBookDefaults($bookId)]);
                    break;

                case 'bookdefault.set':
                    self::requireMethod($method, 'POST');
                    $body   = self::body();
                    $bookId = isset($_GET['bookId'])
                        ? (int)$_GET['bookId']
                        : (int)($body['bookId'] ?? 0);
                    if (!$bookId) self::error(400, 'Missing bookId');
                    $defaults = $body['defaults'] ?? $body;
                    Config::setBookDefaults($bookId, $defaults);
                    echo json_encode(['ok' => true]);
                    break;

                // ── Documents ────────────────────────────────
                case 'doc.list':
                    self::requireMethod($method, 'GET');
                    $bookId = isset($_GET['bookId']) ? (int)$_GET['bookId'] : null;
                    echo json_encode(Document::list($bookId));
                    break;

                case 'doc.get':
                    self::requireMethod($method, 'GET');
                    $bookId = isset($_GET['bookId']) ? (int)$_GET['bookId'] : null;
                    echo json_encode(Document::get(self::requireParam('filename'), $bookId));
                    break;

                case 'doc.save':
                    self::requireMethod($method, 'POST');
                    $body = self::body();
                    if (empty($body['filename'])) self::error(400, 'Missing filename');
                    $bookId = isset($body['bookId']) ? (int)$body['bookId'] : null;
                    Document::save($body['filename'], $body, $bookId);
                    echo json_encode(['ok' => true, 'body' => $body['filename']]);
                    break;

                case 'doc.delete':
                    self::requireMethod($method, 'DELETE');
                    $bookId = isset($_GET['bookId']) ? (int)$_GET['bookId'] : null;
                    Document::delete(self::requireParam('filename'), $bookId);
                    echo json_encode(['ok' => true]);
                    break;

                case 'doc.setOrder':
                    self::requireMethod($method, 'POST');
                    $body     = self::body();
                    $filename = trim($body['filename'] ?? '');
                    $order    = (int)($body['order'] ?? 99);
                    $bookId   = isset($body['bookId']) ? (int)$body['bookId'] : null;
                    if (!$filename) self::error(400, 'Missing filename');
                    Document::setOrder($filename, $order, $bookId);
                    echo json_encode(['ok' => true]);
                    break;

                // ── Books ────────────────────────────────────
                case 'book.index':
                    self::requireMethod($method, 'GET');
                    echo json_encode(Book::index());
                    break;

                case 'book.chapters':
                    self::requireMethod($method, 'GET');
                    $id = (int) self::requireParam('id');
                    echo json_encode(Book::chapters($id));
                    break;

                case 'book.create':
                    self::requireMethod($method, 'POST');
                    $body  = self::body();
                    $title = trim($body['title'] ?? '');
                    if ($title === '') self::error(400, 'Missing title');
                    echo json_encode(Book::create($title));
                    break;

                case 'book.setActive':
                    self::requireMethod($method, 'POST');
                    $body   = self::body();
                    $bookId = (int)($body['bookId'] ?? 0);
                    if (!$bookId) self::error(400, 'Missing bookId');
                    Book::setActive($bookId);
                    echo json_encode(['ok' => true]);
                    break;

                // ── Chapter state ────────────────────────────
                case 'state.get':
                    self::requireMethod($method, 'GET');
                    $bookId = (int) self::requireParam('bookId');
                    echo json_encode(['states' => ChapterState::get($bookId)]);
                    break;

                case 'state.set':
                    self::requireMethod($method, 'POST');
                    $body     = self::body();
                    $bookId   = (int)($body['bookId'] ?? 0);
                    $filename = trim($body['filename'] ?? '');
                    $state    = trim($body['state']    ?? 'unlock');
                    if (!$bookId || !$filename) self::error(400, 'Missing bookId or filename');
                    ChapterState::set($bookId, $filename, $state);
                    echo json_encode(['ok' => true]);
                    break;

                // ── Theme CSS variables ──────────────────────
                case 'pref.get':
                    self::requireMethod($method, 'GET');
                    echo json_encode(['vars' => Pref::get()]);
                    break;

                case 'pref.set':
                    self::requireMethod($method, 'POST');
                    $body = self::body();
                    Pref::set($body['vars'] ?? []);
                    echo json_encode(['ok' => true]);
                    break;

                // ── Editor preferences (per-book) ────────────
                // Stored in data/$bookId/conf/editor.json.
                // Returns defaults if the file does not exist yet —
                // never 404, the check is inside EditorPref::get().
                case 'editorpref.get':
                    self::requireMethod($method, 'GET');
                    $bookId = (int) self::requireParam('bookId');
                    echo json_encode(EditorPref::get($bookId));
                    break;

                case 'editorpref.set':
                    self::requireMethod($method, 'POST');
                    $bookId = isset($_GET['bookId'])
                        ? (int)$_GET['bookId']
                        : (int)(self::body()['bookId'] ?? 0);
                    if (!$bookId) self::error(400, 'Missing bookId');
                    EditorPref::set($bookId, self::body());
                    echo json_encode(['ok' => true]);
                    break;

                // ── Import staging ───────────────────────────
                case 'import.upload':
                    // multipart POST — do NOT use self::body() (reads php://input)
                    self::requireMethod($method, 'POST');
                    $bookId = (int)($_GET['bookId'] ?? $_POST['bookId'] ?? 0);
                    if (!$bookId) self::error(400, 'Missing bookId');
                    $result = Import::upload($bookId);
                    echo json_encode(['ok' => true, 'file' => $result]);
                    break;

                case 'import.list':
                    self::requireMethod($method, 'GET');
                    $bookId = (int) self::requireParam('bookId');
                    echo json_encode(Import::list($bookId));
                    break;

                case 'import.delete':
                    self::requireMethod($method, 'DELETE');
                    $bookId   = (int) self::requireParam('bookId');
                    $filename = self::requireParam('filename');
                    Import::delete($bookId, $filename);
                    echo json_encode(['ok' => true]);
                    break;

                case 'import.read':
                    self::requireMethod($method, 'GET');
                    $bookId   = (int) self::requireParam('bookId');
                    $filename = self::requireParam('filename');
                    // Return raw text — override content-type for this one action
                    header('Content-Type: text/plain; charset=utf-8');
                    echo Import::read($bookId, $filename);
                    exit;

                // ── Gallery ──────────────────────────────────
                case 'gallery.upload':
                    self::requireMethod($method, 'POST');
                    $bookId = (int)($_GET['bookId'] ?? $_POST['bookId'] ?? 0);
                    if (!$bookId) self::error(400, 'Missing bookId');
                    $result = Gallery::upload($bookId);
                    echo json_encode(['ok' => true, 'file' => $result]);
                    break;

                case 'gallery.list':
                    self::requireMethod($method, 'GET');
                    $bookId = (int) self::requireParam('bookId');
                    echo json_encode(Gallery::list($bookId));
                    break;

                case 'gallery.delete':
                    self::requireMethod($method, 'DELETE');
                    $bookId   = (int) self::requireParam('bookId');
                    $filename = self::requireParam('filename');
                    Gallery::delete($bookId, $filename);
                    echo json_encode(['ok' => true]);
                    break;

                case 'gallery.rename':
                    self::requireMethod($method, 'POST');
                    $body   = self::body();
                    $bookId = (int)($_GET['bookId'] ?? $body['bookId'] ?? 0);
                    $from   = trim($body['from'] ?? '');
                    $to     = trim($body['to']   ?? '');
                    if (!$bookId || !$from || !$to) self::error(400, 'Missing bookId, from, or to');
                    $renamed = Gallery::rename($bookId, $from, $to);
                    echo json_encode(['ok' => true, 'filename' => $renamed['filename']]);
                    break;

                case 'gallery.autocomplete':
                    self::requireMethod($method, 'GET');
                    $bookId = (int) self::requireParam('bookId');
                    echo json_encode(Gallery::autocomplete($bookId));
                    break;

                // ── Cache ────────────────────────────────────
                case 'cache.list':
                    self::requireMethod($method, 'GET');
                    $bookId = (int) self::requireParam('bookId');
                    echo json_encode(Cache::list($bookId));
                    break;

                case 'cache.rebuild':
                    self::requireMethod($method, 'POST');
                    $bookId = (int) self::requireParam('bookId');
                    echo json_encode(Cache::rebuild($bookId));
                    break;

// ── AI Chat ──────────────────────────────────
                case 'ai.chat':
                    self::requireMethod($method, 'POST');
                    $body    = self::body();
                    $message = trim($body['message'] ?? '');
                    if ($message === '') self::error(400, 'Missing message');
                    echo json_encode(AiChat::chat($message));
                    break;
                // ── AI Chat config ───────────────────────────
                case 'ai.get':
                    self::requireMethod($method, 'GET');
                    echo json_encode(AiConfig::get());
                    break;
 
                case 'ai.set':
                    self::requireMethod($method, 'POST');
                    AiConfig::set(self::body());
                    echo json_encode(['ok' => true]);
                    break;
					
                // ── Unknown ──────────────────────────────────
                default:
                    self::error(404, 'Unknown action: ' . $action);
            }
        } catch (Throwable $e) {
            self::error(500, $e->getMessage());
        }
    }

    // ── Helpers ───────────────────────────────────

    private static function requestMethod(): string {
        if (PHP_SAPI === 'cli') return 'GET';
        return $_SERVER['REQUEST_METHOD'] ?? 'GET';
    }

    private static function requireMethod(string $actual, string $expected): void {
        if ($actual !== $expected) {
            self::error(405, "Method $actual not allowed for this action");
        }
    }

    private static function requireParam(string $key): string {
        if (empty($_GET[$key])) self::error(400, "Missing query param: $key");
        return $_GET[$key];
    }

    private static function body(): array {
        $raw = file_get_contents('php://input');
        if ($raw === false || $raw === '') return [];
        $data = json_decode($raw, true);
        if (!is_array($data)) self::error(400, 'Invalid JSON body');
        return $data;
    }

    private static function error(int $code, string $message): void {
        http_response_code($code);
        echo json_encode(['error' => $message]);
        exit;
    }
}

if (basename(__FILE__) === basename($_SERVER['SCRIPT_FILENAME'] ?? '')) {
    Router::dispatch();
}