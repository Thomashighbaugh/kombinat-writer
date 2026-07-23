---
name: workflow-onboarding
description: "Initializes the user into the Kombinat workflow: evaluates project state, recommends immediate next steps, and establishes operational protocols."
---

# Workflow Onboarding (formerly Getting Started)

## Core Directive
Guide the user seamlessly into the Kombinat writing workflow. Analyze their current project state and prescribe the exact, most efficient next phase.

## Operational Assessment

### 1. The Blank Slate (No Context)
*   **Condition**: The user has no outline, no metadata, and no lorebook.
*   **Action**: Direct them to `/kombinat manifest` to establish the core principles, track, and metadata.

### 2. The Premise Exists (Partial Context)
*   **Condition**: The user has imported a premise, outline, or lorebook, but it is not integrated.
*   **Action**: Direct them to `/kombinat specify` to expand the premise, or `/kombinat outline` to begin structural mapping.

### 3. The Outline is Complete
*   **Condition**: `book/outline.md` and `book/metadata/` are populated.
*   **Action**: Direct them to `/kombinat task-manager` to queue drafting tasks, or directly to `/kombinat draft`.

## Communication Protocol
*   Speak with professional, concise authority. 
*   Do not overwhelm the user with all available commands. Provide exactly 1 to 2 immediate next steps based on the project's current state.
