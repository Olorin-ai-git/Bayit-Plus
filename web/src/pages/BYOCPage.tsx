import { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
} from "react-native";
import { useTranslation } from "react-i18next";
import {
  GlassCard,
  GlassButton,
  GlassPageHeader,
  GlassEmptyState,
  GlassModal,
} from "@bayit/shared/ui";
import { colors, spacing, borderRadius } from "@olorin/design-tokens";
import { renderIcon } from "@olorin/shared-icons/web";
import { useDirection } from "@/hooks/useDirection";
import { useBYOCStore, type BYOCSource } from "@/stores/byocStore";
import { BYOCWizard } from "@/components/byoc/BYOCWizard";
import { BYOCProviderPicker } from "@/components/byoc/BYOCProviderPicker";

const STATUS_COLORS: Record<string, string> = {
  ready: "#22c55e",
  normalizing: "#eab308",
  pending: "#3b82f6",
  error: "#ef4444",
};

function SourceCard({
  source,
  onRemove,
  onSync,
}: {
  source: BYOCSource;
  onRemove: () => void;
  onSync: () => void;
}) {
  const { t } = useTranslation();
  const { isRTL } = useDirection();

  return (
    <GlassCard style={styles.sourceCard}>
      <View
        style={[
          styles.sourceHeader,
          { flexDirection: isRTL ? "row-reverse" : "row" },
        ]}
      >
        <View style={styles.sourceIcon}>
          {renderIcon(
            source.type === "xtream" ? "server" : "list",
            "sm",
            "secondary",
          )}
        </View>
        <View style={styles.sourceInfo}>
          <Text style={styles.sourceName} numberOfLines={1}>
            {source.name}
          </Text>
          <Text style={styles.sourceChannels}>
            {t("byoc.channelCount", { count: source.channelCount })}
          </Text>
        </View>
        <View
          style={[
            styles.statusDot,
            {
              backgroundColor:
                STATUS_COLORS[source.status] || colors.textSecondary,
            },
          ]}
        />
      </View>
      <View style={styles.sourceActions}>
        <GlassButton
          title={t("byoc.sync")}
          onPress={onSync}
          variant="ghost"
          size="sm"
          disabled={source.status === "normalizing"}
        />
        <GlassButton
          title={t("byoc.remove")}
          onPress={onRemove}
          variant="ghost"
          size="sm"
        />
      </View>
    </GlassCard>
  );
}

export default function BYOCPage() {
  const { t } = useTranslation();
  const { textAlign } = useDirection();
  const { sources, removeSource, syncSource } = useBYOCStore();
  const [showWizard, setShowWizard] = useState(false);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <GlassPageHeader
        title={t("nav.byoc")}
        subtitle={t("byoc.pageSubtitle")}
      />

      <BYOCProviderPicker
        onSelect={(provider) => {
          setShowWizard(true);
        }}
      />

      {sources.length === 0 ? (
        <GlassEmptyState
          title={t("byoc.empty.title")}
          subtitle={t("byoc.empty.subtitle")}
          actionLabel={t("byoc.addSource")}
          onAction={() => setShowWizard(true)}
        />
      ) : (
        <View style={styles.sourceList}>
          {sources.map((source) => (
            <SourceCard
              key={source.id}
              source={source}
              onRemove={() => removeSource(source.id)}
              onSync={() => syncSource(source.id)}
            />
          ))}
          <GlassButton
            title={t("byoc.addSource")}
            onPress={() => setShowWizard(true)}
            variant="secondary"
            size="md"
          />
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
  content: { paddingBottom: spacing.xl },
  sourceList: { padding: spacing.md, gap: spacing.sm },
  sourceCard: { padding: spacing.md },
  sourceHeader: {
    alignItems: "center",
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  sourceIcon: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.md,
    backgroundColor: "rgba(107, 33, 168, 0.15)",
    justifyContent: "center",
    alignItems: "center",
  },
  sourceInfo: { flex: 1 },
  sourceName: { fontSize: 14, fontWeight: "600", color: colors.text },
  sourceChannels: { fontSize: 12, color: colors.textSecondary },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  sourceActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: spacing.xs,
  },
});
