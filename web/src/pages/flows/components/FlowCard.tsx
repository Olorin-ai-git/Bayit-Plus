/**
 * FlowCard Component
 * Individual flow card display with selection, actions, and feature badges
 */

import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Clock, Sparkles, Play, List, Edit2 } from 'lucide-react';
import LinearGradient from 'react-native-web-linear-gradient';
import { colors, spacing, borderRadius } from '@bayit/shared/theme';
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

const DEFAULT_FLOW_CONFIG = { colors: ['#00d9ff', '#0099cc'], bgColor: 'rgba(0, 217, 255, 0.15)' };

interface FlowCardProps {
  flow: Flow;
  isSelected: boolean;
  isTablet?: boolean;
  isRTL?: boolean;
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
      style={[styles.flowIcon, { width: size, height: size, borderRadius: size / 4 }]}
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

  return (
    <Pressable
      onPress={onSelect}
      style={[
        styles.flowCard,
        isTablet && styles.flowCardTablet,
        { backgroundColor: config.bgColor },
        isSelected && styles.flowCardSelected,
      ]}
    >
      <View style={[styles.cardHeader, isRTL && styles.cardHeaderRTL]}>
        <FlowIcon flow={flow} size={56} />
        {flow.flow_type === 'system' && (
          <GlassView style={styles.systemBadge} intensity="low">
            <Text style={styles.systemBadgeText}>{t('flows.system')}</Text>
          </GlassView>
        )}
      </View>

      <Text style={[styles.flowName, isRTL && styles.textRTL]}>
        {localizedName}
      </Text>

      {localizedDescription && (
        <Text style={[styles.flowDesc, isRTL && styles.textRTL]} numberOfLines={2}>
          {localizedDescription}
        </Text>
      )}

      <View style={[styles.flowMeta, isRTL && styles.flowMetaRTL]}>
        <Clock size={14} color={colors.textMuted} />
        <Text style={styles.flowMetaText}>{triggerDisplay}</Text>
      </View>

      <View style={[styles.flowFeatures, isRTL && styles.flowFeaturesRTL]}>
        {flow.ai_enabled && (
          <View style={styles.featureTag}>
            <Sparkles size={12} color={colors.warning} />
            <Text style={styles.featureTagText}>AI</Text>
          </View>
        )}
        {flow.ai_brief_enabled && (
          <View style={styles.featureTag}>
            <Sparkles size={12} color={colors.info} />
            <Text style={styles.featureTagText}>{t('flows.aiBrief')}</Text>
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
        <View style={[styles.flowActions, isRTL && styles.flowActionsRTL]}>
          <GlassButton
            title={t('flows.start')}
            onPress={onStart}
            variant="primary"
            size="sm"
            style={styles.flowActionBtn}
          />
          {flow.flow_type === 'custom' && onEdit && (
            <Pressable onPress={onEdit} style={styles.flowEditBtn}>
              <Edit2 size={16} color={colors.text} />
            </Pressable>
          )}
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flowCard: {
    width: IS_TV_BUILD ? 'calc(50% - 24px)' as any : 'calc(50% - 12px)' as any,
    minWidth: IS_TV_BUILD ? 420 : 300,
    padding: IS_TV_BUILD ? spacing.xl + 8 : spacing.xl,
    borderRadius: borderRadius.xl,
    borderWidth: IS_TV_BUILD ? 2 : 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    // @ts-ignore
    transition: 'all 0.2s ease',
  },
  flowCardTablet: {
    width: '100%',
    minWidth: 'auto' as any,
  },
  flowCardSelected: {
    borderColor: colors.primary,
    // @ts-ignore
    transform: 'scale(1.02)',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  cardHeaderRTL: {
    flexDirection: 'row-reverse',
  },
  flowIcon: {
    justifyContent: 'center',
    alignItems: 'center',
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
  flowName: {
    fontSize: IS_TV_BUILD ? 28 : 22,
    fontWeight: '700',
    color: colors.text,
    marginBottom: IS_TV_BUILD ? spacing.md : spacing.sm,
    width: '100%',
  },
  flowDesc: {
    fontSize: IS_TV_BUILD ? 18 : 14,
    color: colors.textMuted,
    lineHeight: IS_TV_BUILD ? 28 : 22,
    marginBottom: spacing.md,
    width: '100%',
  },
  flowMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.sm,
    width: '100%',
  },
  flowMetaRTL: {
    flexDirection: 'row-reverse',
  },
  flowMetaText: {
    fontSize: 13,
    color: colors.textMuted,
    flex: 1,
  },
  flowFeatures: {
    flexDirection: 'row',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  flowFeaturesRTL: {
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
  flowActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  flowActionsRTL: {
    flexDirection: 'row-reverse',
  },
  flowActionBtn: {
    flex: 1,
  },
  flowEditBtn: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.md,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  textRTL: {
    textAlign: 'right',
  },
});

export default FlowCard;
