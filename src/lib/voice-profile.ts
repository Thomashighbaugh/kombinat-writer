/**
 * Voice Profile System — Per-Character + Per-Narration Fingerprinting
 *
 * Generates and maintains structured voice profiles from XML-tagged drafts.
 * Each character has an independent voice profile. The narration has its own.
 * Quality gates compare new chapters against these profiles to detect drift.
 *
 * Profiles are stored as JSON in ./book/knowledge/voice-profiles.json
 * The agent reads this file to check its own work against established voice.
 */

import fs from 'fs-extra';
import path from 'path';

// ─── Types ───────────────────────────────────────────────────────────────

export interface NarrationVoiceProfile {
  register: string;
  sentenceLength: {
    min: number;
    max: number;
    median: number;
    shortRatio: number;   // % sentences under 10 words
    longRatio: number;    // % sentences over 25 words
  };
  sensoryDensity: number; // sensory references per 1000 words
  dialogueToProseRatio: number;
  emotionalRegister: string[];
  commonPatterns: string[];
  atmosphere: string[];
  samplePassages: string[]; // 3-5 representative excerpts
}

export interface CharacterVoiceProfile {
  characterName: string;
  speechPattern: string;      // "Short declarative. No contractions after emotional scenes."
  dialogueLength: {
    min: number;
    max: number;
    median: number;
  };
  emotionalRange: string[];   // ["guarded", "blunt", "rarely vulnerable"]
  verbalTics: string[];       // ["uses 'look' as filler", "trails off with '...'"]
  register: string;            // "formal", "informal", "clipped", "expansive"
  subtextFrequency: number;    // 0-1, how often subtext is present
  contractionsUsed: boolean;
  sentenceOpeners: string[];   // common first words/phrases
  sampleLines: string[];       // 5-10 representative dialogue lines
}

export interface VoiceProfileSet {
  generatedAfterChapter: number;
  lastUpdated: number; // chapter number
  narration: NarrationVoiceProfile;
  characters: Record<string, CharacterVoiceProfile>;
}

// ─── Extraction ──────────────────────────────────────────────────────────

/**
 * Extract all dialogue lines for a specific character from XML-tagged content.
 * Returns array of { text, emotion, subtext } objects.
 */
export function extractDialogueBySpeaker(
  xmlContent: string,
  speaker: string
): Array<{ text: string; emotion: string; subtext: string }> {
  const lines: Array<{ text: string; emotion: string; subtext: string }> = [];
  const regex = /<dialogue\s+speaker="([^"]*)"[^>]*?(?:emotion="([^"]*)")?[^>]*?(?:subtext="([^"]*)")?[^>]*>([\s\S]*?)<\/dialogue>/g;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(xmlContent)) !== null) {
    if (match[1].toLowerCase() === speaker.toLowerCase()) {
      lines.push({
        text: match[4].trim(),
        emotion: match[2] || 'unspecified',
        subtext: match[3] || '',
      });
    }
  }
  return lines;
}

/**
 * Extract all narration blocks with their register attribute.
 */
export function extractNarrationBlocks(
  xmlContent: string
): Array<{ text: string; register: string; sensoryFocus: string }> {
  const blocks: Array<{ text: string; register: string; sensoryFocus: string }> = [];
  const regex = /<narration\s+register="([^"]*)"(?:\s+sensory-focus="([^"]*)")?[^>]*>([\s\S]*?)<\/narration>/g;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(xmlContent)) !== null) {
    blocks.push({
      text: match[3].trim(),
      register: match[1],
      sensoryFocus: match[2] || '',
    });
  }
  return blocks;
}

/**
 * Get list of all speakers mentioned in dialogue tags.
 */
export function extractAllSpeakers(xmlContent: string): string[] {
  const speakers = new Set<string>();
  const regex = /<dialogue\s+speaker="([^"]*)"/g;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(xmlContent)) !== null) {
    speakers.add(match[1]);
  }
  return [...speakers];
}

// ─── Analysis ────────────────────────────────────────────────────────────

