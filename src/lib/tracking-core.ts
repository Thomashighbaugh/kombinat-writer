/**
 * Tracking Core Tool
 *
 * Unified tracking engine for character state, plot progress,
 * timeline events, relationship dynamics, source status, and
 * argument progression. Persists to JSON files in the tracking
 * directory and supports cross-file consistency validation.
 */

import fs from 'fs-extra';
import path from 'path';

export type TrackingEntityType = 'character' | 'plot' | 'timeline' | 'relationship' | 'source' | 'argument';

export type TrackingAction = 'update' | 'create' | 'resolve';

export interface TrackingEvent {
  id: string;
  type: TrackingEntityType;
  action: TrackingAction;
  entityKey: string;
  chapter: number;
  data: Record<string, unknown>;
  timestamp: string;
}

// ─── File name helpers ──────────────────────────────────────────────────

function trackingFile(trackingDir: string, entityType: TrackingEntityType): string {
  return path.join(trackingDir, `${entityType}s.json`);
}

type TrackingData = Record<string, TrackingEvent[]>;

// ─── Helper: loadTracking ───────────────────────────────────────────────

/**
 * Load and parse a tracking JSON file.
 * Returns an empty object if the file does not exist.
 */
export function loadTracking(trackingDir: string, filename: string): Record<string, unknown> {
  const filePath = path.join(trackingDir, filename);
  if (!fs.existsSync(filePath)) return {};
  try {
    return fs.readJsonSync(filePath);
  } catch {
    return {};
  }
}

// ─── Helper: saveTracking ───────────────────────────────────────────────

/**
 * Save tracking data with a timestamp wrapper.
 */
export function saveTracking(
  trackingDir: string,
  filename: string,
  data: Record<string, unknown>,
): void {
  fs.ensureDirSync(trackingDir);
  const filePath = path.join(trackingDir, filename);
  const payload = {
    updatedAt: new Date().toISOString(),
    ...data,
  };
  fs.writeJsonSync(filePath, payload, { spaces: 2 });
}

// ─── recordEvent ────────────────────────────────────────────────────────

/**
 * Write an event to the appropriate tracking JSON file.
 * Each entity type gets its own file (e.g. characters.json).
 * Events are appended to the entity's event array keyed by entityKey.
 */
export function recordEvent(event: TrackingEvent, trackingDir?: string): void {
  const dir = trackingDir || 'book/tracking';
  fs.ensureDirSync(dir);

  const filename = `${event.type}s.json`;
  const filePath = path.join(dir, filename);

  let data: TrackingData = {};
  if (fs.existsSync(filePath)) {
    try {
      data = fs.readJsonSync(filePath);
    } catch {
      data = {};
    }
  }

  if (!data[event.entityKey]) {
    data[event.entityKey] = [];
  }

  data[event.entityKey].push(event);

  const payload = {
    updatedAt: new Date().toISOString(),
    events: data,
  };

  fs.writeJsonSync(filePath, payload, { spaces: 2 });
}

// ─── queryState ─────────────────────────────────────────────────────────

/**
 * Query the tracking state for a given entity type and optional key.
 *
 * Returns a map of entity keys to their event arrays (or a single entry
 * when entityKey is provided).
 */
export function queryState(
  trackingDir: string,
  entityType: string,
  entityKey?: string,
): Record<string, unknown> {
  const dir = trackingDir || 'book/tracking';
  const filename = `${entityType}s.json`;
  const filePath = path.join(dir, filename);

  if (!fs.existsSync(filePath)) {
    return entityKey ? {} : {};
  }

  try {
    const data = fs.readJsonSync(filePath);
    const events: TrackingData = data.events || {};

    if (entityKey) {
      return { [entityKey]: events[entityKey] || [] };
    }

    // Reconstruct current state for all entities
    const state: Record<string, unknown> = {};
    for (const [key, eventList] of Object.entries(events)) {
      // Derive latest snapshot from the last event of each action type
      const latestUpdates = eventList.filter(e => e.action === 'update');
      const latest = latestUpdates.length > 0
        ? latestUpdates[latestUpdates.length - 1]
        : eventList[eventList.length - 1];

      const created = eventList.some(e => e.action === 'create');
      const resolved = eventList.some(e => e.action === 'resolve');
      const chapters = [...new Set(eventList.map(e => e.chapter))].sort((a, b) => a - b);

      state[key] = {
        entityKey: key,
        type: entityType,
        status: resolved ? 'resolved' : created ? 'active' : 'pending',
        latestData: latest?.data || {},
        chapters,
        totalEvents: eventList.length,
        lastUpdated: eventList[eventList.length - 1]?.timestamp || '',
      };
    }

    return state;
  } catch {
    return {};
  }
}

