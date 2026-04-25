<?php
/* query.php — Query class: search paragraphs across a book, persist results.

   Actions (via router):
     GET  ?action=query.search&bookId=$n&query=$q
     POST ?action=query.build           <- {bookId, query, remove:[id,...]}

   Saved results:
     data/$bookId/saved/{slug}-search.json
     Shape: { "query": "...", "results": [ {id, filename, class, content}, ... ] }

   Dedup key: md5(filename . rawContent) — exact string match, one char diff = new entry.
   Chapter order: resolved from data/$bookId/cache/chapters.json when available.
*/

class Query
{
    // ── Path helpers ──────────────────────────────

    private static function savedDir(int $bookId): string
    {
        return Config::dataDir() . "/" . $bookId . "/saved";
    }

    private static function savedPath(int $bookId, string $slug): string
    {
        return self::savedDir($bookId) . "/" . $slug . "-search.json";
    }

    private static function slug(string $query): string
    {
        return preg_replace("/[^a-z0-9]+/", "-", strtolower(trim($query)));
    }

    // ── Chapter order map ─────────────────────────
    // Returns [filename => order] from cache/chapters.json, or empty array.

    private static function chapterOrder(int $bookId): array
    {
        $path = Config::dataDir() . "/" . $bookId . "/cache/chapters.json";
        if (!file_exists($path)) {
            return [];
        }

        $raw = @file_get_contents($path);
        if (!$raw) {
            return [];
        }

        $data = json_decode($raw, true);
        // cache shape: {"built":...,"chapters":[{filename,order,...}]}
        $list =
            $data["chapters"] ??
            (is_array($data) && isset($data[0]) ? $data : []);

        $map = [];
        foreach ($list as $ch) {
            if (isset($ch["filename"])) {
                $map[$ch["filename"]] = (int) ($ch["order"] ?? 99);
            }
        }
        return $map;
    }

    // ── Highlight keyword in HTML string ──────────

    private static function highlight(string $html, string $query): string
    {
        return preg_replace(
            "/(" . preg_quote($query, "/") . ")/i",
            "<b class='hi'>$1</b>",
            $html,
        );
    }

    // ── Read/write saved file ─────────────────────

    private static function readSaved(int $bookId, string $slug): array
    {
        $path = self::savedPath($bookId, $slug);
        if (!file_exists($path)) {
            return [];
        }

        $raw = @file_get_contents($path);
        if (!$raw) {
            return [];
        }

        $data = json_decode($raw, true);
        return is_array($data) && isset($data["results"])
            ? $data["results"]
            : [];
    }

    private static function writeSaved(
        int $bookId,
        string $slug,
        string $query,
        array $results
    ): void {
        $dir = self::savedDir($bookId);
        if (!is_dir($dir)) {
            mkdir($dir, 0755, true);
        }

        file_put_contents(
            self::savedPath($bookId, $slug),
            json_encode(
                ["query" => $query, "results" => array_values($results)],
                JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE,
            ),
        );
    }

    // ── search ────────────────────────────────────

    public static function search(int $bookId, string $query): array
    {
        if ($bookId <= 0 || $query === "") {
            return ["error" => "Missing bookId or query"];
        }

        $slug = self::slug($query);
        $existing = self::readSaved($bookId, $slug);
        $seenIds = [];
        foreach ($existing as $r) {
            if (!empty($r["id"])) {
                $seenIds[$r["id"]] = true;
            }
        }

        $docDir = Config::dataDir() . "/" . $bookId;
        if (!is_dir($docDir)) {
            return ["error" => "Book $bookId not found"];
        }

        $files = glob($docDir . "/*.json") ?: [];
        $newResults = [];

        foreach ($files as $filePath) {
            if (
                strpos($filePath, "/cache/") !== false ||
                strpos($filePath, "/conf/") !== false
            ) {
                continue;
            }

            $raw = @file_get_contents($filePath);
            if (!$raw) {
                continue;
            }

            $doc = json_decode($raw, true);
            if (!is_array($doc) || empty($doc["article"])) {
                continue;
            }

            $docFilename = $doc["filename"] ?? basename($filePath, ".json");

            foreach ($doc["article"] as $articleItem) {
                if (
                    empty($articleItem["content"]) ||
                    !is_string($articleItem["content"])
                ) {
                    continue;
                }

                $dom = new DOMDocument();
                libxml_use_internal_errors(true);
                $dom->loadHTML(
                    mb_convert_encoding(
                        $articleItem["content"],
                        "HTML-ENTITIES",
                        "UTF-8",
                    ),
                    LIBXML_HTML_NOIMPLIED | LIBXML_HTML_NODEFDTD,
                );
                libxml_clear_errors();

                $xpath = new DOMXPath($dom);
                $paragraphs = $xpath->query("//p");

                foreach ($paragraphs as $p) {
                    $paraText = trim($p->textContent);
                    if (stripos($paraText, $query) === false) {
                        continue;
                    }

                    $rawHtml = $dom->saveHTML($p);
                    $id = md5($docFilename . $rawHtml);

                    if (isset($seenIds[$id])) {
                        continue;
                    }

                    $newResults[] = [
                        "id" => $id,
                        "filename" => $docFilename,
                        "class" => $articleItem["class"] ?? "",
                        "content" => self::highlight($rawHtml, $query),
                    ];
                    $seenIds[$id] = true;
                }
            }
        }

        // merge existing + new, sort by chapter order then filename
        $merged = array_merge($existing, $newResults);
        $orderMap = self::chapterOrder($bookId);

        usort($merged, function ($a, $b) use ($orderMap) {
            $oa = $orderMap[$a["filename"]] ?? 99;
            $ob = $orderMap[$b["filename"]] ?? 99;
            if ($oa !== $ob) {
                return $oa <=> $ob;
            }
            return strcmp($a["filename"], $b["filename"]);
        });

        self::writeSaved($bookId, $slug, $query, $merged);

        return [
            "query" => $query,
            "bookId" => $bookId,
            "count" => count($merged),
            "results" => $merged,
        ];
    }

    // ── build ─────────────────────────────────────
    // Removes entries whose id is in $removeIds, writes back.

    public static function build(
        int $bookId,
        string $query,
        array $removeIds
    ): array {
        if ($bookId <= 0 || $query === "") {
            return ["error" => "Missing bookId or query"];
        }

        $slug = self::slug($query);
        $current = self::readSaved($bookId, $slug);

        if (empty($removeIds)) {
            return ["ok" => true, "removed" => 0, "kept" => count($current)];
        }

        $removeSet = array_flip($removeIds);
        $kept = array_values(
            array_filter($current, function ($r) use ($removeSet) {
                return !isset($removeSet[$r["id"]]);
            }),
        );
        $removed = count($current) - count($kept);

        self::writeSaved($bookId, $slug, $query, $kept);

        return ["ok" => true, "removed" => $removed, "kept" => count($kept)];
    }
}
