/**
 * Citation Manager Tool
 *
 * Manages the full citation lifecycle: source ingestion, formatting
 * across 8 styles, validation of in-chapter references, and
 * bibliography generation.
 */

import fs from 'fs-extra';
import path from 'path';

export type CitationStyle =
  | 'apa7'
  | 'chicago17-notes'
  | 'chicago17-ad'
  | 'mla9'
  | 'ieee'
  | 'bluebook21'
  | 'vancouver'
  | 'custom';

export interface SourceMetadata {
  key: string;
  author: string;
  title: string;
  date: string;
  publisher: string;
  url?: string;
  doi?: string;
  edition?: string;
  editors?: string[];
  translators?: string[];
  pages?: string;
  volume?: string;
  issue?: string;
  accessedDate?: string;
}

export interface Source {
  key: string;
  citation: string;
  style: CitationStyle;
  metadata: Record<string, string>;
  accessedDate: string;
  credibility: 'high' | 'medium' | 'low';
  annotations: string[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────

function formatAuthors(authors: string, max: number = 3): string {
  if (!authors) return '';
  const parts = authors.split(';').map(a => a.trim()).filter(Boolean);
  if (parts.length === 0) return '';
  if (parts.length === 1) return parts[0];

  if (parts.length <= max) {
    const last = parts.pop()!;
    return `${parts.join(', ')}, & ${last}`;
  }
  return `${parts[0]} et al.`;
}

function invertName(name: string): string {
  const trimmed = name.trim();
  const parts = trimmed.split(/\s+/);
  if (parts.length <= 1) return trimmed;
  const last = parts.pop()!;
  return `${last}, ${parts.join(' ')}`;
}

function formatAuthorsInverted(authors: string, max: number = 3): string {
  if (!authors) return '';
  const parts = authors.split(';').map(a => a.trim()).filter(Boolean);
  if (parts.length === 0) return '';
  const inverted = parts.map(invertName);
  if (inverted.length === 1) return inverted[0];

  if (inverted.length <= max) {
    const last = inverted.pop()!;
    return `${inverted.join(', ')}, & ${last}`;
  }
  return `${inverted[0]} et al.`;
}

function formatEditors(editors?: string[]): string {
  if (!editors || editors.length === 0) return '';
  return editors.length === 1 ? `${editors[0]} (Ed.)` : `${editors.join(', ')} (Eds.)`;
}

function formatTranslators(translators?: string[]): string {
  if (!translators || translators.length === 0) return '';
  return translators.length === 1 ? `Trans. ${translators[0]}` : `Trans. ${translators.join(', ')}`;
}

function extractMetadata(m: Record<string, string>): SourceMetadata {
  return {
    key: m.key || '',
    author: m.author || '',
    title: m.title || '',
    date: m.date || '',
    publisher: m.publisher || '',
    url: m.url || '',
    doi: m.doi || '',
    edition: m.edition || '',
    editors: m.editors ? m.editors.split(';').map(s => s.trim()) : undefined,
    translators: m.translators ? m.translators.split(';').map(s => s.trim()) : undefined,
    pages: m.pages || '',
    volume: m.volume || '',
    issue: m.issue || '',
    accessedDate: m.accessedDate || '',
  };
}

function generateKey(metadata: SourceMetadata): string {
  const author = metadata.author.split(';')[0]?.trim().split(/\s+/).pop()?.toLowerCase() || 'unknown';
  const year = metadata.date ? metadata.date.replace(/[^\d]/g, '').slice(0, 4) : 'nodate';
  const titlePrefix = metadata.title
    .replace(/^(the|a|an)\s+/i, '')
    .split(/\s+/)
    .slice(0, 3)
    .join('-')
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '');
  return `${author}-${year}-${titlePrefix}`.slice(0, 60);
}

// ─── Style Formatters ────────────────────────────────────────────────────

function formatApa7(metadata: SourceMetadata): string {
  const author = formatAuthorsInverted(metadata.author);
  const date = metadata.date ? `(${metadata.date})` : '(n.d.)';
  const title = metadata.title.endsWith('.') ? metadata.title : `${metadata.title}.`;
  const edition = metadata.edition ? ` (${metadata.edition} ed.)` : '';
  const publisher = metadata.publisher ? `${metadata.publisher}.` : '';
  const doi = metadata.doi ? ` https://doi.org/${metadata.doi}` : '';
  const url = !metadata.doi && metadata.url ? ` ${metadata.url}` : '';

  return `${author} ${date}. ${title}${edition} ${publisher}${doi}${url}`.trim();
}

function formatChicago17Notes(metadata: SourceMetadata): string {
  const author = formatAuthors(metadata.author, 3);
  const title = metadata.title.endsWith('.') ? metadata.title.replace(/\.$/, '') : metadata.title;
  const edition = metadata.edition ? ` ${metadata.edition} ed.` : '';
  const editors = metadata.editors ? `, edited by ${formatAuthors(metadata.editors.join('; '), 3)}` : '';
  const translators = metadata.translators ? `, translated by ${formatAuthors(metadata.translators.join('; '), 3)}` : '';
  const pubInfo = metadata.publisher && metadata.date ? ` (${metadata.publisher}, ${metadata.date})` :
    metadata.publisher ? ` (${metadata.publisher})` :
    metadata.date ? ` (${metadata.date})` : '';
  const url = metadata.url ? `, ${metadata.url}` : '';
  const pages = metadata.pages ? `, ${metadata.pages}` : '';

  return `${author}, "${title}"${edition}${editors}${translators}${pubInfo}${pages}${url}.`;
}

function formatChicago17AD(metadata: SourceMetadata): string {
  const author = formatAuthorsInverted(metadata.author);
  const date = metadata.date ? `${metadata.date}.` : 'n.d.';
  const title = metadata.title.endsWith('.') ? metadata.title : `${metadata.title}.`;
  const edition = metadata.edition ? ` ${metadata.edition} ed.` : '';
  const publisher = metadata.publisher ? `${metadata.publisher}. ` : '';
  const url = metadata.url ? `${metadata.url}.` : '';
  const doi = metadata.doi ? `https://doi.org/${metadata.doi}.` : '';

  return `${author} ${date} ${title}${edition} ${publisher}${url}${doi}`.trim().replace(/\.+$/, '.');
}

function formatMla9(metadata: SourceMetadata): string {
  const author = formatAuthors(metadata.author, 3);
  const title = metadata.title.endsWith('.') ? metadata.title : `${metadata.title}.`;
  const edition = metadata.edition ? ` ${metadata.edition} ed.,` : '';
  const publisher = metadata.publisher ? `${metadata.publisher},` : '';
  const date = metadata.date ? ` ${metadata.date}.` : '';
  const translators = metadata.translators ? ` Translated by ${formatAuthors(metadata.translators.join('; '), 3)},` : '';
  const doi = metadata.doi ? ` doi:${metadata.doi}.` : '';
  const url = !metadata.doi && metadata.url ? ` ${metadata.url}.` : '';

  return `${author}${translators} "${title}"${edition} ${publisher}${date}${doi}${url}`.trim().replace(/,\./g, '.').replace(/\s+,/g, ',');
}

function formatIeee(metadata: SourceMetadata): string {
  const author = metadata.author ? `${metadata.author.split(';').map(a => a.trim()).join(', ')}, ` : '';
  const title = `"${metadata.title.endsWith('.') ? metadata.title : `${metadata.title}.`}" `;
  const edition = metadata.edition ? `${metadata.edition} ed., ` : '';
  const publisher = metadata.publisher ? `${metadata.publisher}, ` : '';
  const date = metadata.date ? `${metadata.date}.` : 'n.d.';
  const pages = metadata.pages ? ` pp. ${metadata.pages}.` : '';
  const doi = metadata.doi ? ` doi: ${metadata.doi}.` : '';
  const url = !metadata.doi && metadata.url ? ` [${metadata.url}]` : '';

  const result = `${author}${title}${edition}${publisher}${date}${pages}${doi}${url}`.trim();
  return result.endsWith('.') ? result : `${result}.`;
}

function formatBluebook21(metadata: SourceMetadata): string {
  // Simplified Bluebook 21st edition — law review style
  const author = metadata.author ? `${metadata.author.split(';')[0]?.trim() || ''}, ` : '';
  const title = metadata.title.endsWith('.') ? metadata.title : `${metadata.title}, `;
  const vol = metadata.volume ? `${metadata.volume} ` : '';
  const pub = metadata.publisher ? `${metadata.publisher} ` : '';
  const date = metadata.date ? `${metadata.date}` : 'n.d.';
  const pages = metadata.pages ? `, ${metadata.pages}` : '';

  return `${author}${title}${vol}${pub}${date}${pages}`.trim();
}

function formatVancouver(metadata: SourceMetadata): string {
  const author = metadata.author ? `${metadata.author.split(';').map(a => a.trim()).join(', ')}. ` : '';
  const title = `${metadata.title}. `;
  const edition = metadata.edition ? `${metadata.edition} ed. ` : '';
  const publisher = metadata.publisher ? `${metadata.publisher}; ` : '';
  const date = metadata.date ? `${metadata.date}. ` : 'n.d. ';
  const pages = metadata.pages ? `p. ${metadata.pages}. ` : '';
  const doi = metadata.doi ? `doi:${metadata.doi}. ` : '';
  const url = !metadata.doi && metadata.url ? metadata.url : '';

  return `${author}${title}${edition}${publisher}${date}${pages}${doi}${url}`.trim();
}

function formatCustom(metadata: SourceMetadata): string {
  // Configurable format: defaults to a clean author-title-date-publisher pattern
  const author = metadata.author ? `${metadata.author} ` : '';
  const title = metadata.title.endsWith('.') ? `${metadata.title} ` : `${metadata.title}. `;
  const edition = metadata.edition ? `(${metadata.edition} ed.) ` : '';
  const publisher = metadata.publisher ? `${metadata.publisher}, ` : '';
  const date = metadata.date ? `${metadata.date}.` : 'n.d.';
  const url = metadata.url ? ` ${metadata.url}` : '';
  const doi = metadata.doi ? ` doi:${metadata.doi}` : '';

  return `${author}${title}${edition}${publisher}${date}${url}${doi}`.trim();
}

const STYLE_FORMATTERS: Record<CitationStyle, (m: SourceMetadata) => string> = {
  apa7: formatApa7,
  'chicago17-notes': formatChicago17Notes,
  'chicago17-ad': formatChicago17AD,
  mla9: formatMla9,
  ieee: formatIeee,
  bluebook21: formatBluebook21,
  vancouver: formatVancouver,
  custom: formatCustom,
};

// ─── Public API ───────────────────────────────────────────────────────────

/**
 * Format a source's metadata into the requested citation style.
 */
export function formatCitation(source: Source, style: CitationStyle): string {
  const metadata = extractMetadata(source.metadata);
  const formatter = STYLE_FORMATTERS[style] || formatApa7;
  const citation = formatter(metadata);
  return citation;
}

/**
 * Ingest source metadata and produce a formatted citation plus a generated key.
 */
export function ingestSource(
  metadata: SourceMetadata,
  style: CitationStyle = 'apa7',
): { key: string; citation: string; style: CitationStyle } {
  const key = metadata.key || generateKey(metadata);
  const source: Source = {
    key,
    citation: '',
    style,
    metadata: Object.fromEntries(
      Object.entries(metadata).filter(([_, v]) => v !== undefined && v !== null),
    ) as Record<string, string>,
    accessedDate: metadata.accessedDate || new Date().toISOString().split('T')[0],
    credibility: 'medium',
    annotations: [],
  };
  const citation = formatCitation(source, style);
  source.citation = citation;
  return { key, citation, style };
}

/**
 * Validate citations in chapter files.
 * Scans for [Source: key] markers and [CitationNeeded] markers.
 */
export function validateCitations(chapterDir: string): Array<{
  file: string;
  line: number;
  issue: string;
}> {
  const issues: Array<{ file: string; line: number; issue: string }> = [];

  if (!fs.existsSync(chapterDir)) return issues;

  // Gather known source keys from the sources directory
  const sourcesDir = path.resolve(chapterDir, '..', 'research', 'sources');
  const knownKeys = new Set<string>();
  if (fs.existsSync(sourcesDir)) {
    const sourceFiles = fs.readdirSync(sourcesDir).filter(f => f.startsWith('source-') && f.endsWith('.md'));
    for (const sf of sourceFiles) {
      const key = sf.replace(/^source-/, '').replace(/\.md$/, '');
      knownKeys.add(key);
    }
  }

  const chapterFiles = fs.readdirSync(chapterDir)
    .filter(f => f.endsWith('.md'))
    .sort((a, b) => {
      const numA = parseInt(a.match(/\d+/)?.[0] || '0', 10);
      const numB = parseInt(b.match(/\d+/)?.[0] || '0', 10);
      return numA - numB;
    });

  for (const file of chapterFiles) {
    const filePath = path.join(chapterDir, file);
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');

    const sourceRegex = /\[Source:\s*([^\]]+)\]/g;
    const citationNeededRegex = /\[CitationNeeded\]/g;

    for (let i = 0; i < lines.length; i++) {
      const lineNum = i + 1;

      // Check [Source: key] markers
      let sm;
      while ((sm = sourceRegex.exec(lines[i])) !== null) {
        const refKey = sm[1].trim();
        if (!knownKeys.has(refKey)) {
          issues.push({
            file,
            line: lineNum,
            issue: `[Source: ${refKey}] references unknown source key "${refKey}"`,
          });
        }
      }

      // Check [CitationNeeded] markers
      let cn;
      while ((cn = citationNeededRegex.exec(lines[i])) !== null) {
        issues.push({
          file,
          line: lineNum,
          issue: '[CitationNeeded] marker found — citation required here',
        });
      }
    }
  }

  return issues;
}

/**
 * Build a complete bibliography sorted alphabetically by author.
 */
export function buildBibliography(sources: Source[], style: CitationStyle): string {
  let bib = `# Bibliography (${style})\n\n`;

  const sorted = [...sources].sort((a, b) => {
    const aAuthor = (a.metadata.author || '').toLowerCase();
    const bAuthor = (b.metadata.author || '').toLowerCase();
    const cmp = aAuthor.localeCompare(bAuthor);
    if (cmp !== 0) return cmp;
    const aDate = (a.metadata.date || '').toLowerCase();
    const bDate = (b.metadata.date || '').toLowerCase();
    return aDate.localeCompare(bDate);
  });

  for (const source of sorted) {
    const citation = formatCitation(source, style);
    bib += `${citation}\n\n`;
  }

  return bib.trim() + '\n';
}
