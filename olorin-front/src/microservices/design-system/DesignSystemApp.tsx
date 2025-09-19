import React, { Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import ErrorBoundary from '@shared/components/ErrorBoundary';
import LoadingSpinner from '@shared/components/LoadingSpinner';

// Lazy load components for better performance
const DesignSystemFoundation = React.lazy(() => import('./components/DesignSystemFoundation'));

const DesignSystemApp: React.FC = () => {
  return (
    <ErrorBoundary serviceName="designSystem">
      <div className="design-system-service min-h-screen bg-gray-50">
        <Suspense fallback={
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <LoadingSpinner size="md" />
              <p className="mt-2 text-sm text-gray-600">
                Loading Design System Service...
              </p>
            </div>
          </div>
        }>
          <Routes>
            {/* Main Design System */}
            <Route path="/" element={<DesignSystemFoundation />} />
            <Route path="/foundation" element={<DesignSystemFoundation />} />

            {/* Design System Documentation Routes */}
            <Route path="/tokens" element={
              <div className="p-6">
                <h1 className="text-3xl font-bold text-gray-900 mb-6">Design Tokens</h1>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Colors */}
                  <div className="bg-white rounded-lg shadow p-6">
                    <h2 className="text-xl font-semibold text-gray-800 mb-4">Color Palette</h2>
                    <div className="space-y-3">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-blue-600 rounded"></div>
                        <span className="text-sm">Primary Blue (#2563EB)</span>
                      </div>
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-green-600 rounded"></div>
                        <span className="text-sm">Success Green (#059669)</span>
                      </div>
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-red-600 rounded"></div>
                        <span className="text-sm">Error Red (#DC2626)</span>
                      </div>
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-yellow-500 rounded"></div>
                        <span className="text-sm">Warning Yellow (#EAB308)</span>
                      </div>
                    </div>
                  </div>

                  {/* Typography */}
                  <div className="bg-white rounded-lg shadow p-6">
                    <h2 className="text-xl font-semibold text-gray-800 mb-4">Typography</h2>
                    <div className="space-y-3">
                      <div className="text-3xl font-bold">Heading 1</div>
                      <div className="text-2xl font-bold">Heading 2</div>
                      <div className="text-xl font-semibold">Heading 3</div>
                      <div className="text-lg font-medium">Heading 4</div>
                      <div className="text-base">Body Text</div>
                      <div className="text-sm text-gray-600">Caption Text</div>
                    </div>
                  </div>

                  {/* Spacing */}
                  <div className="bg-white rounded-lg shadow p-6">
                    <h2 className="text-xl font-semibold text-gray-800 mb-4">Spacing Scale</h2>
                    <div className="space-y-2">
                      <div className="flex items-center space-x-3">
                        <div className="w-1 h-4 bg-gray-400"></div>
                        <span className="text-sm">xs (4px)</span>
                      </div>
                      <div className="flex items-center space-x-3">
                        <div className="w-2 h-4 bg-gray-400"></div>
                        <span className="text-sm">sm (8px)</span>
                      </div>
                      <div className="flex items-center space-x-3">
                        <div className="w-4 h-4 bg-gray-400"></div>
                        <span className="text-sm">md (16px)</span>
                      </div>
                      <div className="flex items-center space-x-3">
                        <div className="w-6 h-4 bg-gray-400"></div>
                        <span className="text-sm">lg (24px)</span>
                      </div>
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-4 bg-gray-400"></div>
                        <span className="text-sm">xl (32px)</span>
                      </div>
                    </div>
                  </div>

                  {/* Shadows */}
                  <div className="bg-white rounded-lg shadow p-6">
                    <h2 className="text-xl font-semibold text-gray-800 mb-4">Shadows</h2>
                    <div className="space-y-4">
                      <div className="p-3 bg-gray-50 rounded shadow-sm">Small Shadow</div>
                      <div className="p-3 bg-gray-50 rounded shadow">Medium Shadow</div>
                      <div className="p-3 bg-gray-50 rounded shadow-lg">Large Shadow</div>
                      <div className="p-3 bg-gray-50 rounded shadow-xl">XL Shadow</div>
                    </div>
                  </div>
                </div>
              </div>
            } />

            {/* Components Gallery */}
            <Route path="/components" element={
              <div className="p-6">
                <h1 className="text-3xl font-bold text-gray-900 mb-6">Component Gallery</h1>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Buttons */}
                  <div className="bg-white rounded-lg shadow p-6">
                    <h2 className="text-xl font-semibold text-gray-800 mb-4">Buttons</h2>
                    <div className="space-y-3">
                      <div className="flex space-x-3">
                        <button className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700">Primary</button>
                        <button className="bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700">Secondary</button>
                        <button className="border border-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-50">Outline</button>
                      </div>
                      <div className="flex space-x-3">
                        <button className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700">Success</button>
                        <button className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700">Danger</button>
                        <button className="bg-yellow-500 text-white px-4 py-2 rounded-md hover:bg-yellow-600">Warning</button>
                      </div>
                    </div>
                  </div>

                  {/* Form Elements */}
                  <div className="bg-white rounded-lg shadow p-6">
                    <h2 className="text-xl font-semibold text-gray-800 mb-4">Form Elements</h2>
                    <div className="space-y-3">
                      <input type="text" placeholder="Text Input" className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />
                      <select className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                        <option>Select Option</option>
                        <option>Option 1</option>
                        <option>Option 2</option>
                      </select>
                      <textarea placeholder="Textarea" className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" rows={3}></textarea>
                    </div>
                  </div>

                  {/* Cards */}
                  <div className="bg-white rounded-lg shadow p-6">
                    <h2 className="text-xl font-semibold text-gray-800 mb-4">Cards</h2>
                    <div className="space-y-3">
                      <div className="p-4 border border-gray-200 rounded-lg">
                        <h3 className="font-medium">Basic Card</h3>
                        <p className="text-sm text-gray-600 mt-1">Card description</p>
                      </div>
                      <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                        <h3 className="font-medium text-blue-900">Info Card</h3>
                        <p className="text-sm text-blue-700 mt-1">Information card variant</p>
                      </div>
                    </div>
                  </div>

                  {/* Alerts */}
                  <div className="bg-white rounded-lg shadow p-6">
                    <h2 className="text-xl font-semibold text-gray-800 mb-4">Alerts</h2>
                    <div className="space-y-3">
                      <div className="p-3 bg-green-50 border border-green-200 rounded text-green-800">
                        Success Alert
                      </div>
                      <div className="p-3 bg-yellow-50 border border-yellow-200 rounded text-yellow-800">
                        Warning Alert
                      </div>
                      <div className="p-3 bg-red-50 border border-red-200 rounded text-red-800">
                        Error Alert
                      </div>
                      <div className="p-3 bg-blue-50 border border-blue-200 rounded text-blue-800">
                        Info Alert
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            } />

            {/* Health and Metrics Endpoints */}
            <Route path="/health" element={
              <div className="p-4">
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center">
                    <div className="w-4 h-4 bg-green-500 rounded-full mr-3"></div>
                    <div>
                      <h3 className="text-lg font-medium text-green-800">
                        Design System Service Health Check
                      </h3>
                      <p className="text-green-700 mt-1">
                        Service is running and operational
                      </p>
                      <div className="mt-2 text-sm text-green-600">
                        <div>Port: 3007</div>
                        <div>Status: Ready</div>
                        <div>Components: 1 loaded</div>
                        <div>Design Tokens: Loaded</div>
                        <div>Theme: Olorin v1.0.0</div>
                        <div>Last Check: {new Date().toLocaleTimeString()}</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            } />

            {/* Catch-all route */}
            <Route path="*" element={
              <div className="flex items-center justify-center h-64">
                <div className="text-center">
                  <h1 className="text-2xl font-bold text-gray-900 mb-2">
                    Design System Page Not Found
                  </h1>
                  <p className="text-gray-600 mb-4">
                    The requested design system page could not be found.
                  </p>
                  <button
                    onClick={() => window.history.back()}
                    className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors mr-2"
                  >
                    Go Back
                  </button>
                  <button
                    onClick={() => window.location.href = '/'}
                    className="bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700 transition-colors"
                  >
                    Design System Home
                  </button>
                </div>
              </div>
            } />
          </Routes>
        </Suspense>
      </div>
    </ErrorBoundary>
  );
};

export default DesignSystemApp;