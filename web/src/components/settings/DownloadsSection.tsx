import { useState } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { HardDrive } from "lucide-react";
import { useTranslation } from "react-i18next";
import { colors, spacing, fontSize } from "@olorin/design-tokens";
import { SettingSection } from "./shared/SettingSection";
import { useDirection } from "@/hooks/useDirection";

type DownloadQuality = "sd" | "hd" | "fhd";

const QUALITY_KEY = "downloadQuality";

const readQuality = (): DownloadQuality => {
  try {
    const stored = localStorage.getItem(QUALITY_KEY);
    if (stored === "sd" || stored === "hd" || stored === "fhd") return stored;
  } catch {
    // storage unavailable
  }
  return "hd";
};

const writeQuality = (q: DownloadQuality): void => {
  try {
    localStorage.setItem(QUALITY_KEY, q);
  } catch {
    // storage unavailable
  }
};

interface QualityOption {
  value: DownloadQuality;
  labelKey: string;
  hintKey: string;
}

const QUALITY_OPTIONS: QualityOption[] = [
  {
    value: "sd",
    labelKey: "settings.downloads.qualitySd",
    hintKey: "settings.downloads.sizeHintSd",
  },
  {
    value: "hd",
    labelKey: "settings.downloads.qualityHd",
    hintKey: "settings.downloads.sizeHintHd",
  },
  {
    value: "fhd",
    labelKey: "settings.downloads.qualityFhd",
    hintKey: "settings.downloads.sizeHintFhd",
  },
];

export function DownloadsSection() {
  const { t } = useTranslation();
  const { isRTL } = useDirection();
  const [quality, setQuality] = useState<DownloadQuality>(readQuality);

  const handleSelect = (q: DownloadQuality) => {
    setQuality(q);
    writeQuality(q);
  };

  return (
    <SettingSection title={t("settings.downloads.title")} isRTL={isRTL}>
      <View style={styles.qualityHeader}>
        <HardDrive size={16} color={colors.primary.DEFAULT} />
        <Text style={[styles.qualityLabel, isRTL && styles.textRight]}>
          {t("settings.downloads.quality")}
        </Text>
      </View>

      {QUALITY_OPTIONS.map((opt) => (
        <Pressable
          key={opt.value}
          onPress={() => handleSelect(opt.value)}
          style={[
            styles.option,
            quality === opt.value && styles.optionSelected,
          ]}
        >
          <View
            style={[
              styles.radioOuter,
              quality === opt.value && styles.radioOuterSelected,
            ]}
          >
            {quality === opt.value && <View style={styles.radioInner} />}
          </View>
          <View style={styles.optionText}>
            <Text style={styles.optionLabel}>{t(opt.labelKey)}</Text>
            <Text style={styles.optionHint}>{t(opt.hintKey)}</Text>
          </View>
        </Pressable>
      ))}
    </SettingSection>
  );
}

const styles = StyleSheet.create({
  qualityHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginBottom: spacing.sm,
    paddingVertical: spacing.sm,
  },
  qualityLabel: {
    color: colors.text,
    fontSize: fontSize.base,
    fontWeight: "500",
  },
  textRight: { textAlign: "right" },
  option: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    borderRadius: 8,
    marginBottom: spacing.xs,
  },
  optionSelected: {
    backgroundColor: "rgba(168,85,247,0.1)",
  },
  radioOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.3)",
    justifyContent: "center",
    alignItems: "center",
  },
  radioOuterSelected: { borderColor: colors.primary.DEFAULT },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.primary.DEFAULT,
  },
  optionText: { flex: 1 },
  optionLabel: {
    color: colors.text,
    fontSize: fontSize.base,
    fontWeight: "500",
  },
  optionHint: { color: colors.textMuted, fontSize: fontSize.xs, marginTop: 2 },
});
