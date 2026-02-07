/**
 * Custom Controls Selection - tvOS
 *
 * Allows selection of specific family controls when not inheriting from household.
 */

import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useTranslation } from 'react-i18next';

interface FamilyControl {
  id: string;
  kids_age_limit: number;
  youngsters_age_limit: number;
  max_content_rating: string;
}

interface CustomControlsSelectionProps {
  availableControls: FamilyControl[] | null;
  selectedControlsId: string | null;
  isLoading: boolean;
  onSelectControls: (controlsId: string) => void;
}

export function CustomControlsSelection({
  availableControls,
  selectedControlsId,
  isLoading,
  onSelectControls,
}: CustomControlsSelectionProps) {
  const { t } = useTranslation();

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>
        {t('profileControls.selectControls.title', 'Select Controls')}
      </Text>

      {availableControls && availableControls.length > 0 ? (
        availableControls.map((control) => (
          <Pressable
            key={control.id}
            style={[styles.controlOption, selectedControlsId === control.id && styles.controlOptionSelected]}
            onPress={() => onSelectControls(control.id)}
            disabled={isLoading}
          >
            <View style={styles.radioCircle}>
              {selectedControlsId === control.id && <View style={styles.radioCircleSelected} />}
            </View>
            <View style={styles.controlContent}>
              <Text style={styles.controlTitle}>
                {t('profileControls.selectControls.controlsLabel', 'Family Controls {{id}}', {
                  id: control.id.slice(0, 8),
                })}
              </Text>
              <View style={styles.controlDetails}>
                <Text style={styles.controlDetailText}>
                  {t('profileControls.selectControls.kidsAge', 'Kids: {{age}}', { age: control.kids_age_limit })}
                </Text>
                <Text style={styles.controlDetailText}>
                  {t('profileControls.selectControls.youngstersAge', 'Youngsters: {{age}}', { age: control.youngsters_age_limit })}
                </Text>
                <Text style={styles.controlDetailText}>
                  {t('profileControls.selectControls.rating', 'Rating: {{rating}}', { rating: control.max_content_rating })}
                </Text>
              </View>
            </View>
          </Pressable>
        ))
      ) : (
        <Text style={styles.noControlsText}>
          {t('profileControls.selectControls.noControls', 'No family controls available.')}
        </Text>
      )}
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
  controlOption: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 20,
    padding: 32,
    marginBottom: 20,
    minHeight: 60,
  },
  controlOptionSelected: {
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
  controlContent: { flex: 1 },
  controlTitle: { fontSize: 26, fontWeight: '600', color: '#ffffff', marginBottom: 12 },
  controlDetails: { flexDirection: 'row', flexWrap: 'wrap', gap: 24 },
  controlDetailText: { fontSize: 22, color: '#d1d5db' },
  noControlsText: { color: '#d1d5db', textAlign: 'center', fontSize: 24 },
});
