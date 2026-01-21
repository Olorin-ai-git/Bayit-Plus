/**
 * Replay Studio Component - Main component for replay and backtesting.
 * NO HARDCODED VALUES - All configuration from environment variables.
 */

import React, { useState } from 'react';
import { ReplayConfig } from './ReplayConfig';
import { ReplayResults } from './ReplayResults';
import { DiffReport } from './DiffReport';

const ReplayStudio: React.FC = () => {
  const [selectedScenarioId, setSelectedScenarioId] = useState<string | null>(null);
  const [showConfig, setShowConfig] = useState(true);
  const [showResults, setShowResults] = useState(false);

  const handleScenarioCreated = (scenarioId: string) => {
    setSelectedScenarioId(scenarioId);
    setShowConfig(false);
    setShowResults(true);
  };

  const handleRunScenario = async (scenarioId: string) => {
    setSelectedScenarioId(scenarioId);
    setShowResults(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-corporate-textPrimary">Replay Studio</h1>
        <button
          onClick={() => {
            setShowConfig(true);
            setShowResults(false);
            setSelectedScenarioId(null);
          }}
          className="px-4 py-2 rounded-lg bg-corporate-accentPrimary text-white hover:bg-corporate-accentPrimary/90"
        >
          New Scenario
        </button>
      </div>

      {showConfig && (
        <ReplayConfig
          onScenarioCreated={handleScenarioCreated}
          onCancel={() => setShowConfig(false)}
        />
      )}

      {showResults && selectedScenarioId && (
        <>
          <ReplayResults scenarioId={selectedScenarioId} onRun={handleRunScenario} />
          <DiffReport scenarioId={selectedScenarioId} />
        </>
      )}
    </div>
  );
};

export default ReplayStudio;

