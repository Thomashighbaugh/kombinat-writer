/**
 * Question/Answer Accounting
 *
 * Tracks every question raised by the narrative (mystery, implied
 * question, character goal) through to its answer or deliberate
 * non-answer. Forgotten questions are a specific failure mode —
 * readers notice unanswered questions.
 */

import fs from 'fs-extra';
import path from 'path';

export interface QAReport {
  questions: NarrativeQuestion[];
  answered: NarrativeQuestion[];
  unanswered: NarrativeQuestion[];
  deliberatelyUnresolved: NarrativeQuestion[];
  evidence: string[];
}

export interface NarrativeQuestion {
  id: string;
  question: string;
  type: 'mystery' | 'goal' | 'mystery-box' | 'implicit' | 'plot-question';
  raisedInChapter: number;
  answeredInChapter?: number;
  answer?: string;
  deliberatelyUnresolved: boolean;
  resolutionNote?: string;
}

export function analyzeQuestionAccounting(
  projectRoot: string
): QAReport {
  const evidence: string[] = [];
  const questions: NarrativeQuestion[] = [];

  // Parse XML drafts for questions raised and answered
  const draftsDir = path.join(projectRoot, 'book', 'drafts');
  if (!fs.existsSync(draftsDir)) {
    return { questions: [], answered: [], unanswered: [], deliberatelyUnresolved: [], evidence: ['No drafts found'] };
  }

  const xmlFiles = fs.readdirSync(draftsDir).filter(f => f.endsWith('.xml')).sort();
  let questionIdCounter = 0;

  for (const xmlFile of xmlFiles) {
    const match = xmlFile.match(/chapter_(\d+)\.xml/);
    if (!match) continue;
    const chapterNum = parseInt(match[1]);
    const content = fs.readFileSync(path.join(draftsDir, xmlFile), 'utf-8');

    // Extract questions from interiority and dialogue (implicit questions)
    const interiorityRegex = /<interiority\s+[^>]*?thought="([^"]*)"[^>]*>/g;
    const interiorityMatches = [...content.matchAll(interiorityRegex)];
    for (const m of interiorityMatches) {
      const thought = m[1];
      // Detect question patterns
      if (/\?/.test(thought) || /^(why|how|what|who|where|when)\b/i.test(thought)) {
        questions.push({
          id: `Q${++questionIdCounter}`,
          question: thought,
          type: 'implicit',
          raisedInChapter: chapterNum,
          deliberatelyUnresolved: false,
        });
      }
    }

    // Extract plot-thread introductions as questions
    const plotThreadRegex = /<plot-thread\s+name="([^"]+)"\s+status="introduced"[^>]*\/>/g;
    const threadMatches = [...content.matchAll(plotThreadRegex)];
    for (const m of threadMatches) {
      questions.push({
        id: `Q${++questionIdCounter}`,
        question: `How will the "${m[1]}" thread resolve?`,
        type: 'plot-question',
        raisedInChapter: chapterNum,
        deliberatelyUnresolved: false,
      });
    }

    // Extract character goals as questions
    const goalRegex = /<(?:character-goal|goal)\s+[^>]*?character="([^"]*)"[^>]*?goal="([^"]*)"[^>]*>/g;
    const goalMatches = [...content.matchAll(goalRegex)];
    for (const m of goalMatches) {
      questions.push({
        id: `Q${++questionIdCounter}`,
        question: `Will ${m[1]} achieve: ${m[2]}?`,
        type: 'goal',
        raisedInChapter: chapterNum,
        deliberatelyUnresolved: false,
      });
    }

    // Check for resolutions in this chapter
    const resolvedRegex = /<plot-thread\s+name="([^"]+)"\s+status="(?:complete|resolved)"[^>]*\/>/g;
    const resolvedMatches = [...content.matchAll(resolvedRegex)];
    for (const m of resolvedMatches) {
      const threadName = m[1];
      // Find matching question
      const q = questions.find(q => q.question.includes(threadName) && !q.answeredInChapter);
      if (q) {
        q.answeredInChapter = chapterNum;
        q.answer = `Thread "${threadName}" resolved`;
      }
    }
  }

  // Load plot-tracker.json for thread resolution data
  const trackerPath = path.join(projectRoot, 'book', 'tracking', 'plot-tracker.json');
  if (fs.existsSync(trackerPath)) {
    try {
      const tracker = fs.readJsonSync(trackerPath);
      if (Array.isArray(tracker.threads)) {
        for (const thread of tracker.threads) {
          if (thread.status === 'resolved' || thread.status === 'complete') {
            const q = questions.find(q => q.question.includes(thread.name) && !q.answeredInChapter);
            if (q) {
              q.answeredInChapter = thread.resolvedChapter || thread.lastAppearance;
              q.answer = `Thread "${thread.name}" resolved`;
            }
          }
          if (thread.deliberatelyUnresolved) {
            const q = questions.find(q => q.question.includes(thread.name));
            if (q) {
              q.deliberatelyUnresolved = true;
              q.resolutionNote = thread.resolutionNote || 'Deliberately left unresolved';
            }
          }
        }
      }
    } catch {
      evidence.push('⚠ plot-tracker.json could not be parsed');
    }
  }

  const answered = questions.filter(q => q.answeredInChapter);
  const unanswered = questions.filter(q => !q.answeredInChapter && !q.deliberatelyUnresolved);
  const deliberatelyUnresolved = questions.filter(q => q.deliberatelyUnresolved);

  evidence.push(`✓ Questions raised: ${questions.length}`);
  evidence.push(`✓ Answered: ${answered.length}`);
  if (unanswered.length > 0) {
    evidence.push(`✗ Unanswered: ${unanswered.length} — these questions were raised but never resolved`);
    for (const q of unanswered.slice(0, 5)) {
      evidence.push(`  ${q.id}: "${q.question}" (raised Ch${q.raisedInChapter})`);
    }
  }
  if (deliberatelyUnresolved.length > 0) {
    evidence.push(`⚠ Deliberately unresolved: ${deliberatelyUnresolved.length} — intended for sequel or thematic effect`);
  }

  return { questions, answered, unanswered, deliberatelyUnresolved, evidence };
}

