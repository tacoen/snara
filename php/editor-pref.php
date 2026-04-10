<?php
/* ─────────────────────────────────────────────────
   php/editor-pref.php — per-book editor preferences
   Stored in data/$bookId/conf/editor.json

   Shape saved/returned:
   {
     "font":    "var(--font-serif)",
     "act":     { "bg": "#fbca33",    "border": "#aa6600" },
     "chapter": { "bg": "transparent","border": "#993c1d" },
     "scene":   { "bg": "transparent","border": "#0f6e56" },
     "beat":    { "bg": "transparent","border": "#3c3489" }
   }

   Accepted color values:
     transparent
     var(--any-css-custom-property)
     #rgb  #rrggbb  #rrggbbaa

   Actions:
     GET  ?action=editorpref.get&bookId=$n
     POST ?action=editorpref.set&bookId=$n
─────────────────────────────────────────────────── */

class EditorPref {

  private static function safeValue(string $v): string {
    $v = trim($v);
    if ($v === 'transparent')                                return $v;
    if (preg_match('/^var\(--[a-z0-9\-]+\)$/', $v))         return $v;
    if (preg_match('/^#[0-9a-fA-F]{3,8}$/', $v))            return $v;
    return 'transparent';
  }

  private static function path(int $bookId): string {
    return Config::dataDir() . '/' . $bookId . '/conf/editor.json';
  }

  public static function defaults(): array {
    return [
      'font'    => 'var(--font-sans)',
      'act'     => ['bg' => 'transparent', 'border' => 'var(--tag-act-fg)'    ],
      'chapter' => ['bg' => 'transparent', 'border' => 'var(--tag-chapter-fg)'],
      'scene'   => ['bg' => 'transparent', 'border' => 'var(--tag-scene-fg)'  ],
      'beat'    => ['bg' => 'transparent', 'border' => 'var(--tag-draft-fg)'  ],
    ];
  }

  public static function get(int $bookId): array {
    $path = self::path($bookId);
    if (!file_exists($path)) return self::defaults();
    $data = json_decode(file_get_contents($path), true);
    if (!is_array($data)) return self::defaults();
    return array_replace_recursive(self::defaults(), $data);
  }

  public static function set(int $bookId, array $data): void {
    $allowed = ['act', 'chapter', 'scene', 'beat'];
    $clean   = [];

    $clean['font'] = preg_match('/^var\(--font-[a-z]+\)$/', $data['font'] ?? '')
      ? $data['font']
      : 'var(--font-sans)';

    foreach ($allowed as $tag) {
      $raw = $data[$tag] ?? [];
      $clean[$tag] = [
        'bg'     => self::safeValue($raw['bg']     ?? 'transparent'),
        'border' => self::safeValue($raw['border'] ?? 'transparent'),
      ];
    }

    $dir = dirname(self::path($bookId));
    if (!is_dir($dir)) mkdir($dir, 0755, true);

    file_put_contents(
      self::path($bookId),
      json_encode($clean, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE)
    );
  }
}