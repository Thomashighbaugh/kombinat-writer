---
name: citation-validator
description: "Validates citation format and cross-references across non-fiction and mixed-track projects. Checks that all [Source: key] markers resolve to source notes and are formatted correctly."
---

# Citation Validator

For non-fiction and mixed-track projects, every factual assertion must be traceable to a source note via citation markers. This skill validates that the citation system is complete and correct.

## Validation Checklist

### 1. All Keys Resolve
Every `[Source: key]` marker in the draft must correspond to a source note in the project's source registry. **Scan**: extract all markers via regex `\[Source:\s*([^\]]+)\]`, then verify each `key` exists in the source notes index. Orphan markers are errors.

### 2. Format Consistency
Markers must match the citation style declared in the constitution (Chicago author-date, MLA, APA, or custom `[Source: key]` convention). **Scan**: check for mixed styles — e.g., a Chicago footnoted project should not contain inline `[Source: key]` markers unless explicitly permitted.

### 3. No Dangling `[CitationNeeded]`
Placeholder markers inserted during drafting as reminders. **Scan**: locate every `[CitationNeeded]` or `[citation needed]` instance. Each must be resolved to a real citation before the draft is considered complete. Zero tolerance.

### 4. Bibliography Completeness
Every source cited in the text must appear in the bibliography or source notes appendix. **Scan**: extract all cited keys from the draft, then check each against the bibliography entries. Missing entries must be added.

## Automated Scan Procedure

```
1. Extract all [Source: key] markers → list A
2. Extract bibliography keys → list B
3. Diff A - B → orphan markers (errors)
4. Diff B - A → unused sources (warnings, may be intentional)
5. Search for /\[CitationNeeded\]/i → unresolved placeholders (blocking)
6. Check style registry in constitution → ensure single style throughout
```

## Common Citation Errors

| Error | Detection | Fix |
|-------|-----------|-----|
| Typo in key (e.g., `[Source: Smtih2023]`) | Key does not resolve | Correct the key |
| Stale placeholder left behind | `[CitationNeeded]` present | Find source or remove claim |
| Mixed citation styles | Inline markers + footnotes in same chapter | Normalise to constitution style |
| Source key in draft but missing from bibliography | Key resolves but no bib entry | Add entry |
| Bibliography entry never cited | Entry present but no draft marker | Either cite it or remove entry |

## Style-Specific Rules

- **Chicago (Notes-Biblio)**: Use `[Source: key]` inline as drafting markers; convert to footnote markers before final output.
- **APA / MLA**: Inline `[Source: key]` markers become parenthetical citations at final stage; verify author-date alignment.
- **Custom `[Source: key]` convention**: The key format must match exactly between draft marker and source note — case-sensitive, hyphen-sensitive.
