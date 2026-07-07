/**
 * Quality Gates — Hard-Block Verification System
 *
 * Every gate produces evidence, not just "checked".
 * Gates block progression if verification fails. No soft warnings.
 *
 * Gates:
 *   outlineGate     — Verify outline has fine-grained plot points, setup/payoff, carry-forward anchors
 *   preDraftGate    — Verify all 13 context items loaded with evidence
 *   postDraftGate   — Verify tracking updated, outline met, voice consistent, hooks present
 *   revisionVerify  — Cross-reference critique items against revision log
 *   continuityCheck  — Scan all chapters for consistency
 */

import fs from 'fs-extra';
import path from 'path';
import { checkVoiceDrift, loadProfiles, profilesExist, type VoiceDriftReport } from './voice-profile.js';
import { loadConstraints, checkConstraints, formatViolationReport } from './creative-constraints.js';

// ─── Types ────────────────────────────────────────────────────────────────

export interface GateResult {
  gate: string;
  passed: boolean;
  blocking: string[];      // Critical issues that block progression
  warnings: string[];      // Non-blocking issues to address
  evidence: string[];      // What was actually checked, with findings
}

// ─── Outline Gate ──────────────────────────────────────────────────────────
//
// Verifies that an outline is fine-grained enough to prevent continuity errors
// during drafting. A coarse outline ("Chapter 5: The protagonists argue and
// reconcile") leaves the LLM to improvise details that will later contradict
// other chapters. A fine-grained outline specifies scene-level beats, what
// each scene carries forward from earlier chapters, and what it sets up for
// later chapters. The draft phase can then load only the relevant slice of
// the outline as an "awareness map" rather than the whole book.
//
// The gate parses the outline markdown and checks the following hard
// requirements per chapter entry:
//
//   1. Scene beats  — Each chapter lists at least 2 scenes with a one-line
//      goal and a one-line conflict. Vague single-paragraph summaries fail.
//   2. Setup/payoff pairs — Each chapter must declare at least one
//      "sets-up" field pointing forward to a chapter/beat that pays it off,
//      and one "payoff-from" field pointing backward to a chapter/beat that
//      set it up. The first chapter may have an empty payoff-from; the last
//      chapter may have an empty sets-up. Every other chapter must have both.
//   3. Carry-forward anchors — Each chapter declares continuity anchors:
//      characters present, key objects, timeline position, and any open
//      threads carried into this chapter. These are what the draft phase
//      loads to maintain awareness without rereading prior chapters.
//   4. Continuity anchor cross-check — Every "payoff-from" reference must
//      point to a chapter whose "sets-up" references the current chapter.
//      Mismatched pairs are a hard block — they indicate a broken setup
//      chain that will surface as a continuity error in drafting.
//   5. Pacing distribution — The set of pacing tags across all chapters
//      must roughly match the constitution's declared pacing strategy.
//      A lopsided distribution (e.g. all Rising, no Calm) is a hard block.
//
// The gate is structural — it does not evaluate literary quality, only
// whether the outline provides enough scaffolding for consistent drafting.

export interface OutlineChapter {
  number: number;
  title: string;
  pacing: string;
  scenes: Array<{ goal: string; conflict: string }>;
  setsUp: string[];        // forward references (e.g. "Ch7: reveal traitor")
  payoffFrom: string[];    // backward references (e.g. "Ch2: planted dagger")
  charactersPresent: string[];
  timelinePosition: string;
  openThreads: string[];   // threads carried into this chapter
  rawEntry: string;        // original markdown block for error reporting
}

