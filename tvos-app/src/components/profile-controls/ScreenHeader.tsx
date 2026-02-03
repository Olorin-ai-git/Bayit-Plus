/**
 * Screen Header - tvOS
 *
 * Header with back button and title, optimized for 10-foot UI.
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';

interface ScreenHeaderProps {
  title: string;
  onBack: () => void;
}

export function ScreenHeader({ title, onBack }: ScreenHeaderProps) {
  const { t } = useTranslation();

  return (
    <View style={styles.header}>
      <TouchableOpacity
        onPress={onBack}
        style={styles.backButton}
        hasTVPreferredFocus
        tvParallaxProperties={{ enabled: true, magnification: 1.1, pressMagnification: 1.0 }}
        accessibilityRole="button"
        accessibilityLabel={t('common.back', 'Back')}
        accessibilityHint={t('accessibility.navigateBack', 'Navigate back to profiles list')}
      >
        <Ionicons name="arrow-back" size={32} color="#ffffff" />
        <Text style={styles.backButtonText}>{t('common.back', 'Back')}</Text>
      </TouchableOpacity>
      <Text style={styles.headerTitle}>{title}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 48,
    paddingTop: 80,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderBottomWidth: 2,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    padding: 16,
    marginRight: 32,
    minHeight: 60,
    minWidth: 120,
  },
  backButtonText: { fontSize: 28, color: '#ffffff', fontWeight: '600' },
  headerTitle: { fontSize: 40, fontWeight: '700', color: '#ffffff', flex: 1 },
});
