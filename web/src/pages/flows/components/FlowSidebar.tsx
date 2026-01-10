/**
 * FlowSidebar Component
 * Collapsible sidebar with flow actions and details
 */

import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Plus, Play, Edit2, Trash2, GripVertical, Sparkles, Sun, Moon, Coffee, Sunset, Star } from 'lucide-react';
import { colors, spacing, borderRadius } from '@bayit/shared/theme';
import { GlassView } from '@bayit/shared/ui';
import type { Flow, FlowTrigger } from '../types/flows.types';
import { getLocalizedName, formatTriggerTime } from '../utils/flowHelpers';

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

const SIDEBAR_MIN_WIDTH = 280;
const SIDEBAR_MAX_WIDTH = 480;

interface FlowSidebarProps {
  isOpen: boolean;
  width: number;
  isRTL?: boolean;
  isMobile?: boolean;
  isDragging?: boolean;
  selectedFlow: Flow | null;
  onCreateFlow: () => void;
  onStartFlow: () => void;
  onEditFlow: () => void;
  onDeleteFlow: () => void;
  onWidthChange: (width: number) => void;
  onDragStart: () => void;
  onDragEnd: () => void;
  onUseTemplate?: (template: Partial<Flow>) => void;
}

export function FlowSidebar({
  isOpen,
  width,
  isRTL = false,
  isMobile = false,
  isDragging = false,
  selectedFlow,
  onCreateFlow,
  onStartFlow,
  onEditFlow,
  onDeleteFlow,
  onWidthChange,
  onDragStart,
  onDragEnd,
  onUseTemplate,
}: FlowSidebarProps) {
  const { t, i18n } = useTranslation();
  const [hoveredExample, setHoveredExample] = useState<string | null>(null);

  // Sidebar drag handler
  const handleSidebarDragStart = useCallback((e: any) => {
    e.preventDefault();
    onDragStart();

    const startX = e.clientX || (e.touches && e.touches[0].clientX);
    const startWidth = width;

    const handleDrag = (moveEvent: any) => {
      const currentX = moveEvent.clientX || (moveEvent.touches && moveEvent.touches[0].clientX);
      const deltaX = isRTL ? (startX - currentX) : (currentX - startX);
      const newWidth = Math.min(SIDEBAR_MAX_WIDTH, Math.max(SIDEBAR_MIN_WIDTH, startWidth + deltaX));
      onWidthChange(newWidth);
    };

    const handleDragEnd = () => {
      onDragEnd();
      document.removeEventListener('mousemove', handleDrag);
      document.removeEventListener('mouseup', handleDragEnd);
      document.removeEventListener('touchmove', handleDrag);
      document.removeEventListener('touchend', handleDragEnd);
    };

    document.addEventListener('mousemove', handleDrag);
    document.addEventListener('mouseup', handleDragEnd);
    document.addEventListener('touchmove', handleDrag);
    document.addEventListener('touchend', handleDragEnd);
  }, [width, isRTL, onWidthChange, onDragStart, onDragEnd]);

  if (!isOpen) {
    return null;
  }

  return (
    <GlassView
      style={[
        styles.sidebar,
        { width },
        isRTL && styles.sidebarRTL,
        isMobile && styles.sidebarMobile,
        isDragging && styles.sidebarDragging,
      ]}
      intensity="high"
    >
      {/* Drag Handle */}
      {!isMobile && (
        <View
          style={[styles.dragHandle, isRTL && styles.dragHandleRTL]}
          // @ts-ignore - Web mouse events
          onMouseDown={handleSidebarDragStart}
        >
          <GripVertical size={16} color={colors.textMuted} />
        </View>
      )}

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <Text style={[styles.title, isRTL && styles.textRTL]}>
          {t('flows.actions')}
        </Text>

        {/* Create New Flow */}
        <Pressable style={[styles.action, isRTL && styles.actionRTL]} onPress={onCreateFlow}>
          <View style={styles.actionIcon}>
            <Plus size={20} color={colors.primary} />
          </View>
          <View style={styles.actionContent}>
            <Text style={[styles.actionTitle, isRTL && styles.textRTL]}>
              {t('flows.createFlow')}
            </Text>
            <Text style={[styles.actionDesc, isRTL && styles.textRTL]}>
              {t('flows.createFlowDesc')}
            </Text>
          </View>
        </Pressable>

        {/* Example Flows */}
        <View style={styles.divider} />
        <View style={[styles.examplesHeader, isRTL && styles.examplesHeaderRTL]}>
          <Sparkles size={16} color={colors.primary} />
          <Text style={[styles.title, styles.examplesTitle, isRTL && styles.textRTL]}>
            {t('flows.examples.title')}
          </Text>
        </View>
        <Text style={[styles.examplesSubtitle, isRTL && styles.textRTL]}>
          {t('flows.examples.subtitle')}
        </Text>

        <View style={styles.examplesGrid}>
          {EXAMPLE_FLOWS.map((example) => (
            <Pressable
              key={example.id}
              style={[
                styles.exampleCard,
                hoveredExample === example.id && styles.exampleCardHovered,
              ]}
              onPress={() => onUseTemplate?.(example.template)}
              // @ts-ignore - Web hover events
              onMouseEnter={() => setHoveredExample(example.id)}
              onMouseLeave={() => setHoveredExample(null)}
            >
              <View style={styles.exampleIcon}>
                {example.icon}
              </View>
              <View style={styles.exampleContent}>
                <Text style={[styles.exampleName, isRTL && styles.textRTL]} numberOfLines={1}>
                  {t(example.nameKey)}
                </Text>
                <Text style={[styles.exampleDesc, isRTL && styles.textRTL]} numberOfLines={2}>
                  {t(example.descKey)}
                </Text>
              </View>
            </Pressable>
          ))}
        </View>

        {/* Selected Flow Actions */}
        {selectedFlow && (
          <>
            <View style={styles.divider} />
            <Text style={[styles.sectionTitle, isRTL && styles.textRTL]}>
              {getLocalizedName(selectedFlow, i18n.language)}
            </Text>

            <Pressable style={[styles.action, isRTL && styles.actionRTL]} onPress={onStartFlow}>
              <View style={[styles.actionIcon, styles.actionIconPrimary]}>
                <Play size={20} color="#000" />
              </View>
              <View style={styles.actionContent}>
                <Text style={[styles.actionTitle, isRTL && styles.textRTL]}>
                  {t('flows.startFlow')}
                </Text>
              </View>
            </Pressable>

            {selectedFlow.flow_type === 'custom' && (
              <>
                <Pressable style={[styles.action, isRTL && styles.actionRTL]} onPress={onEditFlow}>
                  <View style={styles.actionIcon}>
                    <Edit2 size={20} color={colors.text} />
                  </View>
                  <View style={styles.actionContent}>
                    <Text style={[styles.actionTitle, isRTL && styles.textRTL]}>
                      {t('flows.editFlow')}
                    </Text>
                  </View>
                </Pressable>

                <Pressable style={[styles.action, isRTL && styles.actionRTL]} onPress={onDeleteFlow}>
                  <View style={[styles.actionIcon, styles.actionIconDanger]}>
                    <Trash2 size={20} color={colors.error} />
                  </View>
                  <View style={styles.actionContent}>
                    <Text style={[styles.actionTitle, styles.actionTitleDanger, isRTL && styles.textRTL]}>
                      {t('flows.deleteFlow')}
                    </Text>
                  </View>
                </Pressable>
              </>
            )}

            {/* Flow Info */}
            <View style={styles.divider} />
            <Text style={[styles.sectionTitle, isRTL && styles.textRTL]}>
              {t('flows.details')}
            </Text>
            <View style={styles.info}>
              <View style={[styles.infoRow, isRTL && styles.infoRowRTL]}>
                <Text style={styles.infoLabel}>{t('flows.type')}</Text>
                <Text style={styles.infoValue}>
                  {selectedFlow.flow_type === 'system' ? t('flows.systemFlow') : t('flows.customFlow')}
                </Text>
              </View>
              <View style={[styles.infoRow, isRTL && styles.infoRowRTL]}>
                <Text style={styles.infoLabel}>{t('flows.schedule')}</Text>
                <Text style={styles.infoValue}>
                  {selectedFlow.triggers.length > 0 ? formatTriggerTime(selectedFlow.triggers[0], t) : t('flows.manual')}
                </Text>
              </View>
              <View style={[styles.infoRow, isRTL && styles.infoRowRTL]}>
                <Text style={styles.infoLabel}>{t('flows.content')}</Text>
                <Text style={styles.infoValue}>
                  {selectedFlow.items.length > 0
                    ? `${selectedFlow.items.length} ${t('flows.items')}`
                    : t('flows.aiGenerated')}
                </Text>
              </View>
              {selectedFlow.ai_enabled && (
                <View style={[styles.infoRow, isRTL && styles.infoRowRTL]}>
                  <Text style={styles.infoLabel}>{t('flows.aiEnabled')}</Text>
                  <Text style={[styles.infoValue, styles.infoValueSuccess]}>
                    {t('common.yes')}
                  </Text>
                </View>
              )}
              {selectedFlow.ai_brief_enabled && (
                <View style={[styles.infoRow, isRTL && styles.infoRowRTL]}>
                  <Text style={styles.infoLabel}>{t('flows.aiBrief')}</Text>
                  <Text style={[styles.infoValue, styles.infoValueSuccess]}>
                    {t('common.yes')}
                  </Text>
                </View>
              )}
            </View>
          </>
        )}
      </ScrollView>
    </GlassView>
  );
}

