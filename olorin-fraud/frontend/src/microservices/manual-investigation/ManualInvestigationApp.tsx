import React, { useState, useEffect } from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { createServiceConfig, ServiceFactory } from './services/';
import SimpleInvestigationDashboard from './components/SimpleInvestigationDashboard';
import InvestigationDetailView from './components/InvestigationDetailView';
import { SimpleNotificationContainer } from './components/SimpleNotificationContainer';

interface ManualInvestigationAppProps {
  className?: string;
  config?: {
    apiBaseUrl?: string;
    websocketUrl?: string;
    debugMode?: boolean;
  };
}

export const ManualInvestigationApp: React.FC<ManualInvestigationAppProps> = ({
  className = '',
  config = {}
}) => {
  const [serviceFactory, setServiceFactory] = useState<ServiceFactory | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'error'>('connecting');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    initializeServices();
  }, []);

  const initializeServices = async () => {
    try {
      setError(null);
      setConnectionStatus('connecting');

      // Create service configuration with browser-safe defaults
      const serviceConfig = createServiceConfig({
        api_base_url: config.apiBaseUrl || 'http://localhost:8090',
        websocket_url: config.websocketUrl || 'ws://localhost:8090/ws',
        debug_mode: config.debugMode ?? true,
        enable_real_time: true,
        timeout_ms: 30000,
        retry_attempts: 3
      });

      // Initialize service factory
      const factory = new ServiceFactory(serviceConfig);
      setServiceFactory(factory);
      setConnectionStatus('connected');

    } catch (err) {
      console.error('Failed to initialize services:', err);
      setError(`Service initialization failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
      setConnectionStatus('error');
    }
  };

  if (connectionStatus === 'connecting') {
    return (
      <div className={`min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center ${className}`}>
        <div className="text-center">
          <div className="w-24 h-24 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-3xl flex items-center justify-center text-4xl mx-auto mb-6 shadow-xl animate-pulse">
            🔍
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Initializing Manual Investigation Service
          </h2>
          <p className="text-gray-600">
            Setting up services and connections...
          </p>
        </div>
      </div>
    );
  }

  if (connectionStatus === 'error') {
    return (
      <div className={`min-h-screen bg-gradient-to-br from-red-50 to-orange-50 flex items-center justify-center ${className}`}>
        <div className="max-w-2xl mx-auto px-4 text-center">
          <div className="w-24 h-24 bg-gradient-to-br from-red-600 to-orange-700 rounded-3xl flex items-center justify-center text-4xl mx-auto mb-6 shadow-xl">
            ⚠️
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Service Initialization Error</h2>
          <p className="text-red-600 mb-6">{error}</p>
          <button
            onClick={initializeServices}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Retry Connection
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <Routes>
        {/* Main dashboard route */}
        <Route path="/" element={
          <div className={`min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 ${className}`}>
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
              {/* Header */}
              <div className="text-center mb-8">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-4 shadow-lg">
                  🔍
                </div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">Manual Investigation Service</h1>
                <p className="text-gray-600">AI-powered fraud detection and investigation platform</p>
              </div>

              {/* Service Status */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <span className="flex items-center gap-2 text-sm text-green-600">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      Service Active
                    </span>
                    <span className="text-sm text-gray-500">API: {serviceFactory?.getConfig().api_base_url}</span>
                  </div>
                  <div className="flex gap-2">
                    <button className="px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors">
                      Settings
                    </button>
                    <button
                      onClick={initializeServices}
                      className="px-3 py-1.5 text-sm bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
                    >
                      Reconnect
                    </button>
                  </div>
                </div>
              </div>

              {/* Main Dashboard */}
              <SimpleInvestigationDashboard />
            </div>
          </div>
        } />

      {/* Investigation detail route */}
      <Route path="/detail/:id" element={<InvestigationDetailView />} />

      {/* Edit route (placeholder for now) */}
      <Route path="/edit/:id" element={
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
          <div className="text-center">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">✏️</span>
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Edit Investigation</h2>
            <p className="text-gray-600 mb-4">Edit functionality coming soon...</p>
            <button
              onClick={() => window.history.back()}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Go Back
            </button>
          </div>
        </div>
      } />
      </Routes>

      {/* Global Notification Container */}
      <SimpleNotificationContainer />
    </>
  );
};

export default ManualInvestigationApp;