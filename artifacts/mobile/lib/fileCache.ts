import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';

/**
 * Local cache for remote content files (native only).
 * Web returns the URL unchanged and relies on the browser HTTP cache.
 * LRU index kept in AsyncStorage; total size capped.
 */

const INDEX_KEY = 'jamiati_filecache_index_v1';
const MAX_TOTAL_BYTES = 200 * 1024 * 1024; // 200MB

interface CacheIndexEntry {
  name: string; // stored filename inside the cache dir
  size: number;
  at: number; // last access (epoch ms)
}

interface CacheIndex {
  v: 1;
  items: Record<string, CacheIndexEntry>; // keyed by source URL hash
}

function cacheDir(): string {
  return `${FileSystem.cacheDirectory}content/`;
}

/** djb2 hash → hex, stable filename key for a URL. */
function hashUrl(url: string): string {
  let h = 5381;
  for (let i = 0; i < url.length; i++) h = ((h << 5) + h + url.charCodeAt(i)) >>> 0;
  return h.toString(16);
}

function extOf(url: string): string {
  const m = /\.([a-z0-9]{1,5})(?:[?#]|$)/i.exec(url);
  return m ? `.${m[1].toLowerCase()}` : '';
}

async function loadIndex(): Promise<CacheIndex> {
  try {
    const raw = await AsyncStorage.getItem(INDEX_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as CacheIndex;
      if (parsed?.v === 1 && parsed.items) return parsed;
    }
  } catch {
    // fall through to fresh index
  }
  return { v: 1, items: {} };
}

async function saveIndex(index: CacheIndex): Promise<void> {
  await AsyncStorage.setItem(INDEX_KEY, JSON.stringify(index)).catch(() => {});
}

async function ensureDir(): Promise<void> {
  const info = await FileSystem.getInfoAsync(cacheDir());
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(cacheDir(), { intermediates: true });
  }
}

async function pruneIfNeeded(index: CacheIndex): Promise<void> {
  const entries = Object.entries(index.items);
  let total = entries.reduce((sum, [, e]) => sum + (e.size || 0), 0);
  if (total <= MAX_TOTAL_BYTES) return;

  // Evict least-recently-accessed until under the cap.
  const byOldest = entries.sort((a, b) => a[1].at - b[1].at);
  for (const [key, entry] of byOldest) {
    if (total <= MAX_TOTAL_BYTES) break;
    await FileSystem.deleteAsync(cacheDir() + entry.name, { idempotent: true }).catch(() => {});
    total -= entry.size || 0;
    delete index.items[key];
  }
}

/**
 * Resolve a remote URL to a local file:// URI, downloading on first access.
 * On web (or on failure) returns the original URL so callers can stream it.
 * onProgress receives 0..1 during first download.
 */
export async function getCachedFileUri(
  url: string,
  onProgress?: (ratio: number) => void,
): Promise<string> {
  if (Platform.OS === 'web') return url;

  try {
    await ensureDir();
    const index = await loadIndex();
    const key = hashUrl(url);
    const existing = index.items[key];

    if (existing) {
      const path = cacheDir() + existing.name;
      const info = await FileSystem.getInfoAsync(path);
      if (info.exists) {
        existing.at = Date.now();
        await saveIndex(index);
        return path;
      }
      delete index.items[key]; // stale index entry
    }

    const name = key + extOf(url);
    const target = cacheDir() + name;

    let result: FileSystem.FileSystemDownloadResult;
    if (onProgress) {
      const task = FileSystem.createDownloadResumable(url, target, {}, (p) => {
        if (p.totalBytesExpectedToWrite > 0) {
          onProgress(p.totalBytesWritten / p.totalBytesExpectedToWrite);
        }
      });
      const r = await task.downloadAsync();
      if (!r) throw new Error('download cancelled');
      result = r;
    } else {
      result = await FileSystem.downloadAsync(url, target);
    }

    if (result.status !== 200) {
      await FileSystem.deleteAsync(target, { idempotent: true }).catch(() => {});
      throw new Error(`HTTP ${result.status}`);
    }

    const info = await FileSystem.getInfoAsync(target);
    index.items[key] = { name, size: info.exists ? (info.size ?? 0) : 0, at: Date.now() };
    await pruneIfNeeded(index);
    await saveIndex(index);
    return target;
  } catch {
    // Any cache failure falls back to streaming the remote URL directly.
    return url;
  }
}
