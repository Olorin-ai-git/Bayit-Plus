import { useState } from 'react';
import { View, Text, Pressable, Platform } from 'react-native';
import { getLanguageInfo } from '../types/subtitle';
import { colors, spacing, borderRadius } from '../theme';
import { GlassCard } from './ui';

interface SubtitleFlagsProps {
  languages: string[];
  maxDisplay?: number;
  size?: 'small' | 'medium';
  showTooltip?: boolean;
  position?: 'bottom-left' | 'bottom-right';
  isRTL?: boolean;
}

export function SubtitleFlags({
  languages,
  maxDisplay = 5,
  size = 'small',
  showTooltip = true,
  position = 'bottom-right',
  isRTL = false,
}: SubtitleFlagsProps) {
  const [tooltipVisible, setTooltipVisible] = useState(false);

  // Filter out null/undefined and get language info
  const languageData = languages
    .map(code => getLanguageInfo(code))
    .filter(Boolean) as NonNullable<ReturnType<typeof getLanguageInfo>>[];

  const displayLanguages = languageData.slice(0, maxDisplay);
  const remainingCount = Math.max(0, languageData.length - maxDisplay);

  // Don't render if no languages
  if (languageData.length === 0) return null;

  const flagSize = size === 'medium' ? 16 : 14;
  const fontSize = size === 'medium' ? 16 : 14;

  const positionClass = position === 'bottom-left'
    ? (isRTL ? 'right-2' : 'left-2')
    : (isRTL ? 'left-2' : 'right-2');

  return (
    <Pressable
      onHoverIn={() => setTooltipVisible(true)}
      onHoverOut={() => setTooltipVisible(false)}
      onPress={() => setTooltipVisible(!tooltipVisible)}
      className={`absolute bottom-2 ${positionClass} z-[5]`}
    >
      {/* Flags Row */}
      <View
        className="rounded px-1.5 py-0.5 bg-black/70"
        style={Platform.OS === 'web' ? { backdropFilter: 'blur(8px)' } as any : {}}
      >
        <View className="flex-row items-center gap-1">
          {displayLanguages.map((lang, i) => (
            <Text
              key={lang.code}
              className="text-white"
              style={{ fontSize: flagSize, lineHeight: flagSize * 1.2 }}
            >
              {lang.flag}
            </Text>
          ))}
          {remainingCount > 0 && (
            <Text className="text-white/40 font-semibold ml-0.5" style={{ fontSize: fontSize - 2 }}>
              +{remainingCount}
            </Text>
          )}
        </View>
      </View>

      {/* Tooltip */}
      {showTooltip && tooltipVisible && (
        <View className="absolute bottom-full left-0 mb-1" pointerEvents="none">
          <GlassCard className="px-2 py-1 min-w-[100px] max-w-[200px]">
            <Text className="text-xs text-white text-left">
              {languageData.map(lang => lang.nativeName).join(', ')}
            </Text>
          </GlassCard>
        </View>
      )}
    </Pressable>
  );
}
