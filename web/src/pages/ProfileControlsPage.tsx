/**
 * Profile Controls Page - Web
 *
 * Manages family controls for individual profiles:
 * - View effective controls for a profile
 * - Toggle between household inheritance and custom controls
 * - Select custom controls when not inheriting from household
 */

import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Shield, Home } from 'lucide-react';
import { useProfileControlsStore } from '../../../shared/stores/profileControlsStore';
import { setApiClient as setProfileControlsApiClient } from '../../../shared/services/profileControlsApi';
import { useFamilyControlsStore } from '../../../shared/stores/familyControlsStore';
import api from '../services/api';

// Initialize profile controls API client
setProfileControlsApiClient(api);

export default function ProfileControlsPage() {
  const { t } = useTranslation();
  const { profileId } = useParams<{ profileId: string }>();
  const navigate = useNavigate();

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
      navigate('/profiles');
      return;
    }

    // Load profile controls and source
    loadEffectiveControls(profileId);
    getControlsSource(profileId);

    // Load available controls for selection
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
          // Use first available controls
          await setCustomControls(profileId, availableControls[0].id);
        } else {
          alert(t('profileControls.errors.noControlsAvailable', 'No family controls available. Create controls first.'));
          return;
        }
      } else {
        // Switch to household inheritance
        await inheritHouseholdControls(profileId);
      }

      // Reload source after change
      await getControlsSource(profileId);
    } catch (error: any) {
      console.error('Failed to toggle inheritance:', error);
    }
  };

  const handleSelectCustomControls = async (controlsId: string) => {
    if (!profileId) return;

    setSelectedControlsId(controlsId);

    if (!isInheriting) {
      // If already using custom controls, apply the change immediately
      try {
        await setCustomControls(profileId, controlsId);
        await getControlsSource(profileId);
      } catch (error: any) {
        console.error('Failed to set custom controls:', error);
      }
    }
  };

  const isLoading = profileControlsLoading || familyControlsLoading;
  const error = profileControlsError || familyControlsError;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={() => navigate('/profiles')}
            className="p-2 rounded-lg bg-white/10 backdrop-blur-xl hover:bg-white/20 transition-colors"
          >
            <ArrowLeft size={24} className="text-white" />
          </button>
          <h1 className="text-3xl font-bold text-white">
            {t('profileControls.title', 'Profile Family Controls')}
          </h1>
        </div>

        {/* Error Display */}
        {error && (
          <div className="mb-6 p-4 rounded-2xl bg-red-500/20 backdrop-blur-xl border border-red-500/30">
            <p className="text-red-200">{error}</p>
            <button
              onClick={() => {
                clearProfileControlsError();
                clearFamilyControlsError();
              }}
              className="mt-2 text-sm text-red-300 hover:text-red-100 underline"
            >
              {t('common.dismiss', 'Dismiss')}
            </button>
          </div>
        )}

        {/* Controls Source Toggle */}
        <div className="mb-8 p-6 rounded-2xl bg-white/10 backdrop-blur-xl border border-white/20">
          <h2 className="text-xl font-semibold text-white mb-4">
            {t('profileControls.sourceSection.title', 'Controls Source')}
          </h2>

          <div className="space-y-4">
            {/* Household Inheritance Option */}
            <label className="flex items-center gap-4 p-4 rounded-xl bg-white/5 cursor-pointer hover:bg-white/10 transition-colors">
              <input
                type="radio"
                checked={isInheriting}
                onChange={() => handleToggleInheritance()}
                disabled={isLoading}
                className="w-5 h-5"
              />
              <div className="flex items-center gap-3 flex-1">
                <Home size={24} className="text-purple-300" />
                <div>
                  <p className="font-medium text-white">
                    {t('profileControls.sourceSection.inheritHousehold', 'Inherit from Household')}
                  </p>
                  <p className="text-sm text-gray-300">
                    {t('profileControls.sourceSection.inheritHouseholdDesc', 'Use household-wide family controls')}
                  </p>
                </div>
              </div>
            </label>

            {/* Custom Controls Option */}
            <label className="flex items-center gap-4 p-4 rounded-xl bg-white/5 cursor-pointer hover:bg-white/10 transition-colors">
              <input
                type="radio"
                checked={!isInheriting}
                onChange={() => handleToggleInheritance()}
                disabled={isLoading}
                className="w-5 h-5"
              />
              <div className="flex items-center gap-3 flex-1">
                <Shield size={24} className="text-blue-300" />
                <div>
                  <p className="font-medium text-white">
                    {t('profileControls.sourceSection.customControls', 'Custom Controls')}
                  </p>
                  <p className="text-sm text-gray-300">
                    {t('profileControls.sourceSection.customControlsDesc', 'Use profile-specific family controls')}
                  </p>
                </div>
              </div>
            </label>
          </div>
        </div>

        {/* Custom Controls Selection */}
        {!isInheriting && (
          <div className="mb-8 p-6 rounded-2xl bg-white/10 backdrop-blur-xl border border-white/20">
            <h2 className="text-xl font-semibold text-white mb-4">
              {t('profileControls.selectControls.title', 'Select Controls')}
            </h2>

            {availableControls && availableControls.length > 0 ? (
              <div className="space-y-3">
                {availableControls.map((control) => (
                  <label
                    key={control.id}
                    className="flex items-center gap-4 p-4 rounded-xl bg-white/5 cursor-pointer hover:bg-white/10 transition-colors"
                  >
                    <input
                      type="radio"
                      checked={selectedControlsId === control.id}
                      onChange={() => handleSelectCustomControls(control.id)}
                      disabled={isLoading}
                      className="w-5 h-5"
                    />
                    <div className="flex-1">
                      <p className="font-medium text-white">
                        {t('profileControls.selectControls.controlsLabel', 'Family Controls {{id}}', {
                          id: control.id.slice(0, 8),
                        })}
                      </p>
                      <div className="flex gap-4 mt-2 text-sm text-gray-300">
                        <span>
                          {t('profileControls.selectControls.kidsAge', 'Kids: {{age}}', {
                            age: control.kids_age_limit,
                          })}
                        </span>
                        <span>
                          {t('profileControls.selectControls.youngstersAge', 'Youngsters: {{age}}', {
                            age: control.youngsters_age_limit,
                          })}
                        </span>
                        <span>
                          {t('profileControls.selectControls.rating', 'Rating: {{rating}}', {
                            rating: control.max_content_rating,
                          })}
                        </span>
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            ) : (
              <p className="text-gray-300">
                {t('profileControls.selectControls.noControls', 'No family controls available. Create controls in Family Controls settings.')}
              </p>
            )}
          </div>
        )}

        {/* Effective Controls Display */}
        {effectiveControls && (
          <div className="p-6 rounded-2xl bg-white/10 backdrop-blur-xl border border-white/20">
            <h2 className="text-xl font-semibold text-white mb-4">
              {t('profileControls.effectiveControls.title', 'Active Controls')}
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-white/5">
                <p className="text-sm text-gray-300 mb-1">
                  {t('profileControls.effectiveControls.kidsEnabled', 'Kids Content')}
                </p>
                <p className="text-lg font-medium text-white">
                  {effectiveControls.kids_enabled
                    ? t('profileControls.effectiveControls.enabled', 'Enabled')
                    : t('profileControls.effectiveControls.disabled', 'Disabled')}
                </p>
                {effectiveControls.kids_enabled && (
                  <p className="text-sm text-gray-400 mt-1">
                    {t('profileControls.effectiveControls.ageLimit', 'Age limit: {{age}}', {
                      age: effectiveControls.kids_age_limit,
                    })}
                  </p>
                )}
              </div>

              <div className="p-4 rounded-xl bg-white/5">
                <p className="text-sm text-gray-300 mb-1">
                  {t('profileControls.effectiveControls.youngstersEnabled', 'Youngsters Content')}
                </p>
                <p className="text-lg font-medium text-white">
                  {effectiveControls.youngsters_enabled
                    ? t('profileControls.effectiveControls.enabled', 'Enabled')
                    : t('profileControls.effectiveControls.disabled', 'Disabled')}
                </p>
                {effectiveControls.youngsters_enabled && (
                  <p className="text-sm text-gray-400 mt-1">
                    {t('profileControls.effectiveControls.ageLimit', 'Age limit: {{age}}', {
                      age: effectiveControls.youngsters_age_limit,
                    })}
                  </p>
                )}
              </div>

              <div className="p-4 rounded-xl bg-white/5">
                <p className="text-sm text-gray-300 mb-1">
                  {t('profileControls.effectiveControls.contentRating', 'Content Rating Limit')}
                </p>
                <p className="text-lg font-medium text-white">{effectiveControls.max_content_rating}</p>
              </div>

              <div className="p-4 rounded-xl bg-white/5">
                <p className="text-sm text-gray-300 mb-1">
                  {t('profileControls.effectiveControls.viewingHours', 'Viewing Hours')}
                </p>
                <p className="text-lg font-medium text-white">
                  {effectiveControls.viewing_hours_enabled
                    ? `${effectiveControls.viewing_start_hour}:00 - ${effectiveControls.viewing_end_hour}:00`
                    : t('profileControls.effectiveControls.noRestriction', 'No restriction')}
                </p>
              </div>
            </div>
          </div>
        )}

        {!effectiveControls && !isLoading && (
          <div className="p-6 rounded-2xl bg-white/10 backdrop-blur-xl border border-white/20">
            <p className="text-gray-300 text-center">
              {t('profileControls.effectiveControls.noControls', 'No family controls active for this profile')}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
