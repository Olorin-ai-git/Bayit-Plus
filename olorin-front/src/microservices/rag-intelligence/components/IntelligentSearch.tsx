import React, { useState, useCallback, useMemo } from 'react';
import {
  RAGQuery,
  RAGResponse,
  RAGSource,
  SearchQuery,
  SearchResult,
  QueryAnalytics,
  RAGSession
} from '../types/ragIntelligence';

interface IntelligentSearchProps {
  onSearch: (query: RAGQuery) => Promise<RAGResponse>;
  onFeedback?: (responseId: string, feedback: { rating: number; helpful: boolean; accurate: boolean; complete: boolean; relevant: boolean; comments?: string }) => Promise<void>;
  knowledgeBaseIds?: string[];
  sessionId?: string;
  popularQueries?: QueryAnalytics[];
  recentQueries?: string[];
  isLoading?: boolean;
  className?: string;
}

interface ConversationTurn {
  query: RAGQuery;
  response: RAGResponse;
  timestamp: string;
}

export const IntelligentSearch: React.FC<IntelligentSearchProps> = ({
  onSearch,
  onFeedback,
  knowledgeBaseIds = [],
  sessionId,
  popularQueries = [],
  recentQueries = [],
  isLoading = false,
  className = ''
}) => {
  const [currentQuery, setCurrentQuery] = useState('');
  const [conversation, setConversation] = useState<ConversationTurn[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedSources, setSelectedSources] = useState<Set<string>>(new Set());
  const [showSettings, setShowSettings] = useState(false);
  const [searchMode, setSearchMode] = useState<'question' | 'semantic' | 'chat'>('question');

  const [searchSettings, setSearchSettings] = useState({
    maxDocuments: 5,
    maxChunks: 10,
    similarityThreshold: 0.7,
    temperature: 0.7,
    maxTokens: 1000,
    includeSources: true,
    includeConfidence: true,
    includeCitations: true,
    responseFormat: 'markdown' as const
  });

  // Handle intelligent search
  const handleSearch = useCallback(async () => {
    if (!currentQuery.trim()) return;

    setIsGenerating(true);

    try {
      const ragQuery: RAGQuery = {
        id: `rag-${Date.now()}`,
        question: currentQuery.trim(),
        context: conversation.length > 0
          ? conversation.slice(-3).map(turn => `Q: ${turn.query.question}\nA: ${turn.response.answer}`).join('\n\n')
          : '',
        knowledgeBases: knowledgeBaseIds,
        userId: 'current-user',
        sessionId: sessionId || `session-${Date.now()}`,
        retrievalOptions: {
          maxDocuments: searchSettings.maxDocuments,
          maxChunks: searchSettings.maxChunks,
          similarityThreshold: searchSettings.similarityThreshold,
          diversityThreshold: 0.3,
          temporalWeight: 0.1,
          authorityWeight: 0.2,
          freshnessWeight: 0.1,
          useHybridSearch: true,
          expandQuery: true,
          includeMetadata: true
        },
        generationOptions: {
          model: 'gpt-4',
          temperature: searchSettings.temperature,
          maxTokens: searchSettings.maxTokens,
          topP: 0.9,
          topK: 50,
          frequencyPenalty: 0.1,
          presencePenalty: 0.1,
          stopSequences: [],
          systemPrompt: getSystemPrompt(),
          includeSources: searchSettings.includeSources,
          includeConfidence: searchSettings.includeConfidence,
          includeCitations: searchSettings.includeCitations,
          responseFormat: searchSettings.responseFormat
        },
        timestamp: new Date().toISOString()
      };

      const response = await onSearch(ragQuery);

      const newTurn: ConversationTurn = {
        query: ragQuery,
        response,
        timestamp: new Date().toISOString()
      };

      setConversation(prev => [...prev, newTurn]);
      setCurrentQuery('');
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setIsGenerating(false);
    }
  }, [currentQuery, conversation, knowledgeBaseIds, sessionId, searchSettings, onSearch]);

  const getSystemPrompt = () => {
    switch (searchMode) {
      case 'question':
        return 'You are an expert fraud investigation assistant. Provide accurate, detailed answers based on the retrieved documents. Always cite your sources and indicate confidence levels.';
      case 'semantic':
        return 'You are a semantic search assistant. Help users find relevant documents and information by understanding the intent behind their queries.';
      case 'chat':
        return 'You are a conversational AI assistant specialized in fraud detection and investigation. Maintain context across the conversation and provide helpful, accurate responses.';
      default:
        return 'You are a helpful AI assistant. Provide accurate information based on the available documents.';
    }
  };

  const handleFeedbackSubmit = useCallback(async (
    responseId: string,
    feedback: { rating: number; helpful: boolean; accurate: boolean; complete: boolean; relevant: boolean; comments?: string }
  ) => {
    if (!onFeedback) return;

    try {
      await onFeedback(responseId, feedback);

      // Update the response in conversation to show feedback was submitted
      setConversation(prev => prev.map(turn =>
        turn.response.id === responseId
          ? { ...turn, response: { ...turn.response, feedback: { ...feedback, userId: 'current-user', timestamp: new Date().toISOString() } } }
          : turn
      ));
    } catch (error) {
      console.error('Feedback submission error:', error);
    }
  }, [onFeedback]);

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'text-green-600 bg-green-100';
    if (confidence >= 0.6) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  const renderSearchInput = () => (
    <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
      <div className="flex items-center space-x-2 mb-3">
        <select
          value={searchMode}
          onChange={(e) => setSearchMode(e.target.value as any)}
          className="text-sm rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
        >
          <option value="question">Question Answering</option>
          <option value="semantic">Semantic Search</option>
          <option value="chat">Conversational</option>
        </select>

        <button
          onClick={() => setShowSettings(!showSettings)}
          className="p-2 text-gray-400 hover:text-gray-600 rounded-md"
          title="Search Settings"
        >
          ⚙️
        </button>
      </div>

      <div className="flex space-x-2">
        <div className="flex-1">
          <textarea
            value={currentQuery}
            onChange={(e) => setCurrentQuery(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSearch();
              }
            }}
            placeholder={getPlaceholderText()}
            className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 resize-none"
            rows={3}
            disabled={isGenerating}
          />
        </div>
        <button
          onClick={handleSearch}
          disabled={!currentQuery.trim() || isGenerating}
          className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 self-end"
        >
          {isGenerating ? 'Thinking...' : 'Ask'}
        </button>
      </div>

      {showSettings && renderSearchSettings()}
    </div>
  );

  const getPlaceholderText = () => {
    switch (searchMode) {
      case 'question':
        return 'Ask a question about fraud detection, investigation procedures, or compliance...';
      case 'semantic':
        return 'Describe what you\'re looking for and I\'ll find relevant documents...';
      case 'chat':
        return 'Start a conversation about fraud investigation...';
      default:
        return 'Enter your query...';
    }
  };

  const renderSearchSettings = () => (
    <div className="mt-4 p-4 bg-gray-50 rounded-lg space-y-4">
      <h4 className="text-sm font-medium text-gray-900">Search Settings</h4>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div>
          <label className="block text-xs font-medium text-gray-700">Max Documents</label>
          <input
            type="number"
            min="1"
            max="20"
            value={searchSettings.maxDocuments}
            onChange={(e) => setSearchSettings(prev => ({ ...prev, maxDocuments: parseInt(e.target.value) || 5 }))}
            className="mt-1 block w-full text-sm rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-700">Max Chunks</label>
          <input
            type="number"
            min="1"
            max="50"
            value={searchSettings.maxChunks}
            onChange={(e) => setSearchSettings(prev => ({ ...prev, maxChunks: parseInt(e.target.value) || 10 }))}
            className="mt-1 block w-full text-sm rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-700">Temperature</label>
          <input
            type="range"
            min="0"
            max="1"
            step="0.1"
            value={searchSettings.temperature}
            onChange={(e) => setSearchSettings(prev => ({ ...prev, temperature: parseFloat(e.target.value) }))}
            className="mt-1 block w-full"
          />
          <div className="text-xs text-gray-500 text-center">{searchSettings.temperature}</div>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-700">Max Tokens</label>
          <input
            type="number"
            min="100"
            max="4000"
            step="100"
            value={searchSettings.maxTokens}
            onChange={(e) => setSearchSettings(prev => ({ ...prev, maxTokens: parseInt(e.target.value) || 1000 }))}
            className="mt-1 block w-full text-sm rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-4">
        <label className="flex items-center">
          <input
            type="checkbox"
            checked={searchSettings.includeSources}
            onChange={(e) => setSearchSettings(prev => ({ ...prev, includeSources: e.target.checked }))}
            className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200"
          />
          <span className="ml-2 text-xs text-gray-700">Include Sources</span>
        </label>

        <label className="flex items-center">
          <input
            type="checkbox"
            checked={searchSettings.includeConfidence}
            onChange={(e) => setSearchSettings(prev => ({ ...prev, includeConfidence: e.target.checked }))}
            className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200"
          />
          <span className="ml-2 text-xs text-gray-700">Show Confidence</span>
        </label>

        <label className="flex items-center">
          <input
            type="checkbox"
            checked={searchSettings.includeCitations}
            onChange={(e) => setSearchSettings(prev => ({ ...prev, includeCitations: e.target.checked }))}
            className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200"
          />
          <span className="ml-2 text-xs text-gray-700">Include Citations</span>
        </label>
      </div>
    </div>
  );

  const renderConversation = () => (
    <div className="space-y-6">
      {conversation.map((turn, index) => (
        <div key={index} className="space-y-4">
          {/* User Query */}
          <div className="flex justify-end">
            <div className="max-w-3xl bg-blue-600 text-white rounded-lg p-4">
              <p className="text-sm">{turn.query.question}</p>
              <div className="text-xs opacity-75 mt-2">
                {new Date(turn.timestamp).toLocaleTimeString()}
              </div>
            </div>
          </div>

          {/* AI Response */}
          <div className="flex justify-start">
            <div className="max-w-4xl bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
              {/* Response Header */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-medium text-gray-900">AI Assistant</span>
                  {searchSettings.includeConfidence && (
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getConfidenceColor(turn.response.confidence)}`}>
                      {(turn.response.confidence * 100).toFixed(0)}% confident
                    </span>
                  )}
                </div>
                <div className="text-xs text-gray-500">
                  {turn.response.processingTime.toFixed(0)}ms • {turn.response.totalTokens} tokens
                </div>
              </div>

              {/* Response Content */}
              <div className="prose prose-sm max-w-none">
                {searchSettings.responseFormat === 'markdown' ? (
                  <div dangerouslySetInnerHTML={{ __html: turn.response.answer.replace(/\n/g, '<br>') }} />
                ) : (
                  <p>{turn.response.answer}</p>
                )}
              </div>

              {/* Sources */}
              {searchSettings.includeSources && turn.response.sources.length > 0 && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <h4 className="text-sm font-medium text-gray-900 mb-2">Sources</h4>
                  <div className="space-y-2">
                    {turn.response.sources.map((source, sourceIndex) => (
                      <div
                        key={sourceIndex}
                        className="p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100"
                        onClick={() => {
                          const newSelected = new Set(selectedSources);
                          if (newSelected.has(source.documentId)) {
                            newSelected.delete(source.documentId);
                          } else {
                            newSelected.add(source.documentId);
                          }
                          setSelectedSources(newSelected);
                        }}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h5 className="text-sm font-medium text-gray-900">{source.title}</h5>
                            <p className="text-xs text-gray-600 mt-1 line-clamp-2">{source.content}</p>
                            {searchSettings.includeCitations && (
                              <p className="text-xs text-blue-600 mt-1">{source.citation}</p>
                            )}
                          </div>
                          <div className="ml-2 text-right">
                            <div className="text-xs font-medium text-blue-600">
                              {(source.score * 100).toFixed(0)}%
                            </div>
                          </div>
                        </div>

                        {selectedSources.has(source.documentId) && (
                          <div className="mt-2 pt-2 border-t border-gray-200">
                            <p className="text-xs text-gray-700">{source.content}</p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Feedback */}
              {!turn.response.feedback && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <ResponseFeedback
                    responseId={turn.response.id}
                    onFeedback={handleFeedbackSubmit}
                  />
                </div>
              )}

              {turn.response.feedback && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <div className="text-xs text-green-600">
                    ✓ Feedback submitted - Thank you!
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );

  const renderSuggestions = () => (
    <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
      <h3 className="text-sm font-medium text-gray-900 mb-3">Suggestions</h3>

      {popularQueries.length > 0 && (
        <div className="mb-4">
          <h4 className="text-xs font-medium text-gray-700 mb-2">Popular Questions</h4>
          <div className="space-y-1">
            {popularQueries.slice(0, 3).map((query, index) => (
              <button
                key={index}
                onClick={() => setCurrentQuery(query.query)}
                className="block w-full text-left text-sm text-gray-600 hover:text-blue-600 hover:bg-blue-50 p-2 rounded transition-colors"
              >
                {query.query}
              </button>
            ))}
          </div>
        </div>
      )}

      {recentQueries.length > 0 && (
        <div>
          <h4 className="text-xs font-medium text-gray-700 mb-2">Recent Queries</h4>
          <div className="space-y-1">
            {recentQueries.slice(0, 3).map((query, index) => (
              <button
                key={index}
                onClick={() => setCurrentQuery(query)}
                className="block w-full text-left text-sm text-gray-600 hover:text-blue-600 hover:bg-blue-50 p-2 rounded transition-colors"
              >
                {query}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Intelligent Search</h1>
          <p className="text-sm text-gray-600 mt-1">
            Ask questions and get AI-powered answers from your knowledge base
          </p>
        </div>

        {conversation.length > 0 && (
          <button
            onClick={() => setConversation([])}
            className="px-3 py-1 text-sm text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
          >
            Clear Conversation
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-3 space-y-6">
          {/* Search Input */}
          {renderSearchInput()}

          {/* Conversation */}
          {conversation.length > 0 && renderConversation()}

          {/* Empty State */}
          {conversation.length === 0 && (
            <div className="text-center py-12">
              <div className="text-gray-500 text-lg mb-2">
                {searchMode === 'question' && '💡 Ask any question about fraud detection'}
                {searchMode === 'semantic' && '🔍 Describe what you\'re looking for'}
                {searchMode === 'chat' && '💬 Start a conversation'}
              </div>
              <div className="text-gray-400 text-sm">
                I'll search through your knowledge base and provide detailed answers
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="lg:col-span-1">
          {renderSuggestions()}
        </div>
      </div>
    </div>
  );
};

// Feedback component
const ResponseFeedback: React.FC<{
  responseId: string;
  onFeedback: (responseId: string, feedback: any) => Promise<void>;
}> = ({ responseId, onFeedback }) => {
  const [rating, setRating] = useState(0);
  const [helpful, setHelpful] = useState<boolean | null>(null);
  const [accurate, setAccurate] = useState<boolean | null>(null);
  const [complete, setComplete] = useState<boolean | null>(null);
  const [relevant, setRelevant] = useState<boolean | null>(null);
  const [comments, setComments] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (rating === 0) return;

    setIsSubmitting(true);
    try {
      await onFeedback(responseId, {
        rating,
        helpful: helpful ?? false,
        accurate: accurate ?? false,
        complete: complete ?? false,
        relevant: relevant ?? false,
        comments: comments.trim() || undefined
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-3">
      <h5 className="text-sm font-medium text-gray-900">How was this response?</h5>

      {/* Star Rating */}
      <div className="flex items-center space-x-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            onClick={() => setRating(star)}
            className={`text-lg ${rating >= star ? 'text-yellow-400' : 'text-gray-300'} hover:text-yellow-400`}
          >
            ★
          </button>
        ))}
      </div>

      {/* Quick Feedback */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setHelpful(!helpful)}
          className={`px-2 py-1 text-xs rounded-full border ${
            helpful ? 'bg-green-100 text-green-800 border-green-300' : 'border-gray-300 text-gray-600 hover:bg-gray-50'
          }`}
        >
          Helpful
        </button>
        <button
          onClick={() => setAccurate(!accurate)}
          className={`px-2 py-1 text-xs rounded-full border ${
            accurate ? 'bg-green-100 text-green-800 border-green-300' : 'border-gray-300 text-gray-600 hover:bg-gray-50'
          }`}
        >
          Accurate
        </button>
        <button
          onClick={() => setComplete(!complete)}
          className={`px-2 py-1 text-xs rounded-full border ${
            complete ? 'bg-green-100 text-green-800 border-green-300' : 'border-gray-300 text-gray-600 hover:bg-gray-50'
          }`}
        >
          Complete
        </button>
        <button
          onClick={() => setRelevant(!relevant)}
          className={`px-2 py-1 text-xs rounded-full border ${
            relevant ? 'bg-green-100 text-green-800 border-green-300' : 'border-gray-300 text-gray-600 hover:bg-gray-50'
          }`}
        >
          Relevant
        </button>
      </div>

      {/* Comments */}
      <textarea
        value={comments}
        onChange={(e) => setComments(e.target.value)}
        placeholder="Additional comments (optional)"
        className="w-full text-sm rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
        rows={2}
      />

      {/* Submit Button */}
      <button
        onClick={handleSubmit}
        disabled={rating === 0 || isSubmitting}
        className="px-3 py-1 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
      >
        {isSubmitting ? 'Submitting...' : 'Submit Feedback'}
      </button>
    </div>
  );
};

export default IntelligentSearch;