/**
 * TalkBackOverlay Component
 * Main overlay during playback implementing the Talk Back state machine.
 * States: idle (invisible), question (character + prompt), listening (mic + timer),
 * evaluating (spinner), result (score + feedback).
 * Positioned bottom-right to avoid subtitle overlap.
 */

import React, { useEffect, useRef, useCallback } from 'react';
import { Animated, View, Text, Platform } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Mic } from 'lucide-react-native';
import { GlassLoadingSpinner } from '@bayit/shared/ui';
import { GlassButton } from '@bayit/shared/components/ui/GlassButton';
import { useTalkBackStore } from '@/stores/talkBackStore';
import { TalkBackCharacter } from './TalkBackCharacter';
import { TalkBackResult } from './TalkBackResult';
import { talkBackStyles as styles, getTvStyles } from './talkBackStyles';

interface TalkBackOverlayProps {
  contentId: string;
  sessionId: string;
  profileId: string;
  currentTime: number;
  isRTL?: boolean;
  onPromptAudioPlay?: (url: string) => void;
}

const useNativeDriver = Platform.OS !== 'web';
const LISTENING_DURATION_MS = 10000;
const TRIGGER_TOLERANCE_SEC = 1.5;

export function TalkBackOverlay({
  contentId,
  sessionId,
  profileId,
  currentTime,
  isRTL = false,
  onPromptAudioPlay,
}: TalkBackOverlayProps) {
  const { t, i18n } = useTranslation();
  const isTV = Platform.isTV || Platform.OS === 'tvos';
  const tvStyles = getTvStyles(isTV);
  const isHebrew = i18n.language === 'he' || isRTL;

  const {
    talkBackPoints, currentQuestion, state, lastResult,
    fetchPoints, setCurrentQuestion, setListening, submitResponse, reset,
  } = useTalkBackStore();

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const listeningTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const triggeredPointsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    fetchPoints(contentId);
    return () => { reset(); triggeredPointsRef.current.clear(); };
  }, [contentId, fetchPoints, reset]);

  useEffect(() => {
    if (!talkBackPoints.length || state !== 'idle') return;
    const match = talkBackPoints.find(
      (pt) => !triggeredPointsRef.current.has(pt.id) &&
        Math.abs(currentTime - pt.trigger_time) < TRIGGER_TOLERANCE_SEC
    );
    if (match) {
      triggeredPointsRef.current.add(match.id);
      setCurrentQuestion(match);
      if (match.prompt_audio_url && onPromptAudioPlay) {
        onPromptAudioPlay(match.prompt_audio_url);
      }
    }
  }, [currentTime, talkBackPoints, state, setCurrentQuestion, onPromptAudioPlay]);

  useEffect(() => {
    const show = state !== 'idle';
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: show ? 1 : 0, duration: show ? 300 : 200, useNativeDriver }),
      Animated.timing(slideAnim, { toValue: show ? 0 : 30, duration: show ? 300 : 200, useNativeDriver }),
    ]).start();
    return () => { fadeAnim.stopAnimation(); slideAnim.stopAnimation(); };
  }, [state, fadeAnim, slideAnim]);

  const handleStartListening = useCallback(() => {
    setListening();
    listeningTimerRef.current = setTimeout(() => {
      if (currentQuestion) {
        submitResponse({
          session_id: sessionId, content_id: contentId,
          talk_back_point_id: currentQuestion.id, profile_id: profileId,
          response_transcript: '', language_detected: 'timeout',
        });
      }
    }, LISTENING_DURATION_MS);
  }, [setListening, currentQuestion, submitResponse, sessionId, contentId, profileId]);

  const handleDismiss = useCallback(() => {
    if (listeningTimerRef.current) clearTimeout(listeningTimerRef.current);
    reset();
  }, [reset]);

  const handleTryAgain = useCallback(() => {
    if (currentQuestion) setCurrentQuestion(currentQuestion);
  }, [currentQuestion, setCurrentQuestion]);

  useEffect(() => {
    if (Platform.OS !== 'web' || state === 'idle') return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') handleDismiss(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [state, handleDismiss]);

  if (state === 'idle') return null;

  const qText = isHebrew && currentQuestion?.question_text_he
    ? currentQuestion.question_text_he : currentQuestion?.question_text || '';

  return (
    <Animated.View
      style={[styles.overlay, isHebrew && styles.overlayRTL, isTV && styles.overlayTV,
        { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}
      accessible={true} accessibilityRole="alert" accessibilityLiveRegion="polite"
    >
      <View style={[styles.glassCard, isTV && styles.glassCardTV]}>
        {state === 'question' && currentQuestion && (
          <>
            <TalkBackCharacter characterName={currentQuestion.character_name}
              questionText={qText} isSpeaking={true} isRTL={isHebrew} />
            <View style={[styles.actionsRow, isHebrew && styles.actionsRowRTL]}>
              <GlassButton title={t('talkBack.respond')} onPress={handleStartListening}
                variant="primary" size="sm" accessibilityLabel={t('talkBack.respond')} />
              <GlassButton title={t('talkBack.skip')} onPress={handleDismiss}
                variant="ghost" size="sm" accessibilityLabel={t('talkBack.skip')} />
            </View>
          </>
        )}
        {state === 'listening' && (
          <View style={styles.listeningContainer}>
            <MicPulseIndicator isTV={isTV} />
            <Text style={[styles.timerText, tvStyles.feedbackText]}>{t('talkBack.listening')}</Text>
          </View>
        )}
        {state === 'evaluating' && (
          <View style={styles.evaluatingContainer}>
            <GlassLoadingSpinner size="medium" />
            <Text style={[styles.evaluatingText, tvStyles.feedbackText]}>{t('talkBack.evaluating')}</Text>
          </View>
        )}
        {state === 'result' && lastResult && (
          <TalkBackResult score={lastResult.score} pointsEarned={lastResult.points_earned}
            feedback={lastResult.feedback} feedbackHe={lastResult.feedback_he}
            onTryAgain={handleTryAgain} onContinue={handleDismiss} isRTL={isHebrew} />
        )}
      </View>
    </Animated.View>
  );
}

function MicPulseIndicator({ isTV }: { isTV: boolean }) {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    const pulse = Animated.loop(Animated.sequence([
      Animated.timing(pulseAnim, { toValue: 1.2, duration: 500, useNativeDriver: Platform.OS !== 'web' }),
      Animated.timing(pulseAnim, { toValue: 1, duration: 500, useNativeDriver: Platform.OS !== 'web' }),
    ]));
    pulse.start();
    return () => pulse.stop();
  }, [pulseAnim]);

  return (
    <Animated.View style={[styles.micIndicator, isTV && styles.micIndicatorTV,
      { transform: [{ scale: pulseAnim }] }]}>
      <Mic size={isTV ? 32 : 24} color="#EF4444" />
    </Animated.View>
  );
}

export default TalkBackOverlay;
