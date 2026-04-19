<?php
// 1. Start Output Buffering
ob_start();

require_once __DIR__ . '/php/config.php';
$config = Config::get();
$title  = 'Snara';
?><!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title><?= htmlspecialchars($title) ?></title>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/marked/9.1.6/marked.min.js"></script>
  <meta name="color-scheme" content="light dark">
  <script>
    (function() {
      let theme = localStorage.getItem('theme') || 'dark';
      if (theme === 'system' || !theme) {
        theme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      }
      document.documentElement.setAttribute('data-theme', theme);
    })();
  </script>
  <link rel="icon" type="image/x-icon" href="/favicon.ico">  
  <link rel="stylesheet" href="style.css">
</head>
<body>

<div id="app">
  <?php include __DIR__ . '/partials/nav.html'; ?>
  <main>
    <?php include __DIR__ . '/partials/header.html'; ?>

    <section id='editor-area' class="content-area" >
        <article id="article">
            <div class="entries"></div>
        </article>
        <?php include __DIR__ . '/partials/editor.html'; ?>
        <?php include __DIR__ . '/partials/popup.html'; ?>
    </section>

    <?php include __DIR__ . '/partials/editor-side.html'; ?>

    <section id='about-area' class="content-area" hidden>
        <?php include __DIR__ . '/partials/about.html'; ?>
    </section>
    
    <section id='kanban-area' class="content-area" hidden>
        <?php include __DIR__ . '/partials/kanban.html'; ?>
    </section>
    
    <section id='meta-area' class="content-area" hidden>
        <?php include __DIR__ . '/partials/meta.html'; ?>
    </section>
    <section id='files-area' class="content-area" hidden>
        <?php include __DIR__ . '/partials/files.html'; ?>
    </section>

    <section id='chatbot-area' class="content-area" hidden>
        <?php include __DIR__ . '/partials/chatbot.html'; ?>
    </section>
    
    <section id='notes-area' class="content-area" hidden>
        <?php include __DIR__ . '/partials/notes.html'; ?>
    </section>    
    
</main>
</div>

<div id="app-overlay" class='app-overlay' hidden >
<?php include __DIR__ . '/partials/settings.html'; ?>
</div>

<script type="module" src="js/snara.js"></script>
</body>
</html>
<?php
// 2. Capture the output and clear the buffer
$html = ob_get_clean();

// 3. Aggressive Compression
$search = [
    '/(\s)+/s',         // 1. Replace multiple spaces/newlines with a single space
    '/\s+(?=<)/',       // 2. Remove all spaces leading up to a starting tag
    '/(?<=>)\s+/',      // 3. Remove all spaces following an ending tag
    '//' // 4. Properly remove HTML comments
];
$replace = [' ', '', '', ''];

// Run the replacement
$compressedHtml = preg_replace($search, $replace, $html);

// FIX: trim only takes the string (and optionally a list of characters to strip)
$compressedHtml = trim($compressedHtml);

// 4. Save to index.html
if (!empty($compressedHtml) && file_put_contents(__DIR__ . '/index.html', $compressedHtml) !== false) {
    echo "Successfully built index.html (Compressed). Redirecting in 3 seconds...";
    echo "
    <script>
        setTimeout(function() {
            window.location.href = 'index.html';
        }, 3000);
    </script>
    ";
} else {
    // If $compressedHtml is empty, preg_replace failed
    if (empty($compressedHtml)) {
        echo "Error: Compression failed. The output string is empty.";
    } else {
        echo "Error: Could not write to index.html. Check permissions.";
    }
}