function analyzeSentenceLength(text: string): {
  min: number; max: number; median: number; shortRatio: number; longRatio: number;
} {
  const sentences = text.split(/[.!?]+/).map(s => s.trim()).filter(s => s.length > 0);
  if (sentences.length === 0) return { min: 0, max: 0, median: 0, shortRatio: 0, longRatio: 0 };

  const lengths = sentences.map(s => s.split(/\s+/).length).sort((a, b) => a - b);
  const median = lengths[Math.floor(lengths.length / 2)];
  const shortCount = lengths.filter(l => l < 10).length;
  const longCount = lengths.filter(l => l > 25).length;

  return {
    min: lengths[0],
    max: lengths[lengths.length - 1],
    median,
    shortRatio: shortCount / lengths.length,
    longRatio: longCount / lengths.length,
  };
}

function countSensoryReferences(text: string): number {
  const sensoryWords = /\b(see|saw|seen|hear|heard|smell|smelled|taste|tasted|feel|felt|touch|touched|cold|hot|warm|wet|dry|rough|smooth|bright|dark|loud|quiet|silence|scent|aroma|flavour|texture|tingle|ache|shiver|sweat)\b/gi;
  const matches = text.match(sensoryWords);
  return matches ? matches.length : 0;
}

function extractEmotionalRegisters(xmlContent: string): string[] {
  const emotions = new Set<string>();
  const regex = /<(?:narration|dialogue|interiority)[^>]*(?:emotion|register)="([^"]*)"/g;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(xmlContent)) !== null) {
    emotions.add(match[1]);
  }
  return [...emotions];
}

function extractAtmosphereTags(xmlContent: string): string[] {
  const atmospheres = new Set<string>();
  const regex = /sensory-focus="([^"]*)"/g;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(xmlContent)) !== null) {
    match[1].split(',').map(s => s.trim()).forEach(s => atmospheres.add(s));
  }
  return [...atmospheres];
}

// ─── Profile Generation ──────────────────────────────────────────────────

/**
 * Build a narration voice profile from accumulated XML chapters.
 * @param xmlContents Array of XML-tagged chapter content
 * @param chapterNumber The chapter this profile is generated after
 */
export function buildNarrationProfile(
  xmlContents: string[],
  chapterNumber: number
): NarrationVoiceProfile {
  const allNarration = xmlContents.flatMap(extractNarrationBlocks);
  const allText = allNarration.map(n => n.text).join(' ');
  const allDialogue = xmlContents.join('').match(/<dialogue[^>]*>([\s\S]*?)<\/dialogue>/g) || [];
  const wordCount = allText.split(/\s+/).length;

  const sentenceAnalysis = analyzeSentenceLength(allText);
  const sensoryCount = countSensoryReferences(allText);
  const dialogueWordCount = allDialogue.join(' ').split(/\s+/).length;

  // Extract common patterns (top 3-5 sentence starters in narration)
  const sentences = allText.split(/[.!?]+/).map(s => s.trim()).filter(s => s.length > 0);
  const starters: Record<string, number> = {};
  for (const s of sentences) {
    const firstWord = s.split(/\s+/)[0].toLowerCase();
    starters[firstWord] = (starters[firstWord] || 0) + 1;
  }
  const commonPatterns = Object.entries(starters)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([word]) => word);

  // Sample passages (3 representative narration blocks)
  const samplePassages = allNarration
    .filter(n => n.text.length > 100)
    .slice(0, 5)
    .map(n => n.text.substring(0, 200) + (n.text.length > 200 ? '...' : ''));

  return {
    register: allNarration[0]?.register || 'unspecified',
    sentenceLength: sentenceAnalysis,
    sensoryDensity: wordCount > 0 ? (sensoryCount / wordCount) * 1000 : 0,
    dialogueToProseRatio: wordCount > 0 ? dialogueWordCount / wordCount : 0,
    emotionalRegister: extractEmotionalRegisters(xmlContents.join('')),
    commonPatterns,
    atmosphere: extractAtmosphereTags(xmlContents.join('')),
    samplePassages,
  };
}

/**
 * Build a character voice profile from their dialogue across accumulated chapters.
 */
