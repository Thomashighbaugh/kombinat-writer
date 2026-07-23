/**
 * Series Lorebook — Cross-Book Knowledge Base
 *
 * Manages a series-level knowledge base that persists across multiple books.
 * Lives at ./series/lorebook/ (sibling of ./book/).
 *
 * Structure:
 *   ./series/
 *   ├── lorebook/
 *   │   ├── characters.md      — Cross-book character profiles
 *   │   ├── world.md           — World-setting, geography, history
 *   │   ├── glossary.md        — Terms, names, places, concepts
 *   │   ├── timeline.json      — Series-level timeline spanning all books
 *   │   └── threads.md         — Cross-book plot threads and arcs
 *   ├── meta.json              — Series metadata (title, book count, etc.)
 *   └── continuity-log.md      — Series-level continuity scan results
 *
 * Per-book integration:
 *   - track.json gains seriesId and bookNumber fields
 *   - manifest can inherit from series lorebook for book 2+
 *   - Series-level continuity scan checks across all books
 *   - Series lorebook syncs from per-book knowledge files
 */

import fs from 'fs-extra';
import path from 'path';

// ─── Types ────────────────────────────────────────────────────────────────

/** Metadata for a multi-book series. */
export interface SeriesMeta {
  seriesId: string;
  title: string;
  author: string;
  bookCount: number;
  books: Array<{
    bookNumber: number;
    title: string;
    path: string;        // relative path to book directory
    status: 'planned' | 'drafting' | 'complete' | 'published';
  }>;
  createdAt: string;
  updatedAt: string;
}

/** A single event on the series-wide timeline. */
export interface SeriesTimelineEntry {
  date: string;          // in-fiction date
  bookNumber: number;
  chapter?: number;
  event: string;
  significance: string;
}

/** Collection of timeline entries spanning all books in the series. */
export interface SeriesTimeline {
  entries: SeriesTimelineEntry[];
}

/** A single continuity issue found across books in the series. */
export interface SeriesContinuityFinding {
  type: 'character' | 'world' | 'timeline' | 'glossary' | 'thread';
  severity: 'critical' | 'major' | 'minor' | 'observation';
  books: number[];      // which books are involved
  finding: string;
  evidence: string;
}

// ─── Paths ────────────────────────────────────────────────────────────────

const SERIES_DIR = 'series';
const LOREBOOK_DIR = path.join(SERIES_DIR, 'lorebook');

/** Get the absolute path to the series directory. */
export function getSeriesDir(projectRoot: string): string {
  return path.join(projectRoot, SERIES_DIR);
}

/** Get the absolute path to the lorebook directory. */
export function getLorebookDir(projectRoot: string): string {
  return path.join(projectRoot, LOREBOOK_DIR);
}

// ─── Initialization ──────────────────────────────────────────────────────

/** Check whether a series has been initialized (meta.json exists). */
export function seriesExists(projectRoot: string): boolean {
  return fs.existsSync(getSeriesDir(projectRoot)) &&
    fs.existsSync(path.join(getSeriesDir(projectRoot), 'meta.json'));
}

/** Initialize a new series with lorebook files, timeline, and meta.json. */
export function initSeries(
  projectRoot: string,
  meta: Omit<SeriesMeta, 'createdAt' | 'updatedAt'>
): void {
  const seriesDir = getSeriesDir(projectRoot);
  const lorebookDir = getLorebookDir(projectRoot);

  fs.ensureDirSync(seriesDir);
  fs.ensureDirSync(lorebookDir);

  // Create lorebook files if they don't exist
  const files: Record<string, string> = {
    'characters.md': '# Series Character Lorebook\n\n*Cross-book character profiles — updated as each book reveals more.*\n\n',
    'world.md': '# Series World Lorebook\n\n*Cross-book world-setting, geography, history, rules.*\n\n',
    'glossary.md': '# Series Glossary\n\n*Cross-book terms, names, places, concepts.*\n\n',
    'threads.md': '# Series Plot Threads\n\n*Cross-book plot threads and arcs spanning multiple books.*\n\n',
  };

  for (const [filename, defaultContent] of Object.entries(files)) {
    const fullPath = path.join(lorebookDir, filename);
    if (!fs.existsSync(fullPath)) {
      fs.writeFileSync(fullPath, defaultContent, 'utf-8');
    }
  }

  // Create timeline.json
  const timelinePath = path.join(lorebookDir, 'timeline.json');
  if (!fs.existsSync(timelinePath)) {
    fs.writeJsonSync(timelinePath, { entries: [] }, { spaces: 2 });
  }

  // Create series meta
  const now = new Date().toISOString();
  const seriesMeta: SeriesMeta = {
    ...meta,
    createdAt: now,
    updatedAt: now,
  };
  fs.writeJsonSync(path.join(seriesDir, 'meta.json'), seriesMeta, { spaces: 2 });
}

