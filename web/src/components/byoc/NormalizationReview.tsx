import React, { useState } from "react";
import { View, Text, ScrollView, StyleSheet } from "react-native";
import { useTranslation } from "react-i18next";
import { GlassCard, GlassButton } from "@bayit/shared/ui";
import { colors, spacing, borderRadius } from "@olorin/design-tokens";
import { useDirection } from "@/hooks/useDirection";
import { byocService } from "@/services/api";
import logger from "@bayit/shared-utils/logger";

const reviewLogger = logger.scope("NormalizationReview");

interface MatchedChannel {
  source_name: string;
  matched_name: string;
  confidence: number;
  category: string;
}

interface UnmatchedChannel {
  source_name: string;
  category: string;
}

interface NormalizationReviewProps {
  jobId: string;
  matched: MatchedChannel[];
  unmatched: UnmatchedChannel[];
  onApply: () => void;
  onCancel: () => void;
}

export const NormalizationReview: React.FC<NormalizationReviewProps> = ({
  jobId,
  matched,
  unmatched,
  onApply,
  onCancel,
}) => {
  const { t } = useTranslation();
  const { textAlign, isRTL } = useDirection();
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [isApplying, setIsApplying] = useState(false);

  const toggleDismiss = (name: string) => {
    setDismissed((prev) => {
      const next = new Set(prev);
      if (next.has(name)) {
        next.delete(name);
      } else {
        next.add(name);
      }
      return next;
    });
  };

  const handleApply = async () => {
    setIsApplying(true);
    try {
      const excludedChannels = Array.from(dismissed);
      await byocService.applyNormalization(jobId, excludedChannels);
      onApply();
    } catch (err) {
      reviewLogger.error("Failed to apply normalization", { err });
    } finally {
      setIsApplying(false);
    }
  };

  return (
    <GlassCard style={styles.container}>
      <Text style={[styles.title, { textAlign }]}>
        {t("byoc.review.title")}
      </Text>
      <Text style={[styles.subtitle, { textAlign }]}>
        {t("byoc.review.subtitle", {
          matched: matched.length,
          unmatched: unmatched.length,
        })}
      </Text>

      <ScrollView style={styles.list} nestedScrollEnabled>
        <Text style={[styles.sectionTitle, { textAlign }]}>
          {t("byoc.review.matchedChannels")}
        </Text>
        {matched.map((ch) => (
          <View
            key={ch.source_name}
            style={[
              styles.channelRow,
              { flexDirection: isRTL ? "row-reverse" : "row" },
              dismissed.has(ch.source_name) && styles.channelDismissed,
            ]}
          >
            <View style={styles.channelInfo}>
              <Text style={styles.channelName} numberOfLines={1}>
                {ch.matched_name}
              </Text>
              <Text style={styles.channelSource} numberOfLines={1}>
                {ch.source_name}
              </Text>
            </View>
            <GlassButton
              title={dismissed.has(ch.source_name) ? "+" : "x"}
              onPress={() => toggleDismiss(ch.source_name)}
              variant="ghost"
              size="sm"
            />
          </View>
        ))}

        {unmatched.length > 0 && (
          <>
            <Text style={[styles.sectionTitle, { textAlign }]}>
              {t("byoc.review.unmatchedChannels")}
            </Text>
            {unmatched.map((ch) => (
              <View
                key={ch.source_name}
                style={[
                  styles.channelRow,
                  { flexDirection: isRTL ? "row-reverse" : "row" },
                ]}
              >
                <Text style={styles.channelName} numberOfLines={1}>
                  {ch.source_name}
                </Text>
                <Text style={styles.categoryBadge}>{ch.category}</Text>
              </View>
            ))}
          </>
        )}
      </ScrollView>

      <View style={styles.actions}>
        <GlassButton
          title={t("common.cancel")}
          onPress={onCancel}
          variant="ghost"
          size="sm"
        />
        <GlassButton
          title={t("byoc.review.apply")}
          onPress={handleApply}
          variant="primary"
          size="sm"
          disabled={isApplying}
        />
      </View>
    </GlassCard>
  );
};

const styles = StyleSheet.create({
  container: { padding: spacing.lg, maxWidth: 560, alignSelf: "center" },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.text,
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  list: { maxHeight: 400 },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.text,
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  channelRow: {
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.05)",
  },
  channelDismissed: { opacity: 0.4 },
  channelInfo: { flex: 1 },
  channelName: { fontSize: 13, color: colors.text },
  channelSource: { fontSize: 11, color: colors.textSecondary },
  categoryBadge: {
    fontSize: 11,
    color: colors.primary.DEFAULT,
    backgroundColor: "rgba(107, 33, 168, 0.15)",
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  actions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
});
