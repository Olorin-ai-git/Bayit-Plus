import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import ReportBuilder from './components/ReportBuilder';
import ReportDashboard from './components/ReportDashboard';
import ErrorBoundary from '@shared/components/ErrorBoundary';
import LoadingSpinner from '@shared/components/LoadingSpinner';

interface ReportingAppProps {
  className?: string;
  investigationId?: string;
}

const ReportingApp: React.FC<ReportingAppProps> = ({
  className = '',
  investigationId,
}) => {
  const location = useLocation();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [serviceReady, setServiceReady] = useState(false);
  const [currentView, setCurrentView] = useState<'dashboard' | 'builder' | 'viewer'>('dashboard');

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
            service: 'reporting',
            timestamp: new Date().toISOString(),
            capabilities: ['pdf-generation', 'report-templates', 'export-formats', 'document-management']
          });

          // Listen for investigation events
          window.olorin.eventBus.on('investigation:completed', (data: any) => {
            console.log('[Reporting Service] Investigation completed:', data);
            // Auto-suggest creating a report
          });

          // Listen for report generation requests
          window.olorin.eventBus.on('report:generate', (data: any) => {
            console.log('[Reporting Service] Report generation requested:', data);
            setCurrentView('builder');
          });
        }

        setServiceReady(true);
        setIsLoading(false);
      } catch (err) {
        console.error('[Reporting Service] Initialization failed:', err);
        setError(err instanceof Error ? err.message : 'Service initialization failed');
        setIsLoading(false);
      }
    };

    initializeService();

    // Cleanup event listeners on unmount
    return () => {
      if (window.olorin?.eventBus) {
        window.olorin.eventBus.off('investigation:completed');
        window.olorin.eventBus.off('report:generate');
      }
    };
  }, []);

  // Service health check
  const getServiceHealth = () => {
    return {
      status: serviceReady ? 'healthy' : error ? 'error' : 'initializing',
      timestamp: new Date().toISOString(),
      capabilities: ['pdf-generation', 'report-templates', 'export-formats', 'document-management'],
      version: '1.0.0',
    };
  };

  // Expose service health for monitoring
  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any).olorinReportingHealth = getServiceHealth;
    }
  }, [serviceReady, error]);

  const handleCreateReport = () => {
    setCurrentView('builder');
  };

  const handleEditReport = (reportId: string) => {
    console.log('Edit report:', reportId);
    setCurrentView('builder');
  };

  const handleViewReport = (reportId: string) => {
    console.log('View report:', reportId);
    setCurrentView('viewer');
  };

  const handleDeleteReport = (reportId: string) => {
    console.log('Delete report:', reportId);
    // In production, this would show confirmation dialog and delete report
  };

  const handleSaveTemplate = (template: any) => {
    console.log('Save template:', template);
    // In production, this would save to backend

    // Emit event for other services
    if (window.olorin?.eventBus) {
      window.olorin.eventBus.emit('report:template:saved', {
        templateId: template.id,
        name: template.name,
        timestamp: new Date().toISOString(),
      });
    }
  };

  const handleExportReport = (template: any, format: string) => {
    console.log('Export report:', template, format);
    // In production, this would generate and download the report

    // Emit event for analytics
    if (window.olorin?.eventBus) {
      window.olorin.eventBus.emit('report:exported', {
        templateId: template.id,
        format,
        investigationId,
        timestamp: new Date().toISOString(),
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-center">
          <LoadingSpinner size="lg" />
          <h2 className="mt-4 text-lg font-semibold text-gray-900">
            Loading Reporting Service
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Initializing report generation and document management...
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
            Reporting Service Error
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
    <ErrorBoundary serviceName="reporting">
      <div className={`reporting-service min-h-screen bg-gray-50 ${className}`}>
        <Routes>
          {/* Main Dashboard Route */}
          <Route
            path="/"
            element={
              <div className="p-6">
                <ReportDashboard
                  onCreateReport={handleCreateReport}
                  onEditReport={handleEditReport}
                  onViewReport={handleViewReport}
                  onDeleteReport={handleDeleteReport}
                />
              </div>
            }
          />

          {/* Report Builder Route */}
          <Route
            path="/builder"
            element={
              <div className="p-6">
                <div className="mb-6">
                  <button
                    onClick={() => setCurrentView('dashboard')}
                    className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                  >
                    ← Back to Reports
                  </button>
                </div>
                <ReportBuilder
                  investigationId={investigationId}
                  onSave={handleSaveTemplate}
                  onExport={handleExportReport}
                />
              </div>
            }
          />

          {/* Report Templates Route */}
          <Route
            path="/templates"
            element={
              <div className="p-6">
                <div className="mb-6">
                  <h1 className="text-2xl font-bold text-gray-900">Report Templates</h1>
                  <p className="text-sm text-gray-600 mt-1">
                    Manage and customize report templates for different investigation types
                  </p>
                </div>
                <div className="bg-white rounded-lg border border-gray-200 p-8">
                  <div className="text-center">
                    <div className="text-gray-400 mb-4">
                      <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      Template Management Coming Soon
                    </h3>
                    <p className="text-gray-600">
                      Advanced template management features will be available in the next update.
                    </p>
                  </div>
                </div>
              </div>
            }
          />

          {/* Report Analytics Route */}
          <Route
            path="/analytics"
            element={
              <div className="p-6">
                <div className="mb-6">
                  <h1 className="text-2xl font-bold text-gray-900">Report Analytics</h1>
                  <p className="text-sm text-gray-600 mt-1">
                    View usage statistics and performance metrics for generated reports
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
                      Analytics Dashboard Coming Soon
                    </h3>
                    <p className="text-gray-600">
                      Detailed analytics and reporting metrics will be available in the next update.
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
              <div className="p-6">
                <div className="max-w-2xl mx-auto">
                  <h1 className="text-2xl font-bold text-gray-900 mb-6">
                    Reporting Service Health
                  </h1>
                  <div className="bg-white rounded-lg border border-gray-200 p-6">
                    <pre className="text-sm text-gray-700 whitespace-pre-wrap">
                      {JSON.stringify(getServiceHealth(), null, 2)}
                    </pre>
                  </div>
                </div>
              </div>
            }
          />

          {/* Default Redirect */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>

        {/* Service Status Indicator */}
        <div className="fixed bottom-4 left-4 z-50">
          <div className="bg-white rounded-lg shadow-lg border border-gray-200 px-3 py-2">
            <div className="flex items-center space-x-2">
              <div className={`w-2 h-2 rounded-full ${
                serviceReady ? 'bg-green-500' : 'bg-yellow-500'
              }`} />
              <span className="text-xs font-medium text-gray-700">
                Reporting Service
              </span>
            </div>
          </div>
        </div>
      </div>
    </ErrorBoundary>
  );
};

export default ReportingApp;