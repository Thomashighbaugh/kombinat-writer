/**
 * Cliché & Genre-Trope Overuse Detection
 *
 * Scan for known clichés, tired phrases, and genre-specific overused
 * tropes. AI models are trained on massive corpora including
 * fan-fiction and amateur writing — they reproduce clichés at high
 * rates.
 */

import { GateResult } from './quality-gates.js';

/** Result of scanning a chapter for clichés and trope overuse. */
export interface ClicheReport {
  chapter: number;
  cliches: ClicheHit[];
  tropeOveruse: TropeHit[];
  passed: boolean;
  blocking: string[];
  warnings: string[];
  evidence: string[];
}

interface ClicheHit {
  phrase: string;
  preview: string;
  category: string;
}

interface TropeHit {
  trope: string;
  count: number;
  category: string;
}

const CLICHE_PHRASES: Record<string, string[]> = {
  'descriptive': [
    'crystal clear', 'pitch black', 'dead silence', 'deafening silence',
    'piercing eyes', 'steely gaze', 'chiseled jaw', 'flowing locks',
    'emerald eyes', 'sapphire eyes', 'porcelain skin', 'alabaster skin',
    'heart of gold', 'heart of stone', 'iron will', 'nerves of steel',
    'a smile that could light up a room', 'eyes like saucers',
    'time seemed to stand still', 'the world fell away',
  ],
  'action': [
    'without warning', 'out of nowhere', 'all of a sudden',
    'in the nick of time', 'just in time', 'at the last possible moment',
    'faster than the eye could follow', 'before anyone could react',
    'moved like lightning', 'as if possessed',
    'with a strength they didn\'t know they had',
    'time slowed down', 'everything happened in slow motion',
  ],
  'emotional': [
    'a shiver ran down', 'a chill ran down', 'goosebumps rose',
    'heart skipped a beat', 'breath caught in throat',
    'stomach dropped', 'blood ran cold', 'a sense of dread',
    'a feeling of unease', 'couldn\'t shake the feeling',
    'something felt wrong', 'couldn\'t quite place it',
    'a weight lifted off', 'tears welled up', 'a lump formed in throat',
  ],
  'transitional': [
    'little did they know', 'little did he know', 'little did she know',
    'unbeknownst to', 'as fate would have it', 'as luck would have it',
    'needless to say', 'it goes without saying', 'suffice to say',
    'the next thing they knew', 'before they knew it',
  ],
  'purple': [
    'a symphony of', 'a tapestry of', 'a cacophony of',
    'danced in the wind', 'shimmered in the moonlight',
    'painted the sky', 'whispered through the trees',
    'echoed in the silence', 'hung in the air',
    'like a broken record', 'like a moth to a flame',
    'a sea of faces', 'a storm of emotions',
  ],
};

const GENRE_TROPES: Record<string, string[]> = {
  'fantasy': [
    'chosen one', 'prophecy', 'dark lord', 'ancient evil',
    'mentor dies', 'hidden heritage', 'magical artifact',
    'tavern meeting', 'quest begins', 'fellowship',
  ],
  'romance': [
    'meet cute', 'enemies to lovers', 'fake dating',
    'forced proximity', 'only one bed', 'miscommunication',
    'grand gesture', 'dark moment', 'happily ever after',
  ],
  'mystery': [
    'amateur detective', 'locked room', 'red herring',
    'butler did it', 'least likely suspect', 'hidden clue',
    'confession scene', 'gathered suspects', 'the real killer',
  ],
  'thriller': [
    'ticking clock', 'rogue agent', 'conspiracy',
    'gone rogue', 'one last job', 'wrong man',
    'race against time', 'higher up involved', 'deep cover',
  ],
  'scifi': [
    'dystopian society', 'rebellion', 'chosen one',
    'AI gains consciousness', 'space opera', 'first contact',
    'time travel paradox', 'alternate dimension', 'the corporation',
  ],
};

