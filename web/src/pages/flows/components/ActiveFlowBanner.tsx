/**
 * ActiveFlowBanner Component
 * Displays the currently active flow with start and skip actions
 */

import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Play, Sun, Moon, Baby, Flame } from 'lucide-react';
import LinearGradient from 'react-native-web-linear-gradient';
import { colors, spacing, borderRadius } from '@bayit/shared/theme';
import { GlassCard, GlassButton } from '@bayit/shared/ui';
import type { Flow } from '../types/flows.types';
import { getLocalizedName, getLocalizedDescription } from '../utils/flowHelpers';

// Flow icon configurations by name
const FLOW_ICONS: Record<string, { icon: React.ReactNode; colors: string[] }> = {
  'טקס בוקר': { icon: <Sun size={36} color="#fff" />, colors: ['#ff9500', '#ff6b00'] },
  'Morning Ritual': { icon: <Sun size={36} color="#fff" />, colors: ['#ff9500', '#ff6b00'] },
  'Ritual Matutino': { icon: <Sun size={36} color="#fff" />, colors: ['#ff9500', '#ff6b00'] },
  'ליל שבת': { icon: <Flame size={36} color="#fff" />, colors: ['#5856d6', '#8b5cf6'] },
  'Shabbat Evening': { icon: <Flame size={36} color="#fff" />, colors: ['#5856d6', '#8b5cf6'] },
  'Noche de Shabat': { icon: <Flame size={36} color="#fff" />, colors: ['#5856d6', '#8b5cf6'] },
  'שעת שינה': { icon: <Moon size={36} color="#fff" />, colors: ['#1a1a2e', '#4a4a8a'] },
  'Sleep Time': { icon: <Moon size={36} color="#fff" />, colors: ['#1a1a2e', '#4a4a8a'] },
  'Hora de Dormir': { icon: <Moon size={36} color="#fff" />, colors: ['#1a1a2e', '#4a4a8a'] },
  'זמן ילדים': { icon: <Baby size={36} color="#fff" />, colors: ['#ff2d55', '#ff6b9d'] },
  'Kids Time': { icon: <Baby size={36} color="#fff" />, colors: ['#ff2d55', '#ff6b9d'] },
  'Hora de los Niños': { icon: <Baby size={36} color="#fff" />, colors: ['#ff2d55', '#ff6b9d'] },
};

const DEFAULT_ICON = { icon: <Play size={36} color="#fff" />, colors: ['#00d9ff', '#0099cc'] };

interface ActiveFlowBannerProps {
  flow: Flow;
  isRTL?: boolean;
  onStart: () => void;
  onSkip: () => void;
}

function FlowIcon({ flow, size = 72 }: { flow: Flow; size?: number }) {
  const config = FLOW_ICONS[flow.name] || FLOW_ICONS[flow.name_en || ''] || DEFAULT_ICON;

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

export function ActiveFlowBanner({
  flow,
  isRTL = false,
  onStart,
  onSkip,
}: ActiveFlowBannerProps) {
  const { t, i18n } = useTranslation();

  const localizedName = getLocalizedName(flow, i18n.language);
  const localizedDescription = getLocalizedDescription(flow, i18n.language);

  return (
    <GlassCard style={styles.banner}>
      <View style={styles.dotContainer}>
        <View style={styles.dot} />
        <Text style={styles.label}>{t('flows.activeNow')}</Text>
      </View>

      <View style={[styles.content, isRTL && styles.contentRTL]}>
        <FlowIcon flow={flow} size={72} />
        <View style={styles.info}>
          <Text style={[styles.name, isRTL && styles.textRTL]}>
            {localizedName}
          </Text>
          {localizedDescription && (
            <Text style={[styles.description, isRTL && styles.textRTL]}>
              {localizedDescription}
            </Text>
          )}
        </View>
      </View>

      <View style={[styles.actions, isRTL && styles.actionsRTL]}>
        <GlassButton
          title={t('flows.start')}
          onPress={onStart}
          variant="primary"
          icon={<Play size={18} color="#000" />}
        />
        <Pressable onPress={onSkip} style={styles.skipLink}>
          <Text style={styles.skipLinkText}>{t('flows.skipToday')}</Text>
        </Pressable>
      </View>
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  banner: {
    padding: spacing.lg,
    marginBottom: spacing.xl,
    borderWidth: 1,
    borderColor: colors.success,
  },
  dotContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.success,
  },
  label: {
    fontSize: 12,
    color: colors.success,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    marginBottom: spacing.lg,
  },
  contentRTL: {
    flexDirection: 'row-reverse',
  },
  flowIcon: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  info: {
    flex: 1,
  },
  name: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  description: {
    fontSize: 15,
    color: colors.textMuted,
    lineHeight: 22,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  actionsRTL: {
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
  textRTL: {
    textAlign: 'right',
  },
});

export default ActiveFlowBanner;
