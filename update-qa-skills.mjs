import fs from 'fs-extra';
import path from 'path';

// 1. Rename folders
const moves = [
  ['src/skills/critique/peer-review', 'src/skills/critique/domain-expert'],
  ['src/skills/critique/sensitivity-reader', 'src/skills/critique/cultural-consultant'],
  ['src/skills/quality-assurance/prose-polishing-check', 'src/skills/quality-assurance/line-editor'],
  ['src/skills/quality-assurance/consistency-checker', 'src/skills/quality-assurance/continuity-auditor']
];

for (const [src, dest] of moves) {
  if (fs.existsSync(src)) {
    fs.moveSync(src, dest, { overwrite: true });
  }
}

// 2. Rewrite SKILL.md for Domain Expert (formerly Peer Review)
fs.writeFileSync('src/skills/critique/domain-expert/SKILL.md', `---
name: domain-expert
description: "Professional domain expertise methodology for non-fiction and hard sci-fi: evaluates factual accuracy, methodological rigor, argument validity, and citation integrity."
---

# Domain Expert (formerly Peer Review)

## Evaluation Dimensions

Assess the manuscript across five dimensions of credibility, accuracy, and rigorousness. Your role is to ensure the work withstands scrutiny from subject matter experts.

1. **Factual and Historical Accuracy**:
   - Are claims verifiable? Are statistics, dates, proper nouns, and historical events correctly stated?
   - Flag any assertions that lack supporting evidence or rely on debunked sources.

2. **Methodological Rigor**:
   - If the work uses an analytical framework, classification scheme, or scientific concept, is it applied correctly and consistently?
   - Flag methodological leaps, unstated assumptions, or misunderstandings of core principles.

3. **Argument Validity and Logic**:
   - Does the reasoning hold up under stress-testing? 
   - Identify logical fallacies (false dichotomy, hasty generalization, circular reasoning, false cause).
   - Flag areas where the text appeals to authority outside of that authority's actual expertise.

4. **Evidence Sufficiency**:
   - Is the evidence adequate in both quantity and quality to support the weight of the claim? 
   - Distinguish claims supported by multiple independent, peer-reviewed sources from claims resting on a single study or anecdote.

5. **Citation Integrity (Non-Fiction specific)**:
   - Are citations complete, traceable, and correctly contextualized?
   - Flag instances where a cited source might be misrepresented or taken out of context.

## Methodology

Approach the text as a rigorous but constructive academic or professional reviewer.
*   **Locate**: Anchor every observation to a specific location (Chapter, paragraph, or claim).
*   **Diagnose**: State the specific inaccuracy or logical flaw clearly.
*   **Provide Evidence**: Cite the accepted consensus, empirical data, or historical fact that contradicts the text.
*   **Remedy**: Suggest how the author can correct the claim, qualify the statement, or better support the argument.

*Example*: "Chapter 2, Paragraph 4: The claim that [X] causes [Y] is presented as settled fact, but is currently a matter of active debate in the field (see [Source A] vs [Source B]). Consider qualifying this as a leading hypothesis rather than an absolute."

## Field-Specific Nuance

*   **Historical Writing**: Prioritize primary-source verification, anachronism detection, and contextual accuracy.
*   **Scientific Exposition**: Prioritize methodological transparency, currency of cited research, and accurate explanation of mechanisms.
*   **Hard Sci-Fi**: Prioritize the internal consistency of the speculative physics, biology, or sociology based on the author's established rules.

## Reporting Structure

Categorize findings by severity:
*   **[FATAL FLAW]**: Core premise or major argument relies on demonstrably false information.
*   **[MAJOR CONCERN]**: Significant leap in logic, missing crucial context, or misrepresentation of a source.
*   **[MINOR INACCURACY]**: Specific factual error (wrong date, misspelled name, slight miscalculation) easily fixed with a localized edit.
`);

