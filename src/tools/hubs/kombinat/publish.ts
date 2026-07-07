import { HubSubcommandSpec } from "../../hub-data.js"

const spec: HubSubcommandSpec = {
  label: "publish",
  description: "Export to publication-ready formats via pandoc (preferred) or built-in generators (fallback): EPUB 3, DOCX, LaTeX, PDF, Markdown, Web Serial. Post-export verification validates all outputs.",
  reminder: "Phase 12: Export to publication-ready formats with pandoc integration",
  phases: "12",
  detailedDescription: `# User Input: {userInput}

## Objective

Compile the completed, reviewed manuscript into one or more output formats suitable for publication, submission, or distribution. Uses pandoc when available for production-quality output. Falls back to built-in manual generators with a warning if pandoc is not installed. All outputs are verified after export.

## Prerequisites

- All chapters written and marked \`[ED]\` or \`[X]\` in task tracking
- Review passed (Final mode) or user confirms readiness
- Metadata recorded (see \`/kombinat meta\`)

## Execution Steps

### 1. Verify Readiness

Check the Final Readiness Checklist (see \`/kombinat review\`). If any items are unresolved, warn the user and list them. Do not block — the user may want to export a draft for review.

### 2. Detect Pandoc

Run pandoc detection:
- If pandoc is available: use pandoc for all formats (production quality)
- If pandoc is not available: use built-in manual generators (fallback)
- Report: "Pandoc [version] detected — using pandoc for export." OR "Pandoc not found — using built-in generators (lower quality). Install pandoc for production-grade export."

For PDF export specifically:
- Check for LaTeX engine (pdflatex, xelatex, lualatex)
- If no LaTeX engine: PDF export unavailable — warn the user
- Alternative: suggest \`weasyprint\` as a non-LaTeX PDF engine

### 3. Load Publish Config

Read \`./book/publish-config.json\` if it exists. This file contains:
- Format preferences (which formats to export)
- Pandoc options (standalone, TOC depth, custom options)
- EPUB settings (cover image, CSS, split level)
- DOCX settings (reference doc, numbered sections)
- LaTeX settings (document class, citation style, font size)
- Metadata overrides

If \`publish-config.json\` does not exist, use defaults:
- Export all formats
- Pandoc standalone with TOC (depth 2)
- No cover image, no custom CSS
- Book document class for LaTeX
- Citation style from \`./book/meta.json\`

### 4. Compile Manuscript

Merge all chapter files into a single manuscript document:
1. Title page (from \`./book/meta.json\` or publish-config)
2. Front matter (foreword, preface, epigraph — if any exist in \`./book/content/\`)
3. Body chapters in sequence
4. Back matter (appendices, glossary, bibliography, index — if any)

Resolve chapter numbering, ensure sequential ordering, and strip working notes (everything after \`---\` in each chapter file).

Save compiled manuscript to \`output/manuscript/manuscript.md\`.

### 5. Export Formats

| Format | Output Path | Pandoc Method | Fallback Method |
|--------|-------------|---------------|------------------|
| Manuscript (Markdown) | \`output/manuscript/manuscript.md\` | Direct copy | Direct copy |
| EPUB | \`output/epub/book.epub\` | \`pandoc --to epub3\` | Built-in EPUB generator |
| DOCX | \`output/docx/book.docx\` | \`pandoc --to docx\` | Built-in DOCX generator (uncompressed — needs zipping) |
| LaTeX | \`output/latex/book.tex\` | \`pandoc --to latex --standalone\` | Built-in LaTeX generator |
| PDF | \`output/pdf/book.pdf\` | \`pandoc --to pdf --pdf-engine=xelatex\` | NOT AVAILABLE without pandoc+LaTeX |
| Web Serial | \`output/web/\` | N/A (manual split) | Built-in web serial generator |

**Pandoc export flow:**
1. Construct pandoc command with format-specific flags
2. Add metadata flags from publish-config (title, author, language, etc.)
3. Add TOC flags if enabled
4. Execute pandoc
5. Capture output and errors
6. If pandoc fails: fall back to manual generator for that format with warning

**Fallback export flow:**
1. Use built-in generators in \`src/lib/publish-export.ts\`
2. Export to same output paths
3. Note in verification report that fallback was used

### 6. Post-Export Verification (HARD BLOCK on failures)

After each export, verify the output:

**Verification checks by format:**

| Format | Checks |
|--------|--------|
| EPUB | File exists, ZIP signature valid, size > 5KB |
| DOCX | File exists, ZIP signature valid, size > 5KB |
| LaTeX | File exists, contains \`\\documentclass\` and \`\\begin{document}\`, size > 1KB |
| PDF | File exists, PDF signature (%PDF-), size > 10KB |
| Manuscript | File exists, content > 1KB |
| Web Serial | Directory exists, at least 1 HTML file present |

**Verification report:**

\`\`\`markdown
## Post-Export Verification Report

| Format | Path | Size | Structure | Verdict |
|--------|------|------|-----------|---------|
| EPUB | output/epub/book.epub | 245 KB | ✓ ZIP signature | PASS |
| DOCX | output/docx/book.docx | 189 KB | ✓ ZIP signature | PASS |
| LaTeX | output/latex/book.tex | 34 KB | ✓ documentclass | PASS |
| PDF | output/pdf/book.pdf | 412 KB | ✓ PDF signature | PASS |

**All exports passed verification.**

OR

## FAILURES (1)
- **DOCX**: File size 240 bytes is suspiciously small — export may have failed. Re-run with \`/kombinat publish docx\`.
\`\`\`

**If any export FAILS verification: report the failure, do not mark publication as complete. Suggest re-running the specific format export.**

### 7. Format-Specific Notes

**EPUB:**
- If cover image specified in publish-config, verify the image file exists
- If custom CSS specified, verify it exists
- Pandoc handles EPUB structure (OPF, NCX, XHTML, CSS) automatically

**DOCX:**
- If reference doc specified, verify it exists
- Pandoc produces a ready-to-open .docx file
- Fallback generator produces uncompressed XML parts — user must zip them manually

**LaTeX:**
- Pandoc produces a standalone .tex file with preamble
- Fallback generator also produces a standalone .tex file
- For PDF generation, pandoc requires a LaTeX engine

**PDF:**
- Pandoc + LaTeX engine required — no fallback available
- If no LaTeX engine, suggest installing texlive or using weasyprint

**Web Serial:**
- Always uses built-in generator (pandoc does not split into per-chapter files)
- Produces index.html + chapter_N.html with navigation

### 8. Update Metadata

Update \`./book/meta.json\` with:
- Publication date
- Final word count
- Version number
- Format availability (which formats were successfully exported)

### 9. Next Steps

"Manuscript exported to [formats]. Verification: [all passed / N failures]. Files in \`output/\`. Next: upload to distributor, submit to publisher, or begin series planning."

## Supplement Skills

| Skill | File | Purpose |
|-------|------|---------|
| \`publish-export\` | \`src/lib/publish-export.ts\` | Export engine (pandoc + fallback + verification) |`,
  tools: ["bash"],
  relatedSkills: ["style-enforcer", "consistency-checker", "citation-validator"],
  examples: [
    { input: "/kombinat publish epub", approach: "Exports manuscript to EPUB via pandoc with post-export verification" },
    { input: "/kombinat publish all", approach: "Exports to all formats (manuscript, EPUB, DOCX, LaTeX, PDF, web) with verification" },
    { input: "/kombinat publish pdf", approach: "Exports to PDF via pandoc + LaTeX engine — requires pandoc and texlive" }
  ],
  warnings: ["Post-export verification is a HARD BLOCK — if an export fails verification, do not mark publication as complete", "PDF export requires pandoc AND a LaTeX engine (pdflatex/xelatex/lualatex) — no fallback available", "Without pandoc, DOCX fallback produces uncompressed XML — user must zip manually", "publish-config.json is optional — defaults are used if not present"]
}

export default spec