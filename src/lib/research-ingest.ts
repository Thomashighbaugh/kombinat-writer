/**
 * Research Ingestion Tool
 *
 * Manages source note creation, raw text annotation, literature
 * synthesis, and persistence of research notes as markdown files.
 */

import fs from 'fs-extra';
import path from 'path';

export interface SearchQuery {
  question: string;
  kombinate: string;
  depth: 'quick' | 'standard' | 'deep';
  sources: string[];
}

export interface SourceClaim {
  claim: string;
  page: string;
  relevance: string;
}

export interface SourceNote {
  key: string;
  title: string;
  author: string;
  date: string;
  publisher: string;
  url: string;
  accessedDate: string;
  claims: SourceClaim[];
  commentary: string;
  credibility: {
    currency: number;
    relevance: number;
    authority: number;
    accuracy: number;
    purpose: string;
  };
  crossReferences: string[];
}

// ─── Public API ──────────────────────────────────────────────────────────

/**
 * Create a new SourceNote with sensible defaults.
 * Accepts partial overrides to pre-populate known fields.
 */
export function createSourceNote(overrides?: Partial<SourceNote>): SourceNote {
  const note: SourceNote = {
    key: '',
    title: '',
    author: '',
    date: '',
    publisher: '',
    url: '',
    accessedDate: new Date().toISOString().split('T')[0],
    claims: [],
    commentary: '',
    credibility: {
      currency: 3,
      relevance: 3,
      authority: 3,
      accuracy: 3,
      purpose: 'Informational',
    },
    crossReferences: [],
    ...overrides,
  };

  return note;
}

/**
 * Parse raw text and extract structured annotation.
 *
 * Looks for patterns resembling claims (prefaced by "- " or "Claim:"),
 * page numbers ("p. 123" or "pp. 123-45"), and inline citations
 * like "[Source: key]" or "(Author, Year)".
 */
export function annotateSource(rawText: string, sourceKey: string): SourceNote {
  const note = createSourceNote();
  note.key = sourceKey;

  if (!rawText.trim()) return note;

  const lines = rawText.split('\n');

  // — Extract title from first heading or first line
  const titleMatch = rawText.match(/^#{1,3}\s+(.+)$/m);
  if (titleMatch) {
    note.title = titleMatch[1].trim();
  } else if (lines[0]?.trim()) {
    note.title = lines[0].trim().replace(/^["']|["']$/g, '');
  }

  // — Extract author patterns: "Author: Name" or "by Name" near top
  const authorMatch = rawText.match(/^(?:Author|By|Written by|Creator):\s+(.+)$/im);
  if (authorMatch) {
    note.author = authorMatch[1].trim();
  }

  // — Extract date patterns
  const dateMatch = rawText.match(
    /(?:Published|Date|Year|Accessed):\s+(\d{4}(?:[-\/]\d{1,2}(?:[-\/]\d{1,2})?)?)/i,
  );
  if (dateMatch) {
    note.date = dateMatch[1];
  }

  // — Extract publisher
  const pubMatch = rawText.match(/^(?:Publisher|Source|From):\s+(.+)$/im);
  if (pubMatch) {
    note.publisher = pubMatch[1].trim();
  }

  // — Extract URL
  const urlMatch = rawText.match(/https?:\/\/[^\s)]+/g);
  if (urlMatch) {
    note.url = urlMatch[0];
  }

  // — Extract claims
  const claimPatterns = [
    // Markdown list items
    /^[-*]\s+(.+)$/gm,
    // Explicit "Claim:" prefix
    /Claim:\s+(.+)$/gim,
    // Assertive statements ending in evidence
    /^[A-Z][^.!?]{10,}(?:\.|!|\?)\s*$/gm,
  ];

  const seenClaims = new Set<string>();
  for (const pattern of claimPatterns) {
    let m;
    while ((m = pattern.exec(rawText)) !== null) {
      const text = m[1] || m[0];
      const clean = text.replace(/\([^)]*\)/g, '').trim();
      if (clean.length > 15 && !seenClaims.has(clean)) {
        seenClaims.add(clean);

        // Check for page number in same line or nearby
        const pageMatch = text.match(/\b(?:p\.\s*(\d+)|pp\.\s*(\d+-\d+)|page\s+(\d+))/i);
        const page = pageMatch
          ? (pageMatch[1] || pageMatch[2] || pageMatch[3])
          : '';

        // Assess rough relevance by claim length
        let relevance = 'supporting';
        if (clean.length > 100) relevance = 'major';
        else if (clean.length < 30) relevance = 'minor';

        note.claims.push({
          claim: clean,
          page,
          relevance,
        });
      }
    }
  }

  // — Extract cross-references via [Source: key] patterns
  const xrefMatch = rawText.matchAll(/\[Source:\s*([^\]]+)\]/g);
  for (const x of xrefMatch) {
    const ref = x[1].trim();
    if (ref !== sourceKey && !note.crossReferences.includes(ref)) {
      note.crossReferences.push(ref);
    }
  }

  return note;
}

