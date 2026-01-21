import { useState, useCallback, useMemo, useEffect } from 'react';
import {
  RAGQuery,
  RAGResponse,
  RetrievalOptions,
  GenerationOptions,
  RAGFeedback,
  RAGSession
} from '../types/ragIntelligence';
import { ragServices } from '../services';
import { handleRAGError, RAGError } from '../services/errorService';

// Conversation turn interface
export interface ConversationTurn {
  query: RAGQuery;
  response: RAGResponse;
  feedback?: RAGFeedback;
}

// Streaming state
export interface StreamingState {
  isStreaming: boolean;
  currentChunk: string;
  accumulatedResponse: string;
  error?: string;
}

// Hook options
export interface UseRAGGenerationOptions {
  knowledgeBaseIds?: string[];
  sessionId?: string;
  defaultGenerationOptions?: Partial<GenerationOptions>;
  defaultRetrievalOptions?: Partial<RetrievalOptions>;
  maxConversationTurns?: number;
  enableStreaming?: boolean;
}

// Hook state
export interface RAGGenerationState {
  conversation: ConversationTurn[];
  currentSession: RAGSession | null;
  currentQuery: string;
  retrievalOptions: RetrievalOptions;
  generationOptions: GenerationOptions;
  streaming: StreamingState;
  loading: {
    generate: boolean;
    session: boolean;
    history: boolean;
    feedback: boolean;
  };
  errors: {
    generate: RAGError | null;
    session: RAGError | null;
    history: RAGError | null;
    feedback: RAGError | null;
  };
}

// Default options
const defaultRetrievalOptions: RetrievalOptions = {
  maxDocuments: 5,
  maxChunks: 10,
  similarityThreshold: 0.7,
  diversityThreshold: 0.3,
  temporalWeight: 0.1,
  authorityWeight: 0.1,
  freshnessWeight: 0.1,
  useHybridSearch: true,
  expandQuery: true,
  includeMetadata: true
};

const defaultGenerationOptions: GenerationOptions = {
  model: 'gpt-4',
  temperature: 0.7,
  maxTokens: 1000,
  topP: 0.9,
  topK: 50,
  frequencyPenalty: 0.0,
  presencePenalty: 0.0,
  stopSequences: [],
  includeSources: true,
  includeConfidence: true,
  includeCitations: true,
  responseFormat: 'markdown'
};

// Initial state
const initialState: RAGGenerationState = {
  conversation: [],
  currentSession: null,
  currentQuery: '',
  retrievalOptions: defaultRetrievalOptions,
  generationOptions: defaultGenerationOptions,
  streaming: {
    isStreaming: false,
    currentChunk: '',
    accumulatedResponse: '',
    error: undefined
  },
  loading: {
    generate: false,
    session: false,
    history: false,
    feedback: false
  },
  errors: {
    generate: null,
    session: null,
    history: null,
    feedback: null
  }
};

