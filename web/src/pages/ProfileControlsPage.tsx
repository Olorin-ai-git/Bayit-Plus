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
import { ArrowLeft } from 'lucide-react';
import { useProfileControlsStore } from '../../../shared/stores/profileControlsStore';
import { setApiClient as setProfileControlsApiClient } from '../../../shared/services/profileControlsApi';
import { useFamilyControlsStore } from '../../../shared/stores/familyControlsStore';
import { ControlsSourceToggle } from '../components/profile-controls/ControlsSourceToggle';
import { CustomControlsSelector } from '../components/profile-controls/CustomControlsSelector';
import { EffectiveControlsDisplay } from '../components/profile-controls/EffectiveControlsDisplay';
import api from '../services/api';
import logger from '../utils/logger';

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
  const [localError, setLocalError] = useState<string | null>(null);

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
          const errorMsg = t('profileControls.errors.noControlsAvailable', 'No family controls available. Create controls first.');
          setLocalError(errorMsg);
          logger.warn('No family controls available', 'ProfileControlsPage', { profileId });
          return;
        }
      } else {
        // Switch to household inheritance
        await inheritHouseholdControls(profileId);
      }

      // Reload source after change
      await getControlsSource(profileId);
    } catch (error: any) {
      logger.error('Failed to toggle inheritance', 'ProfileControlsPage', error);
      setLocalError(error.message || 'Failed to toggle inheritance');
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
        logger.error('Failed to set custom controls', 'ProfileControlsPage', error);
        setLocalError(error.message || 'Failed to set custom controls');
      }
    }
  };

  const isLoading = profileControlsLoading || familyControlsLoading;
  const error = profileControlsError || familyControlsError || localError;

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
                setLocalError(null);
              }}
              className="mt-2 text-sm text-red-300 hover:text-red-100 underline"
            >
              {t('common.dismiss', 'Dismiss')}
            </button>
          </div>
        )}

        {/* Controls Source Toggle */}
        <ControlsSourceToggle
          isInheriting={isInheriting}
          isLoading={isLoading}
          onToggle={handleToggleInheritance}
        />

        {/* Custom Controls Selection */}
        {!isInheriting && (
          <CustomControlsSelector
            availableControls={availableControls}
            selectedControlsId={selectedControlsId}
            isLoading={isLoading}
            onSelectControls={handleSelectCustomControls}
          />
        )}

        {/* Effective Controls Display */}
        <EffectiveControlsDisplay
          effectiveControls={effectiveControls}
          isLoading={isLoading}
        />
      </div>
    </div>
  );
}
