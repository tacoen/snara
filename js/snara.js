/* ─────────────────────────────────────────────────
   snara.js — ES module entry point
─────────────────────────────────────────────────── */
import { SnaraStruct }   from './snara/struct.js';
import { SnaraTool }     from './snara/tool.js';
import { SnaraEditor }   from './snara/core.js';
import { SnaraUI }       from './snara/ui.js';
import { SnaraSettings } from './snara/settings.js';
import { SnaraIndex }    from './snara/index.js';
import { SnaraPref }     from './snara/pref.js';
import { SnaraFiles }    from './snara/files.js';
import icx               from './icons/ge-icon.js';
import { SnaraTools }    from './tools.js';
import { SnaraExport }   from './export.js';
import { SnaraGallery }  from './snara/gallery.js';
import { SnaraRouter }     from './snara/router.js';

import { SnaraChat } from './snara/chatbot.js';


// ── Central config store ──────────────────────────
export const AppConfig = {
  apiPath:          '/api.php',
  dataPath:         '/data',
  jsonPath:         '/json',
  theme:            'light',
  classes:          ['act', 'chapter', 'scene', 'beat'],
  headingMap:       [
    { prefix: '#### ', cls: 'beat'    },
    { prefix: '### ',  cls: 'scene'   },
    { prefix: '## ',   cls: 'chapter' },
    { prefix: '# ',    cls: 'act'     },
  ],
  activeBookId:    null,
  activeBookTitle: '',
};

// ── Global defaults store ─────────────────────────
export const AppDefaults = {
  act:              'None',
  defaultTag:       'beat',
  autosave:         true,
  autosaveInterval: 30,
  metaFields:       ['characters', 'settings', 'prompts'],
};


