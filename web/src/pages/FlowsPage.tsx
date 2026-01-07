import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, ActivityIndicator, Modal } from 'react-native';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Play, Plus, Clock, X, Sparkles, List } from 'lucide-react';
import LinearGradient from 'react-native-web-linear-gradient';
import api from '@/services/api';
import { colors, spacing, borderRadius } from '@bayit/shared/theme';
import { GlassCard, GlassButton, GlassView } from '@bayit/shared/ui';
import logger from '@/utils/logger';

interface FlowTrigger {
  type: string;
  start_time?: string;
  end_time?: string;
}

interface Flow {
  id: string;
  name: string;
  name_en?: string;
  name_es?: string;
  description?: string;
  flow_type: 'system' | 'custom';
  triggers: FlowTrigger[];
  items: any[];
  ai_enabled?: boolean;
  auto_play?: boolean;
}

const FLOW_CONFIGS: Record<string, { icon: string; colors: string[] }> = {
  'טקס בוקר': { icon: '☀️', colors: ['#ff9500', '#ff6b00'] },
  'ליל שבת': { icon: '🕯️', colors: ['#5856d6', '#8b5cf6'] },
  'שעת שינה': { icon: '🌙', colors: ['#1a1a2e', '#4a4a8a'] },
  'זמן ילדים': { icon: '🎈', colors: ['#ff2d55', '#ff6b9d'] },
};

const DEFAULT_FLOW_CONFIG = { icon: '▶️', colors: ['#00d9ff', '#0099cc'] };

function FlowIcon({ flow, size = 56 }: { flow: Flow; size?: number }) {
  const config = FLOW_CONFIGS[flow.name] || DEFAULT_FLOW_CONFIG;

  return (
    <LinearGradient
      colors={config.colors}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.flowIcon, { width: size, height: size, borderRadius: size / 4 }]}
    >
      <Text style={[styles.flowIconText, { fontSize: size * 0.5 }]}>{config.icon}</Text>
    </LinearGradient>
  );
}

function FlowCard({ flow, onPress }: { flow: Flow; onPress: () => void }) {
  const { t, i18n } = useTranslation();
  const [isHovered, setIsHovered] = useState(false);

  const getLocalizedName = () => {
    const lang = i18n.language;
    if (lang === 'en' && flow.name_en) return flow.name_en;
    if (lang === 'es' && flow.name_es) return flow.name_es;
    return flow.name;
  };

  const formatTriggerTime = (trigger: FlowTrigger) => {
    if (trigger.type === 'shabbat') {
      return t('flows.shabbatTrigger', 'ליל שבת');
    }
    if (trigger.start_time && trigger.end_time) {
      return `${trigger.start_time} - ${trigger.end_time}`;
    }
    return '';
  };

  return (
    <Pressable
      onPress={onPress}
      onHoverIn={() => setIsHovered(true)}
      onHoverOut={() => setIsHovered(false)}
    >
      <GlassCard style={[styles.flowCard, isHovered && styles.flowCardHovered]}>
        <FlowIcon flow={flow} />

        <View style={styles.flowContent}>
          <View style={styles.flowHeader}>
            <Text style={styles.flowName}>{getLocalizedName()}</Text>
            {flow.flow_type === 'system' && (
              <View style={styles.systemBadge}>
                <Text style={styles.systemBadgeText}>{t('flows.system', 'מערכת')}</Text>
              </View>
            )}
          </View>

          {flow.description && (
            <Text style={styles.flowDescription} numberOfLines={2}>{flow.description}</Text>
          )}

          {flow.triggers.length > 0 && (
            <View style={styles.triggerInfo}>
              <Clock size={14} color={colors.textMuted} />
              <Text style={styles.triggerText}>{formatTriggerTime(flow.triggers[0])}</Text>
            </View>
          )}

          <View style={styles.flowFeatures}>
            {flow.ai_enabled && (
              <View style={styles.featureBadge}>
                <Sparkles size={12} color={colors.warning} />
                <Text style={styles.featureBadgeText}>AI</Text>
              </View>
            )}
            {flow.auto_play && (
              <View style={styles.featureBadge}>
                <Play size={12} color={colors.primary} />
                <Text style={styles.featureBadgeText}>{t('flows.autoPlay', 'אוטו')}</Text>
              </View>
            )}
            {flow.items.length > 0 && (
              <View style={styles.featureBadge}>
                <List size={12} color={colors.textMuted} />
                <Text style={styles.featureBadgeText}>{flow.items.length}</Text>
              </View>
            )}
          </View>
        </View>

        <Text style={styles.flowArrow}>←</Text>
      </GlassCard>
    </Pressable>
  );
}

