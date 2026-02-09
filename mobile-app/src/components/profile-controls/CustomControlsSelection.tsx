/**
 * Custom Controls Selection - Mobile
 *
 * Allows selection of specific family controls when not inheriting from household.
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Colors } from '../../theme/colors';

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
          <TouchableOpacity
            key={control.id}
            style={[
              styles.controlOption,
              selectedControlsId === control.id && styles.controlOptionSelected,
            ]}
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
                  {t('profileControls.selectControls.kidsAge', 'Kids: {{age}}', {
                    age: control.kids_age_limit,
                  })}
                </Text>
                <Text style={styles.controlDetailText}>
                  {t('profileControls.selectControls.youngstersAge', 'Youngsters: {{age}}', {
                    age: control.youngsters_age_limit,
                  })}
                </Text>
                <Text style={styles.controlDetailText}>
                  {t('profileControls.selectControls.rating', 'Rating: {{rating}}', {
                    rating: control.max_content_rating,
                  })}
                </Text>
              </View>
            </View>
          </TouchableOpacity>
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
  controlOption: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  controlOptionSelected: {
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
  controlContent: {
    flex: 1,
  },
  controlTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.white,
    marginBottom: 8,
  },
  controlDetails: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  controlDetailText: {
    fontSize: 14,
    color: Colors.Dark.d300,
  },
  noControlsText: {
    color: Colors.Dark.d300,
    textAlign: 'center',
    fontSize: 14,
  },
});
