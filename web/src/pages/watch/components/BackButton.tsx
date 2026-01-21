/**
 * Back Button Component
 * Navigation button to go back to previous page
 */

import { View, Text, Pressable, StyleSheet } from 'react-native';
import { ArrowRight } from 'lucide-react';
import { colors, spacing, borderRadius } from '@bayit/shared/theme';

interface BackButtonProps {
  label: string;
  onPress: () => void;
}

export function BackButton({ label, onPress }: BackButtonProps) {
  return (
    <View style={styles.container}>
      <Pressable onPress={onPress} style={styles.button}>
        <ArrowRight size={20} color={colors.text} />
        <Text style={styles.text}>{label}</Text>
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
    backgroundColor: colors.glass,
    borderRadius: borderRadius.md,
    alignSelf: 'flex-start',
  },
  text: {
    fontSize: 14,
    color: colors.text,
  },
});
