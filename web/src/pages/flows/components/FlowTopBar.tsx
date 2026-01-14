/**
 * FlowTopBar Component
 * Top bar with Create Flow FAB and Templates dropdown
 * Replaces sidebar creation UI
 */

import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, Pressable, Modal, Animated } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Plus, ChevronDown, Sun, Moon, Star, Coffee, Sunset, X, Sparkles } from 'lucide-react';
import { colors, spacing, borderRadius } from '@bayit/shared/theme';
import { GlassView, GlassFAB, GlassButton } from '@bayit/shared/ui';
import { isTV } from '@bayit/shared/utils/platform';
import { useDirection } from '@/hooks/useDirection';
import type { Flow } from '../types/flows.types';

// Flow templates
interface FlowTemplate {
  id: string;
  nameKey: string;
  descKey: string;
  icon: React.ReactNode;
  template: Partial<Flow>;
}

const FLOW_TEMPLATES: FlowTemplate[] = [
  {
    id: 'morning-routine',
    nameKey: 'flows.templates.morningRoutine.name',
    descKey: 'flows.templates.morningRoutine.desc',
    icon: <Sun size={24} color={colors.warning} />,
    template: {
      name: 'שגרת בוקר',
      name_en: 'Morning Routine',
      name_es: 'Rutina Matutina',
      triggers: [{ type: 'time', start_time: '07:00', days: [0, 1, 2, 3, 4] }],
      ai_enabled: true,
      auto_play: true,
    },
  },
  {
    id: 'evening-wind-down',
    nameKey: 'flows.templates.eveningWindDown.name',
    descKey: 'flows.templates.eveningWindDown.desc',
    icon: <Moon size={24} color={colors.primary} />,
    template: {
      name: 'רגיעה ערבית',
      name_en: 'Evening Wind Down',
      name_es: 'Relajación Nocturna',
      triggers: [{ type: 'time', start_time: '21:00', days: [0, 1, 2, 3, 4, 5, 6] }],
      ai_enabled: true,
      auto_play: true,
    },
  },
  {
    id: 'shabbat-prep',
    nameKey: 'flows.templates.shabbatPrep.name',
    descKey: 'flows.templates.shabbatPrep.desc',
    icon: <Star size={24} color="#FFD700" />,
    template: {
      name: 'הכנות לשבת',
      name_en: 'Shabbat Preparation',
      name_es: 'Preparación para Shabat',
      triggers: [{ type: 'shabbat', start_time: '14:00' }],
      ai_enabled: false,
      auto_play: true,
    },
  },
  {
    id: 'coffee-break',
    nameKey: 'flows.templates.coffeeBreak.name',
    descKey: 'flows.templates.coffeeBreak.desc',
    icon: <Coffee size={24} color="#8B4513" />,
    template: {
      name: 'הפסקת קפה',
      name_en: 'Coffee Break',
      name_es: 'Pausa para Café',
      triggers: [],
      ai_enabled: true,
      auto_play: false,
    },
  },
  {
    id: 'sunset-vibes',
    nameKey: 'flows.templates.sunsetVibes.name',
    descKey: 'flows.templates.sunsetVibes.desc',
    icon: <Sunset size={24} color="#FF6B35" />,
    template: {
      name: 'אווירת שקיעה',
      name_en: 'Sunset Vibes',
      name_es: 'Vibras de Atardecer',
      triggers: [{ type: 'time', start_time: '18:30', days: [5, 6] }],
      ai_enabled: true,
      auto_play: true,
    },
  },
];

interface FlowTopBarProps {
  onCreateFlow: () => void;
  onUseTemplate: (template: Partial<Flow>) => void;
}

