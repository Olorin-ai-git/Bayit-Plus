import React from 'react';
import { getRiskColor } from '../../utils/colorPalettes';
import type { LocationMarker } from '../../types/events.types';

interface MapMarkerProps {
  location: LocationMarker;
  isSelected?: boolean;
  onClick?: (location: LocationMarker) => void;
  className?: string;
}

export function MapMarker({ location, isSelected = false, onClick, className = '' }: MapMarkerProps) {
  const typeColors: Record<typeof location.type, string> = {
    customer: 'bg-blue-500 border-blue-400',
    business: 'bg-green-500 border-green-400',
    device: 'bg-amber-500 border-amber-400',
    transaction: 'bg-red-500 border-red-400',
    risk: 'bg-red-600 border-red-500'
  };

  const typeIcons: Record<typeof location.type, string> = {
    customer: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z',
    business: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4',
    device: 'M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z',
    transaction: 'M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z',
    risk: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z'
  };

  const riskScore = location.metadata?.riskScore as number | undefined;

  function handleClick() {
    onClick?.(location);
  }

  return (
    <div
      className={`map-marker-overlay ${className} ${isSelected ? 'ring-4 ring-orange-500' : ''}`}
      onClick={handleClick}
    >
      {/* Marker Pin */}
      <div
        className={`
          relative flex items-center justify-center
          w-10 h-10 rounded-full border-2
          ${typeColors[location.type]}
          cursor-pointer transition-all duration-200
          hover:scale-110 active:scale-95
          shadow-lg
        `}
        title={location.label}
      >
        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={typeIcons[location.type]} />
        </svg>

        {/* Risk Badge */}
        {riskScore !== undefined && riskScore > 60 && (
          <div
            className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-600 border border-white flex items-center justify-center"
            title={`Risk: ${riskScore}`}
          >
            <span className="text-[10px] font-bold text-white">!</span>
          </div>
        )}
      </div>

      {/* Info Popup (shown when selected) */}
      {isSelected && (
        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 z-10">
          <div className="bg-gray-900 border border-gray-700 rounded-lg p-3 shadow-xl min-w-[200px]">
            <div className="text-sm font-semibold text-gray-200 mb-2">{location.label}</div>
            <div className="space-y-1 text-xs">
              <div className="flex justify-between">
                <span className="text-gray-400">Type:</span>
                <span className="text-gray-200 capitalize">{location.type}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Lat:</span>
                <span className="text-gray-200 font-mono">{location.latitude.toFixed(6)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Lng:</span>
                <span className="text-gray-200 font-mono">{location.longitude.toFixed(6)}</span>
              </div>
              {riskScore !== undefined && (
                <div className="flex justify-between pt-1 border-t border-gray-700">
                  <span className="text-gray-400">Risk:</span>
                  <span className={`font-mono font-semibold ${getRiskScoreColor(riskScore)}`}>
                    {riskScore}
                  </span>
                </div>
              )}
            </div>

            {/* Arrow */}
            <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-px">
              <div className="border-8 border-transparent border-t-gray-700" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function getRiskScoreColor(score: number): string {
  if (score >= 80) return 'text-red-400';
  if (score >= 60) return 'text-amber-400';
  if (score >= 40) return 'text-cyan-400';
  return 'text-gray-400';
}