export function buildCharacterProfile(
  characterName: string,
  xmlContents: string[]
): CharacterVoiceProfile {
  const allLines = xmlContents.flatMap(xml => extractDialogueBySpeaker(xml, characterName));

  if (allLines.length === 0) {
    return {
      characterName,
      speechPattern: 'No dialogue found',
      dialogueLength: { min: 0, max: 0, median: 0 },
      emotionalRange: [],
      verbalTics: [],
      register: 'unknown',
      subtextFrequency: 0,
      contractionsUsed: false,
      sentenceOpeners: [],
      sampleLines: [],
    };
  }

  const lineLengths = allLines.map(l => l.text.split(/\s+/).length).sort((a, b) => a - b);
  const emotions = [...new Set(allLines.map(l => l.emotion))].filter(e => e !== 'unspecified');
  const subtextCount = allLines.filter(l => l.subtext && l.subtext.length > 0).length;
  const contractions = allLines.some(l => /\b\w+'(?:t|s|re|ve|ll|d|m)\b/i.test(l.text));

  // Sentence openers (first word of each line)
  const openers: Record<string, number> = {};
  for (const line of allLines) {
    const first = line.text.split(/\s+/)[0]?.toLowerCase();
    if (first) openers[first] = (openers[first] || 0) + 1;
  }
  const sentenceOpeners = Object.entries(openers)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([word]) => word);

  return {
    characterName,
    speechPattern: `Median ${lineLengths[Math.floor(lineLengths.length / 2)]} words per line. ${contractions ? 'Uses contractions.' : 'No contractions.'}`,
    dialogueLength: {
      min: lineLengths[0],
      max: lineLengths[lineLengths.length - 1],
      median: lineLengths[Math.floor(lineLengths.length / 2)],
    },
    emotionalRange: emotions,
    verbalTics: [], // Would need more sophisticated NLP to detect tics; agent fills these manually
    register: contractions ? 'informal' : 'formal',
    subtextFrequency: allLines.length > 0 ? subtextCount / allLines.length : 0,
    contractionsUsed: contractions,
    sentenceOpeners,
    sampleLines: allLines.slice(0, 10).map(l => l.text.substring(0, 150)),
  };
}

/**
 * Generate the complete voice profile set from chapters 1-N.
 * Typically called after chapter 3 to establish baseline voice.
 */
export function generateVoiceProfiles(
  xmlChapterPaths: string[],
  chapterNumber: number
): VoiceProfileSet {
  const xmlContents = xmlChapterPaths.map(p => fs.readFileSync(p, 'utf-8'));
  const speakers = [...new Set(xmlContents.flatMap(extractAllSpeakers))];

  const characters: Record<string, CharacterVoiceProfile> = {};
  for (const speaker of speakers) {
    characters[speaker] = buildCharacterProfile(speaker, xmlContents);
  }

  return {
    generatedAfterChapter: chapterNumber,
    lastUpdated: chapterNumber,
    narration: buildNarrationProfile(xmlContents, chapterNumber),
    characters,
  };
}

// ─── Drift Detection ──────────────────────────────────────────────────────

export interface VoiceDriftReport {
  passed: boolean;
  narration: {
    registerMatch: boolean;
    sentenceLengthDelta: number;
    sensoryDensityDelta: number;
    details: string[];
  };
  characters: Record<string, {
    registerMatch: boolean;
    lengthDelta: number;
    subtextFrequencyDelta: number;
    details: string[];
  }>;
  recommendation: string;
}

/**
 * Compare a new chapter's voice against established profiles.
 * Returns a drift report with specific deviations.
 */
