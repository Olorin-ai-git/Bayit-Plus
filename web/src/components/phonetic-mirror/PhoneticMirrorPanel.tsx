/**
 * PhoneticMirrorPanel Component
 * Main panel for Hebrew pronunciation practice with target phrase display,
 * audio recording, waveform visualization, and pronunciation feedback.
 */

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { View, Text, Pressable, Platform } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Mic, MicOff, RotateCcw, ChevronRight } from 'lucide-react-native';
import { GlassButton } from '@bayit/shared/components/ui/GlassButton';
import { GlassLoadingSpinner } from '@bayit/shared/ui';
import { usePhoneticMirrorStore } from '@/stores/phoneticMirrorStore';
import { PronunciationFeedback } from './PronunciationFeedback';
import { styles } from './PhoneticMirrorPanel.styles';

interface PhoneticMirrorPanelProps {
  avatarId: string;
  profileId: string;
  onClose?: () => void;
}

const QUALITY_COLORS: Record<string, string> = {
  excellent: '#34C759',
  good: '#30D158',
  fair: '#FF9F0A',
  needs_practice: '#FF6B35',
  no_match: '#FF3B30',
};

export function PhoneticMirrorPanel({ avatarId, profileId, onClose }: PhoneticMirrorPanelProps) {
  const { t } = useTranslation();
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const [isRecording, setIsRecording] = useState(false);

  const {
    mirrorState,
    currentPhrase,
    phrases,
    lastResult,
    loading,
    error,
    fetchPhrases,
    submitAttempt,
    setCurrentPhrase,
    setMirrorState,
    reset,
  } = usePhoneticMirrorStore();

  useEffect(() => {
    fetchPhrases(profileId);
  }, [profileId, fetchPhrases]);

  useEffect(() => {
    if (phrases.length > 0 && !currentPhrase) {
      setCurrentPhrase(phrases[0]);
    }
  }, [phrases, currentPhrase, setCurrentPhrase]);

  const startRecording = useCallback(async () => {
    if (Platform.OS !== 'web') return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop());
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });

        if (currentPhrase) {
          await submitAttempt({
            audio: blob,
            targetPhraseHe: currentPhrase.phrase_he,
            targetTransliteration: currentPhrase.transliteration,
            avatarId,
            profileId,
          });
        }
      };

      mediaRecorderRef.current = recorder;
      recorder.start();
      setIsRecording(true);
      setMirrorState('recording');
    } catch {
      setMirrorState('error');
    }
  }, [currentPhrase, avatarId, profileId, submitAttempt, setMirrorState]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  }, [isRecording]);

  const handleNextPhrase = useCallback(() => {
    const currentIdx = phrases.findIndex((p) => p.phrase_he === currentPhrase?.phrase_he);
    const nextIdx = (currentIdx + 1) % phrases.length;
    setCurrentPhrase(phrases[nextIdx]);
    reset();
  }, [phrases, currentPhrase, setCurrentPhrase, reset]);

  const handleRetry = useCallback(() => {
    setMirrorState('idle');
  }, [setMirrorState]);

  if (loading && phrases.length === 0) {
    return (
      <View style={styles.container}>
        <GlassLoadingSpinner />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {currentPhrase && (
        <View style={styles.phraseCard}>
          <Text style={styles.phraseHebrew}>{currentPhrase.phrase_he}</Text>
          <Text style={styles.phraseTransliteration}>
            {currentPhrase.transliteration}
          </Text>
          <Text style={styles.phraseTranslation}>
            {currentPhrase.translation}
          </Text>
        </View>
      )}

      {mirrorState === 'processing' && (
        <View style={styles.scoreDisplay}>
          <GlassLoadingSpinner />
          <Text style={[styles.qualityText, styles.analyzingText]}>
            {t('phoneticMirror.analyzing')}
          </Text>
        </View>
      )}

      {(mirrorState === 'idle' || mirrorState === 'recording') && (
        <Pressable
          onPressIn={startRecording}
          onPressOut={stopRecording}
          style={[styles.recordButton, isRecording && styles.recordButtonActive]}
        >
          {isRecording ? (
            <MicOff size={32} color="#FF3B30" />
          ) : (
            <Mic size={32} color="#FF3B30" />
          )}
        </Pressable>
      )}

      {mirrorState === 'feedback' && lastResult && (
        <>
          <View style={styles.scoreDisplay}>
            <Text style={styles.scoreText}>
              {Math.round(lastResult.pronunciation_score * 100)}%
            </Text>
            <View
              style={[
                styles.qualityBadge,
                { backgroundColor: QUALITY_COLORS[lastResult.quality] || '#666' },
              ]}
            >
              <Text style={styles.qualityText}>
                {t(`phoneticMirror.quality.${lastResult.quality}`)}
              </Text>
            </View>
          </View>

          <PronunciationFeedback feedback={lastResult.phoneme_feedback} />

          {lastResult.corrected_audio_url && (
            <GlassButton
              title={t('phoneticMirror.listenCorrect')}
              onPress={() => {
                if (lastResult.corrected_audio_url) {
                  const audio = new Audio(lastResult.corrected_audio_url);
                  audio.play();
                }
              }}
              variant="secondary"
            />
          )}

          <View style={styles.feedbackActions}>
            <GlassButton
              title={t('phoneticMirror.tryAgain')}
              onPress={handleRetry}
              variant="secondary"
              icon={<RotateCcw size={16} color="#FFFFFF" />}
            />
            <GlassButton
              title={t('phoneticMirror.nextPhrase')}
              onPress={handleNextPhrase}
              variant="primary"
              icon={<ChevronRight size={16} color="#FFFFFF" />}
            />
          </View>
        </>
      )}

      {error && (
        <Text style={styles.errorText}>
          {error}
        </Text>
      )}
    </View>
  );
}
