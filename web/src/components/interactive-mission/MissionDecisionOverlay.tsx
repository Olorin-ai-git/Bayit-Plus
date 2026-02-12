/**
 * MissionDecisionOverlay Component
 * Choice overlay shown at decision points with countdown timer,
 * voice input indicator, Hebrew challenge text with transliteration,
 * and hint display after 2 failed attempts.
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Animated, View, Text, Platform } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Mic } from 'lucide-react-native';
import { GlassButton } from '@bayit/shared/components/ui/GlassButton';
import { GlassLoadingSpinner } from '@bayit/shared/ui';
import { styles } from './MissionDecisionOverlay.styles';

interface OnDemandBranch {
  prompt: string;
  prompt_transliteration?: string;
  prompt_translation?: string;
  decision_type: string;
  expected_responses: string[];
  timeout_seconds: number;
  max_attempts: number;
  hint_text?: string;
  hint_text_he?: string;
  options: Record<string, { scene: number; hls_path: string }>;
}

interface MissionDecisionOverlayProps {
  manifest: {
    on_demand_branches: Record<string, OnDemandBranch>;
  };
  currentScene: number;
  onSubmit: (transcript: string, language: string) => void;
  lastResult: {
    success: boolean;
    quality: string;
    score: number;
    feedback: string;
    feedback_he: string;
    hint: string;
    attempt_number: number;
  } | null;
  isRTL?: boolean;
}

export function MissionDecisionOverlay({
  manifest,
  currentScene,
  onSubmit,
  lastResult,
  isRTL = false,
}: MissionDecisionOverlayProps) {
  const { t, i18n } = useTranslation();
  const isHebrew = i18n.language === 'he' || isRTL;

  const [isListening, setIsListening] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [showHint, setShowHint] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const recognitionRef = useRef<any>(null);

  const branch = Object.values(manifest.on_demand_branches).find(
    (b) => b.options?.success?.scene === currentScene + 1
      || b.options?.retry?.scene === currentScene
  );

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 400,
      useNativeDriver: Platform.OS !== 'web',
    }).start();
    return () => { recognitionRef.current?.abort(); };
  }, [fadeAnim]);

  useEffect(() => {
    if (!branch) return;
    setCountdown(branch.timeout_seconds);
    const interval = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          onSubmit('', 'timeout');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [branch, onSubmit]);

  useEffect(() => {
    if (lastResult && !lastResult.success && lastResult.attempt_number >= 2) {
      setShowHint(true);
    }
  }, [lastResult]);

  const startListening = useCallback(async () => {
    setIsListening(true);

    if (Platform.OS === 'web' && 'webkitSpeechRecognition' in window) {
      const SpeechRecognition = (window as any).webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      recognition.lang = 'he-IL';
      recognition.continuous = false;
      recognition.interimResults = false;

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setIsListening(false);
        onSubmit(transcript, 'he');
      };

      recognition.onerror = () => {
        setIsListening(false);
        onSubmit('', 'error');
      };

      recognition.onend = () => setIsListening(false);
      recognitionRef.current = recognition;
      recognition.start();
    }
  }, [onSubmit]);

  if (!branch) return null;

  return (
    <Animated.View style={[styles.overlay, { opacity: fadeAnim }]}>
      <View style={styles.card}>
        <View style={styles.timerRow}>
          <View style={styles.timerCircle}>
            <Text style={styles.timerText}>{countdown}</Text>
          </View>
        </View>

        <Text style={[styles.promptText, isHebrew && styles.rtlText]}>
          {branch.prompt}
        </Text>

        {branch.prompt_transliteration && (
          <Text style={styles.transliterationText}>
            {branch.prompt_transliteration}
          </Text>
        )}

        {branch.prompt_translation && (
          <Text style={styles.translationText}>
            {branch.prompt_translation}
          </Text>
        )}

        {showHint && (branch.hint_text || branch.hint_text_he) && (
          <View style={styles.hintContainer}>
            <Text style={styles.hintText}>
              {isHebrew ? branch.hint_text_he : branch.hint_text}
            </Text>
          </View>
        )}

        {lastResult && !lastResult.success && (
          <View style={styles.feedbackRow}>
            <Text style={styles.feedbackText}>
              {isHebrew ? lastResult.feedback_he : lastResult.feedback}
            </Text>
          </View>
        )}

        <View style={styles.actionsRow}>
          {isListening ? (
            <View style={styles.listeningContainer}>
              <Mic size={32} color="#EF4444" />
              <Text style={styles.listeningText}>
                {t('interactiveMission.listening')}
              </Text>
            </View>
          ) : (
            <GlassButton
              title={t('interactiveMission.speak')}
              onPress={startListening}
              variant="primary"
              size="lg"
              accessibilityLabel={t('interactiveMission.speak')}
            />
          )}
        </View>
      </View>
    </Animated.View>
  );
}

export default MissionDecisionOverlay;
