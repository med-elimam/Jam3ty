import React from 'react';
import { deriveContentKind } from '@/lib/content';
import { PdfViewer } from './PdfViewer';
import { ImageViewer } from './ImageViewer';
import { VideoPlayer } from './VideoPlayer';
import { AudioPlayer } from './AudioPlayer';
import { RichTextViewer } from './RichTextViewer';
import { DocumentViewer } from './DocumentViewer';

/**
 * Lightweight description of a viewable item. AcademicFile rows map onto this;
 * Phase 2 callers (assignment attachments, announcement bodies) can construct
 * it directly from a URL.
 */
export interface ViewableContent {
  /** Stable id used for position memory (file id, or a URL-derived key). */
  id: string;
  title: string;
  mimeType?: string | null;
  /** Resolved absolute URL (already passed through resolveFileUrl). */
  url: string | null;
  /** Inline text body — when set with kind 'text', rendered as an article. */
  textBody?: string | null;
  textMeta?: string | null;
}

/**
 * The single dispatcher every screen must use to render content.
 * No screen may implement its own viewer.
 */
export function ContentViewer({ content }: { content: ViewableContent }) {
  if (content.textBody) {
    return <RichTextViewer title={content.title} meta={content.textMeta ?? undefined} body={content.textBody} />;
  }

  if (!content.url) {
    return <DocumentViewer url={null} />;
  }

  const kind = deriveContentKind(content.mimeType, content.url);

  switch (kind) {
    case 'pdf':
      return <PdfViewer fileId={content.id} uri={content.url} />;
    case 'image':
      return <ImageViewer images={[content.url]} description={content.title} />;
    case 'video':
      return <VideoPlayer fileId={content.id} uri={content.url} />;
    case 'audio':
      return <AudioPlayer fileId={content.id} uri={content.url} title={content.title} />;
    case 'text':
    case 'link':
    case 'unsupported':
    default:
      return <DocumentViewer url={content.url} />;
  }
}
