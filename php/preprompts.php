<?php
/* php/preprompts.php — Pre-prompt list manager

   Source file (read-only): json/preprompts.json
   User copy (writable):    data/preprompts.json

   Locked labels — value is editable, label and deletion are not:
     'Characters', 'Summarize'

   Actions:
     GET    ?action=preprompts.get    -> array of {label, value}
     POST   ?action=preprompts.set   <- [{label, value}, ...]
     DELETE ?action=preprompts.reset -> deletes data copy, falls back to source
*/

class Preprompts
{
    const LOCKED = ['Characters', 'Summarize'];

    private static function sourcePath(): string
    {
        return Config::root() . '/json/preprompts.json';
    }

    private static function userPath(): string
    {
        return Config::dataDir() . '/preprompts.json';
    }

    private static function readFile(string $path): array
    {
        if (!file_exists($path)) return [];
        $raw = file_get_contents($path);
        $data = json_decode($raw, true);
        return is_array($data) ? $data : [];
    }

    // Returns user copy if it exists, else falls back to source file.
    public static function get(): array
    {
        $userPath = self::userPath();
        if (file_exists($userPath)) {
            return self::readFile($userPath);
        }
        return self::readFile(self::sourcePath());
    }

    // Validates and writes the list to data/preprompts.json.
    // Locked label names are preserved from the existing list; only their values may change.
    // Unlocked items may have any label/value as long as both are non-empty strings.
    public static function set(array $items): void
    {
        if (empty($items)) {
            throw new InvalidArgumentException('Preprompts list cannot be empty');
        }

        $existing = self::get();

        // Index locked items from the existing list by label for value lookup.
        $lockedMap = [];
        foreach ($existing as $row) {
            $label = trim($row['label'] ?? '');
            if (in_array($label, self::LOCKED, true)) {
                $lockedMap[$label] = $row;
            }
        }

        $clean = [];

        foreach ($items as $row) {
            if (!is_array($row)) continue;

            $label = trim($row['label'] ?? '');
            $value = trim($row['value'] ?? '');

            if ($label === '' || $value === '') continue;

            if (in_array($label, self::LOCKED, true)) {
                // Locked: accept only the value update, never rename or drop the row.
                $clean[] = ['label' => $label, 'value' => $value];
                unset($lockedMap[$label]); // mark as seen
            } else {
                $clean[] = ['label' => $label, 'value' => $value];
            }
        }

        // Re-append any locked rows that were missing from the submitted list
        // (client should never drop them, but defend here anyway).
        foreach ($lockedMap as $label => $row) {
            $clean[] = $row;
        }

        $dir = Config::dataDir();
        if (!is_dir($dir)) mkdir($dir, 0755, true);

        file_put_contents(
            self::userPath(),
            json_encode($clean, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE)
        );
    }

    // Deletes data/preprompts.json so next get() returns the source file.
    public static function reset(): void
    {
        $path = self::userPath();
        if (file_exists($path)) unlink($path);
    }
}