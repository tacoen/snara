<?php
/* ─────────────────────────────────────────────────
   state.php — per-book chapter state persistence
   Stores { filename: state } in data/$bookId/cache/states.json

   States:
     unlock  — default, chapter is editable / loadable
     lock    — chapter is locked, click to open blocked
     delete  — marked for deletion (visual flag, no actual delete)

   Actions:
     GET  ?action=state.get&bookId=$n       → { states: { filename: state, … } }
     POST ?action=state.set                 ← { bookId, filename, state }
─────────────────────────────────────────────────── */

class ChapterState {

  private static function path(int $bookId): string {
    Config::ensureBookDirs($bookId);
    return Config::dataDir() . '/' . $bookId . '/cache/states.json';
  }

  public static function get(int $bookId): array {
    $path = self::path($bookId);
    if (!file_exists($path)) return [];
    $data = json_decode(file_get_contents($path), true);
    return is_array($data) ? $data : [];
  }

  public static function set(int $bookId, string $filename, string $state): void {
    $allowed = ['unlock', 'lock', 'delete'];
    if (!in_array($state, $allowed, true)) {
      throw new InvalidArgumentException("Invalid state: $state");
    }

    $states = self::get($bookId);

    if ($state === 'unlock') {
      // 'unlock' is the default — remove from store to keep it clean
      unset($states[$filename]);
    } else {
      $states[$filename] = $state;
    }

    file_put_contents(
      self::path($bookId),
      json_encode($states, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE)
    );
  }
}