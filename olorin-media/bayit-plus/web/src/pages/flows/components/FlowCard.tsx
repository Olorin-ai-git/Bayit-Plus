/**
 * FlowCard Component
 * Individual flow card display with selection, actions, and feature badges
 */

import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Clock, Sparkles, Play, List, Edit2 } from 'lucide-react';
import LinearGradient from 'react-native-web-linear-gradient';
import { colors } from '@bayit/shared/theme';
import { GlassView, GlassButton } from '@bayit/shared/ui';
import type { Flow, FlowTrigger } from '../types/flows.types';
import { getLocalizedName, getLocalizedDescription, formatTriggerTime } from '../utils/flowHelpers';

// Check if this is a TV build (set by webpack)
declare const __TV__: boolean;
const IS_TV_BUILD = typeof __TV__ !== 'undefined' && __TV__;

// Flow icon configurations by name
const FLOW_CONFIGS: Record<string, { colors: string[]; bgColor: string }> = {
  'טקס בוקר': { colors: ['#ff9500', '#ff6b00'], bgColor: 'rgba(255, 149, 0, 0.15)' },
  'Morning Ritual': { colors: ['#ff9500', '#ff6b00'], bgColor: 'rgba(255, 149, 0, 0.15)' },
  'Ritual Matutino': { colors: ['#ff9500', '#ff6b00'], bgColor: 'rgba(255, 149, 0, 0.15)' },
  'ליל שבת': { colors: ['#5856d6', '#8b5cf6'], bgColor: 'rgba(88, 86, 214, 0.15)' },
  'Shabbat Evening': { colors: ['#5856d6', '#8b5cf6'], bgColor: 'rgba(88, 86, 214, 0.15)' },
  'Noche de Shabat': { colors: ['#5856d6', '#8b5cf6'], bgColor: 'rgba(88, 86, 214, 0.15)' },
  'שעת שינה': { colors: ['#1a1a2e', '#4a4a8a'], bgColor: 'rgba(74, 74, 138, 0.15)' },
  'Sleep Time': { colors: ['#1a1a2e', '#4a4a8a'], bgColor: 'rgba(74, 74, 138, 0.15)' },
  'Hora de Dormir': { colors: ['#1a1a2e', '#4a4a8a'], bgColor: 'rgba(74, 74, 138, 0.15)' },
  'זמן ילדים': { colors: ['#ff2d55', '#ff6b9d'], bgColor: 'rgba(255, 45, 85, 0.15)' },
  'Kids Time': { colors: ['#ff2d55', '#ff6b9d'], bgColor: 'rgba(255, 45, 85, 0.15)' },
  'Hora de los Niños': { colors: ['#ff2d55', '#ff6b9d'], bgColor: 'rgba(255, 45, 85, 0.15)' },
};

const DEFAULT_FLOW_CONFIG = { colors: ['#a855f7', '#0099cc'], bgColor: 'rgba(107, 33, 168, 0.3)' };

interface FlowCardProps {
  flow: Flow;
  isSelected: boolean;
  isTablet?: boolean;
  isRTL?: boolean;
  isPremium?: boolean;
  onSelect: () => void;
  onStart: () => void;
  onEdit?: () => void;
}

function FlowIcon({ flow, size = 56 }: { flow: Flow; size?: number }) {
  const config = FLOW_CONFIGS[flow.name] || FLOW_CONFIGS[flow.name_en || ''] || DEFAULT_FLOW_CONFIG;
  const iconSize = size * 0.57;

  return (
    <LinearGradient
      colors={config.colors}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      className="justify-center items-center"
      style={{ width: size, height: size, borderRadius: size / 4 }}
    >
      <Play size={iconSize} color="#fff" />
    </LinearGradient>
  );
}

