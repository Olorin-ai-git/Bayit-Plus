/**
 * SearchInput Component
 *
 * Text input field with clear button for search queries
 */

import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
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
 */
export function SearchInput({ value, onChangeText, placeholder }: SearchInputProps) {
  const { t } = useTranslation('search');
  const [isFocused, setIsFocused] = useState(false);

  return (
    <View style={[styles.container, isFocused && styles.containerFocused]}>
      <Text style={styles.icon}>🔍</Text>
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        placeholder={placeholder || t('controls.placeholder')}
        placeholderTextColor="rgba(255,255,255,0.5)"
        accessibilityLabel={t('controls.placeholder')}
        accessibilityHint={t('controls.hints.searchInput')}
      />
      {value.length > 0 && (
        <TouchableOpacity
          onPress={() => onChangeText('')}
          style={styles.clearButton}
          accessibilityLabel={t('empty.clearSearch')}
        >
          <Text style={styles.clearIcon}>✕</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  containerFocused: {
    borderColor: 'rgba(168,85,247,0.5)',
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  icon: {
    fontSize: 18,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#fff',
  },
  clearButton: {
    padding: 4,
  },
  clearIcon: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.7)',
  },
});
