/**
 * Voice Mode Card Component
 * Displays voice operation mode selection cards
 */

import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Check } from 'lucide-react';
import { colors, spacing, borderRadius } from '@bayit/shared/theme';
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
      style={({ hovered }: any) => [
        styles.modeCard,
        isRTL && styles.modeCardRTL,
        isSelected && styles.modeCardSelected,
        hovered && styles.modeCardHovered,
      ]}
    >
      <View style={styles.modeCardContent}>
        <Text style={styles.modeIcon}>{mode.icon}</Text>
        <View style={styles.modeCardText}>
          <Text style={[styles.modeName, isSelected && styles.modeNameSelected]}>
            {t(mode.labelKey, mode.labelKey)}
          </Text>
          <Text style={[styles.modeDesc, isRTL && styles.textRTL]}>
            {t(mode.descKey, mode.descKey)}
          </Text>
        </View>
        {isSelected && (
          <Check size={20} color={colors.primary} style={styles.checkIcon} />
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  modeCard: {
    padding: spacing.md,
    borderRadius: borderRadius.md,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  modeCardRTL: {
    flexDirection: 'row-reverse',
  },
  modeCardSelected: {
    backgroundColor: 'rgba(107, 33, 168, 0.3)',
    borderColor: 'rgba(168, 85, 247, 0.4)',
  },
  modeCardHovered: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  modeCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  modeIcon: {
    fontSize: 28,
  },
  modeCardText: {
    flex: 1,
  },
  modeName: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
  },
  modeNameSelected: {
    color: colors.primary,
  },
  modeDesc: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
  textRTL: {
    textAlign: 'right',
  },
  checkIcon: {
    marginLeft: spacing.sm,
  },
});
