<<<<<<< HEAD
import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import DataVisualization from './components/DataVisualization';
import LocationMap from './components/LocationMap';
import RiskScoreDisplay from './components/RiskScoreDisplay';
import OverallRiskScore from './components/OverallRiskScore';
import ErrorBoundary from '@shared/components/ErrorBoundary';
import LoadingSpinner from '@shared/components/LoadingSpinner';

// Mock data for standalone component testing
const mockVisualizationData = {
  riskMetrics: {
    overallScore: 74,
    behavioralRisk: 65,
    technicalRisk: 82,
    locationRisk: 45,
    deviceRisk: 78,
    networkRisk: 71,
    accountAge: 32,
    transactionVolume: 15420,
    anomalyCount: 8,
    lastUpdated: new Date().toISOString(),
  },
  riskFactors: [
    {
      id: '1',
      name: 'Multiple Device Access',
      score: 85,
      weight: 2.5,
      description: 'Account accessed from multiple devices in short timeframe',
      category: 'device' as const,
      status: 'critical' as const,
    },
    {
      id: '2',
      name: 'Unusual Location Pattern',
      score: 72,
      weight: 2.0,
      description: 'Login from geographically impossible location',
      category: 'location' as const,
      status: 'warning' as const,
    },
  ],
  locations: [
    {
      id: '1',
      lat: 40.7128,
      lng: -74.0060,
      type: 'risk' as const,
      title: 'Suspicious Login - New York',
      description: 'High-risk login detected',
      timestamp: new Date().toISOString(),
      riskLevel: 'high' as const,
    },
    {
      id: '2',
      lat: 34.0522,
      lng: -118.2437,
      type: 'transaction' as const,
      title: 'Large Transaction - Los Angeles',
      description: '$5,000 wire transfer',
      timestamp: new Date(Date.now() - 3600000).toISOString(),
      riskLevel: 'medium' as const,
    },
  ],
};
=======
/**
 * Visualization Service App - Production Entry Point
 * Feature: 002-visualization-microservice
 *
 * Main router and entry point for the Visualization microservice.
 * Provides comprehensive fraud detection visualizations with real-time updates.
 *
 * @module visualization/VisualizationApp
 */

import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { VisualizationErrorBoundary } from './components/VisualizationErrorBoundary';
import { VisualizationDashboard } from './pages/VisualizationDashboard';
import { InvestigationSelector } from './components/InvestigationSelector';
>>>>>>> 001-modify-analyzer-method

interface VisualizationAppProps {
  className?: string;
  investigationId?: string;
<<<<<<< HEAD
  realTime?: boolean;
=======
>>>>>>> 001-modify-analyzer-method
}

