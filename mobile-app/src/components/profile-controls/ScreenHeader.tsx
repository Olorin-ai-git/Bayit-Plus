/**
 * Screen Header - Mobile
 *
 * Common header with back button and title.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../theme/colors';
import { GlassButton } from '@bayit/shared/ui';

interface ScreenHeaderProps {
  title: string;
  onBack: () => void;
}

export function ScreenHeader({ title, onBack }: ScreenHeaderProps) {
  const { t } = useTranslation();

  return (
    <View style={styles.header}>
      <GlassButton
        onPress={onBack}
        style={styles.backButton}
        variant="ghost"
        accessibilityRole="button"
        accessibilityLabel={t('common.back', 'Back')}
        accessibilityHint={t('accessibility.navigateBack', 'Navigate back to profiles list')}
      >
        <Ionicons name="arrow-back" size={24} color={Colors.white} />
      </GlassButton>
      <Text style={styles.headerTitle}>{title}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    paddingTop: 60,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  backButton: {
    padding: 12,
    marginRight: 12,
    minWidth: 44,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: Colors.white,
    flex: 1,
  },
});