export function FlowCard({
  flow,
  isSelected,
  isTablet = false,
  isRTL = false,
  isPremium = true,
  onSelect,
  onStart,
  onEdit,
}: FlowCardProps) {
  const { t, i18n } = useTranslation();
  const config = FLOW_CONFIGS[flow.name] || FLOW_CONFIGS[flow.name_en || ''] || DEFAULT_FLOW_CONFIG;

  const localizedName = getLocalizedName(flow, i18n.language);
  const localizedDescription = getLocalizedDescription(flow, i18n.language);
  const triggerDisplay = flow.triggers.length > 0
    ? formatTriggerTime(flow.triggers[0], t)
    : t('flows.manual');

  const cardWidth = IS_TV_BUILD ? 'calc(50% - 24px)' : 'calc(50% - 12px)';
  const cardMinWidth = IS_TV_BUILD ? 420 : 300;
  const cardPadding = IS_TV_BUILD ? 32 : 24;
  const borderWidth = IS_TV_BUILD ? 2 : 1;

  return (
    <Pressable
      onPress={onSelect}
      className={`rounded-2xl transition-all duration-200 ${isTablet ? 'w-full' : ''} ${
        isSelected ? 'border-[color:var(--primary)] scale-[1.02]' : 'border-white/10'
      }`}
      style={{ backgroundColor: config.bgColor, width: cardWidth, minWidth: cardMinWidth, padding: cardPadding, borderWidth }}
    >
      <View className={`flex ${isRTL ? 'flex-row-reverse' : 'flex-row'} justify-between items-start mb-4`}>
        <FlowIcon flow={flow} size={56} />
        {flow.flow_type === 'system' && (
          <GlassView className="px-2 py-1 rounded-sm" intensity="low">
            <Text className="text-[10px] text-[color:var(--primary)] font-semibold uppercase">{t('flows.system')}</Text>
          </GlassView>
        )}
        {!isPremium && (
          <GlassView className="px-2 py-1 rounded-sm bg-[rgba(255,204,0,0.2)]" intensity="low">
            <Text className="text-[10px] text-[color:var(--warning)] font-semibold">⭐ {t('common.premium', 'Premium')}</Text>
          </GlassView>
        )}
      </View>

      <Text className={`${IS_TV_BUILD ? 'text-[28px]' : 'text-[22px]'} font-bold text-[color:var(--text)] ${IS_TV_BUILD ? 'mb-4' : 'mb-2'} w-full ${isRTL ? 'text-right' : ''}`}>
        {localizedName}
      </Text>

      {localizedDescription && (
        <Text className={`${IS_TV_BUILD ? 'text-lg leading-7' : 'text-sm leading-[22px]'} text-[color:var(--text-muted)] mb-4 w-full ${isRTL ? 'text-right' : ''}`} numberOfLines={2}>
          {localizedDescription}
        </Text>
      )}

      <View className={`flex ${isRTL ? 'flex-row-reverse' : 'flex-row'} items-center gap-1 mb-2 w-full`}>
        <Clock size={14} color={colors.textMuted} />
        <Text className="text-[13px] text-[color:var(--text-muted)] flex-1">{triggerDisplay}</Text>
      </View>

      <View className={`flex ${isRTL ? 'flex-row-reverse' : 'flex-row'} gap-2 flex-wrap`}>
        {flow.ai_enabled && (
          <View className="flex flex-row items-center gap-1 px-2 py-1.5 rounded-full bg-white/10">
            <Sparkles size={12} color={colors.warning} />
            <Text className="text-xs text-[color:var(--text-muted)] font-medium">AI</Text>
          </View>
        )}
        {flow.ai_brief_enabled && (
          <View className="flex flex-row items-center gap-1 px-2 py-1.5 rounded-full bg-white/10">
            <Sparkles size={12} color={colors.info} />
            <Text className="text-xs text-[color:var(--text-muted)] font-medium">{t('flows.aiBrief')}</Text>
          </View>
        )}
        {flow.auto_play && (
          <View className="flex flex-row items-center gap-1 px-2 py-1.5 rounded-full bg-white/10">
            <Play size={12} color={colors.primary} />
            <Text className="text-xs text-[color:var(--text-muted)] font-medium">{t('flows.autoPlay')}</Text>
          </View>
        )}
        {flow.items.length > 0 && (
          <View className="flex flex-row items-center gap-1 px-2 py-1.5 rounded-full bg-white/10">
            <List size={12} color={colors.textMuted} />
            <Text className="text-xs text-[color:var(--text-muted)] font-medium">{flow.items.length}</Text>
          </View>
        )}
      </View>

      {/* Quick Actions on Selected */}
      {isSelected && (
        <View className={`flex ${isRTL ? 'flex-row-reverse' : 'flex-row'} gap-2 mt-4 pt-4 border-t border-white/10`}>
          <GlassButton
            title={t('flows.start')}
            onPress={onStart}
            variant="primary"
            size="sm"
            className="flex-1"
          />
          {flow.flow_type === 'custom' && onEdit && (
            <Pressable onPress={onEdit} className="w-11 h-11 rounded-lg bg-white/10 justify-center items-center">
              <Edit2 size={16} color={colors.text} />
            </Pressable>
          )}
        </View>
      )}
    </Pressable>
  );
}

export default FlowCard;
