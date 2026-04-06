/* ─────────────────────────────────────────────────
   snara.js — ES module entry point
─────────────────────────────────────────────────── */
import { SnaraStruct }   from './snara/struct.js';
import { SnaraTool }     from './snara/tool.js';
import { SnaraEditor }   from './snara/core.js';
import { SnaraUI }       from './snara/ui.js';
import { SnaraSettings } from './snara/settings.js';
import { SnaraIndex }    from './snara/index.js';

import icx               from './icons/ge-icon.js';
import { SnaraTools } from './tools.js';
import { SnaraPref } from './pref.js';

// ── Central config store (populated at boot) ──────
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

// ── Global defaults store (from json/default.json) ─
export const AppDefaults = {
  act:              'None',
  defaultTag:       'beat',
  autosave:         true,
  autosaveInterval: 30,
  metaFields:       ['characters', 'settings', 'prompts'],
};

// ── Boot ──────────────────────────────────────────

async function boot() {
  try {
    const [cfgRes, defRes] = await Promise.all([
      fetch(AppConfig.apiPath + '?action=config.get'),
      fetch(AppConfig.apiPath + '?action=default.get'),
    ]);
    const config   = await cfgRes.json();
    const defData  = await defRes.json();

    Object.assign(AppConfig,   config);
    Object.assign(AppDefaults, defData.defaults ?? {});
  } catch (e) {
    console.warn('[snara] config load failed, using defaults:', e);
  }

  // Apply struct customisation from config
  SnaraStruct.configure({
    classes:    AppConfig.classes,
    headingMap: AppConfig.headingMap,
  });

  // Apply theme
  SnaraTool.applyTheme(AppConfig.theme || SnaraTool.savedTheme());

  // Init modules
  const editor   = new SnaraEditor();
  const ui       = new SnaraUI();
  const settings = new SnaraSettings();
  const idx      = new SnaraIndex();

  const tools = new SnaraTools();
  const pref = new SnaraPref();

  icx.replace();

  // Restore active book label if config had one
  if (AppConfig.activeBookId) {
    const label = document.getElementById('active-book-label');
    if (label) label.textContent = AppConfig.activeBookTitle || `Book ${AppConfig.activeBookId}`;
  }


window.switchArea = (area) => {
  const areas = {
    editor: document.getElementById('editor-area'),
    meta:   document.getElementById('meta-area'),
    files:  document.getElementById('files-area'),
    kanban:  document.getElementById('kanban-area'),  
	};

  // Show / hide main panels
  Object.entries(areas).forEach(([key, el]) => {
    if (!el) return;
    el.hidden = key !== area;
  });

  // Also sync aside visibility (TOC only makes sense in editor)
  const aside = document.querySelector('aside.side-panel');
  if (aside) aside.hidden = area !== 'editor';

  // Update nav button active state
  document.querySelectorAll('.nav-tab-btn').forEach(btn => {
    btn.classList.toggle('active-tab', btn.dataset.area === area);
  });
};

// Keep ui.switchTab in sync so loadDocument still works
const _origSwitchTab = ui.switchTab.bind(ui);
ui.switchTab = (tab) => {
  _origSwitchTab(tab);
  // Map legacy tab names to area ids
  const map = { editor: 'editor', meta: 'meta', files: 'files' };
  if (map[tab]) window.switchArea(map[tab]);
};

// Wire missing globals that nav.html references
window.Editor     = () => window.switchArea('editor');
window.Meta       = () => window.switchArea('meta');
window.FilesIndex = () => window.switchArea('files');


  // ── Editor globals ──────────────────────────────
  window.submitEntry  = ()     => editor.submit();
  window.setTag       = tag    => editor.setTag(tag);
  window.fmt          = cmd    => editor.fmt(cmd);
  window.wrapMd       = prefix => editor.wrapMd(prefix);
  window.wrapInline   = (b, a) => editor.wrapInline(b, a);
  window.saveDocument = ()     => ui.saveDocument();
//  window.loadDocument = (bookId, filename) => ui.loadDocument(bookId, filename);

window.loadDocument = (bookId, filename) => {
  ui.loadDocument(bookId, filename).then?.(() => tools.refresh());
  // ui.loadDocument may not return a promise — also refresh after a short delay:
  setTimeout(() => tools.refresh(), 400);
};


  // ── UI globals ──────────────────────────────────
  window.setEntryClass = cls  => ui.setEntryClass(cls);
  window.removeEntry   = ()   => ui.removeEntry();
  window.addField      = ()   => ui.addField();
  window.removeField   = btn  => ui.removeField(btn);
  window.toggleTheme   = ()   => ui.toggleTheme();

  // ── Settings globals ────────────────────────────
  window.openSettings  = ()   => settings.open();
  window.settingsInst  = settings;

  // ── Index globals ───────────────────────────────
  window.bookIndex     = ()   => idx.openBookIndex();
  window.chapterIndex  = ()   => idx.openChapterIndex();
  window.SnaraIndex    = SnaraIndex;

  window.openPref = () => pref.open();
	 
  // ── Keyboard shortcuts ──────────────────────────
  document.addEventListener('keydown', e => {
    if (e.key === 's' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      ui.saveDocument();
    }
  });
}

boot();
