import React from 'react';
import { UnsupportedContentState } from './UnsupportedContentState';

/**
 * Office documents / spreadsheets / presentations and external links.
 * Until the server-side conversion pipeline exists (Phase 3), these render the
 * unsupported state with a consented external-open fallback.
 */
export function DocumentViewer({ url }: { url: string | null }) {
  return <UnsupportedContentState url={url} />;
}
