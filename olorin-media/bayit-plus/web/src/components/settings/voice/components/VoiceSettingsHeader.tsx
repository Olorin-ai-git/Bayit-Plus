/**
 * Voice Settings Header Component
 * Header section for voice settings page
 */

import { View, Text, StyleSheet } from 'react-native';
import { Mic } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface VoiceSettingsHeaderProps {
  isRTL: boolean;
}

export function VoiceSettingsHeader({ isRTL }: VoiceSettingsHeaderProps) {
  const { t } = useTranslation();

  return (
    <View style={[styles.container, isRTL && styles.containerRTL]}>
      <View style={styles.iconContainer}>
        <Mic size={24} color="#06B6D4" />
      </View>
      <View style={styles.textContainer}>
        <Text style={[styles.title, isRTL && styles.textRight]}>
          {t('profile.voice.title', 'Voice & Accessibility')}
        </Text>
        <Text style={[styles.description, isRTL && styles.textRight]}>
          {t('profile.voice.description', 'Configure voice and accessibility features')}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 8,
  },
  containerRTL: {
    flexDirection: 'row-reverse',
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: 'rgba(6, 182, 212, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  description: {
    fontSize: 14,
    color: '#9CA3AF',
    marginTop: 2,
  },
  textRight: {
    textAlign: 'right',
  },
});