/**
 * Produce a literature synthesis from multiple source notes.
 * Groups by shared keywords in titles, identifies consensus and
 * disagreement patterns across claims, and assesses gaps.
 */
export function synthesizeSources(notes: SourceNote[]): string {
  if (notes.length === 0) return '';

  const total = notes.length;

  // — Group by topic based on shared tokens in title/claims
  const topicMap = new Map<string, SourceNote[]>();
  for (const note of notes) {
    const tokens = (note.title + ' ' + note.claims.map(c => c.claim).join(' '))
      .toLowerCase()
      .split(/\W+/)
      .filter(t => t.length > 4)
      .filter(t => !['about', 'between', 'through', 'without', 'their', 'there', 'which', 'could'].includes(t));

    const freq = new Map<string, number>();
    for (const t of tokens) {
      freq.set(t, (freq.get(t) || 0) + 1);
    }

    // Determine best topic from the note's own most frequent term
    let bestTopic = 'General';
    let bestCount = 0;
    for (const [word, count] of freq) {
      if (count > bestCount) {
        bestCount = count;
        bestTopic = word.charAt(0).toUpperCase() + word.slice(1);
      }
    }

    if (!topicMap.has(bestTopic)) topicMap.set(bestTopic, []);
    topicMap.get(bestTopic)!.push(note);
  }

  // — Build synthesis sections
  const sections: string[] = [];
  sections.push(`# Literature Synthesis\n`);
  sections.push(`*${total} source${total !== 1 ? 's' : ''} synthesized on ${new Date().toISOString().split('T')[0]}*\n`);

  // Per-topic summary
  for (const [topic, group] of topicMap) {
    sections.push(`## ${topic}\n`);
    sections.push(`**${group.length} source${group.length !== 1 ? 's' : ''}**\n`);

    for (const note of group) {
      const byline = note.author ? `*${note.author}${note.date ? ` (${note.date})` : ''}*` : `*${note.date || 'Date unknown'}*`;
      sections.push(`- **[${note.key}]** ${note.title} — ${byline}`);
      if (note.claims.length > 0) {
        sections.push(`  - Key claims: ${note.claims.slice(0, 3).map(c => `"${c.claim.slice(0, 80)}${c.claim.length > 80 ? '…' : ''}"`).join('; ')}`);
      }
    }
    sections.push('');
  }

  // — Points of Consensus
  sections.push('## Points of Consensus\n');
  const allClaims = notes.flatMap(n => n.claims.map(c => c.claim.toLowerCase()));
  const claimCount = new Map<string, number>();
  for (const claim of allClaims) {
    const normalized = claim.replace(/[.,!?;:]+$/, '').trim();
    claimCount.set(normalized, (claimCount.get(normalized) || 0) + 1);
  }

  const consensus = [...claimCount.entries()]
    .filter(([_, count]) => count > 1)
    .sort((a, b) => b[1] - a[1]);

  if (consensus.length > 0) {
    for (const [claim, count] of consensus.slice(0, 10)) {
      sections.push(`- **${count} sources**: "${claim.slice(0, 120)}"`);
    }
  } else {
    sections.push('*No clear consensus identified across sources.*');
  }
  sections.push('');

  // — Points of Disagreement
  sections.push('## Points of Disagreement\n');
  const disagreementNotes = notes.filter(
    n => n.commentary.toLowerCase().includes('disagree') ||
         n.commentary.toLowerCase().includes('contrary') ||
         n.commentary.toLowerCase().includes('however') ||
         n.commentary.toLowerCase().includes('but'),
  );

  if (disagreementNotes.length > 0) {
    for (const note of disagreementNotes) {
      sections.push(`- **[${note.key}]** ${note.commentary.slice(0, 200)}`);
    }
  } else {
    sections.push('*No overt disagreements detected in source commentary.*');
  }
  sections.push('');

  // — Gaps
  sections.push('## Gaps & Further Research\n');
  const allTopics = new Set(
    notes.flatMap(n => (n.title + ' ' + n.claims.map(c => c.claim).join(' '))
      .toLowerCase().split(/\W+/).filter(t => t.length > 4)),
  );

  sections.push('- Sources concentrate on: ' +
    [...allTopics].sort((a, b) => {
      const countA = notes.filter(n =>
        (n.title + n.claims.map(c => c.claim).join(' ')).toLowerCase().includes(a),
      ).length;
      const countB = notes.filter(n =>
        (n.title + n.claims.map(c => c.claim).join(' ')).toLowerCase().includes(b),
      ).length;
      return countB - countA;
    }).slice(0, 8).join(', '));

  // Check credibility gaps
  const lowCred = notes.filter(n =>
    n.credibility.currency < 2 || n.credibility.authority < 2,
  );
  if (lowCred.length > 0) {
    sections.push(`- **${lowCred.length} source${lowCred.length !== 1 ? 's' : ''}** with low credibility scores — consider finding corroborating sources.`);
  }

  const noDate = notes.filter(n => !n.date);
  if (noDate.length > 0) {
    sections.push(`- **${noDate.length} source${noDate.length !== 1 ? 's' : ''}** missing publication dates — verify currency.`);
  }

  sections.push('');

  // — Assessment
  sections.push('## Assessment\n');
  const avgCurrency = notes.reduce((s, n) => s + n.credibility.currency, 0) / total;
  const avgAuthority = notes.reduce((s, n) => s + n.credibility.authority, 0) / total;
  const avgAccuracy = notes.reduce((s, n) => s + n.credibility.accuracy, 0) / total;
  const avgRelevance = notes.reduce((s, n) => s + n.credibility.relevance, 0) / total;

  sections.push(`- **Average credibility**: Currency ${avgCurrency.toFixed(1)}/5, Authority ${avgAuthority.toFixed(1)}/5, Accuracy ${avgAccuracy.toFixed(1)}/5, Relevance ${avgRelevance.toFixed(1)}/5`);

  const coverage = total >= 5 ? 'Good' : total >= 3 ? 'Moderate' : 'Limited';
  sections.push(`- **Coverage**: ${coverage} (${total} sources)`);
  sections.push(`- **Recommendation**: ${total < 3 ? 'Expand source base before drawing conclusions.' : 'Synthesis ready for integration into draft.'}`);

  return sections.join('\n');
}

