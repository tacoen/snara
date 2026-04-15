<?php
/* ─────────────────────────────────────────────────
   php/chatlog.php — AI chatlog persistence helper

   Storage:  data/{bookId}/cache/chatlog.json
   Called by: Router via ?action=chatlog.*

   Actions (registered in router.php):
     GET    ?action=chatlog.get&bookId=$n   → { log: [...] }
     POST   ?action=chatlog.save&bookId=$n  → { ok, entry }
     DELETE ?action=chatlog.clear&bookId=$n → { ok }
─────────────────────────────────────────────────── */

class Chatlog
{
    /** Maximum entries kept per chatlog (prevents unbounded growth). */
    private const MAX_ENTRIES = 500;

    /** Allowed roles for validation. */
    private const ALLOWED_ROLES = ['user', 'ai'];

    // ── Path resolver ──────────────────────────────

    private static function path(int $bookId): string
    {
        return Config::dataDir() . '/chatlog.json';
    }

    // ── Read ───────────────────────────────────────

    /**
     * Load the full chatlog for a book.
     * Returns an empty array if the file does not exist or is corrupt.
     */
    public static function get(int $bookId): array
    {
        $path = self::path($bookId);

        if (!file_exists($path)) {
            return [];
        }

        $data = json_decode((string) file_get_contents($path), true);

        return is_array($data) ? $data : [];
    }

    // ── Append ─────────────────────────────────────

    /**
     * Validate and append one entry to the chatlog.
     *
     * @param  int   $bookId
     * @param  array $raw    Decoded JSON body from the request
     * @return array         The sanitised, stored entry
     * @throws InvalidArgumentException on validation failure
     */
    public static function save(int $bookId, array $raw): array
    {
        // ── Validate required fields ───────────────
        foreach (['id', 'role', 'content'] as $field) {
            if (empty($raw[$field]) || !is_string($raw[$field])) {
                throw new InvalidArgumentException(
                    "Missing or empty required field: \"{$field}\"."
                );
            }
        }

        if (!in_array($raw['role'], self::ALLOWED_ROLES, true)) {
            throw new InvalidArgumentException(
                'Invalid role. Allowed: ' . implode(', ', self::ALLOWED_ROLES) . '.'
            );
        }

        // ── Sanitise ───────────────────────────────
        $entry = [
            'id'        => substr(preg_replace('/[^a-zA-Z0-9_\-]/', '', $raw['id']), 0, 32),
            'role'      => $raw['role'],
            'content'   => substr((string) $raw['content'], 0, 20_000),
            'label'     => substr(
                (string) ($raw['label'] ?? mb_substr($raw['content'], 0, 30)),
                0,
                50
            ),
            'timestamp' => (
                isset($raw['timestamp']) && is_string($raw['timestamp'])
                ? substr($raw['timestamp'], 0, 30)
                : date('c')
            ),
        ];

        // ── Write ──────────────────────────────────
        $path = self::path($bookId);
        Config::ensureBookDirs($bookId);          // creates data/$bookId/cache/ if absent

        $log   = self::get($bookId);
        $log[] = $entry;

        // Cap at MAX_ENTRIES (drop oldest)
        if (count($log) > self::MAX_ENTRIES) {
            $log = array_slice($log, -self::MAX_ENTRIES);
        }

        self::write($path, $log);

        return $entry;
    }

    // ── Clear ──────────────────────────────────────

    /**
     * Truncate the chatlog to an empty array.
     */
    public static function clear(int $bookId): void
    {
        $path = self::path($bookId);
        Config::ensureBookDirs($bookId);
        self::write($path, []);
    }

    // ── Internal write ─────────────────────────────

    private static function write(string $path, array $data): void
    {
        $json = json_encode(
            $data,
            JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES
        );

        if ($json === false || file_put_contents($path, $json, LOCK_EX) === false) {
            throw new RuntimeException('Failed to write chatlog to disk.');
        }
    }
}
