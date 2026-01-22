/**
 * Audio Progress Bar Component
 *
 * Interactive seek slider with keyboard navigation and ARIA attributes
 */

import React from 'react';
import { formatTime, calculateProgress, clickPositionToTime } from './audioPlayerUtils';

interface ProgressBarProps {
  currentTime: number;
  duration: number;
  onSeek: (time: number) => void;
}

export function ProgressBar({ currentTime, duration, onSeek }: ProgressBarProps) {
  const progressBarRef = React.useRef<HTMLDivElement>(null);

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!progressBarRef.current) return;

    const rect = progressBarRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const newTime = clickPositionToTime(clickX, rect.width, duration);
    onSeek(newTime);
  };

  const handleProgressKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    switch (e.key) {
      case 'ArrowLeft':
        e.preventDefault();
        onSeek(Math.max(0, currentTime - 5));
        break;
      case 'ArrowRight':
        e.preventDefault();
        onSeek(Math.min(duration, currentTime + 5));
        break;
      case 'Home':
        e.preventDefault();
        onSeek(0);
        break;
      case 'End':
        e.preventDefault();
        onSeek(duration);
        break;
    }
  };

  const progress = calculateProgress(currentTime, duration);

  return (
    <div className="space-y-1">
      {/* Time Display */}
      <div className="flex justify-between text-sm text-white/70">
        <span>{formatTime(currentTime)}</span>
        <span>{formatTime(duration)}</span>
      </div>

      {/* Progress Bar */}
      <div
        ref={progressBarRef}
        onClick={handleSeek}
        onKeyDown={handleProgressKeyDown}
        className="h-2 relative cursor-pointer group"
        role="slider"
        aria-label="Audio progress"
        aria-valuemin={0}
        aria-valuemax={duration}
        aria-valuenow={currentTime}
        aria-valuetext={`${formatTime(currentTime)} of ${formatTime(duration)}`}
        tabIndex={0}
      >
        {/* Background Track */}
        <div className="absolute inset-0 bg-white/10 rounded-full overflow-hidden">
          {/* Progress Fill */}
          <div
            className="h-full bg-blue-400 transition-all duration-150 relative"
            style={{ width: `${progress}%` }}
          >
            {/* Progress Thumb - iOS HIG compliant 44px touch target */}
            <div className="absolute right-0 top-1/2 -translate-y-1/2 w-11 h-11 bg-blue-400 rounded-full shadow-lg opacity-0 group-hover:opacity-100 group-focus:opacity-100 group-focus:ring-2 group-focus:ring-blue-300 transition-opacity" />
          </div>
        </div>
      </div>
    </div>
  );
}
