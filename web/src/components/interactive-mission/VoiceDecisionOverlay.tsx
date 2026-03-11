/**
 * VoiceDecisionOverlay Component
 * Overlay for voice phrase decision points in interactive missions.
 * Shows Hebrew prompt, recording button, countdown, pronunciation feedback.
 */

import React, { useState, useRef, useCallback, useEffect } from "react";
import { View, Text, Pressable, Platform } from "react-native";
import { useTranslation } from "react-i18next";
import { Mic, MicOff, Volume2 } from "lucide-react-native";
import { GlassButton } from "@bayit/shared/components/ui/GlassButton";
import { GlassLoadingSpinner } from "@bayit/shared/ui";
import { PronunciationFeedback } from "../phonetic-mirror/PronunciationFeedback";
import { styles } from "./VoiceDecisionOverlay.styles";

interface VoiceDecisionOverlayProps {
  promptText: string;
  promptTransliteration?: string;
  promptTranslation?: string;
  timeoutSeconds: number;
  maxAttempts: number;
  currentAttempt: number;
  hint?: string;
  onSubmitAudio: (audioBlob: Blob) => void;
  lastResult?: {
    success: boolean;
    quality: string;
    score: number;
    pronunciation_score: number;
    feedback_he: string;
    corrected_audio_url?: string;
    phoneme_feedback?: Array<{
      word_he: string;
      expected_transliteration: string;
      heard_transliteration: string;
      score: number;
      issue_type: string | null;
    }>;
  } | null;
  isProcessing: boolean;
}

export function VoiceDecisionOverlay({
  promptText,
  promptTransliteration,
  promptTranslation,
  timeoutSeconds,
  maxAttempts,
  currentAttempt,
  hint,
  onSubmitAudio,
  lastResult,
  isProcessing,
}: VoiceDecisionOverlayProps) {
  const { t } = useTranslation();
  const [countdown, setCountdown] = useState(timeoutSeconds);
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    setCountdown(timeoutSeconds);
    timerRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [timeoutSeconds, currentAttempt]);

  const startRecording = useCallback(async () => {
    if (Platform.OS !== "web") return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        stream.getTracks().forEach((track) => track.stop());
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        onSubmitAudio(blob);
      };

      mediaRecorderRef.current = recorder;
      recorder.start();
      setIsRecording(true);
    } catch {
      // Mic permission denied
    }
  }, [onSubmitAudio]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  }, [isRecording]);

  return (
    <View style={styles.container}>
      <View style={styles.promptCard}>
        <Text style={styles.promptHebrew}>{promptText}</Text>
        {promptTransliteration && (
          <Text style={styles.promptTranslit}>{promptTransliteration}</Text>
        )}
        {promptTranslation && (
          <Text style={styles.promptTranslation}>{promptTranslation}</Text>
        )}
      </View>

      <View style={styles.micContainer}>
        <Text style={styles.countdown}>{countdown}</Text>

        {isProcessing ? (
          <GlassLoadingSpinner />
        ) : (
          <Pressable
            onPressIn={startRecording}
            onPressOut={stopRecording}
            style={[styles.micButton, isRecording && styles.micButtonActive]}
            accessibilityLabel={t("voiceDecision.holdToSpeak")}
            accessibilityRole="button"
          >
            {isRecording ? (
              <MicOff size={28} color="#FF3B30" />
            ) : (
              <Mic size={28} color="#FF3B30" />
            )}
          </Pressable>
        )}

        <Text style={styles.attemptText}>
          {t("voiceDecision.attempt", {
            current: currentAttempt,
            max: maxAttempts,
          })}
        </Text>
      </View>

      {lastResult && !lastResult.success && lastResult.phoneme_feedback && (
        <PronunciationFeedback feedback={lastResult.phoneme_feedback} />
      )}

      {lastResult?.corrected_audio_url && (
        <GlassButton
          title={t("voiceDecision.listenHint")}
          onPress={() => {
            if (lastResult.corrected_audio_url) {
              const audio = new Audio(lastResult.corrected_audio_url);
              audio.play();
            }
          }}
          variant="secondary"
          icon={<Volume2 size={16} color="#FFFFFF" />}
        />
      )}

      {hint && <Text style={styles.hintText}>{hint}</Text>}
    </View>
  );
}
