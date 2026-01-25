/**
 * Back Button Component
 * Navigation button to go back to previous page
 */

import { View, Text, Pressable, StyleSheet } from 'react-native';
import { ArrowRight } from 'lucide-react';
import { colors, spacing, fontSize, borderRadius } from '@olorin/design-tokens';

interface BackButtonProps {
  label: string;
  onPress: () => void;
}

export function BackButton({ label, onPress }: BackButtonProps) {
  return (
    <View style={styles.container}>
      <Pressable onPress={onPress} style={styles.button}>
        <ArrowRight size={20} color={colors.text} />
        <Text style={styles.label}>{label}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    maxWidth: 1400,
    marginHorizontal: 'auto',
    width: '100%',
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    padding: spacing.sm,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: borderRadius.lg,
    alignSelf: 'flex-start',
  },
  label: {
    fontSize: fontSize.sm,
    color: colors.text,
  },
});
