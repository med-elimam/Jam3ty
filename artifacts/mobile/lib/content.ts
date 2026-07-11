import { Feather } from '@expo/vector-icons';

/**
 * Content-kind derivation for the unified in-app content viewer.
 * Pure helpers — no React, no platform APIs.
 */

export type ContentKind =
  | 'pdf'
  | 'image'
  | 'video'
  | 'audio'
  | 'text'
  | 'link'
  | 'unsupported';

const OFFICE_MIMES = new Set([
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
]);

const EXT_KINDS: Record<string, ContentKind> = {
  pdf: 'pdf',
  jpg: 'image', jpeg: 'image', png: 'image', webp: 'image', gif: 'image',
  mp4: 'video', webm: 'video', mov: 'video', m4v: 'video',
  mp3: 'audio', m4a: 'audio', wav: 'audio', aac: 'audio', ogg: 'audio',
  txt: 'text', md: 'text',
};

/** Extract a lowercase extension from a URL path (ignoring query/hash). */
function urlExtension(url: string): string | null {
  const path = url.split(/[?#]/)[0];
  const m = /\.([a-z0-9]{1,5})$/i.exec(path);
  return m ? m[1].toLowerCase() : null;
}

/**
 * Decide how the viewer should render a file.
 * Mime type wins; falls back to the URL extension; external URLs with no
 * recognizable direct-media shape are treated as 'link' (consented external
 * open only — we never render arbitrary webpages).
 */
export function deriveContentKind(mimeType: string | null | undefined, fileUrl: string): ContentKind {
  const mime = (mimeType ?? '').toLowerCase().trim();

  if (mime === 'application/pdf') return 'pdf';
  if (mime.startsWith('image/')) return 'image';
  if (mime.startsWith('video/')) return 'video';
  if (mime.startsWith('audio/')) return 'audio';
  if (mime.startsWith('text/')) return 'text';
  if (OFFICE_MIMES.has(mime)) return 'unsupported';

  // Unknown/generic mime — try the URL extension.
  const ext = urlExtension(fileUrl);
  if (ext && EXT_KINDS[ext]) return EXT_KINDS[ext];

  // External http(s) URL without a direct-media shape → external link.
  if (/^https?:\/\//i.test(fileUrl.trim())) return 'link';

  return 'unsupported';
}

/** Feather icon per academic file type — shared by list rows and the detail screen. */
export const FILE_ICON: Record<string, keyof typeof Feather.glyphMap> = {
  lecture: 'book-open',
  td: 'edit-3',
  tp: 'tool',
  summary: 'file-text',
  exam: 'award',
  correction: 'check-circle',
  book: 'book',
  other: 'file',
};

/** Feather icon per content kind (viewer chrome / detail badge). */
export const KIND_ICON: Record<ContentKind, keyof typeof Feather.glyphMap> = {
  pdf: 'file-text',
  image: 'image',
  video: 'film',
  audio: 'headphones',
  text: 'align-right',
  link: 'external-link',
  unsupported: 'help-circle',
};

/** Human file size: 512000 → "500 KB". Localized unit labels stay Latin (KB/MB) in both langs. */
export function formatFileSize(bytes: number | null | undefined): string | null {
  if (bytes == null || !Number.isFinite(bytes) || bytes <= 0) return null;
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${Math.round(kb)} KB`;
  const mb = kb / 1024;
  return `${mb < 10 ? mb.toFixed(1) : Math.round(mb)} MB`;
}

/** "mm:ss" or "h:mm:ss" for media durations/positions (seconds). */
export function formatMediaTime(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const mm = h > 0 ? String(m).padStart(2, '0') : String(m);
  return `${h > 0 ? `${h}:` : ''}${mm}:${String(sec).padStart(2, '0')}`;
}
