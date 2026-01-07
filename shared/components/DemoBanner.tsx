import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useDirection } from '../hooks/useDirection';
import { isDemo } from '../config/appConfig';
import { colors, fontSize } from '../theme';

/**
 * DemoBanner Component
 * Displays a banner indicating the app is running in demo mode.
 * Only renders when isDemo is true (development mode).
 */
export const DemoBanner: React.FC = () => {
  const { t } = useTranslation();
  const { flexDirection, textAlign } = useDirection();

  if (!isDemo) {
    return null;
  }

  return (
    <View style={[styles.container, { flexDirection }]}>
      <Text style={styles.icon}>🎭</Text>
      <Text style={[styles.text, { textAlign }]}>{t('demo.banner')}</Text>
      <Text style={[styles.subtext, { textAlign }]}>{t('demo.bannerSubtext')}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 165, 0, 0.9)',
    paddingVertical: 6,
    paddingHorizontal: 16,
    gap: 8,
    zIndex: 1000,
  },
  icon: {
    fontSize: 14,
  },
  text: {
    fontSize: fontSize.xs,
    fontWeight: 'bold',
    color: '#000000',
    letterSpacing: 1,
  },
  subtext: {
    fontSize: fontSize.xs,
    color: '#333333',
  },
});

export default DemoBanner;