export default function FlowsPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();

  const [flows, setFlows] = useState<Flow[]>([]);
  const [activeFlow, setActiveFlow] = useState<Flow | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedFlow, setSelectedFlow] = useState<Flow | null>(null);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    fetchFlows();
  }, []);

  const fetchFlows = async () => {
    try {
      setLoading(true);
      const [flowsRes, activeRes] = await Promise.all([
        api.get('/flows'),
        api.get('/flows/active'),
      ]);
      setFlows(flowsRes.data);
      if (activeRes.data.should_show && activeRes.data.active_flow) {
        setActiveFlow(activeRes.data.active_flow);
      }
    } catch (error) {
      logger.error('Failed to fetch flows', 'FlowsPage', error);
    } finally {
      setLoading(false);
    }
  };

  const getLocalizedName = (flow: Flow) => {
    const lang = i18n.language;
    if (lang === 'en' && flow.name_en) return flow.name_en;
    if (lang === 'es' && flow.name_es) return flow.name_es;
    return flow.name;
  };

  const formatTriggerTime = (trigger: FlowTrigger) => {
    if (trigger.type === 'shabbat') {
      return t('flows.shabbatTrigger', 'ליל שבת');
    }
    if (trigger.start_time && trigger.end_time) {
      return `${trigger.start_time} - ${trigger.end_time}`;
    }
    return '';
  };

  const handleStartFlow = async (flow: Flow) => {
    try {
      const response = await api.get(`/flows/${flow.id}/content`);
      if (response.data.content && response.data.content.length > 0) {
        navigate('/player', {
          state: {
            flowId: flow.id,
            flowName: getLocalizedName(flow),
            playlist: response.data.content,
            aiBrief: response.data.ai_brief,
          },
        });
      } else {
        setSelectedFlow(flow);
        setShowModal(true);
      }
    } catch (error) {
      logger.error('Failed to start flow', 'FlowsPage', error);
    }
  };

  const handleSkipToday = async (flow: Flow) => {
    try {
      await api.post(`/flows/${flow.id}/skip-today`);
      setActiveFlow(null);
    } catch (error) {
      logger.error('Failed to skip flow', 'FlowsPage', error);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const systemFlows = flows.filter(f => f.flow_type === 'system');
  const customFlows = flows.filter(f => f.flow_type === 'custom');

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.pageTitle}>{t('flows.title', 'פלואים')}</Text>
        <Text style={styles.subtitle}>{t('flows.subtitle', 'חוויות תוכן מותאמות לכל רגע')}</Text>
      </View>

      {/* Active Flow Banner */}
      {activeFlow && (
        <GlassCard style={styles.activeBanner}>
          <FlowIcon flow={activeFlow} size={64} />
          <View style={styles.activeContent}>
            <View style={styles.activeLabelContainer}>
              <View style={styles.activeDot} />
              <Text style={styles.activeLabel}>{t('flows.activeNow', 'פעיל עכשיו')}</Text>
            </View>
            <Text style={styles.activeName}>{getLocalizedName(activeFlow)}</Text>
            {activeFlow.description && (
              <Text style={styles.activeDescription}>{activeFlow.description}</Text>
            )}
          </View>
          <View style={styles.activeActions}>
            <GlassButton
              title={t('flows.start', 'התחל')}
              onPress={() => handleStartFlow(activeFlow)}
              variant="primary"
              icon={<Play size={18} color={colors.text} />}
            />
            <Pressable onPress={() => handleSkipToday(activeFlow)} style={styles.skipButton}>
              <Text style={styles.skipButtonText}>{t('flows.skipToday', 'דלג היום')}</Text>
            </Pressable>
          </View>
        </GlassCard>
      )}

      {/* System Flows */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('flows.systemFlows', 'פלואים מוכנים')}</Text>
        <View style={styles.flowsGrid}>
          {systemFlows.map((flow) => (
            <FlowCard
              key={flow.id}
              flow={flow}
              onPress={() => handleStartFlow(flow)}
            />
          ))}
        </View>
      </View>

      {/* Custom Flows */}
      {customFlows.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('flows.customFlows', 'הפלואים שלי')}</Text>
          <View style={styles.flowsGrid}>
            {customFlows.map((flow) => (
              <FlowCard
                key={flow.id}
                flow={flow}
                onPress={() => handleStartFlow(flow)}
              />
            ))}
          </View>
        </View>
      )}

      {/* Create Flow Button */}
      <Pressable style={styles.createButton}>
        <Plus size={20} color={colors.primary} />
        <Text style={styles.createButtonText}>{t('flows.createCustom', 'צור פלו מותאם')}</Text>
      </Pressable>

      {/* Flow Detail Modal */}
      <Modal visible={showModal} transparent animationType="fade">
        <Pressable style={styles.modalOverlay} onPress={() => setShowModal(false)}>
          <Pressable onPress={(e) => e.stopPropagation()}>
            <GlassCard style={styles.modalCard}>
              {selectedFlow && (
                <>
                  <Pressable style={styles.modalClose} onPress={() => setShowModal(false)}>
                    <X size={24} color={colors.textMuted} />
                  </Pressable>

                  <FlowIcon flow={selectedFlow} size={80} />
                  <Text style={styles.modalTitle}>{getLocalizedName(selectedFlow)}</Text>
                  {selectedFlow.description && (
                    <Text style={styles.modalDescription}>{selectedFlow.description}</Text>
                  )}

                  <View style={styles.modalInfo}>
                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabel}>{t('flows.type', 'סוג')}:</Text>
                      <Text style={styles.infoValue}>
                        {selectedFlow.flow_type === 'system'
                          ? t('flows.systemFlow', 'פלו מערכת')
                          : t('flows.customFlow', 'פלו מותאם')}
                      </Text>
                    </View>
                    {selectedFlow.triggers.length > 0 && (
                      <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>{t('flows.schedule', 'לו״ז')}:</Text>
                        <Text style={styles.infoValue}>{formatTriggerTime(selectedFlow.triggers[0])}</Text>
                      </View>
                    )}
                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabel}>{t('flows.content', 'תוכן')}:</Text>
                      <Text style={styles.infoValue}>
                        {selectedFlow.items.length > 0
                          ? `${selectedFlow.items.length} ${t('flows.items', 'פריטים')}`
                          : t('flows.aiGenerated', 'נוצר ע״י AI')}
                      </Text>
                    </View>
                  </View>

                  <GlassButton
                    title={t('common.close', 'סגור')}
                    onPress={() => setShowModal(false)}
                    style={styles.modalCloseButton}
                  />
                </>
              )}
            </GlassCard>
          </Pressable>
        </Pressable>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.lg,
    maxWidth: 1200,
    marginHorizontal: 'auto',
    width: '100%',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 400,
  },
  header: {
    marginBottom: spacing.xl,
  },
  pageTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: 16,
    color: colors.textMuted,
  },
  activeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg,
    marginBottom: spacing.xl,
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  activeContent: {
    flex: 1,
  },
  activeLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  activeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.success,
  },
  activeLabel: {
    fontSize: 12,
    color: colors.success,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  activeName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
  },
  activeDescription: {
    fontSize: 14,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  activeActions: {
    gap: spacing.sm,
  },
  skipButton: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  skipButtonText: {
    fontSize: 14,
    color: colors.textMuted,
    textAlign: 'center',
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.md,
  },
  flowsGrid: {
    gap: spacing.md,
  },
  flowCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    gap: spacing.md,
  },
  flowCardHovered: {
    transform: [{ scale: 1.01 }],
  },
  flowIcon: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  flowIconText: {
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  flowContent: {
    flex: 1,
  },
  flowHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  flowName: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
  },
  systemBadge: {
    backgroundColor: 'rgba(0, 217, 255, 0.2)',
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  systemBadgeText: {
    fontSize: 10,
    color: colors.primary,
    fontWeight: '600',
  },
  flowDescription: {
    fontSize: 14,
    color: colors.textMuted,
    marginBottom: spacing.sm,
  },
  triggerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  triggerText: {
    fontSize: 12,
    color: colors.textMuted,
  },
  flowFeatures: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  featureBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.glass,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.sm,
  },
  featureBadgeText: {
    fontSize: 11,
    color: colors.textMuted,
  },
  flowArrow: {
    fontSize: 20,
    color: colors.textMuted,
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: colors.glass,
    borderRadius: borderRadius.lg,
    marginTop: spacing.md,
  },
  createButtonText: {
    fontSize: 16,
    color: colors.primary,
    fontWeight: '500',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.md,
  },
  modalCard: {
    width: '100%',
    maxWidth: 400,
    padding: spacing.xl,
    alignItems: 'center',
  },
  modalClose: {
    position: 'absolute',
    top: spacing.md,
    left: spacing.md,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  modalDescription: {
    fontSize: 14,
    color: colors.textMuted,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  modalInfo: {
    width: '100%',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.glass,
  },
  infoLabel: {
    fontSize: 14,
    color: colors.textMuted,
  },
  infoValue: {
    fontSize: 14,
    color: colors.text,
  },
  modalCloseButton: {
    width: '100%',
  },
});
