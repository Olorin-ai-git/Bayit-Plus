import { View, Text, StyleSheet } from "react-native";
import { useTranslation } from "react-i18next";
import { useDirection } from "@/hooks/useDirection";
import { colors, spacing, borderRadius, fontSize } from "@olorin/design-tokens";
import { GlassCard, GlassButton } from "@bayit/shared/ui";
import { Clock } from "lucide-react";
import type { SubmissionListItem } from "@bayit/shared-services/api/submissionServices";

interface Props {
  submissions: SubmissionListItem[];
  onNavigateToWatch: (contentId: string) => void;
}

export function PastSubmissionsList({ submissions, onNavigateToWatch }: Props) {
  const { t } = useTranslation();
  const { textAlign } = useDirection();

  if (submissions.length === 0) return null;

  return (
    <View style={styles.container}>
      <Text style={[styles.title, { textAlign }]}>
        {t("submitVideo.pastSubmissions")}
      </Text>
      {submissions.map((sub) => (
        <GlassCard key={sub.job_id} style={styles.card}>
          <View style={styles.row}>
            <View style={styles.info}>
              <Text style={[styles.itemTitle, { textAlign }]} numberOfLines={1}>
                {sub.video_title || sub.url}
              </Text>
              <Text style={[styles.meta, { textAlign }]}>
                {t(`submitVideo.status.${sub.status}`)}
                {sub.character_count > 0 &&
                  ` \u00B7 ${t("submitVideo.characterCount", { count: sub.character_count })}`}
              </Text>
            </View>
            {sub.status === "ready" && sub.content_id && (
              <GlassButton
                title={t("submitVideo.interact")}
                onPress={() => onNavigateToWatch(sub.content_id!)}
                variant="primary"
                style={styles.interactButton}
              />
            )}
            {(sub.status === "pending" || sub.status === "extracting") && (
              <View style={styles.statusBadge}>
                <Clock size={16} color={colors.textMuted} />
              </View>
            )}
          </View>
        </GlassCard>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: spacing.lg,
  },
  title: {
    fontSize: fontSize.lg,
    fontWeight: "600",
    color: colors.text,
    marginBottom: spacing.md,
  },
  card: {
    marginBottom: spacing.sm,
    padding: spacing.md,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  info: {
    flex: 1,
    marginRight: spacing.md,
  },
  itemTitle: {
    fontSize: fontSize.base,
    fontWeight: "500",
    color: colors.text,
  },
  meta: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  interactButton: {
    minWidth: 100,
  },
  statusBadge: {
    padding: spacing.sm,
  },
});
