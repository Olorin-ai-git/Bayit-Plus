/**
 * FlowsPage - Main Flows Orchestrator
 * Manages flow listing, selection, and CRUD operations
 * Uses modular components from ./flows/components
 */

import { useState, useEffect } from 'react';
import { View, Text, Pressable, ScrollView, ActivityIndicator, useWindowDimensions } from 'react-native';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Plus, Sparkles, Sun, Moon, Coffee, Sunset, Star } from 'lucide-react';
import { flowsService } from '@/services/api';
import { colors, spacing, borderRadius } from '@bayit/shared/theme';
import { GlassCategoryPill, GlassCard } from '@bayit/shared/ui';
import { useDirection } from '@/hooks/useDirection';
import { useAuthStore } from '@/stores/authStore';
import { useModal } from '@/contexts/ModalContext';
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
  const user = useAuthStore((s) => s.user);
  const { showConfirm, showError } = useModal();

  // Check if user has premium access
  const isPremium = user?.subscription?.plan === 'premium' || user?.subscription?.plan === 'family';

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
    // Check premium access
    if (!isPremium) {
      showConfirm(
        t('flows.premiumRequired', 'Flows is a premium feature. Upgrade to start playing flows.'),
        () => navigate('/subscribe'),
        {
          title: t('flows.premiumFeature', 'Premium Feature'),
          confirmText: t('common.upgrade', 'Upgrade'),
          cancelText: t('common.cancel', 'Cancel'),
        }
      );
      return;
    }

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
    // Check premium access
    if (!isPremium) {
      showConfirm(
        t('flows.premiumRequired', 'Flows is a premium feature. Upgrade to create custom flows.'),
        () => navigate('/subscribe'),
        {
          title: t('flows.premiumFeature', 'Premium Feature'),
          confirmText: t('common.upgrade', 'Upgrade'),
          cancelText: t('common.cancel', 'Cancel'),
        }
      );
      return;
    }

    setEditingFlow(null);
    setFlowTemplate(null);
    setShowFormModal(true);
  };

  const openEditModal = () => {
    // Check premium access
    if (!isPremium) {
      showConfirm(
        t('flows.premiumRequired', 'Flows is a premium feature. Upgrade to edit flows.'),
        () => navigate('/subscribe'),
        {
          title: t('flows.premiumFeature', 'Premium Feature'),
          confirmText: t('common.upgrade', 'Upgrade'),
          cancelText: t('common.cancel', 'Cancel'),
        }
      );
      return;
    }

    if (selectedFlow) {
      setEditingFlow(selectedFlow);
      setFlowTemplate(null);
      setShowFormModal(true);
    }
  };

  const handleUseTemplate = (template: Partial<Flow>) => {
    // Check premium access
    if (!isPremium) {
      showConfirm(
        t('flows.premiumRequired', 'Flows is a premium feature. Upgrade to use flow templates.'),
        () => navigate('/subscribe'),
        {
          title: t('flows.premiumFeature', 'Premium Feature'),
          confirmText: t('common.upgrade', 'Upgrade'),
          cancelText: t('common.cancel', 'Cancel'),
        }
      );
      return;
    }

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
      <View className="flex-1 justify-center items-center min-h-[400px]">
        <ActivityIndicator size="large" color={colors.primary} />
        <Text className={`mt-4 text-white/70 ${IS_TV_BUILD ? 'text-2xl' : 'text-base'}`}>{t('common.loading')}</Text>
      </View>
    );
  }

  const filteredFlows = getFilteredFlows();
  const customFlows = flows.filter(f => f.flow_type === 'custom');

  return (
    <View className="flex-1 relative overflow-visible">
      {/* Main Content */}
      <ScrollView
        className="flex-1 overflow-visible"
        contentContainerStyle={{
          padding: IS_TV_BUILD ? spacing.xl * 2 : spacing.xl,
          paddingBottom: spacing.xl * 3,
          maxWidth: IS_TV_BUILD ? '100%' : 1400,
          marginHorizontal: 'auto',
          width: '100%',
        }}
      >
        {/* Background Effects */}
        <View className="absolute w-[700px] h-[700px] rounded-full bg-purple-600 opacity-[0.06] -top-[250px] -right-[250px] blur-[140px]" />
        <View className="absolute w-[600px] h-[600px] rounded-full bg-violet-600 opacity-[0.05] -bottom-[100px] -left-[200px] blur-[120px]" />

        {/* Hero Header */}
        <View className="mb-12 pt-4 w-full" style={{ alignItems }}>
          <Text className={`${IS_TV_BUILD ? 'text-6xl' : 'text-5xl'} font-extrabold text-white mb-2 tracking-tight`} style={{ textAlign }}>{t('flows.title')}</Text>
          <Text className={`${IS_TV_BUILD ? 'text-2xl leading-10' : 'text-xl leading-7'} text-white/60`} style={{ textAlign }}>{t('flows.subtitle')}</Text>
        </View>

        {/* Create Flow Action - Prominent */}
        <Pressable
          className={`mb-12 ${isRTL ? '' : ''}`}
          onPress={openCreateModal}
        >
          <GlassCard className="p-8 bg-purple-700/10 border-2 border-purple-700/30 cursor-pointer">
            <View className={`flex-row items-center ${isRTL ? 'flex-row-reverse' : ''} gap-8`}>
              <View className="w-18 h-18 rounded-2xl bg-purple-700/30 justify-center items-center">
                <Plus size={28} color={colors.primary} />
              </View>
              <View className="flex-1">
                <Text className={`text-2xl font-extrabold text-white mb-1 tracking-tight ${isRTL ? 'text-right' : ''}`}>
                  {t('flows.createFlow')}
                </Text>
                <Text className={`text-base text-white/70 leading-6 ${isRTL ? 'text-right' : ''}`}>
                  {t('flows.createFlowDesc')}
                </Text>
              </View>
            </View>
          </GlassCard>
        </Pressable>

        {/* Example Flows Section */}
        <View className="mb-12">
          <View className={`mb-6 ${isRTL ? '' : ''}`}>
            <View className={`flex-row items-center gap-2 mb-1 ${isRTL ? 'flex-row-reverse' : ''}`}>
              <Sparkles size={20} color={colors.primary} />
              <Text className={`text-xl font-bold text-white ${isRTL ? 'text-right' : ''}`}>
                {t('flows.examples.title')}
              </Text>
            </View>
            <Text className={`text-sm text-white/60 leading-5 ${isRTL ? 'text-right' : ''}`}>
              {t('flows.examples.subtitle')}
            </Text>
          </View>

          <View className="flex-row flex-wrap gap-6 justify-start">
            {EXAMPLE_FLOWS.map((example) => (
              <Pressable
                key={example.id}
                className={`w-[calc(33.33%-16px)] ${hoveredExample === example.id ? 'scale-105 cursor-pointer' : ''}`}
                style={{ width: IS_TV_BUILD ? 'calc(33.33% - 16px)' : 'calc(33.33% - 16px)' }}
                onPress={() => handleUseTemplate(example.template)}
                // @ts-ignore - Web hover events
                onMouseEnter={() => setHoveredExample(example.id)}
                onMouseLeave={() => setHoveredExample(null)}
              >
                <GlassCard className="p-6 h-full justify-start items-center">
                  <View className="w-16 h-16 rounded-xl bg-white/5 justify-center items-center mb-4">
                    {example.icon}
                  </View>
                  <Text className={`text-base font-bold text-white mb-1 text-center ${isRTL ? 'text-right' : ''}`} numberOfLines={1}>
                    {t(example.nameKey)}
                  </Text>
                  <Text className={`text-sm text-white/60 leading-5 text-center ${isRTL ? 'text-right' : ''}`} numberOfLines={2}>
                    {t(example.descKey)}
                  </Text>
                </GlassCard>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Category Filter */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-12 overflow-visible">
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
        <View className={`flex-row flex-wrap justify-start mb-8 overflow-visible ${isTablet ? 'gap-4' : `gap-${IS_TV_BUILD ? '8' : '6'}`}`}>
          {filteredFlows.map(flow => (
            <FlowCard
              key={flow.id}
              flow={flow}
              isSelected={selectedFlow?.id === flow.id}
              isTablet={isTablet}
              isRTL={isRTL}
              isPremium={isPremium}
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
