/**
 * Lorebook Import — External World-Building Format Converter
 *
 * Converts lorebooks/world info from AI roleplay platforms into the
 * Kombinat Writer series lorebook format. These platforms often contain
 * extensively developed world-building, character sheets, and lore entries
 * created through months of interactive experimentation — exactly the
 * kind of deep world knowledge that benefits a book series.
 *
 * Supported formats:
 *
 * 1. SillyTavern — World Info / Lorebook JSON
 *    Path: usually exported as a .json file from SillyTavern's
 *    "World Info" editor. Contains entries with keys, content,
 *    order, and selective logic.
 *
 * 2. JanitorAI — Character definitions and persona/scenario JSON
 *    Path: exported character cards (.json) or chat history.
 *    Contains personality, scenario, first_message, system_prompt.
 *
 * 3. CharacterAI — Character definitions (.json)
 *    Path: exported via character.ai's character editor.
 *    Contains name, greeting, description, title, definitions.
 *
 * All formats are converted to the Kombinat lorebook structure:
 *   ./series/lorebook/
 *   ├── characters.md  (from character sheets)
 *   ├── world.md        (from world info / scenario / setting)
 *   ├── glossary.md     (from lorebook entries with short content)
 *   ├── timeline.json   (from dated entries, if any)
 *   └── threads.md      (from plot-related entries)
 *
 * Usage:
 *   importLorebook(projectRoot, format, inputPath, options)
 */

import fs from 'fs-extra';
import path from 'path';

// ─── Types ────────────────────────────────────────────────────────────────

export type ImportFormat = 'sillytavern' | 'janitorai' | 'characterai' | 'auto';

export interface ImportOptions {
  /** Overwrite existing lorebook entries (default: false — append) */
  overwrite?: boolean;
  /** Tag imported entries with their source format */
  tagSource?: boolean;
  /** Extract characters from persona/character definitions */
  extractCharacters?: boolean;
  /** Extract world/setting from scenario/world info entries */
  extractWorld?: boolean;
  /** Extract glossary terms from short entries */
  extractGlossary?: boolean;
  /** Minimum content length to be treated as a world entry (chars) */
  minWorldEntryLength?: number;
}

export interface ImportResult {
  format: ImportFormat;
  detected: ImportFormat;
  entriesImported: number;
  charactersExtracted: number;
  worldEntriesExtracted: number;
  glossaryTermsExtracted: number;
  timelineEntries: number;
  threadEntries: number;
  warnings: string[];
  errors: string[];
}

// ─── Format Detection ────────────────────────────────────────────────────

export function detectFormat(inputPath: string): ImportFormat {
  const content = fs.readFileSync(inputPath, 'utf-8');

  // SillyTavern world info: has "entries" object with uid keys
  if (content.includes('"entries"') && (content.includes('"uid"') || content.includes('"key"'))) {
    return 'sillytavern';
  }

  // JanitorAI: character card with "personality", "scenario", "first_message"
  if (content.includes('"personality"') || content.includes('"first_message"') || content.includes('"scenario"')) {
    return 'janitorai';
  }

  // CharacterAI: has "greeting", "description", "definitions"
  if (content.includes('"greeting"') && content.includes('"description"')) {
    return 'characterai';
  }

  // Try JSON parsing for deeper detection
  try {
    const json = JSON.parse(content);
    if (json.entries && typeof json.entries === 'object') return 'sillytavern';
    if (json.personality || json.first_message || json.scenario) return 'janitorai';
    if (json.greeting && json.description) return 'characterai';
  } catch {
    // Not JSON — could be a directory of files
  }

  return 'sillytavern'; // default fallback
}

// ─── SillyTavern Parser ──────────────────────────────────────────────────

interface SillyTavernEntry {
  uid: number;
  key?: string[];
  keysecondary?: string[];
  comment?: string;
  content: string;
  constant?: boolean;
  selective?: boolean;
  order?: number;
  position?: number;
  disable?: boolean;
  addMemo?: string;
  excludeRecursion?: boolean;
}

interface SillyTavernWorldInfo {
  entries: Record<string, SillyTavernEntry>;
}