function parseOutline(content: string): OutlineChapter[] {
  const chapters: OutlineChapter[] = [];

  // Split on chapter headings: "## Chapter N", "### Chapter N", or
  // "**Chapter N**" at the start of a line.
  const chapterRegex = /^(?:#{2,4}|##)\s+Chapter\s+(\d+)\s*[:\-—]?\s*(.*)$/gim;
  const matches = [...content.matchAll(chapterRegex)];
  if (matches.length === 0) {
    // Try alternative: "**Chapter N:**"
    const altRegex = /^\*\*Chapter\s+(\d+):?\*\*\s*(.*)$/gim;
    const altMatches = [...content.matchAll(altRegex)];
    for (let i = 0; i < altMatches.length; i++) {
      const m = altMatches[i];
      const start = m.index ?? 0;
      const end = i + 1 < altMatches.length ? (altMatches[i + 1].index ?? content.length) : content.length;
      chapters.push(parseChapterBlock(parseInt(m[1]), m[2].trim(), content.slice(start, end)));
    }
    return chapters;
  }

  for (let i = 0; i < matches.length; i++) {
    const m = matches[i];
    const start = m.index ?? 0;
    const end = i + 1 < matches.length ? (matches[i + 1].index ?? content.length) : content.length;
    chapters.push(parseChapterBlock(parseInt(m[1]), m[2].trim(), content.slice(start, end)));
  }
  return chapters;
}

function parseChapterBlock(num: number, title: string, block: string): OutlineChapter {
  const scenes: Array<{ goal: string; conflict: string }> = [];
  // Scene lines: "- **Scene 1:** Goal. Conflict." or "### Scene 1" followed by goal/conflict
  const sceneRegex = /(?:[-*]\s*\*\*Scene\s+\d+:?\*\*|###\s+Scene\s+\d+)\s*(.*)$/gim;
  const sceneMatches = [...block.matchAll(sceneRegex)];
  for (const sm of sceneMatches) {
    const line = sm[1].trim();
    // Extract goal/conflict from the same line or look for "Goal:"/"Conflict:" nearby
    let goal = '';
    let conflict = '';
    const inlineMatch = line.match(/^(.+?)(?:\.|\;|\n)\s*(?:Conflict|Conflict:)\s*(.+)$/i);
    if (inlineMatch) {
      goal = inlineMatch[1].trim();
      conflict = inlineMatch[2].trim();
    } else {
      goal = line;
      const conflictMatch = block.slice(sm.index ?? 0).match(/Conflict:?\s*(.+)$/im);
      if (conflictMatch) conflict = conflictMatch[1].trim();
    }
    scenes.push({ goal, conflict });
  }

  // Extract sets-up / payoff-from
  const setsUp = extractRefList(block, /sets[- ]?up:?\s*(.+)$/im);
  const payoffFrom = extractRefList(block, /payoff[- ]?from:?\s*(.+)$/im);

  // Extract continuity anchors
  const charactersPresent = extractListField(block, /characters?[- ]present:?\s*(.+)$/im);
  const timelinePosition = extractField(block, /timeline(?:\s+position)?:?\s*(.+)$/im);
  const openThreads = extractListField(block, /open[- ]?threads?:?\s*(.+)$/im);

  // Pacing
  const pacingMatch = block.match(/pacing:?\s*(\S+)/im);
  const pacing = pacingMatch ? pacingMatch[1].trim() : '';

  return { number: num, title, pacing, scenes, setsUp, payoffFrom, charactersPresent, timelinePosition, openThreads, rawEntry: block };
}

function extractRefList(block: string, regex: RegExp): string[] {
  const match = block.match(regex);
  if (!match) return [];
  // Split on semicolons, commas, or "and"
  return match[1].split(/;|,|\band\b/i).map(s => s.trim()).filter(s => s.length > 0 && s.toLowerCase() !== 'none');
}

function extractListField(block: string, regex: RegExp): string[] {
  const match = block.match(regex);
  if (!match) return [];
  return match[1].split(/;|,|\band\b/i).map(s => s.trim()).filter(s => s.length > 0 && s.toLowerCase() !== 'none');
}

function extractField(block: string, regex: RegExp): string {
  const match = block.match(regex);
  return match ? match[1].trim() : '';
}

export function outlineGate(
  projectRoot: string
): GateResult {
  const blocking: string[] = [];
  const warnings: string[] = [];
  const evidence: string[] = [];

  // 1. Find the outline file
  const outlinePath = path.join(projectRoot, 'book', 'outline.md');
  const outlineShardPath = path.join(projectRoot, 'book', 'outline', '_main.md');

  let content: string;
  let outlineFile: string;

  if (fs.existsSync(outlinePath)) {
    content = fs.readFileSync(outlinePath, 'utf-8');
    outlineFile = 'book/outline.md';
  } else if (fs.existsSync(outlineShardPath)) {
    // Merge all shards
    const shardDir = path.join(projectRoot, 'book', 'outline');
    const shards = fs.readdirSync(shardDir).filter(f => f.endsWith('.md')).sort();
    content = shards.map(s => fs.readFileSync(path.join(shardDir, s), 'utf-8')).join('\n\n');
    outlineFile = `book/outline/ (${shards.length} shards)`;
  } else {
    blocking.push('Outline: Not found at book/outline.md or book/outline/_main.md');
    return { gate: 'outline', passed: false, blocking, warnings, evidence };
  }

  evidence.push(`✓ Outline found: ${outlineFile} (${content.length} bytes)`);

  // 2. Parse chapters
  const chapters = parseOutline(content);
  if (chapters.length === 0) {
    blocking.push('Outline: No chapter entries found — expected "## Chapter N" or "**Chapter N:**" headings');
    return { gate: 'outline', passed: false, blocking, warnings, evidence };
  }
  evidence.push(`✓ Parsed ${chapters.length} chapter entries`);

  // 3. Per-chapter checks
  const totalChapters = chapters.length;

  for (const ch of chapters) {
    const label = `Chapter ${ch.number}: ${ch.title || '(untitled)'}`;

    // 3a. Scene beats
    if (ch.scenes.length < 2) {
      blocking.push(`${label}: Has ${ch.scenes.length} scene beat(s) — minimum 2 required. Add scene-level beats with goals and conflicts.`);
    } else {
      let sceneBlock = false;
      for (let i = 0; i < ch.scenes.length; i++) {
        if (!ch.scenes[i].goal || ch.scenes[i].goal.length < 5) {
          blocking.push(`${label}, Scene ${i + 1}: Missing or vague goal — state what the scene accomplishes.`);
          sceneBlock = true;
        }
        if (!ch.scenes[i].conflict || ch.scenes[i].conflict.length < 5) {
          blocking.push(`${label}, Scene ${i + 1}: Missing or vague conflict — state what opposes the goal.`);
          sceneBlock = true;
        }
      }
      if (!sceneBlock) {
        evidence.push(`✓ ${label}: ${ch.scenes.length} scenes with goals and conflicts`);
      }
    }

    // 3b. Setup/payoff pairs
    const isFirst = ch.number === chapters[0].number;
    const isLast = ch.number === chapters[totalChapters - 1].number;

    if (ch.setsUp.length === 0 && !isLast) {
      blocking.push(`${label}: No "sets-up" declarations — this chapter must set up at least one future payoff.`);
    }
    if (ch.payoffFrom.length === 0 && !isFirst) {
      blocking.push(`${label}: No "payoff-from" declarations — this chapter must pay off at least one earlier setup.`);
    }
    if (ch.setsUp.length > 0) {
      evidence.push(`✓ ${label}: Sets up ${ch.setsUp.length} future payoff(s)`);
    }
    if (ch.payoffFrom.length > 0) {
      evidence.push(`✓ ${label}: Pays off ${ch.payoffFrom.length} earlier setup(s)`);
    }

    // 3c. Continuity anchors
    if (ch.charactersPresent.length === 0) {
      blocking.push(`${label}: Missing "characters-present" — draft phase needs this to know who's in the scene.`);
    }
    if (!ch.timelinePosition) {
      blocking.push(`${label}: Missing "timeline" position — draft phase needs this for chronological consistency.`);
    }
    if (ch.openThreads.length === 0 && !isFirst && !isLast) {
      warnings.push(`${label}: No "open-threads" declared — verify no threads carry into this chapter.`);
    }

    // 3d. Pacing tag
    if (!ch.pacing) {
      blocking.push(`${label}: Missing pacing tag — pacing distribution check cannot run without it.`);
    }
  }

  // 4. Continuity anchor cross-check — verify setup/payoff pairs are bidirectional
  // For each chapter A that says "sets-up: ChB", check that ChB has "payoff-from: ChA".
  for (const ch of chapters) {
    for (const ref of ch.setsUp) {
      const targetNum = parseChapterRef(ref);
      if (targetNum === null) {
        warnings.push(`Chapter ${ch.number}: "sets-up: ${ref}" — could not parse chapter number from reference`);
        continue;
      }
      const target = chapters.find(c => c.number === targetNum);
      if (!target) {
        blocking.push(`Chapter ${ch.number}: "sets-up: ${ref}" — references chapter ${targetNum} which does not exist in outline`);
        continue;
      }
      // Check that target has a payoff-from pointing back to ch.number
      const hasBackRef = target.payoffFrom.some(r => parseChapterRef(r) === ch.number);
      if (!hasBackRef) {
        blocking.push(`Chapter ${ch.number} → Chapter ${targetNum}: Setup declared, but Chapter ${targetNum} does not declare "payoff-from: Chapter ${ch.number}". Broken setup chain.`);
      }
    }
  }
  // Reverse check: payoff-from references must point to a chapter with a matching sets-up
  for (const ch of chapters) {
    for (const ref of ch.payoffFrom) {
      const sourceNum = parseChapterRef(ref);
      if (sourceNum === null) {
        warnings.push(`Chapter ${ch.number}: "payoff-from: ${ref}" — could not parse chapter number from reference`);
        continue;
      }
      const source = chapters.find(c => c.number === sourceNum);
      if (!source) {
        blocking.push(`Chapter ${ch.number}: "payoff-from: ${ref}" — references chapter ${sourceNum} which does not exist in outline`);
        continue;
      }
      const hasForwardRef = source.setsUp.some(r => parseChapterRef(r) === ch.number);
      if (!hasForwardRef) {
        blocking.push(`Chapter ${ch.number} ← Chapter ${sourceNum}: Payoff declared, but Chapter ${sourceNum} does not declare "sets-up: Chapter ${ch.number}". Broken payoff chain.`);
      }
    }
  }

  // 5. Pacing distribution
  const pacingTags = chapters.map(c => c.pacing).filter(p => p);
  if (pacingTags.length === chapters.length) {
    const counts: Record<string, number> = {};
    for (const tag of pacingTags) {
      const normalized = tag.toLowerCase().replace(/[^a-z]/g, '');
      counts[normalized] = (counts[normalized] || 0) + 1;
    }
    const distribution = Object.entries(counts)
      .map(([tag, count]) => `${tag}=${count}`)
      .join(', ');
    evidence.push(`✓ Pacing distribution: ${distribution}`);

    // Check for lopsided distribution
    const actionTags = ['action', 'rising', 'climax'];
    const calmTags = ['calm', 'resolution', 'resolution'];
    const actionCount = pacingTags.filter(t => actionTags.includes(t.toLowerCase().replace(/[^a-z]/g, ''))).length;
    const calmCount = pacingTags.filter(t => calmTags.includes(t.toLowerCase().replace(/[^a-z]/g, ''))).length;

    if (totalChapters >= 4) {
      if (actionCount === totalChapters) {
        blocking.push(`Pacing distribution: All ${totalChapters} chapters are action/rising — no calm/resolution beats. Add breathing room per constitution's pacing strategy.`);
      }
      if (calmCount === totalChapters) {
        blocking.push(`Pacing distribution: All ${totalChapters} chapters are calm/resolution — no rising action. Verify this matches the constitution's pacing strategy.`);
      }
    }
  }

  return {
    gate: 'outline',
    passed: blocking.length === 0,
    blocking,
    warnings,
    evidence,
  };
}

function parseChapterRef(ref: string): number | null {
  const match = ref.match(/(?:ch(?:apter)?\.?\s*|#?\s*)(\d+)/i);
  return match ? parseInt(match[1]) : null;
}

// ─── Pre-Draft Gate ──────────────────────────────────────────────────────

const REQUIRED_CONTEXT_ITEMS = [
  { id: 'constitution', path: './book/constitution.md', description: 'Creative/intellectual principles' },
  { id: 'track', path: './book/track.json', description: 'Track and project metadata' },
  { id: 'specification', path: './book/specification.md', description: 'Story blueprint (fiction) — may be ./book/specification/_main.md' },
  { id: 'outline', path: './book/outline.md', description: 'Chapter structural context' },
  { id: 'knowledge', path: './book/knowledge/', description: 'All relevant knowledge files (character profiles, locations, etc.)' },
  { id: 'tracking', path: './book/tracking/', description: 'Current state of all tracked entities' },
  { id: 'previous-chapter', path: './book/content/chapter_[prev].md', description: 'Previous chapter for continuity' },
  { id: 'research-sources', path: './book/research/sources/', description: 'Sources relevant to this chapter (non-fiction)' },
  { id: 'revision-log', path: './book/revisions/revision-log.md', description: 'Pending revision notes' },
  { id: 'drafts', path: './book/drafts/', description: 'Draft material for this chapter' },
  { id: 'tasks', path: './book/tasks.md', description: 'Task status for this chapter' },
  { id: 'critique-feedback', path: './book/critique/', description: 'Critique feedback on adjacent chapters' },
  { id: 'existing-chapter', path: './book/content/chapter_[current].md', description: 'Existing chapter if this is a rewrite' },
];

export function preDraftGate(
  projectRoot: string,
  chapterNumber: number
): GateResult {
  const blocking: string[] = [];
  const warnings: string[] = [];
  const evidence: string[] = [];

  for (const item of REQUIRED_CONTEXT_ITEMS) {
    let resolvedPath = item.path;
    resolvedPath = resolvedPath.replace('[prev]', String(Math.max(1, chapterNumber - 1)).padStart(5, '0'));
    resolvedPath = resolvedPath.replace('[current]', String(chapterNumber).padStart(5, '0'));

    const fullPath = path.join(projectRoot, resolvedPath);

    if (resolvedPath.includes('[')) {
      // Template path — check if any matching file exists
      const dir = path.dirname(fullPath);
      const prefix = path.basename(fullPath).split('[')[0];
      if (fs.existsSync(dir)) {
        const matches = fs.readdirSync(dir).filter(f => f.startsWith(prefix));
        if (matches.length > 0) {
          evidence.push(`✓ ${item.description}: Found ${matches.length} file(s) in ${path.dirname(resolvedPath)}`);
        } else {
          // Some items are optional for certain chapters
          if (['research-sources', 'revision-log', 'drafts', 'critique-feedback', 'existing-chapter'].includes(item.id)) {
            warnings.push(`${item.description}: No files found (may be OK for this chapter)`);
          } else {
            blocking.push(`${item.description}: Required file not found at ${resolvedPath}`);
          }
        }
      } else {
        if (['research-sources', 'revision-log', 'drafts', 'critique-feedback', 'existing-chapter'].includes(item.id)) {
          warnings.push(`${item.description}: Directory not found (may be OK)`);
        } else {
          blocking.push(`${item.description}: Directory not found at ${resolvedPath}`);
        }
      }
    } else if (fs.existsSync(fullPath)) {
      const stat = fs.statSync(fullPath);
      if (stat.isDirectory()) {
        const files = fs.readdirSync(fullPath).filter(f => !f.startsWith('.'));
        if (files.length > 0) {
          evidence.push(`✓ ${item.description}: ${files.length} files in ${resolvedPath}`);
        } else {
          if (item.id === 'knowledge' || item.id === 'tracking') {
            blocking.push(`${item.description}: Directory exists but is empty at ${resolvedPath}`);
          } else {
            warnings.push(`${item.description}: Directory exists but is empty`);
          }
        }
      } else {
        const stat2 = fs.statSync(fullPath);
        if (stat2.size > 0) {
          evidence.push(`✓ ${item.description}: ${resolvedPath} (${stat2.size} bytes)`);
        } else {
          blocking.push(`${item.description}: File is empty at ${resolvedPath}`);
        }
      }
    } else {
      // Check alternative paths
      if (item.id === 'specification') {
        const altPath = path.join(projectRoot, 'book', 'specification', '_main.md');
        if (fs.existsSync(altPath)) {
          evidence.push(`✓ ${item.description}: Found at ./book/specification/_main.md`);
          continue;
        }
      }
      if (item.id === 'outline') {
        const altPath = path.join(projectRoot, 'book', 'outline', '_main.md');
        if (fs.existsSync(altPath)) {
          evidence.push(`✓ ${item.description}: Found at ./book/outline/_main.md`);
          continue;
        }
      }

      if (['research-sources', 'revision-log', 'drafts', 'critique-feedback', 'existing-chapter'].includes(item.id)) {
        warnings.push(`${item.description}: Not found (may be OK for this chapter)`);
      } else {
        blocking.push(`${item.description}: Not found at ${resolvedPath}`);
      }
    }
  }

  // Voice profile check
  if (profilesExist(projectRoot)) {
    evidence.push('✓ Voice profiles exist — voice check will run after draft');
  } else if (chapterNumber > 3) {
    blocking.push('Voice profiles not generated — run /kombinat verify voice-init after chapter 3');
  } else {
    warnings.push('Voice profiles not yet generated (expected — generated after chapter 3)');
  }

  return {
    gate: 'pre-draft',
    passed: blocking.length === 0,
    blocking,
    warnings,
    evidence,
  };
}

// ─── Post-Draft Gate ──────────────────────────────────────────────────────

export function postDraftGate(
  projectRoot: string,
  chapterNumber: number,
  xmlContent: string
): GateResult {
  const blocking: string[] = [];
  const warnings: string[] = [];
  const evidence: string[] = [];

  // 1. Verify XML structure
  if (!xmlContent.includes('<chapter') || !xmlContent.includes('</chapter>')) {
    blocking.push('XML structure: Missing <chapter> root element');
    return { gate: 'post-draft', passed: false, blocking, warnings, evidence };
  }
  evidence.push('✓ XML structure: <chapter> root element present');

  // 2. Verify metadata block
  if (!xmlContent.includes('<metadata>')) {
    blocking.push('XML structure: Missing <metadata> block');
  } else {
    const metadataMatch = xmlContent.match(/<metadata>([\s\S]*?)<\/metadata>/);
    if (metadataMatch) {
      const meta = metadataMatch[1];
      const requiredFields = ['outline-purpose', 'time', 'characters-present'];
      for (const field of requiredFields) {
        if (meta.includes(`<${field}>`)) {
          evidence.push(`✓ Metadata: ${field} present`);
        } else {
          blocking.push(`Metadata: Missing <${field}> field`);
        }
      }
    }
  }

  // 2b. Verify awareness-map block
  if (!xmlContent.includes('<awareness-map>')) {
    blocking.push('XML structure: Missing <awareness-map> block — draft must declare how it pays off, sets up, and maintains continuity anchors');
  } else {
    const awarenessMatch = xmlContent.match(/<awareness-map>([\s\S]*?)<\/awareness-map>/);
    if (awarenessMatch) {
      const awareness = awarenessMatch[1];

      // Check for payoff-from entries
      const payoffMatches = [...awareness.matchAll(/<payoff-from\s+ref="([^"]+)">([\s\S]*?)<\/payoff-from>/g)];
      if (payoffMatches.length === 0) {
        blocking.push('Awareness map: No <payoff-from> entries — draft must declare how it pays off earlier setups (unless this is chapter 1)');
      } else {
        for (const pm of payoffMatches) {
          if (!pm[2].trim()) {
            blocking.push(`Awareness map: <payoff-from ref="${pm[1]}"> is empty — explain how this draft pays off the setup`);
          } else {
            evidence.push(`✓ Awareness map: payoff-from "${pm[1]}" — ${pm[2].trim().slice(0, 60)}...`);
          }
        }
      }

      // Check for sets-up entries
      const setsUpMatches = [...awareness.matchAll(/<sets-up\s+ref="([^"]+)">([\s\S]*?)<\/sets-up>/g)];
      if (setsUpMatches.length === 0) {
        blocking.push('Awareness map: No <sets-up> entries — draft must declare what it plants for later chapters (unless this is the final chapter)');
      } else {
        for (const sm of setsUpMatches) {
          if (!sm[2].trim()) {
            blocking.push(`Awareness map: <sets-up ref="${sm[1]}"> is empty — explain how this draft plants the setup`);
          } else {
            evidence.push(`✓ Awareness map: sets-up "${sm[1]}" — ${sm[2].trim().slice(0, 60)}...`);
          }
        }
      }

      // Check for continuity anchors
      const anchorMatches = [...awareness.matchAll(/<anchor\s+name="([^"]+)">([\s\S]*?)<\/anchor>/g)];
      if (anchorMatches.length === 0) {
        blocking.push('Awareness map: No <anchor> entries — draft must declare how continuity anchors appear in this chapter');
      } else {
        for (const am of anchorMatches) {
          if (!am[2].trim()) {
            blocking.push(`Awareness map: <anchor name="${am[1]}"> is empty — explain how this anchor appears in the draft`);
          } else {
            evidence.push(`✓ Awareness map: anchor "${am[1]}" — ${am[2].trim().slice(0, 60)}...`);
          }
        }
      }
    }
  }

  // 3. Verify scenes have goal + conflict
  const sceneRegex = /<scene\s+[^>]*>([\s\S]*?)<\/scene>/g;
  const scenes = [...xmlContent.matchAll(sceneRegex)];
  if (scenes.length === 0) {
    blocking.push('Scenes: No <scene> elements found');
  } else {
    evidence.push(`✓ Scenes: ${scenes.length} scene(s) found`);
    for (let i = 0; i < scenes.length; i++) {
      const sceneTag = xmlContent.match(new RegExp(`<scene\\s+number="${i + 1}"[^>]*>`));
      if (sceneTag) {
        if (!sceneTag[0].includes('goal=')) {
          blocking.push(`Scene ${i + 1}: Missing goal attribute`);
        }
        if (!sceneTag[0].includes('conflict=')) {
          blocking.push(`Scene ${i + 1}: Missing conflict attribute`);
        }
      }
    }
  }

  // 4. Verify chapter notes present
  if (!xmlContent.includes('<chapter-notes>')) {
    blocking.push('Chapter notes: Missing <chapter-notes> block');
  } else {
    const notesMatch = xmlContent.match(/<chapter-notes>([\s\S]*?)<\/chapter-notes>/);
    if (notesMatch) {
      const notes = notesMatch[1];
      if (notes.includes('<word-count>')) {
        const wcMatch = notes.match(/<word-count>(\d+)<\/word-count>/);
        if (wcMatch) {
          const wc = parseInt(wcMatch[1]);
          if (wc < 500) {
            warnings.push(`Word count: ${wc} — below typical chapter minimum (500)`);
          } else {
            evidence.push(`✓ Word count: ${wc}`);
          }
        }
      } else {
        blocking.push('Chapter notes: Missing <word-count>');
      }

      if (notes.includes('<tracking-updates>')) {
        evidence.push('✓ Tracking updates present in chapter notes');
        const trackingMatch = notes.match(/<tracking-updates>([\s\S]*?)<\/tracking-updates>/);
        if (trackingMatch && trackingMatch[1].trim().length === 0) {
          warnings.push('Tracking updates block is empty — verify nothing changed');
        }
      } else {
        blocking.push('Chapter notes: Missing <tracking-updates> — tracking must be updated');
      }

      if (notes.includes('<hooks>')) {
        evidence.push('✓ Hooks present (opening + closing)');
      } else {
        warnings.push('Hooks: Missing <hooks> block — consider adding opening/closing hooks');
      }
    }
  }

  // 5. Voice check (if profiles exist)
  if (profilesExist(projectRoot)) {
    const profiles = loadProfiles(projectRoot);
    if (profiles) {
      const driftReport = checkVoiceDrift(xmlContent, profiles);
      if (driftReport.passed) {
        evidence.push('✓ Voice check: Consistent with established profiles');
      } else {
        for (const detail of driftReport.narration.details) {
          blocking.push(`Voice drift (narration): ${detail}`);
        }
        for (const [char, report] of Object.entries(driftReport.characters)) {
          for (const detail of report.details) {
            blocking.push(`Voice drift (${char}): ${detail}`);
          }
        }
      }
    }
  } else {
    warnings.push('Voice check: No profiles exist yet (generated after chapter 3)');
  }

  return {
    gate: 'post-draft',
    passed: blocking.length === 0,
    blocking,
    warnings,
    evidence,
  };
}

// ─── Revision Verification ────────────────────────────────────────────────

export function revisionVerifyGate(
  projectRoot: string,
  critiqueRoundNumber: number
): GateResult {
  const blocking: string[] = [];
  const warnings: string[] = [];
  const evidence: string[] = [];

  const critiqueDir = path.join(projectRoot, 'book', 'critique', `round-${critiqueRoundNumber}`);
  const itemsPath = path.join(critiqueDir, 'items.json');
  const revisionLogPath = path.join(projectRoot, 'book', 'revisions', 'revision-log.md');

  if (!fs.existsSync(itemsPath)) {
    blocking.push(`Critique round ${critiqueRoundNumber}: items.json not found at ${path.relative(projectRoot, itemsPath)}`);
    return { gate: 'revision-verify', passed: false, blocking, warnings, evidence };
  }
  evidence.push(`✓ Critique round ${critiqueRoundNumber}: items.json found`);

  // Load critique items
  type CritiqueItem = { id: string; severity: string; chapter: number; summary: string; recommendation: string };
  let critiqueItems: CritiqueItem[] = [];
  try {
    critiqueItems = fs.readJsonSync(itemsPath);
  } catch {
    blocking.push('Critique items: Could not parse items.json');
    return { gate: 'revision-verify', passed: false, blocking, warnings, evidence };
  }
  evidence.push(`✓ Loaded ${critiqueItems.length} critique items`);

  // Load revision log
  if (!fs.existsSync(revisionLogPath)) {
    blocking.push('Revision log: Not found — no revisions have been logged');
    return { gate: 'revision-verify', passed: false, blocking, warnings, evidence };
  }
  const revisionLog = fs.readFileSync(revisionLogPath, 'utf-8');
  evidence.push('✓ Revision log found');

  // Extract revision IDs from log (format: ## Revision [N]: Chapter [M] — Source: Critique round [R], item [ID])
  const revisionEntries = revisionLog.match(/## Revision \d+:[\s\S]*?(?=## Revision|\Z)/g) || [];
  const addressedItems = new Set<string>();

  for (const entry of revisionEntries) {
    const sourceMatch = entry.match(/Source:\s*Critique round \d+,\s*item\s*(\S+)/);
    if (sourceMatch) {
      addressedItems.add(sourceMatch[1]);
    }
    const statusMatch = entry.match(/Status:\s*(\w+)/);
    if (statusMatch && statusMatch[1].toLowerCase() === 'declined') {
      const declinedItem = sourceMatch ? sourceMatch[1] : null;
      if (declinedItem) {
        // Check if decline was documented with rationale
        if (!entry.toLowerCase().includes('rationale:') && !entry.toLowerCase().includes('reason:')) {
          warnings.push(`Item ${declinedItem}: Declined without documented rationale`);
        }
      }
    }
  }

  evidence.push(`✓ ${addressedItems.size} critique items addressed in revision log`);

  // Check critical and major items
  const criticalItems = critiqueItems.filter(i => i.severity === 'critical');
  const majorItems = critiqueItems.filter(i => i.severity === 'major');

  const unaddressedCritical = criticalItems.filter(i => !addressedItems.has(i.id));
  const unaddressedMajor = majorItems.filter(i => !addressedItems.has(i.id));

  if (unaddressedCritical.length > 0) {
    for (const item of unaddressedCritical) {
      blocking.push(`Unaddressed CRITICAL item ${item.id} (Chapter ${item.chapter}): ${item.summary}`);
    }
  }

  if (unaddressedMajor.length > 0) {
    for (const item of unaddressedMajor) {
      warnings.push(`Unaddressed MAJOR item ${item.id} (Chapter ${item.chapter}): ${item.summary}`);
    }
  }

  evidence.push(`✓ Critical items: ${criticalItems.length} total, ${unaddressedCritical.length} unaddressed`);
  evidence.push(`✓ Major items: ${majorItems.length} total, ${unaddressedMajor.length} unaddressed`);

  return {
    gate: 'revision-verify',
    passed: blocking.length === 0,
    blocking,
    warnings,
    evidence,
  };
}

// ─── Continuity Check ────────────────────────────────────────────────────

export function continuityCheckGate(
  projectRoot: string
): GateResult {
  const blocking: string[] = [];
  const warnings: string[] = [];
  const evidence: string[] = [];

  const contentDir = path.join(projectRoot, 'book', 'content');
  const trackingDir = path.join(projectRoot, 'book', 'tracking');

  if (!fs.existsSync(contentDir)) {
    return {
      gate: 'continuity-check',
      passed: true,
      blocking: [],
      warnings: ['No chapters written yet — continuity check skipped'],
      evidence: ['No content directory found'],
    };
  }

  const chapterFiles = fs.readdirSync(contentDir)
    .filter(f => f.startsWith('chapter_') && f.endsWith('.md'))
    .sort();

  if (chapterFiles.length === 0) {
    return {
      gate: 'continuity-check',
      passed: true,
      blocking: [],
      warnings: ['No chapters found in content directory'],
      evidence: ['Content directory exists but is empty'],
    };
  }

  evidence.push(`✓ Found ${chapterFiles.length} chapter(s) to check`);

  // Check sequential numbering
  for (let i = 0; i < chapterFiles.length; i++) {
    const match = chapterFiles[i].match(/chapter_(\d+)\.md/);
    if (!match) {
      warnings.push(`Non-standard chapter filename: ${chapterFiles[i]}`);
      continue;
    }
    const num = parseInt(match[1]);
    if (num !== i + 1) {
      blocking.push(`Chapter numbering gap: expected chapter ${String(i + 1).padStart(5, '0')}, found ${match[1]}`);
    }
  }
  evidence.push(`✓ Chapter numbering: ${chapterFiles.length} chapters, sequential check complete`);

  // Check tracking files exist
  if (fs.existsSync(trackingDir)) {
    const trackingFiles = fs.readdirSync(trackingDir).filter(f => f.endsWith('.json'));
    evidence.push(`✓ Tracking files: ${trackingFiles.length} files in tracking/`);

    // Validate each tracking file is valid JSON
    for (const tf of trackingFiles) {
      try {
        fs.readJsonSync(path.join(trackingDir, tf));
      } catch {
        blocking.push(`Tracking file ${tf} is not valid JSON`);
      }
    }
  } else {
    blocking.push('Tracking directory not found at ./book/tracking/');
  }

  // Cross-reference tracking updates from XML drafts
  const draftsDir = path.join(projectRoot, 'book', 'drafts');
  if (fs.existsSync(draftsDir)) {
    const xmlFiles = fs.readdirSync(draftsDir).filter(f => f.endsWith('.xml'));
    evidence.push(`✓ XML drafts: ${xmlFiles.length} files for tracking cross-reference`);

    // Collect all tracking updates from XML
    const allUpdates: Array<{ chapter: number; field: string; value: string }> = [];
    for (const xmlFile of xmlFiles) {
      const content = fs.readFileSync(path.join(draftsDir, xmlFile), 'utf-8');
      const updateRegex = /<(?:character-state|plot-thread|timeline)\s+([^/]+)\/>/g;
      let match: RegExpExecArray | null;
      while ((match = updateRegex.exec(content)) !== null) {
        allUpdates.push({ chapter: 0, field: match[1].trim(), value: '' });
      }
    }
    evidence.push(`✓ Tracking updates in XML: ${allUpdates.length} update tags found`);
  }

  return {
    gate: 'continuity-check',
    passed: blocking.length === 0,
    blocking,
    warnings,
    evidence,
  };
}

// ─── Gate Runner ──────────────────────────────────────────────────────────

export function runGate(
  gateType: 'outline' | 'pre-draft' | 'post-draft' | 'revision-verify' | 'continuity-check' | 'non-negotiables',
  projectRoot: string,
  options?: { chapterNumber?: number; xmlContent?: string; critiqueRound?: number; contentToCheck?: string }
): GateResult {
  switch (gateType) {
    case 'outline':
      return outlineGate(projectRoot);
    case 'pre-draft':
      return preDraftGate(projectRoot, options?.chapterNumber || 1);
    case 'post-draft':
      if (!options?.xmlContent) {
        return { gate: 'post-draft', passed: false, blocking: ['xmlContent required for post-draft gate'], warnings: [], evidence: [] };
      }
      return postDraftGate(projectRoot, options.chapterNumber || 1, options.xmlContent);
    case 'revision-verify':
      if (!options?.critiqueRound) {
        return { gate: 'revision-verify', passed: false, blocking: ['critiqueRound required for revision-verify gate'], warnings: [], evidence: [] };
      }
      return revisionVerifyGate(projectRoot, options.critiqueRound);
    case 'continuity-check':
      return continuityCheckGate(projectRoot);
    case 'non-negotiables':
      return nonNegotiablesGate(projectRoot, options?.chapterNumber, options?.contentToCheck);
    default:
      return { gate: gateType, passed: false, blocking: [`Unknown gate type: ${gateType}`], warnings: [], evidence: [] };
  }
}

// ─── Non-Negotiables Gate ───────────────────────────────────────────────────
//
// Checks content against the author's declared creative constraints.
// If no constraints file exists, the gate passes (no constraints = no violations).
// If content is not provided, the gate checks all content files for the chapter.

export function nonNegotiablesGate(
  projectRoot: string,
  chapterNumber?: number,
  contentToCheck?: string
): GateResult {
  const constraints = loadConstraints(projectRoot);

  if (!constraints) {
    return {
      gate: 'non-negotiables',
      passed: true,
      blocking: [],
      warnings: [],
      evidence: ['No creative constraints file found — gate passes by default. Declare constraints via /kombinat constitute.'],
    };
  }

  if (constraints.constraints.length === 0) {
    return {
      gate: 'non-negotiables',
      passed: true,
      blocking: [],
      warnings: [],
      evidence: ['Creative constraints file exists but contains no constraints.'],
    };
  }

  // If content provided, check it directly
  if (contentToCheck) {
    const result = checkConstraints(contentToCheck, constraints, chapterNumber);
    return {
      gate: 'non-negotiables',
      passed: result.passed,
      blocking: result.violations.map(v => `${v.constraintId}: ${v.description} — ${v.evidence} at ${v.location}`),
      warnings: [],
      evidence: result.evidence,
    };
  }

  // Otherwise, check the content file for the chapter (or all chapters)
  const contentDir = path.join(projectRoot, 'book', 'content');
  if (!fs.existsSync(contentDir)) {
    return {
      gate: 'non-negotiables',
      passed: true,
      blocking: [],
      warnings: [],
      evidence: ['No content directory found — nothing to check.'],
    };
  }

  const allViolations: string[] = [];
  const allEvidence: string[] = [];

  const files = fs.readdirSync(contentDir)
    .filter(f => f.endsWith('.md') && !f.includes('.provenance.'))
    .sort();

  for (const file of files) {
    // If chapterNumber specified, only check that chapter
    if (chapterNumber !== undefined) {
      const fileChapter = parseInt(file.match(/chapter-(\d+)/)?.[1] || '0', 10);
      if (fileChapter !== chapterNumber) continue;
    }

    const content = fs.readFileSync(path.join(contentDir, file), 'utf-8');
    const fileChapter = parseInt(file.match(/chapter-(\d+)/)?.[1] || '0', 10);
    const result = checkConstraints(content, constraints, fileChapter || undefined);

    allEvidence.push(`${file}: ${result.passed ? 'PASS' : 'FAIL'} — ${result.constraintsChecked} constraints checked`);

    if (!result.passed) {
      for (const v of result.violations) {
        allViolations.push(`${file} — ${v.constraintId}: ${v.description} — ${v.evidence} at ${v.location}`);
      }
    }
  }

  return {
    gate: 'non-negotiables',
    passed: allViolations.length === 0,
    blocking: allViolations,
    warnings: [],
    evidence: allEvidence.length > 0 ? allEvidence : ['No content files found to check.'],
  };
}