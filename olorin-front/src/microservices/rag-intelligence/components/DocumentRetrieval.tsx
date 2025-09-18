import React, { useState, useMemo, useCallback } from 'react';
import {
  SearchQuery,
  SearchResult,
  SearchFilter,
  SearchOptions,
  SearchResultDocument,
  SearchResultChunk,
  DocumentCategory,
  RelevanceFactor
} from '../types/ragIntelligence';

interface DocumentRetrievalProps {
  onSearch: (query: SearchQuery) => Promise<SearchResult>;
  onDocumentSelect?: (documentId: string) => void;
  onChunkSelect?: (chunkId: string) => void;
  knowledgeBaseIds?: string[];
  isLoading?: boolean;
  className?: string;
}

interface SearchFormData {
  query: string;
  filters: SearchFilter[];
  options: SearchOptions;
}

export const DocumentRetrieval: React.FC<DocumentRetrievalProps> = ({
  onSearch,
  onDocumentSelect,
  onChunkSelect,
  knowledgeBaseIds = [],
  isLoading = false,
  className = ''
}) => {
  const [searchForm, setSearchForm] = useState<SearchFormData>({
    query: '',
    filters: [],
    options: {
      limit: 10,
      offset: 0,
      includeMetadata: true,
      includeChunks: true,
      includeEmbeddings: false,
      similarityThreshold: 0.7,
      hybridSearch: true,
      rerank: true,
      rerankModel: 'cross-encoder/ms-marco-MiniLM-L-6-v2',
      highlightTerms: true,
      expandQuery: true,
      useSemanticSearch: true,
      useBM25: true,
      weights: {
        semantic: 0.7,
        bm25: 0.3,
        boost: 0.1
      }
    }
  });

  const [searchResult, setSearchResult] = useState<SearchResult | null>(null);
  const [selectedDocumentId, setSelectedDocumentId] = useState<string | null>(null);
  const [selectedChunkId, setSelectedChunkId] = useState<string | null>(null);
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);
  const [viewMode, setViewMode] = useState<'documents' | 'chunks' | 'mixed'>('mixed');
  const [sortBy, setSortBy] = useState<'relevance' | 'date' | 'title'>('relevance');

  // Handle search execution
  const handleSearch = useCallback(async () => {
    if (!searchForm.query.trim()) return;

    try {
      const searchQuery: SearchQuery = {
        id: `search-${Date.now()}`,
        query: searchForm.query.trim(),
        filters: [
          ...searchForm.filters,
          ...(knowledgeBaseIds.length > 0 ? [{
            field: 'knowledgeBaseId',
            operator: 'in' as const,
            value: knowledgeBaseIds
          }] : [])
        ],
        options: searchForm.options,
        userId: 'current-user',
        timestamp: new Date().toISOString()
      };

      const result = await onSearch(searchQuery);
      setSearchResult(result);
    } catch (error) {
      console.error('Search error:', error);
    }
  }, [searchForm, knowledgeBaseIds, onSearch]);

  // Handle filter management
  const addFilter = useCallback((filter: SearchFilter) => {
    setSearchForm(prev => ({
      ...prev,
      filters: [...prev.filters.filter(f => f.field !== filter.field), filter]
    }));
  }, []);

  const removeFilter = useCallback((field: string) => {
    setSearchForm(prev => ({
      ...prev,
      filters: prev.filters.filter(f => f.field !== field)
    }));
  }, []);

  // Sort and filter results
  const sortedResults = useMemo(() => {
    if (!searchResult) return { documents: [], chunks: [] };

    const sortDocuments = (docs: SearchResultDocument[]) => {
      return [...docs].sort((a, b) => {
        switch (sortBy) {
          case 'relevance':
            return b.score - a.score;
          case 'date':
            return new Date(b.document.updatedAt).getTime() - new Date(a.document.updatedAt).getTime();
          case 'title':
            return a.document.title.localeCompare(b.document.title);
          default:
            return 0;
        }
      });
    };

    const sortChunks = (chunks: SearchResultChunk[]) => {
      return [...chunks].sort((a, b) => {
        switch (sortBy) {
          case 'relevance':
            return b.score - a.score;
          case 'date':
            return new Date(b.document.updatedAt).getTime() - new Date(a.document.updatedAt).getTime();
          case 'title':
            return a.document.title.localeCompare(b.document.title);
          default:
            return 0;
        }
      });
    };

    return {
      documents: sortDocuments(searchResult.documents),
      chunks: sortChunks(searchResult.chunks)
    };
  }, [searchResult, sortBy]);

  const renderSearchForm = () => (
    <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
      <div className="space-y-4">
        {/* Main search input */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Search Query
          </label>
          <div className="flex space-x-2">
            <input
              type="text"
              value={searchForm.query}
              onChange={(e) => setSearchForm(prev => ({ ...prev, query: e.target.value }))}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="Enter your search query..."
              className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
            <button
              onClick={handleSearch}
              disabled={!searchForm.query.trim() || isLoading}
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {isLoading ? 'Searching...' : 'Search'}
            </button>
          </div>
        </div>

        {/* Quick filters */}
        <div className="flex flex-wrap gap-2">
          <select
            onChange={(e) => {
              if (e.target.value) {
                addFilter({
                  field: 'category',
                  operator: 'equals',
                  value: e.target.value
                });
                e.target.value = '';
              }
            }}
            className="text-sm rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          >
            <option value="">Filter by Category</option>
            <option value="fraud_patterns">Fraud Patterns</option>
            <option value="investigation_procedures">Investigation Procedures</option>
            <option value="regulatory_guidelines">Regulatory Guidelines</option>
            <option value="case_studies">Case Studies</option>
            <option value="technical_documentation">Technical Documentation</option>
            <option value="policies">Policies</option>
            <option value="training_materials">Training Materials</option>
          </select>

          <select
            onChange={(e) => {
              if (e.target.value) {
                addFilter({
                  field: 'fileType',
                  operator: 'equals',
                  value: e.target.value
                });
                e.target.value = '';
              }
            }}
            className="text-sm rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          >
            <option value="">Filter by File Type</option>
            <option value="pdf">PDF</option>
            <option value="docx">DOCX</option>
            <option value="txt">TXT</option>
            <option value="html">HTML</option>
            <option value="markdown">Markdown</option>
          </select>

          <button
            onClick={() => setShowAdvancedOptions(!showAdvancedOptions)}
            className="px-3 py-1 text-sm text-blue-600 border border-blue-300 rounded-md hover:bg-blue-50"
          >
            Advanced Options
          </button>
        </div>

        {/* Applied filters */}
        {searchForm.filters.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {searchForm.filters.map((filter, index) => (
              <span
                key={index}
                className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
              >
                {filter.field}: {filter.value}
                <button
                  onClick={() => removeFilter(filter.field)}
                  className="ml-1 text-blue-600 hover:text-blue-800"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        )}

        {/* Advanced options */}
        {showAdvancedOptions && (
          <div className="border-t border-gray-200 pt-4 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Max Results</label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={searchForm.options.limit}
                  onChange={(e) => setSearchForm(prev => ({
                    ...prev,
                    options: { ...prev.options, limit: parseInt(e.target.value) || 10 }
                  }))}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Similarity Threshold</label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={searchForm.options.similarityThreshold}
                  onChange={(e) => setSearchForm(prev => ({
                    ...prev,
                    options: { ...prev.options, similarityThreshold: parseFloat(e.target.value) }
                  }))}
                  className="mt-1 block w-full"
                />
                <div className="text-xs text-gray-500 mt-1">
                  {searchForm.options.similarityThreshold.toFixed(1)}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Search Mode</label>
                <select
                  value={searchForm.options.hybridSearch ? 'hybrid' : searchForm.options.useSemanticSearch ? 'semantic' : 'keyword'}
                  onChange={(e) => {
                    const value = e.target.value;
                    setSearchForm(prev => ({
                      ...prev,
                      options: {
                        ...prev.options,
                        hybridSearch: value === 'hybrid',
                        useSemanticSearch: value === 'hybrid' || value === 'semantic',
                        useBM25: value === 'hybrid' || value === 'keyword'
                      }
                    }));
                  }}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                >
                  <option value="hybrid">Hybrid (Semantic + Keyword)</option>
                  <option value="semantic">Semantic Only</option>
                  <option value="keyword">Keyword Only</option>
                </select>
              </div>
            </div>

            <div className="flex flex-wrap gap-4">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={searchForm.options.rerank}
                  onChange={(e) => setSearchForm(prev => ({
                    ...prev,
                    options: { ...prev.options, rerank: e.target.checked }
                  }))}
                  className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200"
                />
                <span className="ml-2 text-sm text-gray-700">Re-rank Results</span>
              </label>

              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={searchForm.options.expandQuery}
                  onChange={(e) => setSearchForm(prev => ({
                    ...prev,
                    options: { ...prev.options, expandQuery: e.target.checked }
                  }))}
                  className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200"
                />
                <span className="ml-2 text-sm text-gray-700">Query Expansion</span>
              </label>

              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={searchForm.options.highlightTerms}
                  onChange={(e) => setSearchForm(prev => ({
                    ...prev,
                    options: { ...prev.options, highlightTerms: e.target.checked }
                  }))}
                  className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200"
                />
                <span className="ml-2 text-sm text-gray-700">Highlight Terms</span>
              </label>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  const renderResultsHeader = () => (
    <div className="flex items-center justify-between">
      <div className="flex items-center space-x-4">
        <h3 className="text-lg font-medium text-gray-900">
          Search Results
          {searchResult && (
            <span className="ml-2 text-sm text-gray-500">
              ({searchResult.totalResults} results in {searchResult.executionTime.toFixed(0)}ms)
            </span>
          )}
        </h3>

        {searchResult && searchResult.suggestions && searchResult.suggestions.length > 0 && (
          <div className="text-sm text-gray-600">
            Did you mean:
            {searchResult.suggestions.map((suggestion, index) => (
              <button
                key={index}
                onClick={() => setSearchForm(prev => ({ ...prev, query: suggestion }))}
                className="ml-1 text-blue-600 hover:text-blue-800 underline"
              >
                {suggestion}
              </button>
            ))}
          </div>
        )}
      </div>

      {searchResult && (
        <div className="flex items-center space-x-4">
          <select
            value={viewMode}
            onChange={(e) => setViewMode(e.target.value as any)}
            className="text-sm rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          >
            <option value="mixed">Mixed View</option>
            <option value="documents">Documents Only</option>
            <option value="chunks">Chunks Only</option>
          </select>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="text-sm rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          >
            <option value="relevance">Sort by Relevance</option>
            <option value="date">Sort by Date</option>
            <option value="title">Sort by Title</option>
          </select>
        </div>
      )}
    </div>
  );

  const renderDocumentResult = (result: SearchResultDocument) => (
    <div
      key={result.document.id}
      onClick={() => {
        setSelectedDocumentId(result.document.id);
        onDocumentSelect?.(result.document.id);
      }}
      className={`bg-white border rounded-lg p-4 cursor-pointer transition-all hover:shadow-md ${
        selectedDocumentId === result.document.id ? 'border-blue-500 ring-2 ring-blue-200' : 'border-gray-200'
      }`}
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1">
          <h4 className="text-lg font-medium text-gray-900 mb-1">
            {searchForm.options.highlightTerms && result.highlights.length > 0
              ? <span dangerouslySetInnerHTML={{ __html: result.highlights[0].fragments[0] || result.document.title }} />
              : result.document.title
            }
          </h4>
          <p className="text-sm text-gray-600 line-clamp-2">{result.document.summary}</p>
        </div>
        <div className="ml-4 text-right">
          <div className="text-sm font-medium text-blue-600">
            {(result.score * 100).toFixed(1)}% match
          </div>
          <div className="text-xs text-gray-500">
            {result.document.metadata.fileType.toUpperCase()} • {Math.round(result.document.metadata.fileSize / 1024)}KB
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between text-xs text-gray-500 mb-2">
        <span className="capitalize">
          {result.document.metadata.category.replace('_', ' ')}
        </span>
        <span>
          Updated {new Date(result.document.updatedAt).toLocaleDateString()}
        </span>
      </div>

      {result.relevanceFactors.length > 0 && (
        <div className="mt-3 pt-3 border-t border-gray-100">
          <div className="text-xs text-gray-500 mb-1">Relevance Factors:</div>
          <div className="flex flex-wrap gap-1">
            {result.relevanceFactors.slice(0, 3).map((factor, index) => (
              <span
                key={index}
                className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-gray-100 text-gray-700"
                title={factor.explanation}
              >
                {factor.factor}: {(factor.contribution * 100).toFixed(0)}%
              </span>
            ))}
          </div>
        </div>
      )}

      {result.matchedChunks.length > 0 && (
        <div className="mt-2 text-xs text-gray-500">
          {result.matchedChunks.length} matching section{result.matchedChunks.length !== 1 ? 's' : ''}
        </div>
      )}
    </div>
  );

  const renderChunkResult = (result: SearchResultChunk) => (
    <div
      key={result.chunk.id}
      onClick={() => {
        setSelectedChunkId(result.chunk.id);
        onChunkSelect?.(result.chunk.id);
      }}
      className={`bg-white border rounded-lg p-4 cursor-pointer transition-all hover:shadow-md ${
        selectedChunkId === result.chunk.id ? 'border-blue-500 ring-2 ring-blue-200' : 'border-gray-200'
      }`}
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1">
          <h4 className="text-sm font-medium text-gray-900 mb-1">
            {result.document.title}
          </h4>
          <div className="text-xs text-gray-500 mb-2">
            Chunk {result.chunk.chunkIndex + 1} of {result.chunk.totalChunks}
          </div>
          <p className="text-sm text-gray-700 line-clamp-4">
            {searchForm.options.highlightTerms && result.highlights.length > 0
              ? <span dangerouslySetInnerHTML={{ __html: result.highlights[0].fragments[0] || result.chunk.content }} />
              : result.chunk.content
            }
          </p>
        </div>
        <div className="ml-4 text-right">
          <div className="text-sm font-medium text-blue-600">
            {(result.score * 100).toFixed(1)}% match
          </div>
          <div className="text-xs text-gray-500">
            {result.chunk.metadata.tokens} tokens
          </div>
        </div>
      </div>

      {result.context.surroundingText && (
        <div className="mt-3 pt-3 border-t border-gray-100">
          <div className="text-xs text-gray-500 mb-1">Context:</div>
          <p className="text-xs text-gray-600 line-clamp-2">
            {result.context.surroundingText}
          </p>
        </div>
      )}

      {result.chunk.metadata.entities.length > 0 && (
        <div className="mt-2">
          <div className="text-xs text-gray-500 mb-1">Entities:</div>
          <div className="flex flex-wrap gap-1">
            {result.chunk.metadata.entities.slice(0, 5).map((entity, index) => (
              <span
                key={index}
                className="inline-flex items-center px-1.5 py-0.5 rounded text-xs bg-yellow-100 text-yellow-800"
              >
                {entity.text} ({entity.label})
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  const renderResults = () => {
    if (!searchResult) return null;

    if (searchResult.totalResults === 0) {
      return (
        <div className="text-center py-12">
          <div className="text-gray-500 text-lg mb-2">No results found</div>
          <div className="text-gray-400 text-sm">
            Try adjusting your search terms or filters
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {viewMode === 'documents' && sortedResults.documents.map(renderDocumentResult)}
        {viewMode === 'chunks' && sortedResults.chunks.map(renderChunkResult)}
        {viewMode === 'mixed' && (
          <>
            {sortedResults.documents.slice(0, 5).map(renderDocumentResult)}
            {sortedResults.chunks.slice(0, 10).map(renderChunkResult)}
          </>
        )}
      </div>
    );
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Search Form */}
      {renderSearchForm()}

      {/* Results */}
      {searchResult && (
        <div className="space-y-4">
          {renderResultsHeader()}
          {renderResults()}

          {/* Load More Button */}
          {searchResult.totalResults > searchForm.options.limit && (
            <div className="text-center">
              <button
                onClick={() => {
                  setSearchForm(prev => ({
                    ...prev,
                    options: { ...prev.options, limit: prev.options.limit + 10 }
                  }));
                  handleSearch();
                }}
                className="px-6 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-md hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                Load More Results
              </button>
            </div>
          )}
        </div>
      )}

      {/* Search Explanation */}
      {searchResult?.explanation && (
        <div className="bg-gray-50 rounded-lg p-4">
          <h4 className="text-sm font-medium text-gray-900 mb-2">Search Details</h4>
          <div className="text-xs text-gray-600 space-y-1">
            <div>Total Score: {searchResult.explanation.totalScore.toFixed(3)}</div>
            <div>Max Score: {searchResult.explanation.maxScore.toFixed(3)}</div>
            <div>Query Parsing: {searchResult.explanation.queryParsing}</div>
            <div>Indexes Used: {searchResult.explanation.indexUsed.join(', ')}</div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DocumentRetrieval;