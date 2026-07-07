---
name: fact-checker
description: "Flags factual claims for verification in non-fiction and mixed-track projects. Identifies claims that need sourcing, cross-references against source notes, and flags unsupported assertions."
---

# Fact Checker

For non-fiction and mixed-track projects, every factual claim must be verifiable against source material. This skill identifies unsupported assertions and validates sourced claims.

## Claim Types

| Type | Examples | Verification Method |
|------|----------|-------------------|
| **Statistical** | Percentages, counts, rates, demographic figures | Compare against source note; flag if figure differs by >1% |
| **Historical** | Dates, event sequences, treaty terms, biographical details | Cross-reference with at least 2 independent sources |
| **Technical** | Mechanism descriptions, process steps, scientific principles | Verify against primary technical source; flag layperson oversimplification |
| **Geographical** | Distances, locations, borders, climate data | Check against authoritative map or gazetteer source |
| **Biographical** | Life events, quotes, affiliations, dates | Each biographical claim requires a dedicated source note |

## Verification Methodology

1. **Extract claims**: parse the draft sentence-by-sentence. A single sentence may contain multiple claims (e.g., "In 1847, 3,000 Irish immigrants arrived at Montreal's Griffin Road terminal" contains date, count, ethnic group, location — four separate claims).
2. **Locate source note**: for each claim, find the corresponding `[Source: key]` marker and read the source note.
3. **Assertion match**: determine whether the draft claim faithfully represents the source note content. Flag if the draft overstates, understates, or distorts the source.
4. **No source found**: if a factual claim lacks a `[Source: key]` marker, flag as **unsupported assertion**.

## Source Reliability Tiers

| Tier | Definition | Weight |
|------|------------|--------|
| **Primary** | Original documents, raw data, direct testimony | Highest; override all others |
| **Academic** | Peer-reviewed secondary sources | Strong; note any consensus disagreement |
| **Journalistic** | Reputable reporting with named sources | Moderate; flag if claim is contested |
| **Anecdotal** | Memoir, interview, personal account | Acceptable for biographical claims only |
| **Unverifiable** | No traceable origin | Do not use; require replacement |

## Handling Conflicting Sources

When two sourced notes disagree on the same claim:
1. Default to the higher-tier source.
2. If same tier, prefer the more recent publication.
3. If still unresolved, present both positions in the text with attribution ("Some sources state X; others state Y").
4. Log the conflict in tracking data for author resolution.

## Documentation Standards

Every verified claim must be recorded with:
- Claim text as it appears in the draft
- Source note key and excerpt
- Verification result (confirmed / confirmed-with-minor-correction / disputed / rejected)
- Verifier name and date
