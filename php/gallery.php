<?php
/* ─────────────────────────────────────────────────
   php/gallery.php — Gallery media management

   Manages data/$bookId/image/ directory.
   Supports images and videos.

   Actions (registered in router.php):
     POST   ?action=gallery.upload&bookId=$n    multipart
     GET    ?action=gallery.list&bookId=$n      list files
     DELETE ?action=gallery.delete&bookId=$n&filename=$f
     POST   ?action=gallery.rename&bookId=$n   ← {from, to}
     GET    ?action=gallery.autocomplete&bookId=$n  → {terms:[]}
─────────────────────────────────────────────────── */

class Gallery {

  private static function dir(int $bookId): string {
    return Config::dataDir() . '/' . $bookId . '/image';
  }

  private static function cacheDir(int $bookId): string {
    return Config::dataDir() . '/' . $bookId . '/cache';
  }

  private static function cacheFile(int $bookId): string {
    return self::cacheDir($bookId) . '/gallery-names.json';
  }

  private static function safeName(string $name): string {
    $name = basename($name);
    $name = preg_replace('/[^a-zA-Z0-9\-_.]/', '-', $name);
    $name = preg_replace('/-+/', '-', $name);
    return $name;
  }

  private static function allowedExt(string $name): bool {
    $ext = strtolower(pathinfo($name, PATHINFO_EXTENSION));
    return in_array($ext, [
      'jpg','jpeg','png','gif','webp','svg','bmp',   // images
      'mp4','webm','mov','ogg','m4v',                // videos
    ], true);
  }

  private static function mimeFor(string $name): string {
    $ext = strtolower(pathinfo($name, PATHINFO_EXTENSION));
    $map = [
      'jpg'  => 'image/jpeg',  'jpeg' => 'image/jpeg',
      'png'  => 'image/png',   'gif'  => 'image/gif',
      'webp' => 'image/webp',  'svg'  => 'image/svg+xml',
      'bmp'  => 'image/bmp',
      'mp4'  => 'video/mp4',   'webm' => 'video/webm',
      'mov'  => 'video/quicktime', 'ogg' => 'video/ogg',
      'm4v'  => 'video/x-m4v',
    ];
    return $map[$ext] ?? 'application/octet-stream';
  }

  // ── Upload ────────────────────────────────────

  public static function upload(int $bookId): array {
    $dir = self::dir($bookId);
    if (!is_dir($dir)) mkdir($dir, 0755, true);

    if (empty($_FILES['file'])) {
      throw new RuntimeException('No file uploaded');
    }

    $file = $_FILES['file'];
    if ($file['error'] !== UPLOAD_ERR_OK) {
      throw new RuntimeException('Upload error code: ' . $file['error']);
    }

    $originalName = $file['name'];
    if (!self::allowedExt($originalName)) {
      throw new RuntimeException('File type not allowed: ' . $originalName);
    }

    $safeName = self::safeName($originalName);
    $dest     = $dir . '/' . $safeName;

    if (file_exists($dest)) {
      $base  = pathinfo($safeName, PATHINFO_FILENAME);
      $ext   = pathinfo($safeName, PATHINFO_EXTENSION);
      $dest  = $dir . '/' . $base . '-' . time() . '.' . $ext;
      $safeName = basename($dest);
    }

    if (!move_uploaded_file($file['tmp_name'], $dest)) {
      throw new RuntimeException('Failed to save file');
    }

    return [
      'filename' => $safeName,
      'size'     => filesize($dest),
      'mime'     => self::mimeFor($safeName),
    ];
  }

  // ── List ──────────────────────────────────────

  public static function list(int $bookId): array {
    $dir = self::dir($bookId);
    if (!is_dir($dir)) return [];

    $exts  = '{jpg,jpeg,png,gif,webp,svg,bmp,mp4,webm,mov,ogg,m4v}';
    $files = glob($dir . '/*.' . $exts, GLOB_BRACE) ?: [];

    $result = [];
    foreach ($files as $path) {
      $name = basename($path);
      $result[] = [
        'filename' => $name,
        'size'     => filesize($path),
        'mime'     => self::mimeFor($name),
        'modified' => filemtime($path),
      ];
    }

    usort($result, fn($a, $b) => $b['modified'] - $a['modified']);
    return $result;
  }

