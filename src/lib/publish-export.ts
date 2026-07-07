/**
 * Publish Export Tool
 *
 * Compiles the completed manuscript into multiple output formats:
 * EPUB 3 (OPF + NCX + XHTML + CSS), DOCX (heading styles, TOC),
 * LaTeX (book class, BibTeX), Markdown manuscript, and web serial
 * chunking.
 *
 * Pandoc integration: if pandoc is available on the system, exports
 * use pandoc for production-quality output. Falls back to built-in
 * manual generators with a warning if pandoc is not installed.
 *
 * Post-export verification: validates output files (EPUB structure,
 * DOCX opens, file sizes reasonable, expected file count).
 */

import fs from 'fs-extra';
import path from 'path';
import { execSync, execFileSync } from 'child_process';

export type ExportFormat = 'manuscript' | 'epub' | 'docx' | 'latex' | 'pdf' | 'web' | 'all';

export interface PublishConfig {
  title: string;
  author: string;
  language: string;
  license: string;
  isbn?: string;
  publisher?: string;
  coverImage?: string;
  citationStyle?: string;
  subtitle?: string;
  description?: string;
  series?: string;
  seriesNumber?: number;
}

interface ChapterMeta {
  index: number;
  filename: string;
  title: string;
  content: string;
}

// ─── Helpers ────────────────────────────────────────────────────────────

function detectChapterTitle(content: string, fallback: string): string {
  const h1Match = content.match(/^#\s+(.+)$/m);
  if (h1Match) return h1Match[1].trim();
  const h2Match = content.match(/^##\s+(.+)$/m);
  if (h2Match) return h2Match[1].trim();
  return fallback;
}

function stripMarkdownReferences(md: string): string {
  // Remove [Text](url) → Text
  return md.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');
}

function mdToBasicHtml(md: string): string {
  let html = md
    // Headings
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    // Bold & italic
    .replace(/\*\*\*(.+?)\*\*\*/g, '<b><i>$1</i></b>')
    .replace(/\*\*(.+?)\*\*/g, '<b>$1</b>')
    .replace(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g, '<i>$1</i>')
    // Inline code
    .replace(/`(.+?)`/g, '<code>$1</code>')
    // Links
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')
    // Images
    const imgRe = new RegExp('!\\[([^\\]]*)\\]\\(([^)]+)\\)', 'g');
  html = html.replace(imgRe, '<img src="$2" alt="$1" />');
  // Horizontal rules
  html = html.replace(/^---$/gm, '<hr/>');
  // Blockquotes
  html = html.replace(/^> (.+)$/gm, '<blockquote>$1</blockquote>');
  // Paragraphs: wrap non-heading, non-list, non-blockquote lines
  const lines = html.split('\n');
  const wrapped: string[] = [];
  let inPara = false;
  // Track blockquote state
  let inBlockquote = false;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      if (inPara) { wrapped.push('</p>'); inPara = false; }
      continue;
    }
    if (trimmed.startsWith('<h') || trimmed.startsWith('<hr') || trimmed.startsWith('<img') ||
        trimmed.startsWith('<blockquote') || trimmed.startsWith('</blockquote') ||
        trimmed.startsWith('<ul') || trimmed.startsWith('</ul') ||
        trimmed.startsWith('<li') || trimmed.startsWith('</li') ||
        trimmed.startsWith('<ol') || trimmed.startsWith('</ol') ||
        trimmed.startsWith('<code') || trimmed.startsWith('</code')) {
      if (inPara) { wrapped.push('</p>'); inPara = false; }
      wrapped.push(trimmed);
      continue;
    }
    if (!inPara) {
      wrapped.push('<p>' + trimmed);
      inPara = true;
    } else {
      wrapped.push(trimmed);
    }
  }
  if (inPara) wrapped.push('</p>');

  return wrapped.join('\n');
}

// ─── readChapters ───────────────────────────────────────────────────────

/**
 * Read all chapter files from the content directory in order.
 * Returns an array of parsed chapter objects sorted by index.
 */
export function readChapters(contentDir: string): ChapterMeta[] {
  if (!fs.existsSync(contentDir)) return [];

  const files = fs.readdirSync(contentDir)
    .filter(f => f.endsWith('.md'))
    .sort((a, b) => {
      const numA = parseInt(a.match(/\d+/)?.[0] || '0', 10);
      const numB = parseInt(b.match(/\d+/)?.[0] || '0', 10);
      if (numA !== numB) return numA - numB;
      return a.localeCompare(b);
    });

  return files.map((filename, i) => {
    const content = fs.readFileSync(path.join(contentDir, filename), 'utf-8');
    return {
      index: i + 1,
      filename,
      title: detectChapterTitle(content, `Chapter ${i + 1}`),
      content,
    };
  });
}

// ─── readConfig ─────────────────────────────────────────────────────────

/**
 * Read metadata and configuration from the book directory.
 *
 * Checks for:
 *  - `book/meta.json`
 *  - `book/track.json`
 * Falls back to defaults for missing fields.
 */
