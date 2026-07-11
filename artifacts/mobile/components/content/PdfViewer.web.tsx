import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { getPosition } from '@/lib/viewerPositions';
import { ViewerLoading } from './ViewerLoading';
import { UnsupportedContentState } from './UnsupportedContentState';

/**
 * Web PDF viewer: an <iframe> over the (same-origin in production) PDF URL —
 * the browser's built-in viewer provides paging, zoom, and text search.
 * Position memory is restore-only via #page= (the plugin's state is not
 * readable from JS). Cross-origin PDFs that refuse framing fall back to the
 * unsupported state with a consented external open.
 */
export function PdfViewer({ fileId, uri }: { fileId: string; uri: string }) {
  const [failed, setFailed] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const savedPage = getPosition(fileId, 'page');
  const src = savedPage && savedPage > 1 ? `${uri}#page=${savedPage}` : uri;

  useEffect(() => {
    // Frame-refused PDFs never fire onload — treat a long silence as failure.
    timeoutRef.current = setTimeout(() => {
      if (!loaded) setFailed(true);
    }, 12000);
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [loaded]);

  if (failed) return <UnsupportedContentState url={uri} />;

  return (
    <View style={s.root}>
      {!loaded && (
        <View style={StyleSheet.absoluteFill}>
          <ViewerLoading />
        </View>
      )}
      <iframe
        src={src}
        title="PDF"
        style={{ border: 0, flex: 1, width: '100%', height: '100%' }}
        onLoad={() => setLoaded(true)}
        onError={() => setFailed(true)}
      />
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
});
