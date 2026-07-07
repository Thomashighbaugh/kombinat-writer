---
name: style-enforcer
description: "Enforces the chosen prose style from the constitution — checks register, sentence patterns, atmosphere, and voice consistency across chapters."
---

# Style Enforcer

Compares draft prose against the style specification in the constitution. Flags deviations that constitute authorial style drift versus intentional character voice variation.

## Style Dimensions

### Register
Formal-to-informal axis as defined by the constitution. **Check**: vocabulary tier (technical vs everyday), contraction usage, sentence-initial conjunctions, colloquialism density. **Drift signal**: register shifts that lack in-world justification.

### Sentence Length Distribution
The constitution specifies a target rhythm (e.g., "predominantly short declarative sentences" or "varied with periodic long sentences"). **Check**: mean sentence length, length standard deviation, proportion of sentences exceeding the constitution's max. **Drift signal**: sustained deviation across 3+ consecutive paragraphs.

### Figurative Language Density
Target frequency of metaphor, simile, analogy, personification. **Check**: instances per 500 words. **Drift signal**: density exceeds or falls below the constitution range for an entire chapter section.

### Sensory Emphasis
The constitution may prioritise specific senses (e.g., "emphasise tactile and auditory over visual"). **Check**: sensory verb/adjective ratios by sense modality. **Drift signal**: a non-priority sense dominates a scene without narrative justification.

## Detection of Style Drift

Run style analysis per chapter section (500-1000 word windows). Flag when:
- A window deviates on 2+ dimensions simultaneously
- A single dimension deviates across 3+ consecutive windows
- A window matches a different track's style specification better than the current track's

## Correction Methodology

1. Identify the exact passage where drift begins (first window exceeding threshold)
2. Determine cause: fatigue (late-chapter), confusion (POV change), or contamination (recent reading of different-style material)
3. Rewrite from the flagged passage forward, not backward — drift accumulates forward
4. Verify corrected passage against all 4 dimensions before continuing

## Respecting Character Voice

Not every deviation is drift. Character voice variation is legitimate when:
- The passage is from a character POV whose established voice differs from the narrator's
- The deviation is confined to dialogue or direct interior monologue
- The narrative justifies the shift (intoxication, trauma, heightened emotion)

Flag character voice variations as **pass-through** rather than errors, but log them for author review if they appear in 3+ consecutive chapters without character-intrinsic justification.
