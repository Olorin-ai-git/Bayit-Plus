/**
 * SearchInput Component
 *
 * Text input field with clear button for search queries
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { GlassButton } from '../../../../../shared/components/ui/GlassButton';
import { GlassInput } from '../../../../../shared/components/ui/GlassInput';
import { colors, borderRadius, spacing } from '../../theme/colors';

interface SearchInputProps {
  /** Current search query */
  value: string;
  /** Callback when value changes */
  onChangeText: (text: string) => void;
  /** Placeholder text */
  placeholder?: string;
}

/**
 * Text input with integrated clear button
 * Uses Glass components for consistent UI
 */
export function SearchInput({ value, onChangeText, placeholder }: SearchInputProps) {
  const { t } = useTranslation('search');
  const [isFocused, setIsFocused] = useState(false);

  return (
    <View style={[styles.container, isFocused && styles.containerFocused]}>
      <Text style={styles.icon}>🔍</Text>
      <GlassInput
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        placeholder={placeholder || t('controls.placeholder')}
        placeholderTextColor={colors.textMuted}
        accessibilityLabel={t('controls.placeholder')}
        accessibilityHint={t('controls.hints.searchInput')}
      />
      {value.length > 0 && (
        <GlassButton
          variant="ghost"
          onPress={() => onChangeText('')}
          style={styles.clearButton}
          accessibilityLabel={t('empty.clearSearch')}
        >
          <Text style={styles.clearIcon}>✕</Text>
        </GlassButton>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.inputBackground,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  containerFocused: {
    borderColor: colors.inputBorderFocus,
    backgroundColor: colors.inputBackgroundFocus,
  },
  icon: {
    fontSize: 18,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: colors.text,
  },
  clearButton: {
    padding: 4,
  },
  clearIcon: {
    fontSize: 16,
    color: colors.text,
  },
});
