---
name: pacing-rhythm
description: "Manages pacing archetypes, sentence-level rhythm, fragment detection, and chapter-level pacing tags. Use when planning pacing, writing, or editing for rhythm."
---

# Pacing & Rhythm

## Pacing Archetypes

Every manuscript has a dominant pacing profile. Identify the target archetype before drafting to align reader expectations with execution.

- **Relentless Action**: Short scenes (250-750 words), high sentence velocity (avg 12-16 words/sentence), minimal interiority. Used for thrillers, action sequences, climactic chapters.
- **Balanced 2:1**: Two parts action/internal-dialogue to one part reflection. The default for commercial fiction across genres. Scenes average 1000-1500 words.
- **Literary Slow-Burn**: Extended scenes (2000+ words), long sentences (avg 22-28 words), extensive interiority, layered description. Used for literary fiction, atmospheric horror, character studies.
- **Rollercoaster**: Alternates between high-velocity action scenes and low-velocity reflective sequels. The contrast itself creates the emotional effect — relief, then tension, then relief.
- **Custom**: Defined by the writer for a specific effect. Requires explicit tagging at chapter level.

## Sentence-Level Rhythm

Rhythm is created by variation. Monotony at the sentence level exhausts the reader regardless of content quality.

- **Short sentences** (1-8 words): Speed, urgency, finality, impact. Use for disaster moments, revelations, commands.
- **Long sentences** (20+ words): Immersion, complexity, breathlessness, accumulation. Use for interiority, description, building tension.
- **Medium sentences** (9-19 words): The default narrative mode. Vary length within this band to avoid monotony.
- **Fragments**: Deliberately incomplete sentences. Use for stream of consciousness, shock, disorientation, or emphasis. Detect and remove unintentional fragments during editing.
- **Periodic sentences**: Main clause delayed to the end. Creates suspense at the sentence level. "When the door opened — slowly, deliberately, with a creak that sawed through the silence — he understood he would not leave this room."

## Paragraph Pacing

- **Action paragraphs**: 1-3 sentences. Short, punchy. The paragraph break itself becomes a breath.
- **Description paragraphs**: 3-6 sentences. Allow rhythm to slow and imagery to settle.
- **Dialogue paragraphs**: Alternate between single-line tags and action beats. Paragraph breaks in dialogue signal speaker shifts and pace the exchange.
- **Interiority paragraphs**: 4-8 sentences. The rhythm mirrors the character's mental state — tumbling for panic, measured for reflection.

## Chapter-Level Pacing Tags

Use frontmatter or inline comments to tag each chapter with its pacing profile:

```yaml
pacing:
  archetype: rollercoaster
  beats:
    - type: action
      target_words: 400
    - type: sequel
      target_words: 600
    - type: action
      target_words: 1200
```

Tags enable systematic review: a chapter tagged "action" should not contain a 2000-word interior monologue.

## Pacing Verification Checklist

During revision, run each chapter against these checks:

1. **Sentence start variety**: Do more than two consecutive sentences begin with the same word? Vary.
2. **Length distribution**: In a 100-sentence sample, is there a mix of short (<10), medium (10-20), and long (>20) sentences? If too uniform, add variation.
3. **Paragraph length**: Do action sequences use short paragraphs? Does interiority use longer ones?
4. **Scene-to-scene contrast**: Is there a rhythm of escalation and release, or does the pace stay flat?
5. **Archetype alignment**: Does the chapter's actual pacing match its tagged archetype?
6. **Intentional fragments only**: Every sentence fragment must justify its existence. If it can be reattached, reattach it.
