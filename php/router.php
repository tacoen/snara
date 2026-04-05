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
     DELETE ?action=doc.delete&filename=name

     GET  ?action=book.index
     GET  ?action=book.chapters&id=$bookId
     POST ?action=book.create          ← {title}
     POST ?action=book.setActive       ← {bookId}
─────────────────────────────────────────────────── */

require_once __DIR__ . '/config.php';
require_once __DIR__ . '/document.php';
require_once __DIR__ . '/book.php';

// ── Add this require near the top of router.php, alongside the others ──
require_once __DIR__ . '/state.php';
require_once __DIR__ . '/pref.php';
	 
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
                    $body = self::body();
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
                    $body     = self::body();
                    $bookId   = isset($_GET['bookId'])
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
                    $body   = self::body();
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

// ── Paste these two cases into the switch block in Router::dispatch() ──
// (e.g. right after the 'book.setActive' case, before the default)

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