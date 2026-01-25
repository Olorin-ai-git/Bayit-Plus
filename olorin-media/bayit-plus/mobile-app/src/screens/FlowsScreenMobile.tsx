/**
 * FlowsScreenMobile - Mobile-optimized content flows/sequences screen
 *
 * Features:
 * - Vertical flow cards
 * - Simplified active flow banner
 * - Modal sheets for flow details
 * - RTL support
 * - Pull-to-refresh
 * - Haptic feedback
 */

import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
  RefreshControl,
  Modal,
  Animated,
} from "react-native";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { useTranslation } from "react-i18next";
import LinearGradient from "react-native-linear-gradient";
import ReactNativeHapticFeedback from "react-native-haptic-feedback";
import { useProfile } from "@bayit/shared-contexts";
import { useDirection } from "@bayit/shared-hooks";
import api from "@bayit/shared-services/api";
import { spacing, colors, borderRadius } from '@olorin/design-tokens';

import logger from '@/utils/logger';


const moduleLogger = logger.scope('FlowsScreenMobile');

// Type assertion for LinearGradient React component
const LinearGradientComponent = LinearGradient as any as React.FC<any>;

interface FlowItem {
  content_id: string;
  content_type: string;
  title: string;
  thumbnail?: string;
  duration_hint?: number;
  order: number;
}

interface FlowTrigger {
  type: "time" | "shabbat" | "holiday";
  start_time?: string;
  end_time?: string;
  days?: number[];
}

interface Flow {
  id: string;
  name: string;
  name_en?: string;
  name_es?: string;
  description?: string;
  icon: string;
  flow_type: string;
  is_active: boolean;
  items: FlowItem[];
  triggers: FlowTrigger[];
  auto_play: boolean;
  ai_enabled: boolean;
  ai_brief_enabled: boolean;
}

const FLOW_ICONS: { [key: string]: { icon: string; colors: string[] } } = {
  "טקס בוקר": { icon: "☀️", colors: ["#ff9500", "#ff6b00"] },
  "ליל שבת": { icon: "🌙", colors: ["#5856d6", "#8b5cf6"] },
  "שעת שינה": { icon: "🛏️", colors: ["#1a1a2e", "#4a4a8a"] },
  "זמן ילדים": { icon: "👶", colors: ["#ff2d55", "#ff6b9d"] },
};

interface FlowCardProps {
  flow: Flow;
  onPress: () => void;
  getLocalizedName: (flow: Flow) => string;
}

const FlowCard: React.FC<FlowCardProps> = ({
  flow,
  onPress,
  getLocalizedName,
}) => {
  const { t } = useTranslation();
  const { isRTL, textAlign } = useDirection();
  const iconConfig = FLOW_ICONS[flow.name] || {
    icon: "▶️",
    colors: [colors.primary, colors.primaryDark],
  };
  const isSystem = flow.flow_type === "system";

  const handlePress = useCallback(() => {
    ReactNativeHapticFeedback.trigger("impactLight");
    onPress();
  }, [onPress]);

  return (
    <TouchableOpacity
      style={styles.flowCard}
      onPress={handlePress}
      activeOpacity={0.8}
    >
      <View
        style={[
          styles.flowCardContent,
          { flexDirection: isRTL ? "row" : "row-reverse" },
        ]}
      >
        <LinearGradientComponent
          colors={iconConfig.colors}
          style={styles.flowIcon}
        >
          <Text style={styles.flowIconText}>{iconConfig.icon}</Text>
        </LinearGradientComponent>

        <View
          style={[
            styles.flowInfo,
            { alignItems: isRTL ? "flex-start" : "flex-end" },
          ]}
        >
          <View
            style={[
              styles.flowHeader,
              { flexDirection: isRTL ? "row" : "row-reverse" },
            ]}
          >
            <Text style={[styles.flowTitle, { textAlign }]}>
              {getLocalizedName(flow)}
            </Text>
            {isSystem && (
              <View style={styles.systemBadge}>
                <Text style={styles.systemBadgeText}>
                  {t("flows.system", "System")}
                </Text>
              </View>
            )}
          </View>

          {flow.description && (
            <Text
              style={[styles.flowDescription, { textAlign }]}
              numberOfLines={2}
            >
              {flow.description}
            </Text>
          )}

          <View
            style={[
              styles.flowFeatures,
              { flexDirection: isRTL ? "row" : "row-reverse" },
            ]}
          >
            {flow.ai_enabled && (
              <View style={styles.featureBadge}>
                <Text style={styles.featureText}>✨ AI</Text>
              </View>
            )}
            {flow.auto_play && (
              <View style={styles.featureBadge}>
                <Text style={styles.featureText}>
                  ▶️ {t("flows.autoPlay", "Auto")}
                </Text>
              </View>
            )}
            {flow.items.length > 0 && (
              <View style={styles.featureBadge}>
                <Text style={styles.featureText}>📋 {flow.items.length}</Text>
              </View>
            )}
          </View>
        </View>

        <Text style={styles.chevron}>{isRTL ? "‹" : "›"}</Text>
      </View>
    </TouchableOpacity>
  );
};

