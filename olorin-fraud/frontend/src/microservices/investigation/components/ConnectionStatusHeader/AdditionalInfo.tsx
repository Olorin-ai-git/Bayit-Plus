/**
 * Additional Info Display Component
 * Feature: 007-progress-wizard-page
 *
 * Shows investigation metrics: elapsed time (HH:MM:SS), entities, tools, progress
 */

import React from 'react';

interface AdditionalInfoProps {
  elapsedTime?: number;
  entitiesCount?: number;
  toolsCount?: number;
  progress?: number;
}

export const AdditionalInfo: React.FC<AdditionalInfoProps> = ({
  elapsedTime = 0,
  entitiesCount = 0,
  toolsCount = 0,
  progress = 0
}) => {
  /**
   * Format elapsed time as HH:MM:SS or MM:SS based on duration
   * @param seconds Total elapsed seconds
   * @returns Formatted time string
   */
  const formatTime = (seconds: number): string => {
    const validSeconds = Math.max(0, seconds);
    const hours = Math.floor(validSeconds / 3600);
    const mins = Math.floor((validSeconds % 3600) / 60);
    const secs = validSeconds % 60;

    // Show hours only if investigation has been running for 1+ hours
    if (hours > 0) {
      return `${hours}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }

    // Otherwise show MM:SS format
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex items-center gap-6 text-sm">
      <div className="flex items-center gap-2">
        <span className="text-corporate-textTertiary">Elapsed:</span>
        <span className="text-corporate-textPrimary font-semibold font-mono">{formatTime(elapsedTime)}</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-corporate-textTertiary">Entities:</span>
        <span className="text-corporate-accentSecondary font-semibold">{entitiesCount}</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-corporate-textTertiary">Tools:</span>
        <span className="text-corporate-accentSecondary font-semibold">{toolsCount}</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-corporate-textTertiary">Progress:</span>
        <span className="text-corporate-accentPrimary font-bold">{progress}%</span>
      </div>
    </div>
  );
};

export default AdditionalInfo;
