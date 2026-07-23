import fs from 'fs-extra';
import path from 'path';

const moves = [
  ['src/skills/fiction/writing-techniques/comedic-banter-rhythm', 'src/skills/fiction/writing-techniques/dialogue-rhythm-dynamics'],
  ['src/skills/quality-assurance/getting-started', 'src/skills/quality-assurance/workflow-onboarding']
];

for (const [src, dest] of moves) {
  if (fs.existsSync(src)) {
    fs.moveSync(src, dest, { overwrite: true });
  }
}

// Write new SKILL.md for dialogue-rhythm-dynamics
fs.writeFileSync('src/skills/fiction/writing-techniques/dialogue-rhythm-dynamics/SKILL.md', `---
name: dialogue-rhythm-dynamics
description: "Methodology for crafting high-impact dialogue: evaluates pacing, subtextual combat, overlap, brevity, and the musicality of spoken exchanges."
---

# Dialogue Rhythm & Dynamics (formerly Comedic Banter Rhythm)

## Core Directive
Dialogue is action. It is combat, negotiation, or seduction disguised as conversation. It must possess distinct rhythmic patterns, momentum, and subtext. Characters should rarely say exactly what they mean.

## Analytical Framework

### 1. The Rule of Three (Pacing & Delivery)
*   **Setup, Reinforcement, Subversion**: Effective rhythmic exchanges rely on establishing a pattern and then breaking it. The third beat of a dialogue sequence should escalate, undercut, or subvert the previous two.

### 2. Overlap and Interruption
*   Real conversation is messy. Use dashes (—) to signify cut-offs and interruptions. 
*   **The Pivot**: One character interrupts another to seize narrative control or deflect an uncomfortable truth.

### 3. Compression and Brevity
*   **The Economy of Words**: Cut pleasantries, greetings, and filler ("Hello," "How are you?"). Arrive late to the conversation and leave early.
*   **White Space**: A page of dialogue must have white space. If a character speaks for more than three sentences uninterrupted, it is a monologue. Verify if a monologue is earned.

### 4. Subtextual Combat (Oblique Responses)
*   Characters should rarely answer questions directly. 
*   Answering a question with a question, answering a completely different unasked question, or responding with physical action builds subtext and tension.
*   *Example*: 
    *   "Are you angry with me?"
    *   "The coffee is cold." (Subtext: Yes, and I'm punishing you).

### 5. Dialogue Tags vs. Action Beats
*   Eradicate adverbial tags ("she said angrily").
*   Use action beats (micro-actions) to pace the dialogue, ground it in the physical space, and reveal subtextual emotion.
`);

// Write new SKILL.md for workflow-onboarding
fs.writeFileSync('src/skills/quality-assurance/workflow-onboarding/SKILL.md', `---
name: workflow-onboarding
description: "Initializes the user into the Kombinat workflow: evaluates project state, recommends immediate next steps, and establishes operational protocols."
---

# Workflow Onboarding (formerly Getting Started)

## Core Directive
Guide the user seamlessly into the Kombinat writing workflow. Analyze their current project state and prescribe the exact, most efficient next phase.

## Operational Assessment

### 1. The Blank Slate (No Context)
*   **Condition**: The user has no outline, no metadata, and no lorebook.
*   **Action**: Direct them to \`/kombinat manifest\` to establish the core principles, track, and metadata.

### 2. The Premise Exists (Partial Context)
*   **Condition**: The user has imported a premise, outline, or lorebook, but it is not integrated.
*   **Action**: Direct them to \`/kombinat specify\` to expand the premise, or \`/kombinat outline\` to begin structural mapping.

### 3. The Outline is Complete
*   **Condition**: \`book/outline.md\` and \`book/metadata/\` are populated.
*   **Action**: Direct them to \`/kombinat task-manager\` to queue drafting tasks, or directly to \`/kombinat draft\`.

## Communication Protocol
*   Speak with professional, concise authority. 
*   Do not overwhelm the user with all available commands. Provide exactly 1 to 2 immediate next steps based on the project's current state.
`);