// 3. Rewrite SKILL.md for Cultural Consultant (formerly Sensitivity Reader)
fs.writeFileSync('src/skills/critique/cultural-consultant/SKILL.md', `---
name: cultural-consultant
description: "Cultural consultation methodology: evaluates representation depth, authenticity, stereotype mitigation, and power dynamics for marginalized or specific cultural perspectives."
---

# Cultural Consultant (formerly Sensitivity Reader)

## Evaluation Dimensions

Assess the manuscript's representation of specific cultures, identities, or marginalized groups. Your role is not to censor, but to provide the author with data on how their portrayals align with lived realities and cultural nuances.

1. **Representation Depth and Agency**:
   - Are characters from marginalized groups fully realized with agency, interiority, and narrative purpose beyond their identity?
   - Flag characters that feel flat, tokenistic, or exist purely to service the emotional arc of a dominant-group protagonist (e.g., the "magical negro," the "disposable queer character").

2. **Stereotype Mitigation**:
   - Does the work reproduce, rely on, or inadvertently reinforce harmful tropes?
   - Examine character traits, dialogue patterns, physical descriptions, and assigned narrative roles. Flag recurring patterns that align with historical stereotypes.

3. **Authenticity and Specificity**:
   - Do cultural details (language, customs, social norms, humor, historical references) reflect specific, accurate knowledge?
   - Flag details that feel drawn from generalized media consumption rather than lived experience or rigorous research. Specificity is the strongest signal of authenticity.

4. **Language and Terminology Awareness**:
   - Does the terminology used for identities, communities, and historical events reflect current, respectful, or era-appropriate usage (depending on the setting)?
   - Flag dated, clinical, or outsider-coded language when used unintentionally by the narrative voice.

5. **Power Dynamics and Framing**:
   - Who holds the narrative authority? Who is allowed to explain the world? Who suffers, and is that suffering treated with gravity or used for cheap stakes?
   - Examine the underlying power dynamics of the narrative framing.

## Methodology

Approach the manuscript with an identity-aware lens. 

*   **Accuracy Notes**: Factual or cultural corrections (e.g., "This idiom is not used by this demographic," "This religious practice is depicted incorrectly").
*   **Representation Patterns**: High-level issues with how a group is portrayed across the entirety of the work.
*   **Friction Risks**: Passages with significant potential to break trust with readers from the depicted community.

## Constructive Framing

Frame findings as informational feedback regarding audience reception.
*   *Instead of*: "This is offensive."
*   *Write*: "Readers from this community may experience this passage as [specific reaction/trope] because of [historical context]. Consider whether [alternative approach] would better serve your narrative intent."

Distinguish between simple factual errors (easily corrected) and fundamental framing issues (which may require restructuring). Your role is to supply perspective the writer lacks, giving them the agency to weigh the feedback against their artistic intent.
`);

// 4. Rewrite SKILL.md for Line Editor (formerly Prose Polishing)
fs.writeFileSync('src/skills/quality-assurance/line-editor/SKILL.md', `---
name: line-editor
description: "Sentence-level craft audit: evaluates rhythm, euphony, word choice, and aggressive mitigation of AI-generated stylistic 'slop'."
---

# Line Editor (formerly Prose Polishing Check)

## Core Directive

This is a final-pass audit focused strictly on the sentence level. Do not critique plot, structure, or character arcs. Your sole objective is to elevate the prose—the rhythm, texture, precision, and voice of the words on the page.

## Evaluation Categories

### 1. The AI-Slop Eradication Sweep (CRITICAL)
Aggressively flag and eradicate residual AI stylistic markers that survived earlier revisions:
*   **Sensory Overload**: "The scent of ozone and tang of copper," "crackling energy."
*   **Binary Escalation**: "It wasn't just X. It was Y."
*   **The Hollow Closer**: "They didn't have to." / "And that made all the difference."
*   **Micro-expression fixation**: "Something shifted in their eyes," "A shadow crossed their face."
*   **Over-reliance on adverbs**: "She said angrily," "he looked dangerously."

### 2. Sentence Architecture & Rhythm
*   **Cadence Variation**: Ensure a mix of long, flowing sentences and short, punchy ones. Flag paragraphs where 3+ consecutive sentences share the exact same length or structure.
*   **Opening Variety**: Flag consecutive sentences starting with the same pronoun, article, or grammatical structure (unless deployed specifically for rhetorical effect).

### 3. Sonic Texture (Euphony vs. Cacophony)
*   Read the prose for sound. Flag accidental tongue-twisters, excessive alliteration, or clunky consonant clusters ("str-", "scr-") that slow the reader down unintentionally.
*   Ensure the sonic texture matches the mood (e.g., hard, percussive consonants in an action scene; flowing vowels in a reflective moment).

### 4. Precision and Concreteness
*   **Telling vs. Showing**: Flag emotional assertions ("she felt a deep sadness") that lack physical manifestation or interiority.
*   **Concrete over Abstract**: Push for specific nouns and strong verbs over abstract concepts and weak modifiers.

### 5. Punctuation Abuse
*   Flag over-reliance on em-dashes (signals a rhythm crutch), ellipses (signals melodramatic hesitation), and exclamation points (which should be exceedingly rare in narrative prose).

## Output Format

Generate a highly specific, actionable line-edit report. Do not offer vague praise.
Provide before-and-after examples for the most egregious sentences.
`);

