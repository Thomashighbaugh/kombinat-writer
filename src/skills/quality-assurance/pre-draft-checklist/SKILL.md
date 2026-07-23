---
name: pre-draft-checklist
description: "Enforces the 13-item pre-draft checklist — ensures manifest, specification, outline, knowledge, tracking, previous chapter, and research context are loaded before every draft session."
---

# Pre-Draft Checklist

Every draft session **must** begin by loading all 13 context items below. Skipping any item produces blind spots that compound across sessions.

## Mandatory Items

### 1. Manifest
The `.opencode/context/manifest.md` file defining voice, register, POV, tense, world rules, and quality bars. **Without it**, the assistant cannot distinguish intentional style from error.

### 2. Track Metadata
Track identifier (fiction/non-fiction/hybrid/rewrite), word-count targets, and section boundaries. **Without it**, output cannot be validated against the project's structural requirements.

### 3. Specification / Outline
The per-chapter or per-section specification that defines what this segment must accomplish. **Without it**, drafting becomes directionless and scenes drift off-purpose.

### 4. Knowledge Files
All `.opencode/context/knowledge/` entries — character profiles, setting lorebooks, timeline references, technical research. **Without it**, characters act out-of-character and world rules break.

### 5. Tracking Data
`tracks/` metadata — chapter status, word count progress, revision cycle, completion percentage. **Without it**, the assistant cannot report accurate progress or detect stalls.

### 6. Previous Chapter (Full Text)
The complete preceding chapter for continuity. **Without it**, timeline gaps, character-state mismatches, and tonal discontinuities are guaranteed.

### 7. Research Sources
All source material referenced by the current section — notes, articles, interview transcripts. **Without it**, factual claims are invented rather than drawn from source material.

### 8. Revision Notes
The `.opencode/context/revisions/` file for the current chapter — editorial feedback, self-notes, critique outcomes. **Without it**, known issues are reintroduced.

### 9. Draft Material (If Continuing)
In-progress draft content being extended. **Without it**, the assistant produces disjointed prose that must be manually spliced.

### 10. Task Status
Active TODO list and milestone tracking. **Without it**, effort is misallocated and deadlines slip unnoticed.

### 11. Critique Feedback
Action items from the most recent critique pass. **Without it**, structural issues flagged by QA persist into the next draft.

### 12. Full Chapter (If Rewrite)
The entire chapter being rewritten, plus the rewrite specification explaining why. **Without it**, the rewrite removes what worked while failing to fix what did not.

### 13. Session Goal
A one-sentence goal for this session (e.g., "Complete section 4.2 with 800 words establishing the antagonist's motivation"). **Without it**, the session lacks a completion criterion.

### 14. Awareness Map (Auto-Loaded)
The chapter's outline slice — scene beats, payoff-from chains, sets-up obligations, continuity anchors, and adjacent chapter summaries. Loaded automatically from the fine-grained outline. **Without it**, the draft cannot satisfy setup/payoff obligations or maintain continuity. The post-draft gate verifies the `<awareness-map>` block was honored.

## Enforcement

Reject any draft request that omits items 1-6. Flag warnings for items 7-13. Item 14 (awareness map) is auto-loaded from the outline — if the outline lacks fine-grained scene beats, the outline gate blocks before drafting begins. Do not proceed until items 1-6 are confirmed loaded.
