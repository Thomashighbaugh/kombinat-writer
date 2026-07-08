/**
 * Opening/Closing Strength Audit
 *
 * Detailed analysis of the first 500 words and last 500 words of the
 * book AND each chapter. First sentence hook strength, paragraph
 * escalation, closing resonance.
 *
 * Openings and closings carry disproportionate weight in reader
 * experience.
 */

import fs from 'fs-extra';
import path from 'path';

/** Book-level and per-chapter analysis of opening hook and closing resonance. */
export interface OpeningClosingReport {
  bookOpening: PassageAnalysis | null;
  bookClosing: PassageAnalysis | null;
  chapterAnalyses: ChapterPassageAnalysis[];
  evidence: string[];
}

interface PassageAnalysis {
  location: string;
  firstSentence: string;
  firstSentenceHookScore: number;  // 0-10
  paragraphCount: number;
  hookType: string;
  closingResonance: string;
  closingResonanceScore: number;  // 0-10
  issues: string[];
}

interface ChapterPassageAnalysis {
  chapter: number;
  opening: PassageAnalysis;
  closing: PassageAnalysis;
}

/** Scan all chapter markdown files to score opening hooks and closing resonance. */
export function auditOpeningsClosings(
  projectRoot: string
): OpeningClosingReport {
  const evidence: string[] = [];
  const contentDir = path.join(projectRoot, 'book', 'content');

  if (!fs.existsSync(contentDir)) {
    return { bookOpening: null, bookClosing: null, chapterAnalyses: [], evidence: ['No content found'] };
  }

  const chapterFiles = fs.readdirSync(contentDir)
    .filter(f => f.startsWith('chapter_') && f.endsWith('.md'))
    .sort();

  if (chapterFiles.length === 0) {
    return { bookOpening: null, bookClosing: null, chapterAnalyses: [], evidence: ['No chapters found'] };
  }

  // Book-level opening (first 500 words of chapter 1)
  const firstChapter = fs.readFileSync(path.join(contentDir, chapterFiles[0]), 'utf-8');
  const bookOpening = analyzePassage(firstChapter, 500, 'opening', `Book opening (Chapter 1)`);

  // Book-level closing (last 500 words of final chapter)
  const lastChapter = fs.readFileSync(path.join(contentDir, chapterFiles[chapterFiles.length - 1]), 'utf-8');
  const bookClosing = analyzePassage(lastChapter, 500, 'closing', `Book closing (Chapter ${chapterFiles.length})`);

  // Per-chapter analysis
  const chapterAnalyses: ChapterPassageAnalysis[] = [];
  for (let i = 0; i < chapterFiles.length; i++) {
    const chapterContent = fs.readFileSync(path.join(contentDir, chapterFiles[i]), 'utf-8');
    const match = chapterFiles[i].match(/chapter_(\d+)\.md/);
    const chapterNum = match ? parseInt(match[1]) : i + 1;
    chapterAnalyses.push({
      chapter: chapterNum,
      opening: analyzePassage(chapterContent, 250, 'opening', `Chapter ${chapterNum} opening`),
      closing: analyzePassage(chapterContent, 250, 'closing', `Chapter ${chapterNum} closing`),
    });
  }

  evidence.push(`✓ Analyzed ${chapterFiles.length} chapters + book-level opening/closing`);
  evidence.push(`✓ Book opening hook score: ${bookOpening.firstSentenceHookScore}/10`);
  evidence.push(`✓ Book closing resonance score: ${bookClosing.closingResonanceScore}/10`);

  for (const issue of bookOpening.issues) {
    evidence.push(`✗ Book opening: ${issue}`);
  }
  for (const issue of bookClosing.issues) {
    evidence.push(`✗ Book closing: ${issue}`);
  }

  // Flag weak chapter openings/closings
  const weakOpenings = chapterAnalyses.filter(a => a.opening.firstSentenceHookScore < 4);
  const weakClosings = chapterAnalyses.filter(a => a.closing.closingResonanceScore < 4);
  if (weakOpenings.length > 0) {
    evidence.push(`✗ Weak chapter openings: ${weakOpenings.map(a => `Ch${a.chapter}`).join(', ')}`);
  }
  if (weakClosings.length > 0) {
    evidence.push(`✗ Weak chapter closings: ${weakClosings.map(a => `Ch${a.chapter}`).join(', ')}`);
  }

  return { bookOpening, bookClosing, chapterAnalyses, evidence };
}

