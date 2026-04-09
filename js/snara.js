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
import { SnaraRouter }   from './snara/router.js';
import icx               from './icons/ge-icon.js';
import { SnaraTools }    from './tools.js';
import { SnaraExport }   from './export.js';
import { SnaraGallery }  from './snara/gallery.js';


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

  icx.replace();

  if (AppConfig.activeBookId) {
    const label = document.getElementById('active-book-label');
    if (label) label.textContent = AppConfig.activeBookTitle || `Book ${AppConfig.activeBookId}`;
  }

  // ── 3. Define window.switchArea (real logic) ──
  // Must be defined BEFORE the router wraps it.
  window.switchArea = (area) => {
    const areas = {
      editor: document.getElementById('editor-area'),
      meta:   document.getElementById('meta-area'),
      files:  document.getElementById('files-area'),
      kanban: document.getElementById('kanban-area'),
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

  // ── 4. Define window.loadDocument (real logic) ─
  // Must be defined BEFORE the router wraps it.
  window.loadDocument = (bookId, filename) => {
    ui.loadDocument(bookId, filename).then?.(() => tools.refresh());
    setTimeout(() => tools.refresh(), 400);
  };

  // ── 5. Init router and wrap the real functions ─
  // Order matters: real functions must exist first,
  // then the router captures them via _orig*.
  const router = new SnaraRouter();

  const _origSwitchArea = window.switchArea;
  window.switchArea = (area) => {
    _origSwitchArea(area);
    const bookId = AppConfig.activeBookId;
    if (bookId) router.navigate(SnaraRouter.bookPath(bookId, area));
  };

  const filesInst = SnaraFiles.instance;
  if (filesInst) {
    const _origSection = filesInst.switchSection.bind(filesInst);
    filesInst.switchSection = (sec) => {
      _origSection(sec);
      const bookId = AppConfig.activeBookId;
      if (bookId) router.navigate(SnaraRouter.filesPath(bookId, sec));
    };
  }

  const _origLoad = window.loadDocument;
  window.loadDocument = (bookId, filename) => {
    _origLoad(bookId, filename);
    if (bookId && filename) router.navigate(SnaraRouter.editPath(bookId, filename));
  };

  // ── 6. All other window globals ───────────────
  // Defined once, after router is ready.

  // Editor
  window.submitEntry  = ()     => editor.submit();
  window.setTag       = tag    => editor.setTag(tag);
  window.fmt          = cmd    => editor.fmt(cmd);
  window.wrapMd       = prefix => editor.wrapMd(prefix);
  window.wrapInline   = (b, a) => editor.wrapInline(b, a);
  window.saveDocument = ()     => ui.saveDocument();

  // UI
  window.setEntryClass = cls => ui.setEntryClass(cls);
  window.removeEntry   = ()  => ui.removeEntry();
  window.addField      = ()  => ui.addField();
  window.removeField   = btn => ui.removeField(btn);
  window.toggleTheme   = ()  => ui.toggleTheme();

  // Nav aliases
  window.Editor     = () => window.switchArea('editor');
  window.Meta       = () => window.switchArea('meta');
  window.FilesIndex = () => window.switchArea('files');

  // Settings + pref — with router (defined once, no duplicate)
  window.openSettings = () => { settings.open(); router.navigate('settings'); };
  window.openPref     = () => { pref.open();     router.navigate('pref');     };
  window.settingsInst = settings;

  // Index + files
  window.bookIndex    = () => idx.openBookIndex();
  window.chapterIndex = () => idx.openChapterIndex();
  window.SnaraIndex   = SnaraIndex;
  window.SnaraFiles   = SnaraFiles;
  window.SnaraExport  = SnaraExport;

  // ── 7. Keyboard shortcuts ─────────────────────
  document.addEventListener('keydown', e => {
    if (e.key === 's' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      ui.saveDocument();
    }
  });

  // ── 8. Book change → update URL + title ───────
window.addEventListener('bookchange', async (e) => {
    const { bookId } = e.detail;
    if (!bookId) return;
	
	try {
      const res = await fetch(
        `${AppConfig.apiPath}?action=editorpref.get&bookId=${bookId}`
      );
      if (res.ok) SnaraSettings.applyEditorPrefs(await res.json());
    } catch { /* ignore */ }
	
    const area = document.querySelector('.nav-tab-btn.active-tab')?.dataset.area || 'editor';
    if (!location.search.startsWith(`?r=book/${bookId}`)) {
      router.navigate(SnaraRouter.bookPath(bookId, area));
    } else {
      SnaraRouter.instance?._setTitle();
    }
  });


  // Apply per-book editor prefs on boot
  if (AppConfig.activeBookId) {
    try {
      const epRes = await fetch(
        `${AppConfig.apiPath}?action=editorpref.get&bookId=${AppConfig.activeBookId}`
      );
      if (epRes.ok) {
        const editorPrefs = await epRes.json();
        SnaraSettings.applyEditorPrefs(editorPrefs);
      }
    } catch { /* non-fatal — defaults from vars.css apply */ }
  }
  
  // ── 9. Boot router last ───────────────────────
  // Reads ?r= (or localStorage) and applies state.
  router.boot();
}

boot();