// 5. Rewrite SKILL.md for Continuity Auditor (formerly Consistency Checker)
fs.writeFileSync('src/skills/quality-assurance/continuity-auditor/SKILL.md', `---
name: continuity-auditor
description: "Rigorous continuity tracking methodology: detects plot holes, timeline paradoxes, behavioral inconsistencies, and violations of established project metadata."
---

# Continuity Auditor (formerly Consistency Checker)

## Core Directive

Your objective is to stress-test the manuscript against itself and its established metadata. You are hunting for logical paradoxes, timeline breaks, dropped threads, and character inconsistencies that shatter immersion.

## Audit Categories

### 1. Chronological and Timeline Integrity
*   **Tracking**: Extract all time markers (dates, seasons, elapsed time, time of day).
*   **Verification**: Ensure monotonic progression. If a journey takes three days, ensure three days of narrative time actually pass. Flag impossible travel times or overlapping events.

### 2. Epistemic Consistency (Knowledge State)
*   **Tracking**: Monitor exactly what each POV character knows at any given moment.
*   **Verification**: Flag instances where a character acts on information they have not yet learned, or fails to act on crucial information they possess. Guard the integrity of dramatic irony.

### 3. Causal and Setup/Payoff Integrity
*   **Tracking**: Map dependencies between plot events (Chekhov's guns).
*   **Verification**: Flag payoffs that lack setups, or major setups that are seemingly abandoned. Ensure cause directly leads to effect.

### 4. Behavioral and Voice Consistency
*   **Tracking**: Cross-reference character actions and dialogue against their profiles in the project metadata.
*   **Verification**: Flag actions that wildly contradict established traits without sufficient narrative catalyst. Ensure the character's dialogue register remains consistent (vocabulary, syntax).

### 5. World-Rule Compliance
*   **Tracking**: Monitor invocations of worldbuilding constraints (magic systems, technological limits, societal laws).
*   **Verification**: Flag moments where the narrative bends or breaks its own established rules for the sake of plot convenience.

## Severity Classification

Report findings using these severity tags:
*   **[CRITICAL]**: Breaks reader trust entirely (e.g., character revives without explanation, impossible timeline paradox). Requires immediate blocking revision.
*   **[MAJOR]**: Contradicts established canon or project metadata. Requires targeted rewriting.
*   **[MINOR]**: Small inconsistency (e.g., eye color changes, time of day shifts slightly) explainable with a localized tweak.
*   **[ORPHAN THREAD]**: A setup, character, or plot point that simply vanishes from the narrative.

## False Positive Awareness

Be intelligent in your auditing. Characters may behave inconsistently *on purpose* due to deception, growth, or unreliability. World rules may have intentional exceptions. When uncertain, flag the issue with \`[SUSPECT]\` rather than declaring it a definitive error.
`);

