<?php
/* ─────────────────────────────────────────────────
   php/notes.php — global notes persistence

   Storage: data/notes.json  (not per-book)
   Shape:   [ { id, title, body, updatedAt }, … ]

   Actions (router.php):
     GET  ?action=notes.list → Note[]
     POST ?action=notes.save ← Note[] → { ok }
─────────────────────────────────────────────────── */

class Notes
{
    private static function path(): string
    {
        return Config::dataDir() . '/notes.json';
    }

    public static function list(): array
    {
        $path = self::path();
        if (!file_exists($path)) return [];

        $data = json_decode((string) file_get_contents($path), true);
        return is_array($data) ? $data : [];
    }

    public static function save(array $notes): void
    {
        $path = self::path();
        $dir  = dirname($path);
        if (!is_dir($dir)) mkdir($dir, 0755, true);

        // Sanitise each entry — never trust the client
        $clean = array_map(function (array $n): array {
            return [
                'id'        => substr(preg_replace('/[^a-zA-Z0-9_\-]/', '', (string)($n['id']        ?? '')), 0, 32),
                'title'     => substr((string)($n['title']     ?? 'Untitled'), 0, 500),
                'body'      => substr((string)($n['body']      ?? ''),        0, 100_000),
                'updatedAt' => substr((string)($n['updatedAt'] ?? date('c')), 0, 30),
            ];
        }, array_values($notes));

        $json = json_encode($clean, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        if ($json === false || file_put_contents($path, $json, LOCK_EX) === false) {
            throw new RuntimeException('Failed to write notes.json');
        }
    }
}