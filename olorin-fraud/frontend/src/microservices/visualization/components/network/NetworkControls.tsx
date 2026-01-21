import React from 'react';
import { visualizationConfig } from '../../config/environment';

interface NetworkControlsProps {
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFit: () => void;
  onTogglePhysics: () => void;
  physicsEnabled: boolean;
  className?: string;
}

export function NetworkControls({
  onZoomIn,
  onZoomOut,
  onFit,
  onTogglePhysics,
  physicsEnabled,
  className = ''
}: NetworkControlsProps) {
  const controlButtonClass = `
    w-10 h-10 flex items-center justify-center
    bg-gray-800 border border-gray-700 rounded-md
    text-gray-200 hover:bg-gray-700 hover:border-orange-500
    transition-all duration-200
    focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 focus:ring-offset-gray-900
    active:scale-95
  `;

  const activeButtonClass = `
    ${controlButtonClass}
    bg-orange-600 border-orange-500 hover:bg-orange-700
  `;

  return (
    <div className={`network-controls ${className}`}>
      <div className="bg-gray-900/90 backdrop-blur-sm border border-gray-700 rounded-lg p-2 shadow-xl">
        <div className="flex flex-col gap-2">
          {/* Zoom In */}
          <button
            onClick={onZoomIn}
            className={controlButtonClass}
            title="Zoom In"
            aria-label="Zoom in on network graph"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v6m3-3H7"
              />
            </svg>
          </button>

          {/* Zoom Out */}
          <button
            onClick={onZoomOut}
            className={controlButtonClass}
            title="Zoom Out"
            aria-label="Zoom out on network graph"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM13 10H7"
              />
            </svg>
          </button>

          {/* Fit to Screen */}
          <button
            onClick={onFit}
            className={controlButtonClass}
            title="Fit to Screen"
            aria-label="Fit network graph to screen"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"
              />
            </svg>
          </button>

          {/* Divider */}
          <div className="h-px bg-gray-700 my-1" />

          {/* Toggle Physics */}
          <button
            onClick={onTogglePhysics}
            className={physicsEnabled ? activeButtonClass : controlButtonClass}
            title={physicsEnabled ? 'Disable Physics' : 'Enable Physics'}
            aria-label={physicsEnabled ? 'Disable physics simulation' : 'Enable physics simulation'}
            aria-pressed={physicsEnabled}
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              {physicsEnabled ? (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
                />
              ) : (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              )}
            </svg>
          </button>

          {/* Legend Toggle (if configuration allows) */}
          {visualizationConfig?.network?.showLegend && (
            <>
              <div className="h-px bg-gray-700 my-1" />
              <button
                className={controlButtonClass}
                title="Toggle Legend"
                aria-label="Toggle network legend"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Physics Status Indicator */}
      {physicsEnabled && (
        <div className="mt-2 px-3 py-1.5 bg-orange-900/30 border border-orange-500 rounded-md">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse" />
            <span className="text-xs font-medium text-orange-300">
              Physics Active
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
