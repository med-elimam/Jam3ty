import { Linking, Platform } from 'react-native';
import * as WebBrowser from 'expo-web-browser';

/**
 * Root origin of the API (no /api suffix). Empty string in production, where the
 * web export is served same-origin as the API and relative URLs resolve correctly.
 */
export const API_BASE_URL = (process.env.EXPO_PUBLIC_API_BASE_URL ?? '').replace(/\/+$/, '');

/**
 * Resolve a file URL returned by the API into something openable.
 * Uploaded files are stored as API-relative paths (e.g. /uploads/admin/...),
 * external resources as absolute http(s) URLs. Returns null when the value
 * cannot be resolved into a safe http(s) URL.
 */
export function resolveFileUrl(fileUrl: string | null | undefined): string | null {
  if (!fileUrl) return null;
  const trimmed = fileUrl.trim();
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  if (trimmed.startsWith('/')) {
    if (API_BASE_URL) return `${API_BASE_URL}${trimmed}`;
    // Same-origin web build: a relative path resolves against the current origin.
    if (Platform.OS === 'web' && typeof window !== 'undefined') return `${window.location.origin}${trimmed}`;
    return null;
  }
  return null;
}

/**
 * Open an http(s) URL with the platform-appropriate handler.
 * Returns false when the URL is missing/unsafe or opening failed —
 * callers surface the error to the user in the active language.
 */
export async function openExternalUrl(url: string | null | undefined): Promise<boolean> {
  if (!url || !/^https?:\/\//i.test(url)) return false;
  try {
    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined') window.open(url, '_blank', 'noopener');
      return true;
    }
    await WebBrowser.openBrowserAsync(url);
    return true;
  } catch {
    try {
      await Linking.openURL(url);
      return true;
    } catch {
      return false;
    }
  }
}
