import { useState, useCallback } from "react";
import { View, Text, ScrollView, StyleSheet } from "react-native";
import { useTranslation } from "react-i18next";
import { GlassCard, GlassModal } from "@bayit/shared/ui";
import { colors, spacing, borderRadius } from "@olorin/design-tokens";
import { useDirection } from "@/hooks/useDirection";
import {
  useBYOCStore,
  type BYOCSource,
  type SourceType,
} from "@/stores/byocStore";
import { BYOCWizard } from "@/components/byoc/BYOCWizard";
import { BYOCSourceTypeCard } from "@/components/byoc/BYOCSourceTypeCard";
import { BYOCConnectedPill } from "@/components/byoc/BYOCConnectedPill";

export default function BYOCPage() {
  const { t } = useTranslation();
  const { textAlign } = useDirection();
  const { sources, removeSource, syncSource } = useBYOCStore();
  const [showWizard, setShowWizard] = useState(false);
  const [selectedType, setSelectedType] = useState<SourceType | null>(null);

  const connectedSources = sources.filter((s) => s.status === "ready");

  const handleAddSource = useCallback((type: SourceType) => {
    setSelectedType(type);
    setShowWizard(true);
  }, []);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={[styles.heading, { textAlign }]}>
        {t("byoc.connectedSources")}
      </Text>
      <Text style={[styles.subtitle, { textAlign }]}>
        {t("byoc.connectContentDesc")}
      </Text>

      <View style={styles.gridContainer}>
        <View style={styles.grid}>
          <BYOCSourceTypeCard
            type="youtube"
            title={t("byoc.youtube")}
            description={t("byoc.youtubeConnectDesc")}
            onAdd={() => handleAddSource("youtube")}
          />
          <BYOCSourceTypeCard
            type="iptv"
            title={t("byoc.iptv")}
            description={t("byoc.iptvConnectDesc")}
            onAdd={() => handleAddSource("iptv")}
          />
          <BYOCSourceTypeCard
            type="xtream"
            title={t("byoc.addXtream")}
            description={t("byoc.xtreamConnectDesc")}
            onAdd={() => handleAddSource("xtream")}
          />
          <BYOCSourceTypeCard
            type="plex"
            title={t("byoc.plexLabel")}
            description={t("byoc.plexConnectDesc")}
            onAdd={() => handleAddSource("plex")}
          />
        </View>
      </View>

      {connectedSources.length > 0 && (
        <View style={styles.connectedSection}>
          <Text style={[styles.connectedHeading, { textAlign }]}>
            {t("byoc.alreadyConnected")}
          </Text>
          <View style={styles.connectedList}>
            {connectedSources.map((source) => (
              <BYOCConnectedPill key={source.id} source={source} />
            ))}
          </View>
        </View>
      )}

      <GlassModal visible={showWizard} onClose={() => setShowWizard(false)}>
        <BYOCWizard
          onComplete={() => setShowWizard(false)}
          onCancel={() => setShowWizard(false)}
        />
      </GlassModal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: {
    paddingBottom: spacing.xl,
    paddingHorizontal: spacing.lg,
    alignItems: "center",
  },
  heading: {
    fontSize: 32,
    fontWeight: "800",
    color: colors.text,
    marginTop: spacing.xl,
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: 16,
    color: colors.textSecondary,
    marginBottom: spacing.xl,
  },
  gridContainer: {
    width: "100%",
    maxWidth: 800,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md,
    justifyContent: "center",
  },
  connectedSection: {
    width: "100%",
    maxWidth: 800,
    marginTop: spacing.xl,
  },
  connectedHeading: {
    fontSize: 20,
    fontWeight: "700",
    color: colors.text,
    marginBottom: spacing.md,
  },
  connectedList: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
});
