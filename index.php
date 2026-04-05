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
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Lora:ital,wght@0,400;0,500;1,400&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="style.css">
</head>
<body>

<div id="app">
  <?php include __DIR__ . '/partials/nav.html'; ?>
  <?php include __DIR__ . '/partials/header.html'; ?>

  <div class="dashboard">
  <main class="content-area">

  <article id="article">
	<div class="entries"></div>
	<?php include __DIR__ . '/partials/meta.html'; ?>
  </article>

  <?php include __DIR__ . '/partials/editor.html'; ?>

  </main>

  <?php include __DIR__ . '/partials/editor-side.html'; ?>

  </div>
</div>

<?php include __DIR__ . '/partials/popup.html'; ?>
<?php include __DIR__ . '/partials/settings.html'; ?>

<script src="https://cdnjs.cloudflare.com/ajax/libs/marked/9.1.6/marked.min.js"></script>
<script type="module" src="js/snara.js"></script>
</body>
</html>