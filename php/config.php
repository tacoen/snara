<?php
/* ─────────────────────────────────────────────────
   Config.php — central configuration + path resolver

   Two files:
     json/config.json   — app/infra keys (apiPath, theme, classes…)
     json/default.json  — defaults block ({ defaults: {…} })

   Per-book overrides:
     data/$bookId/conf/default.json — same shape as json/default.json
     Merge: global defaults → book defaults (book wins)

   Public API:
     Config::get()                   → config.json array
     Config::set(array)              → write config.json
     Config::getDefaults()           → merged defaults for active book
     Config::getGlobalDefaults()     → json/default.json defaults block
     Config::setGlobalDefaults(arr)  → write json/default.json
     Config::getBookDefaults(bookId) → data/$bookId/conf/default.json defaults
     Config::setBookDefaults(bookId, arr) → write book conf/default.json
     Config::resolveDefaults(bookId) → global merged with book overrides
─────────────────────────────────────────────────── */

class Config {

  // ── File paths ────────────────────────────────

  private static function configFile(): string {
    return dirname(__DIR__) . '/json/config.json';
  }

  private static function globalDefaultFile(): string {
    return dirname(__DIR__) . '/json/default.json';
  }

  private static function bookDefaultFile(int $bookId): string {
    return self::dataDir() . '/' . $bookId . '/conf/default.json';
  }

  // ── Config cache ──────────────────────────────

  private static array $cache        = [];
  private static array $defaultCache = [];

  // ── config.json ───────────────────────────────

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

    self::$cache = self::configDefaults();
    return self::$cache;
  }

  public static function set(array $data): void {
    $path = self::configFile();
    $dir  = dirname($path);
    if (!is_dir($dir)) mkdir($dir, 0755, true);

    $current = self::get();
    $merged  = array_merge($current, $data);

    file_put_contents($path, json_encode($merged, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
    self::$cache = $merged;
  }

  // ── json/default.json ─────────────────────────

  public static function getGlobalDefaults(): array {
    if (!empty(self::$defaultCache)) return self::$defaultCache;

    $path = self::globalDefaultFile();
    if (file_exists($path)) {
      $data = json_decode(file_get_contents($path), true);
      if (is_array($data) && isset($data['defaults'])) {
        self::$defaultCache = $data['defaults'];
        return self::$defaultCache;
      }
    }

    self::$defaultCache = self::defaultsDefaults();
    return self::$defaultCache;
  }

  public static function setGlobalDefaults(array $defaults): void {
    $path = self::globalDefaultFile();
    $dir  = dirname($path);
    if (!is_dir($dir)) mkdir($dir, 0755, true);

    $current = self::getGlobalDefaults();
    $merged  = array_merge($current, $defaults);

    file_put_contents($path, json_encode(['defaults' => $merged], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
    self::$defaultCache = $merged;
  }

  // ── data/$bookId/default.json ─────────────────

  public static function getBookDefaults(int $bookId): array {
    $path = self::bookDefaultFile($bookId);

    // If per-book file doesn't exist, copy from global default
    if (!file_exists($path)) {
      self::_initBookDefault($bookId);
    }

    $data = json_decode(file_get_contents($path), true);
    if (is_array($data) && isset($data['defaults'])) {
      return $data['defaults'];
    }

    return [];
  }

  public static function setBookDefaults(int $bookId, array $defaults): void {
    $path = self::bookDefaultFile($bookId);
    $dir  = dirname($path);
    if (!is_dir($dir)) mkdir($dir, 0755, true);

    // If book default.json doesn't exist yet, seed it from json/default.json first
    if (!file_exists($path)) {
      self::_initBookDefault($bookId);
    }

    // Merge incoming values over the existing book defaults (global is never touched)
    $current = [];
    $data = json_decode(file_get_contents($path), true);
    if (is_array($data) && isset($data['defaults'])) {
      $current = $data['defaults'];
    }

    $merged = array_merge($current, $defaults);
    file_put_contents($path, json_encode(['defaults' => $merged], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
  }

  // ── Resolved defaults (global ← book override) ─

  public static function resolveDefaults(?int $bookId = null): array {
    $global = self::getGlobalDefaults();
    if (!$bookId) return $global;

    $book = self::getBookDefaults($bookId);
    return array_merge($global, $book);
  }

  // ── Path resolvers ────────────────────────────

  public static function root(): string {
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

  // ── Private helpers ───────────────────────────

  private static function _initBookDefault(int $bookId): void {
    $src = self::globalDefaultFile();
    $dst = self::bookDefaultFile($bookId);
    $dir = dirname($dst);

    if (!is_dir($dir)) mkdir($dir, 0755, true);

    if (file_exists($src)) {
      copy($src, $dst);
    } else {
      file_put_contents($dst, json_encode(
        ['defaults' => self::defaultsDefaults()],
        JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE
      ));
    }
  }

  // ── Book directory scaffolding ───────────────────
  // Creates all required subdirs under data/$bookId/
  // Safe to call multiple times (is_dir checks prevent re-creation).

  public static function ensureBookDirs(int $bookId): void {
    $base = Config::dataDir() . '/' . $bookId;
    $dirs = ['conf', 'image', 'cache', 'import', 'export'];
    foreach ($dirs as $sub) {
      $path = $base . '/' . $sub;
      if (!is_dir($path)) mkdir($path, 0755, true);
    }
  }

  // ── Fallback defaults ─────────────────────────

  public static function configDefaults(): array {
    return [
      'apiPath'         => '/api.php',
      'dataPath'        => '/data',
      'jsonPath'        => '/json',
      'theme'           => 'light',
      'classes'         => ['act', 'chapter', 'scene', 'beat'],
      'headingMap'      => [
        ['prefix' => '#### ', 'cls' => 'beat'],
        ['prefix' => '### ',  'cls' => 'scene'],
        ['prefix' => '## ',   'cls' => 'chapter'],
        ['prefix' => '# ',    'cls' => 'act'],
      ],
      'activeBookId'    => null,
      'activeBookTitle' => '',
    ];
  }

  public static function defaultsDefaults(): array {
    return [
      'act'              => 'None',
      'defaultTag'       => 'beat',
      'autosave'         => true,
      'autosaveInterval' => 30,
      'metaFields'       => ['characters', 'settings', 'prompts'],
    ];
  }
}