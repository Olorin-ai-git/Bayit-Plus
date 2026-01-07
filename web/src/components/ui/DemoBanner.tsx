import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { isDemo } from '@/config/appConfig';
import { colors } from '@bayit/shared/theme';

/**
 * DemoBanner Component
 * Displays a banner indicating the app is running in demo mode.
 * Only renders when isDemo is true.
 */
export const DemoBanner: React.FC = () => {
  if (!isDemo) {
    return null;
  }

  return (
    <View style={styles.container}>
      <Text style={styles.icon}>🎭</Text>
      <Text style={styles.text}>DEMO MODE</Text>
      <Text style={styles.subtext}>Using mock data - No API calls</Text>
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
    fontSize: 11,
    fontWeight: 'bold',
    color: '#000000',
    letterSpacing: 1,
  },
  subtext: {
    fontSize: 11,
    color: '#333333',
  },
});

export default DemoBanner;
