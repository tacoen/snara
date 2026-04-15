<?php
/* ─────────────────────────────────────────────────
   php/pref.php — CSS variable persistence
   Saves raw CSS to data/custom.css.

   Actions:
     GET  ?action=pref.get   → raw CSS text
     POST ?action=pref.set   ← raw CSS body → { ok: true }
─────────────────────────────────────────────────── */

class Pref
{

  private static function file(): string
  {
    return Config::root() . '/data/custom.css';
  }

  public static function get(): string
  {
    $path = self::file();
    if (!file_exists($path)) return '';
    return file_get_contents($path);
  }

  public static function set(): void
  {
    $css = file_get_contents('php://input');
    if (!$css) return;

    $dir = dirname(self::file());
    if (!is_dir($dir)) mkdir($dir, 0755, true);

    file_put_contents(self::file(), $css);
  }
}
