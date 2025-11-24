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

interface VisualizationAppProps {
  className?: string;
  investigationId?: string;
}

const VisualizationApp: React.FC<VisualizationAppProps> = ({
  className = '',
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
    };

    initializeService();

    // Cleanup event listeners on unmount
    return () => {
      if (window.olorin?.eventBus && typeof window.olorin.eventBus.off === 'function') {
        try {
          window.olorin.eventBus.off('investigation:updated');
          window.olorin.eventBus.off('risk:updated');
        } catch (error) {
          console.warn('[VisualizationApp] Failed to unregister event listeners:', error);
        }
      }
    };
  }, []);

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
                  </div>
                </div>
              </div>
            }
          />

          {/* Fallback redirect */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>

        {/* Service Status Indicator */}
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
