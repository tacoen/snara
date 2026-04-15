<?php
/* ─────────────────────────────────────────────────
   php/import.php — raw file staging for import

   Manages data/$bookId/import/ directory.
   Files are stored as-is (.txt, .md) until the user
   previews and confirms import into doc.save.

   Actions (registered in router.php):
     POST   ?action=import.upload&bookId=$n   multipart file upload
     GET    ?action=import.list&bookId=$n     list staged files
     DELETE ?action=import.delete&bookId=$n&filename=$f  remove one
─────────────────────────────────────────────────── */

class Import
{

  private static function dir(int $bookId): string
  {
    return Config::dataDir() . '/' . $bookId . '/import';
  }

  private static function safeName(string $name): string
  {
    $name = basename($name);
    // Allow letters, numbers, dash, underscore, dot — strip the rest
    $name = preg_replace('/[^a-zA-Z0-9\-_.]/', '-', $name);
    // Collapse multiple dashes
    $name = preg_replace('/-+/', '-', $name);
    return $name;
  }

  private static function allowedExt(string $name): bool
  {
    $ext = strtolower(pathinfo($name, PATHINFO_EXTENSION));
    return in_array($ext, ['txt', 'md'], true);
  }

  // ── Upload ────────────────────────────────────

  public static function upload(int $bookId): array
  {
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
      throw new RuntimeException('Only .txt and .md files are accepted');
    }

    $safeName = self::safeName($originalName);
    $dest     = $dir . '/' . $safeName;

    // Avoid overwriting — append suffix if exists
    if (file_exists($dest)) {
      $base  = pathinfo($safeName, PATHINFO_FILENAME);
      $ext   = pathinfo($safeName, PATHINFO_EXTENSION);
      $dest  = $dir . '/' . $base . '-' . time() . '.' . $ext;
      $safeName = basename($dest);
    }

    if (!move_uploaded_file($file['tmp_name'], $dest)) {
      throw new RuntimeException('Failed to save uploaded file');
    }

    return [
      'filename' => $safeName,
      'size'     => filesize($dest),
      'ext'      => strtolower(pathinfo($safeName, PATHINFO_EXTENSION)),
    ];
  }

  // ── List ──────────────────────────────────────

  public static function list(int $bookId): array
  {
    $dir = self::dir($bookId);
    if (!is_dir($dir)) return [];

    $files = glob($dir . '/*.{txt,md}', GLOB_BRACE) ?: [];
    $result = [];

    foreach ($files as $path) {
      $name    = basename($path);
      $result[] = [
        'filename' => $name,
        'size'     => filesize($path),
        'ext'      => strtolower(pathinfo($name, PATHINFO_EXTENSION)),
        'modified' => filemtime($path),
      ];
    }

    // Sort newest first
    usort($result, fn($a, $b) => $b['modified'] - $a['modified']);

    return $result;
  }

  // ── Delete ────────────────────────────────────

  public static function delete(int $bookId, string $filename): void
  {
    $dir  = self::dir($bookId);
    $safe = self::safeName($filename);
    $path = $dir . '/' . $safe;

    // Ensure path stays within import dir
    if (realpath(dirname($path)) !== realpath($dir)) {
      throw new RuntimeException('Invalid filename');
    }

    if (!file_exists($path)) {
      throw new RuntimeException('File not found: ' . $safe);
    }

    unlink($path);
  }

  // ── Read raw text (for preview) ───────────────

  public static function read(int $bookId, string $filename): string
  {
    $dir  = self::dir($bookId);
    $safe = self::safeName($filename);
    $path = $dir . '/' . $safe;

    if (realpath(dirname($path)) !== realpath($dir)) {
      throw new RuntimeException('Invalid filename');
    }
    if (!file_exists($path)) {
      throw new RuntimeException('File not found: ' . $safe);
    }

    return file_get_contents($path);
  }
}