export function checkVoiceDrift(
  newXmlContent: string,
  profileSet: VoiceProfileSet
): VoiceDriftReport {
  const newNarration = extractNarrationBlocks(newXmlContent);
  const newText = newNarration.map(n => n.text).join(' ');
  const newWordCount = newText.split(/\s+/).length;

  const newSentenceAnalysis = analyzeSentenceLength(newText);
  const newSensory = countSensoryReferences(newText);
  const newSensoryDensity = newWordCount > 0 ? (newSensory / newWordCount) * 1000 : 0;

  const narrationDetails: string[] = [];
  let narrationRegisterMatch = true;

  for (const block of newNarration) {
    if (profileSet.narration.register !== 'unspecified' && block.register !== profileSet.narration.register) {
      narrationRegisterMatch = false;
      narrationDetails.push(`Narration register "${block.register}" does not match established "${profileSet.narration.register}"`);
    }
  }

  const sentenceLengthDelta = Math.abs(newSentenceAnalysis.median - profileSet.narration.sentenceLength.median);
  if (sentenceLengthDelta > 5) {
    narrationDetails.push(`Median sentence length shifted by ${sentenceLengthDelta} words (from ${profileSet.narration.sentenceLength.median} to ${newSentenceAnalysis.median})`);
  }

  const sensoryDensityDelta = Math.abs(newSensoryDensity - profileSet.narration.sensoryDensity);
  if (sensoryDensityDelta > 3) {
    narrationDetails.push(`Sensory density shifted by ${sensoryDensityDelta.toFixed(1)} per 1000 words (from ${profileSet.narration.sensoryDensity.toFixed(1)} to ${newSensoryDensity.toFixed(1)})`);
  }

  const characters: Record<string, {
    registerMatch: boolean;
    lengthDelta: number;
    subtextFrequencyDelta: number;
    details: string[];
  }> = {};

  for (const [name, profile] of Object.entries(profileSet.characters)) {
    const newLines = extractDialogueBySpeaker(newXmlContent, name);
    if (newLines.length === 0) continue;

    const newLengths = newLines.map(l => l.text.split(/\s+/).length).sort((a, b) => a - b);
    const newMedian = newLengths[Math.floor(newLengths.length / 2)];
    const newSubtextFreq = newLines.filter(l => l.subtext && l.subtext.length > 0).length / newLines.length;
    const newContractions = newLines.some(l => /\b\w+'(?:t|s|re|ve|ll|d|m)\b/i.test(l.text));

    const charDetails: string[] = [];
    const lengthDelta = Math.abs(newMedian - profile.dialogueLength.median);
    if (lengthDelta > 5) {
      charDetails.push(`Dialogue length shifted by ${lengthDelta} words (from ${profile.dialogueLength.median} to ${newMedian})`);
    }

    const subtextDelta = Math.abs(newSubtextFreq - profile.subtextFrequency);
    if (subtextDelta > 0.2) {
      charDetails.push(`Subtext frequency shifted by ${(subtextDelta * 100).toFixed(0)}% (from ${(profile.subtextFrequency * 100).toFixed(0)}% to ${(newSubtextFreq * 100).toFixed(0)}%)`);
    }

    if (newContractions !== profile.contractionsUsed) {
      charDetails.push(`Contraction usage changed (was ${profile.contractionsUsed ? 'yes' : 'no'}, now ${newContractions ? 'yes' : 'no'})`);
    }

    characters[name] = {
      registerMatch: profile.register === (newContractions ? 'informal' : 'formal'),
      lengthDelta,
      subtextFrequencyDelta: subtextDelta,
      details: charDetails,
    };
  }

  const allDetails = [narrationDetails, ...Object.values(characters).map(c => c.details)].flat();
  const passed = allDetails.length === 0;

  return {
    passed,
    narration: {
      registerMatch: narrationRegisterMatch,
      sentenceLengthDelta,
      sensoryDensityDelta,
      details: narrationDetails,
    },
    characters,
    recommendation: passed
      ? 'Voice consistent with established profiles.'
      : `Voice drift detected: ${allDetails.length} deviations. Review before saving.`,
  };
}

// ─── Persistence ──────────────────────────────────────────────────────────

const PROFILES_PATH = path.join('book', 'knowledge', 'voice-profiles.json');

export function saveProfiles(profiles: VoiceProfileSet, projectRoot: string): void {
  const fullPath = path.join(projectRoot, PROFILES_PATH);
  fs.ensureDirSync(path.dirname(fullPath));
  fs.writeJsonSync(fullPath, profiles, { spaces: 2 });
}

export function loadProfiles(projectRoot: string): VoiceProfileSet | null {
  const fullPath = path.join(projectRoot, PROFILES_PATH);
  if (!fs.existsSync(fullPath)) return null;
  try {
    return fs.readJsonSync(fullPath);
  } catch {
    return null;
  }
}

export function profilesExist(projectRoot: string): boolean {
  return fs.existsSync(path.join(projectRoot, PROFILES_PATH));
}