export function parseSillyTavern(inputPath: string): {
  characters: CharacterEntry[];
  worldEntries: WorldEntry[];
  glossaryTerms: GlossaryTerm[];
  timelineEntries: TimelineEntry[];
  threadEntries: ThreadEntry[];
  warnings: string[];
} {
  const warnings: string[] = [];
  const result = {
    characters: [] as CharacterEntry[],
    worldEntries: [] as WorldEntry[],
    glossaryTerms: [] as GlossaryTerm[],
    timelineEntries: [] as TimelineEntry[],
    threadEntries: [] as ThreadEntry[],
    warnings,
  };

  const content = fs.readFileSync(inputPath, 'utf-8');
  let worldInfo: SillyTavernWorldInfo;

  try {
    worldInfo = JSON.parse(content);
  } catch {
    warnings.push('Failed to parse SillyTavern JSON — file may be corrupted');
    return result;
  }

  if (!worldInfo.entries || typeof worldInfo.entries !== 'object') {
    warnings.push('No "entries" field found in SillyTavern world info');
    return result;
  }

  for (const [uid, entry] of Object.entries(worldInfo.entries)) {
    if (entry.disable) continue;

    const keys = entry.key || [];
    const content = entry.content || '';
    const comment = entry.comment || '';
    const name = keys[0] || comment || `Entry ${uid}`;

    // Classify the entry based on its content and keys
    const classification = classifyEntry(name, content, keys);

    switch (classification) {
      case 'character':
        result.characters.push({
          name,
          aliases: keys.slice(1),
          description: content,
          source: 'sillytavern',
          raw: entry,
        });
        break;

      case 'world':
        result.worldEntries.push({
          name,
          content,
          keys,
          source: 'sillytavern',
        });
        break;

      case 'glossary':
        result.glossaryTerms.push({
          term: name,
          definition: content,
          source: 'sillytavern',
        });
        break;

      case 'timeline':
        result.timelineEntries.push({
          date: extractDate(content) || '',
          event: name,
          significance: content.substring(0, 200),
          source: 'sillytavern',
        });
        break;

      case 'thread':
        result.threadEntries.push({
          name,
          description: content,
          status: 'active',
          source: 'sillytavern',
        });
        break;

      default:
        // Unclassified — treat as world entry
        result.worldEntries.push({
          name,
          content,
          keys,
          source: 'sillytavern',
        });
    }
  }

  return result;
}

// ─── JanitorAI Parser ────────────────────────────────────────────────────

interface JanitorAICharacter {
  name?: string;
  personality?: string;
  scenario?: string;
  first_message?: string;
  system_prompt?: string;
  description?: string;
  tags?: string[];
  creator_notes?: string;
  extensions?: Record<string, any>;
}

export function parseJanitorAI(inputPath: string): {
  characters: CharacterEntry[];
  worldEntries: WorldEntry[];
  glossaryTerms: GlossaryTerm[];
  timelineEntries: TimelineEntry[];
  threadEntries: ThreadEntry[];
  warnings: string[];
} {
  const warnings: string[] = [];
  const result = {
    characters: [] as CharacterEntry[],
    worldEntries: [] as WorldEntry[],
    glossaryTerms: [] as GlossaryTerm[],
    timelineEntries: [] as TimelineEntry[],
    threadEntries: [] as ThreadEntry[],
    warnings,
  };

  const content = fs.readFileSync(inputPath, 'utf-8');
  let char: JanitorAICharacter;

  try {
    char = JSON.parse(content);
  } catch {
    warnings.push('Failed to parse JanitorAI JSON — file may be corrupted');
    return result;
  }

  // JanitorAI is primarily character cards
  if (char.name) {
    const description = [
      char.description || '',
      char.personality ? `\n\n**Personality:** ${char.personality}` : '',
      char.scenario ? `\n\n**Scenario:** ${char.scenario}` : '',
      char.first_message ? `\n\n**First Message:** ${char.first_message}` : '',
      char.system_prompt ? `\n\n**System Prompt:** ${char.system_prompt}` : '',
      char.creator_notes ? `\n\n**Creator Notes:** ${char.creator_notes}` : '',
    ].join('');

    result.characters.push({
      name: char.name,
      aliases: char.tags || [],
      description,
      source: 'janitorai',
      raw: char,
    });
  }

  // If scenario contains world-building, extract it
  if (char.scenario && char.scenario.length > 100) {
    result.worldEntries.push({
      name: `${char.name || 'Character'} — Scenario`,
      content: char.scenario,
      keys: [],
      source: 'janitorai',
    });
  }

  // Extract glossary from tags
  if (char.tags) {
    for (const tag of char.tags) {
      if (tag.length < 50) {
        result.glossaryTerms.push({
          term: tag,
          definition: `Tag from JanitorAI character: ${char.name || 'unknown'}`,
          source: 'janitorai',
        });
      }
    }
  }

  return result;
}

