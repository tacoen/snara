<?php
/* ─────────────────────────────────────────────────
   book.php — Book & Chapter index handlers

   Actions:
     GET  ?action=book.index           → [{id, title, mtime, chapters}]
     GET  ?action=book.chapters&id=$n  → [{filename, title, mtime, entries, act, order}], sorted by order
     POST ?action=book.create          ← {title}  → {id, title}
     POST ?action=book.setActive       ← {bookId} → {ok}

   Data layout:
     data/
       bookindex.json          — [{id, title}]
       1/                      — book 1 article documents
         chapter-name.json
         conf/
           act.json            — [{filename, act}] auto-rebuilt on save
           default.json        — per-book defaults (seeded from json/default.json)
         image/                — book cover and assets
         cache/                — generated/cached files
         import/               — import staging
         export/               — export output
       2/
         …
─────────────────────────────────────────────────── */

class Book
{

  // ── Path helpers ──────────────────────────────

  private static function bookIndexPath(): string
  {
    return Config::dataDir() . '/bookindex.json';
  }

  private static function bookDir(int $id): string
  {
    return Config::dataDir() . '/' . $id;
  }

  // ── bookindex.json read/write ──────────────────

  public static function readIndex(): array
  {
    $path = self::bookIndexPath();
    if (!file_exists($path)) return [];
    $data = json_decode(file_get_contents($path), true);
    return is_array($data) ? $data : [];
  }

  private static function writeIndex(array $books): void
  {
    $dir = Config::dataDir();
    if (!is_dir($dir)) mkdir($dir, 0755, true);
    file_put_contents(
      self::bookIndexPath(),
      json_encode(array_values($books), JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE)
    );
  }

  // ── book.index ────────────────────────────────

  public static function index(): array
  {
    $books = self::readIndex();
    return array_map(function ($book) {
      $dir      = self::bookDir((int)$book['id']);
      $mtime    = is_dir($dir) ? filemtime($dir) : null;
      $files    = glob($dir . '/*.json') ?: [];
      $chapters = count($files);
      return [
        'id'       => $book['id'],
        'title'    => $book['title'] ?? '',
        'mtime'    => $mtime,
        'chapters' => $chapters,
      ];
    }, $books);
  }

  // ── book.chapters ─────────────────────────────
  // Lists .json files in data/$id/.
  // Enriches each chapter with:
  //   - act: from act.json lookup (empty string if no act entry)
  //   - order: from meta.order (default 99)
  // Sorted by order ASC, then filename ASC.

  public static function chapters(int $id): array
  {
    $dir = self::bookDir($id);
    if (!is_dir($dir)) return [];
    Config::ensureBookDirs($id);

    // ── Serve from cache if fresh ─────────────────
    $cached = Cache::getChapters($id);
    if ($cached !== null) return $cached;

    // ── Cache miss — build from disk ──────────────
    $resolved   = Config::resolveDefaults($id);
    $actDefault = $resolved['act'] ?? 'None';

    $actMap = [];
    foreach (Document::readActIndex($id) as $entry) {
      $actMap[$entry['filename']] = $entry['act'] ?? $actDefault;
    }

    $files    = glob($dir . '/*.json') ?: [];
    $chapters = [];

    foreach ($files as $path) {
      // Skip anything in subdirectories (conf/, cache/, etc.)
      if (dirname($path) !== realpath($dir)) continue;

      $filename = basename($path, '.json');
      $mtime    = filemtime($path);
      $title    = $filename;
      $entries  = 0;
      $order    = 99;
      $act      = $actMap[$filename] ?? $actDefault;

      $raw = @file_get_contents($path);
      if ($raw) {
        $data = json_decode($raw, true);
        if (is_array($data)) {
          if (!empty($data['filename'])) $title = $data['filename'];
          if (isset($data['article']) && is_array($data['article'])) {
            $entries = count($data['article']);
          }
          if (isset($data['meta']['order'])) {
            $order = (int) $data['meta']['order'];
          }
        }
      }

      $chapters[] = [
        'filename' => $filename,
        'title'    => $title,
        'mtime'    => $mtime,
        'entries'  => $entries,
        'act'      => $act,
        'order'    => $order,
      ];
    }

    usort($chapters, function ($a, $b) {
      if ($a['order'] !== $b['order']) return $a['order'] <=> $b['order'];
      return strcmp($a['filename'], $b['filename']);
    });

    // ── Write to cache ────────────────────────────
    Cache::putChapters($id, $chapters);

    return $chapters;
  }

  // ── book.create ───────────────────────────────

  public static function create(string $title): array
  {
    $books  = self::readIndex();

    $maxId = 0;
    foreach ($books as $b) {
      if ((int)$b['id'] > $maxId) $maxId = (int)$b['id'];
    }
    $newId = $maxId + 1;

    $books[] = ['id' => $newId, 'title' => $title];
    self::writeIndex($books);

    $dir = self::bookDir($newId);
    if (!is_dir($dir)) mkdir($dir, 0755, true);
    Config::ensureBookDirs($newId);

    return ['id' => $newId, 'title' => $title];
  }

  // ── book.setActive ─────────────────────────────

  public static function setActive(int $bookId): void
{
    $books = self::readIndex();
    $title = '';
    foreach ($books as $b) {
        if ((int)$b['id'] === $bookId) {
            $title = $b['title'];
            break;
        }
    }
    Config::setActive($bookId, $title);
}

}
