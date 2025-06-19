import React, { useEffect, useState } from 'react';

interface StopwatchProps {
  startTime: Date | null;
  endTime?: Date | null;
  label?: string;
  className?: string;
}

/**
 * A component that displays elapsed time in a stopwatch format
 */
const Stopwatch: React.FC<StopwatchProps> = ({
  startTime,
  endTime = undefined,
  label = '',
  className = '',
}) => {
  const [elapsedTime, setElapsedTime] = useState<string>('0m 0s');

  useEffect(() => {
    if (!startTime) return;

    const updateElapsedTime = () => {
      const now = endTime || new Date();
      const durationMs = now.getTime() - startTime.getTime();
      const seconds = Math.floor(durationMs / 1000);
      const minutes = Math.floor(seconds / 60);
      const remainingSeconds = seconds % 60;
      setElapsedTime(`${minutes}m ${remainingSeconds}s`);
    };

    // Update immediately
    updateElapsedTime();

    // If there's no end time, update every second
    if (!endTime) {
      const interval = setInterval(updateElapsedTime, 1000);
      return () => clearInterval(interval);
    }
  }, [startTime, endTime]);

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {label && <span className="text-sm text-gray-600">{label}:</span>}
      <span className="font-mono text-sm bg-gray-100 px-2 py-1 rounded">
        {elapsedTime}
      </span>
    </div>
  );
};

export default Stopwatch;
