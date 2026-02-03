/**
 * Effective Controls Display Component
 *
 * Shows the currently active family controls for a profile.
 */

import React from 'react';
import { useTranslation } from 'react-i18next';

interface EffectiveControls {
  kids_enabled: boolean;
  kids_age_limit: number;
  youngsters_enabled: boolean;
  youngsters_age_limit: number;
  max_content_rating: string;
  viewing_hours_enabled: boolean;
  viewing_start_hour: number;
  viewing_end_hour: number;
}

interface EffectiveControlsDisplayProps {
  effectiveControls: EffectiveControls | null;
  isLoading: boolean;
}

export function EffectiveControlsDisplay({
  effectiveControls,
  isLoading,
}: EffectiveControlsDisplayProps) {
  const { t } = useTranslation();

  if (!effectiveControls && !isLoading) {
    return (
      <div className="p-6 rounded-2xl bg-white/10 backdrop-blur-xl border border-white/20">
        <p className="text-gray-300 text-center">
          {t('profileControls.effectiveControls.noControls', 'No family controls active for this profile')}
        </p>
      </div>
    );
  }

  if (!effectiveControls) {
    return null;
  }

  return (
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
  );
}
