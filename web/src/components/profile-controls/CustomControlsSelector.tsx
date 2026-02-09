/**
 * Custom Controls Selector Component
 *
 * Allows selection of specific family controls when not inheriting from household.
 */

import React from 'react';
import { useTranslation } from 'react-i18next';

interface FamilyControl {
  id: string;
  kids_age_limit: number;
  youngsters_age_limit: number;
  max_content_rating: string;
}

interface CustomControlsSelectorProps {
  availableControls: FamilyControl[] | null;
  selectedControlsId: string | null;
  isLoading: boolean;
  onSelectControls: (controlsId: string) => void;
}

export function CustomControlsSelector({
  availableControls,
  selectedControlsId,
  isLoading,
  onSelectControls,
}: CustomControlsSelectorProps) {
  const { t } = useTranslation();

  return (
    <div className="mb-8 p-6 rounded-2xl bg-white/10 backdrop-blur-xl border border-white/20">
      <h2 className="text-xl font-semibold text-white mb-4">
        {t('profileControls.selectControls.title', 'Select Controls')}
      </h2>

      {availableControls && availableControls.length > 0 ? (
        <div className="space-y-3">
          {availableControls.map((control) => {
            const isSelected = selectedControlsId === control.id;
            return (
              <div
                key={control.id}
                role="radio"
                tabIndex={0}
                aria-checked={isSelected}
                onClick={() => !isLoading && onSelectControls(control.id)}
                onKeyDown={(e) => { if ((e.key === 'Enter' || e.key === ' ') && !isLoading) onSelectControls(control.id); }}
                className={`flex items-center gap-4 p-4 rounded-xl cursor-pointer hover:bg-white/10 transition-colors border ${
                  isSelected
                    ? 'bg-purple-500/15 border-purple-500/50'
                    : 'bg-white/5 border-white/10'
                }`}
              >
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                  isSelected ? 'border-purple-500' : 'border-white/30'
                }`}>
                  {isSelected && <div className="w-2.5 h-2.5 rounded-full bg-purple-500" />}
                </div>
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
              </div>
            );
          })}
        </div>
      ) : (
        <p className="text-gray-300">
          {t('profileControls.selectControls.noControls', 'No family controls available. Create controls in Family Controls settings.')}
        </p>
      )}
    </div>
  );
}
