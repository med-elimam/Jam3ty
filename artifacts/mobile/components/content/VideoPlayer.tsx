import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useEvent, useEventListener } from 'expo';
import { useColors } from '@/hooks/useColors';
import { usePreferences } from '@/contexts/PreferencesContext';
import { formatMediaTime } from '@/lib/content';
import { clearPosition, getPosition, savePosition } from '@/lib/viewerPositions';
import { fontSize, fontWeight, spacing } from '@/constants/theme';

const SPEEDS = [0.75, 1, 1.25, 1.5, 2] as const;

/**
 * In-app video player (expo-video): native controls + fullscreen, a speed row,
 * and resume-from-last-position via the shared viewer position store.
 */
export function VideoPlayer({ fileId, uri }: { fileId: string; uri: string }) {
  const colors = useColors();
  const { t, isRTL } = usePreferences();
  const [speed, setSpeed] = useState<number>(1);
  const [resumeAt, setResumeAt] = useState<number | null>(() => getPosition(fileId, 'sec'));
  const appliedResume = useRef(false);

  const player = useVideoPlayer(uri, (p) => {
    p.timeUpdateEventInterval = 5;
  });

  // Persist position every 5s while playing; clear when ~finished.
  useEventListener(player, 'timeUpdate', (payload) => {
    const t0 = payload.currentTime;
    const dur = player.duration;
    if (dur > 0 && t0 / dur > 0.95) {
      clearPosition(fileId);
    } else {
      savePosition(fileId, 'sec', t0);
    }
  });

  // Auto-resume once metadata is ready (spec: resume from last position).
  const { status } = useEvent(player, 'statusChange', { status: player.status });
  useEffect(() => {
    if (status === 'readyToPlay' && !appliedResume.current) {
      appliedResume.current = true;
      const saved = getPosition(fileId, 'sec');
      if (saved != null && saved > 5 && (player.duration <= 0 || saved < player.duration * 0.95)) {
        player.currentTime = saved;
        setResumeAt(saved);
      }
    }
  }, [status, fileId, player]);

  const applySpeed = (v: number) => {
    setSpeed(v);
    player.playbackRate = v;
  };

  return (
    <View style={s.root}>
      <VideoView
        player={player}
        style={s.video}
        allowsFullscreen
        allowsPictureInPicture={false}
        nativeControls
        contentFit="contain"
      />

      <View style={[s.bottomBar, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
        {resumeAt != null && resumeAt > 5 && (
          <Text style={[s.resumeText, { color: colors.mutedForeground }]}>
            {t('content.resumeAt', { t: formatMediaTime(resumeAt) })}
          </Text>
        )}
        <View style={[s.speedRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          {SPEEDS.map((v) => (
            <TouchableOpacity
              key={v}
              onPress={() => applySpeed(v)}
              activeOpacity={0.75}
              style={[
                s.speedChip,
                {
                  borderColor: speed === v ? colors.primary : colors.border,
                  backgroundColor: speed === v ? colors.primary + '14' : 'transparent',
                },
              ]}
            >
              <Text style={[s.speedText, { color: speed === v ? colors.primary : colors.mutedForeground }]}>
                {v}×
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  video: { flex: 1 },
  bottomBar: {
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  resumeText: { fontSize: fontSize.xs },
  speedRow: { alignItems: 'center', gap: spacing.xs },
  speedChip: {
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
  },
  speedText: { fontSize: fontSize.xs, fontWeight: fontWeight.semibold },
});
