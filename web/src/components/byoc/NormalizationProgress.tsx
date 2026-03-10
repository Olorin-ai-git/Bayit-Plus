import React, { useEffect, useState, useRef } from "react";
import { View, Text, StyleSheet } from "react-native";
import { useTranslation } from "react-i18next";
import { GlassCard } from "@bayit/shared/ui";
import { colors, spacing, borderRadius } from "@olorin/design-tokens";
import { useDirection } from "@/hooks/useDirection";
import { byocService } from "@/services/api";
import logger from "@bayit/shared-utils/logger";

const normLogger = logger.scope("NormalizationProgress");

interface NormalizationStatus {
  status: string;
  stage: string;
  progress: number;
  total_channels: number;
  matched_channels: number;
  unmatched_channels: number;
}

interface NormalizationProgressProps {
  jobId: string;
  onComplete: (status: NormalizationStatus) => void;
  onError: (errorKey: string) => void;
}

const POLL_INTERVAL_MS = 2000;

export const NormalizationProgress: React.FC<NormalizationProgressProps> = ({
  jobId,
  onComplete,
  onError,
}) => {
  const { t } = useTranslation();
  const { textAlign } = useDirection();
  const [status, setStatus] = useState<NormalizationStatus | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const poll = async () => {
      try {
        const data = await byocService.getNormalizationStatus(jobId);
        setStatus(data);
        if (data.status === "completed") {
          if (intervalRef.current) clearInterval(intervalRef.current);
          onComplete(data);
        } else if (data.status === "failed") {
          if (intervalRef.current) clearInterval(intervalRef.current);
          onError("byoc.error.normalizationFailed");
        }
      } catch (err) {
        normLogger.error("Failed to poll normalization status", { err });
        if (intervalRef.current) clearInterval(intervalRef.current);
        onError("byoc.error.normalizationPollFailed");
      }
    };

    poll();
    intervalRef.current = setInterval(poll, POLL_INTERVAL_MS);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [jobId, onComplete, onError]);

  const progressPct = status ? Math.round(status.progress * 100) : 0;

  return (
    <GlassCard style={styles.container}>
      <Text style={[styles.title, { textAlign }]}>
        {t("byoc.normalization.title")}
      </Text>
      {status?.stage && (
        <Text style={[styles.stage, { textAlign }]}>
          {t(`byoc.normalization.stage.${status.stage}`)}
        </Text>
      )}
      <View style={styles.barTrack}>
        <View style={[styles.barFill, { width: `${progressPct}%` }]} />
      </View>
      <Text style={styles.percentage}>{progressPct}%</Text>
      {status && (
        <View style={styles.stats}>
          <Text style={styles.stat}>
            {t("byoc.normalization.total", { count: status.total_channels })}
          </Text>
          <Text style={styles.stat}>
            {t("byoc.normalization.matched", {
              count: status.matched_channels,
            })}
          </Text>
        </View>
      )}
    </GlassCard>
  );
};

const styles = StyleSheet.create({
  container: { padding: spacing.lg, maxWidth: 480, alignSelf: "center" },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.text,
    marginBottom: spacing.sm,
  },
  stage: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  barTrack: {
    height: 8,
    borderRadius: 4,
    backgroundColor: "rgba(255,255,255,0.1)",
    overflow: "hidden",
    marginBottom: spacing.xs,
  },
  barFill: {
    height: "100%",
    borderRadius: 4,
    backgroundColor: colors.primary.DEFAULT,
  },
  percentage: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: "center",
  },
  stats: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: spacing.md,
  },
  stat: { fontSize: 12, color: colors.textSecondary },
});
