<?php
/* ─────────────────────────────────────────────────
   php/ai.php — AiChat handler (now using Groq)
   Called by Router via: POST ?action=ai.chat
   Body: { "message": "..." }
   Proxies to Groq's OpenAI-compatible API
─────────────────────────────────────────────────── */
class AiChat {
    // ── Groq API config ─────────────────────────────
    private static string $apiUrl = 'https://api.groq.com/openai/v1/chat/completions';
    
    // ←←← REPLACE WITH YOUR OWN GROQ KEY ←←←
    private static string $apiKey = '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';
    
    // Recommended models (choose one):
    // - llama-3.3-70b-versatile     → best quality/reasoning (recommended)
    // - llama-3.1-8b-instant        → faster & lighter
    // - openai/gpt-oss-120b         → another strong option
    private static string $model = 'llama-3.3-70b-versatile';

    // ── Public: called by Router ──────────────────
    /**
     * @param string $message The full prompt (preprompt + user text)
     * @return array Decoded API response, forwarded as-is
     */
    public static function chat(string $message): array {
        if ($message === '') {
            return ['error' => 'Message cannot be empty'];
        }

        $payload = json_encode([
            'model' => self::$model,
            'messages' => [
                ['role' => 'user', 'content' => $message],
            ],
            // Optional useful parameters:
            // 'temperature' => 0.7,
            // 'max_tokens'  => 1024,
        ]);

        $ch = curl_init(self::$apiUrl);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_POST => true,
            CURLOPT_HTTPHEADER => [
                'Content-Type: application/json',
                'Authorization: Bearer ' . self::$apiKey,
            ],
            CURLOPT_POSTFIELDS => $payload,
            CURLOPT_TIMEOUT => 60,           // Groq is very fast, but give it some room
        ]);

        $raw = curl_exec($ch);
        $errno = curl_errno($ch);
        $error = curl_error($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        if ($errno) {
            return ['error' => 'cURL error ' . $errno . ': ' . $error];
        }

        if ($httpCode >= 400) {
            return [
                'error' => 'Groq API error (HTTP ' . $httpCode . ')',
                'raw_response' => $raw
            ];
        }

        $decoded = json_decode($raw, true);
        if (!is_array($decoded)) {
            return ['error' => 'Invalid JSON from Groq API'];
        }

        return $decoded;
    }
}