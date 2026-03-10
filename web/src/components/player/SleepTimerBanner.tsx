import React, { useEffect, useState, useRef, useCallback } from "react";
import { View, Text, StyleSheet } from "react-native";
import { useTranslation } from "react-i18next";
import { GlassButton } from "@bayit/shared/ui";
import { colors, spacing, borderRadius } from "@olorin/design-tokens";
import { renderIcon } from "@olorin/shared-icons/web";

interface SleepTimerBannerProps {
  remainingSeconds: number;
  onExtend: (minutes: number) => void;
  onCancel: () => void;
  onExpire: () => void;
}

export const SleepTimerBanner: React.FC<SleepTimerBannerProps> = ({
  remainingSeconds: initialSeconds,
  onExtend,
  onCancel,
  onExpire,
}) => {
  const { t } = useTranslation();
  const [seconds, setSeconds] = useState(initialSeconds);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    setSeconds(initialSeconds);
  }, [initialSeconds]);

  useEffect(() => {
    intervalRef.current = setInterval(() => {
      setSeconds((prev) => {
        if (prev <= 1) {
          if (intervalRef.current) clearInterval(intervalRef.current);
          onExpire();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [onExpire]);

  const formatTime = useCallback((totalSecs: number) => {
    const hrs = Math.floor(totalSecs / 3600);
    const mins = Math.floor((totalSecs % 3600) / 60);
    const secs = totalSecs % 60;
    if (hrs > 0) {
      return `${hrs}:${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
    }
    return `${mins}:${String(secs).padStart(2, "0")}`;
  }, []);

  if (seconds <= 0) return null;

  return (
    <View style={styles.banner}>
      <View style={styles.left}>
        {renderIcon("timer", "sm", "secondary")}
        <Text style={styles.timerText}>
          {t("player.sleepTimer.remaining", { time: formatTime(seconds) })}
        </Text>
      </View>
      <View style={styles.actions}>
        <GlassButton
          title={t("player.sleepTimer.extend")}
          onPress={() => onExtend(15)}
          variant="ghost"
          size="sm"
        />
        <GlassButton
          title={t("player.sleepTimer.cancel")}
          onPress={onCancel}
          variant="ghost"
          size="sm"
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  banner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "rgba(59, 130, 246, 0.2)",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    marginHorizontal: spacing.md,
  },
  left: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  timerText: { fontSize: 13, fontWeight: "600", color: colors.text },
  actions: { flexDirection: "row", gap: spacing.sm },
});