/**
 * Save a source note as a markdown file.
 * Writes to `{researchDir}/sources/source-{key}.md`
 */
export function saveSourceNote(note: SourceNote, researchDir: string): void {
  const sourcesDir = path.join(researchDir, 'sources');
  fs.ensureDirSync(sourcesDir);

  const filename = `source-${note.key}.md`;
  const filePath = path.join(sourcesDir, filename);

  const claimsBlock = note.claims.length > 0
    ? `\n## Claims\n\n${note.claims.map(c =>
        `- **${c.relevance}**: ${c.claim}${c.page ? ` (p. ${c.page})` : ''}`,
      ).join('\n')}\n`
    : '';

  const xrefBlock = note.crossReferences.length > 0
    ? `\n## Cross-References\n\n${note.crossReferences.map(k => `- [${k}](./source-${k}.md)`).join('\n')}\n`
    : '';

  const content = `# ${note.title}

**Key**: ${note.key}
**Author**: ${note.author || 'Unknown'}
**Date**: ${note.date || 'Unknown'}
**Publisher**: ${note.publisher || 'Unknown'}
**URL**: ${note.url || 'None'}
**Accessed**: ${note.accessedDate || 'Unknown'}

## Credibility

| Dimension | Score (1-5) |
|-----------|:-----------:|
| Currency  | ${note.credibility.currency} |
| Relevance | ${note.credibility.relevance} |
| Authority | ${note.credibility.authority} |
| Accuracy  | ${note.credibility.accuracy} |
| Purpose   | ${note.credibility.purpose} |

**Overall**: ${((note.credibility.currency + note.credibility.relevance + note.credibility.authority + note.credibility.accuracy) / 4).toFixed(1)} / 5.0

## Commentary

${note.commentary || '*No commentary provided.*'}
${claimsBlock}
${xrefBlock}
`;

  fs.writeFileSync(filePath, content.trimStart(), 'utf-8');
}