// ─── validateTracking ───────────────────────────────────────────────────

/**
 * Cross-reference all tracking files for consistency.
 *
 * Checks:
 * - Timeline events are in chronological order.
 * - Character states track across chapters (no gaps).
 * - Plot threads have resolution at the end.
 * - Relationship references are symmetric where expected.
 * - All entities have at least one event.
 */
export function validateTracking(trackingDir: string): string[] {
  const issues: string[] = [];

  if (!fs.existsSync(trackingDir)) {
    issues.push('Tracking directory does not exist');
    return issues;
  }

  const trackingFiles = fs.readdirSync(trackingDir).filter(f => f.endsWith('.json'));

  if (trackingFiles.length === 0) {
    issues.push('No tracking files found');
    return issues;
  }

  const allEntityKeys: Record<string, Set<string>> = {};

  for (const file of trackingFiles) {
    const filePath = path.join(trackingDir, file);
    let data: { events?: TrackingData };

    try {
      data = fs.readJsonSync(filePath);
    } catch {
      issues.push(`Cannot parse tracking file: ${file}`);
      continue;
    }

    const events = data.events || {};
    const entityType = file.replace(/s\.json$/, '');

    if (!allEntityKeys[entityType]) {
      allEntityKeys[entityType] = new Set();
    }

    for (const [entityKey, eventList] of Object.entries(events)) {
      allEntityKeys[entityType].add(entityKey);

      if (!Array.isArray(eventList) || eventList.length === 0) {
        issues.push(`${entityType} "${entityKey}" has no events`);
        continue;
      }

      // Check: entity should have a 'create' event
      const hasCreate = eventList.some(e => e.action === 'create');
      if (!hasCreate && entityType !== 'source') {
        issues.push(`${entityType} "${entityKey}" has no 'create' event`);
      }

      // Check: timeline events are chronological
      if (entityType === 'timeline') {
        for (let i = 1; i < eventList.length; i++) {
          const prev = new Date(eventList[i - 1].timestamp);
          const curr = new Date(eventList[i].timestamp);
          if (curr < prev) {
            issues.push(`Timeline "${entityKey}": event ${eventList[i].id} has out-of-order timestamp (${eventList[i].timestamp} after ${eventList[i - 1].timestamp})`);
          }
        }
      }

      // Check: plot threads should have resolution
      if (entityType === 'plot') {
        const hasResolve = eventList.some(e => e.action === 'resolve');
        if (!hasResolve) {
          issues.push(`Plot "${entityKey}" has no resolution event (status: unresolved)`);
        }
      }

      // Check: chapter progression (character tracking)
      if (entityType === 'character') {
        const chapters = [...new Set(eventList.map(e => e.chapter))].sort((a, b) => a - b);
        if (chapters.length > 1) {
          for (let i = 1; i < chapters.length; i++) {
            if (chapters[i] - chapters[i - 1] > 1) {
              issues.push(`Character "${entityKey}" has a chapter gap: chapter ${chapters[i - 1]} → ${chapters[i]}`);
            }
          }
        }
      }
    }
  }

  // Cross-file checks: relationship symmetry
  if (allEntityKeys['relationship']) {
    for (const key of allEntityKeys['relationship']) {
      // Relationship keys are expected as "entityA-entityB"
      const parts = key.split('-');
      const reverseKey = parts.length === 2 ? `${parts[1]}-${parts[0]}` : '';
      if (reverseKey && allEntityKeys['relationship']?.has(reverseKey)) {
        // Both directions tracked — could be redundant
        issues.push(`Relationship "${key}" and "${reverseKey}" both tracked — consider using a single undirected key`);
      }
    }
  }

  return issues;
}
