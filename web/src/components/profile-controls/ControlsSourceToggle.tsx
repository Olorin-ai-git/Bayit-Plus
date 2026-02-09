/**
 * Controls Source Toggle Component
 *
 * Radio buttons for selecting between household inheritance and custom controls.
 */

import React from 'react';
import { useTranslation } from 'react-i18next';
import { Home, Shield } from 'lucide-react';

interface ControlsSourceToggleProps {
  isInheriting: boolean;
  isLoading: boolean;
  onToggle: () => void;
}

export function ControlsSourceToggle({
  isInheriting,
  isLoading,
  onToggle,
}: ControlsSourceToggleProps) {
  const { t } = useTranslation();

  return (
    <div className="mb-8 p-6 rounded-2xl bg-white/10 backdrop-blur-xl border border-white/20">
      <h2 className="text-xl font-semibold text-white mb-4">
        {t('profileControls.sourceSection.title', 'Controls Source')}
      </h2>

      <div className="space-y-4">
        {/* Household Inheritance Option */}
        <div
          role="radio"
          tabIndex={0}
          aria-checked={isInheriting}
          aria-label={t('profileControls.sourceSection.inheritHousehold', 'Inherit from Household')}
          onClick={() => !isLoading && !isInheriting && onToggle()}
          onKeyDown={(e) => { if ((e.key === 'Enter' || e.key === ' ') && !isLoading && !isInheriting) onToggle(); }}
          className={`flex items-center gap-4 p-4 rounded-xl cursor-pointer hover:bg-white/10 transition-colors border ${
            isInheriting
              ? 'bg-purple-500/15 border-purple-500/50'
              : 'bg-white/5 border-white/10'
          }`}
        >
          <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
            isInheriting ? 'border-purple-500' : 'border-white/30'
          }`}>
            {isInheriting && <div className="w-2.5 h-2.5 rounded-full bg-purple-500" />}
          </div>
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
        </div>

        {/* Custom Controls Option */}
        <div
          role="radio"
          tabIndex={0}
          aria-checked={!isInheriting}
          aria-label={t('profileControls.sourceSection.customControls', 'Custom Controls')}
          onClick={() => !isLoading && isInheriting && onToggle()}
          onKeyDown={(e) => { if ((e.key === 'Enter' || e.key === ' ') && !isLoading && isInheriting) onToggle(); }}
          className={`flex items-center gap-4 p-4 rounded-xl cursor-pointer hover:bg-white/10 transition-colors border ${
            !isInheriting
              ? 'bg-purple-500/15 border-purple-500/50'
              : 'bg-white/5 border-white/10'
          }`}
        >
          <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
            !isInheriting ? 'border-purple-500' : 'border-white/30'
          }`}>
            {!isInheriting && <div className="w-2.5 h-2.5 rounded-full bg-purple-500" />}
          </div>
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
        </div>
      </div>
    </div>
  );
}
