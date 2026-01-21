/**
 * ActiveFlowBanner Component
 * Displays the currently active flow with start and skip actions
 */

import React from 'react';
import { View, Text, Pressable } from 'react-native';
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

const DEFAULT_ICON = { icon: <Play size={36} color="#fff" />, colors: ['#a855f7', '#0099cc'] };

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
      className="justify-center items-center"
      style={{ width: size, height: size, borderRadius: size / 4 }}
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
    <GlassCard className="p-4 mb-6 border border-green-500">
      <View className="flex-row items-center gap-1 mb-3">
        <View className="w-2.5 h-2.5 rounded-full bg-green-500" />
        <Text className="text-xs text-green-500 font-bold uppercase tracking-wider">
          {t('flows.activeNow')}
        </Text>
      </View>

      <View className={`flex-row items-center gap-4 mb-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
        <FlowIcon flow={flow} size={72} />
        <View className="flex-1">
          <Text className={`text-2xl font-bold text-white mb-1 ${isRTL ? 'text-right' : ''}`}>
            {localizedName}
          </Text>
          {localizedDescription && (
            <Text className={`text-base text-gray-400 leading-snug ${isRTL ? 'text-right' : ''}`}>
              {localizedDescription}
            </Text>
          )}
        </View>
      </View>

      <View className={`flex-row items-center gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
        <GlassButton
          title={t('flows.start')}
          onPress={onStart}
          variant="primary"
          icon={<Play size={18} color="#000" />}
        />
        <Pressable onPress={onSkip} className="py-2 px-3">
          <Text className="text-sm text-gray-400">{t('flows.skipToday')}</Text>
        </Pressable>
      </View>
    </GlassCard>
  );
}

export default ActiveFlowBanner;
