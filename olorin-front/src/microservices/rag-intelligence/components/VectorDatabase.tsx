import React, { useState, useMemo, useCallback } from 'react';
import {
  VectorIndex,
  VectorSearchQuery,
  VectorSearchResult,
  VectorIndexParameters,
  Document,
  DocumentChunk
} from '../types/ragIntelligence';

interface VectorDatabaseProps {
  vectorIndexes: VectorIndex[];
  onCreateIndex?: (index: Omit<VectorIndex, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  onUpdateIndex?: (id: string, updates: Partial<VectorIndex>) => Promise<void>;
  onDeleteIndex?: (id: string) => Promise<void>;
  onRebuildIndex?: (id: string) => Promise<void>;
  onVectorSearch?: (indexId: string, query: VectorSearchQuery) => Promise<VectorSearchResult[]>;
  onUploadVectors?: (indexId: string, vectors: { id: string; vector: number[]; metadata: any }[]) => Promise<void>;
  isLoading?: boolean;
  className?: string;
}

interface CreateIndexForm {
  name: string;
  description: string;
  dimension: number;
  metric: 'cosine' | 'euclidean' | 'dot_product';
  algorithm: 'hnsw' | 'ivf' | 'flat';
  parameters: VectorIndexParameters;
}

interface SearchForm {
  query: string;
  k: number;
  useTextQuery: boolean;
  vectorInput: string;
  filters: { field: string; operator: string; value: string }[];
}

export const VectorDatabase: React.FC<VectorDatabaseProps> = ({
  vectorIndexes,
  onCreateIndex,
  onUpdateIndex,
  onDeleteIndex,
  onRebuildIndex,
  onVectorSearch,
  onUploadVectors,
  isLoading = false,
  className = ''
}) => {
  const [selectedIndex, setSelectedIndex] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'search' | 'manage' | 'analytics'>('overview');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [searchResults, setSearchResults] = useState<VectorSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const [createForm, setCreateForm] = useState<CreateIndexForm>({
    name: '',
    description: '',
    dimension: 1536,
    metric: 'cosine',
    algorithm: 'hnsw',
    parameters: {
      efConstruction: 200,
      m: 16,
      efSearch: 100
    }
  });

  const [searchForm, setSearchForm] = useState<SearchForm>({
    query: '',
    k: 10,
    useTextQuery: true,
    vectorInput: '',
    filters: []
  });

  const selectedIndexData = useMemo(() => {
    return vectorIndexes.find(index => index.id === selectedIndex) || null;
  }, [vectorIndexes, selectedIndex]);

  const handleCreateIndex = useCallback(async () => {
    if (!onCreateIndex || !createForm.name.trim()) return;

    try {
      const newIndex = {
        name: createForm.name.trim(),
        description: createForm.description.trim(),
        dimension: createForm.dimension,
        metric: createForm.metric,
        algorithm: createForm.algorithm,
        parameters: createForm.parameters,
        status: 'building' as const,
        vectorCount: 0,
        memoryUsage: 0
      };

      await onCreateIndex(newIndex);
      setShowCreateModal(false);
      setCreateForm({
        name: '',
        description: '',
        dimension: 1536,
        metric: 'cosine',
        algorithm: 'hnsw',
        parameters: {
          efConstruction: 200,
          m: 16,
          efSearch: 100
        }
      });
    } catch (error) {
      console.error('Error creating index:', error);
    }
  }, [onCreateIndex, createForm]);

  const handleVectorSearch = useCallback(async () => {
    if (!onVectorSearch || !selectedIndex || (!searchForm.query.trim() && !searchForm.vectorInput.trim())) return;

    setIsSearching(true);
    try {
      let queryVector: number[];

      if (searchForm.useTextQuery && searchForm.query.trim()) {
        // In a real implementation, this would convert text to embeddings
        // For now, we'll generate a random vector for demonstration
        queryVector = Array.from({ length: selectedIndexData?.dimension || 1536 }, () => Math.random() - 0.5);
      } else {
        // Parse manual vector input
        try {
          queryVector = JSON.parse(searchForm.vectorInput);
        } catch {
          queryVector = searchForm.vectorInput.split(',').map(v => parseFloat(v.trim())).filter(v => !isNaN(v));
        }
      }

      if (queryVector.length !== selectedIndexData?.dimension) {
        throw new Error(`Vector dimension mismatch. Expected ${selectedIndexData?.dimension}, got ${queryVector.length}`);
      }

      const searchQuery: VectorSearchQuery = {
        vector: queryVector,
        k: searchForm.k,
        filters: searchForm.filters.length > 0 ? searchForm.filters.map(f => ({
          field: f.field,
          operator: f.operator,
          value: f.value
        })) : undefined,
        searchParams: selectedIndexData?.algorithm === 'hnsw' ? {
          ef: selectedIndexData.parameters.efSearch
        } : undefined
      };

      const results = await onVectorSearch(selectedIndex, searchQuery);
      setSearchResults(results);
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setIsSearching(false);
    }
  }, [onVectorSearch, selectedIndex, selectedIndexData, searchForm]);

  const addFilter = useCallback(() => {
    setSearchForm(prev => ({
      ...prev,
      filters: [...prev.filters, { field: '', operator: 'equals', value: '' }]
    }));
  }, []);

  const removeFilter = useCallback((index: number) => {
    setSearchForm(prev => ({
      ...prev,
      filters: prev.filters.filter((_, i) => i !== index)
    }));
  }, []);

  const updateFilter = useCallback((index: number, field: string, value: string) => {
    setSearchForm(prev => ({
      ...prev,
      filters: prev.filters.map((filter, i) =>
        i === index ? { ...filter, [field]: value } : filter
      )
    }));
  }, []);

  const formatMemoryUsage = (bytes: number): string => {
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }

    return `${size.toFixed(1)} ${units[unitIndex]}`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ready': return 'bg-green-100 text-green-800';
      case 'building': return 'bg-yellow-100 text-yellow-800';
      case 'updating': return 'bg-blue-100 text-blue-800';
      case 'error': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const renderIndexGrid = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {vectorIndexes.map((index) => (
        <div
          key={index.id}
          onClick={() => setSelectedIndex(index.id)}
          className={`bg-white rounded-lg border p-6 cursor-pointer transition-all hover:shadow-md ${
            selectedIndex === index.id ? 'border-blue-500 ring-2 ring-blue-200' : 'border-gray-200'
          }`}
        >
          <div className="flex items-start justify-between mb-3">
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-900 mb-1">{index.name}</h3>
              <p className="text-sm text-gray-600 line-clamp-2">{index.description}</p>
            </div>
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(index.status)}`}>
              {index.status}
            </span>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500">Vectors:</span>
              <span className="font-medium">{index.vectorCount.toLocaleString()}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500">Dimension:</span>
              <span className="font-medium">{index.dimension}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500">Algorithm:</span>
              <span className="font-medium uppercase">{index.algorithm}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500">Memory:</span>
              <span className="font-medium">{formatMemoryUsage(index.memoryUsage)}</span>
            </div>
          </div>

          {index.buildTime && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="text-xs text-gray-500">
                Built in {(index.buildTime / 1000).toFixed(1)}s
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );

  const renderIndexDetails = () => {
    if (!selectedIndexData) return null;

    return (
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
        <div className="border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">{selectedIndexData.name}</h2>
              <p className="text-sm text-gray-600 mt-1">{selectedIndexData.description}</p>
            </div>
            <div className="flex items-center space-x-2">
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(selectedIndexData.status)}`}>
                {selectedIndexData.status}
              </span>
              {selectedIndexData.status === 'ready' && (
                <button
                  onClick={() => onRebuildIndex?.(selectedIndexData.id)}
                  className="px-3 py-1 text-sm text-blue-600 border border-blue-300 rounded-md hover:bg-blue-50"
                >
                  Rebuild
                </button>
              )}
            </div>
          </div>

          <div className="flex space-x-6 mt-4">
            {(['overview', 'search', 'manage', 'analytics'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`pb-2 px-1 text-sm font-medium capitalize border-b-2 transition-colors ${
                  activeTab === tab
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        <div className="p-6">
          {activeTab === 'overview' && renderOverview()}
          {activeTab === 'search' && renderSearch()}
          {activeTab === 'manage' && renderManage()}
          {activeTab === 'analytics' && renderAnalytics()}
        </div>
      </div>
    );
  };

  const renderOverview = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="text-2xl font-bold text-gray-900">{selectedIndexData!.vectorCount.toLocaleString()}</div>
          <div className="text-sm text-gray-600">Total Vectors</div>
        </div>
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="text-2xl font-bold text-gray-900">{selectedIndexData!.dimension}</div>
          <div className="text-sm text-gray-600">Dimensions</div>
        </div>
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="text-2xl font-bold text-gray-900">{formatMemoryUsage(selectedIndexData!.memoryUsage)}</div>
          <div className="text-sm text-gray-600">Memory Usage</div>
        </div>
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="text-2xl font-bold text-gray-900 uppercase">{selectedIndexData!.metric}</div>
          <div className="text-sm text-gray-600">Distance Metric</div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-3">Index Configuration</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <span className="text-sm text-gray-600">Algorithm</span>
              <span className="text-sm font-medium uppercase">{selectedIndexData!.algorithm}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <span className="text-sm text-gray-600">Distance Metric</span>
              <span className="text-sm font-medium">{selectedIndexData!.metric}</span>
            </div>
            {selectedIndexData!.parameters.efConstruction && (
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="text-sm text-gray-600">EF Construction</span>
                <span className="text-sm font-medium">{selectedIndexData!.parameters.efConstruction}</span>
              </div>
            )}
            {selectedIndexData!.parameters.m && (
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="text-sm text-gray-600">M Parameter</span>
                <span className="text-sm font-medium">{selectedIndexData!.parameters.m}</span>
              </div>
            )}
          </div>
        </div>

        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-3">Performance Metrics</h3>
          <div className="space-y-3">
            {selectedIndexData!.buildTime && (
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="text-sm text-gray-600">Build Time</span>
                <span className="text-sm font-medium">{(selectedIndexData!.buildTime / 1000).toFixed(1)}s</span>
              </div>
            )}
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <span className="text-sm text-gray-600">Created</span>
              <span className="text-sm font-medium">{new Date(selectedIndexData!.createdAt).toLocaleDateString()}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <span className="text-sm text-gray-600">Last Updated</span>
              <span className="text-sm font-medium">{new Date(selectedIndexData!.updatedAt).toLocaleDateString()}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderSearch = () => (
    <div className="space-y-6">
      <div className="bg-gray-50 rounded-lg p-4">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Vector Search</h3>

        <div className="space-y-4">
          {/* Search Mode */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Search Mode</label>
            <div className="flex space-x-4">
              <label className="flex items-center">
                <input
                  type="radio"
                  checked={searchForm.useTextQuery}
                  onChange={() => setSearchForm(prev => ({ ...prev, useTextQuery: true }))}
                  className="form-radio text-blue-600"
                />
                <span className="ml-2 text-sm text-gray-700">Text Query</span>
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  checked={!searchForm.useTextQuery}
                  onChange={() => setSearchForm(prev => ({ ...prev, useTextQuery: false }))}
                  className="form-radio text-blue-600"
                />
                <span className="ml-2 text-sm text-gray-700">Vector Input</span>
              </label>
            </div>
          </div>

          {/* Query Input */}
          {searchForm.useTextQuery ? (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Text Query</label>
              <input
                type="text"
                value={searchForm.query}
                onChange={(e) => setSearchForm(prev => ({ ...prev, query: e.target.value }))}
                placeholder="Enter text to convert to embeddings..."
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </div>
          ) : (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Vector ({selectedIndexData!.dimension} dimensions)
              </label>
              <textarea
                value={searchForm.vectorInput}
                onChange={(e) => setSearchForm(prev => ({ ...prev, vectorInput: e.target.value }))}
                placeholder="Enter vector as JSON array or comma-separated values..."
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                rows={3}
              />
            </div>
          )}

          {/* Search Parameters */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">K (Results)</label>
              <input
                type="number"
                min="1"
                max="100"
                value={searchForm.k}
                onChange={(e) => setSearchForm(prev => ({ ...prev, k: parseInt(e.target.value) || 10 }))}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Filters */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-700">Filters</label>
              <button
                onClick={addFilter}
                className="px-3 py-1 text-sm text-blue-600 border border-blue-300 rounded-md hover:bg-blue-50"
              >
                Add Filter
              </button>
            </div>

            {searchForm.filters.map((filter, index) => (
              <div key={index} className="flex items-center space-x-2 mb-2">
                <input
                  type="text"
                  value={filter.field}
                  onChange={(e) => updateFilter(index, 'field', e.target.value)}
                  placeholder="Field"
                  className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
                <select
                  value={filter.operator}
                  onChange={(e) => updateFilter(index, 'operator', e.target.value)}
                  className="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                >
                  <option value="equals">Equals</option>
                  <option value="not_equals">Not Equals</option>
                  <option value="in">In</option>
                  <option value="not_in">Not In</option>
                </select>
                <input
                  type="text"
                  value={filter.value}
                  onChange={(e) => updateFilter(index, 'value', e.target.value)}
                  placeholder="Value"
                  className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
                <button
                  onClick={() => removeFilter(index)}
                  className="px-2 py-1 text-red-600 hover:bg-red-50 rounded"
                >
                  ×
                </button>
              </div>
            ))}
          </div>

          <button
            onClick={handleVectorSearch}
            disabled={isSearching || (!searchForm.query.trim() && !searchForm.vectorInput.trim())}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
          >
            {isSearching ? 'Searching...' : 'Search'}
          </button>
        </div>
      </div>

      {/* Search Results */}
      {searchResults.length > 0 && (
        <div>
          <h4 className="text-md font-medium text-gray-900 mb-3">
            Search Results ({searchResults.length})
          </h4>
          <div className="space-y-3">
            {searchResults.map((result, index) => (
              <div key={index} className="bg-white border border-gray-200 rounded-lg p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="text-sm font-medium text-gray-900 mb-1">
                      Vector ID: {result.id}
                    </div>
                    <div className="text-xs text-gray-500 mb-2">
                      Score: {result.score.toFixed(4)}
                    </div>
                    {result.metadata && (
                      <div className="text-xs text-gray-600">
                        <pre className="whitespace-pre-wrap">
                          {JSON.stringify(result.metadata, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  const renderManage = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-gray-900">Index Management</h3>
        <div className="flex space-x-2">
          <button
            onClick={() => setShowUploadModal(true)}
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500"
          >
            Upload Vectors
          </button>
          <button
            onClick={() => onDeleteIndex?.(selectedIndexData!.id)}
            className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"
          >
            Delete Index
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-gray-50 rounded-lg p-4">
          <h4 className="text-md font-medium text-gray-900 mb-3">Operations</h4>
          <div className="space-y-3">
            <button
              onClick={() => onRebuildIndex?.(selectedIndexData!.id)}
              className="w-full px-4 py-2 text-left text-sm text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Rebuild Index
            </button>
            <button className="w-full px-4 py-2 text-left text-sm text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50">
              Optimize Index
            </button>
            <button className="w-full px-4 py-2 text-left text-sm text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50">
              Export Vectors
            </button>
          </div>
        </div>

        <div className="bg-gray-50 rounded-lg p-4">
          <h4 className="text-md font-medium text-gray-900 mb-3">Settings</h4>
          <div className="space-y-3">
            {selectedIndexData!.algorithm === 'hnsw' && selectedIndexData!.parameters.efSearch && (
              <div>
                <label className="block text-sm font-medium text-gray-700">EF Search</label>
                <input
                  type="number"
                  value={selectedIndexData!.parameters.efSearch}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  readOnly
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  const renderAnalytics = () => (
    <div className="space-y-6">
      <h3 className="text-lg font-medium text-gray-900">Index Analytics</h3>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="text-2xl font-bold text-gray-900">
            {((selectedIndexData!.memoryUsage / (1024 * 1024 * 1024)) / (selectedIndexData!.vectorCount / 1000000)).toFixed(2)}
          </div>
          <div className="text-sm text-gray-600">GB per Million Vectors</div>
        </div>
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="text-2xl font-bold text-gray-900">
            {selectedIndexData!.buildTime ? (selectedIndexData!.buildTime / selectedIndexData!.vectorCount * 1000).toFixed(2) : 'N/A'}
          </div>
          <div className="text-sm text-gray-600">ms per Vector (Build)</div>
        </div>
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="text-2xl font-bold text-gray-900">Ready</div>
          <div className="text-sm text-gray-600">Index Status</div>
        </div>
      </div>

      <div>
        <h4 className="text-md font-medium text-gray-900 mb-3">Recent Activity</h4>
        <div className="bg-white border border-gray-200 rounded-lg divide-y divide-gray-200">
          <div className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-900">Index created</span>
              <span className="text-sm text-gray-500">{new Date(selectedIndexData!.createdAt).toLocaleString()}</span>
            </div>
          </div>
          <div className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-900">Last updated</span>
              <span className="text-sm text-gray-500">{new Date(selectedIndexData!.updatedAt).toLocaleString()}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Vector Database</h1>
          <p className="text-sm text-gray-600 mt-1">
            Manage vector indexes and perform similarity searches
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          Create Index
        </button>
      </div>

      {/* Index Grid or Details */}
      {!selectedIndex ? (
        <div>
          {vectorIndexes.length > 0 ? (
            renderIndexGrid()
          ) : (
            <div className="text-center py-12">
              <div className="text-gray-500 text-lg mb-2">No vector indexes found</div>
              <div className="text-gray-400 text-sm">Create your first vector index to get started</div>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          <button
            onClick={() => setSelectedIndex(null)}
            className="text-blue-600 hover:text-blue-700 text-sm flex items-center"
          >
            ← Back to Indexes
          </button>
          {renderIndexDetails()}
        </div>
      )}

      {/* Create Index Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-lg">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Create Vector Index</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Name</label>
                <input
                  type="text"
                  value={createForm.name}
                  onChange={(e) => setCreateForm(prev => ({ ...prev, name: e.target.value }))}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Description</label>
                <textarea
                  value={createForm.description}
                  onChange={(e) => setCreateForm(prev => ({ ...prev, description: e.target.value }))}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Dimension</label>
                  <input
                    type="number"
                    value={createForm.dimension}
                    onChange={(e) => setCreateForm(prev => ({ ...prev, dimension: parseInt(e.target.value) || 1536 }))}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Distance Metric</label>
                  <select
                    value={createForm.metric}
                    onChange={(e) => setCreateForm(prev => ({ ...prev, metric: e.target.value as any }))}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  >
                    <option value="cosine">Cosine</option>
                    <option value="euclidean">Euclidean</option>
                    <option value="dot_product">Dot Product</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Algorithm</label>
                <select
                  value={createForm.algorithm}
                  onChange={(e) => setCreateForm(prev => ({ ...prev, algorithm: e.target.value as any }))}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                >
                  <option value="hnsw">HNSW (Hierarchical Navigable Small World)</option>
                  <option value="ivf">IVF (Inverted File)</option>
                  <option value="flat">Flat (Exact Search)</option>
                </select>
              </div>

              {createForm.algorithm === 'hnsw' && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">EF Construction</label>
                    <input
                      type="number"
                      value={createForm.parameters.efConstruction || 200}
                      onChange={(e) => setCreateForm(prev => ({
                        ...prev,
                        parameters: { ...prev.parameters, efConstruction: parseInt(e.target.value) || 200 }
                      }))}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">M Parameter</label>
                    <input
                      type="number"
                      value={createForm.parameters.m || 16}
                      onChange={(e) => setCreateForm(prev => ({
                        ...prev,
                        parameters: { ...prev.parameters, m: parseInt(e.target.value) || 16 }
                      }))}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateIndex}
                disabled={!createForm.name.trim()}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VectorDatabase;