// ─── CharacterAI Parser ──────────────────────────────────────────────────

interface CharacterAICharacter {
  name?: string;
  greeting?: string;
  description?: string;
  title?: string;
  subtitle?: string;
  definitions?: string;
  avatar?: string;
  greeting2?: string;
  search?: boolean;
  version?: string;
}

export function parseCharacterAI(inputPath: string): {
  characters: CharacterEntry[];
  worldEntries: WorldEntry[];
  glossaryTerms: GlossaryTerm[];
  timelineEntries: TimelineEntry[];
  threadEntries: ThreadEntry[];
  warnings: string[];
} {
  const warnings: string[] = [];
  const result = {
    characters: [] as CharacterEntry[],
    worldEntries: [] as WorldEntry[],
    glossaryTerms: [] as GlossaryTerm[],
    timelineEntries: [] as TimelineEntry[],
    threadEntries: [] as ThreadEntry[],
    warnings,
  };

  const content = fs.readFileSync(inputPath, 'utf-8');
  let char: CharacterAICharacter;

  try {
    char = JSON.parse(content);
  } catch {
    warnings.push('Failed to parse CharacterAI JSON — file may be corrupted');
    return result;
  }

  if (char.name) {
    const description = [
      char.title ? `**Title:** ${char.title}` : '',
      char.subtitle ? `**Subtitle:** ${char.subtitle}` : '',
      char.description || '',
      char.definitions ? `\n\n**Definitions:**\n${char.definitions}` : '',
      char.greeting ? `\n\n**Greeting:** ${char.greeting}` : '',
      char.greeting2 ? `\n\n**Alt Greeting:** ${char.greeting2}` : '',
    ].filter(Boolean).join('\n\n');

    result.characters.push({
      name: char.name,
      aliases: [],
      description,
      source: 'characterai',
      raw: char,
    });
  }

  // Extract world from description if it's long
  if (char.description && char.description.length > 200) {
    result.worldEntries.push({
      name: `${char.name || 'Character'} — Description`,
      content: char.description,
      keys: [],
      source: 'characterai',
    });
  }

  return result;
}

// ─── Shared Types ────────────────────────────────────────────────────────

interface CharacterEntry {
  name: string;
  aliases: string[];
  description: string;
  source: string;
  raw: any;
}

interface WorldEntry {
  name: string;
  content: string;
  keys: string[];
  source: string;
}

interface GlossaryTerm {
  term: string;
  definition: string;
  source: string;
}

interface TimelineEntry {
  date: string;
  event: string;
  significance: string;
  source: string;
}

interface ThreadEntry {
  name: string;
  description: string;
  status: string;
  source: string;
}

// ─── Entry Classification ────────────────────────────────────────────────

function classifyEntry(
  name: string,
  content: string,
  keys: string[]
): 'character' | 'world' | 'glossary' | 'timeline' | 'thread' {
  const lowerName = name.toLowerCase();
  const lowerContent = content.toLowerCase();

  // Character indicators
  const characterIndicators = [
    /\bpersonality\b/, /\bappearance\b/, /\bbackstory\b/,
    /\bshe is\b/, /\bhe is\b/, /\bthey are\b/,
    /\bage:\b/, /\bheight:\b/, /\boccupation:\b/,
  ];
  if (characterIndicators.some(re => re.test(lowerContent))) return 'character';

  // Timeline indicators
  if (extractDate(content) || /\b(year|date|day|month|era|century)\b/i.test(lowerName)) {
    return 'timeline';
  }

  // Thread/plot indicators
  const threadIndicators = [
    /\bplot\b/, /\bquest\b/, /\bmission\b/, /\bconflict\b/,
    /\bstoryline\b/, /\bthread\b/, /\barc\b/,
  ];
  if (threadIndicators.some(re => re.test(lowerName) || re.test(lowerContent.substring(0, 100)))) {
    return 'thread';
  }

  // Glossary: short content (under ~200 chars), no paragraph breaks
  if (content.length < 200 && !content.includes('\n\n')) {
    return 'glossary';
  }

  // World: default for longer entries
  return 'world';
}

function extractDate(content: string): string | null {
  // Common date patterns
  const datePatterns = [
    /\b(\d{1,4}\s*(?:BCE|BC|AD|CE)?\s*[-–—]\s*\d{1,4}\s*(?:BCE|BC|AD|CE)?)\b/i,
    /\b(\d{4}\s*(?:BCE|BC|AD|CE)?)\b/i,
    /\b(Spring|Summer|Autumn|Fall|Winter)\s+(\d{1,4})\b/i,
    /\b(\d{1,2}(?:st|nd|rd|th)?\s+century)\b/i,
    /\b(Era\s+\w+)/i,
    /\b(Year\s+\d+)/i,
  ];

  for (const pattern of datePatterns) {
    const match = content.match(pattern);
    if (match) return match[1];
  }

  return null;
}