export function FlowTopBar({
  onCreateFlow,
  onUseTemplate,
}: FlowTopBarProps) {
  const { t } = useTranslation();
  const { isRTL, flexDirection } = useDirection();
  const [showTemplates, setShowTemplates] = useState(false);
  const [hoveredTemplate, setHoveredTemplate] = useState<string | null>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const handleOpenTemplates = () => {
    setShowTemplates(true);
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 200,
      useNativeDriver: true,
    }).start();
  };

  const handleCloseTemplates = () => {
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 150,
      useNativeDriver: true,
    }).start(() => setShowTemplates(false));
  };

  const handleSelectTemplate = (template: FlowTemplate) => {
    handleCloseTemplates();
    onUseTemplate(template.template);
  };

  return (
    <View style={[styles.container, { flexDirection }]}>
      {/* Page Title (optional - can be removed if header shows it) */}
      <View style={[styles.titleContainer, isRTL && styles.titleContainerRTL]}>
        <Text style={[styles.pageTitle, isRTL && styles.textRTL]}>
          {t('flows.title')}
        </Text>
        <Text style={[styles.pageSubtitle, isRTL && styles.textRTL]}>
          {t('flows.subtitle')}
        </Text>
      </View>

      {/* Actions */}
      <View style={[styles.actions, { flexDirection }]}>
        {/* Templates Dropdown Button */}
        <Pressable
          style={[styles.templatesBtn, { flexDirection }]}
          onPress={handleOpenTemplates}
        >
          <Sparkles size={isTV ? 20 : 16} color={colors.primary} />
          <Text style={styles.templatesBtnText}>
            {t('flows.topBar.templates')}
          </Text>
          <ChevronDown size={isTV ? 18 : 14} color={colors.textMuted} />
        </Pressable>

        {/* Create Flow FAB */}
        <GlassFAB
          icon={<Plus size={isTV ? 24 : 20} color="#000" />}
          label={t('flows.topBar.createFlow')}
          onPress={onCreateFlow}
          size={isTV ? 'lg' : 'md'}
          variant="gradient"
          isRTL={isRTL}
        />
      </View>

      {/* Templates Modal */}
      <Modal
        visible={showTemplates}
        transparent
        animationType="none"
        onRequestClose={handleCloseTemplates}
      >
        <Pressable style={styles.modalBackdrop} onPress={handleCloseTemplates}>
          <Animated.View style={[styles.modalContent, { opacity: fadeAnim }]}>
            <GlassView style={styles.templatesPanel} intensity="high">
              {/* Header */}
              <View style={[styles.templatesPanelHeader, { flexDirection }]}>
                <View style={[styles.templatesTitleContainer, { flexDirection }]}>
                  <Sparkles size={20} color={colors.primary} />
                  <Text style={[styles.templatesPanelTitle, isRTL && styles.textRTL]}>
                    {t('flows.topBar.templates')}
                  </Text>
                </View>
                <Pressable onPress={handleCloseTemplates} style={styles.closeBtn}>
                  <X size={20} color={colors.textMuted} />
                </Pressable>
              </View>

              <Text style={[styles.templatesSubtitle, isRTL && styles.textRTL]}>
                {t('flows.templates.subtitle')}
              </Text>

              {/* Templates List */}
              <View style={styles.templatesList}>
                {FLOW_TEMPLATES.map((template) => (
                  <Pressable
                    key={template.id}
                    style={[
                      styles.templateItem,
                      { flexDirection },
                      hoveredTemplate === template.id && styles.templateItemHovered,
                    ]}
                    onPress={() => handleSelectTemplate(template)}
                    // @ts-ignore - Web hover
                    onMouseEnter={() => setHoveredTemplate(template.id)}
                    onMouseLeave={() => setHoveredTemplate(null)}
                  >
                    <View style={styles.templateIcon}>
                      {template.icon}
                    </View>
                    <View style={styles.templateContent}>
                      <Text style={[styles.templateName, isRTL && styles.textRTL]}>
                        {t(template.nameKey)}
                      </Text>
                      <Text style={[styles.templateDesc, isRTL && styles.textRTL]} numberOfLines={2}>
                        {t(template.descKey)}
                      </Text>
                    </View>
                  </Pressable>
                ))}
              </View>

              {/* Create Custom */}
              <Pressable
                style={[styles.createCustomBtn, { flexDirection }]}
                onPress={() => {
                  handleCloseTemplates();
                  onCreateFlow();
                }}
              >
                <Plus size={18} color={colors.primary} />
                <Text style={styles.createCustomText}>
                  {t('flows.topBar.createCustom')}
                </Text>
              </Pressable>
            </GlassView>
          </Animated.View>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: isTV ? spacing.xl * 2 : spacing.lg,
    paddingVertical: isTV ? spacing.xl : spacing.lg,
    marginBottom: isTV ? spacing.lg : spacing.md,
  },
  titleContainer: {
    flex: 1,
  },
  titleContainerRTL: {
    alignItems: 'flex-end',
  },
  pageTitle: {
    fontSize: isTV ? 48 : 32,
    fontWeight: '800',
    color: colors.text,
    marginBottom: spacing.xs,
    letterSpacing: -1,
  },
  pageSubtitle: {
    fontSize: isTV ? 20 : 16,
    color: colors.textMuted,
  },
  textRTL: {
    textAlign: 'right',
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  templatesBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: isTV ? spacing.md : spacing.sm,
    paddingHorizontal: isTV ? spacing.lg : spacing.md,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    // @ts-ignore - Web transition
    transition: 'all 0.2s ease',
  },
  templatesBtnText: {
    fontSize: isTV ? 18 : 14,
    fontWeight: '600',
    color: colors.text,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '90%',
    maxWidth: 500,
  },
  templatesPanel: {
    padding: spacing.xl,
    borderRadius: borderRadius.xl,
  },
  templatesPanelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  templatesTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  templatesPanelTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
  },
  closeBtn: {
    padding: spacing.sm,
    borderRadius: borderRadius.md,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  templatesSubtitle: {
    fontSize: 14,
    color: colors.textMuted,
    marginBottom: spacing.lg,
  },
  templatesList: {
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  templateItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderWidth: 1,
    borderColor: 'transparent',
    // @ts-ignore - Web transition
    transition: 'all 0.2s ease',
  },
  templateItemHovered: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderColor: 'rgba(168, 85, 247, 0.6)',
    // @ts-ignore - Web cursor
    cursor: 'pointer',
  },
  templateIcon: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.md,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  templateContent: {
    flex: 1,
  },
  templateName: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  templateDesc: {
    fontSize: 13,
    color: colors.textMuted,
    lineHeight: 18,
  },
  createCustomBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: 'rgba(168, 85, 247, 0.6)',
    borderStyle: 'dashed',
    // @ts-ignore - Web transition
    transition: 'all 0.2s ease',
  },
  createCustomText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.primary,
  },
});

export default FlowTopBar;