// ── Boot ──────────────────────────────────────────
async function boot() {

  // ── 1. Fetch config ───────────────────────────
  try {
    const [cfgRes, defRes] = await Promise.all([
      fetch(AppConfig.apiPath + '?action=config.get'),
      fetch(AppConfig.apiPath + '?action=default.get'),
    ]);
    const config  = await cfgRes.json();
    const defData = await defRes.json();

    Object.assign(AppConfig,   config);
    Object.assign(AppDefaults, defData.defaults ?? {});
  } catch (e) {
    console.warn('[snara] config load failed, using defaults:', e);
  }

  SnaraStruct.configure({
    classes:    AppConfig.classes,
    headingMap: AppConfig.headingMap,
  });

  SnaraTool.applyTheme(AppConfig.theme || SnaraTool.savedTheme());

  // ── 2. Init all modules ───────────────────────
  const editor   = new SnaraEditor();
  const ui       = new SnaraUI();
  const settings = new SnaraSettings();
  const idx      = new SnaraIndex();
  const tools    = new SnaraTools();
  const pref     = new SnaraPref();
  const files    = new SnaraFiles();
  const gallery  = new SnaraGallery();
  const exporter = new SnaraExport();

  const chat = new SnaraChat('#chatbot-root');
 
 
  icx.replace();

  if (AppConfig.activeBookId) {
    const label = document.getElementById('active-book-label');
    if (label) label.textContent = AppConfig.activeBookTitle || `Book ${AppConfig.activeBookId}`;
  }

  // ── 3. Define window.switchArea ───────────────
  window.switchArea = (area) => {
    const areas = {
      editor: document.getElementById('editor-area'),
      meta:   document.getElementById('meta-area'),
      files:  document.getElementById('files-area'),
      kanban: document.getElementById('kanban-area'),
	  chatbot: document.getElementById('chatbot-area'), 
	  notes: document.getElementById('notes-area'), 
 
    };
    Object.entries(areas).forEach(([key, el]) => {
      if (!el) return;
      el.hidden = key !== area;
    });
    const aside = document.querySelector('aside.side-panel');
    if (aside) aside.hidden = area !== 'editor';
    document.querySelectorAll('.nav-tab-btn').forEach(btn => {
      btn.classList.toggle('active-tab', btn.dataset.area === area);
    });
  };

  // Keep ui.switchTab in sync
  const _origSwitchTab = ui.switchTab.bind(ui);
  ui.switchTab = (tab) => {
    _origSwitchTab(tab);
    const map = { editor: 'editor', meta: 'meta', files: 'files' };
    if (map[tab]) window.switchArea(map[tab]);
  };

  // ── 4. Define window.loadDocument ─────────────
  window.loadDocument = (bookId, filename) => {
    ui.loadDocument(bookId, filename).then?.(() => tools.refresh());
    setTimeout(() => tools.refresh(), 400);
  };

// ── 5. Init router ────────────────────────────
// ── 5. Init router ────────────────────────────
  const router = new SnaraRouter();
 
  // Register raw pre-wrap functions BEFORE wrapping.
  // _dispatch uses these internally — never the wrapped versions.
  router.registerRawSwitch(window.switchArea);
  router.registerRawLoad(window.loadDocument);
 
  // Wrap switchArea — user tab clicks update URL.
  // Guard: only fires when NOT called from inside router._dispatch.
  const _origSwitchArea = window.switchArea;
window.switchArea = (area) => {
  _origSwitchArea(area);
  const bookId = AppConfig.activeBookId;
  if (bookId && !router._busy) {
    // Don't overwrite URL if we're already on this page with a file open
    const cur = router._read();
    const newPage = SnaraRouter.pageFor(area);
    if (cur.p === newPage && cur.file) return;  // ← keep the file in URL
    router.go(newPage, bookId);
  }
};

 
  // Wrap loadDocument — opening a file updates URL + localStorage.
  // Guard: only fires when NOT called from inside router._dispatch.
const _origLoad = window.loadDocument;
window.loadDocument = (bookId, filename) => {
  _origLoad(bookId, filename);
  if (bookId && filename) {
    // Always update URL when a file is opened — never block on _busy
    router._push('editor', bookId, filename);
    router._persist('editor', bookId, filename);
    router._titleFile(filename);
  }
};
 
  // ── 6. All other window globals ───────────────
  window.submitEntry   = ()      => editor.submit();
  window.setTag        = tag     => editor.setTag(tag);
  window.fmt           = cmd     => editor.fmt(cmd);
  window.wrapMd        = prefix  => editor.wrapMd(prefix);
  window.wrapInline    = (b, a)  => editor.wrapInline(b, a);
  window.saveDocument  = ()      => ui.saveDocument();
  window.setEntryClass = cls     => ui.setEntryClass(cls);
  window.removeEntry   = ()      => ui.removeEntry();
  window.addField      = ()      => ui.addField();
  window.removeField   = btn     => ui.removeField(btn);
  window.toggleTheme   = ()      => ui.toggleTheme();
 
  window.Editor     = () => window.switchArea('editor');
  window.Meta       = () => window.switchArea('meta');
  window.FilesIndex = () => window.switchArea('files');
 
  // Settings / pref — open the modal directly.
  // URL update is handled by nav button triggers (onclick="router.go('configuration')")
  // NOT from inside these globals — that would loop via openSettings → go → openSettings.
  window.openSettings = () => settings.open();
  window.openPref     = () => pref.open();
  window.settingsInst = settings;
 
  // Index modals — go() updates URL, then open directly (no _dispatch loop risk
  // because openBookIndex/openChapterIndex don't call switchArea or loadDocument).
  window.bookIndex    = () => { router.go('books');    idx.openBookIndex();    };
  window.chapterIndex = () => { router.go('chapters'); idx.openChapterIndex(); };
 
  window.SnaraIndex  = SnaraIndex;
  window.SnaraFiles  = SnaraFiles;
  window.SnaraExport = SnaraExport;
 
  // ── 7. Keyboard shortcuts ─────────────────────
  document.addEventListener('keydown', e => {
    if (e.key === 's' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      ui.saveDocument();
    }
  });
 
  // ── 8. Book change → apply editor prefs + update URL ──
  window.addEventListener('bookchange', async (e) => {
    const { bookId } = e.detail;
    if (!bookId) return;
    try {
      const res = await fetch(`${AppConfig.apiPath}?action=editorpref.get&bookId=${bookId}`);
      if (res.ok) SnaraSettings.applyEditorPrefs(await res.json());
    } catch {}
    // Update URL to reflect new active book, keep current page
    if (!router._busy) {
      const cur  = router._read();
      const page = cur.p || 'editor';
      const file = page === 'editor' ? (cur.file || '') : null;
      router.go(page, bookId, file);
    }
  });
 
  // Apply per-book editor prefs on boot
  if (AppConfig.activeBookId) {
    try {
      const res = await fetch(`${AppConfig.apiPath}?action=editorpref.get&bookId=${AppConfig.activeBookId}`);
      if (res.ok) SnaraSettings.applyEditorPrefs(await res.json());
    } catch {}
  }
 
  // ── 9. Boot router last ───────────────────────
  // All window.* globals must exist before this line.
  router.boot();
}

boot();