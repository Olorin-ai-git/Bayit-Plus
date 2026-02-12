/**
 * VideoSelfieScreen - Video selfie capture for avatar enhancement
 *
 * Camera preview with oval face guide, 10-second recording with countdown,
 * encrypted upload to backend, state machine: idle -> preview -> recording -> uploading -> complete.
 */
import React, { useState, useRef, useCallback, useEffect } from 'react';
import { View, Text, SafeAreaView, Platform } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import { Camera, useCameraDevice, useCameraFormat } from 'react-native-vision-camera';
import { useDirection } from '@bayit/shared-hooks';
import { NativeIcon } from '@olorin/shared-icons/native';
import { GlassButton, GlassLoadingSpinner } from '@bayit/shared/ui';
import api from '@bayit/shared-services/api';
import { Colors } from '../theme/colors';
import logger from '@/utils/logger';

const selfieLogger = logger.scope('VideoSelfieScreen');
const RECORDING_DURATION_SEC = 10;
type CapturePhase = 'idle' | 'preview' | 'recording' | 'uploading' | 'complete';

const haptic = (type: string) => { if (Platform.OS === 'ios') ReactNativeHapticFeedback.trigger(type); };

export const VideoSelfieScreen: React.FC = () => {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { t } = useTranslation();
  const { textAlign } = useDirection();
  const { avatarId } = route.params;

  const cameraRef = useRef<Camera>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const [phase, setPhase] = useState<CapturePhase>('idle');
  const [countdown, setCountdown] = useState(RECORDING_DURATION_SEC);
  const [hasPermission, setHasPermission] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const device = useCameraDevice('front');
  const format = useCameraFormat(device, [{ videoResolution: { width: 720, height: 1280 } }]);

  useEffect(() => {
    (async () => {
      const cam = await Camera.requestCameraPermission();
      const mic = await Camera.requestMicrophonePermission();
      const granted = cam === 'granted' && mic === 'granted';
      setHasPermission(granted);
      if (granted) setPhase('preview');
    })();
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  const handleUpload = useCallback(async (videoPath: string) => {
    setPhase('uploading');
    setUploadError(null);
    try {
      const formData = new FormData();
      formData.append('video', { uri: `file://${videoPath}`, type: 'video/mp4', name: 'selfie.mp4' } as any);
      formData.append('avatar_id', avatarId);
      await api.post('/star-story/video-selfie/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setPhase('complete');
      haptic('notificationSuccess');
    } catch (err: any) {
      selfieLogger.error('Upload failed', { avatarId, error: err });
      setUploadError(err?.message || t('videoSelfie.uploadFailed'));
      setPhase('preview');
    }
  }, [avatarId, t]);

  const startRecording = useCallback(async () => {
    if (!cameraRef.current) return;
    setPhase('recording');
    setCountdown(RECORDING_DURATION_SEC);
    haptic('impactMedium');
    timerRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          cameraRef.current?.stopRecording();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    cameraRef.current.startRecording({
      onRecordingFinished: async (video) => {
        if (timerRef.current) clearInterval(timerRef.current);
        selfieLogger.info('Recording finished', { path: video.path, duration: video.duration });
        await handleUpload(video.path);
      },
      onRecordingError: (error) => {
        if (timerRef.current) clearInterval(timerRef.current);
        selfieLogger.error('Recording error', { error });
        setPhase('preview');
      },
    });
  }, [handleUpload]);

  if (!hasPermission && phase === 'idle') {
    return (
      <SafeAreaView className="flex-1 justify-center items-center px-6" style={{ backgroundColor: Colors.Background.primary }}>
        <NativeIcon name="camera" size="2xl" color={Colors.Text.muted} />
        <Text style={{ textAlign }} className="text-lg font-semibold text-white mt-4">{t('videoSelfie.permissionTitle')}</Text>
        <Text style={{ textAlign }} className="text-sm text-white/60 mt-2">{t('videoSelfie.permissionMessage')}</Text>
      </SafeAreaView>
    );
  }
  if (phase === 'complete') {
    return (
      <SafeAreaView className="flex-1 justify-center items-center px-6" style={{ backgroundColor: Colors.Background.primary }}>
        <NativeIcon name="checkCircle" size="2xl" color={Colors.Success.default} />
        <Text style={{ textAlign }} className="text-2xl font-bold text-white mt-6">{t('videoSelfie.completeTitle')}</Text>
        <Text style={{ textAlign }} className="text-base text-white/60 mt-2">{t('videoSelfie.completeMessage')}</Text>
        <GlassButton variant="primary" onPress={() => navigation.goBack()} className="mt-8 w-full">
          {t('common.done')}
        </GlassButton>
      </SafeAreaView>
    );
  }
  if (phase === 'uploading') {
    return (
      <SafeAreaView className="flex-1 justify-center items-center" style={{ backgroundColor: Colors.Background.primary }}>
        <GlassLoadingSpinner size="large" />
        <Text className="text-white text-base mt-4">{t('videoSelfie.uploading')}</Text>
      </SafeAreaView>
    );
  }
  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: Colors.Background.primary }}>
      <View className="flex-1">
        {device && (
          <Camera ref={cameraRef} device={device} format={format}
            isActive={phase === 'preview' || phase === 'recording'} video={true} audio={true} className="flex-1" />
        )}
        <View className="absolute inset-0 justify-center items-center" pointerEvents="none">
          <View className="w-56 h-72 rounded-[112px] border-2 border-dashed border-white/40" />
        </View>
        {phase === 'recording' && (
          <View className="absolute top-4 left-0 right-0 items-center">
            <View className="bg-red-500 rounded-full w-16 h-16 justify-center items-center">
              <Text className="text-2xl font-bold text-white">{countdown}</Text>
            </View>
          </View>
        )}
        {phase === 'preview' && (
          <View className="absolute bottom-0 left-0 right-0 p-4 bg-black/60">
            <Text style={{ textAlign }} className="text-base text-white font-semibold mb-1">
              {t('videoSelfie.instructionTitle')}
            </Text>
            <Text style={{ textAlign }} className="text-sm text-white/70 mb-2">
              {t('videoSelfie.instructionBody')}
            </Text>
            {uploadError && (
              <Text style={{ textAlign }} className="text-sm text-red-400 mb-2">{uploadError}</Text>
            )}
          </View>
        )}
      </View>
      <View className="px-4 py-3" style={{ backgroundColor: Colors.Background.elevated }}>
        {phase === 'preview' && (
          <View className="flex-row gap-3">
            <GlassButton variant="secondary" onPress={() => navigation.goBack()} className="flex-1">
              {t('common.cancel')}
            </GlassButton>
            <GlassButton variant="primary" onPress={startRecording} className="flex-1">
              {uploadError ? t('videoSelfie.retryRecord') : t('videoSelfie.startRecord')}
            </GlassButton>
          </View>
        )}
        {phase === 'recording' && (
          <GlassButton variant="destructive" onPress={() => cameraRef.current?.stopRecording()} className="w-full">
            {t('videoSelfie.stopRecord')}
          </GlassButton>
        )}
      </View>
    </SafeAreaView>
  );
};
export default VideoSelfieScreen;
