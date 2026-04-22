<?php
/* 

1 interface, put this inside api.php
result should follow order in chapterindex (data/$bookid/cache/chapters.json), order
keep the result under $query-search.json in data/$bookid/cache/

*/ 
header('Content-Type: application/json; charset=utf-8');

$bid   = $_GET['bid'] ?? '';
$query = $_GET['query'] ?? '';

if (empty($bid) || empty($query)) {
    echo json_encode(['error' => 'Missing bid or query parameter']);
    exit;
}

$bid   = basename($bid);
$query = trim($query);
$searchDir = "data/$bid/";

if (!is_dir($searchDir)) {
    echo json_encode(['error' => "Directory data/$bid not found"]);
    exit;
}

function getAllJsonFiles($dir) {
    $files = [];
    $items = glob($dir . '/*', GLOB_NOSORT);
    foreach ($items as $item) {
        if (is_dir($item)) {
            $files = array_merge($files, getAllJsonFiles($item));
        } elseif (pathinfo($item, PATHINFO_EXTENSION) === 'json') {
            $files[] = $item;
        }
    }
    return $files;
}

$jsonFiles = getAllJsonFiles($searchDir);
$results = [];

foreach ($jsonFiles as $filePath) {
    $content = file_get_contents($filePath);
    if ($content === false) continue;

    $data = json_decode($content, true);
    if (!$data || empty($data['article'])) continue;

    $filename = basename($filePath);

    // Process each article item
    foreach ($data['article'] as $articleItem) {
        if (empty($articleItem['content']) || !is_string($articleItem['content'])) {
            continue;
        }

        // Split the content into individual tags (paragraphs, headings, lists, etc.)
        $dom = new DOMDocument();
        libxml_use_internal_errors(true);
        $dom->loadHTML(mb_convert_encoding($articleItem['content'], 'HTML-ENTITIES', 'UTF-8'), LIBXML_HTML_NOIMPLIED | LIBXML_HTML_NODEFDTD);
        libxml_clear_errors();

        $xpath = new DOMXPath($dom);

        // Get ONLY <p> tags (real paragraphs)
        $paragraphs = $xpath->query('//p');

        foreach ($paragraphs as $p) {
            $paraText = trim($p->textContent);

            if (stripos($paraText, $query) !== false) {
                $results[] = [
                    'filename' => $filename,
                    'class'    => $articleItem['class'] ?? '',
                    'content'  => $dom->saveHTML($p)   // return only this <p> tag with its content
                ];
            }
        }
    }
}

// Output
echo json_encode([
    'query'   => $query,
    'bid'     => $bid,
    'count'   => count($results),
    'results' => $results
], JSON_UNESCAPED_UNICODE);