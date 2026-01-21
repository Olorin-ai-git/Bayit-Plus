/**
 * FlowTopBar Component
 * Top bar with Create Flow FAB and Templates dropdown
 * Replaces sidebar creation UI
 */

import React, { useState, useRef } from 'react';
import { View, Text, Pressable, Animated } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Plus, ChevronDown, Sun, Moon, Star, Coffee, Sunset, Sparkles } from 'lucide-react';
import { colors } from '@bayit/shared/theme';
import { GlassFAB, GlassModal } from '@bayit/shared/ui';
import { isTV } from '@bayit/shared-utils/platform';
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
    <View className={`flex ${flexDirection === 'row-reverse' ? 'flex-row-reverse' : 'flex-row'} justify-between items-center px-${isTV ? '16' : '6'} py-${isTV ? '8' : '6'} mb-${isTV ? '6' : '4'}`}>
      {/* Page Title (optional - can be removed if header shows it) */}
      <View className={`flex-1 ${isRTL ? 'items-end' : ''}`}>
        <Text className={`${isTV ? 'text-5xl' : 'text-3xl'} font-extrabold text-[color:var(--text)] mb-1 tracking-tight ${isRTL ? 'text-right' : ''}`}>
          {t('flows.title')}
        </Text>
        <Text className={`${isTV ? 'text-xl' : 'text-base'} text-[color:var(--text-muted)] ${isRTL ? 'text-right' : ''}`}>
          {t('flows.subtitle')}
        </Text>
      </View>

      {/* Actions */}
      <View className={`flex ${flexDirection === 'row-reverse' ? 'flex-row-reverse' : 'flex-row'} items-center gap-4`}>
        {/* Templates Dropdown Button */}
        <Pressable
          className={`flex ${flexDirection === 'row-reverse' ? 'flex-row-reverse' : 'flex-row'} items-center gap-2 py-${isTV ? '4' : '2'} px-${isTV ? '6' : '4'} bg-white/10 rounded-full border border-white/15 transition-all duration-200`}
          onPress={handleOpenTemplates}
        >
          <Sparkles size={isTV ? 20 : 16} color={colors.primary} />
          <Text className={`${isTV ? 'text-lg' : 'text-sm'} font-semibold text-[color:var(--text)]`}>
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
      <GlassModal
        visible={showTemplates}
        title={t('flows.topBar.templates')}
        onClose={handleCloseTemplates}
        dismissable={true}
      >
        <Text className={`text-sm text-[color:var(--text-muted)] mb-6 ${isRTL ? 'text-right' : ''}`}>
          {t('flows.templates.subtitle')}
        </Text>

        {/* Templates List */}
        <View className="gap-2">
          {FLOW_TEMPLATES.map((template) => (
            <Pressable
              key={template.id}
              className={`flex ${flexDirection === 'row-reverse' ? 'flex-row-reverse' : 'flex-row'} items-center gap-4 p-4 rounded-lg bg-white/5 border border-transparent transition-all duration-200 ${
                hoveredTemplate === template.id ? 'bg-white/10 border-[rgba(168,85,247,0.6)] cursor-pointer' : ''
              }`}
              onPress={() => handleSelectTemplate(template)}
              // @ts-ignore - Web hover
              onMouseEnter={() => setHoveredTemplate(template.id)}
              onMouseLeave={() => setHoveredTemplate(null)}
            >
              <View className="w-12 h-12 rounded-lg bg-white/10 justify-center items-center">
                {template.icon}
              </View>
              <View className="flex-1">
                <Text className={`text-[15px] font-semibold text-[color:var(--text)] mb-1 ${isRTL ? 'text-right' : ''}`}>
                  {t(template.nameKey)}
                </Text>
                <Text className={`text-[13px] text-[color:var(--text-muted)] leading-[18px] ${isRTL ? 'text-right' : ''}`} numberOfLines={2}>
                  {t(template.descKey)}
                </Text>
              </View>
            </Pressable>
          ))}
        </View>

        {/* Create Custom */}
        <Pressable
          className={`flex ${flexDirection === 'row-reverse' ? 'flex-row-reverse' : 'flex-row'} items-center justify-center gap-2 p-4 rounded-lg border border-dashed border-[rgba(168,85,247,0.6)] mt-6 transition-all duration-200`}
          onPress={() => {
            handleCloseTemplates();
            onCreateFlow();
          }}
        >
          <Plus size={18} color={colors.primary} />
          <Text className="text-[15px] font-semibold text-[color:var(--primary)]">
            {t('flows.topBar.createCustom')}
          </Text>
        </Pressable>
      </GlassModal>
    </View>
  );
}

export default FlowTopBar;
