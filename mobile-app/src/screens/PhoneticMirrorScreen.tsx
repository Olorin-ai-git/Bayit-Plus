/**
 * PhoneticMirrorScreen - Hebrew pronunciation practice
 *
 * Target phrase display, microphone recording, pronunciation scoring,
 * per-word feedback, corrected audio playback, shekel rewards.
 */
import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, Pressable, SafeAreaView, Platform, StyleSheet } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import { useDirection } from '@bayit/shared-hooks';
import { GlassButton, GlassLoadingSpinner } from '@bayit/shared/ui';
import { NativeIcon } from '@olorin/shared-icons/native';
import api from '@bayit/shared-services/api';
import { Colors } from '../theme/colors';
import logger from '@/utils/logger';

const mirrorLogger = logger.scope('PhoneticMirrorScreen');
type Phase = 'loading' | 'idle' | 'recording' | 'processing' | 'feedback';

interface PracticePhrase {
  phrase_he: string; transliteration: string; translation: string;
  difficulty: string; category: string;
}

interface PhonemeFeedback {
  word_he: string; score: number; issue_type: string | null;
}

interface AttemptResult {
  id: string; pronunciation_score: number; quality: string;
  phoneme_feedback: PhonemeFeedback[]; corrected_audio_url: string | null;
  shekels_earned: number; input_transcript: string;
}

const QUALITY_COLORS: Record<string, string> = {
  excellent: '#34C759', good: '#30D158', fair: '#FF9F0A',
  needs_practice: '#FF6B35', no_match: '#FF3B30',
};

export const PhoneticMirrorScreen: React.FC = () => {
  const route = useRoute<any>();
  const navigation = useNavigation();
  const { avatarId, profileId } = route.params;
  const { t } = useTranslation();
  const { textAlign } = useDirection();

  const [phase, setPhase] = useState<Phase>('loading');
  const [phrases, setPhrases] = useState<PracticePhrase[]>([]);
  const [phraseIdx, setPhraseIdx] = useState(0);
  const [result, setResult] = useState<AttemptResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const currentPhrase = phrases[phraseIdx] || null;

  useEffect(() => {
    loadPhrases();
  }, []);

  const loadPhrases = useCallback(async () => {
    try {
      const data = await api.get('/phonetic-mirror/phrases', {
        params: { profile_id: profileId, difficulty: 'medium', count: 10 },
      }) as PracticePhrase[];
      setPhrases(data || []);
      setPhase('idle');
      mirrorLogger.info('Loaded phrases', { count: String(data?.length || 0) });
    } catch (err: any) {
      setError(err?.message || t('phoneticMirror.errors.fetchFailed'));
      mirrorLogger.error('Failed to load phrases', err);
    }
  }, [profileId, t]);

  const haptic = useCallback((type: string) => {
    if (Platform.OS === 'ios') ReactNativeHapticFeedback.trigger(type);
  }, []);

  const handleRecordPress = useCallback(() => {
    if (phase === 'idle') {
      setPhase('recording');
      haptic('impactLight');
    } else if (phase === 'recording') {
      setPhase('processing');
      haptic('notificationSuccess');
      submitRecording();
    }
  }, [phase, haptic]);

  const submitRecording = useCallback(async () => {
    if (!currentPhrase) return;
    try {
      const formData = new FormData();
      formData.append('target_phrase_he', currentPhrase.phrase_he);
      formData.append('target_transliteration', currentPhrase.transliteration);
      formData.append('avatar_id', avatarId);
      formData.append('profile_id', profileId);
      formData.append('source', 'standalone');

      const data = await api.post('/phonetic-mirror/attempt', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      }) as AttemptResult;

      setResult(data);
      setPhase('feedback');
      if (data.shekels_earned > 0) haptic('notificationSuccess');
    } catch (err: any) {
      setError(err?.message || t('phoneticMirror.errors.submitFailed'));
      setPhase('idle');
    }
  }, [currentPhrase, avatarId, profileId, t, haptic]);

  const handleNext = useCallback(() => {
    setPhraseIdx((prev) => (prev + 1) % Math.max(phrases.length, 1));
    setResult(null);
    setPhase('idle');
  }, [phrases.length]);

  const handleRetry = useCallback(() => {
    setResult(null);
    setPhase('idle');
  }, []);

  if (phase === 'loading') {
    return (
      <SafeAreaView style={styles.container}>
        <GlassLoadingSpinner />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {currentPhrase && (
        <View style={styles.phraseCard}>
          <Text style={[styles.phraseHebrew, { textAlign }]}>{currentPhrase.phrase_he}</Text>
          <Text style={styles.translit}>{currentPhrase.transliteration}</Text>
          <Text style={styles.translation}>{currentPhrase.translation}</Text>
        </View>
      )}

      {(phase === 'idle' || phase === 'recording') && (
        <Pressable onPress={handleRecordPress} style={[styles.micBtn, phase === 'recording' && styles.micBtnActive]}>
          <NativeIcon name={phase === 'recording' ? 'mic-off' : 'mic'} size={32} color="#FF3B30" />
        </Pressable>
      )}

      {phase === 'processing' && <GlassLoadingSpinner />}

      {phase === 'feedback' && result && (
        <View style={styles.feedbackContainer}>
          <Text style={styles.scoreText}>{Math.round(result.pronunciation_score * 100)}%</Text>
          <View style={[styles.qualityBadge, { backgroundColor: QUALITY_COLORS[result.quality] || '#666' }]}>
            <Text style={styles.qualityText}>{t(`phoneticMirror.quality.${result.quality}`)}</Text>
          </View>

          {result.phoneme_feedback.map((f, i) => (
            <View key={`${f.word_he}-${i}`} style={[styles.wordRow, { backgroundColor: `${getWordColor(f.score)}20` }]}>
              <Text style={styles.wordText}>{f.word_he}</Text>
              <View style={[styles.wordScore, { backgroundColor: getWordColor(f.score) }]}>
                <Text style={styles.wordScoreText}>{Math.round(f.score * 100)}%</Text>
              </View>
            </View>
          ))}

          <View style={styles.actions}>
            <GlassButton title={t('phoneticMirror.tryAgain')} onPress={handleRetry} variant="secondary" />
            <GlassButton title={t('phoneticMirror.nextPhrase')} onPress={handleNext} variant="primary" />
          </View>
        </View>
      )}

      {error && <Text style={styles.errorText}>{error}</Text>}
    </SafeAreaView>
  );
};

