<?php
/* ─────────────────────────────────────────────────
   Document.php — read/write/list/delete data/*.json
   Supports optional $bookId subdirectory:
     bookId given  → data/$bookId/$filename.json
     bookId null   → data/$filename.json  (legacy)
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
    return array_map(fn($f) => basename($f, '.json'), $files);
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

    $data['filename'] = self::safeName($filename);
    if ($bookId) $data['bookId'] = $bookId;

    file_put_contents(
      self::path($filename, $bookId),
      json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE)
    );
  }

  public static function delete(string $filename, ?int $bookId = null): void {
    $path = self::path($filename, $bookId);
    if (file_exists($path)) unlink($path);
  }
}