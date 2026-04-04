<?php
/* ─────────────────────────────────────────────────
   Config.php — central configuration + path resolver

   Single source of truth for all paths and settings.
   All other lib classes call Config::dataDir() etc.
   instead of hardcoding their own paths.

   config.json keys used here:
     dataPath  — where documents are stored   (default: /data)
     jsonPath  — where config.json lives      (default: /json)
     apiPath   — frontend API endpoint        (default: /api.php)
─────────────────────────────────────────────────── */

class Config {

  // ── Config file location ──────────────────────
  // This is the ONE hardcoded path in the entire app.
  // Everything else is derived from config.json.

  private static function configFile(): string {
    return dirname(__DIR__) . '/json/config.json';
  }

  // ── Load & cache ──────────────────────────────

  private static $cache = [];

  public static function get(): array {
    if (!empty(self::$cache)) return self::$cache;

    $path = self::configFile();
    if (file_exists($path)) {
      $data = json_decode(file_get_contents($path), true);
      if (is_array($data)) {
        self::$cache = $data;
        return self::$cache;
      }
    }

    self::$cache = self::defaults();
    return self::$cache;
  }

  public static function set(array $data): void {
    $path = self::configFile();
    $dir  = dirname($path);
    if (!is_dir($dir)) mkdir($dir, 0755, true);

    // Merge over current config so partial updates don't wipe other keys
    $current = self::get();
    $merged  = array_merge($current, $data);

    file_put_contents($path, json_encode($merged, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
    self::$cache = $merged;
  }

  // ── Path resolvers ────────────────────────────
  // All paths in config.json are relative to the project root.
  // These methods resolve them to absolute filesystem paths.

  public static function root(): string {
    // Project root = one level above php/
    return dirname(__DIR__);
  }

  public static function dataDir(): string {
    $rel = self::get()['dataPath'] ?? '/data';
    return self::root() . '/' . ltrim($rel, '/');
  }

  public static function jsonDir(): string {
    $rel = self::get()['jsonPath'] ?? '/json';
    return self::root() . '/' . ltrim($rel, '/');
  }

  // ── Defaults ──────────────────────────────────

  public static function defaults(): array {
    return [
      'apiPath'          => '/api.php',
      'dataPath'         => '/data',
      'jsonPath'         => '/json',
      'theme'            => 'light',
      'defaultTag'       => 'beat',
      'autosave'         => true,
      'autosaveInterval' => 30,
      'metaFields'       => ['characters', 'settings', 'prompts'],
      'classes'          => ['act', 'chapter', 'scene', 'beat'],
      'headingMap'       => [
        ['prefix' => '#### ', 'cls' => 'beat'],
        ['prefix' => '### ',  'cls' => 'scene'],
        ['prefix' => '## ',   'cls' => 'chapter'],
        ['prefix' => '# ',    'cls' => 'act'],
      ],
    ];
  }
}