<?php
/* ─────────────────────────────────────────────────
   php/kanban.php — Kanban board persistence

   Stores columns + cards in data/$bookId/conf/kanban.json

   Actions (routed by Router::dispatch via router.php):
     GET  ?action=kanban.get&bookId=$n   → [column, …]
     POST ?action=kanban.set&bookId=$n   ← [column, …]  → {ok: true}

   Data layout:
     data/{bookId}/kanban.json
     [
       { "id": "backlog",  "title": "Backlog",         "cards": [ {id, title}, … ] },
       { "id": "research", "title": "Research/Outline", "cards": [] },
       …
     ]
─────────────────────────────────────────────────── */

class Kanban
{

  // ── Default columns for a fresh book ──────────────

  private static function defaults(): array
  {
    return [
      ['id' => 'backlog',   'title' => 'Backlog',          'cards' => []],
      ['id' => 'research',  'title' => 'Research/Outline',  'cards' => []],
      ['id' => 'drafting',  'title' => 'Drafting (WIP)',    'cards' => []],
      ['id' => 'review',    'title' => 'Review/Edit',       'cards' => []],
      ['id' => 'done',      'title' => 'Polished',          'cards' => []],
    ];
  }

  // ── Path helper ────────────────────────────────────

  private static function path(int $bookId): string
  {
    Config::ensureBookDirs($bookId);
    return Config::dataDir() . '/' . $bookId . '/conf/kanban.json';
  }

  // ── kanban.get ─────────────────────────────────────

  public static function get(int $bookId): array
  {
    $path = self::path($bookId);
    if (!file_exists($path)) return self::defaults();

    $data = json_decode(file_get_contents($path), true);
    return (is_array($data) && count($data) > 0) ? $data : self::defaults();
  }

  // ── kanban.set ─────────────────────────────────────

  public static function set(int $bookId, array $columns): void
  {
    // Sanitise: only keep expected keys, strip XSS surface
    $clean = [];
    foreach ($columns as $col) {
      if (!is_array($col)) continue;

      $cards = [];
      foreach ($col['cards'] ?? [] as $card) {
        if (!is_array($card)) continue;
          $desc = [];
        foreach ($card['desc'] ?? [] as $item) {
          if (!is_array($item)) continue;
          $desc[] = [
            'text' => substr(strip_tags((string)($item['text'] ?? '')), 0, 500),
            'done' => (bool)($item['done'] ?? false),
          ];
        }

        $cards[] = [
          'id'         => substr(preg_replace('/[^\w\-]/', '', (string)($card['id']       ?? '')), 0, 64),
          'title'      => substr(strip_tags((string)($card['title']    ?? '')), 0, 120),
          'desc'       => $desc,
          'ref'        => substr(strip_tags((string)($card['ref']      ?? '')), 0, 160),
          'tag'        => substr(preg_replace('/[^\w\-]/', '', (string)($card['tag']      ?? '')), 0, 32),
          'revision'   => substr(strip_tags((string)($card['revision'] ?? '')), 0, 500),
          'references' => array_values(array_filter(array_map(
            fn($r) => is_string($r) ? substr(strip_tags($r), 0, 200) : null,
            $card['references'] ?? []
          ))),
          'revisions'  => array_values(array_filter(array_map(
            fn($r) => is_string($r) ? substr(strip_tags($r), 0, 500) : null,
            $card['revisions'] ?? []
          ))),
        ];
      }

      $clean[] = [
        'id'    => substr(preg_replace('/[^\w\-]/', '', (string)($col['id']    ?? '')), 0, 64),
        'title' => substr(strip_tags((string)($col['title'] ?? '')), 0, 80),
        'cards' => $cards,
      ];
    }

    file_put_contents(
      self::path($bookId),
      json_encode($clean, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE)
    );
  }
}