// ─── Read/Write ──────────────────────────────────────────────────────────

/** Load series metadata from meta.json, or null if not found. */
export function loadSeriesMeta(projectRoot: string): SeriesMeta | null {
  const metaPath = path.join(getSeriesDir(projectRoot), 'meta.json');
  if (!fs.existsSync(metaPath)) return null;
  return fs.readJsonSync(metaPath);
}

/** Persist series metadata, updating the updatedAt timestamp. */
export function saveSeriesMeta(projectRoot: string, meta: SeriesMeta): void {
  meta.updatedAt = new Date().toISOString();
  fs.writeJsonSync(path.join(getSeriesDir(projectRoot), 'meta.json'), meta, { spaces: 2 });
}

/** Load the series timeline from lorebook/timeline.json, or an empty timeline. */
export function loadTimeline(projectRoot: string): SeriesTimeline {
  const timelinePath = path.join(getLorebookDir(projectRoot), 'timeline.json');
  if (!fs.existsSync(timelinePath)) return { entries: [] };
  return fs.readJsonSync(timelinePath);
}

/** Persist the series timeline to lorebook/timeline.json. */
export function saveTimeline(projectRoot: string, timeline: SeriesTimeline): void {
  fs.writeJsonSync(path.join(getLorebookDir(projectRoot), 'timeline.json'), timeline, { spaces: 2 });
}

/** Append an entry to the series timeline and re-sort by date. */
export function addTimelineEntry(projectRoot: string, entry: SeriesTimelineEntry): void {
  const timeline = loadTimeline(projectRoot);
  timeline.entries.push(entry);
  // Sort by in-fiction date if possible, otherwise by book number then chapter
  timeline.entries.sort((a, b) => {
    if (a.date && b.date) return a.date.localeCompare(b.date);
    if (a.bookNumber !== b.bookNumber) return a.bookNumber - b.bookNumber;
    return (a.chapter || 0) - (b.chapter || 0);
  });
  saveTimeline(projectRoot, timeline);
}

// ─── Book Integration ────────────────────────────────────────────────────

/** Track info for a book that may be part of a series. */
export interface BookTrackInfo {
  seriesId?: string;
  bookNumber?: number;
  track: string;
}

/** Load per-book track info including optional seriesId and bookNumber. */
export function loadBookTrackInfo(projectRoot: string): BookTrackInfo {
  const trackPath = path.join(projectRoot, 'book', 'track.json');
  if (!fs.existsSync(trackPath)) return { track: 'fiction' };
  return fs.readJsonSync(trackPath);
}

/** Link a book to a series by writing seriesId and bookNumber into track.json. */
export function linkBookToSeries(
  projectRoot: string,
  seriesId: string,
  bookNumber: number
): void {
  const trackPath = path.join(projectRoot, 'book', 'track.json');
  const trackInfo = fs.existsSync(trackPath) ? fs.readJsonSync(trackPath) : {};
  trackInfo.seriesId = seriesId;
  trackInfo.bookNumber = bookNumber;
  fs.writeJsonSync(trackPath, trackInfo, { spaces: 2 });
}

