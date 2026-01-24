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
      style={[
        styles.card,
        isSelected && styles.selected
      ]}
    >
      <View style={[styles.content, isRTL && styles.rtlRow]}>
        <Text style={styles.icon}>{mode.icon}</Text>
        <View style={styles.textContainer}>
          <Text
            style={[styles.label, isSelected ? styles.selectedText : styles.defaultText]}
          >
            {t(mode.labelKey, mode.labelKey)}
          </Text>
          <Text
            style={[styles.description, isRTL && styles.textRight]}
          >
            {t(mode.descKey, mode.descKey)}
          </Text>
        </View>
        {isSelected && (
          <Check size={20} color="#A855F7" />
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 16,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  rtlRow: {
    flexDirection: 'row-reverse',
  },
  selected: {
    backgroundColor: 'rgba(88, 28, 135, 0.3)',
    borderColor: 'rgba(168, 85, 247, 0.4)',
  },
  icon: {
    fontSize: 28,
  },
  textContainer: {
    flex: 1,
  },
  label: {
    fontSize: 15,
    fontWeight: '600',
  },
  selectedText: {
    color: '#A855F7',
  },
  defaultText: {
    color: '#FFFFFF',
  },
  description: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 2,
  },
  textRight: {
    textAlign: 'right',
  },
});
