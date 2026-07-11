import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Position memory for the content viewer: last PDF page / last media second.
 * Single versioned AsyncStorage blob (same convention as jamiati_prefs_v1),
 * with an in-memory mirror so reads are synchronous after first hydration.
 */

const STORAGE_KEY = 'jamiati_viewer_positions_v1';
const MAX_ENTRIES = 150;
const PRUNE_TO = 100;
const SAVE_DEBOUNCE_MS = 1000;

export type PositionKind = 'page' | 'sec';

interface PositionEntry {
  k: PositionKind;
  val: number;
  at: number; // epoch ms of last update (for LRU pruning)
}

interface PositionsBlob {
  v: 1;
  items: Record<string, PositionEntry>;
}

let cache: PositionsBlob = { v: 1, items: {} };
let hydrated = false;
let hydrating: Promise<void> | null = null;
let saveTimer: ReturnType<typeof setTimeout> | null = null;

export async function hydratePositions(): Promise<void> {
  if (hydrated) return;
  if (!hydrating) {
    hydrating = (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw) as PositionsBlob;
          if (parsed && parsed.v === 1 && parsed.items && typeof parsed.items === 'object') {
            cache = parsed;
          }
        }
      } catch {
        // Corrupt blob — start fresh rather than crash the viewer.
        cache = { v: 1, items: {} };
      }
      hydrated = true;
    })();
  }
  return hydrating;
}

function scheduleFlush() {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    saveTimer = null;
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(cache)).catch(() => {});
  }, SAVE_DEBOUNCE_MS);
}

/** Get the saved position for a file (after hydratePositions resolves). */
export function getPosition(fileId: string, kind: PositionKind): number | null {
  const entry = cache.items[fileId];
  if (!entry || entry.k !== kind) return null;
  return entry.val;
}

/**
 * Save a position. Trivial positions are skipped (page 1, first seconds of
 * media) so the blob only holds meaningful resume points.
 */
export function savePosition(fileId: string, kind: PositionKind, value: number): void {
  if (!Number.isFinite(value)) return;
  if (kind === 'page' && value <= 1) {
    // Back at the start — clear any stale resume point.
    if (cache.items[fileId]) {
      delete cache.items[fileId];
      scheduleFlush();
    }
    return;
  }
  if (kind === 'sec' && value < 5) return;

  cache.items[fileId] = { k: kind, val: Math.floor(value), at: Date.now() };

  const ids = Object.keys(cache.items);
  if (ids.length > MAX_ENTRIES) {
    ids
      .sort((a, b) => cache.items[a].at - cache.items[b].at)
      .slice(0, ids.length - PRUNE_TO)
      .forEach((id) => delete cache.items[id]);
  }
  scheduleFlush();
}

/** Remove a stored position (e.g. media finished playing). */
export function clearPosition(fileId: string): void {
  if (cache.items[fileId]) {
    delete cache.items[fileId];
    scheduleFlush();
  }
}