// ─── Lorebook Writer ─────────────────────────────────────────────────────

/**
 * Write parsed entries to the series lorebook.
 * Appends to existing files (or overwrites if options.overwrite is true).
 */
export function writeToLorebook(
  projectRoot: string,
  parsed: {
    characters: CharacterEntry[];
    worldEntries: WorldEntry[];
    glossaryTerms: GlossaryTerm[];
    timelineEntries: TimelineEntry[];
    threadEntries: ThreadEntry[];
  },
  options: ImportOptions
): ImportResult {
  const result: ImportResult = {
    format: 'sillytavern',
    detected: 'sillytavern',
    entriesImported: 0,
    charactersExtracted: 0,
    worldEntriesExtracted: 0,
    glossaryTermsExtracted: 0,
    timelineEntries: 0,
    threadEntries: 0,
    warnings: [],
    errors: [],
  };

  const lorebookDir = path.join(projectRoot, 'series', 'lorebook');
  if (!fs.existsSync(lorebookDir)) {
    result.errors.push('Series lorebook not initialized. Run /kombinat series init first.');
    return result;
  }

  const tag = options.tagSource !== false ? ` [Imported from ${parsed.characters[0]?.source || 'external'}]` : '';

  // ─── Characters ───
  if (options.extractCharacters !== false && parsed.characters.length > 0) {
    const charsPath = path.join(lorebookDir, 'characters.md');
    let existing = options.overwrite ? '' : (fs.existsSync(charsPath) ? fs.readFileSync(charsPath, 'utf-8') : '');

    const blocks: string[] = [];
    for (const char of parsed.characters) {
      // Check if character already exists
      if (!options.overwrite && existing.includes(`## ${char.name}`)) {
        result.warnings.push(`Character "${char.name}" already exists in lorebook — skipped`);
        continue;
      }

      const block = formatCharacterEntry(char, tag);
      blocks.push(block);
      result.charactersExtracted++;
    }

    if (blocks.length > 0) {
      fs.appendFileSync(charsPath, '\n' + blocks.join('\n'), 'utf-8');
    }
  }

  // ─── World ───
  if (options.extractWorld !== false && parsed.worldEntries.length > 0) {
    const worldPath = path.join(lorebookDir, 'world.md');
    let existing = options.overwrite ? '' : (fs.existsSync(worldPath) ? fs.readFileSync(worldPath, 'utf-8') : '');

    const blocks: string[] = [];
    for (const entry of parsed.worldEntries) {
      if (!options.overwrite && existing.includes(`## ${entry.name}`)) {
        result.warnings.push(`World entry "${entry.name}" already exists — skipped`);
        continue;
      }

      const block = `## ${entry.name}${tag}\n\n${entry.content}\n${entry.keys.length > 0 ? `\n*Keys: ${entry.keys.join(', ')}*\n` : ''}\n`;
      blocks.push(block);
      result.worldEntriesExtracted++;
    }

    if (blocks.length > 0) {
      fs.appendFileSync(worldPath, '\n' + blocks.join('\n'), 'utf-8');
    }
  }

  // ─── Glossary ───
  if (options.extractGlossary !== false && parsed.glossaryTerms.length > 0) {
    const glossaryPath = path.join(lorebookDir, 'glossary.md');
    let existing = options.overwrite ? '' : (fs.existsSync(glossaryPath) ? fs.readFileSync(glossaryPath, 'utf-8') : '');

    const blocks: string[] = [];
    for (const term of parsed.glossaryTerms) {
      if (!options.overwrite && existing.toLowerCase().includes(`- ${term.term.toLowerCase()}`)) {
        continue;
      }

      blocks.push(`- **${term.term}** — ${term.definition}${tag}`);
      result.glossaryTermsExtracted++;
    }

    if (blocks.length > 0) {
      fs.appendFileSync(glossaryPath, '\n' + blocks.join('\n') + '\n', 'utf-8');
    }
  }

  // ─── Timeline ───
  if (parsed.timelineEntries.length > 0) {
    const timelinePath = path.join(lorebookDir, 'timeline.json');
    let timeline: { entries: any[] } = { entries: [] };

    if (fs.existsSync(timelinePath) && !options.overwrite) {
      timeline = fs.readJsonSync(timelinePath);
    }

    for (const entry of parsed.timelineEntries) {
      // Check for duplicates
      const exists = timeline.entries.some(
        (e: any) => e.date === entry.date && e.event === entry.event
      );
      if (!exists) {
        timeline.entries.push({
          date: entry.date,
          bookNumber: 0, // imported — not tied to a specific book
          event: entry.event,
          significance: entry.significance,
        });
        result.timelineEntries++;
      }
    }

    fs.writeJsonSync(timelinePath, timeline, { spaces: 2 });
  }

  // ─── Threads ───
  if (parsed.threadEntries.length > 0) {
    const threadsPath = path.join(lorebookDir, 'threads.md');
    let existing = options.overwrite ? '' : (fs.existsSync(threadsPath) ? fs.readFileSync(threadsPath, 'utf-8') : '');

    const blocks: string[] = [];
    for (const thread of parsed.threadEntries) {
      if (!options.overwrite && existing.includes(`## ${thread.name}`)) {
        continue;
      }

      const block = `## ${thread.name}${tag}\n\n**Status**: ${thread.status}\n\n${thread.description}\n`;
      blocks.push(block);
      result.threadEntries++;
    }

    if (blocks.length > 0) {
      fs.appendFileSync(threadsPath, '\n' + blocks.join('\n'), 'utf-8');
    }
  }

  result.entriesImported = result.charactersExtracted + result.worldEntriesExtracted +
    result.glossaryTermsExtracted + result.timelineEntries + result.threadEntries;

  return result;
}