export const useRAGGeneration = (options: UseRAGGenerationOptions = {}) => {
  const {
    knowledgeBaseIds = [],
    sessionId,
    defaultGenerationOptions: customGenerationOptions = {},
    defaultRetrievalOptions: customRetrievalOptions = {},
    maxConversationTurns = 50,
    enableStreaming = true
  } = options;

  const [state, setState] = useState<RAGGenerationState>({
    ...initialState,
    retrievalOptions: { ...defaultRetrievalOptions, ...customRetrievalOptions },
    generationOptions: { ...defaultGenerationOptions, ...customGenerationOptions }
  });

  // Update loading state
  const setLoading = useCallback((key: keyof RAGGenerationState['loading'], loading: boolean) => {
    setState(prev => ({
      ...prev,
      loading: { ...prev.loading, [key]: loading }
    }));
  }, []);

  // Update error state
  const setError = useCallback((key: keyof RAGGenerationState['errors'], error: RAGError | null) => {
    setState(prev => ({
      ...prev,
      errors: { ...prev.errors, [key]: error }
    }));
  }, []);

  // Update current query
  const setQuery = useCallback((query: string) => {
    setState(prev => ({ ...prev, currentQuery: query }));
  }, []);

  // Update retrieval options
  const updateRetrievalOptions = useCallback((updates: Partial<RetrievalOptions>) => {
    setState(prev => ({
      ...prev,
      retrievalOptions: { ...prev.retrievalOptions, ...updates }
    }));
  }, []);

  // Update generation options
  const updateGenerationOptions = useCallback((updates: Partial<GenerationOptions>) => {
    setState(prev => ({
      ...prev,
      generationOptions: { ...prev.generationOptions, ...updates }
    }));
  }, []);

  // Create or load session
  const createSession = useCallback(async (targetKnowledgeBaseIds?: string[]) => {
    setLoading('session', true);
    setError('session', null);

    try {
      const kbIds = targetKnowledgeBaseIds || knowledgeBaseIds;
      // This would call a session service when implemented
      const session: RAGSession = {
        id: `session-${Date.now()}`,
        userId: 'current-user',
        knowledgeBaseIds: kbIds,
        queries: [],
        responses: [],
        startedAt: new Date().toISOString(),
        lastActivity: new Date().toISOString(),
        totalQueries: 0,
        averageConfidence: 0,
        context: {}
      };

      setState(prev => ({ ...prev, currentSession: session }));
      return session;
    } catch (error) {
      const ragError = handleRAGError(error as Error, { operation: 'createSession' });
      setError('session', ragError);
      throw ragError;
    } finally {
      setLoading('session', false);
    }
  }, [knowledgeBaseIds, setLoading, setError]);

  // Generate RAG response
  const generate = useCallback(async (
    question?: string,
    customRetrievalOptions?: Partial<RetrievalOptions>,
    customGenerationOptions?: Partial<GenerationOptions>
  ) => {
    const queryText = question || state.currentQuery;
    if (!queryText.trim()) {
      throw new Error('Question cannot be empty');
    }

    setLoading('generate', true);
    setError('generate', null);

    try {
      // Build context from conversation history
      const context = state.conversation
        .slice(-3) // Last 3 turns for context
        .map(turn => `Q: ${turn.query.question}\nA: ${turn.response.answer}`)
        .join('\n\n');

      const ragQuery: RAGQuery = {
        id: `rag-query-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        question: queryText,
        context,
        knowledgeBases: knowledgeBaseIds,
        userId: 'current-user',
        sessionId: state.currentSession?.id,
        retrievalOptions: { ...state.retrievalOptions, ...customRetrievalOptions },
        generationOptions: { ...state.generationOptions, ...customGenerationOptions },
        timestamp: new Date().toISOString()
      };

      const response = await ragServices.generation.generateResponse(ragQuery);

      // Add to conversation
      const conversationTurn: ConversationTurn = {
        query: ragQuery,
        response
      };

      setState(prev => ({
        ...prev,
        conversation: [...prev.conversation, conversationTurn].slice(-maxConversationTurns),
        currentQuery: queryText
      }));

      return response;
    } catch (error) {
      const ragError = handleRAGError(error as Error, {
        operation: 'generateRAGResponse',
        question: queryText,
        knowledgeBaseIds
      });
      setError('generate', ragError);
      throw ragError;
    } finally {
      setLoading('generate', false);
    }
  }, [state.currentQuery, state.conversation, state.retrievalOptions, state.generationOptions, state.currentSession, knowledgeBaseIds, maxConversationTurns, setLoading, setError]);

  // Generate with streaming
  const generateStreaming = useCallback(async (
    question?: string,
    customRetrievalOptions?: Partial<RetrievalOptions>,
    customGenerationOptions?: Partial<GenerationOptions>
  ) => {
    if (!enableStreaming) {
      return generate(question, customRetrievalOptions, customGenerationOptions);
    }

    const queryText = question || state.currentQuery;
    if (!queryText.trim()) {
      throw new Error('Question cannot be empty');
    }

    setLoading('generate', true);
    setError('generate', null);

    // Reset streaming state
    setState(prev => ({
      ...prev,
      streaming: {
        isStreaming: true,
        currentChunk: '',
        accumulatedResponse: '',
        error: undefined
      }
    }));

    try {
      // Build context from conversation history
      const context = state.conversation
        .slice(-3)
        .map(turn => `Q: ${turn.query.question}\nA: ${turn.response.answer}`)
        .join('\n\n');

      const ragQuery: RAGQuery = {
        id: `rag-query-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        question: queryText,
        context,
        knowledgeBases: knowledgeBaseIds,
        userId: 'current-user',
        sessionId: state.currentSession?.id,
        retrievalOptions: { ...state.retrievalOptions, ...customRetrievalOptions },
        generationOptions: { ...state.generationOptions, ...customGenerationOptions },
        timestamp: new Date().toISOString()
      };

      await ragServices.generation.streamResponse(
        ragQuery,
        (chunk: string) => {
          setState(prev => ({
            ...prev,
            streaming: {
              ...prev.streaming,
              currentChunk: chunk,
              accumulatedResponse: prev.streaming.accumulatedResponse + chunk
            }
          }));
        },
        (response: RAGResponse) => {
          const conversationTurn: ConversationTurn = {
            query: ragQuery,
            response
          };

          setState(prev => ({
            ...prev,
            conversation: [...prev.conversation, conversationTurn].slice(-maxConversationTurns),
            currentQuery: queryText,
            streaming: {
              isStreaming: false,
              currentChunk: '',
              accumulatedResponse: '',
              error: undefined
            }
          }));
        }
      );
    } catch (error) {
      const ragError = handleRAGError(error as Error, {
        operation: 'generateStreamingRAGResponse',
        question: queryText,
        knowledgeBaseIds
      });

      setState(prev => ({
        ...prev,
        streaming: {
          ...prev.streaming,
          isStreaming: false,
          error: ragError.userMessage
        }
      }));

      setError('generate', ragError);
      throw ragError;
    } finally {
      setLoading('generate', false);
    }
  }, [enableStreaming, generate, state.currentQuery, state.conversation, state.retrievalOptions, state.generationOptions, state.currentSession, knowledgeBaseIds, maxConversationTurns, setLoading, setError]);

  // Provide feedback on response
  const provideFeedback = useCallback(async (responseId: string, feedback: Omit<RAGFeedback, 'userId' | 'timestamp'>) => {
    setLoading('feedback', true);
    setError('feedback', null);

    try {
      const fullFeedback: RAGFeedback = {
        ...feedback,
        userId: 'current-user',
        timestamp: new Date().toISOString()
      };

      await ragServices.generation.provideFeedback(responseId, fullFeedback);

      // Update conversation with feedback
      setState(prev => ({
        ...prev,
        conversation: prev.conversation.map(turn =>
          turn.response.id === responseId
            ? { ...turn, feedback: fullFeedback }
            : turn
        )
      }));
    } catch (error) {
      const ragError = handleRAGError(error as Error, { operation: 'provideFeedback', responseId });
      setError('feedback', ragError);
      throw ragError;
    } finally {
      setLoading('feedback', false);
    }
  }, [setLoading, setError]);

  // Regenerate response
  const regenerate = useCallback(async (responseId: string, newQuery?: Partial<RAGQuery>) => {
    setLoading('generate', true);
    setError('generate', null);

    try {
      const response = await ragServices.generation.regenerateResponse(responseId, newQuery);

      // Find the conversation turn and update it
      setState(prev => {
        const updatedConversation = prev.conversation.map(turn => {
          if (turn.response.id === responseId) {
            return { ...turn, response };
          }
          return turn;
        });

        // If not found, add as new turn
        if (!updatedConversation.some(turn => turn.response.id === response.id)) {
          const existingTurn = prev.conversation.find(turn => turn.response.id === responseId);
          if (existingTurn) {
            updatedConversation.push({
              query: existingTurn.query,
              response
            });
          }
        }

        return {
          ...prev,
          conversation: updatedConversation.slice(-maxConversationTurns)
        };
      });

      return response;
    } catch (error) {
      const ragError = handleRAGError(error as Error, { operation: 'regenerateResponse', responseId });
      setError('generate', ragError);
      throw ragError;
    } finally {
      setLoading('generate', false);
    }
  }, [maxConversationTurns, setLoading, setError]);

  // Load conversation history
  const loadHistory = useCallback(async (userId?: string, targetSessionId?: string, limit?: number) => {
    setLoading('history', true);
    setError('history', null);

    try {
      const responses = await ragServices.generation.getHistory(
        userId,
        targetSessionId || sessionId,
        limit || maxConversationTurns
      );

      // Convert responses to conversation turns (simplified - in reality you'd need the queries too)
      const conversationTurns: ConversationTurn[] = responses.map(response => ({
        query: response.query,
        response,
        feedback: response.feedback
      }));

      setState(prev => ({
        ...prev,
        conversation: conversationTurns
      }));

      return conversationTurns;
    } catch (error) {
      const ragError = handleRAGError(error as Error, { operation: 'loadConversationHistory' });
      setError('history', ragError);
      throw ragError;
    } finally {
      setLoading('history', false);
    }
  }, [sessionId, maxConversationTurns, setLoading, setError]);

  // Clear conversation
  const clearConversation = useCallback(() => {
    setState(prev => ({
      ...prev,
      conversation: [],
      currentQuery: '',
      streaming: {
        isStreaming: false,
        currentChunk: '',
        accumulatedResponse: '',
        error: undefined
      }
    }));
    setError('generate', null);
  }, [setError]);

  // Clear all errors
  const clearErrors = useCallback(() => {
    setState(prev => ({
      ...prev,
      errors: {
        generate: null,
        session: null,
        history: null,
        feedback: null
      }
    }));
  }, []);

  // Reset hook state
  const reset = useCallback(() => {
    setState({
      ...initialState,
      retrievalOptions: { ...defaultRetrievalOptions, ...customRetrievalOptions },
      generationOptions: { ...defaultGenerationOptions, ...customGenerationOptions }
    });
  }, [customRetrievalOptions, customGenerationOptions]);

  // Auto-create session on mount if needed
  useEffect(() => {
    if (knowledgeBaseIds.length > 0 && !state.currentSession && !sessionId) {
      createSession();
    }
  }, [knowledgeBaseIds, state.currentSession, sessionId, createSession]);

  // Computed values
  const computed = useMemo(() => ({
    hasConversation: state.conversation.length > 0,
    hasErrors: Object.values(state.errors).some(error => error !== null),
    isLoading: Object.values(state.loading).some(loading => loading),
    isStreaming: state.streaming.isStreaming,

    // Conversation utilities
    conversationLength: state.conversation.length,
    lastResponse: state.conversation[state.conversation.length - 1]?.response,
    lastQuery: state.conversation[state.conversation.length - 1]?.query,

    // Feedback statistics
    feedbackCount: state.conversation.filter(turn => turn.feedback).length,
    averageRating: state.conversation
      .filter(turn => turn.feedback)
      .reduce((sum, turn) => sum + (turn.feedback?.rating || 0), 0) /
      Math.max(1, state.conversation.filter(turn => turn.feedback).length),

    // Response statistics
    averageConfidence: state.conversation.length
      ? state.conversation.reduce((sum, turn) => sum + turn.response.confidence, 0) / state.conversation.length
      : 0,

    averageResponseTime: state.conversation.length
      ? state.conversation.reduce((sum, turn) => sum + turn.response.processingTime, 0) / state.conversation.length
      : 0,

    totalTokens: state.conversation.reduce((sum, turn) => sum + turn.response.totalTokens, 0),
    totalCost: state.conversation.reduce((sum, turn) => sum + turn.response.cost, 0),

    // Source statistics
    uniqueSources: new Set(
      state.conversation.flatMap(turn => turn.response.sources.map(source => source.documentId))
    ).size,

    // Get utilities
    getTurn: (index: number) => state.conversation[index],
    getResponse: (id: string) => state.conversation.find(turn => turn.response.id === id)?.response,
    getQuery: (responseId: string) => state.conversation.find(turn => turn.response.id === responseId)?.query,

    // Streaming utilities
    streamingResponse: state.streaming.accumulatedResponse,
    streamingError: state.streaming.error,

    // Session info
    hasSession: !!state.currentSession,
    sessionId: state.currentSession?.id
  }), [state]);

  return {
    // State
    ...state,

    // Operations
    generate,
    generateStreaming,
    provideFeedback,
    regenerate,
    loadHistory,
    createSession,
    setQuery,
    updateRetrievalOptions,
    updateGenerationOptions,
    clearConversation,

    // Utilities
    clearErrors,
    reset,

    // Computed values
    ...computed
  };
};

export default useRAGGeneration;