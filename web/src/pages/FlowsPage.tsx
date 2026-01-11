/**
 * FlowsPage - Main Flows Orchestrator
 * Manages flow listing, selection, and CRUD operations
 * Uses modular components from ./flows/components
 */

import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, ActivityIndicator, useWindowDimensions } from 'react-native';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Plus, Sparkles, Sun, Moon, Coffee, Sunset, Star } from 'lucide-react';
import { flowsService } from '@/services/api';
import { colors, spacing, borderRadius } from '@bayit/shared/theme';
import { GlassCategoryPill, GlassCard } from '@bayit/shared/ui';
import { useDirection } from '@/hooks/useDirection';
import logger from '@/utils/logger';
import {
  FlowCard,
  ActiveFlowBanner,
  FlowFormModal,
} from './flows/components';
import type { Flow } from './flows/types/flows.types';
import { getLocalizedName } from './flows/utils/flowHelpers';

// Check if this is a TV build (set by webpack)
declare const __TV__: boolean;
const IS_TV_BUILD = typeof __TV__ !== 'undefined' && __TV__;

// Example flow templates
interface ExampleFlow {
  id: string;
  nameKey: string;
  descKey: string;
  icon: React.ReactNode;
  template: Partial<Flow>;
}

const EXAMPLE_FLOWS: ExampleFlow[] = [
  {
    id: 'morning-routine',
    nameKey: 'flows.examples.morningRoutine.name',
    descKey: 'flows.examples.morningRoutine.desc',
    icon: <Sun size={20} color={colors.warning} />,
    template: {
      name: { en: 'Morning Routine', he: 'שגרת בוקר' },
      triggers: [{ type: 'time', time: '07:00', days: [0, 1, 2, 3, 4] }],
      ai_enabled: true,
      auto_play: true,
    },
  },
  {
    id: 'evening-wind-down',
    nameKey: 'flows.examples.eveningWindDown.name',
    descKey: 'flows.examples.eveningWindDown.desc',
    icon: <Moon size={20} color={colors.primary} />,
    template: {
      name: { en: 'Evening Wind Down', he: 'רגיעה ערבית' },
      triggers: [{ type: 'time', time: '21:00', days: [0, 1, 2, 3, 4, 5, 6] }],
      ai_enabled: true,
      auto_play: true,
    },
  },
  {
    id: 'shabbat-prep',
    nameKey: 'flows.examples.shabbatPrep.name',
    descKey: 'flows.examples.shabbatPrep.desc',
    icon: <Star size={20} color={colors.success} />,
    template: {
      name: { en: 'Shabbat Preparation', he: 'הכנות לשבת' },
      triggers: [{ type: 'shabbat', time: '14:00' }],
      ai_enabled: false,
      auto_play: true,
    },
  },
  {
    id: 'coffee-break',
    nameKey: 'flows.examples.coffeeBreak.name',
    descKey: 'flows.examples.coffeeBreak.desc',
    icon: <Coffee size={20} color="#8B4513" />,
    template: {
      name: { en: 'Coffee Break', he: 'הפסקת קפה' },
      triggers: [],
      ai_enabled: true,
      auto_play: false,
    },
  },
  {
    id: 'sunset-vibes',
    nameKey: 'flows.examples.sunsetVibes.name',
    descKey: 'flows.examples.sunsetVibes.desc',
    icon: <Sunset size={20} color="#FF6B35" />,
    template: {
      name: { en: 'Sunset Vibes', he: 'אווירת שקיעה' },
      triggers: [{ type: 'time', time: '18:30', days: [5, 6] }],
      ai_enabled: true,
      auto_play: true,
    },
  },
];