export const FlowsScreenMobile: React.FC = () => {
  const navigation = useNavigation<any>();
  const { t, i18n } = useTranslation();
  const { currentProfile } = useProfile();
  const { isRTL, textAlign } = useDirection();

  const [flows, setFlows] = useState<Flow[]>([]);
  const [activeFlow, setActiveFlow] = useState<Flow | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedFlow, setSelectedFlow] = useState<Flow | null>(null);
  const [showFlowModal, setShowFlowModal] = useState(false);

  const pulseAnim = useRef(new Animated.Value(1)).current;

  const getLocalizedName = useCallback(
    (flow: Flow): string => {
      const lang = i18n.language;
      if (lang === "en" && flow.name_en) return flow.name_en;
      if (lang === "es" && flow.name_es) return flow.name_es;
      return flow.name;
    },
    [i18n.language],
  );

  const fetchFlows = useCallback(async () => {
    try {
      setLoading(true);
      const [flowsRes, activeRes] = await Promise.all([
        api.get("/flows"),
        api.get("/flows/active"),
      ]);
      setFlows(flowsRes.data);
      if (activeRes.data.should_show && activeRes.data.active_flow) {
        setActiveFlow(activeRes.data.active_flow);
      }
    } catch (error) {
      moduleLogger.error("Error fetching flows:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchFlows();
    }, [fetchFlows]),
  );

  useEffect(() => {
    if (activeFlow) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.02,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ]),
      ).start();
    }
  }, [activeFlow, pulseAnim]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    ReactNativeHapticFeedback.trigger("impactLight");
    await fetchFlows();
    setRefreshing(false);
  }, [fetchFlows]);

  const handleStartFlow = useCallback(
    async (flow: Flow) => {
      ReactNativeHapticFeedback.trigger("impactMedium");
      try {
        const response = await api.get(`/flows/${flow.id}/content`);
        if (response.data.content && response.data.content.length > 0) {
          navigation.navigate("Player", {
            flowId: flow.id,
            flowName: getLocalizedName(flow),
            playlist: response.data.content,
            aiBrief: response.data.ai_brief,
          });
        } else {
          setSelectedFlow(flow);
          setShowFlowModal(true);
        }
      } catch (error) {
        moduleLogger.error("Error starting flow:", error);
      }
    },
    [navigation, getLocalizedName],
  );

  const handleSkipToday = useCallback(async (flow: Flow) => {
    ReactNativeHapticFeedback.trigger("impactLight");
    try {
      await api.post(`/flows/${flow.id}/skip-today`);
      setActiveFlow(null);
    } catch (error) {
      moduleLogger.error("Error skipping flow:", error);
    }
  }, []);

  const systemFlows = flows.filter((f) => f.flow_type === "system");
  const customFlows = flows.filter((f) => f.flow_type === "custom");

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>{t("common.loading")}</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      >
        {/* Header */}
        <View
          style={[
            styles.header,
            { flexDirection: isRTL ? "row" : "row-reverse" },
          ]}
        >
          <View
            style={[
              styles.headerIcon,
              {
                marginLeft: isRTL ? spacing.md : 0,
                marginRight: isRTL ? 0 : spacing.md,
              },
            ]}
          >
            <Text style={styles.headerIconText}>🎬</Text>
          </View>
          <View style={styles.headerTextContainer}>
            <Text style={[styles.title, { textAlign }]}>
              {t("flows.title", "Flows")}
            </Text>
            <Text style={[styles.subtitle, { textAlign }]}>
              {t("flows.subtitle", "Curated content experiences")}
            </Text>
          </View>
        </View>

        {/* Active Flow Banner */}
        {activeFlow && (
          <Animated.View
            style={[styles.activeBanner, { transform: [{ scale: pulseAnim }] }]}
          >
            <LinearGradientComponent
              colors={["rgba(126, 34, 206, 0.3)", "rgba(126, 34, 206, 0.15)"]}
              style={styles.activeBannerGradient}
            >
              <View
                style={[
                  styles.activeBannerContent,
                  { flexDirection: isRTL ? "row" : "row-reverse" },
                ]}
              >
                <View style={styles.activeFlowIconContainer}>
                  <Text style={styles.activeFlowIcon}>
                    {FLOW_ICONS[activeFlow.name]?.icon || "▶️"}
                  </Text>
                </View>
                <View
                  style={[
                    styles.activeFlowInfo,
                    { alignItems: isRTL ? "flex-start" : "flex-end" },
                  ]}
                >
                  <Text style={styles.activeFlowLabel}>
                    {t("flows.activeNow", "Active Now")}
                  </Text>
                  <Text style={[styles.activeFlowTitle, { textAlign }]}>
                    {getLocalizedName(activeFlow)}
                  </Text>
                </View>
              </View>

              <View style={styles.activeBannerActions}>
                <TouchableOpacity
                  style={styles.startButton}
                  onPress={() => handleStartFlow(activeFlow)}
                >
                  <Text style={styles.startButtonText}>
                    ▶ {t("flows.start", "Start")}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.skipButton}
                  onPress={() => handleSkipToday(activeFlow)}
                >
                  <Text style={styles.skipButtonText}>
                    {t("flows.skipToday", "Skip Today")}
                  </Text>
                </TouchableOpacity>
              </View>
            </LinearGradientComponent>
          </Animated.View>
        )}

        {/* System Flows */}
        {systemFlows.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { textAlign }]}>
              {t("flows.systemFlows", "Ready-Made Flows")}
            </Text>
            {systemFlows.map((flow) => (
              <FlowCard
                key={flow.id}
                flow={flow}
                onPress={() => handleStartFlow(flow)}
                getLocalizedName={getLocalizedName}
              />
            ))}
          </View>
        )}

        {/* Custom Flows */}
        {customFlows.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { textAlign }]}>
              {t("flows.customFlows", "My Flows")}
            </Text>
            {customFlows.map((flow) => (
              <FlowCard
                key={flow.id}
                flow={flow}
                onPress={() => handleStartFlow(flow)}
                getLocalizedName={getLocalizedName}
              />
            ))}
          </View>
        )}

        {/* Create Flow Button */}
        <TouchableOpacity
          style={styles.createButton}
          onPress={() => {
            ReactNativeHapticFeedback.trigger("impactLight");
            // Navigate to create flow or show info modal
          }}
        >
          <Text style={styles.createButtonIcon}>+</Text>
          <Text style={styles.createButtonText}>
            {t("flows.createCustom", "Create Custom Flow")}
          </Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Flow Detail Modal */}
      <Modal
        visible={showFlowModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowFlowModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowFlowModal(false)}
        >
          <View style={styles.modalContent}>
            {selectedFlow && (
              <>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalIcon}>
                    {FLOW_ICONS[selectedFlow.name]?.icon || "▶️"}
                  </Text>
                  <Text style={[styles.modalTitle, { textAlign }]}>
                    {getLocalizedName(selectedFlow)}
                  </Text>
                  {selectedFlow.description && (
                    <Text style={[styles.modalDescription, { textAlign }]}>
                      {selectedFlow.description}
                    </Text>
                  )}
                </View>

                <View style={styles.modalInfo}>
                  <View style={styles.modalInfoRow}>
                    <Text style={styles.modalInfoLabel}>
                      {t("flows.type", "Type")}
                    </Text>
                    <Text style={styles.modalInfoValue}>
                      {selectedFlow.flow_type === "system"
                        ? t("flows.systemFlow", "System Flow")
                        : t("flows.customFlow", "Custom Flow")}
                    </Text>
                  </View>
                  <View style={styles.modalInfoRow}>
                    <Text style={styles.modalInfoLabel}>
                      {t("flows.items", "Items")}
                    </Text>
                    <Text style={styles.modalInfoValue}>
                      {selectedFlow.items.length}
                    </Text>
                  </View>
                </View>

                <View style={styles.modalActions}>
                  <TouchableOpacity
                    style={styles.modalStartButton}
                    onPress={() => {
                      setShowFlowModal(false);
                      handleStartFlow(selectedFlow);
                    }}
                  >
                    <Text style={styles.modalStartButtonText}>
                      ▶ {t("flows.start", "Start")}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.modalCloseButton}
                    onPress={() => setShowFlowModal(false)}
                  >
                    <Text style={styles.modalCloseButtonText}>
                      {t("common.close", "Close")}
                    </Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: colors.background,
  },
  loadingText: {
    color: colors.text,
    fontSize: 16,
    marginTop: spacing.md,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xl,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
  },
  headerIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(126, 34, 206, 0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  headerIconText: {
    fontSize: 24,
  },
  headerTextContainer: {
    flex: 1,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: colors.text,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 2,
  },
  activeBanner: {
    marginVertical: spacing.md,
    borderRadius: borderRadius.lg,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(126, 34, 206, 0.5)",
  },
  activeBannerGradient: {
    padding: spacing.md,
  },
  activeBannerContent: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.md,
  },
  activeFlowIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 14,
    backgroundColor: "rgba(126, 34, 206, 0.4)",
    justifyContent: "center",
    alignItems: "center",
  },
  activeFlowIcon: {
    fontSize: 28,
  },
  activeFlowInfo: {
    flex: 1,
    marginHorizontal: spacing.md,
  },
  activeFlowLabel: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  activeFlowTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: colors.text,
    marginTop: 2,
  },
  activeBannerActions: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  startButton: {
    flex: 1,
    backgroundColor: colors.primary,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    alignItems: "center",
  },
  startButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.text,
  },
  skipButton: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    alignItems: "center",
  },
  skipButtonText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  section: {
    marginTop: spacing.lg,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: colors.text,
    marginBottom: spacing.md,
  },
  flowCard: {
    backgroundColor: colors.backgroundLight,
    borderRadius: borderRadius.md,
    marginBottom: spacing.sm,
    overflow: "hidden",
  },
  flowCardContent: {
    flexDirection: "row",
    alignItems: "center",
    padding: spacing.md,
  },
  flowIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  flowIconText: {
    fontSize: 24,
  },
  flowInfo: {
    flex: 1,
    marginHorizontal: spacing.md,
  },
  flowHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginBottom: 4,
  },
  flowTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.text,
  },
  systemBadge: {
    backgroundColor: "rgba(126, 34, 206, 0.3)",
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: 4,
  },
  systemBadgeText: {
    fontSize: 10,
    color: colors.primary,
    fontWeight: "600",
    textTransform: "uppercase",
  },
  flowDescription: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  flowFeatures: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  featureBadge: {
    backgroundColor: "rgba(126, 34, 206, 0.2)",
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: 4,
  },
  featureText: {
    fontSize: 11,
    color: colors.primary,
  },
  chevron: {
    fontSize: 24,
    color: colors.textSecondary,
  },
  createButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.md,
    marginTop: spacing.lg,
    borderWidth: 1,
    borderColor: "rgba(126, 34, 206, 0.5)",
    borderStyle: "dashed",
    borderRadius: borderRadius.md,
    gap: spacing.sm,
  },
  createButtonIcon: {
    fontSize: 20,
    color: colors.primary,
  },
  createButtonText: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: "500",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: colors.backgroundLight,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  modalHeader: {
    alignItems: "center",
    marginBottom: spacing.lg,
  },
  modalIcon: {
    fontSize: 48,
    marginBottom: spacing.md,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: colors.text,
    marginBottom: spacing.sm,
  },
  modalDescription: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: "center",
  },
  modalInfo: {
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.1)",
    paddingTop: spacing.md,
    marginBottom: spacing.lg,
  },
  modalInfoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: spacing.sm,
  },
  modalInfoLabel: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  modalInfoValue: {
    fontSize: 14,
    color: colors.text,
    fontWeight: "500",
  },
  modalActions: {
    gap: spacing.sm,
  },
  modalStartButton: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: "center",
  },
  modalStartButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.text,
  },
  modalCloseButton: {
    paddingVertical: spacing.md,
    alignItems: "center",
  },
  modalCloseButtonText: {
    fontSize: 16,
    color: colors.textSecondary,
  },
});

export default FlowsScreenMobile;
