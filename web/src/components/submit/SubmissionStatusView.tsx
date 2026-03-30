import { View, Text, StyleSheet } from "react-native";
import { useTranslation } from "react-i18next";
import { useDirection } from "@/hooks/useDirection";
import { colors, spacing, borderRadius, fontSize } from "@olorin/design-tokens";
import { GlassView, GlassButton, GlassProgressBar } from "@bayit/shared/ui";
import { Clock, Film, AlertCircle } from "lucide-react";
import type { SubmissionStatus } from "@bayit/shared-services/api/submissionServices";

interface Props {
  status: SubmissionStatus;
  pageState: "processing" | "ready" | "error";
  errorMessage: string;
  onReset: () => void;
  onNavigateToWatch: (contentId: string) => void;
}

export function SubmissionStatusView({
  status,
  pageState,
  errorMessage,
  onReset,
  onNavigateToWatch,
}: Props) {
  const { t } = useTranslation();
  const { textAlign } = useDirection();

  if (pageState === "processing") {
    const progress = status.status === "extracting" ? 0.6 : 0.2;
    return (
      <GlassView style={styles.section}>
        <Clock size={32} color={colors.primary.DEFAULT} />
        <Text style={[styles.title, { textAlign }]}>
          {status.status === "extracting"
            ? t("submitVideo.extracting")
            : t("submitVideo.processing")}
        </Text>
        {status.video_title && (
          <Text style={[styles.videoTitle, { textAlign }]}>
            {status.video_title}
          </Text>
        )}
        <View style={styles.progressContainer}>
          <GlassProgressBar progress={progress} />
        </View>
        <Text style={[styles.hint, { textAlign }]}>
          {t("submitVideo.processingHint")}
        </Text>
      </GlassView>
    );
  }

  if (pageState === "ready") {
    return (
      <GlassView style={styles.section}>
        <Film size={32} color={colors.primary.DEFAULT} />
        <Text style={[styles.readyTitle, { textAlign }]}>
          {t("submitVideo.ready")}
        </Text>
        {status.video_title && (
          <Text style={[styles.videoTitle, { textAlign }]}>
            {status.video_title}
          </Text>
        )}
        <Text style={[styles.characterCount, { textAlign }]}>
          {t("submitVideo.characterCount", { count: status.character_count })}
        </Text>
        <View style={styles.actionButtons}>
          {status.content_id && (
            <GlassButton
              title={t("submitVideo.startConversation")}
              onPress={() => onNavigateToWatch(status.content_id!)}
              variant="primary"
              style={styles.actionButton}
            />
          )}
          <GlassButton
            title={t("submitVideo.submitAnother")}
            onPress={onReset}
            variant="secondary"
            style={styles.actionButton}
          />
        </View>
      </GlassView>
    );
  }

  return (
    <GlassView style={styles.section}>
      <AlertCircle size={32} color={colors.error.DEFAULT} />
      <Text style={[styles.errorTitle, { textAlign }]}>
        {t("submitVideo.errorTitle")}
      </Text>
      <Text style={[styles.errorText, { textAlign }]}>{errorMessage}</Text>
      <GlassButton
        title={t("submitVideo.tryAgain")}
        onPress={onReset}
        variant="secondary"
        style={styles.actionButton}
      />
    </GlassView>
  );
}

const styles = StyleSheet.create({
  section: {
    padding: spacing.xl * 1.5,
    borderRadius: borderRadius.xl,
    marginBottom: spacing.lg,
    alignItems: "center",
  },
  title: {
    fontSize: fontSize.lg,
    fontWeight: "600",
    color: colors.text,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  readyTitle: {
    fontSize: fontSize.xl,
    fontWeight: "700",
    color: colors.text,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  videoTitle: {
    fontSize: fontSize.base,
    color: colors.textMuted,
    marginBottom: spacing.md,
  },
  progressContainer: {
    width: "100%",
    marginVertical: spacing.md,
  },
  hint: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    marginTop: spacing.sm,
  },
  characterCount: {
    fontSize: fontSize.base,
    color: colors.primary.DEFAULT,
    fontWeight: "600",
    marginBottom: spacing.lg,
  },
  actionButtons: {
    flexDirection: "row",
    gap: spacing.md,
  },
  actionButton: {
    minWidth: 160,
  },
  errorTitle: {
    fontSize: fontSize.lg,
    fontWeight: "600",
    color: colors.error.DEFAULT,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  errorText: {
    fontSize: fontSize.base,
    color: colors.textMuted,
    marginBottom: spacing.lg,
  },
});
