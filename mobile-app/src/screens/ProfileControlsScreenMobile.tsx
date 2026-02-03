/**
 * Profile Controls Screen - Mobile (iOS/Android)
 *
 * React Native implementation for managing profile-aware family controls.
 * Uses StyleSheet for proper rendering on React Native Web.
 */

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { useProfileControlsStore } from '../../../shared/stores/profileControlsStore';
import { setApiClient as setProfileControlsApiClient } from '../../../shared/services/profileControlsApi';
import { useFamilyControlsStore } from '../../../shared/stores/familyControlsStore';
import { GlassAlert } from '../../../shared/components/ui/GlassAlert';
import httpClient from '../services/httpClient';

// Initialize API client with compatible HTTP client
setProfileControlsApiClient(httpClient);

export default function ProfileControlsScreenMobile() {
  const { t } = useTranslation();
  const route = useRoute();
  const navigation = useNavigation();
  const profileId = route.params?.profileId;

  const {
    effectiveControls,
    controlsSource,
    isLoading: profileControlsLoading,
    error: profileControlsError,
    loadEffectiveControls,
    setCustomControls,
    inheritHouseholdControls,
    getControlsSource,
    clearError: clearProfileControlsError,
  } = useProfileControlsStore();

  const {
    controls: availableControls,
    loading: familyControlsLoading,
    error: familyControlsError,
    loadControls,
    clearError: clearFamilyControlsError,
  } = useFamilyControlsStore();

  const [selectedControlsId, setSelectedControlsId] = useState<string | null>(null);
  const [isInheriting, setIsInheriting] = useState(true);

  useEffect(() => {
    if (!profileId) {
      navigation.goBack();
      return;
    }

    loadEffectiveControls(profileId);
    getControlsSource(profileId);
    loadControls();
  }, [profileId]);

  useEffect(() => {
    if (controlsSource) {
      setIsInheriting(controlsSource.inherit_household_controls);
      if (controlsSource.controls_id) {
        setSelectedControlsId(controlsSource.controls_id);
      }
    }
  }, [controlsSource]);

  const handleToggleInheritance = async () => {
    if (!profileId) return;

    try {
      if (isInheriting) {
        // Switch to custom controls
        if (selectedControlsId) {
          await setCustomControls(profileId, selectedControlsId);
        } else if (availableControls && availableControls.length > 0) {
          await setCustomControls(profileId, availableControls[0].id);
        } else {
          GlassAlert.error(
            t('common.error', 'Error'),
            t('profileControls.errors.noControlsAvailable', 'No family controls available.')
          );
          return;
        }
      } else {
        await inheritHouseholdControls(profileId);
      }

      await getControlsSource(profileId);
    } catch (error: any) {
      GlassAlert.error(t('common.error', 'Error'), error.message);
    }
  };

  const handleSelectCustomControls = async (controlsId: string) => {
    if (!profileId) return;

    setSelectedControlsId(controlsId);

    if (!isInheriting) {
      try {
        await setCustomControls(profileId, controlsId);
        await getControlsSource(profileId);
      } catch (error: any) {
        GlassAlert.error(t('common.error', 'Error'), error.message);
      }
    }
  };

  const isLoading = profileControlsLoading || familyControlsLoading;
  const error = profileControlsError || familyControlsError;

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
          accessibilityRole="button"
          accessibilityLabel={t('common.back', 'Back')}
          accessibilityHint={t('accessibility.navigateBack', 'Navigate back to profiles list')}
        >
          <Ionicons name="arrow-back" size={24} color="#ffffff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {t('profileControls.title', 'Profile Family Controls')}
        </Text>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {/* Error Display */}
        {error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity
              onPress={() => {
                clearProfileControlsError();
                clearFamilyControlsError();
              }}
              accessibilityRole="button"
              accessibilityLabel={t('common.dismiss', 'Dismiss')}
              accessibilityHint={t('accessibility.dismissError', 'Dismiss error message')}
            >
              <Text style={styles.dismissButton}>
                {t('common.dismiss', 'Dismiss')}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Controls Source Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {t('profileControls.sourceSection.title', 'Controls Source')}
          </Text>

          {/* Household Inheritance Option */}
          <TouchableOpacity
            style={[styles.radioOption, isInheriting && styles.radioOptionSelected]}
            onPress={handleToggleInheritance}
            disabled={isLoading}
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
                <Ionicons name="home" size={20} color="#a855f7" />
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
            onPress={handleToggleInheritance}
            disabled={isLoading}
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
                <Ionicons name="shield" size={20} color="#60a5fa" />
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

        {/* Custom Controls Selection */}
        {!isInheriting && (
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
                  onPress={() => handleSelectCustomControls(control.id)}
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
        )}

        {/* Effective Controls Display */}
        {effectiveControls && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              {t('profileControls.effectiveControls.title', 'Active Controls')}
            </Text>

            <View style={styles.controlsGrid}>
              <View style={styles.controlCard}>
                <Text style={styles.controlCardLabel}>
                  {t('profileControls.effectiveControls.kidsEnabled', 'Kids Content')}
                </Text>
                <Text style={styles.controlCardValue}>
                  {effectiveControls.kids_enabled
                    ? t('profileControls.effectiveControls.enabled', 'Enabled')
                    : t('profileControls.effectiveControls.disabled', 'Disabled')}
                </Text>
                {effectiveControls.kids_enabled && (
                  <Text style={styles.controlCardDetail}>
                    {t('profileControls.effectiveControls.ageLimit', 'Age limit: {{age}}', {
                      age: effectiveControls.kids_age_limit,
                    })}
                  </Text>
                )}
              </View>

              <View style={styles.controlCard}>
                <Text style={styles.controlCardLabel}>
                  {t('profileControls.effectiveControls.youngstersEnabled', 'Youngsters Content')}
                </Text>
                <Text style={styles.controlCardValue}>
                  {effectiveControls.youngsters_enabled
                    ? t('profileControls.effectiveControls.enabled', 'Enabled')
                    : t('profileControls.effectiveControls.disabled', 'Disabled')}
                </Text>
                {effectiveControls.youngsters_enabled && (
                  <Text style={styles.controlCardDetail}>
                    {t('profileControls.effectiveControls.ageLimit', 'Age limit: {{age}}', {
                      age: effectiveControls.youngsters_age_limit,
                    })}
                  </Text>
                )}
              </View>

              <View style={styles.controlCard}>
                <Text style={styles.controlCardLabel}>
                  {t('profileControls.effectiveControls.contentRating', 'Content Rating Limit')}
                </Text>
                <Text style={styles.controlCardValue}>{effectiveControls.max_content_rating}</Text>
              </View>

              <View style={styles.controlCard}>
                <Text style={styles.controlCardLabel}>
                  {t('profileControls.effectiveControls.viewingHours', 'Viewing Hours')}
                </Text>
                <Text style={styles.controlCardValue}>
                  {effectiveControls.viewing_hours_enabled
                    ? `${effectiveControls.viewing_start_hour}:00 - ${effectiveControls.viewing_end_hour}:00`
                    : t('profileControls.effectiveControls.noRestriction', 'No restriction')}
                </Text>
              </View>
            </View>
          </View>
        )}

        {!effectiveControls && !isLoading && (
          <View style={styles.section}>
            <Text style={styles.noControlsText}>
              {t('profileControls.effectiveControls.noControls', 'No family controls active for this profile')}
            </Text>
          </View>
        )}

        {isLoading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#ffffff" />
          </View>
        )}
      </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#1a1a2e',
  },
  container: {
    flex: 1,
  },
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
    color: '#ffffff',
    flex: 1,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
  },
  errorContainer: {
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    padding: 16,
    marginBottom: 16,
  },
  errorText: {
    color: '#fecaca',
    marginBottom: 8,
  },
  dismissButton: {
    color: '#fca5a5',
    textDecorationLine: 'underline',
    fontSize: 14,
  },
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
    color: '#ffffff',
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
    borderColor: '#ffffff',
    marginRight: 12,
    marginTop: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioCircleSelected: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#ffffff',
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
    color: '#ffffff',
  },
  radioDescription: {
    fontSize: 14,
    color: '#d1d5db',
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
  controlContent: {
    flex: 1,
  },
  controlTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#ffffff',
    marginBottom: 8,
  },
  controlDetails: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  controlDetailText: {
    fontSize: 14,
    color: '#d1d5db',
  },
  noControlsText: {
    color: '#d1d5db',
    textAlign: 'center',
    fontSize: 14,
  },
  controlsGrid: {
    gap: 12,
  },
  controlCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 16,
  },
  controlCardLabel: {
    fontSize: 14,
    color: '#d1d5db',
    marginBottom: 4,
  },
  controlCardValue: {
    fontSize: 16,
    fontWeight: '500',
    color: '#ffffff',
  },
  controlCardDetail: {
    fontSize: 14,
    color: '#9ca3af',
    marginTop: 4,
  },
  loadingContainer: {
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
