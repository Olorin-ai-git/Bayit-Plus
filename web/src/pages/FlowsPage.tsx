/**
 * FlowsPage - Main Flows Orchestrator
 * Manages flow listing, selection, and CRUD operations
 * Uses modular components from ./flows/components
 */

import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, ActivityIndicator, useWindowDimensions } from 'react-native';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Menu, ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { flowsService } from '@/services/api';
import { colors, spacing, borderRadius } from '@bayit/shared/theme';
import { GlassView, GlassCategoryPill, GlassCard } from '@bayit/shared/ui';
import { useDirection } from '@/hooks/useDirection';
import logger from '@/utils/logger';
import {
  FlowCard,
  ActiveFlowBanner,
  FlowSidebar,
  FlowFormModal,
} from './flows/components';
import type { Flow } from './flows/types/flows.types';
import { getLocalizedName } from './flows/utils/flowHelpers';

// Check if this is a TV build (set by webpack)
declare const __TV__: boolean;
const IS_TV_BUILD = typeof __TV__ !== 'undefined' && __TV__;

const SIDEBAR_DEFAULT_WIDTH = 340;

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
  const [sidebarOpen, setSidebarOpen] = useState(!isMobile);
  const [sidebarWidth, setSidebarWidth] = useState(SIDEBAR_DEFAULT_WIDTH);
  const [isDraggingSidebar, setIsDraggingSidebar] = useState(false);
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingFlow, setEditingFlow] = useState<Flow | null>(null);
  const [flowTemplate, setFlowTemplate] = useState<Partial<Flow> | null>(null);

  // Fetch flows on mount
  useEffect(() => {
    fetchFlows();
  }, []);

  // Close sidebar on mobile
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

  // Flow actions
  const handleStartFlow = async (flow: Flow) => {
    try {
      const response = await flowsService.getFlowContent(flow.id);
      if (response.data?.content && response.data.content.length > 0) {
        navigate('/player', {
          state: {
            flowId: flow.id,
            flowName: getLocalizedName(flow, i18n.language),
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
        style={[styles.main, sidebarOpen && !isMobile && (isRTL ? { marginRight: sidebarWidth } : { marginLeft: sidebarWidth })]}
        contentContainerStyle={styles.mainInner}
      >
        {/* Background Effects */}
        <View style={styles.bgGradient1} />
        <View style={styles.bgGradient2} />

        {/* Mobile Menu Toggle */}
        {isMobile && (
          <Pressable style={[styles.menuBtn, isRTL && styles.menuBtnRTL]} onPress={() => setSidebarOpen(!sidebarOpen)}>
            <Menu size={24} color={colors.text} />
          </Pressable>
        )}

        {/* Hero Header */}
        <View style={[styles.header, { alignItems, width: '100%' }]}>
          <Text style={[styles.title, { textAlign }]}>{t('flows.title')}</Text>
          <Text style={[styles.subtitle, { textAlign }]}>{t('flows.subtitle')}</Text>
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

        {/* Empty State */}
        {customFlows.length === 0 && (
          <GlassCard style={styles.emptyState}>
            <Text style={[styles.emptyText, { textAlign }]}>{t('flows.createHint')}</Text>
            <Pressable onPress={openCreateModal} style={[styles.emptyBtn, { flexDirection }]}>
              <Plus size={16} color={colors.primary} />
              <Text style={styles.emptyBtnText}>{t('flows.createCustom')}</Text>
            </Pressable>
          </GlassCard>
        )}
      </ScrollView>

      {/* Sidebar Toggle */}
      <Pressable
        style={[styles.sidebarToggle, isRTL && styles.sidebarToggleRTL,
                sidebarOpen && (isRTL ? { right: sidebarWidth - 44 } : { left: sidebarWidth - 44 })]}
        onPress={() => setSidebarOpen(!sidebarOpen)}
      >
        <GlassView style={styles.toggleInner} intensity="medium">
          {isRTL ? (sidebarOpen ? <ChevronRight size={18} color={colors.text} /> : <ChevronLeft size={18} color={colors.text} />) :
                   (sidebarOpen ? <ChevronLeft size={18} color={colors.text} /> : <ChevronRight size={18} color={colors.text} />)}
        </GlassView>
      </Pressable>

      {/* Sidebar */}
      <FlowSidebar
        isOpen={sidebarOpen}
        width={sidebarWidth}
        isRTL={isRTL}
        isMobile={isMobile}
        isDragging={isDraggingSidebar}
        selectedFlow={selectedFlow}
        onCreateFlow={openCreateModal}
        onStartFlow={() => selectedFlow && handleStartFlow(selectedFlow)}
        onEditFlow={openEditModal}
        onDeleteFlow={handleDeleteFlow}
        onWidthChange={setSidebarWidth}
        onDragStart={() => setIsDraggingSidebar(true)}
        onDragEnd={() => setIsDraggingSidebar(false)}
        onUseTemplate={handleUseTemplate}
      />

      {/* Mobile Overlay */}
      {isMobile && sidebarOpen && (
        <Pressable style={styles.overlay} onPress={() => setSidebarOpen(false)} />
      )}

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
  container: { flex: 1, flexDirection: 'row', position: 'relative', overflow: 'visible' as any },
  main: { flex: 1, transition: 'margin 0.3s ease' as any, overflow: 'visible' as any },
  mainInner: { padding: IS_TV_BUILD ? spacing.xl * 2 : spacing.xl, paddingBottom: spacing.xl * 2, maxWidth: IS_TV_BUILD ? '100%' : 1200, marginHorizontal: 'auto', width: '100%', position: 'relative', overflow: 'visible' as any },
  bgGradient1: { position: 'absolute', width: 600, height: 600, borderRadius: 300, backgroundColor: colors.primary, opacity: 0.05, top: -200, right: -200, filter: 'blur(120px)' as any },
  bgGradient2: { position: 'absolute', width: 500, height: 500, borderRadius: 250, backgroundColor: '#8b5cf6', opacity: 0.04, bottom: 0, left: -150, filter: 'blur(100px)' as any },
  menuBtn: { position: 'absolute', top: spacing.md, right: spacing.md, width: 44, height: 44, borderRadius: 12, backgroundColor: colors.glass, justifyContent: 'center', alignItems: 'center', zIndex: 10 },
  menuBtnRTL: { right: 'auto' as any, left: spacing.md },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', minHeight: 400 },
  loadingText: { marginTop: spacing.md, fontSize: IS_TV_BUILD ? 24 : 16, color: colors.textSecondary },
  header: { marginBottom: spacing.xl, paddingTop: spacing.md },
  headerRTL: { alignItems: 'flex-end' },
  title: { fontSize: IS_TV_BUILD ? 56 : 40, fontWeight: '800', color: colors.text, marginBottom: spacing.xs, letterSpacing: -1 },
  subtitle: { fontSize: IS_TV_BUILD ? 24 : 18, color: colors.textMuted, lineHeight: IS_TV_BUILD ? 36 : 26 },
  categories: { marginBottom: spacing.xl, overflow: 'visible' as any },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: IS_TV_BUILD ? spacing.xl : spacing.lg, marginBottom: spacing.xl, overflow: 'visible' as any },
  gridTablet: { gap: spacing.md },
  emptyState: { padding: spacing.xl, alignItems: 'center', marginTop: spacing.lg },
  emptyText: { fontSize: 16, color: colors.textMuted, marginBottom: spacing.md, textAlign: 'center' },
  emptyBtn: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  emptyBtnRTL: { flexDirection: 'row-reverse' },
  emptyBtnText: { fontSize: 15, color: colors.primary, fontWeight: '600' },
  sidebarToggle: { position: 'fixed' as any, top: 80, left: spacing.md, zIndex: 150, transition: 'left 0.3s ease, right 0.3s ease' as any },
  sidebarToggleRTL: { left: 'auto' as any, right: spacing.md },
  toggleInner: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.15)' },
  overlay: { position: 'fixed' as any, top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0, 0, 0, 0.6)', zIndex: 99 },
  textRTL: { textAlign: 'right' },
});
