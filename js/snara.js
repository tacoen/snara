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

  icx.replace();

  // Restore active book label if config had one
  if (AppConfig.activeBookId) {
    const label = document.getElementById('active-book-label');
    if (label) label.textContent = AppConfig.activeBookTitle || `Book ${AppConfig.activeBookId}`;
  }

  // ── Editor globals ──────────────────────────────
  window.submitEntry  = ()     => editor.submit();
  window.setTag       = tag    => editor.setTag(tag);
  window.fmt          = cmd    => editor.fmt(cmd);
  window.wrapMd       = prefix => editor.wrapMd(prefix);
  window.wrapInline   = (b, a) => editor.wrapInline(b, a);
  window.saveDocument = ()     => ui.saveDocument();
  window.loadDocument = (bookId, filename) => ui.loadDocument(bookId, filename);

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

  // ── Keyboard shortcuts ──────────────────────────
  document.addEventListener('keydown', e => {
    if (e.key === 's' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      ui.saveDocument();
    }
  });
}

boot();