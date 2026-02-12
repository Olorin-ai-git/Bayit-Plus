/**
 * VoiceNoteRecorder Component
 * Public page recorder for grandparent voice notes.
 * No auth required - uses share_token for identification.
 * MediaRecorder API for audio capture with duration countdown.
 */

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Mic, MicOff, Send } from 'lucide-react-native';
import { GlassButton, GlassCard, GlassLoadingSpinner } from '@bayit/shared/ui';
import api from '@/services/api';
import logger from '@bayit/shared-utils/logger';

const voiceLogger = logger.scope('VoiceNoteRecorder');

interface VoiceNoteRecorderProps {
  clipId: string;
  shareToken: string;
  recipientName?: string;
  maxDurationSeconds: number;
}

type RecorderPhase = 'idle' | 'recording' | 'uploading' | 'sent';

export function VoiceNoteRecorder({ clipId, shareToken, recipientName, maxDurationSeconds }: VoiceNoteRecorderProps) {
  const { t } = useTranslation();
  const [phase, setPhase] = useState<RecorderPhase>('idle');
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (recorderRef.current?.state === 'recording') recorderRef.current.stop();
    };
  }, []);

  const startRecording = useCallback(async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        stream.getTracks().forEach((track) => track.stop());
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        setAudioBlob(blob);
        setPhase('idle');
      };

      recorderRef.current = recorder;
      recorder.start();
      setPhase('recording');
      setElapsed(0);

      timerRef.current = setInterval(() => {
        setElapsed((prev) => {
          const next = prev + 1;
          if (next >= maxDurationSeconds) {
            recorder.stop();
            if (timerRef.current) clearInterval(timerRef.current);
          }
          return next;
        });
      }, 1000);

      voiceLogger.info('Recording started', { clipId });
    } catch (err: any) {
      setError(err?.message || t('grandparentBridge.voiceNote.title'));
      voiceLogger.error('Failed to start recording', err);
    }
  }, [clipId, maxDurationSeconds, t]);

  const stopRecording = useCallback(() => {
    if (recorderRef.current?.state === 'recording') {
      recorderRef.current.stop();
    }
    if (timerRef.current) clearInterval(timerRef.current);
  }, []);

  const handleUpload = useCallback(async () => {
    if (!audioBlob) return;
    setPhase('uploading');
    setError(null);

    try {
      const formData = new FormData();
      formData.append('audio', audioBlob, 'voice_note.webm');
      formData.append('share_token', shareToken);

      await api.post(`/grandparent-bridge/${clipId}/voice-note`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setPhase('sent');
      voiceLogger.info('Voice note uploaded', { clipId });
    } catch (err: any) {
      setError(err?.detail || err?.message || t('grandparentBridge.voiceNote.title'));
      setPhase('idle');
      voiceLogger.error('Failed to upload voice note', err);
    }
  }, [audioBlob, clipId, shareToken, t]);

  const remaining = maxDurationSeconds - elapsed;

  return (
    <GlassCard>
      <View style={recorderStyles.container}>
        <Text style={recorderStyles.title}>{t('grandparentBridge.voiceNote.title')}</Text>
        {recipientName && (
          <Text style={recorderStyles.subtitle}>
            {t('grandparentBridge.voiceNote.subtitle', { name: recipientName })}
          </Text>
        )}
        <Text style={recorderStyles.duration}>
          {t('grandparentBridge.voiceNote.maxDuration', { seconds: String(maxDurationSeconds) })}
        </Text>

        {phase === 'recording' && (
          <Text style={recorderStyles.countdown}>{remaining}s</Text>
        )}

        {phase === 'uploading' && <GlassLoadingSpinner />}

        {phase === 'sent' ? (
          <Text style={recorderStyles.sentText}>{t('grandparentBridge.voiceNote.sent')}</Text>
        ) : (
          <View style={recorderStyles.actions}>
            {phase !== 'uploading' && (
              <GlassButton
                label={phase === 'recording' ? t('grandparentBridge.voiceNote.recording') : t('grandparentBridge.voiceNote.record')}
                onPress={phase === 'recording' ? stopRecording : startRecording}
                variant={phase === 'recording' ? 'secondary' : 'primary'}
                icon={phase === 'recording' ? <MicOff size={16} color="#FF3B30" /> : <Mic size={16} color="#FFFFFF" />}
              />
            )}
            {audioBlob && phase === 'idle' && (
              <GlassButton
                label={t('grandparentBridge.voiceNote.send')}
                onPress={handleUpload}
                variant="primary"
                icon={<Send size={16} color="#FFFFFF" />}
              />
            )}
          </View>
        )}

        {error && <Text style={recorderStyles.errorText}>{error}</Text>}
      </View>
    </GlassCard>
  );
}

const recorderStyles = StyleSheet.create({
  container: { padding: 24, alignItems: 'center', gap: 12 },
  title: { fontSize: 20, fontWeight: '700', color: '#FFFFFF' },
  subtitle: { fontSize: 14, color: 'rgba(255,255,255,0.6)', textAlign: 'center' },
  duration: { fontSize: 12, color: 'rgba(255,255,255,0.4)' },
  countdown: { fontSize: 48, fontWeight: '800', color: '#FF9F0A' },
  sentText: { fontSize: 16, fontWeight: '600', color: '#34C759' },
  actions: { flexDirection: 'row', gap: 12, marginTop: 8 },
  errorText: { color: '#FF3B30', fontSize: 13, marginTop: 8, textAlign: 'center' },
});