function analyzePassage(content: string, wordLimit: number, type: 'opening' | 'closing', location: string): PassageAnalysis {
  const words = content.split(/\s+/).filter(w => w.length > 0);
  const passage = type === 'opening'
    ? words.slice(0, wordLimit).join(' ')
    : words.slice(-wordLimit).join(' ');

  const sentences = passage.split(/(?<=[.!?])\s+/).filter(s => s.trim().length > 0);
  const firstSentence = sentences[0] || passage.slice(0, 100);
  const paragraphCount = passage.split(/\n\n+/).filter(p => p.trim().length > 0).length;

  // Hook scoring for opening
  let hookScore = 5;
  let hookType = 'neutral';
  const firstLower = firstSentence.toLowerCase();

  if (/^(the|it was|there was|in the|on the|when|as|by the)/.test(firstLower)) {
    hookScore = 3;
    hookType = 'conventional opening (articles/weather/setting)';
  } else if (firstSentence.length < 20) {
    hookScore = 8;
    hookType = 'short punchy opening';
  } else if (/\?|!/.test(firstSentence)) {
    hookScore = 7;
    hookType = 'question or exclamation opening';
  } else if (/dialogue|"|"/.test(firstSentence)) {
    hookScore = 7;
    hookType = 'in-scene dialogue opening';
  } else if (/action|ran|fell|struck|grabbed|threw|jumped|drew|fired|screamed|whispered/i.test(firstSentence)) {
    hookScore = 8;
    hookType = 'in-action opening';
  } else if (/^[A-Z][a-z]+ (said|told|asked|whispered)/.test(firstSentence)) {
    hookScore = 6;
    hookType = 'character speech opening';
  }

  // Resonance scoring for closing
  let resonanceScore = 5;
  const lastSentence = sentences[sentences.length - 1] || passage.slice(-100);
  const lastLower = lastSentence.toLowerCase();

  if (lastSentence.length < 15) {
    resonanceScore = 8;
  }
  if (/\?/.test(lastSentence)) {
    resonanceScore = 7; // Cliffhanger
  }
  if (/forever|always|never|nothing|everything|gone|silence|dark|end/i.test(lastLower)) {
    resonanceScore = 8; // Resonant word choice
  }
  if (/\.\.\.$/.test(lastSentence.trim())) {
    resonanceScore = 7; // Trailing off
  }

  const issues: string[] = [];
  if (type === 'opening' && hookScore < 5) {
    issues.push(`Weak hook (score ${hookScore}/10): ${hookType}. First sentence: "${firstSentence.slice(0, 60)}..."`);
  }
  if (type === 'closing' && resonanceScore < 5) {
    issues.push(`Weak closing resonance (score ${resonanceScore}/10). Last sentence: "${lastSentence.slice(0, 60)}..."`);
  }
  if (type === 'opening' && firstLower.startsWith('the ') && hookScore < 5) {
    issues.push('Opening starts with "The" — consider starting with character, action, or dialogue instead');
  }

  return {
    location,
    firstSentence,
    firstSentenceHookScore: type === 'opening' ? hookScore : resonanceScore,
    paragraphCount,
    hookType,
    closingResonance: type === 'closing' ? lastSentence : '',
    closingResonanceScore: resonanceScore,
    issues,
  };
}

/** Format an opening/closing audit as a markdown report with scores per chapter. */
export function formatOpeningClosingReport(report: OpeningClosingReport): string {
  const lines: string[] = [];
  lines.push('# Opening/Closing Strength Audit');
  lines.push('');

  if (report.bookOpening) {
    lines.push('## Book Opening');
    lines.push(`**First sentence:** "${report.bookOpening.firstSentence.slice(0, 100)}..."`);
    lines.push(`**Hook score:** ${report.bookOpening.firstSentenceHookScore}/10`);
    lines.push(`**Hook type:** ${report.bookOpening.hookType}`);
    if (report.bookOpening.issues.length > 0) {
      lines.push('**Issues:**');
      for (const issue of report.bookOpening.issues) lines.push(`- ${issue}`);
    }
    lines.push('');
  }

  if (report.bookClosing) {
    lines.push('## Book Closing');
    lines.push(`**Last sentence:** "${report.bookClosing.closingResonance.slice(0, 100)}..."`);
    lines.push(`**Resonance score:** ${report.bookClosing.closingResonanceScore}/10`);
    if (report.bookClosing.issues.length > 0) {
      lines.push('**Issues:**');
      for (const issue of report.bookClosing.issues) lines.push(`- ${issue}`);
    }
    lines.push('');
  }

  lines.push('## Per-Chapter');
  lines.push('| Chapter | Opening Score | Opening Type | Closing Score |');
  lines.push('|---------|---------------|--------------|---------------|');
  for (const ca of report.chapterAnalyses) {
    lines.push(`| Ch${ca.chapter} | ${ca.opening.firstSentenceHookScore}/10 | ${ca.opening.hookType} | ${ca.closing.closingResonanceScore}/10 |`);
  }

  return lines.join('\n');
}