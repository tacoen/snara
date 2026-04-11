<?php
/* ─────────────────────────────────────────────────
   php/ai.php — AI Chat handler
   Config lives in json/ai.json — edit that
   file to set your key, URL, and model.
─────────────────────────────────────────────────── */

class AiChat {

    private static function confPath(): string {
        return __DIR__ . '/../json/ai.json';
    }

    private static function conf(): array {
        $path = self::confPath();
        if (!file_exists($path)) {
            throw new RuntimeException('AI not configured — create json/ai.json');
        }
        $data = json_decode(file_get_contents($path), true);
        if (!is_array($data)) {
            throw new RuntimeException('json/ai.json is malformed');
        }
        return $data;
    }

    public static function chat(string $message): array {
        if ($message === '') return ['error' => 'Message cannot be empty'];

        $conf  = self::conf();
        $url   = $conf['url']   ?? '';
        $model = $conf['model'] ?? '';
        $key   = $conf['key']   ?? '';

        if (!$url || !$key) return ['error' => 'AI not configured'];

        $payload = json_encode([
            'model'    => $model,
            'messages' => [['role' => 'user', 'content' => $message]],
        ]);

        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_POST           => true,
            CURLOPT_HTTPHEADER     => [
                'Content-Type: application/json',
                'Authorization: Bearer ' . $key,
            ],
            CURLOPT_POSTFIELDS => $payload,
            CURLOPT_TIMEOUT    => 60,
        ]);

        $raw      = curl_exec($ch);
        $errno    = curl_errno($ch);
        $error    = curl_error($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        if ($errno)           return ['error' => 'cURL error ' . $errno . ': ' . $error];
        if ($httpCode >= 400) return ['error' => 'AI API error (HTTP ' . $httpCode . ')', 'raw_response' => $raw];

        $decoded = json_decode($raw, true);
        return is_array($decoded) ? $decoded : ['error' => 'Invalid JSON from AI API'];
    }

    // Safe payload for the frontend — key is never included
    public static function get(): array {
        try {
            $conf = self::conf();
        } catch (RuntimeException $e) {
            return ['url' => '', 'model' => '', 'key_set' => false];
        }
        return [
            'url'     => $conf['url']   ?? '',
            'model'   => $conf['model'] ?? '',
            'key_set' => !empty($conf['key']),
        ];
    }

    // Saves url + model only — key is intentionally never overwritten from the UI
    public static function set(array $body): void {
        try {
            $conf = self::conf();
        } catch (RuntimeException $e) {
            $conf = [];
        }
        if (isset($body['url']))   $conf['url']   = trim((string) $body['url']);
        if (isset($body['model'])) $conf['model'] = trim((string) $body['model']);
        file_put_contents(self::confPath(), json_encode($conf, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES));
    }
}