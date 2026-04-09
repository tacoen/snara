<?php
/* ─────────────────────────────────────────────────
   php/cache.php — Cache manager for Snara

   Caches:
     data/$bookId/cache/chapters.json  → chapter index
     data/$bookId/cache/act.json       → act index (moved from conf/)

   Cache shape (chapters.json):
     { "built": 1712345678, "chapters": [...] }

   Usage:
     Cache::getChapters($bookId)        → array|null
     Cache::putChapters($bookId, $data) → void
     Cache::clearChapters($bookId)      → void
     Cache::clear($bookId)              → void
     Cache::list($bookId)               → array of file descriptors
     Cache::rebuild($bookId)            → array of step results
─────────────────────────────────────────────────── */

class Cache {

  // ── Path helpers ──────────────────────────────────────────

  private static function dir(int $bookId): string {
    return Config::dataDir() . '/' . $bookId . '/cache';
  }

  private static function chaptersPath(int $bookId): string {
    return self::dir($bookId) . '/chapters.json';
  }

  // ── Chapters cache ────────────────────────────────────────

  /**
   * Return cached chapters array if valid, null if stale or missing.
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

    $builtAt = (int) $cached['built'];
    $docDir  = Config::dataDir() . '/' . $bookId;

    foreach (glob($docDir . '/*.json') ?: [] as $file) {
      if (filemtime($file) > $builtAt) return null;
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

  // ── List cache files ──────────────────────────────────────

  /**
   * List all files in data/$bookId/cache/ with metadata.
   * act.json now lives here too (moved from conf/).
   * chapters.json is checked for staleness.
   */
  public static function list(int $bookId): array {
    $results  = [];
    $cacheDir = self::dir($bookId);

    if (!is_dir($cacheDir)) return $results;

    foreach (glob($cacheDir . '/*.json') ?: [] as $path) {
      $name  = basename($path);
      $stat  = stat($path);
      $stale = false;

      // chapters.json is stale if any doc is newer than its built timestamp
      if ($name === 'chapters.json') {
        $raw     = @file_get_contents($path);
        $data    = $raw ? json_decode($raw, true) : null;
        $builtAt = (int)($data['built'] ?? 0);
        $docDir  = Config::dataDir() . '/' . $bookId;
        foreach (glob($docDir . '/*.json') ?: [] as $doc) {
          if (filemtime($doc) > $builtAt) { $stale = true; break; }
        }
      }

      $results[] = [
        'name'  => $name,
        'size'  => $stat['size'],
        'ctime' => $stat['ctime'],
        'mtime' => $stat['mtime'],
        'stale' => $stale,
      ];
    }

    return $results;
  }

  // ── Rebuild all caches ────────────────────────────────────

  /**
   * Clear and rebuild chapters.json and act.json.
   * Returns step-by-step results for the UI progress display.
   */
  public static function rebuild(int $bookId): array {
    $steps = [];

    // ── Step 1: clear chapters.json ───────────────
    $t = microtime(true);
    self::clearChapters($bookId);
    $steps[] = [
      'step'   => 'Cleared chapters.json',
      'status' => 'ok',
      'ms'     => (int)((microtime(true) - $t) * 1000),
    ];

    // ── Step 2: rebuild chapters cache ───────────
    $t = microtime(true);
    try {
      $chapters = Book::chapters($bookId);  // writes cache as side effect
      $steps[] = [
        'step'   => 'Rebuilt chapters index',
        'status' => 'ok',
        'ms'     => (int)((microtime(true) - $t) * 1000),
        'count'  => count($chapters),
      ];
    } catch (Throwable $e) {
      $steps[] = [
        'step'   => 'Rebuilt chapters index',
        'status' => 'error',
        'ms'     => (int)((microtime(true) - $t) * 1000),
        'error'  => $e->getMessage(),
      ];
    }

    // ── Step 3: rebuild act.json ──────────────────
    // act.json now lives in cache/, not conf/
    $t = microtime(true);
    try {
      Document::rebuildActIndex($bookId);
      $actPath = self::dir($bookId) . '/act.json';  // ← cache/, not conf/
      $actData = json_decode(@file_get_contents($actPath) ?: '[]', true);
      $steps[] = [
        'step'   => 'Rebuilt act.json',
        'status' => 'ok',
        'ms'     => (int)((microtime(true) - $t) * 1000),
        'count'  => is_array($actData) ? count($actData) : 0,
      ];
    } catch (Throwable $e) {
      $steps[] = [
        'step'   => 'Rebuilt act.json',
        'status' => 'error',
        'ms'     => (int)((microtime(true) - $t) * 1000),
        'error'  => $e->getMessage(),
      ];
    }

    return ['steps' => $steps];
  }
}