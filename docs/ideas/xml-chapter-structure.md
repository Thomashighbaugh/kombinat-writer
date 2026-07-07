# XML Chapter Structure for Kombinat Writer

The XML layer is an **intermediate representation** — the agent generates chapters with internal XML tags for verification, error recovery, and element extraction. XML tags are **stripped on save** to produce clean prose. The agent uses them during generation to maintain focus, and the quality gates parse them to verify content against project standards.

## Fiction Chapter Structure

```xml
<chapter number="3" title="The Threshold" pacing="rising" word-target="3000">
  <metadata>
    <outline-purpose>Protagonist crosses into the unfamiliar world</outline-purpose>
    <pov>Eira</pov>
    <setting>The Border Marsh, pre-dawn</setting>
    <time>Year 1247, Spring, Day 3</time>
    <characters-present>Eira, Kael, The Guide</characters-present>
    <plot-threads-advanced>border-crossing, eira-distrust-of-kael</plot-threads>
  </metadata>

  <scene number="1" type="transition" goal="Eira must decide to cross" conflict="Fear of the unknown vs. duty">
    <narration register="tense" sensory-focus="cold, wet, grey">
      The marsh stretched before them like a wound in the earth...
    </narration>
    <dialogue speaker="Eira" emotion="anxious" subtext="doubt">
      "We cross at first light. Not before."
    </dialogue>
    <narration register="observing" sensory-focus="movement, sound">
      Kael shifted beside her, the leather of his armor creaking.
    </narration>
    <dialogue speaker="Kael" emotion="patient" subtext="hidden urgency">
      "First light was twenty minutes ago."
    </dialogue>
    <action beat="Eira grips her sword hilt" significance="hesitation visible to others" />
    <interiority character="Eira" emotion="shame" thought="She hated that he saw it." />
    <beatchange from="hesitation" to="resolve" trigger="The Guide speaks" />
  </scene>

  <scene number="2" type="action" goal="Cross the marsh" conflict="Terrain, weather, hidden threat">
    <narration register="immersive" sensory-focus="cold, fog, sulfur-smell">
      They moved single-file through the reeds...
    </narration>
    <dialogue speaker="The Guide" emotion="flat" subtext="knows more than he says">
      "Stay on the stones. The mud remembers."
    </dialogue>
    <sensory-inject type="sound">A heron crashed skyward from the reeds.</sensory-inject>
    <beatchange from="tension" to="alarm" trigger="The Guide stops" />
    <dialogue speaker="Kael" emotion="alert">
      "What is it?"
    </dialogue>
    <dialogue speaker="The Guide" emotion="fear-suppressed">
      "Nothing. Keep moving."
    </dialogue>
    <interiority character="Eira" emotion="dread" thought="The Guide was lying." />
  </scene>

  <chapter-notes>
    <word-count>3120</word-count>
    <tracking-updates>
      <character-state name="Eira" field="emotion" from="anxious" to="resolve" />
      <character-state name="Kael" field="trust-in-eira" value="decreasing" />
      <plot-thread name="border-crossing" status="complete" />
      <plot-thread name="eira-distrust-of-kael" status="advanced" />
      <timeline event="Crossed the Border Marsh" date="Year 1247, Spring, Day 3" />
    </tracking-updates>
    <sources-used />
    <hooks>
      <opening-hook>Eira's hesitation at the marsh edge</opening-hook>
      <closing-hook>The Guide's lie about the sound</closing-hook>
    </hooks>
  </chapter-notes>
</chapter>
```

### Fiction XML Tag Reference

| Tag | Attributes | Purpose |
|-----|-----------|---------|
| `<chapter>` | number, title, pacing, word-target | Root element. Gates verify against outline. |
| `<metadata>` | — | Pre-draft gate checks all fields present and match outline. |
| `<scene>` | number, type, goal, conflict | Post-draft gate verifies each scene has goal+conflict. Pacing audit uses scene types. |
| `<narration>` | register, sensory-focus | Voice check compares register against voice profile. |
| `<dialogue>` | speaker, emotion, subtext | Voice check extracts per-speaker dialogue, compares against character voice profile. |
| `<action>` | beat, significance | Continuity check tracks physical actions. |
| `<interiority>` | character, emotion, thought | Character depth verification. |
| `<beatchange>` | from, to, trigger | Emotional beat map construction. Pacing audit. |
| `<sensory-inject>` | type | Sensory density check. |
| `<chapter-notes>` | — | Post-draft gate verifies tracking updated, word count met, hooks present. |
| `<tracking-updates>` | — | Post-draft gate verifies these match tracking files. |

## Non-Fiction Chapter Structure

