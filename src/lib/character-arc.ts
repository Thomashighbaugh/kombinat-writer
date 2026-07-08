/**
 * Character Arc Verification Matrix
 *
 * Per-character verification that each arc has: introduction (setup),
 * escalation (complication), crisis (darkest moment), transformation
 * (change), and resolution (new equilibrium). Each stage mapped to
 * a chapter range.
 *
 * Characters can have compelling scenes without having a coherent arc.
 * The existing consistency checker catches behavior inconsistency but
 * not arc completeness.
 */

import fs from 'fs-extra';
import path from 'path';

/** Result of analyzing all character arcs for completeness across the book. */
export interface CharacterArcReport {
  characters: CharacterArc[];
  incompleteArcs: CharacterArc[];
  evidence: string[];
}

/** A single character's arc stages across the book. */
export interface CharacterArc {
  name: string;
  stages: ArcStage[];
  complete: boolean;
  missingStages: string[];
  firstAppearance: number;
  lastAppearance: number;
}

interface ArcStage {
  stage: 'introduction' | 'escalation' | 'crisis' | 'transformation' | 'resolution';
  chapter: number;
  evidence: string;
}

/** Scan character profiles and XML drafts to classify each character's arc stages. */
export function analyzeCharacterArcs(
  projectRoot: string
): CharacterArcReport {
  const evidence: string[] = [];

  // Load character profiles for primary characters
  const profilesPath = path.join(projectRoot, 'book', 'knowledge', 'character-profiles.md');
  const characterNames: string[] = [];

  if (fs.existsSync(profilesPath)) {
    const profiles = fs.readFileSync(profilesPath, 'utf-8');
    // Extract character names from headings
    const nameRegex = /^##\s+(.+)$/gm;
    const matches = [...profiles.matchAll(nameRegex)];
    for (const m of matches) {
      const name = m[1].trim();
      if (!name.match(/^(Primary|Secondary|Tertiary|Supporting|Minor)/i)) {
        characterNames.push(name);
      }
    }
    evidence.push(`✓ Loaded ${characterNames.length} character names from profiles`);
  }

  // Load tracking data for character states
  const trackingPath = path.join(projectRoot, 'book', 'tracking', 'character-state.json');
  const characterStates: Record<string, Array<{ chapter: number; field: string; from: string; to: string }>> = {};

  if (fs.existsSync(trackingPath)) {
    try {
      const tracker = fs.readJsonSync(trackingPath);
      if (Array.isArray(tracker.characters)) {
        for (const char of tracker.characters) {
          characterStates[char.name] = char.stateChanges || [];
        }
      }
      evidence.push(`✓ Loaded character state tracking for ${Object.keys(characterStates).length} characters`);
    } catch {
      evidence.push('⚠ character-state.json exists but could not be parsed');
    }
  }

  // Parse XML drafts for character state changes and interiority
  const draftsDir = path.join(projectRoot, 'book', 'drafts');
  if (fs.existsSync(draftsDir)) {
    const xmlFiles = fs.readdirSync(draftsDir).filter(f => f.endsWith('.xml')).sort();
    for (const xmlFile of xmlFiles) {
      const match = xmlFile.match(/chapter_(\d+)\.xml/);
      if (!match) continue;
      const chapterNum = parseInt(match[1]);
      const content = fs.readFileSync(path.join(draftsDir, xmlFile), 'utf-8');

      // Extract character-state updates
      const stateRegex = /<character-state\s+name="([^"]+)"\s+field="([^"]+)"\s+from="([^"]*)"\s+to="([^"]*)"[^>]*\/>/g;
      const stateMatches = [...content.matchAll(stateRegex)];
      for (const m of stateMatches) {
        const name = m[1];
        if (!characterStates[name]) characterStates[name] = [];
        characterStates[name].push({
          chapter: chapterNum,
          field: m[2],
          from: m[3],
          to: m[4],
        });
      }
    }
  }

  // Build arc for each character
  const arcs: CharacterArc[] = [];
  for (const name of Object.keys(characterStates)) {
    const states = characterStates[name].sort((a, b) => a.chapter - b.chapter);
    if (states.length === 0) continue;

    const stages = classifyArcStages(name, states);
    const requiredStages = ['introduction', 'escalation', 'crisis', 'transformation', 'resolution'];
    const presentStages = stages.map(s => s.stage);
    const missing = requiredStages.filter(s => !presentStages.includes(s as 'introduction' | 'escalation' | 'crisis' | 'transformation' | 'resolution'));

    arcs.push({
      name,
      stages,
      complete: missing.length === 0 || states.length < 3,
      missingStages: missing,
      firstAppearance: states[0]?.chapter || 0,
      lastAppearance: states[states.length - 1]?.chapter || 0,
    });
  }

  const incompleteArcs = arcs.filter(a => !a.complete && a.stages.length >= 2);
  for (const arc of incompleteArcs) {
    evidence.push(`✗ ${arc.name}: Missing arc stages: ${arc.missingStages.join(', ')} (appeared Ch${arc.firstAppearance}–Ch${arc.lastAppearance})`);
  }
  for (const arc of arcs.filter(a => a.complete)) {
    evidence.push(`✓ ${arc.name}: Complete arc (${arc.stages.length} stages, Ch${arc.firstAppearance}–Ch${arc.lastAppearance})`);
  }

  return { characters: arcs, incompleteArcs, evidence };
}

