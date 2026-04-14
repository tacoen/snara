<?php
/* ─────────────────────────────────────────────────
   php/pref.php — CSS variable persistence
   Stores { root:{}, light:{}, dark:{} } in json/cssvars.json.

   Actions (registered in router.php):
     GET  ?action=pref.get   → { root:{}, light:{}, dark:{} }
     POST ?action=pref.set   ← { root:{}, light:{}, dark:{} }
                             → { ok: true }
─────────────────────────────────────────────────── */

class Pref {

  private static function file(): string {
    return Config::root() . '/json/cssvars.json';
  }

  /** Sanitize one scope map: only allow CSS custom properties, sane lengths */
  private static function sanitizeScope(array $map): array {
    $out = [];
    foreach ($map as $name => $value) {
      $name  = trim((string) $name);
      $value = trim((string) $value);
      if (strpos($name, '--') !== 0) continue;  // must start with --
      if (strlen($name)  > 80)       continue;
      if (strlen($value) > 120)      continue;
      $out[$name] = $value;
    }
    return $out;
  }

  public static function get(): array {
    $path = self::file();
    if (!file_exists($path)) return ['root' => [], 'light' => [], 'dark' => []];
    $data = json_decode(file_get_contents($path), true);
    if (!is_array($data)) return ['root' => [], 'light' => [], 'dark' => []];
    return [
      'root'  => $data['root']  ?? [],
      'light' => $data['light'] ?? [],
      'dark'  => $data['dark']  ?? [],
    ];
  }


public static function set(): void {
  $css = file_get_contents('php://input');
  if (!$css) return;

  $path = Config::root() . '/data/custom.css';
  $dir  = dirname($path);
  if (!is_dir($dir)) mkdir($dir, 0755, true);

  file_put_contents($path, $css);
}

  public static function OLDset(array $data): void {
    $clean = [
      'root'  => self::sanitizeScope($data['root']  ?? []),
      'light' => self::sanitizeScope($data['light'] ?? []),
      'dark'  => self::sanitizeScope($data['dark']  ?? []),
    ];

    $dir = dirname(self::file());
    if (!is_dir($dir)) mkdir($dir, 0755, true);

    file_put_contents(
      self::file(),
      json_encode($clean, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE)
    );
  }
}