import React, { useState, useEffect, useCallback } from "react";
import { View, Text, StyleSheet } from "react-native";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { GlassCard, GlassInput, GlassButton } from "@bayit/shared/ui";
import { colors, spacing } from "@olorin/design-tokens";
import { useDirection } from "@/hooks/useDirection";
import { VoiceWaveform } from "./VoiceWaveform";
import {
  ProactiveSuggestions,
  type ProactiveSuggestion,
} from "./ProactiveSuggestions";
import {
  parseVoiceCommand,
  routeCommand,
  type VoiceAction,
} from "./VoiceCommandRouter";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";
import logger from "@bayit/shared-utils/logger";

const panelLogger = logger.scope("VoiceAssistantPanel");

interface VoiceAssistantPanelProps {
  visible: boolean;
  onClose: () => void;
}

export const VoiceAssistantPanel: React.FC<VoiceAssistantPanelProps> = ({
  visible,
  onClose,
}) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { textAlign } = useDirection();
  const [textInput, setTextInput] = useState("");
  const [lastResponse, setLastResponse] = useState<string | null>(null);

  const executeAction = useCallback(
    (action: VoiceAction) => {
      panelLogger.info("Executing voice action", { type: action.type });
      switch (action.type) {
        case "navigate":
          navigate(action.payload.route);
          onClose();
          break;
        case "search":
          navigate(`/search?q=${encodeURIComponent(action.payload.query)}`);
          onClose();
          break;
        case "play":
          navigate(
            `/search?q=${encodeURIComponent(action.payload.query)}&autoplay=true`,
          );
          onClose();
          break;
        case "control":
          setLastResponse(
            t("voice.controlExecuted", { action: action.payload.action }),
          );
          break;
        case "timer":
          setLastResponse(
            t("voice.timerSet", {
              amount: action.payload.amount,
              unit: action.payload.unit,
            }),
          );
          break;
        case "chat":
          setLastResponse(t("voice.chatPending"));
          break;
      }
    },
    [navigate, onClose, t],
  );

  const processText = useCallback(
    (text: string) => {
      const command = parseVoiceCommand(text);
      const action = routeCommand(command);
      executeAction(action);
    },
    [executeAction],
  );

  const { isListening, audioLevel, startListening, stopListening } =
    useSpeechRecognition(processText);

  const handleTextSubmit = () => {
    if (textInput.trim()) {
      processText(textInput.trim());
      setTextInput("");
    }
  };

  const handleSuggestion = (suggestion: ProactiveSuggestion) => {
    processText(suggestion.title ?? suggestion.content_type);
  };

  useEffect(() => {
    if (!visible) {
      stopListening();
      setLastResponse(null);
    }
  }, [visible, stopListening]);

  if (!visible) return null;

  return (
    <View style={styles.overlay}>
      <GlassCard style={styles.panel}>
        <View style={styles.header}>
          <Text style={[styles.title, { textAlign }]}>
            {t("voice.panelTitle")}
          </Text>
          <GlassButton
            title={t("common.close")}
            onPress={onClose}
            variant="ghost"
            size="sm"
          />
        </View>

        <VoiceWaveform isActive={isListening} audioLevel={audioLevel} />

        {lastResponse && (
          <GlassCard style={styles.responseCard}>
            <Text style={styles.responseText}>{lastResponse}</Text>
          </GlassCard>
        )}

        <View style={styles.micWrap}>
          <GlassButton
            title={isListening ? t("voice.listening") : t("voice.tapToSpeak")}
            onPress={isListening ? stopListening : startListening}
            variant={isListening ? "primary" : "secondary"}
            size="md"
          />
        </View>

        <ProactiveSuggestions onSelect={handleSuggestion} />

        <View style={styles.textFallback}>
          <GlassInput
            value={textInput}
            onChangeText={setTextInput}
            placeholder={t("voice.typeCommand")}
            onSubmitEditing={handleTextSubmit}
          />
          <GlassButton
            title={t("common.send")}
            onPress={handleTextSubmit}
            variant="primary"
            size="sm"
          />
        </View>
      </GlassCard>
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    position: "absolute",
    bottom: 80,
    right: spacing.lg,
    zIndex: 1000,
  },
  panel: { width: 360, padding: spacing.lg, gap: spacing.md },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  title: { fontSize: 18, fontWeight: "700", color: colors.text },
  responseCard: { padding: spacing.sm },
  responseText: { fontSize: 13, color: colors.textSecondary },
  micWrap: { alignSelf: "center" },
  textFallback: { flexDirection: "row", gap: spacing.xs, alignItems: "center" },
});
