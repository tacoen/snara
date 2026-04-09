<?php
/* ─────────────────────────────────────────────────
   php/cache.php — Cache manager for Snara

   Currently caches:
     data/$bookId/cache/chapters.json
       → Full output of Book::chapters($bookId)
       → Invalidated on doc.save and doc.delete
       → Served directly by book.chapters action

   Cache shape (chapters.json):
     {
       "built":    1712345678,          ← unix timestamp
       "chapters": [ ...same as Book::chapters()... ]
     }

   Usage:
     Cache::getChapters($bookId)        → array|null
     Cache::putChapters($bookId, $data) → void
     Cache::clearChapters($bookId)      → void
     Cache::clear($bookId)              → void (all caches for book)
─────────────────────────────────────────────────── */

class Cache {

  // ── Path helpers ──────────────────────────────

  private static function dir(int $bookId): string {
    return Config::dataDir() . '/' . $bookId . '/cache';
  }

  private static function chaptersPath(int $bookId): string {
    return self::dir($bookId) . '/chapters.json';
  }

  // ── Chapters cache ────────────────────────────

  /**
   * Return cached chapters array if valid, null if stale or missing.
   * Cache is considered stale if any doc in data/$bookId/ is newer than the cache.
   */
  public static function getChapters(int $bookId): ?array {
    $path = self::chaptersPath($bookId);
    if (!file_exists($path)) return null;

    $raw = @file_get_contents($path);
    if (!$raw) return null;

    $cached = json_decode($raw, true);
    if (!is_array($cached) || empty($cached['built']) || empty($cached['chapters'])) {
      return null;
    }

    // Validate freshness: compare cache build time against newest doc mtime
    $builtAt = (int) $cached['built'];
    $docDir  = Config::dataDir() . '/' . $bookId;

    $files = glob($docDir . '/*.json') ?: [];
    foreach ($files as $file) {
      if (filemtime($file) > $builtAt) {
        // A document is newer than the cache — stale
        return null;
      }
    }

    return $cached['chapters'];
  }

  /**
   * Write chapters data to cache.
   */
  public static function putChapters(int $bookId, array $chapters): void {
    $dir = self::dir($bookId);
    if (!is_dir($dir)) mkdir($dir, 0755, true);

    file_put_contents(
      self::chaptersPath($bookId),
      json_encode(
        ['built' => time(), 'chapters' => $chapters],
        JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE
      )
    );
  }

  /**
   * Delete the chapters cache for a book.
   * Call this on doc.save and doc.delete.
   */
  public static function clearChapters(int $bookId): void {
    $path = self::chaptersPath($bookId);
    if (file_exists($path)) unlink($path);
  }

  /**
   * Clear all cache files for a book.
   */
  public static function clear(int $bookId): void {
    $dir   = self::dir($bookId);
    $files = glob($dir . '/*.json') ?: [];
    foreach ($files as $f) unlink($f);
  }
}