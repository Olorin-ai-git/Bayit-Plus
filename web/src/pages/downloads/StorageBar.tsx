import { useState, useEffect } from "react";
import { View, Text, StyleSheet } from "react-native";
import { HardDrive } from "lucide-react";
import { useTranslation } from "react-i18next";
import { GlassCard } from "@bayit/shared/ui";
import { colors, spacing, fontSize, borderRadius } from "@olorin/design-tokens";
import { useDownloadStore, selectStorageUsedGB } from "@/stores/downloadStore";

const LOW_STORAGE_GB = 5;
const BYTES_PER_GB = 1024 * 1024 * 1024;

const formatSize = (gb: number) => {
  if (gb >= 1) return `${gb.toFixed(1)} GB`;
  return `${Math.round(gb * 1024)} MB`;
};

export function StorageBar() {
  const { t } = useTranslation();
  const usedGB = useDownloadStore(selectStorageUsedGB);
  const [totalGB, setTotalGB] = useState<number | null>(null);
  const [availableGB, setAvailableGB] = useState<number | null>(null);

  useEffect(() => {
    if (typeof navigator !== "undefined" && navigator.storage?.estimate) {
      navigator.storage.estimate().then((estimate) => {
        if (estimate.quota) setTotalGB(estimate.quota / BYTES_PER_GB);
        if (estimate.quota && estimate.usage !== undefined) {
          setAvailableGB((estimate.quota - estimate.usage) / BYTES_PER_GB);
        }
      });
    }
  }, []);

  const displayTotal = totalGB ?? 0;
  const pct =
    displayTotal > 0 ? Math.min((usedGB / displayTotal) * 100, 100) : 0;
  const isLow = availableGB !== null && availableGB < LOW_STORAGE_GB;

  return (
    <GlassCard style={styles.card}>
      <View style={styles.content}>
        <HardDrive size={24} color={isLow ? "#EAB308" : colors.textMuted} />
        <View style={styles.info}>
          <View style={styles.labelRow}>
            <Text style={styles.label}>{t("downloads.storage")}</Text>
            <Text style={styles.value}>
              {formatSize(usedGB)}
              {displayTotal > 0 ? ` / ${formatSize(displayTotal)}` : ""}
            </Text>
          </View>
          <View style={styles.barBackground}>
            <View
              style={[
                styles.barFill,
                { width: `${pct}%` },
                isLow && { backgroundColor: "#EAB308" },
              ]}
            />
          </View>
          {isLow && (
            <Text style={styles.warningText}>{t("downloads.storageLow")}</Text>
          )}
        </View>
      </View>
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  card: { padding: spacing.lg, marginBottom: spacing.xl },
  content: { flexDirection: "row", alignItems: "center", gap: spacing.lg },
  info: { flex: 1 },
  labelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: spacing.sm,
  },
  label: { color: colors.textMuted, fontSize: fontSize.sm },
  value: { color: colors.text, fontSize: fontSize.sm },
  barBackground: {
    height: 8,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: borderRadius.full,
    overflow: "hidden",
  },
  barFill: {
    height: "100%",
    backgroundColor: colors.primary.DEFAULT,
    borderRadius: borderRadius.full,
  },
  warningText: {
    color: "#EAB308",
    fontSize: fontSize.xs,
    marginTop: spacing.xs,
  },
});