const VisualizationApp: React.FC<VisualizationAppProps> = ({
  className = '',
<<<<<<< HEAD
  investigationId,
  realTime = false,
}) => {
  const location = useLocation();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [serviceReady, setServiceReady] = useState(false);

  useEffect(() => {
    const initializeService = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Simulate service initialization
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Register service with event bus if available
        if (window.olorin?.eventBus) {
          window.olorin.eventBus.emit('service:ready', {
            service: 'visualization',
            timestamp: new Date().toISOString(),
            capabilities: ['maps', 'charts', 'risk-visualization', 'data-export']
          });

          // Listen for investigation updates
          window.olorin.eventBus.on('investigation:updated', (data: any) => {
            console.log('[Visualization Service] Investigation updated:', data);
          });

          // Listen for risk score updates
          window.olorin.eventBus.on('risk:updated', (data: any) => {
            console.log('[Visualization Service] Risk score updated:', data);
          });
        }

        setServiceReady(true);
        setIsLoading(false);
      } catch (err) {
        console.error('[Visualization Service] Initialization failed:', err);
        setError(err instanceof Error ? err.message : 'Service initialization failed');
        setIsLoading(false);
      }
=======
  investigationId: propInvestigationId
}) => {
  const navigate = useNavigate();
  const [selectedInvestigationId, setSelectedInvestigationId] = useState<string | undefined>(
    propInvestigationId
  );
  const [serviceReady, setServiceReady] = useState(false);

  useEffect(() => {
    const initializeService = () => {
      // Register service with event bus if available
      if (window.olorin?.eventBus && typeof window.olorin.eventBus.emit === 'function') {
        try {
          window.olorin.eventBus.emit('service:ready', {
            service: 'visualization',
            timestamp: new Date().toISOString(),
            capabilities: [
              'risk-visualization',
              'network-diagrams',
              'geographic-maps',
              'timelines',
              'real-time-monitoring',
              'charts',
              'dashboards'
            ]
          });
        } catch (error) {
          console.warn('[VisualizationApp] Failed to emit service:ready event:', error);
        }
      }

      setServiceReady(true);
>>>>>>> 001-modify-analyzer-method
    };

    initializeService();

    // Cleanup event listeners on unmount
    return () => {
<<<<<<< HEAD
      if (window.olorin?.eventBus) {
        window.olorin.eventBus.off('investigation:updated');
        window.olorin.eventBus.off('risk:updated');
=======
      if (window.olorin?.eventBus && typeof window.olorin.eventBus.off === 'function') {
        try {
          window.olorin.eventBus.off('investigation:updated');
          window.olorin.eventBus.off('risk:updated');
        } catch (error) {
          console.warn('[VisualizationApp] Failed to unregister event listeners:', error);
        }
>>>>>>> 001-modify-analyzer-method
      }
    };
  }, []);

<<<<<<< HEAD
  // Service health check
  const getServiceHealth = () => {
    return {
      status: serviceReady ? 'healthy' : error ? 'error' : 'initializing',
      timestamp: new Date().toISOString(),
      capabilities: ['maps', 'charts', 'risk-visualization', 'data-export'],
      version: '1.0.0',
    };
  };

  // Expose service health for monitoring
  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any).olorinVisualizationHealth = getServiceHealth;
    }
  }, [serviceReady, error]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-center">
          <LoadingSpinner size="lg" />
          <h2 className="mt-4 text-lg font-semibold text-gray-900">
            Loading Visualization Service
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Initializing data visualization components...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-center max-w-md">
          <div className="text-red-500 mb-4">
            <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">
            Visualization Service Error
          </h2>
          <p className="text-sm text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            Retry Service Initialization
          </button>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary serviceName="visualization">
      <div className={`visualization-service ${className}`}>
        <Routes>
          {/* Main Dashboard Route */}
          <Route
            path="/"
            element={
              <DataVisualization
                investigationId={investigationId}
                realTime={realTime}
              />
            }
          />

          {/* Standalone Map Route */}
          <Route
            path="/map"
            element={
              <div className="min-h-screen bg-gray-50 p-6">
                <div className="mb-6">
                  <h1 className="text-2xl font-bold text-gray-900">Geographic View</h1>
                  <p className="text-sm text-gray-600 mt-1">
                    Interactive map showing investigation locations and risk hotspots
                  </p>
                </div>
                <LocationMap
                  locations={mockVisualizationData.locations}
                  height="calc(100vh - 200px)"
                  showControls={true}
                  showFilters={true}
                  clustered={true}
                  onLocationClick={(location) => console.log('Location clicked:', location)}
                />
              </div>
            }
          />

          {/* Standalone Risk Analysis Route */}
          <Route
            path="/risk"
            element={
              <div className="min-h-screen bg-gray-50 p-6">
                <div className="mb-6">
                  <h1 className="text-2xl font-bold text-gray-900">Risk Analysis</h1>
                  <p className="text-sm text-gray-600 mt-1">
                    Detailed risk scoring and factor breakdown
                  </p>
                </div>
                <div className="space-y-6">
                  <OverallRiskScore
                    metrics={mockVisualizationData.riskMetrics}
                    size="lg"
                    showDetails={true}
                    animated={true}
                  />
                  <RiskScoreDisplay
                    overallScore={mockVisualizationData.riskMetrics.overallScore}
                    riskFactors={mockVisualizationData.riskFactors}
                    size="lg"
                    showDetails={true}
                    animated={true}
                  />
                </div>
              </div>
            }
          />

          {/* Charts and Trends Route */}
          <Route
            path="/charts"
            element={
              <div className="min-h-screen bg-gray-50 p-6">
                <div className="mb-6">
                  <h1 className="text-2xl font-bold text-gray-900">Charts & Analytics</h1>
                  <p className="text-sm text-gray-600 mt-1">
                    Statistical analysis and trending data visualization
                  </p>
                </div>
                <div className="bg-white rounded-lg border border-gray-200 p-8">
                  <div className="text-center">
                    <div className="text-gray-400 mb-4">
                      <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      Advanced Charts Coming Soon
                    </h3>
                    <p className="text-gray-600">
                      Interactive charts and statistical analysis tools will be available in the next update.
                    </p>
                  </div>
                </div>
              </div>
            }
          />

          {/* Service Health Route */}
          <Route
            path="/health"
            element={
              <div className="min-h-screen bg-gray-50 p-6">
                <div className="max-w-2xl mx-auto">
                  <h1 className="text-2xl font-bold text-gray-900 mb-6">
                    Visualization Service Health
                  </h1>
                  <div className="bg-white rounded-lg border border-gray-200 p-6">
                    <pre className="text-sm text-gray-700 whitespace-pre-wrap">
                      {JSON.stringify(getServiceHealth(), null, 2)}
                    </pre>
=======
  const handleInvestigationSelect = (investigationId: string) => {
    setSelectedInvestigationId(investigationId);
    navigate(`/visualization/${investigationId}`);
  };

  return (
    <VisualizationErrorBoundary>
      <div className={`visualization-service min-h-screen bg-gray-950 ${className}`}>
        <Routes>
          {/* Investigation-specific visualization dashboard */}
          <Route
            path="/:investigationId"
            element={<VisualizationDashboard />}
          />

          {/* Default route with investigation selector */}
          <Route
            path="/"
            element={
              <div className="flex items-center justify-center min-h-screen bg-gray-950 p-6">
                <div className="max-w-md w-full space-y-6">
                  <div className="text-center mb-8">
                    <div className="w-16 h-16 bg-purple-500/20 rounded-lg flex items-center justify-center mx-auto mb-4">
                      <svg
                        className="w-8 h-8 text-purple-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        aria-hidden="true"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                        />
                      </svg>
                    </div>
                    <h1 className="text-2xl font-bold text-gray-100 mb-2">Visualization Service</h1>
                    <p className="text-sm text-gray-400">
                      Interactive data visualization and network analysis tools
                    </p>
                  </div>

                  <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-6 space-y-4">
                    <h2 className="text-lg font-semibold text-gray-100 mb-4">
                      Select Investigation
                    </h2>

                    <InvestigationSelector
                      selectedId={selectedInvestigationId}
                      onSelect={handleInvestigationSelect}
                    />

                    <div className="pt-4 border-t border-gray-800">
                      <h3 className="text-sm font-medium text-gray-300 mb-2">Capabilities</h3>
                      <ul className="space-y-2 text-sm text-gray-400">
                        <li className="flex items-center gap-2">
                          <span className="w-1.5 h-1.5 bg-orange-500 rounded-full" />
                          Risk Score Visualization
                        </li>
                        <li className="flex items-center gap-2">
                          <span className="w-1.5 h-1.5 bg-cyan-500 rounded-full" />
                          Network Diagrams
                        </li>
                        <li className="flex items-center gap-2">
                          <span className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                          Geographic Maps
                        </li>
                        <li className="flex items-center gap-2">
                          <span className="w-1.5 h-1.5 bg-purple-500 rounded-full" />
                          Event Timelines
                        </li>
                        <li className="flex items-center gap-2">
                          <span className="w-1.5 h-1.5 bg-blue-500 rounded-full" />
                          Real-Time Monitoring
                        </li>
                        <li className="flex items-center gap-2">
                          <span className="w-1.5 h-1.5 bg-pink-500 rounded-full" />
                          Interactive Charts
                        </li>
                      </ul>
                    </div>
>>>>>>> 001-modify-analyzer-method
                  </div>
                </div>
              </div>
            }
          />

<<<<<<< HEAD
          {/* Default Redirect */}
=======
          {/* Fallback redirect */}
>>>>>>> 001-modify-analyzer-method
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>

        {/* Service Status Indicator */}
<<<<<<< HEAD
        <div className="fixed bottom-4 left-4 z-50">
          <div className="bg-white rounded-lg shadow-lg border border-gray-200 px-3 py-2">
            <div className="flex items-center space-x-2">
              <div className={`w-2 h-2 rounded-full ${
                serviceReady ? 'bg-green-500' : 'bg-yellow-500'
              }`} />
              <span className="text-xs font-medium text-gray-700">
                Visualization Service
              </span>
            </div>
          </div>
        </div>
      </div>
    </ErrorBoundary>
  );
};

export default VisualizationApp;
=======
        {serviceReady && (
          <div className="fixed bottom-4 right-4 z-50">
            <div className="bg-gray-900 border border-gray-700 rounded-lg shadow-lg px-3 py-2">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                <span className="text-xs font-medium text-gray-300">Visualization Service Active</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </VisualizationErrorBoundary>
  );
};

export default VisualizationApp;
>>>>>>> 001-modify-analyzer-method
