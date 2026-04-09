<?php
/* ─────────────────────────────────────────────────
   php/editor-pref.php — per-book editor preferences
   Stored in data/$bookId/conf/editor.json

   Shape:
   {
     "font":    "var(--font-serif)",
     "act":     { "bg": "var(--tag-act-bg)",     "border": "var(--tag-act-fg)"     },
     "chapter": { "bg": "var(--tag-chapter-bg)", "border": "var(--tag-chapter-fg)" },
     "scene":   { "bg": "var(--tag-scene-bg)",   "border": "var(--tag-scene-fg)"   },
     "beat":    { "bg": "transparent",            "border": "var(--tag-draft-fg)"   },
     "article": { "bg": "transparent",            "border": "var(--tag-chapter-bd)" }
   }

   Actions (registered in router.php):
     GET  ?action=editorpref.get&bookId=$n  → shape above
     POST ?action=editorpref.set&bookId=$n  ← shape above → {ok:true}
─────────────────────────────────────────────────── */

class EditorPref {

  // ── Allowed CSS value tokens ──────────────────
  // Only var(--*) references and 'transparent' are accepted.
  // Prevents CSS injection.

  private static function safeValue(string $v): string {
    $v = trim($v);
    if ($v === 'transparent') return $v;
    if (preg_match('/^var\(--[a-z0-9\-]+\)$/', $v)) return $v;
    return 'transparent';   // reject anything else
  }

  private static function path(int $bookId): string {
    return Config::dataDir() . '/' . $bookId . '/conf/editor.json';
  }

  // ── Defaults ──────────────────────────────────

  public static function defaults(): array {
    return [
      'font'    => 'var(--font-sans)',
      'act'     => ['bg' => 'transparent', 'border' => 'var(--tag-act-fg)'    ],
      'chapter' => ['bg' => 'transparent', 'border' => 'var(--tag-chapter-fg)'],
      'scene'   => ['bg' => 'transparent', 'border' => 'var(--tag-scene-fg)'  ],
      'beat'    => ['bg' => 'transparent', 'border' => 'var(--tag-draft-fg)'  ],
      // ── #article container — color-theory derived ──
      // Primary   = act  (amber)   Secondary = chapter (coral)
      // Tertiary  = scene (mint)
      'article' => ['bg' => 'transparent', 'border' => 'var(--tag-chapter-bd)'],
    ];
  }

  // ── Get ───────────────────────────────────────

  public static function get(int $bookId): array {
    $path = self::path($bookId);
    if (!file_exists($path)) return self::defaults();
    $data = json_decode(file_get_contents($path), true);
    if (!is_array($data)) return self::defaults();
    // Merge with defaults so missing keys are always present.
    // array_replace_recursive means old editor.json files without
    // the 'article' key will silently get the default values.
    return array_replace_recursive(self::defaults(), $data);
  }

  // ── Set ───────────────────────────────────────

  public static function set(int $bookId, array $data): void {
    $allowed = ['act', 'chapter', 'scene', 'beat'];

    $clean = [];

    // Font — only the three known stacks are accepted
    $clean['font'] = preg_match('/^var\(--font-[a-z]+\)$/', $data['font'] ?? '')
      ? $data['font']
      : 'var(--font-sans)';

    // Entry tag bg + border
    foreach ($allowed as $tag) {
      $raw = $data[$tag] ?? [];
      $clean[$tag] = [
        'bg'     => self::safeValue($raw['bg']     ?? 'transparent'),
        'border' => self::safeValue($raw['border'] ?? 'transparent'),
      ];
    }

    // Article container bg + border (color-theory)
    $rawArt = $data['article'] ?? [];
    $clean['article'] = [
      'bg'     => self::safeValue($rawArt['bg']     ?? 'transparent'),
      'border' => self::safeValue($rawArt['border'] ?? 'var(--tag-chapter-bd)'),
    ];

    $dir = dirname(self::path($bookId));
    if (!is_dir($dir)) mkdir($dir, 0755, true);

    file_put_contents(
      self::path($bookId),
      json_encode($clean, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE)
    );
  }
}