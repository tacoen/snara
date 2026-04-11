<?php
/* ─────────────────────────────────────────────────
   php/ai.php — AiChat handler

   Called by Router via:
     POST ?action=ai.chat
     Body: { "message": "..." }

   Proxies to the configured external AI API and
   passes the raw JSON response back to the client.
─────────────────────────────────────────────────── */

class AiChat {

    // ── External API config ───────────────────────
    // API key here — or move to json/config.json
    // and load via Config::get()['aiApiKey']

    private static string $apiUrl = 'https://api.poe.com/v1/chat/completions';
    private static string $apiKey = 'sk-poe-nGDCSOhqgzx8ZJ5HHOkUheIxD0pTFRW-85AZUNwDaos';
    private static string $model  = 'snarabot-clm';

    // ── Public: called by Router ──────────────────

    /**
     * @param  string $message  The full prompt (preprompt + user text)
     * @return array            Decoded API response, forwarded as-is
     */
    public static function chat(string $message): array {
        if ($message === '') {
            return ['error' => 'Message cannot be empty'];
        }

        $payload = json_encode([
            'model'    => self::$model,
            'messages' => [
                ['role' => 'user', 'content' => $message],
            ],
        ]);

        $ch = curl_init(self::$apiUrl);

        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_POST           => true,
            CURLOPT_HTTPHEADER     => [
                'Content-Type: application/json',
                'Authorization: Bearer ' . self::$apiKey,
            ],
            CURLOPT_POSTFIELDS     => $payload,
            CURLOPT_TIMEOUT        => 30,
        ]);

        $raw   = curl_exec($ch);
        $errno = curl_errno($ch);
        $error = curl_error($ch);
        curl_close($ch);

        if ($errno) {
            return ['error' => 'cURL error ' . $errno . ': ' . $error];
        }

        $decoded = json_decode($raw, true);

        if (!is_array($decoded)) {
            return ['error' => 'Invalid JSON from upstream API'];
        }

        return $decoded;
    }
}