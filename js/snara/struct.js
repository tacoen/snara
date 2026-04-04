/* ─────────────────────────────────────────────────
   struct.js — SnaraStruct
   Novel hierarchy classifier + multi-entry splitter.

   Hierarchy (largest → smallest):
     act     → # Heading 1
     chapter → ## Heading 2
     scene   → ### Heading 3
     beat    → #### Heading 4  |  default (no heading)

   Both CLASSES and HEADING_MAP are configurable via
   SnaraStruct.configure() — called at boot time with
   values loaded from config.json.
─────────────────────────────────────────────────── */

export class SnaraStruct {

  // ── Defaults (overridden by configure()) ──────

  static CLASSES = ['act', 'chapter', 'scene', 'beat'];

  static HEADING_MAP = [
    { prefix: '#### ', cls: 'beat'    },
    { prefix: '### ',  cls: 'scene'   },
    { prefix: '## ',   cls: 'chapter' },
    { prefix: '# ',    cls: 'act'     },
  ];

  // ── Runtime configuration ─────────────────────

  /**
   * Apply settings from config.json.
   *
   * config.classes    — array of class names, largest→smallest
   *                     e.g. ["act","chapter","scene","beat"]
   *
   * config.headingMap — array of { prefix, cls } objects
   *                     e.g. [{ prefix:"#### ", cls:"beat" }, ...]
   *
   * Either or both keys may be absent; missing keys keep defaults.
   */
  static configure(config = {}) {
    if (Array.isArray(config.classes) && config.classes.length > 0) {
      SnaraStruct.CLASSES = config.classes;
    }

    if (Array.isArray(config.headingMap) && config.headingMap.length > 0) {
      // Validate each entry has prefix + cls strings
      const valid = config.headingMap.filter(
        e => typeof e.prefix === 'string' && typeof e.cls === 'string'
      );
      if (valid.length > 0) SnaraStruct.HEADING_MAP = valid;
    }
  }

  // ── Detection ─────────────────────────────────

  static detect(md) {
    const firstLine = md.trimStart().split('\n')[0];
    for (const { prefix, cls } of SnaraStruct.HEADING_MAP) {
      if (firstLine.startsWith(prefix)) return cls;
    }
    // Default to the last (smallest) class
    return SnaraStruct.CLASSES[SnaraStruct.CLASSES.length - 1] ?? 'beat';
  }

  static resolve(md, activeTag) {
    if (activeTag && SnaraStruct.CLASSES.includes(activeTag)) return activeTag;
    return SnaraStruct.detect(md);
  }

  // ── Splitting ─────────────────────────────────

  static split(md, activeTag = null) {
    const lines = md.split('\n');

    // Build a regex from current HEADING_MAP prefixes
    const hashes = SnaraStruct.HEADING_MAP
      .map(e => e.prefix.trimEnd())          // e.g. '####', '###', …
      .sort((a, b) => b.length - a.length)   // longest first to avoid partial match
      .map(h => h.replace(/#/g, '#'))
      .join('|');
    const headingRe = new RegExp(`^(${hashes}) `);
    const isHeading = line => headingRe.test(line);

    const headingCount = lines.filter(isHeading).length;
    if (headingCount <= 1) {
      return [{ md: md.trim(), cls: SnaraStruct.resolve(md, activeTag) }];
    }

    const blocks  = [];
    let   current = [];

    for (const line of lines) {
      if (isHeading(line) && current.length > 0) {
        const chunk = current.join('\n').trim();
        if (chunk) blocks.push(chunk);
        current = [];
      }
      current.push(line);
    }

    const tail = current.join('\n').trim();
    if (tail) blocks.push(tail);

    return blocks.map(chunk => ({
      md:  chunk,
      cls: SnaraStruct.detect(chunk),
    }));
  }
}