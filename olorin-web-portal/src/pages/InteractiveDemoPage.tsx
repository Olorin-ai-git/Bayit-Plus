/**
 * Interactive Demo Page
 *
 * Main page for the marketing portal's interactive AI demo experience.
 * Allows visitors to select fraud scenarios and watch AI agents investigate.
 */

import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { DemoLauncher, DemoProgress, DemoResults } from '../components/demo';
import { useDemoState } from '../hooks';

const InteractiveDemoPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const {
    phase,
    scenarios,
    selectedScenario,
    progress,
    rateLimit,
    error,
    isLoading,
    loadScenarios,
    selectScenario,
    startDemo,
    reset,
    checkRateLimit,
  } = useDemoState();

  // Load scenarios on mount
  useEffect(() => {
    loadScenarios();
    checkRateLimit();
  }, [loadScenarios, checkRateLimit]);

  const handleContactSales = () => {
    navigate('/contact');
  };

  return (
    <div className="min-h-screen bg-corporate-bgPrimary">
      {/* Header spacing */}
      <div className="h-20" />

      <div className="max-w-6xl mx-auto px-4 py-12">
        {/* Phase: Selecting / Idle */}
        {(phase === 'idle' || phase === 'selecting') && (
          <DemoLauncher
            scenarios={scenarios}
            selectedScenario={selectedScenario}
            rateLimit={rateLimit}
            isLoading={isLoading}
            error={error}
            onSelectScenario={selectScenario}
            onStart={startDemo}
          />
        )}

        {/* Phase: Starting / Running */}
        {(phase === 'starting' || phase === 'running') && progress && selectedScenario && (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-corporate-textPrimary mb-2">Investigation in Progress</h2>
              <p className="text-corporate-textSecondary">Analyzing {selectedScenario.title.toLowerCase()}...</p>
            </div>
            <DemoProgress status={progress} agents={selectedScenario.showcase_agents} />
          </div>
        )}

        {/* Phase: Completed */}
        {phase === 'completed' && progress && selectedScenario && (
          <DemoResults
            status={progress}
            scenario={selectedScenario}
            onReset={reset}
            onContactSales={handleContactSales}
          />
        )}

        {/* Phase: Error */}
        {phase === 'error' && (
          <div className="text-center py-12">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-corporate-error/20 flex items-center justify-center">
              <span className="text-3xl">⚠️</span>
            </div>
            <h2 className="text-2xl font-bold text-corporate-textPrimary mb-2">Something Went Wrong</h2>
            <p className="text-corporate-textSecondary mb-6">{error?.message || 'An unexpected error occurred'}</p>
            <button
              onClick={reset}
              className="px-6 py-3 bg-corporate-accentPrimary hover:bg-corporate-accentSecondary text-white font-medium rounded-lg transition-colors"
            >
              Try Again
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default InteractiveDemoPage;