// ─── Sync from Book to Series Lorebook ──────────────────────────────────────

/** Sync per-book knowledge (characters, timeline, glossary) into the series lorebook. */
export function syncFromBook(projectRoot: string): { synced: string[]; warnings: string[] } {
  const result = { synced: [] as string[], warnings: [] as string[] };
  if (!seriesExists(projectRoot)) {
    result.warnings.push('No series initialized. Run /kombinat series init first.');
    return result;
  }

  const bookKnowledgeDir = path.join(projectRoot, 'book', 'knowledge');
  const lorebookDir = getLorebookDir(projectRoot);

  // Sync character profiles
  const charProfilePath = path.join(bookKnowledgeDir, 'character-profiles.md');
  if (fs.existsSync(charProfilePath)) {
    const bookChars = fs.readFileSync(charProfilePath, 'utf-8');
    const seriesCharsPath = path.join(lorebookDir, 'characters.md');
    const seriesChars = fs.existsSync(seriesCharsPath)
      ? fs.readFileSync(seriesCharsPath, 'utf-8')
      : '';

    // Extract character names from book profiles (## Name headers)
    const bookCharNames = (bookChars.match(/^## (.+)$/gm) || []).map(m => m.replace(/^## /, ''));
    const seriesCharNames = (seriesChars.match(/^## (.+)$/gm) || []).map(m => m.replace(/^## /, ''));

    const newChars = bookCharNames.filter(name => !seriesCharNames.includes(name));
    const updatedChars = bookCharNames.filter(name => seriesCharNames.includes(name));

    if (newChars.length > 0 || updatedChars.length > 0) {
      // Append new characters, mark updated ones
      let updated = false;
      const appendBlocks: string[] = [];

      for (const name of newChars) {
        // Extract the character section from book profiles
        const regex = new RegExp(`## ${name}\\n([\\s\\S]*?)(?=\\n## |$)`);
        const match = bookChars.match(regex);
        if (match) {
          appendBlocks.push(`## ${name} (Book ${(loadBookTrackInfo(projectRoot).bookNumber) || 1})\n${match[1]}`);
        }
      }

      if (appendBlocks.length > 0) {
        fs.appendFileSync(seriesCharsPath, '\n' + appendBlocks.join('\n'), 'utf-8');
        result.synced.push(`characters.md: +${newChars.length} new characters`);
        updated = true;
      }

      if (updatedChars.length > 0) {
        result.warnings.push(`characters.md: ${updatedChars.length} existing characters may need manual review for updates`);
      }
    }
  }

  // Sync voice profiles
  const voiceProfilePath = path.join(bookKnowledgeDir, 'voice-profiles.json');
  if (fs.existsSync(voiceProfilePath)) {
    // Voice profiles are per-book, but character voice patterns should be consistent
    // across books. We note this in the lorebook.
    const seriesCharsPath = path.join(lorebookDir, 'characters.md');
    const seriesChars = fs.existsSync(seriesCharsPath)
      ? fs.readFileSync(seriesCharsPath, 'utf-8')
      : '';

    if (!seriesChars.includes('*Voice profiles: synced from book*')) {
      fs.appendFileSync(
        seriesCharsPath,
        '\n---\n\n*Voice profiles synced from per-book voice-profiles.json. Check each book\'s voice profiles for character voice consistency.*\n',
        'utf-8'
      );
      result.synced.push('characters.md: voice profile reference added');
    }
  }

  // Sync timeline
  const bookTimelinePath = path.join(projectRoot, 'book', 'tracking', 'timeline.json');
  if (fs.existsSync(bookTimelinePath)) {
    const bookTimeline = fs.readJsonSync(bookTimelinePath);
    const seriesTimeline = loadTimeline(projectRoot);
    const bookNumber = loadBookTrackInfo(projectRoot).bookNumber || 1;

    // Add book timeline entries to series timeline
    let added = 0;
    if (bookTimeline.events && Array.isArray(bookTimeline.events)) {
      for (const evt of bookTimeline.events) {
        // Check if this entry already exists
        const exists = seriesTimeline.entries.some(
          e => e.date === evt.date && e.event === evt.event && e.bookNumber === bookNumber
        );
        if (!exists) {
          seriesTimeline.entries.push({
            date: evt.date || '',
            bookNumber,
            chapter: evt.chapter,
            event: evt.event,
            significance: evt.significance || '',
          });
          added++;
        }
      }
    }

    if (added > 0) {
      saveTimeline(projectRoot, seriesTimeline);
      result.synced.push(`timeline.json: +${added} entries from book ${bookNumber}`);
    }
  }

  // Sync glossary terms (from style sheet terminology)
  const terminologyPath = path.join(projectRoot, 'book', 'metadata', 'terminology.md');
  if (fs.existsSync(terminologyPath)) {
    const terminology = fs.readFileSync(terminologyPath, 'utf-8');
    const seriesGlossaryPath = path.join(lorebookDir, 'glossary.md');

    // Extract decisions from terminology module
    const decisions = terminology.split('---').filter(b => b.trim().length > 0);
    const newTerms: string[] = [];
    for (const block of decisions) {
      const decisionMatch = block.match(/\*\*Decision\*\*:\s*(.+)/);
      if (decisionMatch) {
        newTerms.push(`- ${decisionMatch[1].trim()}`);
      }
    }

    if (newTerms.length > 0) {
      const seriesGlossary = fs.existsSync(seriesGlossaryPath)
        ? fs.readFileSync(seriesGlossaryPath, 'utf-8')
        : '';

      const bookNumber = loadBookTrackInfo(projectRoot).bookNumber || 1;
      const block = `\n## Book ${bookNumber} Terms\n\n${newTerms.join('\n')}\n`;
      fs.appendFileSync(seriesGlossaryPath, block, 'utf-8');
      result.synced.push(`glossary.md: +${newTerms.length} terms from book ${bookNumber}`);
    }
  }

  return result;
}

// ─── Series-Level Continuity Scan ─────────────────────────────────────────

/** Scan all books in the series for character, timeline, world, and glossary continuity issues. */
export function seriesContinuityScan(
  projectRoot: string
): SeriesContinuityFinding[] {
  const findings: SeriesContinuityFinding[] = [];

  if (!seriesExists(projectRoot)) {
    findings.push({
      type: 'glossary',
      severity: 'observation',
      books: [],
      finding: 'No series initialized — continuity scan not applicable',
      evidence: 'No series/meta.json found',
    });
    return findings;
  }

  const meta = loadSeriesMeta(projectRoot);
  if (!meta) return findings;

  // Load all book directories
  const bookPaths = meta.books
    .filter(b => fs.existsSync(path.join(projectRoot, b.path, 'book', 'content')))
    .map(b => ({ ...b, fullPath: path.join(projectRoot, b.path, 'book') }));

  // ─── Character continuity across books ───
  const lorebookCharsPath = path.join(getLorebookDir(projectRoot), 'characters.md');
  if (fs.existsSync(lorebookCharsPath)) {
    const lorebookChars = fs.readFileSync(lorebookCharsPath, 'utf-8');
    const charNames = (lorebookChars.match(/^## (.+)$/gm) || []).map(m => m.replace(/^## /, ''));

    for (const book of bookPaths) {
      const bookCharPath = path.join(book.fullPath, 'knowledge', 'character-profiles.md');
      if (!fs.existsSync(bookCharPath)) continue;
      const bookChars = fs.readFileSync(bookCharPath, 'utf-8');
      const bookCharNames = (bookChars.match(/^## (.+)$/gm) || []).map(m => m.replace(/^## /, ''));

      // Check for characters in book but not in lorebook
      const missingFromLorebook = bookCharNames.filter(n => !charNames.includes(n));
      for (const name of missingFromLorebook) {
        findings.push({
          type: 'character',
          severity: 'minor',
          books: [book.bookNumber],
          finding: `Character "${name}" appears in book ${book.bookNumber} but not in series lorebook`,
          evidence: `Book ${book.bookNumber} character-profiles.md has "## ${name}"`,
        });
      }
    }
  }

  // ─── Timeline continuity across books ───
  const timeline = loadTimeline(projectRoot);
  const timelineByDate = new Map<string, SeriesTimelineEntry[]>();
  for (const entry of timeline.entries) {
    if (!entry.date) continue;
    const existing = timelineByDate.get(entry.date) || [];
    existing.push(entry);
    timelineByDate.set(entry.date, existing);
  }

  // Check for same-date events across books that might conflict
  for (const [date, entries] of timelineByDate) {
    if (entries.length > 1 && new Set(entries.map(e => e.bookNumber)).size > 1) {
      // Same date across different books — check if events are compatible
      const bookNumbers = [...new Set(entries.map(e => e.bookNumber))];
      findings.push({
        type: 'timeline',
        severity: 'observation',
        books: bookNumbers,
        finding: `Date "${date}" appears in books ${bookNumbers.join(', ')} — verify events are compatible`,
        evidence: entries.map(e => `Book ${e.bookNumber}: ${e.event}`).join('; '),
      });
    }
  }

  // Check timeline ordering across books
  const sortedEntries = [...timeline.entries].sort((a, b) => {
    if (a.date && b.date) return a.date.localeCompare(b.date);
    return a.bookNumber - b.bookNumber;
  });

  for (let i = 1; i < sortedEntries.length; i++) {
    const prev = sortedEntries[i - 1];
    const curr = sortedEntries[i];
    if (prev.date && curr.date && prev.bookNumber > curr.bookNumber && prev.date < curr.date) {
      findings.push({
        type: 'timeline',
        severity: 'major',
        books: [prev.bookNumber, curr.bookNumber],
        finding: `Timeline ordering issue: book ${prev.bookNumber} event ("${prev.event}") is dated before book ${curr.bookNumber} event ("${curr.event}") but book ${prev.bookNumber} is later`,
        evidence: `Date ${prev.date} (book ${prev.bookNumber}) < Date ${curr.date} (book ${curr.bookNumber})`,
      });
    }
  }

  // ─── World consistency across books ───
  const lorebookWorldPath = path.join(getLorebookDir(projectRoot), 'world.md');
  if (fs.existsSync(lorebookWorldPath)) {
    const lorebookWorld = fs.readFileSync(lorebookWorldPath, 'utf-8');
    // Extract world facts (## headings)
    const worldFacts = (lorebookWorld.match(/^## (.+)$/gm) || []).map(m => m.replace(/^## /, ''));

    for (const book of bookPaths) {
      const bookLocPath = path.join(book.fullPath, 'knowledge', 'locations.md');
      if (!fs.existsSync(bookLocPath)) continue;
      const bookLocs = fs.readFileSync(bookLocPath, 'utf-8');
      const bookLocNames = (bookLocs.match(/^## (.+)$/gm) || []).map(m => m.replace(/^## /, ''));

      // Check for locations in book but not in lorebook
      const missingFromLorebook = bookLocNames.filter(n => !worldFacts.includes(n));
      for (const name of missingFromLorebook) {
        findings.push({
          type: 'world',
          severity: 'minor',
          books: [book.bookNumber],
          finding: `Location "${name}" appears in book ${book.bookNumber} but not in series world lorebook`,
          evidence: `Book ${book.bookNumber} locations.md has "## ${name}"`,
        });
      }
    }
  }

  // ─── Glossary consistency ───
  const lorebookGlossaryPath = path.join(getLorebookDir(projectRoot), 'glossary.md');
  if (fs.existsSync(lorebookGlossaryPath)) {
    const glossary = fs.readFileSync(lorebookGlossaryPath, 'utf-8');
    // Check for conflicting term definitions
    const termBlocks = glossary.split(/^## /m).filter(b => b.trim().length > 0);
    const termDefs = new Map<string, string[]>();

    for (const block of termBlocks) {
      const termName = block.split('\n')[0].trim();
      const def = block.split('\n').slice(1).join(' ').trim();
      const existing = termDefs.get(termName.toLowerCase()) || [];
      existing.push(def);
      termDefs.set(termName.toLowerCase(), existing);
    }

    for (const [term, defs] of termDefs) {
      if (defs.length > 1) {
        // Check if definitions conflict
        const uniqueDefs = [...new Set(defs.map(d => d.substring(0, 50)))];
        if (uniqueDefs.length > 1) {
          findings.push({
            type: 'glossary',
            severity: 'major',
            books: [],
            finding: `Term "${term}" has conflicting definitions in glossary`,
            evidence: defs.map(d => `"${d.substring(0, 80)}..."`).join(' vs '),
          });
        }
      }
    }
  }

  return findings;
}

/** Format series continuity scan findings as a markdown report. */
export function formatContinuityReport(findings: SeriesContinuityFinding[]): string {
  const lines: string[] = [];
  lines.push('# Series Continuity Scan Report');
  lines.push('');

  const critical = findings.filter(f => f.severity === 'critical');
  const major = findings.filter(f => f.severity === 'major');
  const minor = findings.filter(f => f.severity === 'minor');
  const observations = findings.filter(f => f.severity === 'observation');

  lines.push(`## Summary`);
  lines.push(`- Critical: ${critical.length}`);
  lines.push(`- Major: ${major.length}`);
  lines.push(`- Minor: ${minor.length}`);
  lines.push(`- Observations: ${observations.length}`);
  lines.push('');

  if (critical.length > 0) {
    lines.push('## Critical Issues (HARD BLOCK)');
    for (const f of critical) {
      lines.push(`- **[${f.type}]** Books ${f.books.join(', ')}: ${f.finding}`);
      lines.push(`  Evidence: ${f.evidence}`);
    }
    lines.push('');
  }

  if (major.length > 0) {
    lines.push('## Major Issues');
    for (const f of major) {
      lines.push(`- **[${f.type}]** Books ${f.books.join(', ')}: ${f.finding}`);
      lines.push(`  Evidence: ${f.evidence}`);
    }
    lines.push('');
  }

  if (minor.length > 0) {
    lines.push('## Minor Issues');
    for (const f of minor) {
      lines.push(`- **[${f.type}]** Book ${f.books.join(', ')}: ${f.finding}`);
    }
    lines.push('');
  }

  if (observations.length > 0) {
    lines.push('## Observations');
    for (const f of observations) {
      lines.push(`- **[${f.type}]** ${f.finding}`);
    }
  }

  if (findings.length === 0) {
    lines.push('**No issues found. Series is internally consistent.**');
  }

  return lines.join('\n');
}

// ─── Register Book ───────────────────────────────────────────────────────

/** Register a new book in the series metadata or update an existing one. */
export function registerBook(
  projectRoot: string,
  bookNumber: number,
  bookTitle: string,
  bookPath: string
): void {
  const meta = loadSeriesMeta(projectRoot);
  if (!meta) return;

  // Check if book already registered
  const existing = meta.books.find(b => b.bookNumber === bookNumber);
  if (existing) {
    existing.title = bookTitle;
    existing.path = bookPath;
  } else {
    meta.books.push({
      bookNumber,
      title: bookTitle,
      path: bookPath,
      status: 'drafting',
    });
    meta.books.sort((a, b) => a.bookNumber - b.bookNumber);
    meta.bookCount = meta.books.length;
  }

  saveSeriesMeta(projectRoot, meta);
}

/** Update the status of a registered book (planned/drafting/complete/published). */
export function updateBookStatus(
  projectRoot: string,
  bookNumber: number,
  status: SeriesMeta['books'][0]['status']
): void {
  const meta = loadSeriesMeta(projectRoot);
  if (!meta) return;

  const book = meta.books.find(b => b.bookNumber === bookNumber);
  if (book) {
    book.status = status;
    saveSeriesMeta(projectRoot, meta);
  }
}