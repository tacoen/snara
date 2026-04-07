<?php
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
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Lora:ital,wght@0,400;0,500;1,400&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
  <meta name="color-scheme" content="light dark">
  <script>
    (function() {
      // Use the exact same logic as your current JS
      let theme = localStorage.getItem('theme') || 'dark'; // default to dark (you can change)

      // If user chose "system", respect OS preference
      if (theme === 'system' || !theme) {
        theme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      }

      // Apply immediately (no flash)
      document.documentElement.setAttribute('theme', theme);
    })();
  </script>
  <link rel="stylesheet" href="style.css">
</head>
<body>

<div id="app" class='grid-v'>
  <?php include __DIR__ . '/partials/nav.html'; ?>
  <div class="grid-h">
	<?php include __DIR__ . '/partials/header.html'; ?>

	<main id='editor-area' class="content-area" >
		<article id="article">
			<div class="entries"></div>
		</article>
		<?php include __DIR__ . '/partials/editor.html'; ?>
		<?php include __DIR__ . '/partials/popup.html'; ?>
	</main>

	<?php include __DIR__ . '/partials/editor-side.html'; ?>

	<main id='kanban-area' class="content-area" hidden>
		<?php include __DIR__ . '/partials/kanban.html'; ?>
	</main>
	
	<main id='meta-area' class="content-area" hidden>
		<?php include __DIR__ . '/partials/meta.html'; ?>
	</main>
	<main id='files-area' class="content-area" hidden>
		<?php include __DIR__ . '/partials/files.html'; ?>
	</main>

  </div>
</div>

<!-- onclick="closeModal()" -->

<div id="app-overlay" class='app-overlay' hidden >
<?php include __DIR__ . '/partials/settings.html'; ?>
</div>

<script type="module" src="js/snara.js"></script>
</body>
</html>

