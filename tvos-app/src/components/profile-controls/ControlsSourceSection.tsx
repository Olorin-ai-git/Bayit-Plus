/**
 * Controls Source Section - tvOS
 *
 * Radio buttons for selecting between household inheritance and custom controls.
 * Optimized for 10-foot UI with large touch targets and focus animations.
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';

interface ControlsSourceSectionProps {
  isInheriting: boolean;
  isLoading: boolean;
  onToggle: () => void;
}

export function ControlsSourceSection({
  isInheriting,
  isLoading,
  onToggle,
}: ControlsSourceSectionProps) {
  const { t } = useTranslation();

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>
        {t('profileControls.sourceSection.title', 'Controls Source')}
      </Text>

      {/* Household Inheritance Option */}
      <TouchableOpacity
        style={[styles.radioOption, isInheriting && styles.radioOptionSelected]}
        onPress={onToggle}
        disabled={isLoading}
        tvParallaxProperties={{ enabled: true, magnification: 1.05, pressMagnification: 0.98 }}
        accessibilityRole="radio"
        accessibilityLabel={t('profileControls.sourceSection.inheritHousehold', 'Inherit from Household')}
        accessibilityState={{ checked: isInheriting }}
      >
        <View style={styles.radioCircle}>
          {isInheriting && <View style={styles.radioCircleSelected} />}
        </View>
        <View style={styles.radioContent}>
          <View style={styles.radioHeader}>
            <Ionicons name="home" size={32} color="#a855f7" />
            <Text style={styles.radioTitle}>
              {t('profileControls.sourceSection.inheritHousehold', 'Inherit from Household')}
            </Text>
          </View>
          <Text style={styles.radioDescription}>
            {t('profileControls.sourceSection.inheritHouseholdDesc', 'Use household-wide family controls')}
          </Text>
        </View>
      </TouchableOpacity>

      {/* Custom Controls Option */}
      <TouchableOpacity
        style={[styles.radioOption, !isInheriting && styles.radioOptionSelected]}
        onPress={onToggle}
        disabled={isLoading}
        tvParallaxProperties={{ enabled: true, magnification: 1.05, pressMagnification: 0.98 }}
        accessibilityRole="radio"
        accessibilityLabel={t('profileControls.sourceSection.customControls', 'Custom Controls')}
        accessibilityState={{ checked: !isInheriting }}
      >
        <View style={styles.radioCircle}>
          {!isInheriting && <View style={styles.radioCircleSelected} />}
        </View>
        <View style={styles.radioContent}>
          <View style={styles.radioHeader}>
            <Ionicons name="shield" size={32} color="#60a5fa" />
            <Text style={styles.radioTitle}>
              {t('profileControls.sourceSection.customControls', 'Custom Controls')}
            </Text>
          </View>
          <Text style={styles.radioDescription}>
            {t('profileControls.sourceSection.customControlsDesc', 'Use profile-specific family controls')}
          </Text>
        </View>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 24,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    padding: 32,
    marginBottom: 32,
  },
  sectionTitle: { fontSize: 32, fontWeight: '700', color: '#ffffff', marginBottom: 24 },
  radioOption: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 20,
    padding: 32,
    marginBottom: 20,
    minHeight: 60,
  },
  radioOptionSelected: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  radioCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 3,
    borderColor: '#ffffff',
    marginRight: 24,
    marginTop: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioCircleSelected: { width: 16, height: 16, borderRadius: 8, backgroundColor: '#ffffff' },
  radioContent: { flex: 1 },
  radioHeader: { flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 8 },
  radioTitle: { fontSize: 28, fontWeight: '600', color: '#ffffff' },
  radioDescription: { fontSize: 22, color: '#d1d5db' },
});
