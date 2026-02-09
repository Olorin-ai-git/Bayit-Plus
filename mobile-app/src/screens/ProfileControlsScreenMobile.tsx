/**
 * Profile Controls Screen - Mobile (iOS/Android)
 *
 * React Native implementation for managing profile-aware family controls.
 * Uses StyleSheet for proper rendering on React Native Web.
 */

import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { useProfileControlsStore } from '../../../shared/stores/profileControlsStore';
import { setApiClient as setProfileControlsApiClient } from '../../../shared/services/profileControlsApi';
import { useFamilyControlsStore } from '../../../shared/stores/familyControlsStore';
import { GlassAlert } from '../../../shared/components/ui/GlassAlert';
import { ControlsSourceSection } from '../components/profile-controls/ControlsSourceSection';
import { CustomControlsSelection } from '../components/profile-controls/CustomControlsSelection';
import { EffectiveControlsGrid } from '../components/profile-controls/EffectiveControlsGrid';
import { ScreenHeader } from '../components/profile-controls/ScreenHeader';
import httpClient from '../services/httpClient';
import { Colors } from '../theme/colors';

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
        <ScreenHeader
          title={t('profileControls.title', 'Profile Family Controls')}
          onBack={() => navigation.goBack()}
        />

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
          <ControlsSourceSection
            isInheriting={isInheriting}
            isLoading={isLoading}
            onToggle={handleToggleInheritance}
          />

          {/* Custom Controls Selection */}
          {!isInheriting && (
            <CustomControlsSelection
              availableControls={availableControls}
              selectedControlsId={selectedControlsId}
              isLoading={isLoading}
              onSelectControls={handleSelectCustomControls}
            />
          )}

          {/* Effective Controls Display */}
          <EffectiveControlsGrid
            effectiveControls={effectiveControls}
            isLoading={isLoading}
          />
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.Background.elevated },
  container: { flex: 1 },
  content: { flex: 1 },
  contentContainer: { padding: 16 },
  errorContainer: {
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    padding: 16,
    marginBottom: 16,
  },
  errorText: { color: Colors.Error.e400, marginBottom: 8 },
  dismissButton: { color: Colors.Error.e400, textDecorationLine: 'underline', fontSize: 14 },
});