export function formatQAReport(report: QAReport): string {
  const lines: string[] = [];
  lines.push('# Question/Answer Accounting');
  lines.push('');
  lines.push(`**Questions raised:** ${report.questions.length}`);
  lines.push(`**Answered:** ${report.answered.length}`);
  lines.push(`**Unanswered:** ${report.unanswered.length}`);
  lines.push(`**Deliberately unresolved:** ${report.deliberatelyUnresolved.length}`);
  lines.push('');

  if (report.unanswered.length > 0) {
    lines.push('## Unanswered Questions (need resolution)');
    lines.push('| ID | Question | Type | Raised In |');
    lines.push('|----|----------|------|-----------|');
    for (const q of report.unanswered) {
      lines.push(`| ${q.id} | ${q.question} | ${q.type} | Ch${q.raisedInChapter} |`);
    }
    lines.push('');
  }

  if (report.deliberatelyUnresolved.length > 0) {
    lines.push('## Deliberately Unresolved');
    for (const q of report.deliberatelyUnresolved) {
      lines.push(`- ${q.id}: ${q.question} — ${q.resolutionNote || 'Intentionally left open'}`);
    }
    lines.push('');
  }

  if (report.answered.length > 0) {
    lines.push('## Answered Questions');
    lines.push('| ID | Question | Raised In | Answered In | Answer |');
    lines.push('|----|----------|-----------|-------------|--------|');
    for (const q of report.answered) {
      lines.push(`| ${q.id} | ${q.question} | Ch${q.raisedInChapter} | Ch${q.answeredInChapter} | ${q.answer} |`);
    }
  }

  return lines.join('\n');
}