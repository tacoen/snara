<?php
/* -------------------------------------------------
   php/fileman.php — General file manager

   Manages data/$bookId/files/ directory.
   Accepts any file type on upload.
   Supports inline read/save for .txt and .md files.

   Actions (registered in router.php):
     GET    ?action=fileman.list&bookId=$n
     POST   ?action=fileman.upload&bookId=$n         multipart
     DELETE ?action=fileman.delete&bookId=$n&filename=$f
     POST   ?action=fileman.rename&bookId=$n         <- {from, to}
     POST   ?action=fileman.save                     <- {bookId, filename, content}
------------------------------------------------- */

class FileMan
{

    private static function dir(int $bookId): string
    {
        return Config::dataDir() . '/' . $bookId . '/files';
    }

    // Strips path traversal, collapses dashes.
    // Does NOT strip the extension — all types accepted.
    private static function safeName(string $name): string
    {
        $name = basename($name);
        $name = preg_replace('/[^a-zA-Z0-9\-_.]/', '-', $name);
        $name = preg_replace('/-+/', '-', $name);
        return $name;
    }

    private static function mimeFor(string $name): string
    {
        $ext = strtolower(pathinfo($name, PATHINFO_EXTENSION));
        $map = [
            'txt'  => 'text/plain',
            'md'   => 'text/markdown',
            'json' => 'application/json',
            'pdf'  => 'application/pdf',
            'jpg'  => 'image/jpeg',
            'jpeg' => 'image/jpeg',
            'png'  => 'image/png',
            'gif'  => 'image/gif',
            'webp' => 'image/webp',
            'svg'  => 'image/svg+xml',
            'mp4'  => 'video/mp4',
            'webm' => 'video/webm',
            'zip'  => 'application/zip',
            'csv'  => 'text/csv',
        ];
        return $map[$ext] ?? 'application/octet-stream';
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

        $safeName = self::safeName($file['name']);
        if ($safeName === '' || $safeName === '.') {
            throw new RuntimeException('Invalid filename');
        }

        $dest = $dir . '/' . $safeName;

        // Avoid overwriting — append timestamp suffix
        if (file_exists($dest)) {
            $base  = pathinfo($safeName, PATHINFO_FILENAME);
            $ext   = pathinfo($safeName, PATHINFO_EXTENSION);
            $suffix = $ext !== '' ? '-' . time() . '.' . $ext : '-' . time();
            $dest     = $dir . '/' . $base . $suffix;
            $safeName = basename($dest);
        }

        if (!move_uploaded_file($file['tmp_name'], $dest)) {
            throw new RuntimeException('Failed to save uploaded file');
        }

        return [
            'filename' => $safeName,
            'size'     => filesize($dest),
            'mime'     => self::mimeFor($safeName),
            'mtime'    => filemtime($dest),
        ];
    }

    // ── List ──────────────────────────────────────

    public static function list(int $bookId): array
    {
        $dir = self::dir($bookId);
        if (!is_dir($dir)) return [];

        $paths  = glob($dir . '/*') ?: [];
        $result = [];

        foreach ($paths as $path) {
            if (!is_file($path)) continue;
            $name     = basename($path);
            $result[] = [
                'filename' => $name,
                'size'     => filesize($path),
                'mime'     => self::mimeFor($name),
                'mtime'    => filemtime($path),
            ];
        }

        // Newest first
        usort($result, fn($a, $b) => $b['mtime'] - $a['mtime']);

        return ['files' => $result];
    }

    // ── Delete ────────────────────────────────────

    public static function delete(int $bookId, string $filename): void
    {
        $dir  = self::dir($bookId);
        $safe = self::safeName($filename);
        $path = $dir . '/' . $safe;

        // Confirm resolved path stays within files dir
        $realDir  = realpath($dir);
        $realPath = realpath($path);

        if ($realDir === false) {
            throw new RuntimeException('Files directory does not exist');
        }
        if ($realPath === false || strpos($realPath, $realDir . DIRECTORY_SEPARATOR) !== 0) {
            throw new RuntimeException('Invalid filename');
        }
        if (!file_exists($path)) {
            throw new RuntimeException('File not found: ' . $safe);
        }

        unlink($path);
    }

    // ── Rename ────────────────────────────────────
    // User supplies new basename only; extension is preserved from source.

    public static function rename(int $bookId, string $from, string $to): array
    {
        $dir      = self::dir($bookId);
        $safeFrom = self::safeName($from);
        $srcPath  = $dir . '/' . $safeFrom;

        if (!file_exists($srcPath)) {
            throw new RuntimeException('Source file not found: ' . $safeFrom);
        }

        $ext     = pathinfo($safeFrom, PATHINFO_EXTENSION);
        $newBase = pathinfo(self::safeName($to), PATHINFO_FILENAME);
        $newName = $ext !== '' ? $newBase . '.' . $ext : $newBase;
        $dstPath = $dir . '/' . $newName;

        if (file_exists($dstPath)) {
            throw new RuntimeException('A file named "' . $newName . '" already exists');
        }

        if (!rename($srcPath, $dstPath)) {
            throw new RuntimeException('Rename failed');
        }

        return [
            'filename' => $newName,
            'mime'     => self::mimeFor($newName),
            'mtime'    => filemtime($dstPath),
        ];
    }

    // ── Save (inline text edit) ───────────────────
    // Only permits writing back to files/ dir.
    // Accepts any content but only meaningful for text files.

    public static function save(int $bookId, string $filename, string $content): void
    {
        $dir  = self::dir($bookId);
        if (!is_dir($dir)) mkdir($dir, 0755, true);

        $safe = self::safeName($filename);
        if ($safe === '' || $safe === '.') {
            throw new RuntimeException('Invalid filename');
        }

        $path = $dir . '/' . $safe;

        // Path traversal guard — realpath on dir is sufficient since
        // $path is constructed from $dir + safe basename.
        if (realpath($dir) === false) {
            // Dir was just created above, construct manually
            $realDir = $dir;
        } else {
            $realDir = realpath($dir);
        }

        if (file_put_contents($path, $content) === false) {
            throw new RuntimeException('Failed to write file: ' . $safe);
        }
    }
}