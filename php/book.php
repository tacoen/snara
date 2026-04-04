<?php
/* ─────────────────────────────────────────────────
   book.php — Book & Chapter index handlers

   Actions:
     GET  ?action=book.index           → [{id, title, mtime, chapters}]
     GET  ?action=book.chapters&id=$n  → [{filename, title, mtime, entries}], sorted newest first
     POST ?action=book.create          ← {title}  → {id, title}
     POST ?action=book.setActive       ← {bookId} → {ok}

   Data layout:
     data/
       bookindex.json        — [{id, title}]
       1/                    — book 1 documents
         chapter-name.json
       2/
         …

   bookindex.json is the authoritative list of books.
   Each book directory is named by its integer id.
─────────────────────────────────────────────────── */

class Book {

  // ── Path helpers ──────────────────────────────

  private static function bookIndexPath(): string {
    return Config::dataDir() . '/bookindex.json';
  }

  private static function bookDir(int $id): string {
    return Config::dataDir() . '/' . $id;
  }

  // ── bookindex.json read/write ──────────────────

  public static function readIndex(): array {
    $path = self::bookIndexPath();
    if (!file_exists($path)) return [];
    $data = json_decode(file_get_contents($path), true);
    return is_array($data) ? $data : [];
  }

  private static function writeIndex(array $books): void {
    $dir = Config::dataDir();
    if (!is_dir($dir)) mkdir($dir, 0755, true);
    file_put_contents(
      self::bookIndexPath(),
      json_encode(array_values($books), JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE)
    );
  }

  // ── book.index ────────────────────────────────
  // Returns all books, enriched with mtime and chapter count.

  public static function index(): array {
    $books = self::readIndex();
    return array_map(function($book) {
      $dir      = self::bookDir((int)$book['id']);
      $mtime    = is_dir($dir) ? filemtime($dir) : null;
      $chapters = is_dir($dir)
        ? count(glob($dir . '/*.json') ?: [])
        : 0;
      return [
        'id'       => $book['id'],
        'title'    => $book['title'] ?? '',
        'mtime'    => $mtime,
        'chapters' => $chapters,
      ];
    }, $books);
  }

  // ── book.chapters ─────────────────────────────
  // Lists .json files in data/$id/, sorted by mtime DESC (newest first).

  public static function chapters(int $id): array {
    $dir = self::bookDir($id);
    if (!is_dir($dir)) return [];

    $files = glob($dir . '/*.json') ?: [];

    // Sort by mtime descending (newest first = creation time desc proxy)
    usort($files, fn($a, $b) => filemtime($b) <=> filemtime($a));

    return array_map(function($path) {
      $filename = basename($path, '.json');
      $mtime    = filemtime($path);

      // Try to extract title and entry count from the saved JSON
      $title   = $filename;
      $entries = 0;
      $raw = @file_get_contents($path);
      if ($raw) {
        $data = json_decode($raw, true);
        if (is_array($data)) {
          if (!empty($data['filename'])) $title = $data['filename'];
          if (isset($data['article']) && is_array($data['article'])) {
            $entries = count($data['article']);
          }
        }
      }

      return [
        'filename' => $filename,
        'title'    => $title,
        'mtime'    => $mtime,
        'entries'  => $entries,
      ];
    }, $files);
  }

  // ── book.create ───────────────────────────────
  // Appends a new book to bookindex.json, creates the directory.

  public static function create(string $title): array {
    $books  = self::readIndex();

    // Auto-increment id
    $maxId = 0;
    foreach ($books as $b) {
      if ((int)$b['id'] > $maxId) $maxId = (int)$b['id'];
    }
    $newId = $maxId + 1;

    $books[] = ['id' => $newId, 'title' => $title];
    self::writeIndex($books);

    // Create book directory
    $dir = self::bookDir($newId);
    if (!is_dir($dir)) mkdir($dir, 0755, true);

    return ['id' => $newId, 'title' => $title];
  }

  // ── book.setActive ─────────────────────────────
  // Persists the active book choice into config.json so it
  // survives a page refresh.

  public static function setActive(int $bookId): void {
    $books = self::readIndex();
    $title = '';
    foreach ($books as $b) {
      if ((int)$b['id'] === $bookId) { $title = $b['title']; break; }
    }
    Config::set([
      'activeBookId'    => $bookId,
      'activeBookTitle' => $title,
    ]);
  }
}