  // ── Delete ────────────────────────────────────

  public static function delete(int $bookId, string $filename): void {
    $dir  = self::dir($bookId);
    $safe = self::safeName($filename);
    $path = $dir . '/' . $safe;

    if (realpath(dirname($path)) !== realpath($dir)) {
      throw new RuntimeException('Invalid filename');
    }
    if (!file_exists($path)) {
      throw new RuntimeException('File not found: ' . $safe);
    }

    unlink($path);
  }

  // ── Rename ────────────────────────────────────

  public static function rename(int $bookId, string $from, string $to): array {
    $dir     = self::dir($bookId);
    $safeFrom = self::safeName($from);
    $srcPath  = $dir . '/' . $safeFrom;

    if (!file_exists($srcPath)) {
      throw new RuntimeException('Source file not found: ' . $safeFrom);
    }

    // Preserve original extension
    $ext     = pathinfo($safeFrom, PATHINFO_EXTENSION);
    $newBase = pathinfo(self::safeName($to), PATHINFO_FILENAME);
    $newName = $newBase . '.' . $ext;
    $dstPath = $dir . '/' . $newName;

    if (file_exists($dstPath)) {
      throw new RuntimeException('A file with that name already exists');
    }

    if (!rename($srcPath, $dstPath)) {
      throw new RuntimeException('Rename failed');
    }

    // Invalidate autocomplete cache
    self::_bustCache($bookId);

    return ['filename' => $newName];
  }

  // ── Autocomplete terms ────────────────────────
  // Collects: character names from meta.characters,
  // chapter titles (first h2/h3), and filenames.
  // Cached in data/$bookId/cache/gallery-names.json

  public static function autocomplete(int $bookId): array {
    $cacheFile = self::cacheFile($bookId);

    // Serve from cache if fresh (< 60s old)
    if (file_exists($cacheFile) && (time() - filemtime($cacheFile)) < 60) {
      $data = json_decode(file_get_contents($cacheFile), true);
      if (is_array($data)) return $data;
    }

    return self::_buildCache($bookId);
  }

  private static function _buildCache(int $bookId): array {
    $docDir = Config::dataDir() . '/' . $bookId;
    $files  = glob($docDir . '/*.json') ?: [];

    $terms = [];

    foreach ($files as $path) {
      if (strpos($path, '/conf/') !== false) continue;

      $raw = @file_get_contents($path);
      if (!$raw) continue;
      $doc = json_decode($raw, true);
      if (!is_array($doc)) continue;

      // Filename (no extension)
      $terms[] = $doc['filename'] ?? basename($path, '.json');

      // meta.characters — comma-separated
      $chars = $doc['meta']['characters'] ?? '';
      if ($chars) {
        foreach (preg_split('/[\s,;\/]+/', $chars) as $c) {
          $c = trim($c);
          if ($c) $terms[] = $c;
        }
      }

      // meta.settings — comma-separated
      $settings = $doc['meta']['settings'] ?? '';
      if ($settings) {
        foreach (preg_split('/[\s,;\/]+/', $settings) as $s) {
          $s = trim($s);
          if ($s) $terms[] = $s;
        }
      }

      // First h2/h3 text from article as chapter title
      $article = $doc['article'] ?? [];
      foreach ($article as $entry) {
        $content = $entry['content'] ?? '';
        if (!$content) continue;
        if (preg_match('/<h[23][^>]*>(.*?)<\/h[23]>/i', $content, $m)) {
          $text = trim(strip_tags($m[1]));
          if ($text) { $terms[] = $text; break; }
        }
      }
    }

    // Deduplicate, sort, remove short terms
    $terms = array_values(array_unique(array_filter($terms, fn($t) => strlen($t) >= 2)));
    sort($terms);

    $result = ['terms' => $terms, 'built' => time()];

    // Write cache
    $cacheDir = self::cacheDir($bookId);
    if (!is_dir($cacheDir)) mkdir($cacheDir, 0755, true);
    file_put_contents(self::cacheFile($bookId), json_encode($result, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));

    return $result;
  }

  private static function _bustCache(int $bookId): void {
    $f = self::cacheFile($bookId);
    if (file_exists($f)) unlink($f);
  }
}