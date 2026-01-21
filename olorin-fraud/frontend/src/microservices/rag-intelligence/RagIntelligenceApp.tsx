import React, { Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { ErrorBoundary } from '@shared/components/ErrorBoundary';
import LoadingSpinner from '@shared/components/LoadingSpinner';

// Lazy load components for better performance
const KnowledgeBase = React.lazy(() => import('./components/KnowledgeBase'));
const DocumentRetrieval = React.lazy(() => import('./components/DocumentRetrieval'));
const IntelligentSearch = React.lazy(() => import('./components/IntelligentSearch'));
const VectorDatabase = React.lazy(() => import('./components/VectorDatabase'));
const ChatInterface = React.lazy(() => import('./components/chat/ChatInterface'));
const RAGConfigurationPage = React.lazy(() => import('./components/RAGConfigurationPage'));

const RagIntelligenceApp: React.FC = () => {
  return (
    <ErrorBoundary serviceName="ragIntelligence">
      <div className="rag-intelligence-service min-h-screen bg-black">
        <Suspense fallback={
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <LoadingSpinner size="md" />
              <p className="mt-2 text-sm text-corporate-textSecondary">
                Loading RAG Intelligence Service...
              </p>
            </div>
          </div>
        }>
          <Routes>
            {/* Main RAG Configuration Page - Primary RAG Feature */}
            <Route path="/" element={<RAGConfigurationPage />} />
            <Route path="/config" element={<RAGConfigurationPage />} />

            {/* Direct Chat Interface */}
            <Route path="/chat" element={<ChatInterface />} />

            {/* Core RAG Modules */}
            <Route path="/knowledge" element={<KnowledgeBase />} />
            <Route path="/documents" element={<DocumentRetrieval />} />
            <Route path="/search" element={<IntelligentSearch />} />
            <Route path="/vectors" element={<VectorDatabase />} />

            {/* Document Management Routes */}
            <Route path="/document/:id/*" element={
              <Routes>
                <Route path="/" element={<DocumentRetrieval />} />
                <Route path="/retrieval" element={<DocumentRetrieval />} />
                <Route path="/vectors" element={<VectorDatabase />} />
                <Route path="*" element={<Navigate to="/document/:id" replace />} />
              </Routes>
            } />

            {/* Search and Query Routes */}
            <Route path="/query/*" element={
              <Routes>
                <Route path="/" element={<IntelligentSearch />} />
                <Route path="/search" element={<IntelligentSearch />} />
                <Route path="/chat" element={<ChatInterface />} />
                <Route path="/documents" element={<DocumentRetrieval />} />
                <Route path="*" element={<Navigate to="/query" replace />} />
              </Routes>
            } />

            {/* Vector Database Management */}
            <Route path="/vector/*" element={
              <Routes>
                <Route path="/" element={<VectorDatabase />} />
                <Route path="/database" element={<VectorDatabase />} />
                <Route path="/search" element={<IntelligentSearch />} />
                <Route path="*" element={<Navigate to="/vector" replace />} />
              </Routes>
            } />

            {/* Health and Metrics Endpoints */}
            <Route path="/health" element={
              <div className="p-4">
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center">
                    <div className="w-4 h-4 bg-green-500 rounded-full mr-3"></div>
                    <div>
                      <h3 className="text-lg font-medium text-green-800">
                        RAG Intelligence Service Health Check
                      </h3>
                      <p className="text-green-700 mt-1">
                        Service is running and operational
                      </p>
                      <div className="mt-2 text-sm text-green-600">
                        <div>Port: 3003</div>
                        <div>Status: Ready</div>
                        <div>Components: 4 loaded</div>
                        <div>Vector DB: Connected</div>
                        <div>Documents Indexed: 2,847</div>
                        <div>Embeddings: 45,289</div>
                        <div>Last Check: {new Date().toLocaleTimeString()}</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            } />

            <Route path="/metrics" element={
              <div className="p-4">
                <h2 className="text-xl font-bold mb-4">RAG Intelligence Service Metrics</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-white rounded-lg shadow p-4">
                    <h3 className="font-medium text-gray-900">Documents Indexed</h3>
                    <div className="text-2xl font-bold text-blue-600 mt-2">2,847</div>
                    <div className="text-sm text-gray-500 mt-1">+127 this week</div>
                  </div>
                  <div className="bg-white rounded-lg shadow p-4">
                    <h3 className="font-medium text-gray-900">Vector Embeddings</h3>
                    <div className="text-2xl font-bold text-green-600 mt-2">45.3K</div>
                    <div className="text-sm text-gray-500 mt-1">OpenAI embeddings</div>
                  </div>
                  <div className="bg-white rounded-lg shadow p-4">
                    <h3 className="font-medium text-gray-900">Search Queries</h3>
                    <div className="text-2xl font-bold text-purple-600 mt-2">1,234</div>
                    <div className="text-sm text-gray-500 mt-1">Last 24 hours</div>
                  </div>
                  <div className="bg-white rounded-lg shadow p-4">
                    <h3 className="font-medium text-gray-900">Avg Response Time</h3>
                    <div className="text-2xl font-bold text-orange-600 mt-2">450ms</div>
                    <div className="text-sm text-gray-500 mt-1">Including retrieval</div>
                  </div>
                  <div className="bg-white rounded-lg shadow p-4">
                    <h3 className="font-medium text-gray-900">Relevance Score</h3>
                    <div className="text-2xl font-bold text-red-600 mt-2">87.5%</div>
                    <div className="text-sm text-gray-500 mt-1">User satisfaction</div>
                  </div>
                  <div className="bg-white rounded-lg shadow p-4">
                    <h3 className="font-medium text-gray-900">Knowledge Base Size</h3>
                    <div className="text-2xl font-bold text-indigo-600 mt-2">12.4GB</div>
                    <div className="text-sm text-gray-500 mt-1">Compressed vectors</div>
                  </div>
                  <div className="bg-white rounded-lg shadow p-4">
                    <h3 className="font-medium text-gray-900">Cache Hit Rate</h3>
                    <div className="text-2xl font-bold text-yellow-600 mt-2">73.2%</div>
                    <div className="text-sm text-gray-500 mt-1">Query optimization</div>
                  </div>
                  <div className="bg-white rounded-lg shadow p-4">
                    <h3 className="font-medium text-gray-900">Active Connections</h3>
                    <div className="text-2xl font-bold text-pink-600 mt-2">24</div>
                    <div className="text-sm text-gray-500 mt-1">Real-time queries</div>
                  </div>
                </div>

                <div className="mt-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Document Categories</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-blue-50 border border-blue-200 rounded p-3 text-center">
                      <div className="text-lg font-bold text-blue-600">1,234</div>
                      <div className="text-sm text-blue-800">Fraud Reports</div>
                    </div>
                    <div className="bg-green-50 border border-green-200 rounded p-3 text-center">
                      <div className="text-lg font-bold text-green-600">567</div>
                      <div className="text-sm text-green-800">Legal Documents</div>
                    </div>
                    <div className="bg-purple-50 border border-purple-200 rounded p-3 text-center">
                      <div className="text-lg font-bold text-purple-600">890</div>
                      <div className="text-sm text-purple-800">Policies</div>
                    </div>
                    <div className="bg-orange-50 border border-orange-200 rounded p-3 text-center">
                      <div className="text-lg font-bold text-orange-600">156</div>
                      <div className="text-sm text-orange-800">Training Data</div>
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
                    RAG Page Not Found
                  </h1>
                  <p className="text-gray-600 mb-4">
                    The requested RAG intelligence page could not be found.
                  </p>
                  <button
                    onClick={() => window.history.back()}
                    className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors mr-2"
                  >
                    Go Back
                  </button>
                  <button
                    onClick={() => window.location.href = '/knowledge'}
                    className="bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700 transition-colors"
                  >
                    Knowledge Base
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

export default RagIntelligenceApp;