const styles = StyleSheet.create({
  sidebar: {
    position: 'fixed' as any,
    top: 64,
    left: 0,
    bottom: 0,
    borderRightWidth: 1,
    borderRightColor: 'rgba(255, 255, 255, 0.1)',
    zIndex: 101,
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
  sidebarMobile: {
    width: '85%',
    maxWidth: 360,
  },
  sidebarDragging: {
    // @ts-ignore
    transition: 'none',
    // @ts-ignore
    userSelect: 'none',
  },
  dragHandle: {
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
  dragHandleRTL: {
    right: 'auto' as any,
    left: 0,
  },
  scroll: {
    flex: 1,
  },
  content: {
    padding: spacing.lg,
    paddingTop: spacing.xl,
    paddingRight: spacing.xl,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: spacing.lg,
  },
  action: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.md,
    marginBottom: spacing.xs,
  },
  actionRTL: {
    flexDirection: 'row-reverse',
  },
  actionIcon: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.md,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionIconPrimary: {
    backgroundColor: colors.primary,
  },
  actionIconDanger: {
    backgroundColor: 'rgba(255, 59, 48, 0.15)',
  },
  actionContent: {
    flex: 1,
  },
  actionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
  },
  actionTitleDanger: {
    color: colors.error,
  },
  actionDesc: {
    fontSize: 13,
    color: colors.textMuted,
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    marginVertical: spacing.lg,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.md,
  },
  info: {
    gap: spacing.sm,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.xs,
  },
  infoRowRTL: {
    flexDirection: 'row-reverse',
  },
  infoLabel: {
    fontSize: 13,
    color: colors.textMuted,
  },
  infoValue: {
    fontSize: 13,
    color: colors.text,
    fontWeight: '500',
  },
  infoValueSuccess: {
    color: colors.success,
  },
  textRTL: {
    textAlign: 'right',
  },
  examplesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  examplesHeaderRTL: {
    flexDirection: 'row-reverse',
  },
  examplesTitle: {
    marginBottom: 0,
  },
  examplesSubtitle: {
    fontSize: 12,
    color: colors.textMuted,
    marginBottom: spacing.md,
  },
  examplesGrid: {
    gap: spacing.sm,
  },
  exampleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.sm,
    borderRadius: borderRadius.md,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderWidth: 1,
    borderColor: 'transparent',
    // @ts-ignore - Web transition
    transition: 'all 0.2s ease',
  },
  exampleCardHovered: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderColor: 'rgba(0, 217, 255, 0.3)',
    // @ts-ignore - Web cursor
    cursor: 'pointer',
  },
  exampleIcon: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.sm,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  exampleContent: {
    flex: 1,
  },
  exampleName: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
  },
  exampleDesc: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
    lineHeight: 14,
  },
});

export default FlowSidebar;
