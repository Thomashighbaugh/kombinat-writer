/**
 * Suggestion Severity Tiers
 *
 * AI suggestions are tiered: must-fix (block), should-consider (warning),
 * your-call (preference), FYI (observation). The author only sees must-fix
 * by default; higher tiers are opt-in.
 *
 * Aligns with the existing gate block/warning distinction but extends
 * to critique and edit suggestions.
 */

// ─── Types ───────────────────────────────────────────────────────────────

export type SeverityTier = 'must-fix' | 'should-consider' | 'your-call' | 'fyi';

export interface TieredSuggestion {
  id: string;
  tier: SeverityTier;
  category: string;        // 'prose-quality', 'structure', 'continuity', 'dialogue', etc.
  title: string;           // short label
  description: string;     // what the issue is
  location?: string;       // chapter/line/paragraph reference
  suggestion?: string;     // proposed fix (if applicable)
  rationale: string;       // why this suggestion is made
  gateRef?: string;        // if must-fix, which gate flagged it
}

export interface SuggestionSet {
  phase: string;
  chapter?: number;
  timestamp: string;
  suggestions: TieredSuggestion[];
  filterLevel: SeverityTier;  // minimum tier to display (default: must-fix)
}

// ─── Filtering ───────────────────────────────────────────────────────────────

const TIER_ORDER: SeverityTier[] = ['must-fix', 'should-consider', 'your-call', 'fyi'];

export function tierRank(tier: SeverityTier): number {
  return TIER_ORDER.indexOf(tier);
}

/**
 * Filter suggestions by minimum tier.
 * Default: only must-fix is shown.
 * Set filterLevel to 'fyi' to show all.
 */
export function filterByTier(
  set: SuggestionSet,
  minTier: SeverityTier = 'must-fix'
): TieredSuggestion[] {
  const minRank = tierRank(minTier);
  return set.suggestions.filter(s => tierRank(s.tier) <= minRank);
}

// ─── Categorization Helpers ──────────────────────────────────────────────────

/**
 * Classify a raw suggestion into a severity tier based on its characteristics.
 */
export function classifySuggestion(
  raw: {
    category: string;
    title: string;
    description: string;
    location?: string;
    suggestion?: string;
    rationale: string;
    isBlocking?: boolean;
    isWarning?: boolean;
    isPreference?: boolean;
  }
): TieredSuggestion {
  let tier: SeverityTier;

  if (raw.isBlocking) {
    tier = 'must-fix';
  } else if (raw.isWarning) {
    tier = 'should-consider';
  } else if (raw.isPreference) {
    tier = 'your-call';
  } else {
    tier = 'fyi';
  }

  return {
    id: `suggestion-${Math.random().toString(36).slice(2, 10)}`,
    tier,
    category: raw.category,
    title: raw.title,
    description: raw.description,
    location: raw.location,
    suggestion: raw.suggestion,
    rationale: raw.rationale,
    gateRef: raw.isBlocking ? raw.category : undefined,
  };
}

// ─── Summary ────────────────────────────────────────────────────────────────

export interface TierSummary {
  'must-fix': number;
  'should-consider': number;
  'your-call': number;
  'fyi': number;
  total: number;
}

export function summarizeTiers(set: SuggestionSet): TierSummary {
  const summary: TierSummary = {
    'must-fix': 0,
    'should-consider': 0,
    'your-call': 0,
    'fyi': 0,
    total: set.suggestions.length,
  };

  for (const s of set.suggestions) {
    summary[s.tier]++;
  }

  return summary;
}

// ─── Formatting ────────────────────────────────────────────────────────────

const TIER_LABELS: Record<SeverityTier, string> = {
  'must-fix': 'MUST FIX (blocks progression)',
  'should-consider': 'SHOULD CONSIDER (warning)',
  'your-call': 'YOUR CALL (preference)',
  'fyi': 'FYI (observation)',
};

const TIER_ICONS: Record<SeverityTier, string> = {
  'must-fix': '[BLOCK]',
  'should-consider': '[WARN]',
  'your-call': '[PREF]',
  'fyi': '[FYI]',
};

export function formatSuggestionSet(
  set: SuggestionSet,
  minTier: SeverityTier = set.filterLevel
): string {
  const summary = summarizeTiers(set);
  const visible = filterByTier(set, minTier);

  const lines: string[] = [
    `## Suggestions: ${set.phase}${set.chapter ? ` — Chapter ${set.chapter}` : ''}`,
    '',
    `**Summary**: ${summary.total} total — ${summary['must-fix']} must-fix, ${summary['should-consider']} should-consider, ${summary['your-call']} your-call, ${summary['fyi']} fyi`,
    `**Showing**: ${visible.length} suggestions (tier: ${TIER_LABELS[minTier]})`,
    '',
  ];

  // Group by tier
  for (const tier of TIER_ORDER) {
    const tierSuggestions = visible.filter(s => s.tier === tier);
    if (tierSuggestions.length === 0) continue;

    lines.push(`### ${TIER_ICONS[tier]} ${TIER_LABELS[tier]}`);
    lines.push('');

    for (const s of tierSuggestions) {
      lines.push(`#### ${s.title}`);
      lines.push(`- **Category**: ${s.category}`);
      if (s.location) lines.push(`- **Location**: ${s.location}`);
      lines.push(`- **Issue**: ${s.description}`);
      if (s.suggestion) lines.push(`- **Suggestion**: ${s.suggestion}`);
      lines.push(`- **Rationale**: ${s.rationale}`);
      if (s.gateRef) lines.push(`- **Gate**: ${s.gateRef}`);
      lines.push('');
    }
  }

  if (visible.length === 0) {
    lines.push('No suggestions at the current filter level. Lower the filter to see more.');
  }

  return lines.join('\n');
}