import { useState, lazy, Suspense } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { useTranslation } from "react-i18next";
import { GlassPageHeader, GlassLoadingSpinner } from "@bayit/shared/ui";
import { colors, spacing, borderRadius } from "@olorin/design-tokens";
import { useDirection } from "@/hooks/useDirection";

const RadioPage = lazy(() => import("./RadioPage"));
const PodcastsPage = lazy(() => import("./PodcastsPage"));
const AudiobooksPage = lazy(() => import("./audiobooks/AudiobooksPage"));

type ListenTab = "radio" | "podcasts" | "audiobooks";

const TABS: Array<{ id: ListenTab; labelKey: string }> = [
  { id: "radio", labelKey: "listen.tab.radio" },
  { id: "podcasts", labelKey: "listen.tab.podcasts" },
  { id: "audiobooks", labelKey: "listen.tab.audiobooks" },
];

export default function ListenPage() {
  const { t } = useTranslation();
  const { isRTL } = useDirection();
  const [activeTab, setActiveTab] = useState<ListenTab>("radio");

  return (
    <View style={styles.container}>
      <GlassPageHeader
        title={t("nav.listen")}
        subtitle={t("listen.subtitle")}
      />
      <View style={[styles.tabBar, isRTL && { flexDirection: "row-reverse" }]}>
        {TABS.map((tab) => (
          <TouchableOpacity
            key={tab.id}
            onPress={() => setActiveTab(tab.id)}
            style={[styles.tab, activeTab === tab.id && styles.tabActive]}
          >
            <Text
              style={[
                styles.tabLabel,
                activeTab === tab.id && styles.tabLabelActive,
              ]}
            >
              {t(tab.labelKey)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      <View style={styles.content}>
        <Suspense
          fallback={
            <View style={styles.loading}>
              <GlassLoadingSpinner size="small" />
            </View>
          }
        >
          {activeTab === "radio" && <RadioPage />}
          {activeTab === "podcasts" && <PodcastsPage />}
          {activeTab === "audiobooks" && <AudiobooksPage />}
        </Suspense>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  tabBar: {
    flexDirection: "row",
    paddingHorizontal: spacing.md,
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  tab: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    backgroundColor: "rgba(255,255,255,0.05)",
  },
  tabActive: { backgroundColor: colors.primary.DEFAULT },
  tabLabel: { fontSize: 14, color: colors.textSecondary, fontWeight: "500" },
  tabLabelActive: { color: colors.text, fontWeight: "600" },
  content: { flex: 1 },
  loading: { flex: 1, justifyContent: "center", alignItems: "center" },
});
