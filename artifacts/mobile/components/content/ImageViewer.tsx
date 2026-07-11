import React from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import { Image } from 'expo-image';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { ViewerLoading } from './ViewerLoading';
import { ViewerError } from './ViewerError';

const MAX_SCALE = 5;
const DOUBLE_TAP_SCALE = 2.5;

/**
 * Fullscreen zoomable image viewer: pinch to zoom, pan when zoomed,
 * double-tap to toggle 1x/2.5x. Accepts an array for future galleries
 * (today callers always pass a single image).
 */
export function ImageViewer({ images, description }: { images: string[]; description?: string | null }) {
  // Gallery pager is a Phase-2 concern; render the first image today.
  const uri = images[0];
  const { width, height } = useWindowDimensions();
  const [status, setStatus] = React.useState<'loading' | 'ready' | 'error'>('loading');
  const [retryKey, setRetryKey] = React.useState(0);

  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const tx = useSharedValue(0);
  const ty = useSharedValue(0);
  const savedTx = useSharedValue(0);
  const savedTy = useSharedValue(0);

  const clampOffsets = () => {
    'worklet';
    const maxX = (width * (scale.value - 1)) / 2;
    const maxY = (height * (scale.value - 1)) / 2;
    tx.value = Math.min(maxX, Math.max(-maxX, tx.value));
    ty.value = Math.min(maxY, Math.max(-maxY, ty.value));
  };

  const pinch = Gesture.Pinch()
    .onUpdate((e) => {
      scale.value = Math.min(MAX_SCALE, Math.max(1, savedScale.value * e.scale));
      clampOffsets();
    })
    .onEnd(() => {
      savedScale.value = scale.value;
      if (scale.value <= 1.02) {
        scale.value = withTiming(1);
        savedScale.value = 1;
        tx.value = withTiming(0);
        ty.value = withTiming(0);
        savedTx.value = 0;
        savedTy.value = 0;
      }
    });

  const pan = Gesture.Pan()
    .minPointers(1)
    .onUpdate((e) => {
      if (scale.value <= 1) return;
      tx.value = savedTx.value + e.translationX;
      ty.value = savedTy.value + e.translationY;
      clampOffsets();
    })
    .onEnd(() => {
      savedTx.value = tx.value;
      savedTy.value = ty.value;
    });

  const doubleTap = Gesture.Tap()
    .numberOfTaps(2)
    .onEnd(() => {
      if (scale.value > 1) {
        scale.value = withTiming(1);
        savedScale.value = 1;
        tx.value = withTiming(0);
        ty.value = withTiming(0);
        savedTx.value = 0;
        savedTy.value = 0;
      } else {
        scale.value = withTiming(DOUBLE_TAP_SCALE);
        savedScale.value = DOUBLE_TAP_SCALE;
      }
    });

  const composed = Gesture.Simultaneous(pinch, pan, doubleTap);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: tx.value }, { translateY: ty.value }, { scale: scale.value }],
  }));

  if (status === 'error') {
    return (
      <ViewerError
        onRetry={() => {
          setStatus('loading');
          setRetryKey((k) => k + 1);
        }}
      />
    );
  }

  return (
    <View style={s.root}>
      <GestureDetector gesture={composed}>
        <Animated.View style={[s.stage, animatedStyle]}>
          <Image
            key={retryKey}
            source={{ uri }}
            style={{ width, height }}
            contentFit="contain"
            accessibilityLabel={description ?? undefined}
            transition={120}
            onLoad={() => setStatus('ready')}
            onError={() => setStatus('error')}
          />
        </Animated.View>
      </GestureDetector>
      {status === 'loading' && (
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
          <ViewerLoading />
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  stage: { alignItems: 'center', justifyContent: 'center' },
});
