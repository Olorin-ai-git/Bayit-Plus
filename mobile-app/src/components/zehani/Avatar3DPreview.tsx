/**
 * Avatar3DPreview - 3D avatar preview with rotation gestures.
 *
 * Uses PanResponder to track horizontal drag and rotate the avatar preview.
 * Loads avatar image from a signed URL and applies rotation transform.
 */
import React, { useRef } from 'react';
import {
  View, Image, StyleSheet, PanResponder, Animated,
  type ViewStyle, type StyleProp,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { GlassLoadingSpinner } from '@bayit/shared/ui';
import { Colors } from '../../theme/colors';
import logger from '@/utils/logger';

const previewLogger = logger.scope('Avatar3DPreview');

interface Avatar3DPreviewProps {
  avatarUrl: string;
  style?: StyleProp<ViewStyle>;
}

const ROTATION_SENSITIVITY = 0.5;
const MAX_ROTATION_DEG = 45;

export const Avatar3DPreview: React.FC<Avatar3DPreviewProps> = ({
  avatarUrl,
  style,
}) => {
  const { t } = useTranslation();
  const rotationDeg = useRef(new Animated.Value(0)).current;
  const lastRotation = useRef(0);
  const [imageLoaded, setImageLoaded] = React.useState(false);
  const [loadError, setLoadError] = React.useState(false);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        rotationDeg.stopAnimation((val) => {
          lastRotation.current = val;
        });
      },
      onPanResponderMove: (_evt, gestureState) => {
        const newRotation = lastRotation.current + gestureState.dx * ROTATION_SENSITIVITY;
        const clamped = Math.max(-MAX_ROTATION_DEG, Math.min(MAX_ROTATION_DEG, newRotation));
        rotationDeg.setValue(clamped);
      },
      onPanResponderRelease: () => {
        Animated.spring(rotationDeg, {
          toValue: 0,
          friction: 5,
          tension: 40,
          useNativeDriver: true,
        }).start();
        lastRotation.current = 0;
        previewLogger.info('Rotation gesture completed');
      },
    }),
  ).current;

  const rotateInterpolation = rotationDeg.interpolate({
    inputRange: [-MAX_ROTATION_DEG, MAX_ROTATION_DEG],
    outputRange: [`-${MAX_ROTATION_DEG}deg`, `${MAX_ROTATION_DEG}deg`],
  });

  return (
    <View style={[styles.container, style]}
      accessibilityLabel={t('zehAni.avatar3d.previewLabel')}
      accessibilityHint={t('zehAni.avatar3d.dragToRotate')}
      accessibilityRole="image"
      {...panResponder.panHandlers}>
      {!imageLoaded && !loadError && (
        <View style={styles.loaderOverlay}>
          <GlassLoadingSpinner />
        </View>
      )}
      {loadError ? (
        <View style={styles.errorContainer}>
          <Animated.Text style={styles.errorText}>
            {t('zehAni.avatar3d.loadFailed')}
          </Animated.Text>
        </View>
      ) : (
        <Animated.Image
          source={{ uri: avatarUrl }}
          style={[styles.avatarImage, { transform: [{ rotateY: rotateInterpolation }] }]}
          resizeMode="contain"
          onLoad={() => setImageLoaded(true)}
          onError={() => {
            setLoadError(true);
            previewLogger.error('Avatar image load failed', { avatarUrl });
          }}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: 280, height: 280, borderRadius: 20,
    backgroundColor: Colors.Glass.whiteSubtle, overflow: 'hidden',
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: Colors.Glass.whiteMedium,
  },
  avatarImage: { width: 260, height: 260 },
  loaderOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center', alignItems: 'center',
    backgroundColor: Colors.Glass.bgLight,
  },
  errorContainer: {
    flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20,
  },
  errorText: {
    fontSize: 14, color: Colors.Text.muted, textAlign: 'center',
  },
});
