/**
 * Voice Mode Card Component
 * Displays voice operation mode selection cards
 */

import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Check } from 'lucide-react';
import { VoiceModeOption } from '../types';

interface VoiceModeCardProps {
  mode: VoiceModeOption;
  isSelected: boolean;
  isRTL: boolean;
  onSelect: () => void;
  t: (key: string, fallback?: string) => string;
}

export function VoiceModeCard({ mode, isSelected, isRTL, onSelect, t }: VoiceModeCardProps) {
  return (
    <Pressable
      onPress={onSelect}
      className="p-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/8"
      style={[
        isRTL && styles.rtlRow,
        isSelected && styles.selected
      ]}
    >
      <View className="flex-row items-center gap-4">
        <Text className="text-[28px]">{mode.icon}</Text>
        <View className="flex-1">
          <Text
            className="text-[15px] font-semibold"
            style={isSelected ? styles.selectedText : styles.defaultText}
          >
            {t(mode.labelKey, mode.labelKey)}
          </Text>
          <Text
            className="text-xs text-gray-400 mt-0.5"
            style={isRTL && styles.textRight}
          >
            {t(mode.descKey, mode.descKey)}
          </Text>
        </View>
        {isSelected && (
          <Check size={20} color="#A855F7" className="ml-2" />
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  // Dynamic RTL layout
  rtlRow: {
    flexDirection: 'row-reverse',
  },
  // Dynamic selected state
  selected: {
    backgroundColor: 'rgba(88, 28, 135, 0.3)', // purple-900/30
    borderColor: 'rgba(168, 85, 247, 0.4)', // purple-500/40
  },
  // Dynamic text colors
  selectedText: {
    color: '#A855F7', // purple-500
  },
  defaultText: {
    color: '#FFFFFF',
  },
  // Dynamic text alignment
  textRight: {
    textAlign: 'right',
  },
});