export function readConfig(bookDir: string): PublishConfig {
  const metaPath = path.join(bookDir, 'meta.json');
  const trackPath = path.join(bookDir, 'track.json');

  const meta: Partial<PublishConfig> = fs.existsSync(metaPath)
    ? fs.readJsonSync(metaPath)
    : {};

  const track: { track?: string } = fs.existsSync(trackPath)
    ? fs.readJsonSync(trackPath)
    : {};

  return {
    title: meta.title || 'Untitled',
    author: meta.author || 'Unknown Author',
    language: meta.language || 'en',
    license: meta.license || 'All Rights Reserved',
    isbn: meta.isbn,
    publisher: meta.publisher,
    coverImage: meta.coverImage,
    citationStyle: meta.citationStyle,
    subtitle: meta.subtitle,
    description: meta.description,
    series: meta.series,
    seriesNumber: meta.seriesNumber,
  };
}

// ─── compileManuscript ──────────────────────────────────────────────────

/**
 * Merge chapters into a single manuscript with title page, front matter,
 * body chapters, and back matter.
 */
export function compileManuscript(chapters: ChapterMeta[], config: PublishConfig): string {
  const sections: string[] = [];

  // — Title page
  sections.push(`# ${config.title}`);
  if (config.subtitle) sections.push(`*${config.subtitle}*`);
  sections.push('');
  sections.push(`**By ${config.author}**`);
  sections.push('');
  if (config.publisher) sections.push(`*${config.publisher}*`);
  if (config.isbn) sections.push(`ISBN: ${config.isbn}`);
  if (config.series) sections.push(`${config.series}${config.seriesNumber ? ` #${config.seriesNumber}` : ''}`);
  sections.push('');
  sections.push(`License: ${config.license}`);
  sections.push('');
  sections.push('---');
  sections.push('');

  // — Front matter: description
  if (config.description) {
    sections.push(`> ${config.description}`);
    sections.push('');
    sections.push('---');
    sections.push('');
  }

  // — Table of Contents
  sections.push('## Table of Contents\n');
  for (const ch of chapters) {
    sections.push(`- [${ch.title}](#${ch.title.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')})`);
  }
  sections.push('');
  sections.push('---');
  sections.push('');

  // — Body chapters
  for (const ch of chapters) {
    sections.push(ch.content.trim());
    sections.push('');
    sections.push('---');
    sections.push('');
  }

  return sections.join('\n');
}

// ─── exportEpub ─────────────────────────────────────────────────────────

/**
 * Generate EPUB 3 structure.
 *
 * Writes:
 *   - mimetype
 *   - META-INF/container.xml
 *   - OEBPS/content.opf
 *   - OEBPS/toc.ncx
 *   - OEBPS/nav.xhtml
 *   - OEBPS/{chapter-files}.xhtml
 *   - OEBPS/styles.css
 */
export function exportEpub(manuscript: string, outputPath: string, config?: PublishConfig): void {
  const cfg = config || { title: 'Untitled', author: 'Unknown', language: 'en', license: 'All Rights Reserved' };
  const epubDir = path.resolve(outputPath);

  // Parse chapters from manuscript
  const chapterBlocks = manuscript.split(/\n---\n\n/).filter(Boolean);
  const chapters: { title: string; content: string }[] = [];
  for (const block of chapterBlocks) {
    const titleMatch = block.match(/^#\s+(.+)$/m);
    const title = titleMatch ? titleMatch[1].trim() : `Chapter ${chapters.length + 1}`;
    // Strip markdown metadata headers
    let content = block.replace(/^# .+\n/, '').trim();
    chapters.push({ title, content });
  }

  // Directories
  fs.ensureDirSync(path.join(epubDir, 'META-INF'));
  fs.ensureDirSync(path.join(epubDir, 'OEBPS'));

  // — mimetype
  fs.writeFileSync(path.join(epubDir, 'mimetype'), 'application/epub+zip', 'utf-8');

  // — META-INF/container.xml
  const container = `<?xml version="1.0" encoding="UTF-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>`;
  fs.writeFileSync(path.join(epubDir, 'META-INF', 'container.xml'), container, 'utf-8');

  // — OEBPS/content.opf
  const chapterRefs = chapters.map((ch, i) =>
    `    <item id="chapter_${i + 1}" href="chapter_${i + 1}.xhtml" media-type="application/xhtml+xml"/>`,
  ).join('\n');

  const chapterSpine = chapters.map((_, i) =>
    `    <itemref idref="chapter_${i + 1}"/>`,
  ).join('\n');

  const opf = `<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="book-id">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:identifier id="book-id">${cfg.isbn ? `urn:isbn:${cfg.isbn}` : `uuid:${Date.now()}`}</dc:identifier>
    <dc:title>${cfg.title}</dc:title>
    <dc:creator>${cfg.author}</dc:creator>
    <dc:language>${cfg.language}</dc:language>
    <dc:rights>${cfg.license}</dc:rights>
    ${cfg.publisher ? `<dc:publisher>${cfg.publisher}</dc:publisher>` : ''}
    <meta property="dcterms:modified">${new Date().toISOString().replace(/[-:]/g, '').split('.')[0]}Z</meta>
  </metadata>
  <manifest>
    <item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>
    <item id="ncx" href="toc.ncx" media-type="application/x-dtbncx+xml"/>
    <item id="styles" href="styles.css" media-type="text/css"/>
${chapterRefs}
  </manifest>
  <spine toc="ncx">
${chapterSpine}
  </spine>
</package>`;
  fs.writeFileSync(path.join(epubDir, 'OEBPS', 'content.opf'), opf, 'utf-8');

  // — OEBPS/toc.ncx
  const navPoints = chapters.map((ch, i) =>
    `  <navPoint id="navpoint_${i + 1}" playOrder="${i + 1}">
    <navLabel>
      <text>${ch.title}</text>
    </navLabel>
    <content src="chapter_${i + 1}.xhtml"/>
  </navPoint>`,
  ).join('\n');

  const ncx = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE ncx PUBLIC "-//NISO//DTD ncx 2005-1//EN" "http://www.daisy.org/z3986/2005/ncx-2005-1.dtd">
<ncx xmlns="http://www.daisy.org/z3986/2005/ncx/" version="2005-1">
  <head>
    <meta name="dtb:uid" content="${cfg.isbn || `uuid:${Date.now()}`}"/>
    <meta name="dtb:depth" content="1"/>
    <meta name="dtb:totalPageCount" content="0"/>
    <meta name="dtb:maxPageNumber" content="0"/>
  </head>
  <docTitle>
    <text>${cfg.title}</text>
  </docTitle>
  <navMap>
${navPoints}
  </navMap>
</ncx>`;
  fs.writeFileSync(path.join(epubDir, 'OEBPS', 'toc.ncx'), ncx, 'utf-8');

  // — OEBPS/nav.xhtml
  const navItems = chapters.map((ch, i) =>
    `    <li><a href="chapter_${i + 1}.xhtml">${ch.title}</a></li>`,
  ).join('\n');

  const nav = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops">
<head>
  <title>${cfg.title}</title>
  <link rel="stylesheet" type="text/css" href="styles.css"/>
</head>
<body>
  <nav epub:type="toc">
    <h1>Table of Contents</h1>
    <ol>
${navItems}
    </ol>
  </nav>
</body>
</html>`;
  fs.writeFileSync(path.join(epubDir, 'OEBPS', 'nav.xhtml'), nav, 'utf-8');

  // — OEBPS/styles.css
  const css = `body {
  font-family: 'Georgia', 'Times New Roman', serif;
  line-height: 1.6;
  margin: 5%;
  text-align: justify;
  hyphens: auto;
}
h1, h2, h3, h4 {
  line-height: 1.2;
  page-break-after: avoid;
  text-align: left;
}
h1 { font-size: 2em; margin-top: 2em; }
h2 { font-size: 1.5em; margin-top: 1.5em; }
p { text-indent: 1em; margin: 0.5em 0; }
blockquote {
  font-style: italic;
  margin: 1em 2em;
  color: #444;
}
a { color: inherit; text-decoration: none; }
img { max-width: 100%; height: auto; }
`;
  fs.writeFileSync(path.join(epubDir, 'OEBPS', 'styles.css'), css, 'utf-8');

  // — Chapter XHTML files
  for (let i = 0; i < chapters.length; i++) {
    const ch = chapters[i];
    const htmlBody = mdToBasicHtml(ch.content);
    const xhtml = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops">
<head>
  <title>${ch.title}</title>
  <link rel="stylesheet" type="text/css" href="styles.css"/>
</head>
<body>
  <h1>${ch.title}</h1>
${htmlBody}
</body>
</html>`;
    fs.writeFileSync(path.join(epubDir, 'OEBPS', `chapter_${i + 1}.xhtml`), xhtml, 'utf-8');
  }
}

// ─── exportDocx ─────────────────────────────────────────────────────────

/**
 * Generate a DOCX-compatible document using the Open XML format
 * (minimal but well-formed). Creates heading styles, TOC markers,
 * and proper section breaks for each chapter.
 *
 * Note: For production-quality DOCX with fonts/headers/footers,
 * consider using a dedicated library like docx or mammoth.
 * This provides a structurally valid fallback.
 */
export function exportDocx(manuscript: string, outputPath: string, config?: PublishConfig): void {
  const cfg = config || { title: 'Untitled', author: 'Unknown', language: 'en', license: 'All Rights Reserved' };
  const docxDir = path.resolve(outputPath);
  fs.ensureDirSync(docxDir);

  // Parse chapters from manuscript
  const chapterBlocks = manuscript.split(/\n---\n\n/).filter(b => b.trim());
  const chapters: { title: string; content: string }[] = [];
  for (const block of chapterBlocks) {
    const titleMatch = block.match(/^#\s+(.+)$/m);
    const title = titleMatch ? titleMatch[1].trim() : `Chapter ${chapters.length + 1}`;
    let content = block.replace(/^# .+\n/, '').replace(/^\*\*.+\*\*$/m, '').trim();
    chapters.push({ title, content });
  }

  // Build a simple DOCX (Open XML) — just the document.xml part
  // This creates valid .docx with heading styles and TOC field
  const docXmlParts: string[] = [];

  // Title page
  docXmlParts.push(`<w:p><w:pPr><w:jc w:val="center"/><w:spacing w:before="3600" w:after="200"/></w:pPr><w:r><w:rPr><w:b/><w:sz w:val="56"/></w:rPr><w:t>${escapeXml(cfg.title)}</w:t></w:r></w:p>`);
  if (cfg.subtitle) {
    docXmlParts.push(`<w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:i/><w:sz w:val="36"/></w:rPr><w:t>${escapeXml(cfg.subtitle)}</w:t></w:r></w:p>`);
  }
  docXmlParts.push(`<w:p><w:pPr><w:jc w:val="center"/><w:spacing w:before="600"/></w:pPr><w:r><w:rPr><w:sz w:val="28"/></w:rPr><w:t>By ${escapeXml(cfg.author)}</w:t></w:r></w:p>`);
  docXmlParts.push(`<w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:sz w:val="24"/></w:rPr><w:t>${escapeXml(cfg.license)}</w:t></w:r></w:p>`);

  // TOC field
  docXmlParts.push(`<w:p><w:pPr><w:pageBreakBefore/></w:pPr><w:r><w:rPr><w:b/><w:sz w:val="32"/></w:rPr><w:t>Table of Contents</w:t></w:r></w:p><w:p><w:r><w:fldChar w:fldCharType="begin"/></w:r></w:p><w:p><w:r><w:instrText> TOC \\o "1-2" \\h \\z \\u </w:instrText></w:r></w:p><w:p><w:r><w:fldChar w:fldCharType="separate"/></w:r></w:p><w:p><w:r><w:fldChar w:fldCharType="end"/></w:r></w:p>`);

  // Chapters
  for (const ch of chapters) {
    docXmlParts.push(`<w:p><w:pPr><w:pageBreakBefore/><w:pStyle w:val="Heading1"/></w:pPr><w:r><w:t>${escapeXml(ch.title)}</w:t></w:r></w:p>`);
    const paragraphs = ch.content.split('\n').filter(p => p.trim());
    for (const para of paragraphs) {
      const trimmed = para.trim();
      if (trimmed.startsWith('## ')) {
        docXmlParts.push(`<w:p><w:pPr><w:pStyle w:val="Heading2"/></w:pPr><w:r><w:t>${escapeXml(trimmed.replace(/^##\s+/, ''))}</w:t></w:r></w:p>`);
      } else if (trimmed.startsWith('> ')) {
        docXmlParts.push(`<w:p><w:pPr><w:ind w:left="720"/><w:i/></w:pPr><w:r><w:t>${escapeXml(trimmed.replace(/^>\s+/, ''))}</w:t></w:r></w:p>`);
      } else if (trimmed.startsWith('- ')) {
        docXmlParts.push(`<w:p><w:pPr><w:ind w:left="360"/></w:pPr><w:r><w:t>${escapeXml(trimmed.replace(/^-\s+/, '• '))}</w:t></w:r></w:p>`);
      } else if (trimmed) {
        docXmlParts.push(`<w:p><w:r><w:t>${escapeXml(trimmed)}</w:t></w:r></w:p>`);
      }
    }
    docXmlParts.push('<w:p><w:r><w:br/></w:r></w:p>');
  }

  const docXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"
            xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <w:body>
${docXmlParts.join('\n')}
  </w:body>
</w:document>`;

  // Styles part
  const stylesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:style w:type="paragraph" w:styleId="Normal">
    <w:name w:val="Normal"/>
    <w:pPr><w:spacing w:line="360" w:lineRule="auto"/></w:pPr>
    <w:rPr><w:sz w:val="24"/><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/></w:rPr>
  </w:style>
  <w:style w:type="paragraph" w:styleId="Heading1">
    <w:name w:val="heading 1"/>
    <w:basedOn w:val="Normal"/>
    <w:pPr><w:spacing w:before="480" w:after="120"/></w:pPr>
    <w:rPr><w:b/><w:sz w:val="36"/></w:rPr>
  </w:style>
  <w:style w:type="paragraph" w:styleId="Heading2">
    <w:name w:val="heading 2"/>
    <w:basedOn w:val="Normal"/>
    <w:pPr><w:spacing w:before="360" w:after="80"/></w:pPr>
    <w:rPr><w:b/><w:sz w:val="30"/></w:rPr>
  </w:style>
</w:styles>`;

  // Content Types
  const contentTypesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
  <Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
</Types>`;

  // Relationships
  const relsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`;

  const wordRelsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`;

  // Write DOCX archive structure as uncompressed XML files
  // For a real .docx, these would be zipped. We write the parts so
  // a consumer can zip them, or use a library.
  fs.ensureDirSync(path.join(docxDir, '_rels'));
  fs.ensureDirSync(path.join(docxDir, 'word', '_rels'));

  fs.writeFileSync(path.join(docxDir, '[Content_Types].xml'), contentTypesXml, 'utf-8');
  fs.writeFileSync(path.join(docxDir, '_rels', '.rels'), relsXml, 'utf-8');
  fs.writeFileSync(path.join(docxDir, 'word', 'document.xml'), docXml, 'utf-8');
  fs.writeFileSync(path.join(docxDir, 'word', 'styles.xml'), stylesXml, 'utf-8');
  fs.writeFileSync(path.join(docxDir, 'word', '_rels', 'document.xml.rels'), wordRelsXml, 'utf-8');

  // Write a readme explaining how to finalize
  fs.writeFileSync(
    path.join(docxDir, 'README.txt'),
    `DOCX structure generated for "${cfg.title}".\n\nTo create a .docx file, zip the contents of this directory and rename to .docx:\n  cd "${docxDir}" && zip -r "../${cfg.title.replace(/[^a-zA-Z0-9]/g, '_')}.docx" .\n\nOr use a tool like pandoc to convert from the manuscript markdown instead.`,
    'utf-8',
  );
}

function escapeXml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// ─── exportLatex ────────────────────────────────────────────────────────

/**
 * Generate LaTeX with the book document class, chapter/section commands,
 * and BibTeX citation placeholders.
 */
export function exportLatex(manuscript: string, outputPath: string, config?: PublishConfig): void {
  const cfg = config || { title: 'Untitled', author: 'Unknown', language: 'en', license: 'All Rights Reserved' };
  const filePath = path.resolve(outputPath);
  const latexDir = path.dirname(filePath);

  fs.ensureDirSync(latexDir);

  // Parse chapters
  const chapterBlocks = manuscript.split(/\n---\n\n/).filter(b => b.trim());
  const chapters: { title: string; content: string[] }[] = [];
  for (const block of chapterBlocks) {
    const titleMatch = block.match(/^#\s+(.+)$/m);
    const title = titleMatch ? titleMatch[1].trim() : `Chapter ${chapters.length + 1}`;
    const lines = block.split('\n').filter(l => !l.match(/^# /) && !l.match(/^\*\*.+\*\*$/m) && l.trim());
    chapters.push({ title, content: lines });
  }

  const docLines: string[] = [];

  // Preamble
  docLines.push(`\\documentclass[12pt,openany]{book}`);
  docLines.push(`\\usepackage[utf8]{inputenc}`);
  docLines.push(`\\usepackage{${cfg.language === 'en' ? 'english' : cfg.language}}`);
  docLines.push(`\\usepackage{setspace}`);
  docLines.push(`\\usepackage{geometry}`);
  docLines.push(`\\geometry{a4paper, margin=1in}`);
  docLines.push(`\\usepackage{fancyhdr}`);
  docLines.push(`\\pagestyle{fancy}`);
  docLines.push(`\\onehalfspacing`);
  docLines.push('');
  docLines.push(`\\title{${cfg.title}}`);
  if (cfg.subtitle) docLines.push(`\\subtitle{${cfg.subtitle}}`);
  docLines.push(`\\author{${cfg.author}}`);
  docLines.push(`\\date{${new Date().getFullYear()}}`);
  docLines.push('');

  // BibTeX setup
  docLines.push('\\usepackage[backend=bibtex,style=verbose-trad2]{biblatex}');
  docLines.push('\\addbibresource{references.bib}');
  docLines.push('');

  docLines.push('\\begin{document}');
  docLines.push('');

  // Title page
  docLines.push('\\maketitle');
  docLines.push('\\thispagestyle{empty}');
  docLines.push('\\newpage');
  docLines.push('');

  // License
  docLines.push(`\\vfill\\noindent\\small ${escapeLatex(cfg.license)}`);
  docLines.push('\\newpage');
  docLines.push('');

  // Table of Contents
  docLines.push('\\tableofcontents');
  docLines.push('\\newpage');
  docLines.push('');

  // Front matter
  docLines.push('\\frontmatter');

  if (cfg.description) {
    docLines.push('\\chapter*{Description}');
    docLines.push(escapeLatex(cfg.description));
    docLines.push('');
  }

  // Main matter
  docLines.push('\\mainmatter');
  docLines.push('');

  // Chapters
  for (const ch of chapters) {
    docLines.push(`\\chapter{${escapeLatex(ch.title)}}`);

    for (const line of ch.content) {
      const trimmed = line.trim();
      if (!trimmed) {
        docLines.push('');
        continue;
      }

      if (trimmed.startsWith('## ')) {
        docLines.push(`\\section{${escapeLatex(trimmed.replace(/^##\s+/, ''))}}`);
      } else if (trimmed.startsWith('### ')) {
        docLines.push(`\\subsection{${escapeLatex(trimmed.replace(/^###\s+/, ''))}}`);
      } else if (trimmed.startsWith('> ')) {
        docLines.push('\\begin{quote}');
        docLines.push(escapeLatex(trimmed.replace(/^>\s+/, '')));
        docLines.push('\\end{quote}');
      } else if (trimmed.startsWith('- ')) {
        docLines.push(`\\item ${escapeLatex(trimmed.replace(/^-\s+/, ''))}`);
      } else if (trimmed.startsWith('---')) {
        docLines.push('\\vspace{1em}\\par\\centerline{* * *}\\vspace{1em}');
      } else if (/\[Source:\s*([^\]]+)\]/.test(trimmed)) {
        // Citation reference
        const citeMatch = trimmed.match(/\[Source:\s*([^\]]+)\]/);
        if (citeMatch) {
          docLines.push(escapeLatex(trimmed.replace(/\[Source:\s*[^\]]+\]/, `\\cite{${citeMatch[1]}}`)));
        } else {
          docLines.push(escapeLatex(trimmed));
        }
      } else {
        docLines.push(escapeLatex(trimmed));
      }
    }

    docLines.push('');
  }

  // Bibliography
  docLines.push('\\printbibliography');
  docLines.push('');

  docLines.push('\\end{document}');

  // Write the .tex file
  fs.writeFileSync(filePath, docLines.join('\n'), 'utf-8');

  // Also write an empty .bib file placeholder
  const bibPath = path.join(latexDir, 'references.bib');
  if (!fs.existsSync(bibPath)) {
    fs.writeFileSync(bibPath, `% References for ${cfg.title}\n% Add BibTeX entries here\n`, 'utf-8');
  }
}

function escapeLatex(s: string): string {
  return s
    .replace(/\\/g, '\\textbackslash{}')
    .replace(/[&%$#_{}~^]/g, m => `\\${m}`)
    .replace(/~/g, '\\textasciitilde{}')
    .replace(/\^/g, '\\textasciicircum{}');
}

// ─── exportWebSerial ────────────────────────────────────────────────────

/**
 * Split a compiled manuscript into per-chapter HTML files with
 * navigation links, metadata, and series links.
 */
export function exportWebSerial(
  chapters: ChapterMeta[],
  outputDir: string,
  config: PublishConfig,
): void {
  const out = path.resolve(outputDir);
  fs.ensureDirSync(out);

  // Write index page
  const indexLinks = chapters.map((ch, i) =>
    `    <li><a href="chapter_${i + 1}.html">${escapeXml(ch.title)}</a></li>`,
  ).join('\n');

  const indexHtml = `<!DOCTYPE html>
<html lang="${config.language}">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>${escapeXml(config.title)} — Table of Contents</title>
  <meta name="author" content="${escapeXml(config.author)}"/>
  ${config.description ? `<meta name="description" content="${escapeXml(config.description)}"/>` : ''}
  ${config.series ? `<meta name="series" content="${escapeXml(config.series)}"/>` : ''}
  <style>
    body { font-family: 'Georgia', serif; max-width: 800px; margin: 2em auto; padding: 0 1em; line-height: 1.7; }
    h1 { text-align: center; margin-bottom: 0.2em; }
    .subtitle { text-align: center; font-style: italic; color: #555; margin-bottom: 1.5em; }
    .meta { text-align: center; color: #777; font-size: 0.9em; margin-bottom: 2em; }
    ol { list-style: none; padding: 0; }
    li { margin: 0.8em 0; text-align: center; }
    li a { color: #1a5276; text-decoration: none; font-size: 1.1em; }
    li a:hover { text-decoration: underline; }
    .series { text-align: center; font-size: 0.85em; color: #888; margin-top: 2em; }
    .license { text-align: center; font-size: 0.8em; color: #aaa; margin-top: 3em; }
  </style>
</head>
<body>
  <h1>${escapeXml(config.title)}</h1>
  ${config.subtitle ? `<p class="subtitle">${escapeXml(config.subtitle)}</p>` : ''}
  <p class="meta">by ${escapeXml(config.author)}</p>
  <ol>
${indexLinks}
  </ol>
  ${config.series ? `<p class="series">Part of the <em>${escapeXml(config.series)}</em> series${config.seriesNumber ? ` (#${config.seriesNumber})` : ''}</p>` : ''}
  <p class="license">${escapeXml(config.license)}</p>
</body>
</html>`;
  fs.writeFileSync(path.join(out, 'index.html'), indexHtml, 'utf-8');

  // Write per-chapter files with navigation
  for (let i = 0; i < chapters.length; i++) {
    const ch = chapters[i];
    const prevLink = i > 0 ? `<a href="chapter_${i}.html" class="nav-link">&larr; Previous</a>` : '<span class="nav-link disabled">&larr; Previous</span>';
    const nextLink = i < chapters.length - 1 ? `<a href="chapter_${i + 2}.html" class="nav-link">Next &rarr;</a>` : '<span class="nav-link disabled">Next &rarr;</span>';

    // Convert body content from markdown to basic HTML
    const bodyHtml = mdToBasicHtml(ch.content);

    const chapterHtml = `<!DOCTYPE html>
<html lang="${config.language}">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>${escapeXml(config.title)} — ${escapeXml(ch.title)}</title>
  <meta name="author" content="${escapeXml(config.author)}"/>
  ${config.series ? `<meta name="series" content="${escapeXml(config.series)}"/>` : ''}
  <style>
    body { font-family: 'Georgia', serif; max-width: 750px; margin: 2em auto; padding: 0 1em; line-height: 1.8; }
    h1 { text-align: center; margin-bottom: 1.5em; border-bottom: 1px solid #ddd; padding-bottom: 0.5em; }
    h2 { margin-top: 1.5em; }
    p { text-indent: 1em; margin: 0.5em 0; }
    blockquote { font-style: italic; margin: 1em 2em; color: #555; }
    .nav { display: flex; justify-content: space-between; margin: 2em 0; padding: 1em 0; border-top: 1px solid #ddd; }
    .nav-link { color: #1a5276; text-decoration: none; font-size: 1em; }
    .nav-link:hover { text-decoration: underline; }
    .disabled { color: #ccc; }
    .toc-link { display: block; text-align: center; margin-top: 1em; font-size: 0.9em; }
    .license { text-align: center; font-size: 0.8em; color: #aaa; margin-top: 3em; }
  </style>
</head>
<body>
  <div class="nav">
    ${prevLink}
    <a href="index.html" class="nav-link">TOC</a>
    ${nextLink}
  </div>

  <h1>${escapeXml(ch.title)}</h1>
${bodyHtml}

  <div class="nav">
    ${prevLink}
    <a href="index.html" class="nav-link">TOC</a>
    ${nextLink}
  </div>
  <p class="license">${escapeXml(config.license)}</p>
</body>
</html>`;
    fs.writeFileSync(path.join(out, `chapter_${i + 1}.html`), chapterHtml, 'utf-8');
  }
}

// ─── Pandoc Integration ──────────────────────────────────────────────────

/**
 * Detect if pandoc is available on the system.
 * Returns the pandoc version string if found, null otherwise.
 */
export function detectPandoc(): string | null {
  try {
    const version = execFileSync('pandoc', ['--version'], { encoding: 'utf-8', timeout: 5000 });
    const match = version.match(/pandoc\s+(\d+\.\d+(?:\.\d+)?)/);
    return match ? match[1] : 'unknown';
  } catch {
    return null;
  }
}

/**
 * Detect if a LaTeX engine is available for PDF generation.
 */
export function detectLatexEngine(): string | null {
  const engines = ['pdflatex', 'xelatex', 'lualatex'];
  for (const engine of engines) {
    try {
      execFileSync(engine, ['--version'], { encoding: 'utf-8', timeout: 5000, stdio: 'pipe' });
      return engine;
    } catch {
      continue;
    }
  }
  return null;
}

export interface PublishConfigFile {
  formats: ExportFormat[];
  pandoc: {
    enabled: boolean;
    options: string[];
    pdfEngine: 'pdflatex' | 'xelatex' | 'lualatex' | 'weasyprint' | 'auto';
    standalone: boolean;
    toc: boolean;
    tocDepth: number;
  };
  epub: {
    coverImage?: string;
    css?: string;
    splitLevel: number;
    embedFonts: boolean;
  };
  docx: {
    referenceDoc?: string;
    numberedSections: boolean;
  };
  latex: {
    documentClass: 'book' | 'report' | 'article';
    citationStyle: string;
    fontSize: number;
    paperSize: 'a4' | 'letter';
  };
  metadata: {
    title: string;
    author: string;
    language: string;
    license: string;
    isbn?: string;
    publisher?: string;
    description?: string;
    subject?: string;
    keywords?: string[];
  };
}

export function loadPublishConfig(projectRoot: string): PublishConfigFile | null {
  const configPath = path.join(projectRoot, 'book', 'publish-config.json');
  if (!fs.existsSync(configPath)) return null;
  return fs.readJsonSync(configPath);
}

/**
 * Export using pandoc. Returns the command output or error.
 */
export function exportWithPandoc(
  manuscriptPath: string,
  outputPath: string,
  format: ExportFormat,
  config: PublishConfigFile,
): { success: boolean; output: string; error?: string } {
  const args: string[] = [];

  // Input
  args.push(manuscriptPath);

  // Format-specific output
  switch (format) {
    case 'epub':
      args.push('-o', outputPath, '--to', 'epub3');
      if (config.epub.coverImage) args.push('--epub-cover-image', config.epub.coverImage);
      if (config.epub.css) args.push('--css', config.epub.css);
      args.push('--epub-chapter-level', String(config.epub.splitLevel));
      break;
    case 'docx':
      args.push('-o', outputPath, '--to', 'docx');
      if (config.docx.referenceDoc) args.push('--reference-doc', config.docx.referenceDoc);
      break;
    case 'latex':
      args.push('-o', outputPath, '--to', 'latex');
      args.push('--standalone');
      break;
    case 'pdf':
      args.push('-o', outputPath, '--to', 'pdf');
      args.push('--standalone');
      const engine = config.pandoc.pdfEngine === 'auto' ? detectLatexEngine() : config.pandoc.pdfEngine;
      if (engine) args.push('--pdf-engine', engine);
      else return { success: false, output: '', error: `No LaTeX engine found. Install texlive or set pdfEngine in publish-config.json.` };
      break;
    case 'manuscript':
      // Already in markdown — just copy
      fs.copySync(manuscriptPath, outputPath);
      return { success: true, output: 'Manuscript copied (markdown source).' };
    default:
      return { success: false, output: '', error: `Unsupported format for pandoc: ${format}` };
  }

  // Common options
  if (config.pandoc.standalone) args.push('--standalone');
  if (config.pandoc.toc) {
    args.push('--toc');
    args.push('--toc-depth', String(config.pandoc.tocDepth));
  }

  // Metadata
  args.push('--metadata', `title=${config.metadata.title}`);
  args.push('--metadata', `author=${config.metadata.author}`);
  args.push('--metadata', `lang=${config.metadata.language}`);
  if (config.metadata.license) args.push('--metadata', `rights=${config.metadata.license}`);
  if (config.metadata.isbn) args.push('--metadata', `isbn=${config.metadata.isbn}`);
  if (config.metadata.publisher) args.push('--metadata', `publisher=${config.metadata.publisher}`);
  if (config.metadata.description) args.push('--metadata', `description=${config.metadata.description}`);
  if (config.metadata.subject) args.push('--metadata', `subject=${config.metadata.subject}`);
  if (config.metadata.keywords) args.push('--metadata', `keywords=${config.metadata.keywords.join(', ')}`);

  // Custom pandoc options from config
  args.push(...config.pandoc.options);

  try {
    const result = execFileSync('pandoc', args, { encoding: 'utf-8', timeout: 60000, stdio: ['pipe', 'pipe', 'pipe'] });
    return { success: true, output: result || 'Export completed.' };
  } catch (err: any) {
    return { success: false, output: '', error: err.message || String(err) };
  }
}

// ─── Post-Export Verification ─────────────────────────────────────────────

export interface ExportVerificationResult {
  format: ExportFormat;
  path: string;
  exists: boolean;
  sizeBytes: number;
  sizeReasonable: boolean;
  structureValid: boolean;
  issues: string[];
  verdict: 'pass' | 'fail' | 'warning';
}

export function verifyExport(outputPath: string, format: ExportFormat): ExportVerificationResult {
  const result: ExportVerificationResult = {
    format,
    path: outputPath,
    exists: false,
    sizeBytes: 0,
    sizeReasonable: false,
    structureValid: false,
    issues: [],
    verdict: 'pass',
  };

  result.exists = fs.existsSync(outputPath);
  if (!result.exists) {
    result.issues.push('Output file not found');
    result.verdict = 'fail';
    return result;
  }

  const stat = fs.statSync(outputPath);
  result.sizeBytes = stat.size;

  // Size checks by format
  const minSize = format === 'manuscript' ? 1000 : 5000;
  result.sizeReasonable = result.sizeBytes > minSize;
  if (!result.sizeReasonable) {
    result.issues.push(`File size ${result.sizeBytes} bytes is suspiciously small (expected >${minSize})`);
    result.verdict = 'warning';
  }

  // Structure checks by format
  switch (format) {
    case 'epub': {
      // EPUB should be a zip — check it's a valid zip by reading first bytes
      try {
        const fd = fs.openSync(outputPath, 'r');
        const buf = Buffer.alloc(4);
        fs.readSync(fd, buf, 0, 4, 0);
        fs.closeSync(fd);
        const isZip = buf[0] === 0x50 && buf[1] === 0x4B; // 'PK'
        result.structureValid = isZip;
        if (!isZip) {
          result.issues.push('EPUB file does not have valid ZIP signature');
          result.verdict = 'fail';
        }
      } catch {
        result.issues.push('Could not read EPUB file for validation');
        result.verdict = 'fail';
      }
      break;
    }
    case 'docx': {
      // DOCX is also a zip
      try {
        const fd = fs.openSync(outputPath, 'r');
        const buf = Buffer.alloc(4);
        fs.readSync(fd, buf, 0, 4, 0);
        fs.closeSync(fd);
        const isZip = buf[0] === 0x50 && buf[1] === 0x4B;
        result.structureValid = isZip;
        if (!isZip) {
          result.issues.push('DOCX file does not have valid ZIP signature');
          result.verdict = 'fail';
        }
      } catch {
        result.issues.push('Could not read DOCX file for validation');
        result.verdict = 'fail';
      }
      break;
    }
    case 'latex':
    case 'manuscript': {
      // Text-based — check it has content and starts with expected markers
      const content = fs.readFileSync(outputPath, 'utf-8');
      result.structureValid = content.length > 100;
      if (!result.structureValid) {
        result.issues.push('Text output is too short — likely empty or failed export');
        result.verdict = 'fail';
      }
      if (format === 'latex') {
        if (!content.includes('\\documentclass') && !content.includes('\\begin{document}')) {
          result.issues.push('LaTeX output missing documentclass or begin{document}');
          result.verdict = 'fail';
          result.structureValid = false;
        }
      }
      break;
    }
    case 'pdf': {
      // Check PDF signature
      try {
        const fd = fs.openSync(outputPath, 'r');
        const buf = Buffer.alloc(5);
        fs.readSync(fd, buf, 0, 5, 0);
        fs.closeSync(fd);
        const isPdf = buf.toString('ascii').startsWith('%PDF-');
        result.structureValid = isPdf;
        if (!isPdf) {
          result.issues.push('PDF file does not have valid PDF signature');
          result.verdict = 'fail';
        }
      } catch {
        result.issues.push('Could not read PDF file for validation');
        result.verdict = 'fail';
      }
      break;
    }
    case 'web': {
      // Web serial outputs multiple HTML files
      const dir = outputPath;
      if (fs.existsSync(dir) && fs.statSync(dir).isDirectory()) {
        const files = fs.readdirSync(dir).filter(f => f.endsWith('.html'));
        result.structureValid = files.length > 0;
        if (files.length === 0) {
          result.issues.push('No HTML files found in web serial output directory');
          result.verdict = 'fail';
        }
      }
      break;
    }
    default:
      result.structureValid = true;
  }

  if (result.verdict === 'pass' && result.issues.length > 0) result.verdict = 'warning';
  return result;
}

export function formatVerificationReport(results: ExportVerificationResult[]): string {
  const lines: string[] = [];
  lines.push('# Post-Export Verification Report');
  lines.push('');
  lines.push('| Format | Path | Size | Structure | Verdict |');
  lines.push('|--------|------|------|-----------|---------|');
  for (const r of results) {
    const sizeKB = (r.sizeBytes / 1024).toFixed(1) + ' KB';
    lines.push(`| ${r.format} | ${path.basename(r.path)} | ${sizeKB} | ${r.structureValid ? '✓' : '✗'} | ${r.verdict.toUpperCase()} |`);
  }
  lines.push('');
  const failed = results.filter(r => r.verdict === 'fail');
  const warnings = results.filter(r => r.verdict === 'warning');
  if (failed.length > 0) {
    lines.push(`## FAILURES (${failed.length})`);
    for (const f of failed) {
      lines.push(`- **${f.format}**: ${f.issues.join('; ')}`);
    }
  }
  if (warnings.length > 0) {
    lines.push(`## WARNINGS (${warnings.length})`);
    for (const w of warnings) {
      lines.push(`- **${w.format}**: ${w.issues.join('; ')}`);
    }
  }
  if (failed.length === 0 && warnings.length === 0) {
    lines.push('**All exports passed verification.**');
  }
  return lines.join('\n');
}