```xml
<chapter number="4" title="The Mechanism of Inheritance" word-target="4000">
  <metadata>
    <outline-purpose>Explain chromosomal crossover and its statistical implications</outline-purpose>
    <argument-position>Supporting the central thesis: genetic diversity is non-random</argument-position>
    <evidence-density>high</evidence-density>
    <prerequisite-knowledge>Mendelian basics (Chapter 3)</prerequisite-knowledge>
  </metadata>

  <section number="1" type="foundation" claim="Crossover is a structured, not random, process">
    <exposition register="academic-clinical">
      The conventional framing of chromosomal crossover as a random event...
    </exposition>
    <evidence source-key="morgan-1916" page="47" type="primary">
      Morgan's data showed crossover frequencies consistently偏离 from random expectation...
    </evidence>
    <citation marker="[Source: morgan-1916]" style="apa7" />
    <warrant>The deviation from randomness implies a regulatory mechanism</warrant>
  </section>

  <section number="2" type="deep-dive" claim="The synaptonemal complex directs crossover sites">
    <exposition register="academic-precise">
      Recent work on the synaptonemal complex reveals...
    </exposition>
    <evidence source-key="henderson-2018" page="112-114" type="secondary">
      Henderson et al. demonstrated that...
    </evidence>
    <citation marker="[Source: henderson-2018]" style="apa7" />
    <counterargument position="Some geneticists argue crossover position is epigenetically noise-driven">
      <refutation>The statistical clustering at promoter regions undermines the noise model</refutation>
    </counterargument>
    <synthesis>Crossover is mechanistically guided, not stochastically determined</synthesis>
  </section>

  <chapter-notes>
    <word-count>3850</word-count>
    <sources-used>morgan-1916, henderson-2018</sources-used>
    <claims>
      <claim id="4.1" text="Crossover is structured" sources="morgan-1916" />
      <claim id="4.2" text="Synaptonemal complex directs sites" sources="henderson-2018" />
    </claims>
    <citations>
      <citation id="C1" source="morgan-1916" page="47" verified="true" />
      <citation id="C2" source="henderson-2018" page="112" verified="true" />
    </citations>
    <hook>Opening question: What if evolution's dice are loaded?</hook>
  </chapter-notes>
</chapter>
```

### Non-Fiction XML Tag Reference

| Tag | Attributes | Purpose |
|-----|-----------|---------|
| `<chapter>` | number, title, word-target | Root element. |
| `<metadata>` | — | Pre-draft gate checks outline match, argument position, prerequisite. |
| `<section>` | number, type, claim | Post-draft gate verifies each section has a claim. Argument audit. |
| `<exposition>` | register | Voice check — academic register consistency. |
| `<evidence>` | source-key, page, type | Citation validator checks source exists, page range valid. |
| `<citation>` | marker, style | Citation format check. |
| `<warrant>` | — | Argument structure check — warrant follows evidence. |
| `<counterargument>` | position | Argument structure check — counter addressed. |
| `<refutation>` | — | Argument structure check — counter refuted. |
| `<synthesis>` | — | Argument structure check — section synthesises. |
| `<chapter-notes>` | — | Post-draft gate: word count, sources, claims, citations verified. |

## Save Transformation

On save, the agent:
1. Strips all XML tags
2. Replaces `<dialogue speaker="X">text</dialogue>` with `"text"` (preserving the text, adding dialogue punctuation)
3. Replaces `<narration>text</narration>` with `text` (raw prose)
4. Replaces `<exposition>text</exposition>` with `text`
5. Converts `<chapter-notes>` to the footer notes section
6. Saves clean prose to `./book/content/chapter_NNNNN.md`
7. Saves the XML version to `./book/drafts/chapter_NNNNN.xml` (for verification gates)

## Quality Gate Integration

The quality gates parse the XML version, not the clean prose. This allows:
- **Pre-draft gate**: Verify `<metadata>` matches outline (chapter number, title, pacing tag, characters present)
- **Post-draft gate**: Verify `<chapter-notes>` tracking updates match tracking files, word count met, hooks present
- **Voice check**: Extract all `<dialogue speaker="X">` blocks, compare against X's voice profile. Extract all `<narration register="Y">` blocks, compare against narration voice profile.
- **Continuity check**: Extract `<tracking-updates>`, cross-reference against tracking files. Extract `<beatchange>` sequences, verify emotional arc makes sense.
- **Citation check (non-fiction)**: Extract all `<evidence>` and `<citation>` tags, verify sources exist, pages valid, format correct.
- **Revision verify**: After revise, parse XML to confirm critique items were addressed (e.g., if critique said "character motivation unclear in scene 2", verify scene 2 was modified)