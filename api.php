<?php
/* ─────────────────────────────────────────────────
   api.php — single-entry REST endpoint
   Routes by ?action= query param.

   Actions:
     GET  ?action=config.get
     POST ?action=config.set
     GET  ?action=doc.list
     GET  ?action=doc.get&filename=name
     POST ?action=doc.save
     DELETE ?action=doc.delete&filename=name
─────────────────────────────────────────────────── */

require_once __DIR__ . '/php/router.php';

Router::dispatch();