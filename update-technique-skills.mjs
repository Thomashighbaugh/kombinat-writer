import fs from 'fs-extra';
import path from 'path';

const moves = [
  ['src/skills/fiction/writing-techniques/namecraft', 'src/skills/fiction/writing-techniques/nomenclature-design'],
  ['src/skills/fiction/writing-techniques/scene-structure', 'src/skills/fiction/writing-techniques/scene-architecture'],
  ['src/skills/fiction/writing-techniques/emotional-interiority', 'src/skills/fiction/writing-techniques/psychological-interiority']
];

for (const [src, dest] of moves) {
  if (fs.existsSync(src)) {
    fs.moveSync(src, dest, { overwrite: true });
  }
}

// Write new SKILL.md for nomenclature-design
fs.writeFileSync('src/skills/fiction/writing-techniques/nomenclature-design/SKILL.md', `---
name: nomenclature-design
description: "Professional methodology for character, place, and concept naming: evaluates linguistic cohesion, thematic resonance, phonetic texture, and semantic weight."
---

# Nomenclature Design (formerly Namecraft)

## Core Directive
Nomenclature is worldbuilding at the micro-level. Assess and generate names not merely for aesthetic appeal, but for their linguistic, thematic, and phonetic function within the narrative architecture.

## Evaluation & Generation Criteria

1. **Linguistic Cohesion**:
   - Do the names within a specific culture, family, or region share morphological rules? (e.g., common suffixes, consonant preferences, syllable counts).
   - Ensure names do not sound like random scrambles of syllables ("fantasy keyboard smashing").

2. **Thematic Resonance & Semantic Weight**:
   - Does the name subtly reinforce the character's role or the location's history? 
   - Utilize etymological roots (Latin, Germanic, Greek, or constructed languages) to embed meaning without being overtly literal.

3. **Phonetic Texture**:
   - **Hard Consonants (K, T, P, G, D, B)**: Evoke harshness, strength, abruptness, or aggression.
   - **Soft Consonants/Sibilants (S, L, M, N, V, W)**: Evoke fluidity, elegance, stealth, or softness.
   - Ensure the phonetic texture matches the entity's narrative function.

4. **Visual and Auditory Distinction**:
   - Ensure major characters do not share the same starting letter, syllable count, or ending sound. 
   - A reader must be able to visually distinguish names on the page instantly (e.g., avoid having a "Sauron", "Saruman", and "Saurman" in the same scene).

## Outputs
When suggesting names, provide the Name, the Etymological/Linguistic Root, the Phonetic rationale, and the Thematic resonance.
`);

// Write new SKILL.md for scene-architecture
fs.writeFileSync('src/skills/fiction/writing-techniques/scene-architecture/SKILL.md', `---
name: scene-architecture
description: "Structural engineering methodology for scenes: evaluates and implements the Goal-Conflict-Disaster / Reaction-Dilemma-Decision framework to ensure narrative momentum."
---

# Scene Architecture (formerly Scene Structure)

## Core Directive
Treat every scene as a structural load-bearing unit of the narrative. A scene must change a value state (positive to negative, or negative to positive). If the value state at the end of the scene is identical to the beginning, the scene is structurally void and must be revised or cut.

## The Action-Reaction Framework

### 1. The Action Scene (Goal - Conflict - Disaster)
Used to drive the external plot forward.
*   **Goal**: The POV character enters the scene with a specific, proactive, and measurable goal.
*   **Conflict**: Obstacles (internal, interpersonal, or environmental) actively oppose the goal.
*   **Disaster**: The scene ends not with success, but with a complication. The character fails, succeeds but with a terrible cost, or succeeds only to face a worse problem.

### 2. The Reaction Scene / Sequel (Reaction - Dilemma - Decision)
Used to process the emotional fallout of a Disaster and pivot to the next Goal.
*   **Reaction**: The character reacts emotionally and viscerally to the Disaster.
*   **Dilemma**: The character is forced to analyze the new situation. There are no good options left.
*   **Decision**: The character makes a choice among the bad options, forming the new Goal that launches the next Action Scene.

## Scene Entry and Exit (Framing)
*   **Late In, Early Out**: Enter the scene at the last possible moment before the conflict engages. Exit the scene the moment the Disaster or Decision lands.
*   **The Turning Point**: Identify the exact beat where the scene's value charge reverses. If this beat cannot be isolated, the architecture is flawed.

## Execution
When outlining or critiquing, map every scene explicitly to this framework. Flag scenes that lack a defined Goal or end without a Disaster/Decision.
`);

// Write new SKILL.md for psychological-interiority
fs.writeFileSync('src/skills/fiction/writing-techniques/psychological-interiority/SKILL.md', `---
name: psychological-interiority
description: "Methodology for rendering deep character psychology: evaluates focalization, psychic distance, subtext, and the integration of internal monologue with external action."
---

# Psychological Interiority (formerly Emotional Interiority)

## Core Directive
Move beyond labeling emotions ("she felt sad," "he was angry") into rendering the raw, unfiltered psychological experience of the Point of View (POV) character. Filter the entire world through the character's specific epistemic and emotional state.

## Core Techniques

### 1. Psychic Distance Modulation
*   Control how close the narrative lens is to the character's consciousness. 
*   **Far**: Objective observation ("The man walked across the room.")
*   **Close**: Filtered observation ("He paced across the room, the floorboards groaning underfoot.")
*   **Deep**: Unfiltered internal reality ("The floorboards groaned. Everything in this house was rotting.")
*   *Directive*: Push the prose into Deep Psychic Distance during moments of high emotional stakes or crisis.

### 2. Free Indirect Discourse
*   Blend the third-person narrative voice with the character's internal monologue without using dialogue tags (e.g., *he thought*, *she wondered*).
*   *Instead of*: She looked at the letter and thought it was too late.
*   *Write*: She stared at the letter. Too late. It was always too late.

### 3. The Objective Correlative
*   Use the external environment to manifest internal psychology. Characters should notice details in the room that match their current emotional state. A terrified character notices shadows and sharp edges; a joyful character notices light and open space.

### 4. Somatic Processing
*   Render emotion through specific, grounded physical sensations rather than cliché abstractions. 
*   *Ban*: "Heart pounding," "shivers down the spine," "breath caught."
*   *Require*: Idiosyncratic physical manifestations unique to the character's biology and history.

## Subtext and Defense Mechanisms
Characters rarely think about their deepest traumas directly. Render their interiority by showing what they are *avoiding* thinking about. Utilize projection, denial, and rationalization in their internal monologue.
`);

