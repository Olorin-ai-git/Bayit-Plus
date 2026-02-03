/**
 * Profile Controls Screen - tvOS (Apple TV)
 *
 * TV-optimized implementation for managing profile-aware family controls.
 * Features 10-foot UI, large touch targets (60px min), and focus navigation.
 */

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  TVFocusGuideView,
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

export default function ProfileControlsScreen() {
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
    <TVFocusGuideView style={styles.container} autoFocus>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
          hasTVPreferredFocus
          tvParallaxProperties={{
            enabled: true,
            magnification: 1.1,
            pressMagnification: 1.0,
          }}
          accessibilityRole="button"
          accessibilityLabel={t('common.back', 'Back')}
          accessibilityHint={t('accessibility.navigateBack', 'Navigate back to profiles list')}
        >
          <Ionicons name="arrow-back" size={32} color="#ffffff" />
          <Text style={styles.backButtonText}>{t('common.back', 'Back')}</Text>
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
              style={styles.dismissButton}
            >
              <Text style={styles.dismissButtonText}>
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
            tvParallaxProperties={{
              enabled: true,
              magnification: 1.05,
              pressMagnification: 0.98,
            }}
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
            onPress={handleToggleInheritance}
            disabled={isLoading}
            tvParallaxProperties={{
              enabled: true,
              magnification: 1.05,
              pressMagnification: 0.98,
            }}
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
    </TVFocusGuideView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 48,
    paddingTop: 80,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderBottomWidth: 2,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    padding: 16,
    marginRight: 32,
    minHeight: 60,
    minWidth: 120,
  },
  backButtonText: {
    fontSize: 28,
    color: '#ffffff',
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 40,
    fontWeight: '700',
    color: '#ffffff',
    flex: 1,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 48,
  },
  errorContainer: {
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    borderRadius: 24,
    borderWidth: 2,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    padding: 32,
    marginBottom: 32,
  },
  errorText: {
    fontSize: 24,
    color: '#fecaca',
    marginBottom: 16,
  },
  dismissButton: {
    padding: 12,
    minHeight: 60,
  },
  dismissButtonText: {
    fontSize: 22,
    color: '#fca5a5',
    textDecorationLine: 'underline',
  },
  section: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 24,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    padding: 32,
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 32,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 24,
  },
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
  radioCircleSelected: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#ffffff',
  },
  radioContent: {
    flex: 1,
  },
  radioHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 8,
  },
  radioTitle: {
    fontSize: 28,
    fontWeight: '600',
    color: '#ffffff',
  },
  radioDescription: {
    fontSize: 22,
    color: '#d1d5db',
  },
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
  controlContent: {
    flex: 1,
  },
  controlTitle: {
    fontSize: 26,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 12,
  },
  controlDetails: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 24,
  },
  controlDetailText: {
    fontSize: 22,
    color: '#d1d5db',
  },
  noControlsText: {
    color: '#d1d5db',
    textAlign: 'center',
    fontSize: 24,
  },
  controlsGrid: {
    gap: 20,
  },
  controlCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 20,
    padding: 32,
  },
  controlCardLabel: {
    fontSize: 22,
    color: '#d1d5db',
    marginBottom: 8,
  },
  controlCardValue: {
    fontSize: 28,
    fontWeight: '600',
    color: '#ffffff',
  },
  controlCardDetail: {
    fontSize: 20,
    color: '#9ca3af',
    marginTop: 8,
  },
  loadingContainer: {
    padding: 64,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
