/**
 * VideoSelfieCapture Component
 * 10-second video recorder for enhanced avatar generation + voice cloning.
 * Face guide overlay (oval frame), instructions in user's language.
 * Encrypted upload to backend.
 */

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { View, Text, Platform } from 'react-native';
import { useTranslation } from 'react-i18next';
import { GlassButton } from '@bayit/shared/components/ui/GlassButton';
import { GlassLoadingSpinner } from '@bayit/shared/ui';
import api from '@/services/api';
import logger from '@bayit/shared-utils/logger';
import { styles } from './VideoSelfieCapture.styles';

const selfieLogger = logger.scope('VideoSelfieCapture');

const RECORDING_DURATION_MS = Number(
  (typeof process !== 'undefined' && process.env?.REACT_APP_VIDEO_SELFIE_RECORDING_MS) || 10000
);

interface VideoSelfieCaptureProps {
  avatarId: string;
  profileId: string;
  onComplete?: () => void;
  onError?: (error: string) => void;
}

type CaptureState = 'idle' | 'preview' | 'recording' | 'uploading' | 'complete';

export function VideoSelfieCapture({
  avatarId,
  profileId,
  onComplete,
  onError,
}: VideoSelfieCaptureProps) {
  const { t } = useTranslation();
  const [state, setState] = useState<CaptureState>('idle');
  const [countdown, setCountdown] = useState(10);
  const [error, setError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  useEffect(() => () => {
    streamRef.current?.getTracks().forEach(track => track.stop());
  }, []);

  const startPreview = useCallback(async () => {
    if (Platform.OS !== 'web') return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: 640, height: 480 },
        audio: true,
      });
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      setState('preview');
    } catch (err: any) {
      const msg = t('videoSelfie.cameraError');
      setError(msg);
      if (onError) onError(msg);
      selfieLogger.error('Camera access failed', err);
    }
  }, [t, onError]);

  const startRecording = useCallback(() => {
    if (!streamRef.current) return;
    chunksRef.current = [];
    const recorder = new MediaRecorder(streamRef.current, { mimeType: 'video/webm' });
    recorderRef.current = recorder;
    recorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
    recorder.onstop = async () => { await uploadVideo(new Blob(chunksRef.current, { type: 'video/webm' })); };
    recorder.start();
    setState('recording');
    setCountdown(10);
    const interval = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) { clearInterval(interval); recorder.stop(); return 0; }
        return prev - 1;
      });
    }, 1000);
    setTimeout(() => { if (recorder.state === 'recording') { clearInterval(interval); recorder.stop(); } }, RECORDING_DURATION_MS);
  }, []);

  const uploadVideo = async (blob: Blob) => {
    setState('uploading');

    try {
      const formData = new FormData();
      formData.append('video', blob, 'selfie.webm');
      formData.append('avatar_id', avatarId);
      formData.append('profile_id', profileId);

      await api.post('/star-story/video-selfie/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      setState('complete');
      selfieLogger.info('Video selfie uploaded', { avatarId });
      if (onComplete) onComplete();
    } catch (err: any) {
      const msg = err?.detail || err?.message || t('videoSelfie.uploadError');
      setError(msg);
      setState('idle');
      if (onError) onError(msg);
      selfieLogger.error('Upload failed', err);
    } finally {
      streamRef.current?.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  };

  const renderContent = () => {
    if (state === 'idle') {
      return (
        <View style={styles.instructionsContainer}>
          <Text style={styles.title}>{t('videoSelfie.title')}</Text>
          <Text style={styles.instructions}>{t('videoSelfie.instructions')}</Text>
          <GlassButton title={t('videoSelfie.startCamera')} onPress={startPreview} variant="primary" size="lg" />
        </View>
      );
    }

    if ((state === 'preview' || state === 'recording') && Platform.OS === 'web') {
      return (
        <View style={styles.videoContainer}>
          <video
            ref={(el) => { videoRef.current = el; }}
            style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)' }}
            autoPlay playsInline muted
          />
          <View style={styles.ovalGuide}><View style={styles.ovalBorder} /></View>
          {state === 'recording' && (
            <View style={styles.countdownOverlay}>
              <View style={styles.recordingDot} />
              <Text style={styles.countdownText}>{countdown}</Text>
            </View>
          )}
          {state === 'preview' && (
            <View style={styles.startRow}>
              <GlassButton title={t('videoSelfie.record')} onPress={startRecording} variant="primary" size="lg" />
            </View>
          )}
        </View>
      );
    }

    if (state === 'uploading') {
      return (
        <View style={styles.uploadingContainer}>
          <GlassLoadingSpinner size="large" />
          <Text style={styles.uploadingText}>{t('videoSelfie.uploading')}</Text>
        </View>
      );
    }

    if (state === 'complete') {
      return <View style={styles.completeContainer}><Text style={styles.completeText}>{t('videoSelfie.complete')}</Text></View>;
    }

    return null;
  };

  return (
    <View style={styles.container}>
      {renderContent()}
      {error && <View style={styles.errorRow}><Text style={styles.errorText}>{error}</Text></View>}
    </View>
  );
}

export default VideoSelfieCapture;
