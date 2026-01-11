/**
 * Settings Screen
 * Mobile-specific settings (permissions, voice preferences, etc.)
 */

import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useTranslation } from 'react-i18next';

const SettingsScreen: React.FC = () => {
  const { t } = useTranslation();

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>{t('settings.title') || 'Settings'}</Text>
        <Text style={styles.subtitle}>
          Voice settings, permissions, and app preferences
        </Text>

        {/* TODO: Add settings sections:
          - Voice settings (always-on, wake word, TTS voice)
          - Language settings
          - Permissions (microphone, notifications)
          - Account settings
          - About
        */}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0d0d1a',
  },
  content: {
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#888888',
    marginBottom: 24,
  },
});

export default SettingsScreen;
