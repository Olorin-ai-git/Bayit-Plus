/**
 * DurationDisplay Component
 * Feature: 001-startup-analysis-flow
 *
 * Displays a dynamic duration counter with live updates for active investigations.
 */

import React, { useState, useEffect } from 'react';

interface DurationDisplayProps {
  startTime: string;
  endTime?: string;
  status: string;
}

function parseDate(dateStr: string): Date | null {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return null;
  return d;
}

export const DurationDisplay: React.FC<DurationDisplayProps> = ({ startTime, endTime, status }) => {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    if (!endTime && ['CREATED', 'SETTINGS', 'IN_PROGRESS'].includes(status)) {
      const interval = setInterval(() => setNow(new Date()), 1000);
      return () => clearInterval(interval);
    }
  }, [endTime, status]);

  if (!startTime) {
    return <span className="font-mono text-corporate-textTertiary">--:--:--</span>;
  }

  const startDate = parseDate(startTime);
  if (!startDate) {
    return <span className="font-mono text-corporate-textTertiary">Invalid Date</span>;
  }

  if (startDate.getFullYear() < 2020) {
    return <span className="font-mono text-corporate-textTertiary">--:--:--</span>;
  }

  const start = startDate.getTime();
  let end = now.getTime();

  if (endTime) {
    const endDate = parseDate(endTime);
    if (endDate) {
      end = endDate.getTime();
    }
  }

  const durationMs = Math.max(0, end - start);
  const seconds = Math.floor((durationMs / 1000) % 60);
  const minutes = Math.floor((durationMs / (1000 * 60)) % 60);
  const hours = Math.floor(durationMs / (1000 * 60 * 60));

  const formatted = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

  const tooltip = `Start: ${startDate.toLocaleString()}${endTime ? `\nEnd: ${new Date(endTime).toLocaleString()}` : ''}`;

  return (
    <span className="font-mono" title={tooltip}>
      {formatted}
    </span>
  );
};
