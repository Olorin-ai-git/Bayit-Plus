import { useState } from "react";
import { View, Text, ScrollView } from "react-native";
import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  GlassCard,
  GlassButton,
  GlassPageHeader,
  GlassModal,
} from "@bayit/shared/ui";
import { renderIcon } from "@olorin/shared-icons/web";
import { useDirection } from "@/hooks/useDirection";
import { useDiscoverStore } from "@/stores/discoverStore";
import { getFeatureById } from "@/data/discoverCatalog";
import { DiscoverAvailabilityBadge } from "@/components/discover/DiscoverAvailabilityBadge";
import { DiscoverWalkthrough } from "@/components/discover/DiscoverWalkthrough";
import type { DiscoverFeatureId } from "@/data/discoverTypes";
import { styles } from "./discoverDetailStyles";

export default function DiscoverFeatureDetailPage() {
  const { featureId } = useParams<{ featureId: string }>();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { isRTL, textAlign } = useDirection();
  const { getAvailability, startWalkthrough, walkthroughs } =
    useDiscoverStore();
  const [showWalkthrough, setShowWalkthrough] = useState(false);

  const feature = featureId ? getFeatureById(featureId) : undefined;

  if (!feature) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>
          {t("discover.error.unknownFeature")}
        </Text>
        <GlassButton
          title={t("common.back")}
          onPress={() => navigate("/discover")}
          variant="ghost"
          size="sm"
        />
      </View>
    );
  }

  const availability = getAvailability(feature.id);
  const wt = walkthroughs[feature.id];
  const hasCompletedWalkthrough = wt?.completed === true;

  const handleTryIt = () => {
    if (feature.deepLinkRoute) {
      navigate(feature.deepLinkRoute);
    }
  };

  const handleStartWalkthrough = () => {
    startWalkthrough(feature.id as DiscoverFeatureId);
    setShowWalkthrough(true);
  };

  const platformLabels = feature.platforms.map((p) =>
    t(`discover.platform.${p}`),
  );

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <GlassPageHeader title={t(feature.nameKey)} />

      <GlassCard style={styles.heroCard}>
        <View
          style={[
            styles.heroHeader,
            { flexDirection: isRTL ? "row-reverse" : "row" },
          ]}
        >
          <View style={styles.iconWrap}>
            {renderIcon(feature.iconName, "lg", "discover")}
          </View>
          <View style={styles.heroMeta}>
            <Text style={[styles.tagline, { textAlign }]}>
              {t(feature.taglineKey)}
            </Text>
            <DiscoverAvailabilityBadge availability={availability} />
          </View>
        </View>

        <Text style={[styles.description, { textAlign }]}>
          {t(feature.descriptionKey)}
        </Text>

        <View style={styles.platformRow}>
          <Text style={styles.platformLabel}>{t("discover.availableOn")}:</Text>
          <Text style={styles.platformList}>{platformLabels.join(", ")}</Text>
        </View>

        {feature.prerequisites.length > 0 && (
          <View style={styles.prereqSection}>
            <Text style={[styles.sectionTitle, { textAlign }]}>
              {t("discover.prerequisites")}
            </Text>
            {feature.prerequisites.map((prereq) => (
              <View
                key={prereq.type}
                style={[
                  styles.prereqRow,
                  { flexDirection: isRTL ? "row-reverse" : "row" },
                ]}
              >
                <Text style={styles.prereqText}>
                  {t(prereq.descriptionKey)}
                </Text>
                <GlassButton
                  title={t("discover.setup")}
                  onPress={() => navigate(prereq.fixRoute)}
                  variant="ghost"
                  size="sm"
                />
              </View>
            ))}
          </View>
        )}
      </GlassCard>

      <View style={styles.actions}>
        {feature.walkthroughSteps.length > 0 && !hasCompletedWalkthrough && (
          <GlassButton
            title={t("discover.startWalkthrough")}
            onPress={handleStartWalkthrough}
            variant="secondary"
            size="md"
          />
        )}
        {availability.state === "ready" && feature.deepLinkRoute && (
          <GlassButton
            title={t("discover.tryIt")}
            onPress={handleTryIt}
            variant="primary"
            size="md"
          />
        )}
      </View>

      <GlassModal
        visible={showWalkthrough}
        onClose={() => setShowWalkthrough(false)}
      >
        <DiscoverWalkthrough
          feature={feature}
          onClose={() => setShowWalkthrough(false)}
        />
      </GlassModal>
    </ScrollView>
  );
}