function formatCharacterEntry(char: CharacterEntry, tag: string): string {
  const lines: string[] = [];
  lines.push(`## ${char.name}${tag}`);
  if (char.aliases.length > 0) {
    lines.push(`*Aliases: ${char.aliases.join(', ')}*`);
  }
  lines.push('');
  lines.push(char.description);
  lines.push('');
  return lines.join('\n');
}

// ─── Main Import Function ────────────────────────────────────────────────

export function importLorebook(
  projectRoot: string,
  format: ImportFormat,
  inputPath: string,
  options: ImportOptions = {}
): ImportResult {
  const opts: ImportOptions = {
    overwrite: false,
    tagSource: true,
    extractCharacters: true,
    extractWorld: true,
    extractGlossary: true,
    minWorldEntryLength: 50,
    ...options,
  };

  // Auto-detect format
  const detected = format === 'auto' ? detectFormat(inputPath) : format;

  let parsed: {
    characters: CharacterEntry[];
    worldEntries: WorldEntry[];
    glossaryTerms: GlossaryTerm[];
    timelineEntries: TimelineEntry[];
    threadEntries: ThreadEntry[];
    warnings: string[];
  };

  switch (detected) {
    case 'sillytavern':
      parsed = parseSillyTavern(inputPath);
      break;
    case 'janitorai':
      parsed = parseJanitorAI(inputPath);
      break;
    case 'characterai':
      parsed = parseCharacterAI(inputPath);
      break;
    default:
      parsed = parseSillyTavern(inputPath); // fallback
  }

  const result = writeToLorebook(projectRoot, parsed, opts);
  result.format = format;
  result.detected = detected;
  result.warnings.push(...parsed.warnings);

  return result;
}

// ─── Import Report ───────────────────────────────────────────────────────

export function formatImportReport(result: ImportResult): string {
  const lines: string[] = [];
  lines.push('# Lorebook Import Report');
  lines.push('');
  lines.push(`**Requested format**: ${result.format}`);
  lines.push(`**Detected format**: ${result.detected}`);
  lines.push(`**Total entries imported**: ${result.entriesImported}`);
  lines.push('');
  lines.push('### Breakdown');
  lines.push(`- Characters: ${result.charactersExtracted}`);
  lines.push(`- World entries: ${result.worldEntriesExtracted}`);
  lines.push(`- Glossary terms: ${result.glossaryTermsExtracted}`);
  lines.push(`- Timeline entries: ${result.timelineEntries}`);
  lines.push(`- Plot threads: ${result.threadEntries}`);

  if (result.warnings.length > 0) {
    lines.push('');
    lines.push('### Warnings');
    for (const w of result.warnings) {
      lines.push(`- ${w}`);
    }
  }

  if (result.errors.length > 0) {
    lines.push('');
    lines.push('### Errors');
    for (const e of result.errors) {
      lines.push(`- ${e}`);
    }
  }

  return lines.join('\n');
}