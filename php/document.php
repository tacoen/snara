<?php
/* ─────────────────────────────────────────────────
   Document.php — read/write/list/delete data/*.json
   Supports optional $bookId subdirectory:
     bookId given  → data/$bookId/$filename.json
     bookId null   → data/$filename.json  (legacy)

   After each save, rebuilds data/$bookId/act.json:
     [ { "filename": "...", "act": "..." }, … ]
   act = stripped text of first class:"act" entry content.
─────────────────────────────────────────────────── */

class Document {

  private static function safeName(string $filename): string {
    $name = basename($filename);
    $name = preg_replace('/[^a-zA-Z0-9\-_.]/', '-', $name);
    $name = preg_replace('/\.json$/i', '', $name);
    if ($name === '' || $name === '.') {
      throw new InvalidArgumentException('Invalid filename');
    }
    return $name;
  }

  private static function dir(?int $bookId): string {
    $base = Config::dataDir();
    return $bookId ? $base . '/' . $bookId : $base;
  }

  private static function path(string $filename, ?int $bookId = null): string {
    return self::dir($bookId) . '/' . self::safeName($filename) . '.json';
  }

  // ── CRUD ──────────────────────────────────────

  public static function list(?int $bookId = null): array {
    $dir   = self::dir($bookId);
    if (!is_dir($dir)) return [];
    $files = glob($dir . '/*.json') ?: [];
    // Exclude act.json from document list
    $files = array_filter($files, fn($f) => strpos($f, '/conf/') === false);
    return array_map(fn($f) => basename($f, '.json'), array_values($files));
  }

  public static function get(string $filename, ?int $bookId = null): array {
    $path = self::path($filename, $bookId);
    if (!file_exists($path)) {
      http_response_code(404);
      throw new RuntimeException("Document not found: $filename");
    }
    $data = json_decode(file_get_contents($path), true);
    return is_array($data) ? $data : [];
  }

  public static function save(string $filename, array $data, ?int $bookId = null): void {
    $dir = self::dir($bookId);
    if (!is_dir($dir)) mkdir($dir, 0755, true);
    if ($bookId) Config::ensureBookDirs($bookId);

    $data['filename'] = self::safeName($filename);
    if ($bookId) $data['bookId'] = $bookId;

    // Ensure meta.order exists, default 99
    if (!isset($data['meta']['order'])) {
      $data['meta'] = array_merge(['order' => 99], $data['meta'] ?? []);
    }

    $writePath = self::path($filename, $bookId);
    $encoded   = json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
    if (file_put_contents($writePath, $encoded) === false) {
      throw new RuntimeException("Failed to write document: $writePath");
    }

    // Rebuild act.json for this book
    if ($bookId) {
      self::rebuildActIndex($bookId);
      Cache::clearChapters($bookId);   // ← ADD THIS LINE
    }
 
 
  }

  public static function delete(string $filename, ?int $bookId = null): void {
    $path = self::path($filename, $bookId);
    if (file_exists($path)) unlink($path);

    // Rebuild act.json after deletion
    if ($bookId) {
      self::rebuildActIndex($bookId);
      Cache::clearChapters($bookId);   // ← ADD THIS LINE
    }
 
  }
  
public static function setOrder(string $filename, int $order, ?int $bookId = null): void {
  $path = self::path($filename, $bookId);
  if (!file_exists($path)) throw new RuntimeException("Document not found: $filename");
  $data = json_decode(file_get_contents($path), true);
  if (!is_array($data)) throw new RuntimeException("Corrupt document: $filename");
  $data['meta']['order'] = $order;
  file_put_contents($path, json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
}  

  // ── Act index ─────────────────────────────────
  // Scans all docs in the book dir, finds first class:"act" entry,
  // strips HTML, writes data/$bookId/act.json.
  //
  // act.json shape:
  //   [ { "filename": "chapter-one", "act": "Act One Title" }, … ]

  public static function rebuildActIndex(int $bookId): void {
    $dir = self::dir($bookId);
    if (!is_dir($dir)) return;

    // Resolve act default: book default.json overrides global default.json
    $resolved   = Config::resolveDefaults($bookId);
    $actDefault = $resolved['act'] ?? 'None';

    $files = glob($dir . '/*.json') ?: [];
    $result = [];

    foreach ($files as $file) {
      // Skip conf/ directory files
      if (strpos($file, '/conf/') !== false) continue;

      $raw = @file_get_contents($file);
      if (!$raw) continue;
      $doc = json_decode($raw, true);
      if (!is_array($doc)) continue;

      $filename = $doc['filename'] ?? basename($file, '.json');
      $actText  = $actDefault;

      // Find first entry with class "act"
      $article = $doc['article'] ?? [];
      foreach ($article as $entry) {
        if (($entry['class'] ?? '') === 'act') {
          $actText = self::stripHtml($entry['content'] ?? '');
          break;
        }
      }

      $result[] = [
        'filename' => $filename,
        'act'      => $actText,
      ];
    }

    Config::ensureBookDirs($bookId);
    file_put_contents(
      $dir . '/conf/act.json',
      json_encode($result, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE)
    );
  }


  // ── Helpers ───────────────────────────────────

  private static function stripHtml(string $html): string {
    // Decode HTML entities, strip tags, collapse whitespace
    $text = html_entity_decode($html, ENT_QUOTES | ENT_HTML5, 'UTF-8');
    $text = strip_tags($text);
    $text = preg_replace('/\s+/', ' ', $text);
    return trim($text);
  }

  // ── Act index reader (used by Book::chapters) ─

  public static function readActIndex(int $bookId): array {
    $path = self::dir($bookId) . '/conf/act.json';
    if (!file_exists($path)) return [];
    $data = json_decode(file_get_contents($path), true);
    return is_array($data) ? $data : [];
  }
}