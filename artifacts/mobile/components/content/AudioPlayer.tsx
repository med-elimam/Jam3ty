import React, { useEffect, useRef, useState } from 'react';
import { LayoutChangeEvent, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { useColors } from '@/hooks/useColors';
import { usePreferences } from '@/contexts/PreferencesContext';
import { formatMediaTime } from '@/lib/content';
import { clearPosition, getPosition, savePosition } from '@/lib/viewerPositions';
import { fontSize, fontWeight, spacing } from '@/constants/theme';

const SPEEDS = [0.75, 1, 1.25, 1.5, 2] as const;
const SKIP_SECONDS = 15;

/**
 * In-app audio player (expo-audio): play/pause, tap-to-seek progress bar,
 * ±15s skip, speed control, resume from last position.
 */
export function AudioPlayer({ fileId, uri, title }: { fileId: string; uri: string; title: string }) {
  const colors = useColors();
  const { t, isRTL } = usePreferences();
  const player = useAudioPlayer(uri);
  const status = useAudioPlayerStatus(player);
  const [speed, setSpeed] = useState<number>(1);
  const [barWidth, setBarWidth] = useState(0);
  const appliedResume = useRef(false);
  const lastSaved = useRef(0);

  const duration = status.duration ?? 0;
  const current = status.currentTime ?? 0;
  const playing = status.playing;

  // Resume once the source is loaded.
  useEffect(() => {
    if (status.isLoaded && !appliedResume.current) {
      appliedResume.current = true;
      const saved = getPosition(fileId, 'sec');
      if (saved != null && saved > 5 && (duration <= 0 || saved < duration * 0.95)) {
        player.seekTo(saved);
      }
    }
  }, [status.isLoaded, duration, fileId, player]);

  // Persist position (~every 5s of playback) and clear near the end.
  useEffect(() => {
    if (!status.isLoaded) return;
    if (duration > 0 && current / duration > 0.95) {
      clearPosition(fileId);
      return;
    }
    if (Math.abs(current - lastSaved.current) >= 5) {
      lastSaved.current = current;
      savePosition(fileId, 'sec', current);
    }
  }, [current, duration, status.isLoaded, fileId]);

  const togglePlay = () => {
    if (playing) player.pause();
    else player.play();
  };

  const seekBy = (delta: number) => {
    const target = Math.min(Math.max(0, current + delta), duration > 0 ? duration : current + delta);
    player.seekTo(target);
  };

  const onBarLayout = (e: LayoutChangeEvent) => setBarWidth(e.nativeEvent.layout.width);

  const onBarPress = (x: number) => {
    if (barWidth <= 0 || duration <= 0) return;
    const ratio = Math.min(1, Math.max(0, isRTL ? 1 - x / barWidth : x / barWidth));
    player.seekTo(ratio * duration);
  };

  const applySpeed = (v: number) => {
    setSpeed(v);
    player.setPlaybackRate(v);
  };

  const progress = duration > 0 ? Math.min(1, current / duration) : 0;

  return (
    <View style={s.root}>
      <View style={[s.artCircle, { backgroundColor: colors.primary + '14', borderColor: colors.primary + '28' }]}>
        <Feather name="headphones" size={40} color={colors.primary} />
      </View>

      <Text style={[s.title, { color: colors.foreground }]} numberOfLines={2}>
        {title}
      </Text>

      {/* Progress bar (tap to seek) */}
      <Pressable
        onLayout={onBarLayout}
        onPress={(e) => onBarPress(e.nativeEvent.locationX)}
        style={[s.barTrack, { backgroundColor: colors.muted }]}
        accessibilityRole="adjustable"
        accessibilityLabel={title}
      >
        <View
          style={[
            s.barFill,
            {
              backgroundColor: colors.primary,
              width: `${progress * 100}%`,
              alignSelf: isRTL ? 'flex-end' : 'flex-start',
            },
          ]}
        />
      </Pressable>
      <View style={[s.timeRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
        <Text style={[s.time, { color: colors.mutedForeground }]}>{formatMediaTime(current)}</Text>
        <Text style={[s.time, { color: colors.mutedForeground }]}>{formatMediaTime(duration)}</Text>
      </View>

      {/* Transport controls */}
      <View style={[s.controls, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
        <TouchableOpacity onPress={() => seekBy(-SKIP_SECONDS)} activeOpacity={0.7} style={s.skipBtn}>
          <Feather name="rotate-ccw" size={22} color={colors.foreground} />
          <Text style={[s.skipLabel, { color: colors.mutedForeground }]}>{SKIP_SECONDS}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={togglePlay}
          activeOpacity={0.8}
          style={[s.playBtn, { backgroundColor: colors.primary }]}
          accessibilityRole="button"
        >
          <Feather name={playing ? 'pause' : 'play'} size={26} color={colors.primaryForeground} />
        </TouchableOpacity>

        <TouchableOpacity onPress={() => seekBy(SKIP_SECONDS)} activeOpacity={0.7} style={s.skipBtn}>
          <Feather name="rotate-cw" size={22} color={colors.foreground} />
          <Text style={[s.skipLabel, { color: colors.mutedForeground }]}>{SKIP_SECONDS}</Text>
        </TouchableOpacity>
      </View>

      {/* Speed */}
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
            <Text style={[s.speedText, { color: speed === v ? colors.primary : colors.mutedForeground }]}>{v}×</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.xl, gap: spacing.base },
  artCircle: {
    width: 108,
    height: 108,
    borderRadius: 54,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  title: { fontSize: fontSize.lg, fontWeight: fontWeight.semibold, textAlign: 'center' },
  barTrack: { width: '100%', height: 6, borderRadius: 3, overflow: 'hidden', marginTop: spacing.md },
  barFill: { height: '100%', borderRadius: 3 },
  timeRow: { width: '100%', justifyContent: 'space-between', marginTop: -spacing.sm },
  time: { fontSize: fontSize.xs, fontVariant: ['tabular-nums'] },
  controls: { alignItems: 'center', gap: spacing.xl, marginTop: spacing.sm },
  playBtn: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center' },
  skipBtn: { alignItems: 'center', justifyContent: 'center', width: 48, height: 48 },
  skipLabel: { fontSize: 9, marginTop: -2, fontWeight: fontWeight.semibold },
  speedRow: { alignItems: 'center', gap: spacing.xs, marginTop: spacing.sm },
  speedChip: { paddingHorizontal: spacing.sm + 2, paddingVertical: 4, borderRadius: 999, borderWidth: 1 },
  speedText: { fontSize: fontSize.xs, fontWeight: fontWeight.semibold },
});
