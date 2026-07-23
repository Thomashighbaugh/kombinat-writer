---
name: swarm-orchestrator
description: "Multi-agent orchestration methodology for comprehensive novel critique: dispatches specialized agents in parallel for structural, line-level, continuity, and momentum analysis."
---

# Swarm Orchestrator (Parallel Multi-Agent Critique)

## Core Directive
Executing a deep critique on a batch of chapters requires diverse analytical lenses. A single agent evaluating structure, prose, continuity, and momentum simultaneously will experience cognitive overload and miss critical defects.

To solve this, you will execute a **Three-Phase Multi-Agent Swarm** utilizing OpenCode's specialized subagents, dispatched concurrently via the \`task\` tool.

## Phase 1: Parallel Dispatch (The Swarm)

You must dispatch these four agents **concurrently** (in a single tool-call batch) to analyze the provided chapters. Provide each agent with the full text of the chapters and the specific skill to load.

1.  **The Structural Analyst (`@deep-thinker`)**
    *   **Focus**: Full structural read — pacing, arc strength, scene necessity, and manifest compliance.
    *   **Required Skill**: \`developmental-editor\`

2.  **The Prose Reviewer (`@code-reviewer`)**
    *   **Focus**: Line-level craft — grammar, punctuation, repetitive sentence architecture, weak verbs, filter words (he felt, she saw, they knew), and AI-slop eradication.
    *   **Required Skill**: \`line-editor\`
    *   *Note*: We use the code-reviewer agent because its attention to syntax, style-linting, and line-by-line syntax is perfectly suited for line editing prose.

3.  **The Continuity Auditor (`@refactoring`)**
    *   **Focus**: Timeline mapping, character behavioral consistency, and worldbuilding/lore mechanics compliance.
    *   **Required Skill**: \`continuity-auditor\`
    *   *Note*: We use the refactoring agent because its core capability is tracing dependencies and spotting logical inconsistencies across a system.

4.  **The Momentum & Hook Analyst (`@deep-thinker` - 2nd Instance)**
    *   **Focus**: Opening hooks, closing images, scene transitions, and narrative velocity.
    *   **Required Skill**: \`hook-and-transition-analyst\`

### Dispatch Formatting
When calling the \`task\` tool for each agent, structure your prompt explicitly:
*   **Role**: Define their exact role from the list above.
*   **Skill to Load**: Instruct them to read their specific \`SKILL.md\` file to internalize their methodology.
*   **Context**: Provide the text to review and the relevant metadata/lore.
*   **Output Requirement**: Demand specific, location-anchored findings categorized by severity.

## Phase 2: Consolidation (The Synthesis)

Once all four subagents return their reports, you (the Orchestrator) will:
1.  **Reconcile Findings**: Cross-reference the reports. Does the Continuity Auditor's timeline issue explain the Structural Analyst's pacing sag?
2.  **Deduplicate**: Merge overlapping critiques.
3.  **Format the Master Report**: Compile the findings into the standard Kombinat Critique Matrix (Critical, Major, Minor), tagged by the reporting subagent's domain.

## Phase 3: Verification (The Sanity Check)

Before presenting the final master report to the user:
1.  Confirm no subagent hallucinatory critiques (e.g., flagging a plot hole that is actually explained in the text).
2.  Verify that all critiques adhere to the project's \`metadata\` decisions and \`manifest.md\` constitution.
