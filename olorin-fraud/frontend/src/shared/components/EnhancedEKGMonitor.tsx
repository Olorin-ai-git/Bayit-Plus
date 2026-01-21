/**
 * EnhancedEKGMonitor - Complete EKG Activity Monitor
 * Adapted from Olorin web plugin for Olorin frontend
 *
 * Medical-grade P-Q-R-S-T waveform driven by tools/sec → BPM
 * Real-time metrics panel (progress %, tool counts)
 * Investigation status indicators
 *
 * Performance:
 * - 60 FPS canvas animation
 * - Responsive width measurement
 * - Optimized re-renders via React.memo
 */

import React, { useMemo, useRef, useState, useEffect } from 'react';
import { calculateBPM, getActivityLevel } from '@shared/utils/bpmCalculation';
import { EKGMonitor } from './EKGMonitor';

export interface EnhancedEKGMonitorProps {
  /** Investigation progress percentage (0-100) */
  progress: number;
  /** Number of completed tools */
  completed: number;
  /** Number of running tools */
  running: number;
  /** Number of queued tools */
  queued: number;
  /** Number of failed tools */
  failed: number;
  /** WebSocket connection status */
  isConnected: boolean;
  /** Expected total number of tools */
  expectedTotal?: number;
  /** Simulated tools per second (for now, until WebSocket integration) */
  toolsPerSec?: number;
}

/**
 * EnhancedEKGMonitor - Full featured EKG display
 */
