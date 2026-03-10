import React, { useCallback, useState } from "react";
import { View, Text, StyleSheet } from "react-native";
import { useTranslation } from "react-i18next";
import { GlassButton } from "@bayit/shared/ui";
import { colors, spacing } from "@olorin/design-tokens";
import { useDirection } from "@/hooks/useDirection";
import { useBYOCStore } from "@/stores/byocStore";
import { AddIPTVSourceSheet } from "./AddIPTVSourceSheet";
import { AddXtreamSourceSheet } from "./AddXtreamSourceSheet";
import { NormalizationProgress } from "./NormalizationProgress";
import { NormalizationReview } from "./NormalizationReview";
import { BYOCStepIndicator } from "./BYOCStepIndicator";
import type { M3UChannel } from "@/utils/m3uParser";
import logger from "@bayit/shared-utils/logger";

const wizardLogger = logger.scope("BYOCWizard");

interface NormResult {
  matched: Array<{
    source_name: string;
    matched_name: string;
    confidence: number;
    category: string;
  }>;
  unmatched: Array<{ source_name: string; category: string }>;
}

interface BYOCWizardProps {
  onComplete: () => void;
  onCancel: () => void;
}

export const BYOCWizard: React.FC<BYOCWizardProps> = ({
  onComplete,
  onCancel,
}) => {
  const { t } = useTranslation();
  const { textAlign } = useDirection();
  const {
    wizard,
    setWizardStep,
    setWizardSourceType,
    addSource,
    syncSource,
    resetWizard,
  } = useBYOCStore();

  const [normResult, setNormResult] = useState<NormResult | null>(null);

  const handleIPTVSubmit = (url: string, channels: M3UChannel[]) => {
    const sourceId = crypto.randomUUID();
    addSource({
      id: sourceId,
      type: "iptv",
      name: t("byoc.source.iptv"),
      url,
      channelCount: channels.length,
      status: "normalizing",
      lastSynced: null,
      errorKey: null,
    });
    syncSource(sourceId);
    setWizardStep(1);
  };

  const handleXtreamSubmit = (creds: {
    serverUrl: string;
    username: string;
    password: string;
  }) => {
    const sourceId = crypto.randomUUID();
    const xtreamUrl = `${creds.serverUrl}/get.php?username=${creds.username}&password=${creds.password}&type=m3u_plus`;
    addSource({
      id: sourceId,
      type: "xtream",
      name: t("byoc.source.xtream"),
      url: xtreamUrl,
      credentials: { username: creds.username, password: creds.password },
      channelCount: 0,
      status: "normalizing",
      lastSynced: null,
      errorKey: null,
    });
    syncSource(sourceId);
    setWizardStep(1);
  };

  const handleNormComplete = useCallback(
    (status: { matched_channels: number; unmatched_channels: number }) => {
      wizardLogger.info("Normalization complete", { status });
      setNormResult({ matched: [], unmatched: [] });
      setWizardStep(2);
    },
    [setWizardStep],
  );

  const handleNormError = useCallback((errorKey: string) => {
    wizardLogger.error("Normalization failed", { errorKey });
  }, []);

  const handleApply = () => {
    resetWizard();
    onComplete();
  };
  const handleCancel = () => {
    resetWizard();
    onCancel();
  };

  return (
    <View style={styles.container}>
      <BYOCStepIndicator
        labels={[
          t("byoc.wizard.step1"),
          t("byoc.wizard.step2"),
          t("byoc.wizard.step3"),
        ]}
        activeStep={wizard.step}
      />

      {wizard.step === 0 && (
        <View style={styles.sourceSelection}>
          <Text style={[styles.sectionTitle, { textAlign }]}>
            {t("byoc.wizard.selectSource")}
          </Text>
          <View style={styles.sourceButtons}>
            <GlassButton
              title={t("byoc.sourceType.iptv")}
              onPress={() => setWizardSourceType("iptv")}
              variant={wizard.sourceType === "iptv" ? "primary" : "ghost"}
              size="sm"
            />
            <GlassButton
              title={t("byoc.sourceType.xtream")}
              onPress={() => setWizardSourceType("xtream")}
              variant={wizard.sourceType === "xtream" ? "primary" : "ghost"}
              size="sm"
            />
          </View>
          {wizard.sourceType === "iptv" && (
            <AddIPTVSourceSheet
              onSubmit={handleIPTVSubmit}
              onCancel={handleCancel}
            />
          )}
          {wizard.sourceType === "xtream" && (
            <AddXtreamSourceSheet
              onSubmit={handleXtreamSubmit}
              onCancel={handleCancel}
            />
          )}
        </View>
      )}

      {wizard.step === 1 && wizard.jobId && (
        <NormalizationProgress
          jobId={wizard.jobId}
          onComplete={handleNormComplete}
          onError={handleNormError}
        />
      )}

      {wizard.step === 2 && wizard.jobId && normResult && (
        <NormalizationReview
          jobId={wizard.jobId}
          matched={normResult.matched}
          unmatched={normResult.unmatched}
          onApply={handleApply}
          onCancel={handleCancel}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: spacing.md },
  sourceSelection: { gap: spacing.md },
  sectionTitle: { fontSize: 16, fontWeight: "700", color: colors.text },
  sourceButtons: { flexDirection: "row", gap: spacing.sm },
});
