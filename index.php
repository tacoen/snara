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

<!-- onclick="closeModal()" -->

<div id="app-overlay" class='app-overlay' hidden >
<?php include __DIR__ . '/partials/settings.html'; ?>
</div>

<script type="module" src="js/snara.js"></script>
</body>
</html>

