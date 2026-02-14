/**
 * ARFaceCapture - Camera view for face capture to create avatar.
 *
 * Displays front-facing camera with oval guide overlay for face positioning,
 * capture button with haptic feedback, and retake option.
 */
import React, { useState, useRef, useCallback, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, Platform } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Camera, useCameraDevice } from 'react-native-vision-camera';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import { GlassButton, GlassLoadingSpinner } from '@bayit/shared/ui';
import { Colors } from '../../theme/colors';
import logger from '@/utils/logger';

const captureLogger = logger.scope('ARFaceCapture');

interface ARFaceCaptureProps {
  onCapture: (imageUri: string) => void;
  onCancel: () => void;
}

type CapturePhase = 'requesting' | 'ready' | 'captured' | 'denied';

const haptic = (type: string) => {
  if (Platform.OS === 'ios') ReactNativeHapticFeedback.trigger(type);
};

export const ARFaceCapture: React.FC<ARFaceCaptureProps> = ({
  onCapture,
  onCancel,
}) => {
  const { t } = useTranslation();
  const cameraRef = useRef<Camera>(null);
  const [phase, setPhase] = useState<CapturePhase>('requesting');
  const [capturedUri, setCapturedUri] = useState<string | null>(null);
  const device = useCameraDevice('front');

  useEffect(() => {
    (async () => {
      const status = await Camera.requestCameraPermission();
      setPhase(status === 'granted' ? 'ready' : 'denied');
      captureLogger.info('Camera permission result', { status });
    })();
  }, []);

  const handleCapture = useCallback(async () => {
    if (!cameraRef.current) return;
    try {
      haptic('impactMedium');
      const photo = await cameraRef.current.takePhoto({ flash: 'off' });
      const uri = `file://${photo.path}`;
      setCapturedUri(uri);
      setPhase('captured');
      captureLogger.info('Face captured', { path: photo.path });
    } catch (err: unknown) {
      captureLogger.error('Capture failed', { error: err });
    }
  }, []);

  const handleRetake = useCallback(() => {
    setCapturedUri(null);
    setPhase('ready');
    haptic('impactLight');
  }, []);

  const handleConfirm = useCallback(() => {
    if (capturedUri) {
      onCapture(capturedUri);
      haptic('notificationSuccess');
    }
  }, [capturedUri, onCapture]);

  if (phase === 'requesting') {
    return (
      <SafeAreaView style={styles.container}>
        <GlassLoadingSpinner />
      </SafeAreaView>
    );
  }

  if (phase === 'denied') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centeredContent}>
          <Text style={styles.deniedText}
            accessibilityRole="text"
            accessibilityLabel={t('zehAni.faceCapture.permissionDenied')}>
            {t('zehAni.faceCapture.permissionDenied')}
          </Text>
          <GlassButton title={t('common.cancel')} onPress={onCancel}
            variant="secondary" accessibilityLabel={t('common.cancel')}
            accessibilityHint={t('zehAni.faceCapture.cancelHint')}
            accessibilityRole="button" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.cameraContainer}>
        {device && phase === 'ready' && (
          <Camera ref={cameraRef} device={device} isActive photo
            style={StyleSheet.absoluteFill} />
        )}
        {phase === 'ready' && (
          <View style={styles.guideOverlay} pointerEvents="none">
            <View style={styles.faceGuide}
              accessibilityLabel={t('zehAni.faceCapture.guideLabel')} />
            <Text style={styles.guideText}>
              {t('zehAni.faceCapture.positionFace')}
            </Text>
          </View>
        )}
      </View>
      <View style={styles.controls}>
        {phase === 'ready' && (
          <>
            <GlassButton title={t('common.cancel')} onPress={onCancel}
              variant="secondary" accessibilityLabel={t('common.cancel')}
              accessibilityHint={t('zehAni.faceCapture.cancelHint')}
              accessibilityRole="button" />
            <GlassButton title={t('zehAni.faceCapture.capture')}
              onPress={handleCapture} variant="primary"
              accessibilityLabel={t('zehAni.faceCapture.capture')}
              accessibilityHint={t('zehAni.faceCapture.captureHint')}
              accessibilityRole="button" />
          </>
        )}
        {phase === 'captured' && (
          <>
            <GlassButton title={t('zehAni.faceCapture.retake')}
              onPress={handleRetake} variant="secondary"
              accessibilityLabel={t('zehAni.faceCapture.retake')}
              accessibilityHint={t('zehAni.faceCapture.retakeHint')}
              accessibilityRole="button" />
            <GlassButton title={t('zehAni.faceCapture.confirm')}
              onPress={handleConfirm} variant="primary"
              accessibilityLabel={t('zehAni.faceCapture.confirm')}
              accessibilityHint={t('zehAni.faceCapture.confirmHint')}
              accessibilityRole="button" />
          </>
        )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.Background.primary },
  centeredContent: {
    flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, gap: 16,
  },
  deniedText: {
    fontSize: 16, color: Colors.Text.secondary, textAlign: 'center', marginBottom: 12,
  },
  cameraContainer: { flex: 1, overflow: 'hidden' },
  guideOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center', alignItems: 'center',
  },
  faceGuide: {
    width: 220, height: 290, borderRadius: 110,
    borderWidth: 2, borderColor: Colors.Glass.whiteStrong, borderStyle: 'dashed',
  },
  guideText: {
    fontSize: 14, color: Colors.Text.primary, marginTop: 16, textAlign: 'center',
  },
  controls: {
    flexDirection: 'row', justifyContent: 'space-evenly', alignItems: 'center',
    paddingVertical: 16, paddingHorizontal: 24,
    backgroundColor: Colors.Background.elevated,
  },
});