export default function FlowsPage() {
  const { t, i18n } = useTranslation();
  const { isRTL, textAlign, flexDirection, justifyContent, alignItems } = useDirection();
  const navigate = useNavigate();
  const { width } = useWindowDimensions();
  const isMobile = width < 768;
  const isTablet = width < 1024;

  // State
  const [flows, setFlows] = useState<Flow[]>([]);
  const [activeFlow, setActiveFlow] = useState<Flow | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedFlow, setSelectedFlow] = useState<Flow | null>(null);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingFlow, setEditingFlow] = useState<Flow | null>(null);
  const [flowTemplate, setFlowTemplate] = useState<Partial<Flow> | null>(null);
  const [hoveredExample, setHoveredExample] = useState<string | null>(null);

  // Fetch flows on mount
  useEffect(() => {
    fetchFlows();
  }, []);

  const fetchFlows = async () => {
    try {
      setLoading(true);
      const [flowsRes, activeRes] = await Promise.all([
        flowsService.getFlows(),
        flowsService.getActiveFlow(),
      ]);
      // Handle both demo service (returns {data: [...]}) and API (returns [...] directly)
      setFlows(Array.isArray(flowsRes) ? flowsRes : (flowsRes.data || []));
      const activeData = activeRes.data ?? activeRes;
      if (activeData?.should_show && activeData?.active_flow) {
        setActiveFlow(activeData.active_flow);
      }
    } catch (error) {
      logger.error('Failed to fetch flows', 'FlowsPage', error);
    } finally {
      setLoading(false);
    }
  };

  // Flow actions
  const handleStartFlow = async (flow: Flow) => {
    try {
      const response = await flowsService.getFlowContent(flow.id);
      const data = response.data ?? response;
      if (data?.content && data.content.length > 0) {
        // Navigate to the first item in the flow based on content type
        const firstItem = data.content[0];
        const contentType = firstItem.content_type;
        const contentId = firstItem.content_id;

        // Map content type to route
        const routeMap: Record<string, string> = {
          'live': `/live/${contentId}`,
          'vod': `/vod/${contentId}`,
          'radio': `/radio/${contentId}`,
          'podcast': `/podcasts/${contentId}`,
          'judaism': `/vod/${contentId}`,
          'kids': `/vod/${contentId}`,
        };

        const route = routeMap[contentType] || `/vod/${contentId}`;
        navigate(route, {
          state: {
            flowId: flow.id,
            flowName: getLocalizedName(flow, i18n.language),
            playlist: data.content,
            currentIndex: 0,
          },
        });
      }
    } catch (error) {
      logger.error('Failed to start flow', 'FlowsPage', error);
    }
  };

  const handleSkipToday = async (flow: Flow) => {
    try {
      await flowsService.skipFlowToday(flow.id);
      setActiveFlow(null);
    } catch (error) {
      logger.error('Failed to skip flow', 'FlowsPage', error);
    }
  };

  const handleSaveFlow = async (flowData: any) => {
    if (editingFlow) {
      await flowsService.updateFlow(editingFlow.id, flowData);
    } else {
      await flowsService.createFlow(flowData);
    }
    fetchFlows();
  };

  const handleDeleteFlow = async () => {
    if (!selectedFlow) return;
    try {
      await flowsService.deleteFlow(selectedFlow.id);
      setSelectedFlow(null);
      fetchFlows();
    } catch (error) {
      logger.error('Failed to delete flow', 'FlowsPage', error);
    }
  };

  const openCreateModal = () => {
    setEditingFlow(null);
    setFlowTemplate(null);
    setShowFormModal(true);
  };

  const openEditModal = () => {
    if (selectedFlow) {
      setEditingFlow(selectedFlow);
      setFlowTemplate(null);
      setShowFormModal(true);
    }
  };

  const handleUseTemplate = (template: Partial<Flow>) => {
    setEditingFlow(null);
    setFlowTemplate(template);
    setShowFormModal(true);
  };

  const handleCloseModal = () => {
    setShowFormModal(false);
    setFlowTemplate(null);
  };

  // Filter flows by category
  const getFilteredFlows = () => {
    const systemFlows = flows.filter(f => f.flow_type === 'system');
    const customFlows = flows.filter(f => f.flow_type === 'custom');
    const allFlows = [...systemFlows, ...customFlows];

    switch (selectedCategory) {
      case 'system': return systemFlows;
      case 'custom': return customFlows;
      case 'morning': return allFlows.filter(f =>
        f.name.includes('בוקר') || f.name_en?.toLowerCase().includes('morning'));
      case 'evening': return allFlows.filter(f =>
        f.name.includes('ערב') || f.name.includes('שינה') ||
        f.name_en?.toLowerCase().includes('evening') || f.name_en?.toLowerCase().includes('sleep'));
      case 'shabbat': return allFlows.filter(f =>
        f.name.includes('שבת') || f.name_en?.toLowerCase().includes('shabbat'));
      default: return allFlows;
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>{t('common.loading')}</Text>
      </View>
    );
  }

  const filteredFlows = getFilteredFlows();
  const customFlows = flows.filter(f => f.flow_type === 'custom');

  return (
    <View style={styles.container}>
      {/* Main Content */}
      <ScrollView
        style={styles.main}
        contentContainerStyle={styles.mainInner}
      >
        {/* Background Effects */}
        <View style={styles.bgGradient1} />
        <View style={styles.bgGradient2} />

        {/* Hero Header */}
        <View style={[styles.header, { alignItems, width: '100%' }]}>
          <Text style={[styles.title, { textAlign }]}>{t('flows.title')}</Text>
          <Text style={[styles.subtitle, { textAlign }]}>{t('flows.subtitle')}</Text>
        </View>

        {/* Create Flow Action - Prominent */}
        <Pressable
          style={[styles.createFlowCard, isRTL && styles.createFlowCardRTL]}
          onPress={openCreateModal}
        >
          <GlassCard style={styles.createFlowCardInner}>
            <View style={[styles.createFlowContent, isRTL && styles.createFlowContentRTL]}>
              <View style={styles.createFlowIcon}>
                <Plus size={28} color={colors.primary} />
              </View>
              <View style={styles.createFlowText}>
                <Text style={[styles.createFlowTitle, isRTL && styles.textRTL]}>
                  {t('flows.createFlow')}
                </Text>
                <Text style={[styles.createFlowDesc, isRTL && styles.textRTL]}>
                  {t('flows.createFlowDesc')}
                </Text>
              </View>
            </View>
          </GlassCard>
        </Pressable>

        {/* Example Flows Section */}
        <View style={styles.examplesSection}>
          <View style={[styles.examplesSectionHeader, isRTL && styles.examplesSectionHeaderRTL]}>
            <View style={[styles.examplesHeaderContent, isRTL && styles.examplesHeaderContentRTL]}>
              <Sparkles size={20} color={colors.primary} />
              <Text style={[styles.examplesSectionTitle, isRTL && styles.textRTL]}>
                {t('flows.examples.title')}
              </Text>
            </View>
            <Text style={[styles.examplesSectionSubtitle, isRTL && styles.textRTL]}>
              {t('flows.examples.subtitle')}
            </Text>
          </View>

          <View style={styles.examplesGrid}>
            {EXAMPLE_FLOWS.map((example) => (
              <Pressable
                key={example.id}
                style={[
                  styles.exampleCard,
                  hoveredExample === example.id && styles.exampleCardHovered,
                ]}
                onPress={() => handleUseTemplate(example.template)}
                // @ts-ignore - Web hover events
                onMouseEnter={() => setHoveredExample(example.id)}
                onMouseLeave={() => setHoveredExample(null)}
              >
                <GlassCard style={styles.exampleCardInner}>
                  <View style={styles.exampleIconWrapper}>
                    {example.icon}
                  </View>
                  <Text style={[styles.exampleName, isRTL && styles.textRTL]} numberOfLines={1}>
                    {t(example.nameKey)}
                  </Text>
                  <Text style={[styles.exampleDesc, isRTL && styles.textRTL]} numberOfLines={2}>
                    {t(example.descKey)}
                  </Text>
                </GlassCard>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Category Filter */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categories}>
          {['all', 'system', 'custom', 'morning', 'evening', 'shabbat'].map(cat => (
            <GlassCategoryPill
              key={cat}
              label={cat === 'all' ? t('common.all') : t(`flows.${cat}`)}
              emoji={cat === 'all' ? '🔄' : cat === 'system' ? '⚙️' : cat === 'custom' ? '✨' :
                     cat === 'morning' ? '🌅' : cat === 'evening' ? '🌙' : '🕯️'}
              isActive={selectedCategory === cat}
              onPress={() => setSelectedCategory(cat)}
            />
          ))}
        </ScrollView>

        {/* Active Flow Banner */}
        {activeFlow && (
          <ActiveFlowBanner
            flow={activeFlow}
            isRTL={isRTL}
            onStart={() => handleStartFlow(activeFlow)}
            onSkip={() => handleSkipToday(activeFlow)}
          />
        )}

        {/* Flows Grid */}
        <View style={[styles.grid, isTablet && styles.gridTablet]}>
          {filteredFlows.map(flow => (
            <FlowCard
              key={flow.id}
              flow={flow}
              isSelected={selectedFlow?.id === flow.id}
              isTablet={isTablet}
              isRTL={isRTL}
              onSelect={() => setSelectedFlow(selectedFlow?.id === flow.id ? null : flow)}
              onStart={() => handleStartFlow(flow)}
              onEdit={flow.flow_type === 'custom' ? openEditModal : undefined}
            />
          ))}
        </View>

      </ScrollView>

      {/* Form Modal */}
      <FlowFormModal
        visible={showFormModal}
        flow={editingFlow}
        initialTemplate={flowTemplate}
        onClose={handleCloseModal}
        onSave={handleSaveFlow}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: 'relative',
    overflow: 'visible' as any
  },
  main: {
    flex: 1,
    overflow: 'visible' as any
  },
  mainInner: {
    padding: IS_TV_BUILD ? spacing.xl * 2 : spacing.xl,
    paddingBottom: spacing.xl * 3,
    maxWidth: IS_TV_BUILD ? '100%' : 1400,
    marginHorizontal: 'auto',
    width: '100%',
    position: 'relative',
    overflow: 'visible' as any
  },
  bgGradient1: {
    position: 'absolute',
    width: 700,
    height: 700,
    borderRadius: 350,
    backgroundColor: colors.primary,
    opacity: 0.06,
    top: -250,
    right: -250,
    filter: 'blur(140px)' as any
  },
  bgGradient2: {
    position: 'absolute',
    width: 600,
    height: 600,
    borderRadius: 300,
    backgroundColor: '#8b5cf6',
    opacity: 0.05,
    bottom: -100,
    left: -200,
    filter: 'blur(120px)' as any
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 400
  },
  loadingText: {
    marginTop: spacing.md,
    fontSize: IS_TV_BUILD ? 24 : 16,
    color: colors.textSecondary
  },
  header: {
    marginBottom: spacing.xl * 1.5,
    paddingTop: spacing.md
  },
  title: {
    fontSize: IS_TV_BUILD ? 64 : 48,
    fontWeight: '800',
    color: colors.text,
    marginBottom: spacing.sm,
    letterSpacing: -1.5
  },
  subtitle: {
    fontSize: IS_TV_BUILD ? 26 : 20,
    color: colors.textMuted,
    lineHeight: IS_TV_BUILD ? 38 : 28
  },
  categories: {
    marginBottom: spacing.xl * 1.5,
    overflow: 'visible' as any
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: IS_TV_BUILD ? spacing.xl : spacing.lg,
    marginBottom: spacing.xl,
    overflow: 'visible' as any,
    justifyContent: 'flex-start',
  },
  gridTablet: {
    gap: spacing.md
  },
  emptyState: {
    padding: spacing.xl * 1.5,
    alignItems: 'center',
    marginTop: spacing.lg
  },
  emptyText: {
    fontSize: 16,
    color: colors.textMuted,
    marginBottom: spacing.md,
    textAlign: 'center'
  },
  emptyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm
  },
  emptyBtnText: {
    fontSize: 15,
    color: colors.primary,
    fontWeight: '600'
  },
  // Create Flow Card - Prominent
  createFlowCard: {
    marginBottom: spacing.xl * 1.5,
    // @ts-ignore
    transition: 'all 0.3s ease',
  },
  createFlowCardRTL: {},
  createFlowCardInner: {
    padding: spacing.xl,
    backgroundColor: 'rgba(0, 217, 255, 0.03)',
    borderWidth: 2,
    borderColor: 'rgba(0, 217, 255, 0.15)',
    // @ts-ignore
    cursor: 'pointer',
  },
  createFlowContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xl,
  },
  createFlowContentRTL: {
    flexDirection: 'row-reverse',
  },
  createFlowIcon: {
    width: 72,
    height: 72,
    borderRadius: borderRadius.xl,
    backgroundColor: 'rgba(0, 217, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  createFlowText: {
    flex: 1,
  },
  createFlowTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.text,
    marginBottom: spacing.xs,
    letterSpacing: -0.5,
  },
  createFlowDesc: {
    fontSize: 16,
    color: colors.textSecondary,
    lineHeight: 22,
  },
  // Examples Section
  examplesSection: {
    marginBottom: spacing.xl * 1.5,
  },
  examplesSectionHeader: {
    marginBottom: spacing.lg,
  },
  examplesSectionHeaderRTL: {},
  examplesHeaderContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  examplesHeaderContentRTL: {
    flexDirection: 'row-reverse',
  },
  examplesSectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
  },
  examplesSectionSubtitle: {
    fontSize: 14,
    color: colors.textMuted,
    lineHeight: 20,
  },
  examplesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.lg,
    justifyContent: 'flex-start',
  },
  exampleCard: {
    width: IS_TV_BUILD ? 'calc(33.33% - 16px)' : 'calc(33.33% - 16px)',
    // @ts-ignore
    transition: 'all 0.3s ease',
  },
  exampleCardHovered: {
    // @ts-ignore
    transform: [{ scale: 1.05 }],
    // @ts-ignore
    cursor: 'pointer',
  },
  exampleCardInner: {
    padding: spacing.lg,
    height: '100%',
    justifyContent: 'flex-start',
    alignItems: 'center',
    textAlign: 'center',
  },
  exampleIconWrapper: {
    width: 64,
    height: 64,
    borderRadius: borderRadius.lg,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  exampleName: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.xs,
    textAlign: 'center',
  },
  exampleDesc: {
    fontSize: 13,
    color: colors.textMuted,
    lineHeight: 18,
    textAlign: 'center',
  },
  textRTL: {
    textAlign: 'right'
  },
});
