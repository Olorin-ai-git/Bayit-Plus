/**
 * V2VPracticeScreenMobile - Voice-to-Voice pronunciation practice screen.
 *
 * Records user voice, submits to the v2v service for pronunciation comparison,
 * displays score and feedback via V2VResult component.
 * Route params: { profileId: string, avatarId: string }
 */
import React, { useState, useCallback, useEffect } from 'react';
import { View, Text, SafeAreaView, Pressable, Platform } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import { GlassButton, GlassLoadingSpinner } from '@bayit/shared/ui';
import { OlorinIcon } from '@olorin/icons/native';
import { useDirection } from '@bayit/shared-hooks';
import api from '@bayit/shared-services/api';
import { Colors } from '../theme/colors';
import logger from '@/utils/logger';
import { V2VResult } from '../components/zehani/V2VResult';
import { styles } from './V2VPracticeScreenMobile.styles';

const v2vLogger = logger.scope('V2VPracticeScreen');
type Phase = 'loading' | 'idle' | 'recording' | 'processing' | 'result';

interface TargetWord {
  word_he: string;
  transliteration: string;
  translation: string;
  audio_url: string;
}

interface PracticeResult {
  score: number;
  feedback: string;
  originalAudio: string;
  userAudio: string;
  word: string;
}

const haptic = (type: string) => {
  if (Platform.OS === 'ios') ReactNativeHapticFeedback.trigger(type);
};

export const V2VPracticeScreenMobile: React.FC = () => {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { t } = useTranslation();
  const { textAlign } = useDirection();
  const { profileId, avatarId } = route.params;

  const [phase, setPhase] = useState<Phase>('loading');
  const [words, setWords] = useState<TargetWord[]>([]);
  const [wordIdx, setWordIdx] = useState(0);
  const [result, setResult] = useState<PracticeResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sessionScore, setSessionScore] = useState(0);
  const [attempts, setAttempts] = useState(0);

  const currentWord = words[wordIdx] || null;

  useEffect(() => { loadWords(); }, [profileId, avatarId]);

  const loadWords = useCallback(async () => {
    setPhase('loading');
    try {
      const data = await api.get('/zeh-ani/v2v/words', {
        params: { profile_id: profileId, avatar_id: avatarId, count: 10 },
      }) as { words: TargetWord[] };
      setWords(data.words || []);
      setPhase('idle');
      v2vLogger.info('V2V words loaded', { count: String(data.words?.length || 0) });
    } catch (err: unknown) {
      setError(t('zehAni.v2v.errors.loadFailed'));
      v2vLogger.error('Failed to load V2V words', { profileId, error: err });
    }
  }, [profileId, avatarId, t]);

  const handleRecord = useCallback(() => {
    if (phase === 'idle') {
      setPhase('recording');
      haptic('impactLight');
      v2vLogger.info('Recording started', { word: currentWord?.word_he });
    } else if (phase === 'recording') {
      setPhase('processing');
      haptic('notificationSuccess');
      submitRecording();
    }
  }, [phase, currentWord]);

  const submitRecording = useCallback(async () => {
    if (!currentWord) return;
    try {
      const formData = new FormData();
      formData.append('target_word_he', currentWord.word_he);
      formData.append('target_transliteration', currentWord.transliteration);
      formData.append('avatar_id', avatarId);
      formData.append('profile_id', profileId);
      const data = await api.post('/zeh-ani/v2v/attempt', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      }) as { score: number; feedback: string; original_audio_url: string; user_audio_url: string };
      const practiceResult: PracticeResult = {
        score: data.score, feedback: data.feedback,
        originalAudio: data.original_audio_url, userAudio: data.user_audio_url,
        word: currentWord.word_he,
      };
      setResult(practiceResult);
      setAttempts((prev) => prev + 1);
      setSessionScore((prev) => prev + data.score);
      setPhase('result');
      v2vLogger.info('V2V attempt complete', { word: currentWord.word_he, score: String(data.score) });
    } catch (err: unknown) {
      setError(t('zehAni.v2v.errors.submitFailed'));
      setPhase('idle');
      v2vLogger.error('V2V submission failed', { error: err });
    }
  }, [currentWord, avatarId, profileId, t]);

  const handleNext = useCallback(() => {
    setWordIdx((prev) => (prev + 1) % Math.max(words.length, 1));
    setResult(null); setPhase('idle'); setError(null);
  }, [words.length]);

  const handleRetry = useCallback(() => { setResult(null); setPhase('idle'); setError(null); }, []);
  const averageScore = attempts > 0 ? Math.round((sessionScore / attempts) * 100) : 0;

  if (phase === 'loading') {
    return (<SafeAreaView style={styles.container}><GlassLoadingSpinner /></SafeAreaView>);
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backButton}
          accessibilityLabel={t('common.back')} accessibilityHint={t('zehAni.v2v.backHint')}
          accessibilityRole="button">
          <OlorinIcon name="chevron-left" size={24} color={Colors.Text.primary} />
        </Pressable>
        <Text style={[styles.title, { textAlign }]} accessibilityRole="header">
          {t('zehAni.v2v.screenTitle')}
        </Text>
        <View style={styles.scoreBadge}
          accessibilityLabel={t('zehAni.v2v.sessionAverage', { score: String(averageScore) })}
          accessibilityRole="text">
          <Text style={styles.scoreBadgeText}>{averageScore}%</Text>
        </View>
      </View>
      {currentWord && phase !== 'result' && (
        <View style={styles.wordCard}>
          <Text style={[styles.wordHebrew, { textAlign }]}>{currentWord.word_he}</Text>
          <Text style={styles.wordTranslit}>{currentWord.transliteration}</Text>
          <Text style={styles.wordTranslation}>{currentWord.translation}</Text>
        </View>
      )}
      {(phase === 'idle' || phase === 'recording') && (
        <View style={styles.recordSection}>
          <Pressable onPress={handleRecord}
            style={[styles.micButton, phase === 'recording' && styles.micButtonActive]}
            accessibilityLabel={phase === 'recording'
              ? t('zehAni.v2v.stopRecording') : t('zehAni.v2v.startRecording')}
            accessibilityHint={t('zehAni.v2v.recordHint')} accessibilityRole="button">
            <OlorinIcon name={phase === 'recording' ? 'mic-off' : 'mic'}
              size={32} color={Colors.Error.default} />
          </Pressable>
          <Text style={styles.recordHint}>
            {phase === 'recording' ? t('zehAni.v2v.tapToStop') : t('zehAni.v2v.tapToRecord')}
          </Text>
        </View>
      )}
      {phase === 'processing' && (
        <View style={styles.processingSection}>
          <GlassLoadingSpinner />
          <Text style={styles.processingText}>{t('zehAni.v2v.analyzing')}</Text>
        </View>
      )}
      {phase === 'result' && result && (
        <>
          <V2VResult result={result} />
          <View style={styles.resultActions}>
            <GlassButton title={t('zehAni.v2v.tryAgain')} onPress={handleRetry} variant="secondary"
              accessibilityLabel={t('zehAni.v2v.tryAgain')} accessibilityHint={t('zehAni.v2v.tryAgainHint')}
              accessibilityRole="button" />
            <GlassButton title={t('zehAni.v2v.nextWord')} onPress={handleNext} variant="primary"
              accessibilityLabel={t('zehAni.v2v.nextWord')} accessibilityHint={t('zehAni.v2v.nextWordHint')}
              accessibilityRole="button" />
          </View>
        </>
      )}
      {error && <Text style={styles.errorText} accessibilityRole="alert">{error}</Text>}
    </SafeAreaView>
  );
};

export default V2VPracticeScreenMobile;
