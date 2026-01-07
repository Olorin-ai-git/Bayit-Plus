import { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, ActivityIndicator, Modal, useWindowDimensions } from 'react-native';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Play, Plus, Clock, X, Sparkles, List, Edit2, Trash2, Sun, Moon, Baby, Flame, ChevronLeft, ChevronRight, Settings, Menu, GripVertical } from 'lucide-react';
import LinearGradient from 'react-native-web-linear-gradient';
import { flowsService } from '@/services/api';
import { colors, spacing, borderRadius } from '@bayit/shared/theme';
import { GlassCard, GlassButton, GlassView, GlassInput } from '@bayit/shared/ui';
import logger from '@/utils/logger';

interface FlowTrigger {
  type: string;
  start_time?: string;
  end_time?: string;
  days?: number[];
}

interface FlowItem {
  content_id: string;
  content_type: string;
  title: string;
  order: number;
}

interface Flow {
  id: string;
  name: string;
  name_en?: string;
  name_es?: string;
  description?: string;
  description_en?: string;
  description_es?: string;
  flow_type: 'system' | 'custom';
  icon?: string;
  triggers: FlowTrigger[];
  items: FlowItem[];
  ai_enabled?: boolean;
  auto_play?: boolean;
  is_active?: boolean;
}

const FLOW_CONFIGS: Record<string, { icon: React.ReactNode; colors: string[]; bgColor: string }> = {
  'טקס בוקר': { icon: <Sun size={32} color="#fff" />, colors: ['#ff9500', '#ff6b00'], bgColor: 'rgba(255, 149, 0, 0.15)' },
  'Morning Ritual': { icon: <Sun size={32} color="#fff" />, colors: ['#ff9500', '#ff6b00'], bgColor: 'rgba(255, 149, 0, 0.15)' },
  'Ritual Matutino': { icon: <Sun size={32} color="#fff" />, colors: ['#ff9500', '#ff6b00'], bgColor: 'rgba(255, 149, 0, 0.15)' },
  'ליל שבת': { icon: <Flame size={32} color="#fff" />, colors: ['#5856d6', '#8b5cf6'], bgColor: 'rgba(88, 86, 214, 0.15)' },
  'Shabbat Evening': { icon: <Flame size={32} color="#fff" />, colors: ['#5856d6', '#8b5cf6'], bgColor: 'rgba(88, 86, 214, 0.15)' },
  'Noche de Shabat': { icon: <Flame size={32} color="#fff" />, colors: ['#5856d6', '#8b5cf6'], bgColor: 'rgba(88, 86, 214, 0.15)' },
  'שעת שינה': { icon: <Moon size={32} color="#fff" />, colors: ['#1a1a2e', '#4a4a8a'], bgColor: 'rgba(74, 74, 138, 0.15)' },
  'Sleep Time': { icon: <Moon size={32} color="#fff" />, colors: ['#1a1a2e', '#4a4a8a'], bgColor: 'rgba(74, 74, 138, 0.15)' },
  'Hora de Dormir': { icon: <Moon size={32} color="#fff" />, colors: ['#1a1a2e', '#4a4a8a'], bgColor: 'rgba(74, 74, 138, 0.15)' },
  'זמן ילדים': { icon: <Baby size={32} color="#fff" />, colors: ['#ff2d55', '#ff6b9d'], bgColor: 'rgba(255, 45, 85, 0.15)' },
  'Kids Time': { icon: <Baby size={32} color="#fff" />, colors: ['#ff2d55', '#ff6b9d'], bgColor: 'rgba(255, 45, 85, 0.15)' },
  'Hora de los Niños': { icon: <Baby size={32} color="#fff" />, colors: ['#ff2d55', '#ff6b9d'], bgColor: 'rgba(255, 45, 85, 0.15)' },
};

const DEFAULT_FLOW_CONFIG = { icon: <Play size={32} color="#fff" />, colors: ['#00d9ff', '#0099cc'], bgColor: 'rgba(0, 217, 255, 0.15)' };

const SIDEBAR_MIN_WIDTH = 280;
const SIDEBAR_MAX_WIDTH = 480;
const SIDEBAR_DEFAULT_WIDTH = 340;
const SIDEBAR_COLLAPSED_WIDTH = 0;

function FlowIcon({ flow, size = 64 }: { flow: Flow; size?: number }) {
  const config = FLOW_CONFIGS[flow.name] || FLOW_CONFIGS[flow.name_en || ''] || DEFAULT_FLOW_CONFIG;

  return (
    <LinearGradient
      colors={config.colors}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.flowIcon, { width: size, height: size, borderRadius: size / 4 }]}
    >
      {config.icon}
    </LinearGradient>
  );
}

