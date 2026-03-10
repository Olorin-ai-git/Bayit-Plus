import React, { useState } from "react";
import { View, Text, StyleSheet } from "react-native";
import { useTranslation } from "react-i18next";
import { GlassCard, GlassInput, GlassButton } from "@bayit/shared/ui";
import { colors, spacing, borderRadius } from "@olorin/design-tokens";
import { useDirection } from "@/hooks/useDirection";
import { parseM3U, type M3UChannel } from "@/utils/m3uParser";
import logger from "@bayit/shared-utils/logger";

const sheetLogger = logger.scope("AddIPTVSourceSheet");

interface AddIPTVSourceSheetProps {
  onSubmit: (url: string, channels: M3UChannel[]) => void;
  onCancel: () => void;
}

export const AddIPTVSourceSheet: React.FC<AddIPTVSourceSheetProps> = ({
  onSubmit,
  onCancel,
}) => {
  const { t } = useTranslation();
  const { textAlign } = useDirection();
  const [url, setUrl] = useState("");
  const [isValidating, setIsValidating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<M3UChannel[] | null>(null);

  const handleValidate = async () => {
    if (!url.trim()) {
      setError("byoc.error.urlRequired");
      return;
    }
    setIsValidating(true);
    setError(null);
    try {
      const response = await fetch(url);
      const content = await response.text();
      const channels = parseM3U(content);
      if (channels.length === 0) {
        setError("byoc.error.noChannels");
        return;
      }
      setPreview(channels);
    } catch (err) {
      sheetLogger.error("Failed to validate M3U URL", { err });
      setError("byoc.error.invalidUrl");
    } finally {
      setIsValidating(false);
    }
  };

  const handleSubmit = () => {
    if (preview) {
      onSubmit(url, preview);
    }
  };

  return (
    <GlassCard style={styles.container}>
      <Text style={[styles.title, { textAlign }]}>
        {t("byoc.addIptv.title")}
      </Text>
      <Text style={[styles.subtitle, { textAlign }]}>
        {t("byoc.addIptv.subtitle")}
      </Text>

      <GlassInput
        value={url}
        onChangeText={setUrl}
        placeholder={t("byoc.addIptv.urlPlaceholder")}
        autoCapitalize="none"
        autoCorrect={false}
      />

      {error && <Text style={styles.errorText}>{t(error)}</Text>}

      {preview && (
        <View style={styles.previewBox}>
          <Text style={[styles.previewTitle, { textAlign }]}>
            {t("byoc.preview.title")}
          </Text>
          <Text style={styles.previewStat}>
            {t("byoc.preview.channelCount", { count: preview.length })}
          </Text>
        </View>
      )}

      <View style={styles.actions}>
        <GlassButton
          title={t("common.cancel")}
          onPress={onCancel}
          variant="ghost"
          size="sm"
        />
        {preview ? (
          <GlassButton
            title={t("byoc.addIptv.add")}
            onPress={handleSubmit}
            variant="primary"
            size="sm"
          />
        ) : (
          <GlassButton
            title={t("byoc.addIptv.validate")}
            onPress={handleValidate}
            variant="primary"
            size="sm"
            disabled={isValidating}
          />
        )}
      </View>
    </GlassCard>
  );
};

const styles = StyleSheet.create({
  container: { padding: spacing.lg, maxWidth: 480, alignSelf: "center" },
  title: {
    fontSize: 20,
    fontWeight: "700",
    color: colors.text,
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  errorText: { fontSize: 13, color: colors.error, marginTop: spacing.xs },
  previewBox: {
    backgroundColor: "rgba(34, 197, 94, 0.1)",
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginTop: spacing.md,
  },
  previewTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.text,
    marginBottom: spacing.xs,
  },
  previewStat: { fontSize: 13, color: colors.textSecondary },
  actions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
});
