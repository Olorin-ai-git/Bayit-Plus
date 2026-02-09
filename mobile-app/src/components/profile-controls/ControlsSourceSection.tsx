/**
 * Controls Source Section - Mobile
 *
 * Radio buttons for selecting between household inheritance and custom controls.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../theme/colors';
import { GlassButton } from '@bayit/shared/ui';

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
      <GlassButton
        style={[styles.radioOption, isInheriting && styles.radioOptionSelected]}
        onPress={onToggle}
        disabled={isLoading}
        variant={isInheriting ? 'primary' : 'secondary'}
        accessibilityRole="radio"
        accessibilityLabel={t('profileControls.sourceSection.inheritHousehold', 'Inherit from Household')}
        accessibilityHint={t('profileControls.sourceSection.inheritHouseholdDesc', 'Use household-wide family controls')}
        accessibilityState={{ checked: isInheriting }}
      >
        <View style={styles.radioCircle}>
          {isInheriting && <View style={styles.radioCircleSelected} />}
        </View>
        <View style={styles.radioContent}>
          <View style={styles.radioHeader}>
            <Ionicons name="home" size={20} color={Colors.Primary.p500} />
            <Text style={styles.radioTitle}>
              {t('profileControls.sourceSection.inheritHousehold', 'Inherit from Household')}
            </Text>
          </View>
          <Text style={styles.radioDescription}>
            {t('profileControls.sourceSection.inheritHouseholdDesc', 'Use household-wide family controls')}
          </Text>
        </View>
      </GlassButton>

      {/* Custom Controls Option */}
      <GlassButton
        style={[styles.radioOption, !isInheriting && styles.radioOptionSelected]}
        onPress={onToggle}
        disabled={isLoading}
        variant={!isInheriting ? 'primary' : 'secondary'}
        accessibilityRole="radio"
        accessibilityLabel={t('profileControls.sourceSection.customControls', 'Custom Controls')}
        accessibilityHint={t('profileControls.sourceSection.customControlsDesc', 'Use profile-specific family controls')}
        accessibilityState={{ checked: !isInheriting }}
      >
        <View style={styles.radioCircle}>
          {!isInheriting && <View style={styles.radioCircleSelected} />}
        </View>
        <View style={styles.radioContent}>
          <View style={styles.radioHeader}>
            <Ionicons name="shield" size={20} color={Colors.Info.i400} />
            <Text style={styles.radioTitle}>
              {t('profileControls.sourceSection.customControls', 'Custom Controls')}
            </Text>
          </View>
          <Text style={styles.radioDescription}>
            {t('profileControls.sourceSection.customControlsDesc', 'Use profile-specific family controls')}
          </Text>
        </View>
      </GlassButton>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    padding: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.white,
    marginBottom: 16,
  },
  radioOption: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  radioOptionSelected: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: Colors.white,
    marginRight: 12,
    marginTop: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioCircleSelected: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.white,
  },
  radioContent: {
    flex: 1,
  },
  radioHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  radioTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.white,
  },
  radioDescription: {
    fontSize: 14,
    color: Colors.Dark.d300,
  },
});