export default function FlowsPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { width } = useWindowDimensions();
  const isRTL = i18n.language === 'he' || i18n.language === 'ar';
  const isMobile = width < 768;
  const isTablet = width < 1024;

  const [flows, setFlows] = useState<Flow[]>([]);
  const [activeFlow, setActiveFlow] = useState<Flow | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedFlow, setSelectedFlow] = useState<Flow | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(!isMobile);
  const [sidebarWidth, setSidebarWidth] = useState(SIDEBAR_DEFAULT_WIDTH);
  const [isDraggingSidebar, setIsDraggingSidebar] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingFlow, setEditingFlow] = useState<Flow | null>(null);

  // Form state
  const [formName, setFormName] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formStartTime, setFormStartTime] = useState('08:00');
  const [formEndTime, setFormEndTime] = useState('10:00');
  const [formAutoPlay, setFormAutoPlay] = useState(false);
  const [formAiEnabled, setFormAiEnabled] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchFlows();
  }, []);

  useEffect(() => {
    setSidebarOpen(!isMobile);
  }, [isMobile]);

  const fetchFlows = async () => {
    try {
      setLoading(true);
      const [flowsRes, activeRes] = await Promise.all([
        flowsService.getFlows(),
        flowsService.getActiveFlow(),
      ]);
      setFlows(flowsRes.data || []);
      if (activeRes.data?.should_show && activeRes.data?.active_flow) {
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

  const getLocalizedDescription = (flow: Flow) => {
    const lang = i18n.language;
    if (lang === 'en' && flow.description_en) return flow.description_en;
    if (lang === 'es' && flow.description_es) return flow.description_es;
    return flow.description;
  };

  const formatTriggerTime = (trigger: FlowTrigger) => {
    if (trigger.type === 'shabbat') {
      return t('flows.shabbatTrigger');
    }
    if (trigger.start_time && trigger.end_time) {
      return `${trigger.start_time} - ${trigger.end_time}`;
    }
    return t('flows.manual');
  };

  const handleStartFlow = async (flow: Flow) => {
    try {
      const response = await flowsService.getFlowContent(flow.id);
      if (response.data?.content && response.data.content.length > 0) {
        navigate('/player', {
          state: {
            flowId: flow.id,
            flowName: getLocalizedName(flow),
            playlist: response.data.content,
            aiBrief: response.data.ai_brief,
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

  const openCreateModal = () => {
    setEditingFlow(null);
    setFormName('');
    setFormDescription('');
    setFormStartTime('08:00');
    setFormEndTime('10:00');
    setFormAutoPlay(false);
    setFormAiEnabled(false);
    setShowCreateModal(true);
  };

  const openEditModal = (flow: Flow) => {
    setEditingFlow(flow);
    setFormName(flow.name);
    setFormDescription(flow.description || '');
    const trigger = flow.triggers[0];
    setFormStartTime(trigger?.start_time || '08:00');
    setFormEndTime(trigger?.end_time || '10:00');
    setFormAutoPlay(flow.auto_play || false);
    setFormAiEnabled(flow.ai_enabled || false);
    setShowCreateModal(true);
  };

  const handleSaveFlow = async () => {
    if (!formName.trim()) return;

    setSaving(true);
    try {
      const flowData = {
        name: formName,
        description: formDescription,
        triggers: [{ type: 'time', start_time: formStartTime, end_time: formEndTime, days: [0, 1, 2, 3, 4, 5, 6] }],
        items: [],
        auto_play: formAutoPlay,
        ai_enabled: formAiEnabled,
      };

      if (editingFlow) {
        await flowsService.updateFlow(editingFlow.id, flowData);
      } else {
        await flowsService.createFlow(flowData);
      }

      setShowCreateModal(false);
      fetchFlows();
    } catch (error) {
      logger.error('Failed to save flow', 'FlowsPage', error);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteFlow = async (flow: Flow) => {
    try {
      await flowsService.deleteFlow(flow.id);
      setSelectedFlow(null);
      fetchFlows();
    } catch (error) {
      logger.error('Failed to delete flow', 'FlowsPage', error);
    }
  };

  const getFlowConfig = (flow: Flow) => {
    return FLOW_CONFIGS[flow.name] || FLOW_CONFIGS[flow.name_en || ''] || DEFAULT_FLOW_CONFIG;
  };

  // Sidebar drag handler
  const handleSidebarDragStart = useCallback((e: any) => {
    e.preventDefault();
    setIsDraggingSidebar(true);

    const startX = e.clientX || (e.touches && e.touches[0].clientX);
    const startWidth = sidebarWidth;

    const handleDrag = (moveEvent: any) => {
      const currentX = moveEvent.clientX || (moveEvent.touches && moveEvent.touches[0].clientX);
      // LTR: sidebar on left, drag right to expand; RTL: sidebar on right, drag left to expand
      const deltaX = isRTL ? (startX - currentX) : (currentX - startX);
      const newWidth = Math.min(SIDEBAR_MAX_WIDTH, Math.max(SIDEBAR_MIN_WIDTH, startWidth + deltaX));
      setSidebarWidth(newWidth);
    };

    const handleDragEnd = () => {
      setIsDraggingSidebar(false);
      document.removeEventListener('mousemove', handleDrag);
      document.removeEventListener('mouseup', handleDragEnd);
      document.removeEventListener('touchmove', handleDrag);
      document.removeEventListener('touchend', handleDragEnd);
    };

    document.addEventListener('mousemove', handleDrag);
    document.addEventListener('mouseup', handleDragEnd);
    document.addEventListener('touchmove', handleDrag);
    document.addEventListener('touchend', handleDragEnd);
  }, [sidebarWidth, isRTL]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>{t('common.loading')}</Text>
      </View>
    );
  }

  const systemFlows = flows.filter(f => f.flow_type === 'system');
  const customFlows = flows.filter(f => f.flow_type === 'custom');
  const allFlows = [...systemFlows, ...customFlows];

  return (
    <View style={styles.pageContainer}>
      {/* Main Content Area */}
      <ScrollView
        style={[
          styles.mainContent,
          sidebarOpen && !isMobile && (isRTL ? { marginRight: sidebarWidth } : { marginLeft: sidebarWidth }),
        ]}
        contentContainerStyle={styles.mainContentInner}
      >
        {/* Background Effects */}
        <View style={styles.backgroundGradient1} />
        <View style={styles.backgroundGradient2} />

        {/* Mobile Sidebar Toggle */}
        {isMobile && (
          <Pressable
            style={[styles.mobileMenuButton, isRTL && styles.mobileMenuButtonRTL]}
            onPress={() => setSidebarOpen(!sidebarOpen)}
          >
            <Menu size={24} color={colors.text} />
          </Pressable>
        )}

        {/* Hero Header */}
        <View style={[styles.heroHeader, isRTL && styles.heroHeaderRTL]}>
          <Text style={[styles.heroTitle, isRTL && styles.textRTL]}>
            {t('flows.title')}
          </Text>
          <Text style={[styles.heroSubtitle, isRTL && styles.textRTL]}>
            {t('flows.subtitle')}
          </Text>
        </View>

        {/* Active Flow Banner */}
        {activeFlow && (
          <GlassCard style={styles.activeBanner}>
            <View style={styles.activeDotContainer}>
              <View style={styles.activeDot} />
              <Text style={styles.activeLabel}>{t('flows.activeNow')}</Text>
            </View>
            <View style={[styles.activeBannerContent, isRTL && styles.activeBannerContentRTL]}>
              <FlowIcon flow={activeFlow} size={72} />
              <View style={styles.activeBannerInfo}>
                <Text style={[styles.activeBannerName, isRTL && styles.textRTL]}>
                  {getLocalizedName(activeFlow)}
                </Text>
                <Text style={[styles.activeBannerDesc, isRTL && styles.textRTL]}>
                  {getLocalizedDescription(activeFlow)}
                </Text>
              </View>
            </View>
            <View style={[styles.activeBannerActions, isRTL && styles.activeBannerActionsRTL]}>
              <GlassButton
                title={t('flows.start')}
                onPress={() => handleStartFlow(activeFlow)}
                variant="primary"
                icon={<Play size={18} color="#000" />}
              />
              <Pressable onPress={() => handleSkipToday(activeFlow)} style={styles.skipLink}>
                <Text style={styles.skipLinkText}>{t('flows.skipToday')}</Text>
              </Pressable>
            </View>
          </GlassCard>
        )}

        {/* Flows Hero Grid */}
        <View style={[styles.flowsHeroGrid, isTablet && styles.flowsHeroGridTablet]}>
          {allFlows.map((flow) => {
            const config = getFlowConfig(flow);
            const isSelected = selectedFlow?.id === flow.id;

            return (
              <Pressable
                key={flow.id}
                onPress={() => setSelectedFlow(isSelected ? null : flow)}
                style={[
                  styles.flowHeroCard,
                  isTablet && styles.flowHeroCardTablet,
                  { backgroundColor: config.bgColor },
                  isSelected && styles.flowHeroCardSelected,
                ]}
              >
                <View style={[styles.flowHeroCardHeader, isRTL && styles.flowHeroCardHeaderRTL]}>
                  <FlowIcon flow={flow} size={56} />
                  {flow.flow_type === 'system' && (
                    <GlassView style={styles.systemBadge} intensity="low">
                      <Text style={styles.systemBadgeText}>{t('flows.system')}</Text>
                    </GlassView>
                  )}
                </View>

                <Text style={[styles.flowHeroName, isRTL && styles.textRTL]}>
                  {getLocalizedName(flow)}
                </Text>

                {flow.description && (
                  <Text style={[styles.flowHeroDesc, isRTL && styles.textRTL]} numberOfLines={2}>
                    {getLocalizedDescription(flow)}
                  </Text>
                )}

                <View style={[styles.flowHeroMeta, isRTL && styles.flowHeroMetaRTL]}>
                  <Clock size={14} color={colors.textMuted} />
                  <Text style={styles.flowHeroMetaText}>
                    {flow.triggers.length > 0 ? formatTriggerTime(flow.triggers[0]) : t('flows.manual')}
                  </Text>
                </View>

                <View style={[styles.flowHeroFeatures, isRTL && styles.flowHeroFeaturesRTL]}>
                  {flow.ai_enabled && (
                    <View style={styles.featureTag}>
                      <Sparkles size={12} color={colors.warning} />
                      <Text style={styles.featureTagText}>AI</Text>
                    </View>
                  )}
                  {flow.auto_play && (
                    <View style={styles.featureTag}>
                      <Play size={12} color={colors.primary} />
                      <Text style={styles.featureTagText}>{t('flows.autoPlay')}</Text>
                    </View>
                  )}
                  {flow.items.length > 0 && (
                    <View style={styles.featureTag}>
                      <List size={12} color={colors.textMuted} />
                      <Text style={styles.featureTagText}>{flow.items.length}</Text>
                    </View>
                  )}
                </View>

                {/* Quick Actions on Selected */}
                {isSelected && (
                  <View style={[styles.flowHeroActions, isRTL && styles.flowHeroActionsRTL]}>
                    <GlassButton
                      title={t('flows.start')}
                      onPress={() => handleStartFlow(flow)}
                      variant="primary"
                      size="sm"
                      style={styles.flowHeroActionBtn}
                    />
                    {flow.flow_type === 'custom' && (
                      <Pressable onPress={() => openEditModal(flow)} style={styles.flowHeroEditBtn}>
                        <Edit2 size={16} color={colors.text} />
                      </Pressable>
                    )}
                  </View>
                )}
              </Pressable>
            );
          })}
        </View>

        {/* Empty State for Custom Flows */}
        {customFlows.length === 0 && (
          <GlassCard style={styles.emptyHint}>
            <Text style={[styles.emptyHintText, isRTL && styles.textRTL]}>
              {t('flows.createHint')}
            </Text>
            <Pressable onPress={openCreateModal} style={[styles.emptyHintButton, isRTL && styles.emptyHintButtonRTL]}>
              <Plus size={16} color={colors.primary} />
              <Text style={styles.emptyHintButtonText}>{t('flows.createCustom')}</Text>
            </Pressable>
          </GlassCard>
        )}
      </ScrollView>

      {/* Collapsible Glass Sidebar */}
      <GlassView
        style={[
          styles.sidebar,
          {
            width: sidebarOpen ? sidebarWidth : SIDEBAR_COLLAPSED_WIDTH,
            opacity: sidebarOpen ? 1 : 0,
          },
          isRTL && styles.sidebarRTL,
          isMobile && sidebarOpen && styles.sidebarMobileOpen,
          isDraggingSidebar && styles.sidebarDragging,
        ]}
        intensity="high"
      >
        {/* Drag Handle */}
        {sidebarOpen && !isMobile && (
          <Pressable
            style={[styles.sidebarDragHandle, isRTL && styles.sidebarDragHandleRTL]}
            onPressIn={handleSidebarDragStart as any}
          >
            <GripVertical size={16} color={colors.textMuted} />
          </Pressable>
        )}

        {/* Sidebar Toggle Button */}
        <Pressable
          style={[
            styles.sidebarToggle,
            isRTL && styles.sidebarToggleRTL,
            !sidebarOpen && styles.sidebarToggleClosed,
            !sidebarOpen && isRTL && styles.sidebarToggleClosedRTL,
          ]}
          onPress={() => setSidebarOpen(!sidebarOpen)}
        >
          <GlassView style={styles.sidebarToggleInner} intensity="medium">
            {isRTL ? (
              sidebarOpen ? <ChevronRight size={18} color={colors.text} /> : <ChevronLeft size={18} color={colors.text} />
            ) : (
              sidebarOpen ? <ChevronLeft size={18} color={colors.text} /> : <ChevronRight size={18} color={colors.text} />
            )}
          </GlassView>
        </Pressable>

        {sidebarOpen && (
          <ScrollView style={styles.sidebarScroll} contentContainerStyle={styles.sidebarContent}>
            <Text style={[styles.sidebarTitle, isRTL && styles.textRTL]}>
              {t('flows.actions')}
            </Text>

            {/* Create New Flow */}
            <Pressable style={[styles.sidebarAction, isRTL && styles.sidebarActionRTL]} onPress={openCreateModal}>
              <View style={styles.sidebarActionIcon}>
                <Plus size={20} color={colors.primary} />
              </View>
              <View style={styles.sidebarActionContent}>
                <Text style={[styles.sidebarActionTitle, isRTL && styles.textRTL]}>
                  {t('flows.createFlow')}
                </Text>
                <Text style={[styles.sidebarActionDesc, isRTL && styles.textRTL]}>
                  {t('flows.createFlowDesc')}
                </Text>
              </View>
            </Pressable>

            {/* Selected Flow Actions */}
            {selectedFlow && (
              <>
                <View style={styles.sidebarDivider} />
                <Text style={[styles.sidebarSectionTitle, isRTL && styles.textRTL]}>
                  {getLocalizedName(selectedFlow)}
                </Text>

                <Pressable style={[styles.sidebarAction, isRTL && styles.sidebarActionRTL]} onPress={() => handleStartFlow(selectedFlow)}>
                  <View style={[styles.sidebarActionIcon, styles.sidebarActionIconPrimary]}>
                    <Play size={20} color="#000" />
                  </View>
                  <View style={styles.sidebarActionContent}>
                    <Text style={[styles.sidebarActionTitle, isRTL && styles.textRTL]}>
                      {t('flows.startFlow')}
                    </Text>
                  </View>
                </Pressable>

                {selectedFlow.flow_type === 'custom' && (
                  <>
                    <Pressable style={[styles.sidebarAction, isRTL && styles.sidebarActionRTL]} onPress={() => openEditModal(selectedFlow)}>
                      <View style={styles.sidebarActionIcon}>
                        <Edit2 size={20} color={colors.text} />
                      </View>
                      <View style={styles.sidebarActionContent}>
                        <Text style={[styles.sidebarActionTitle, isRTL && styles.textRTL]}>
                          {t('flows.editFlow')}
                        </Text>
                      </View>
                    </Pressable>

                    <Pressable style={[styles.sidebarAction, isRTL && styles.sidebarActionRTL]} onPress={() => handleDeleteFlow(selectedFlow)}>
                      <View style={[styles.sidebarActionIcon, styles.sidebarActionIconDanger]}>
                        <Trash2 size={20} color={colors.error} />
                      </View>
                      <View style={styles.sidebarActionContent}>
                        <Text style={[styles.sidebarActionTitle, styles.sidebarActionTitleDanger, isRTL && styles.textRTL]}>
                          {t('flows.deleteFlow')}
                        </Text>
                      </View>
                    </Pressable>
                  </>
                )}
              </>
            )}

            {/* Flow Info */}
            {selectedFlow && (
              <>
                <View style={styles.sidebarDivider} />
                <Text style={[styles.sidebarSectionTitle, isRTL && styles.textRTL]}>
                  {t('flows.details')}
                </Text>
                <View style={styles.sidebarInfo}>
                  <View style={[styles.sidebarInfoRow, isRTL && styles.sidebarInfoRowRTL]}>
                    <Text style={styles.sidebarInfoLabel}>{t('flows.type')}</Text>
                    <Text style={styles.sidebarInfoValue}>
                      {selectedFlow.flow_type === 'system' ? t('flows.systemFlow') : t('flows.customFlow')}
                    </Text>
                  </View>
                  <View style={[styles.sidebarInfoRow, isRTL && styles.sidebarInfoRowRTL]}>
                    <Text style={styles.sidebarInfoLabel}>{t('flows.schedule')}</Text>
                    <Text style={styles.sidebarInfoValue}>
                      {selectedFlow.triggers.length > 0 ? formatTriggerTime(selectedFlow.triggers[0]) : t('flows.manual')}
                    </Text>
                  </View>
                  <View style={[styles.sidebarInfoRow, isRTL && styles.sidebarInfoRowRTL]}>
                    <Text style={styles.sidebarInfoLabel}>{t('flows.content')}</Text>
                    <Text style={styles.sidebarInfoValue}>
                      {selectedFlow.items.length > 0
                        ? `${selectedFlow.items.length} ${t('flows.items')}`
                        : t('flows.aiGenerated')}
                    </Text>
                  </View>
                </View>
              </>
            )}
          </ScrollView>
        )}
      </GlassView>

      {/* Mobile Sidebar Overlay */}
      {isMobile && sidebarOpen && (
        <Pressable style={styles.sidebarOverlay} onPress={() => setSidebarOpen(false)} />
      )}

      {/* Create/Edit Flow Modal */}
      <Modal visible={showCreateModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <Pressable style={styles.modalBackdrop} onPress={() => setShowCreateModal(false)} />
          <GlassCard autoSize style={[styles.createModalCard, isRTL && styles.createModalCardRTL]}>
            <Pressable style={[styles.modalClose, isRTL && styles.modalCloseRTL]} onPress={() => setShowCreateModal(false)}>
              <X size={24} color={colors.textMuted} />
            </Pressable>

            <Text style={[styles.modalTitle, isRTL && styles.textRTL]}>
              {editingFlow ? t('flows.editFlow') : t('flows.createFlow')}
            </Text>

            <View style={styles.modalContent}>
              <View style={styles.formGroup}>
                <Text style={[styles.formLabel, isRTL && styles.textRTL]}>
                  {t('flows.flowName')}
                </Text>
                <GlassInput
                  value={formName}
                  onChangeText={setFormName}
                  placeholder={t('flows.flowNamePlaceholder')}
                  containerStyle={styles.formInput}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={[styles.formLabel, isRTL && styles.textRTL]}>
                  {t('flows.description')}
                </Text>
                <GlassInput
                  value={formDescription}
                  onChangeText={setFormDescription}
                  placeholder={t('flows.descriptionPlaceholder')}
                  multiline
                  numberOfLines={3}
                  containerStyle={[styles.formInput, styles.textArea]}
                />
              </View>

              <View style={[styles.formRow, isRTL && styles.formRowRTL]}>
                <View style={styles.formGroupHalf}>
                  <Text style={[styles.formLabel, isRTL && styles.textRTL]}>
                    {t('flows.startTime')}
                  </Text>
                  <GlassInput
                    value={formStartTime}
                    onChangeText={setFormStartTime}
                    placeholder="08:00"
                    containerStyle={styles.formInput}
                  />
                </View>
                <View style={styles.formGroupHalf}>
                  <Text style={[styles.formLabel, isRTL && styles.textRTL]}>
                    {t('flows.endTime')}
                  </Text>
                  <GlassInput
                    value={formEndTime}
                    onChangeText={setFormEndTime}
                    placeholder="10:00"
                    containerStyle={styles.formInput}
                  />
                </View>
              </View>

              <View style={[styles.toggleRow, isRTL && styles.toggleRowRTL]}>
                <Pressable
                  style={[styles.toggleOption, formAutoPlay && styles.toggleOptionActive]}
                  onPress={() => setFormAutoPlay(!formAutoPlay)}
                >
                  <Play size={20} color={formAutoPlay ? colors.primary : colors.textMuted} />
                  <Text style={[styles.toggleText, formAutoPlay && styles.toggleTextActive]}>
                    {t('flows.autoPlay')}
                  </Text>
                </Pressable>
                <Pressable
                  style={[styles.toggleOption, formAiEnabled && styles.toggleOptionActive]}
                  onPress={() => setFormAiEnabled(!formAiEnabled)}
                >
                  <Sparkles size={20} color={formAiEnabled ? colors.warning : colors.textMuted} />
                  <Text style={[styles.toggleText, formAiEnabled && styles.toggleTextActive]}>
                    {t('flows.aiEnabled')}
                  </Text>
                </Pressable>
              </View>

              <View style={[styles.formActions, isRTL && styles.formActionsRTL]}>
                <GlassButton
                  title={t('common.cancel')}
                  onPress={() => setShowCreateModal(false)}
                  style={styles.formButton}
                />
                <GlassButton
                  title={saving ? t('common.saving') : t('common.save')}
                  onPress={handleSaveFlow}
                  variant="primary"
                  disabled={!formName.trim() || saving}
                  style={styles.formButton}
                />
              </View>
            </View>
          </GlassCard>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  pageContainer: {
    flex: 1,
    flexDirection: 'row',
    position: 'relative',
  },
  mainContent: {
    flex: 1,
    // @ts-ignore
    transition: 'margin 0.3s ease',
  },
  mainContentInner: {
    padding: spacing.xl,
    paddingBottom: spacing.xl * 2,
    maxWidth: 1200,
    marginHorizontal: 'auto',
    width: '100%',
    position: 'relative',
  },
  backgroundGradient1: {
    position: 'absolute',
    width: 600,
    height: 600,
    borderRadius: 300,
    backgroundColor: colors.primary,
    opacity: 0.05,
    top: -200,
    right: -200,
    // @ts-ignore
    filter: 'blur(120px)',
  },
  backgroundGradient2: {
    position: 'absolute',
    width: 500,
    height: 500,
    borderRadius: 250,
    backgroundColor: '#8b5cf6',
    opacity: 0.04,
    bottom: 0,
    left: -150,
    // @ts-ignore
    filter: 'blur(100px)',
  },
  mobileMenuButton: {
    position: 'absolute',
    top: spacing.md,
    right: spacing.md,
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: colors.glass,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  mobileMenuButtonRTL: {
    right: 'auto' as any,
    left: spacing.md,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 400,
  },
  loadingText: {
    marginTop: spacing.md,
    fontSize: 16,
    color: colors.textSecondary,
  },
  heroHeader: {
    marginBottom: spacing.xl,
    paddingTop: spacing.md,
  },
  heroHeaderRTL: {
    alignItems: 'flex-end',
  },
  heroTitle: {
    fontSize: 40,
    fontWeight: '800',
    color: colors.text,
    marginBottom: spacing.xs,
    letterSpacing: -1,
  },
  heroSubtitle: {
    fontSize: 18,
    color: colors.textMuted,
    lineHeight: 26,
  },
  textRTL: {
    textAlign: 'right',
  },
  activeBanner: {
    padding: spacing.lg,
    marginBottom: spacing.xl,
    borderWidth: 1,
    borderColor: colors.success,
  },
  activeDotContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  activeDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.success,
  },
  activeLabel: {
    fontSize: 12,
    color: colors.success,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  activeBannerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    marginBottom: spacing.lg,
  },
  activeBannerContentRTL: {
    flexDirection: 'row-reverse',
  },
  activeBannerInfo: {
    flex: 1,
  },
  activeBannerName: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  activeBannerDesc: {
    fontSize: 15,
    color: colors.textMuted,
    lineHeight: 22,
  },
  activeBannerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  activeBannerActionsRTL: {
    flexDirection: 'row-reverse',
  },
  skipLink: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  skipLinkText: {
    fontSize: 14,
    color: colors.textMuted,
  },
  flowsHeroGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.lg,
    marginBottom: spacing.xl,
  },
  flowsHeroGridTablet: {
    gap: spacing.md,
  },
  flowHeroCard: {
    width: 'calc(50% - 12px)' as any,
    minWidth: 300,
    padding: spacing.xl,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    // @ts-ignore
    transition: 'all 0.2s ease',
  },
  flowHeroCardTablet: {
    width: '100%',
    minWidth: 'auto' as any,
  },
  flowHeroCardSelected: {
    borderColor: colors.primary,
    // @ts-ignore
    transform: 'scale(1.02)',
  },
  flowHeroCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  flowHeroCardHeaderRTL: {
    flexDirection: 'row-reverse',
  },
  systemBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.sm,
  },
  systemBadgeText: {
    fontSize: 10,
    color: colors.primary,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  flowHeroName: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  flowHeroDesc: {
    fontSize: 14,
    color: colors.textMuted,
    lineHeight: 22,
    marginBottom: spacing.md,
  },
  flowHeroMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  flowHeroMetaRTL: {
    flexDirection: 'row-reverse',
  },
  flowHeroMetaText: {
    fontSize: 13,
    color: colors.textMuted,
  },
  flowHeroFeatures: {
    flexDirection: 'row',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  flowHeroFeaturesRTL: {
    flexDirection: 'row-reverse',
  },
  featureTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: borderRadius.full,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  featureTagText: {
    fontSize: 12,
    color: colors.textMuted,
    fontWeight: '500',
  },
  flowHeroActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  flowHeroActionsRTL: {
    flexDirection: 'row-reverse',
  },
  flowHeroActionBtn: {
    flex: 1,
  },
  flowHeroEditBtn: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.md,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyHint: {
    padding: spacing.xl,
    alignItems: 'center',
    marginTop: spacing.lg,
  },
  emptyHintText: {
    fontSize: 16,
    color: colors.textMuted,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  emptyHintButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  emptyHintButtonRTL: {
    flexDirection: 'row-reverse',
  },
  emptyHintButtonText: {
    fontSize: 15,
    color: colors.primary,
    fontWeight: '600',
  },
  flowIcon: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Sidebar Styles
  sidebar: {
    position: 'fixed' as any,
    top: 64,
    left: 0,
    bottom: 0,
    borderRightWidth: 1,
    borderRightColor: 'rgba(255, 255, 255, 0.1)',
    zIndex: 100,
    // @ts-ignore
    transition: 'width 0.3s ease, opacity 0.3s ease',
    overflow: 'hidden',
  },
  sidebarRTL: {
    left: 'auto' as any,
    right: 0,
    borderRightWidth: 0,
    borderLeftWidth: 1,
    borderLeftColor: 'rgba(255, 255, 255, 0.1)',
  },
  sidebarMobileOpen: {
    width: '85%',
    maxWidth: 360,
  },
  sidebarDragging: {
    // @ts-ignore
    transition: 'none',
    // @ts-ignore
    userSelect: 'none',
  },
  sidebarOverlay: {
    position: 'fixed' as any,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    zIndex: 99,
  },
  sidebarDragHandle: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    right: 0,
    width: 12,
    justifyContent: 'center',
    alignItems: 'center',
    // @ts-ignore
    cursor: 'ew-resize',
    zIndex: 102,
    backgroundColor: 'transparent',
  },
  sidebarDragHandleRTL: {
    right: 'auto' as any,
    left: 0,
  },
  sidebarToggle: {
    position: 'absolute',
    top: spacing.lg,
    right: -44,
    zIndex: 101,
  },
  sidebarToggleRTL: {
    right: 'auto' as any,
    left: -44,
  },
  sidebarToggleClosed: {
    position: 'fixed' as any,
    top: 80,
    left: spacing.md,
    right: 'auto' as any,
  },
  sidebarToggleClosedRTL: {
    left: 'auto' as any,
    right: spacing.md,
  },
  sidebarToggleInner: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  sidebarScroll: {
    flex: 1,
  },
  sidebarContent: {
    padding: spacing.lg,
    paddingTop: spacing.xl,
    paddingRight: spacing.xl,
  },
  sidebarTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: spacing.lg,
  },
  sidebarAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.md,
    marginBottom: spacing.xs,
  },
  sidebarActionRTL: {
    flexDirection: 'row-reverse',
  },
  sidebarActionIcon: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.md,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sidebarActionIconPrimary: {
    backgroundColor: colors.primary,
  },
  sidebarActionIconDanger: {
    backgroundColor: 'rgba(255, 59, 48, 0.15)',
  },
  sidebarActionContent: {
    flex: 1,
  },
  sidebarActionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
  },
  sidebarActionTitleDanger: {
    color: colors.error,
  },
  sidebarActionDesc: {
    fontSize: 13,
    color: colors.textMuted,
    marginTop: 2,
  },
  sidebarDivider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    marginVertical: spacing.lg,
  },
  sidebarSectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.md,
  },
  sidebarInfo: {
    gap: spacing.sm,
  },
  sidebarInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.xs,
  },
  sidebarInfoRowRTL: {
    flexDirection: 'row-reverse',
  },
  sidebarInfoLabel: {
    fontSize: 13,
    color: colors.textMuted,
  },
  sidebarInfoValue: {
    fontSize: 13,
    color: colors.text,
    fontWeight: '500',
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  modalBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  createModalCard: {
    width: 580,
    maxWidth: '95%' as any,
    padding: spacing.xl,
    paddingTop: spacing.xl + spacing.md,
    paddingHorizontal: spacing.xl + spacing.md,
  },
  createModalCardRTL: {
    // RTL adjustments for modal
  },
  modalClose: {
    position: 'absolute',
    top: spacing.md,
    right: spacing.md,
    padding: spacing.sm,
    zIndex: 1,
  },
  modalCloseRTL: {
    right: 'auto' as any,
    left: spacing.md,
  },
  modalTitle: {
    fontSize: 26,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.xl,
    textAlign: 'center',
  },
  modalContent: {
    width: '100%',
  },
  formGroup: {
    width: '100%',
    marginBottom: spacing.lg,
  },
  formGroupHalf: {
    flex: 1,
  },
  formLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  formInput: {
    width: '100%',
  },
  textArea: {
    minHeight: 100,
  },
  formRow: {
    flexDirection: 'row',
    gap: spacing.lg,
    width: '100%',
    marginBottom: spacing.lg,
  },
  formRowRTL: {
    flexDirection: 'row-reverse',
  },
  toggleRow: {
    flexDirection: 'row',
    gap: spacing.lg,
    width: '100%',
    marginBottom: spacing.xl,
    marginTop: spacing.sm,
  },
  toggleRowRTL: {
    flexDirection: 'row-reverse',
  },
  toggleOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.lg,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    // @ts-ignore
    transition: 'all 0.2s ease',
  },
  toggleOptionActive: {
    borderColor: colors.primary,
    backgroundColor: 'rgba(0, 217, 255, 0.15)',
  },
  toggleText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textMuted,
  },
  toggleTextActive: {
    color: colors.text,
  },
  formActions: {
    flexDirection: 'row',
    gap: spacing.lg,
    width: '100%',
    marginTop: spacing.md,
  },
  formActionsRTL: {
    flexDirection: 'row-reverse',
  },
  formButton: {
    flex: 1,
  },
});