function classifyArcStages(name: string, states: Array<{ chapter: number; field: string; from: string; to: string }>): ArcStage[] {
  const stages: ArcStage[] = [];
  if (states.length === 0) return stages;

  // Introduction: first appearance with a state
  stages.push({
    stage: 'introduction',
    chapter: states[0].chapter,
    evidence: `${states[0].field}: ${states[0].from} → ${states[0].to}`,
  });

  // Escalation: field values that worsen or complicate
  const escalationKeywords = ['danger', 'fear', 'anger', 'conflict', 'wound', 'loss', 'betrayal', 'doubt', 'isolation'];
  const crisisKeywords = ['darkest', 'lowest', 'broken', 'defeat', 'despair', 'rock bottom', 'abyss', 'lost'];
  const transformationKeywords = ['change', 'realization', 'epiphany', 'growth', 'acceptance', 'understanding', 'transformed', 'evolved'];
  const resolutionKeywords = ['resolved', 'peace', 'new', 'equilibrium', 'acceptance', 'forward', 'healed', 'whole'];

  for (let i = 1; i < states.length; i++) {
    const state = states[i];
    const toLower = state.to.toLowerCase();
    const fieldLower = state.field.toLowerCase();

    if (crisisKeywords.some(k => toLower.includes(k) || fieldLower.includes(k))) {
      stages.push({ stage: 'crisis', chapter: state.chapter, evidence: `${state.field}: ${state.from} → ${state.to}` });
    } else if (transformationKeywords.some(k => toLower.includes(k) || fieldLower.includes(k))) {
      stages.push({ stage: 'transformation', chapter: state.chapter, evidence: `${state.field}: ${state.from} → ${state.to}` });
    } else if (resolutionKeywords.some(k => toLower.includes(k) || fieldLower.includes(k))) {
      stages.push({ stage: 'resolution', chapter: state.chapter, evidence: `${state.field}: ${state.from} → ${state.to}` });
    } else if (escalationKeywords.some(k => toLower.includes(k) || fieldLower.includes(k))) {
      stages.push({ stage: 'escalation', chapter: state.chapter, evidence: `${state.field}: ${state.from} → ${state.to}` });
    }
  }

  return stages;
}

/** Format a character arc report as a readable markdown document. */
export function formatCharacterArcReport(report: CharacterArcReport): string {
  const lines: string[] = [];
  lines.push('# Character Arc Verification');
  lines.push('');
  lines.push(`**Characters analyzed:** ${report.characters.length}`);
  lines.push(`**Incomplete arcs:** ${report.incompleteArcs.length}`);
  lines.push('');

  for (const arc of report.characters) {
    lines.push(`## ${arc.name}`);
    lines.push(`**Range:** Ch${arc.firstAppearance} – Ch${arc.lastAppearance}`);
    lines.push(`**Status:** ${arc.complete ? '✓ Complete' : '✗ Missing: ' + arc.missingStages.join(', ')}`);
    lines.push('');
    if (arc.stages.length > 0) {
      lines.push('| Stage | Chapter | Evidence |');
      lines.push('|-------|---------|----------|');
      for (const stage of arc.stages) {
        lines.push(`| ${stage.stage} | ${stage.chapter} | ${stage.evidence} |`);
      }
    }
    lines.push('');
  }

  return lines.join('\n');
}