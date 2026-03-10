import React, { useState } from "react";
import { View, Text, StyleSheet } from "react-native";
import { useTranslation } from "react-i18next";
import { GlassButton, GlassInput } from "@bayit/shared/ui";
import { colors, spacing } from "@olorin/design-tokens";

const PRESET_MINUTES = [15, 30, 45, 60, 90];

interface SleepTimerPickerProps {
  onSetTimer: (minutes: number) => void;
  onCancel: () => void;
}

export const SleepTimerPicker: React.FC<SleepTimerPickerProps> = ({
  onSetTimer,
  onCancel,
}) => {
  const { t } = useTranslation();
  const [customMinutes, setCustomMinutes] = useState("");

  const handleCustomSet = () => {
    const mins = parseInt(customMinutes, 10);
    if (mins > 0 && mins <= 480) {
      onSetTimer(mins);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t("player.sleepTimer.title")}</Text>
      <Text style={styles.subtitle}>{t("player.sleepTimer.subtitle")}</Text>

      <View style={styles.presets}>
        {PRESET_MINUTES.map((mins) => (
          <GlassButton
            key={mins}
            title={t("player.sleepTimer.minutes", { count: mins })}
            onPress={() => onSetTimer(mins)}
            variant="ghost"
            size="sm"
          />
        ))}
      </View>

      <View style={styles.customRow}>
        <View style={styles.customInputWrap}>
          <GlassInput
            value={customMinutes}
            onChangeText={setCustomMinutes}
            placeholder={t("player.sleepTimer.customPlaceholder")}
            keyboardType="numeric"
          />
        </View>
        <GlassButton
          title={t("player.sleepTimer.set")}
          onPress={handleCustomSet}
          variant="primary"
          size="sm"
          disabled={!customMinutes || parseInt(customMinutes, 10) <= 0}
        />
      </View>

      <GlassButton
        title={t("common.cancel")}
        onPress={onCancel}
        variant="ghost"
        size="sm"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { padding: spacing.lg, gap: spacing.md, alignItems: "center" },
  title: { fontSize: 18, fontWeight: "700", color: colors.text },
  subtitle: { fontSize: 13, color: colors.textSecondary },
  presets: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    justifyContent: "center",
  },
  customRow: {
    flexDirection: "row",
    gap: spacing.sm,
    alignItems: "center",
    width: "100%",
    maxWidth: 300,
  },
  customInputWrap: { flex: 1 },
});