const CLICHE_BLOCK_THRESHOLD = 5;  // >5 clichés per chapter = block
const TROPE_WARN_THRESHOLD = 3;   // >3 same-trope mentions = warn

/** Scan XML draft text for cliché phrases and genre-trope overuse patterns. */
export function detectCliches(
  xmlContent: string,
  chapterNumber: number,
  genre?: string
): ClicheReport {
  const blocking: string[] = [];
  const warnings: string[] = [];
  const evidence: string[] = [];
  const cliches: ClicheHit[] = [];
  const tropeOveruse: TropeHit[] = [];

  const cleanText = stripXmlTags(xmlContent);
  const lowerText = cleanText.toLowerCase();

  // Detect cliché phrases
  for (const [category, phrases] of Object.entries(CLICHE_PHRASES)) {
    for (const phrase of phrases) {
      if (lowerText.includes(phrase)) {
        const idx = lowerText.indexOf(phrase);
        const start = Math.max(0, idx - 20);
        const end = Math.min(cleanText.length, idx + phrase.length + 30);
        cliches.push({
          phrase,
          preview: cleanText.slice(start, end).trim(),
          category,
        });
      }
    }
  }

  // Detect genre tropes
  if (genre) {
    const tropes = GENRE_TROPES[genre.toLowerCase()] || [];
    const tropeCount: Record<string, number> = {};
    for (const trope of tropes) {
      if (lowerText.includes(trope)) {
        tropeCount[trope] = (tropeCount[trope] || 0) + 1;
      }
    }
    for (const [trope, count] of Object.entries(tropeCount)) {
      if (count >= TROPE_WARN_THRESHOLD) {
        tropeOveruse.push({ trope, count, category: genre });
      }
    }
  }

  // Also check all genres for cross-genre contamination
  for (const [g, tropes] of Object.entries(GENRE_TROPES)) {
    if (g === genre?.toLowerCase()) continue;
    for (const trope of tropes) {
      if (lowerText.includes(trope) && trope.length > 8) {
        // Just note it — cross-genre tropes aren't necessarily wrong
      }
    }
  }

  if (cliches.length > CLICHE_BLOCK_THRESHOLD) {
    blocking.push(`Cliché density: ${cliches.length} clichéd phrases found (threshold: ${CLICHE_BLOCK_THRESHOLD}) — replace with fresh language`);
  } else if (cliches.length > 2) {
    warnings.push(`Cliché count: ${cliches.length} — consider replacing with original phrasing`);
  }

  for (const c of cliches.slice(0, 5)) {
    if (cliches.length > CLICHE_BLOCK_THRESHOLD) {
      blocking.push(`Cliché (${c.category}): "${c.phrase}" — context: "${c.preview}..."`);
    } else {
      warnings.push(`Cliché (${c.category}): "${c.phrase}" — context: "${c.preview}..."`);
    }
  }

  for (const t of tropeOveruse) {
    warnings.push(`Trope overuse (${t.category}): "${t.trope}" appears ${t.count} times — consider subverting or varying`);
  }

  evidence.push(`✓ Clichés found: ${cliches.length} (threshold: ${CLICHE_BLOCK_THRESHOLD})`);
  if (genre) {
    evidence.push(`✓ Genre tropes (${genre}): ${tropeOveruse.length} overused`);
  }

  return {
    chapter: chapterNumber,
    cliches,
    tropeOveruse,
    passed: blocking.length === 0,
    blocking,
    warnings,
    evidence,
  };
}

function stripXmlTags(xml: string): string {
  return xml
    .replace(/<\?xml[^>]*\?>/g, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<\/?\w+[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Convert a cliché report into a standard quality-gate result. */
export function clicheToGateResult(report: ClicheReport): GateResult {
  return {
    gate: 'cliche-detection',
    passed: report.passed,
    blocking: report.blocking,
    warnings: report.warnings,
    evidence: report.evidence,
  };
}