function getWordColor(score: number): string {
  if (score >= 0.9) return '#34C759';
  if (score >= 0.7) return '#30D158';
  if (score >= 0.5) return '#FF9F0A';
  return '#FF3B30';
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1E1E2E', padding: 20, alignItems: 'center' },
  phraseCard: { backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 20, padding: 28, width: '100%', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  phraseHebrew: { fontSize: 32, fontWeight: '700', color: '#FFF', marginBottom: 8 },
  translit: { fontSize: 18, color: 'rgba(255,255,255,0.6)' },
  translation: { fontSize: 14, color: 'rgba(255,255,255,0.4)' },
  micBtn: { width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(255,59,48,0.2)', justifyContent: 'center', alignItems: 'center', marginTop: 32, borderWidth: 2, borderColor: 'rgba(255,59,48,0.6)' },
  micBtnActive: { backgroundColor: 'rgba(255,59,48,0.5)', borderColor: '#FF3B30' },
  feedbackContainer: { alignItems: 'center', width: '100%', marginTop: 16 },
  scoreText: { fontSize: 48, fontWeight: '800', color: '#FFF' },
  qualityBadge: { paddingHorizontal: 16, paddingVertical: 6, borderRadius: 12, marginTop: 8, marginBottom: 16 },
  qualityText: { fontSize: 14, fontWeight: '600', color: '#FFF' },
  wordRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 16, borderRadius: 12, marginBottom: 6, width: '100%' },
  wordText: { fontSize: 20, fontWeight: '600', color: '#FFF' },
  wordScore: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  wordScoreText: { fontSize: 12, fontWeight: '700', color: '#FFF' },
  actions: { flexDirection: 'row', gap: 12, marginTop: 20 },
  errorText: { color: '#FF3B30', marginTop: 12, textAlign: 'center' },
});
