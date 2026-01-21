/**
 * Radar Visualization Hook
 * Feature: 004-new-olorin-frontend
 *
 * Manages radar anomalies, UI state, and computed radar visualization state.
 */

import { useState, useMemo, useCallback } from 'react';
import type {
  RadarVisualizationState,
  RadarAnomaly,
  RadarUIState
} from '@shared/types/radar.types';
import type { WizardSettings, Investigation } from '@shared/types/wizard.types';
import type { Phase } from '@shared/components';
import { buildRadarState } from '../utils/radarStateBuilder';

/**
 * Hook to manage radar visualization
 */
export function useRadarVisualization(
  settings: WizardSettings | null,
  investigation: Investigation | null,
  phases: Phase[]
) {
  const [radarAnomalies, setRadarAnomalies] = useState<RadarAnomaly[]>([]);
  const [radarUIState, setRadarUIState] = useState<RadarUIState>({
    isScanning: true,
    showLabels: true,
    filterRiskLevel: null
  });

  // Computed radar state
  const radarState: RadarVisualizationState = useMemo(() => {
    return buildRadarState(settings, investigation, radarAnomalies, radarUIState, phases);
  }, [settings, investigation, radarAnomalies, radarUIState, phases]);

  // Add a new anomaly
  const addAnomaly = useCallback((anomaly: RadarAnomaly) => {
    setRadarAnomalies((prev) => [...prev, anomaly]);
  }, []);

  // Toggle scanning state
  const toggleScanning = useCallback(() => {
    setRadarUIState((prev) => ({ ...prev, isScanning: !prev.isScanning }));
  }, []);

  // Toggle labels visibility
  const toggleLabels = useCallback(() => {
    setRadarUIState((prev) => ({ ...prev, showLabels: !prev.showLabels }));
  }, []);

  // Handle anomaly selection
  const handleAnomalySelected = useCallback((anomaly: RadarAnomaly) => {
    console.log('Anomaly selected:', anomaly);
  }, []);

  return {
    radarState,
    radarAnomalies,
    addAnomaly,
    toggleScanning,
    toggleLabels,
    handleAnomalySelected
  };
}