export const EnhancedEKGMonitor: React.FC<EnhancedEKGMonitorProps> = ({
  progress,
  completed,
  running,
  queued,
  failed,
  isConnected,
  expectedTotal,
  toolsPerSec: providedToolsPerSec = 0,
}) => {
  // Container ref for responsive width measurement
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(900);

  // Simulated tools per second (will be replaced with real WebSocket data)
  const [simulatedTPS, setSimulatedTPS] = useState(0);
  const [peakTPS, setPeakTPS] = useState(0);
  const [totalExecutions, setTotalExecutions] = useState(0);

  // Use provided TPS or simulated value
  const toolsPerSec = providedToolsPerSec || simulatedTPS;

  // Measure container width for responsive canvas
  useEffect(() => {
    const measureWidth = () => {
      if (containerRef.current) {
        const width = containerRef.current.offsetWidth;
        setContainerWidth(width > 0 ? width : 900);
      }
    };

    measureWidth();
    window.addEventListener('resize', measureWidth);
    return () => window.removeEventListener('resize', measureWidth);
  }, []);

  // Simulate tools/sec based on running count (temporary until WebSocket integration)
  useEffect(() => {
    if (running > 0 && !providedToolsPerSec) {
      const interval = setInterval(() => {
        // Simulate tools/sec between 0 and 40
        const newTPS = Math.min(40, Math.floor(Math.random() * running * 2));
        setSimulatedTPS(newTPS);
        setPeakTPS((prev) => Math.max(prev, newTPS));
        setTotalExecutions((prev) => prev + newTPS);
      }, 1000);

      return () => clearInterval(interval);
    } else if (running === 0) {
      setSimulatedTPS(0);
    }
  }, [running, providedToolsPerSec]);

  // Calculate BPM from tools/sec
  const bpm = useMemo(() => calculateBPM(toolsPerSec), [toolsPerSec]);

  // Determine investigation status
  const investigationStatus = useMemo(() => {
    if (progress === 0 && running === 0 && completed === 0) {
      return 'initializing';
    }
    if (progress === 100) {
      return 'complete';
    }
    if (failed > 0 && running === 0 && queued === 0) {
      return 'failed';
    }
    return 'active';
  }, [progress, running, completed, queued, failed]);

  // Check if investigation is in terminal state (show flatline)
  const isTerminal = useMemo(() => {
    return investigationStatus === 'complete' || investigationStatus === 'failed';
  }, [investigationStatus]);

  // Get activity level descriptor
  const activityLevel = useMemo(
    () => getActivityLevel(toolsPerSec),
    [toolsPerSec]
  );

  // Status labels
  const statusLabel = {
    initializing: 'Initializing Investigation...',
    active: 'Investigation Active',
    complete: 'Investigation Complete',
    failed: 'Investigation Failed',
  }[investigationStatus];

  const statusColor = {
    initializing: 'text-yellow-500',
    active: 'text-green-500',
    complete: 'text-blue-500',
    failed: 'text-red-500',
  }[investigationStatus];

  return (
    <div ref={containerRef} className="enhanced-ekg-monitor space-y-4 w-full">
      {/* EKG Waveform Display */}
      <div className="bg-gray-900/50 rounded-lg p-4 border border-gray-800">
        <EKGMonitor
          bpm={bpm}
          width={containerWidth - 32}
          height={180}
          lineColor={isTerminal ? "#888888" : "#34f3a0"}
          gridColor="#1b2a44"
          isRunning={!isTerminal}
        />

        {/* BPM and Tools/Sec Display */}
        <div className="mt-3 flex items-center justify-between text-sm">
          <div className="flex items-center gap-6">
            <div>
              <span className="text-gray-400">BPM:</span>
              <span className="ml-2 text-xl font-bold text-corporate-success">{bpm}</span>
            </div>
            <div>
              <span className="text-gray-400">Tools/Sec:</span>
              <span className="ml-2 text-xl font-bold text-blue-400">
                {toolsPerSec}
              </span>
            </div>
            <div>
              <span className="text-gray-400">Peak:</span>
              <span className="ml-2 text-lg font-semibold text-orange-400">
                {peakTPS}
              </span>
            </div>
            <div>
              <span className="text-gray-400">Total:</span>
              <span className="ml-2 text-lg font-semibold text-gray-300">
                {totalExecutions}
              </span>
            </div>
          </div>

          <div className="text-xs text-gray-500">
            Formula: BPM = 40 + (tools/sec × 6)
          </div>
        </div>
      </div>

      {/* Metrics Panel */}
      <div className="grid grid-cols-5 gap-4">
        {/* Progress */}
        <div className="bg-gray-900/50 rounded-lg p-4 border border-gray-800">
          <div className="text-xs text-gray-400 mb-1">Progress</div>
          <div className="text-2xl font-bold text-blue-400">{progress}%</div>
          <div className="mt-2 w-full bg-gray-700 rounded-full h-2">
            <div
              className="bg-blue-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          {expectedTotal && (
            <div className="text-xs text-gray-500 mt-1">
              {completed}/{expectedTotal} tools
            </div>
          )}
        </div>

        {/* Completed */}
        <div className="bg-gray-900/50 rounded-lg p-4 border border-gray-800">
          <div className="text-xs text-gray-400 mb-1">Completed</div>
          <div className="text-2xl font-bold text-corporate-success">{completed}</div>
          <div className="text-xs text-gray-500 mt-1">tools finished</div>
        </div>

        {/* Running */}
        <div className="bg-gray-900/50 rounded-lg p-4 border border-gray-800">
          <div className="text-xs text-gray-400 mb-1">Running</div>
          <div className="text-2xl font-bold text-yellow-400">{running}</div>
          <div className="text-xs text-gray-500 mt-1">tools active</div>
        </div>

        {/* Queued */}
        <div className="bg-gray-900/50 rounded-lg p-4 border border-gray-800">
          <div className="text-xs text-gray-400 mb-1">Queued</div>
          <div className="text-2xl font-bold text-gray-400">{queued}</div>
          <div className="text-xs text-gray-500 mt-1">tools waiting</div>
        </div>

        {/* Failed */}
        <div className="bg-gray-900/50 rounded-lg p-4 border border-gray-800">
          <div className="text-xs text-gray-400 mb-1">Failed</div>
          <div className="text-2xl font-bold text-corporate-error">{failed}</div>
          <div className="text-xs text-gray-500 mt-1">tools errored</div>
        </div>
      </div>

    </div>
  );
};

// Memoize to prevent unnecessary re-renders
export default React.memo(EnhancedEKGMonitor);
