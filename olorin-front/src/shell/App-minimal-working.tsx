import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
<<<<<<< HEAD
import { EventBusManager, eventBus } from '@shared/events/eventBus';
import './globals';
import ErrorBoundary from '@shared/components/ErrorBoundary';
=======
import { EventBusManager, eventBus } from '@shared/events/UnifiedEventBus';
import './globals';
import { ErrorBoundary } from '@shared/components/ErrorBoundary';
>>>>>>> 001-modify-analyzer-method
import LoadingSpinner from '@shared/components/LoadingSpinner';

interface ShellState {
  isInitialized: boolean;
  error: string | null;
}

const App: React.FC = () => {
  const [shellState, setShellState] = useState<ShellState>({
    isInitialized: false,
    error: null
  });

  useEffect(() => {
    initializeShell();
  }, []);

  const initializeShell = async () => {
    try {
      // Initialize event bus
      const eventBusManager = new EventBusManager();
      window.olorin.eventBus = eventBus;
      window.olorin.eventBusManager = eventBusManager;

      console.log('[Shell] Event bus initialized');

      setShellState({
        isInitialized: true,
        error: null
      });

      console.log('[Shell] Shell application initialized successfully');
    } catch (error) {
      console.error('[Shell] Failed to initialize shell:', error);
      setShellState({
        isInitialized: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };

  if (shellState.error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-6">
          <div className="flex items-center justify-center w-12 h-12 mx-auto bg-red-100 rounded-full mb-4">
            <svg className="w-6 h-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h1 className="text-xl font-semibold text-gray-900 text-center mb-2">
            Shell Initialization Error
          </h1>
          <p className="text-gray-600 text-center mb-4">
            {shellState.error}
          </p>
          <button
            onClick={() => window.location.reload()}
            className="w-full bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
          >
            Reload Application
          </button>
        </div>
      </div>
    );
  }

  if (!shellState.isInitialized) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <LoadingSpinner size="large" text="Initializing Olorin Shell..." />
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <BrowserRouter>
        <div className="min-h-screen bg-gray-50">
          <header className="bg-white shadow-sm border-b border-gray-200">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex justify-between items-center h-16">
                <div className="flex items-center">
                  <h1 className="text-xl font-semibold text-gray-900">
                    Olorin Shell
                  </h1>
                </div>
                <div className="flex items-center space-x-4">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    Initialized
                  </span>
                </div>
              </div>
            </div>
          </header>

          <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
            <div className="px-4 py-6 sm:px-0">
              <div className="border-4 border-dashed border-gray-200 rounded-lg h-96 flex items-center justify-center">
                <div className="text-center">
                  <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                    Olorin Microservices Shell
                  </h2>
                  <p className="text-gray-600 mb-6">
                    Shell application is running successfully.
                  </p>
                  <div className="space-y-2">
                    <p className="text-sm text-gray-500">
                      Event Bus: ✅ Initialized
                    </p>
                    <p className="text-sm text-gray-500">
                      Environment: {process.env.NODE_ENV}
                    </p>
                    <p className="text-sm text-gray-500">
                      Service: {process.env.SERVICE_NAME || 'shell'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </main>

          <Routes>
            <Route path="/" element={
              <div className="text-center p-8">
                <h3 className="text-lg font-medium text-gray-900">Shell Home</h3>
                <p className="text-gray-600">Microservices will be loaded here</p>
              </div>
            } />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </BrowserRouter>
    </ErrorBoundary>
  );
};

export default App;