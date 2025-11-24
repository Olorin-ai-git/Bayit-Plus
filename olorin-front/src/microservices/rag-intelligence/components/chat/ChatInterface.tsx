import React, { useState, useCallback, useEffect, useMemo } from 'react';
<<<<<<< HEAD
import { toast } from 'react-hot-toast';
import { EnhancedChatMessage, ViewMode } from '../../types/ragIntelligence';
=======
import { useToast } from '@shared/components/ui/ToastProvider';
import { FileText, Sparkles, History } from 'lucide-react';
import { EnhancedChatMessage, ViewMode, PreparedPrompt } from '../../types/ragIntelligence';
>>>>>>> 001-modify-analyzer-method
import RAGApiService from '@shared/services/RAGApiService';
import ResponseAnalyzer from '@shared/services/ResponseAnalyzer';
import MessageInput from './MessageInput';
import MessageList from './MessageList';
<<<<<<< HEAD
=======
import ChatHistorySidebar from './ChatHistorySidebar';
import { WizardPanel } from '@shared/components/WizardPanel';
>>>>>>> 001-modify-analyzer-method

interface ChatInterfaceProps {
  className?: string;
}

const ChatInterface: React.FC<ChatInterfaceProps> = ({ className = "" }) => {
<<<<<<< HEAD
=======
  const { showToast } = useToast();

>>>>>>> 001-modify-analyzer-method
  // State management
  const [chatMessages, setChatMessages] = useState<EnhancedChatMessage[]>([]);
  const [currentMessage, setCurrentMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
<<<<<<< HEAD
=======
  const [preparedPrompts, setPreparedPrompts] = useState<PreparedPrompt[]>([]);
  const [promptsExpanded, setPromptsExpanded] = useState(false);
  const [promptsLoading, setPromptsLoading] = useState(false);
  const [autoSendPrompts, setAutoSendPrompts] = useState(false);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isCreatingSession, setIsCreatingSession] = useState(false);
  
  // Track if user has started a conversation (prevents welcome message from reappearing)
  const hasStartedConversationRef = React.useRef<boolean>(false);
>>>>>>> 001-modify-analyzer-method

  // View control states
  const [expandedMessages, setExpandedMessages] = useState<Set<string>>(new Set());
  const [messageViewModes, setMessageViewModes] = useState<Record<string, ViewMode>>({});

  // Initialize RAG service
<<<<<<< HEAD
  const ragService = useMemo(() => new RAGApiService(null), []);
=======
  const ragService = useMemo(() => RAGApiService, []);

  // Create or get current session
  const ensureSession = useCallback(async () => {
    if (currentSessionId) return currentSessionId;

    try {
      setIsCreatingSession(true);
      const session = await ragService.createChatSession();
      setCurrentSessionId(session.id);
      return session.id;
    } catch (error) {
      console.error('Failed to create session:', error);
      showToast('error', 'Error', 'Failed to create chat session');
      return null;
    } finally {
      setIsCreatingSession(false);
    }
  }, [currentSessionId, ragService]);

  // Save message to database
  const saveMessage = useCallback(async (message: EnhancedChatMessage) => {
    if (!currentSessionId) return;

    try {
      await ragService.addChatMessage(currentSessionId, {
        sender: message.sender,
        content: message.content,
        natural_query: message.natural_query || undefined,
        translated_query: message.translated_query || undefined,
        query_metadata: message.query_metadata || undefined,
        structured_data: message.structured_data || undefined
      });
    } catch (error) {
      console.error('Failed to save message:', error);
      // Don't show error toast for every message save failure
    }
  }, [currentSessionId, ragService]);

  // Load chat session
  const loadChatSession = useCallback(async (sessionId: string) => {
    if (!sessionId) {
      // New chat - clear messages and reset conversation flag
      setChatMessages([]);
      setCurrentSessionId(null);
      hasStartedConversationRef.current = false;
      return;
    }

    try {
      setIsLoading(true);
      const session = await ragService.getChatSession(sessionId);
      
      // Convert database messages to EnhancedChatMessage format
      const messages: EnhancedChatMessage[] = session.messages.map((msg: any) => ({
        id: msg.id,
        sender: msg.sender,
        content: msg.content,
        timestamp: new Date(msg.created_at),
        natural_query: msg.natural_query || undefined,
        translated_query: msg.translated_query || undefined,
        query_metadata: msg.query_metadata || undefined,
        structured_data: msg.structured_data || undefined
      }));

      setChatMessages(messages);
      setCurrentSessionId(sessionId);
      // Mark conversation as started if there are messages
      if (messages.length > 0) {
        hasStartedConversationRef.current = true;
      }
      showToast('success', 'Success', 'Chat loaded');
    } catch (error) {
      console.error('Failed to load chat session:', error);
      showToast('error', 'Error', 'Failed to load chat');
    } finally {
      setIsLoading(false);
    }
  }, [ragService]);
>>>>>>> 001-modify-analyzer-method

  // Send message to RAG API
  const sendMessage = useCallback(async () => {
    if (!currentMessage.trim() || isLoading) return;

    setIsLoading(true);

<<<<<<< HEAD
    // Add user message immediately
    const userMessage: EnhancedChatMessage = {
      id: Date.now().toString(),
      sender: 'user',
      content: currentMessage,
      timestamp: new Date(),
      natural_query: currentMessage,
    };

    setChatMessages(prev => [...prev, userMessage]);
    const queryToSend = currentMessage;
    setCurrentMessage('');

    try {
      // Send natural query to RAG API
      const naturalQueryResponse = await ragService.sendNaturalQuery({
        natural_query: queryToSend,
        user_id: 'demo-user',
        auto_index: true, // Automatically index and query in one step
      });

      // Handle case where API doesn't exist or returns undefined
      if (!naturalQueryResponse) {
        const errorMessage: EnhancedChatMessage = {
          id: (Date.now() + 1).toString(),
          sender: 'system',
          content: 'RAG API is not available. Please configure the RAG endpoints on your server.',
          timestamp: new Date(),
        };
        setChatMessages(prev => [...prev, errorMessage]);
        return;
      }

      // Extract response content from the API response structure
      let responseContent = 'No response received';

      // Try multiple possible locations for the response content
      if (naturalQueryResponse.additional_data?.response) {
        responseContent = naturalQueryResponse.additional_data.response;
      } else if (naturalQueryResponse.response) {
        responseContent = naturalQueryResponse.response;
      } else if (naturalQueryResponse.message) {
        responseContent = naturalQueryResponse.message;
      } else if (naturalQueryResponse.llm_thoughts) {
        responseContent = naturalQueryResponse.llm_thoughts;
      }

      // Create basic assistant message with enhanced data
      const assistantMessage: EnhancedChatMessage = {
        id: (Date.now() + 1).toString(),
        sender: 'assistant',
        content: responseContent,
        timestamp: new Date(),
        natural_query: queryToSend,
        translated_query: naturalQueryResponse.translated_query || naturalQueryResponse.translation,
        query_metadata: {
          execution_time: naturalQueryResponse.execution_time,
          result_count: naturalQueryResponse.result_count ||
                       naturalQueryResponse.additional_data?.sources?.length || 0,
          sources: naturalQueryResponse.additional_data?.sources ||
                  naturalQueryResponse.sources || [],
          confidence: naturalQueryResponse.confidence,
        },
      };

      // Check if structured data is available from API response first
      const apiStructuredData = naturalQueryResponse.additional_data?.structured_data ||
                                naturalQueryResponse.structured_data;

      if (apiStructuredData &&
          apiStructuredData.data &&
          Array.isArray(apiStructuredData.data) &&
          apiStructuredData.data.length > 0) {

        // Use structured data from API response
        assistantMessage.structured_data = {
          data: apiStructuredData.data,
          columns: apiStructuredData.columns || [],
          metadata: {
            confidence: naturalQueryResponse.confidence || 0.8,
            total_count: apiStructuredData.data.length,
            field_mapping: apiStructuredData.field_mapping || {},
            source_info: apiStructuredData.source_info || {},
          },
        };

        // Set default view mode to table for structured data
        setMessageViewModes(prev => ({
          ...prev,
          [assistantMessage.id]: 'table',
        }));

        setChatMessages(prev => [...prev, assistantMessage]);
      } else {
        // Fallback: Analyze the response for structured data
        const analysisResult = ResponseAnalyzer.analyzeResponse(assistantMessage.content);

        // If structured data is detected, enhance the message
        if (analysisResult.hasStructuredData) {
          const enhancedMessage = ResponseAnalyzer.enhanceMessage(
            assistantMessage,
            analysisResult
          );

          // Set default view mode to table for structured data
          setMessageViewModes(prev => ({
            ...prev,
            [enhancedMessage.id]: 'table',
          }));

          setChatMessages(prev => [...prev, enhancedMessage]);
        } else {
          // No structured data, add as regular message
          setChatMessages(prev => [...prev, assistantMessage]);
=======
    const queryToSend = currentMessage;
    setCurrentMessage('');

    // Ensure we have a session
    const sessionId = await ensureSession();
    if (!sessionId) {
      setIsLoading(false);
      return;
    }

    // Mark that conversation has started
    hasStartedConversationRef.current = true;

    // Add user message immediately and remove welcome message in a single update
    const userMessage: EnhancedChatMessage = {
      id: Date.now().toString(),
      sender: 'user',
      content: queryToSend,
      timestamp: new Date(),
      natural_query: queryToSend,
    };

    setChatMessages(prev => {
      // Remove welcome message and add user message atomically
      const filtered = prev.filter(msg => msg.id !== 'welcome');
      return [...filtered, userMessage];
    });

    // Save user message to database
    await saveMessage(userMessage);

    try {
      // Send query to RAG API
      const ragResponse = await ragService.query({
        query_text: queryToSend,
        limit: 10,
        similarity_threshold: 0.7,
        user_id: 'demo-user'
      });

      // Create assistant message with citations
      const assistantMessage: EnhancedChatMessage = {
        id: (Date.now() + 1).toString(),
        sender: 'assistant',
        content: ragResponse.answer,
        timestamp: new Date(),
        natural_query: queryToSend,
        query_metadata: {
          execution_time: ragResponse.processing_time_ms,
          result_count: ragResponse.sources.length,
          sources: ragResponse.sources.map(s => ({
            chunk_id: s.chunk_id,
            content: s.content,
            similarity_score: s.similarity_score,
            source_type: s.source_type,
            source_name: s.source_name,
            metadata: s.metadata
          })),
          confidence: ragResponse.confidence,
          citations: ragResponse.citations
        },
      };

      // Analyze response for structured data (optional)
      const analysisResult = ResponseAnalyzer.analyzeResponse(assistantMessage.content);

      let finalMessage: EnhancedChatMessage;
      if (analysisResult.hasStructuredData) {
        finalMessage = ResponseAnalyzer.enhanceMessage(
          assistantMessage,
          analysisResult
        );
      } else {
        finalMessage = assistantMessage;
      }

      setChatMessages(prev => {
        // Ensure welcome message is removed when adding assistant response
        const filtered = prev.filter(msg => msg.id !== 'welcome');
        return [...filtered, finalMessage];
      });

      // Save assistant message to database
      await saveMessage(finalMessage);

      // Update session title from first user message if needed
      if (chatMessages.length === 0 || chatMessages.every(m => m.id === 'welcome')) {
        const firstUserMsg = queryToSend.substring(0, 50);
        try {
          await ragService.updateChatSession(sessionId, {
            title: firstUserMsg.length < queryToSend.length ? `${firstUserMsg}...` : firstUserMsg
          });
        } catch (error) {
          // Ignore title update errors
>>>>>>> 001-modify-analyzer-method
        }
      }

      // Show success toast
<<<<<<< HEAD
      toast.success('Query processed successfully');
=======
      showToast('success', 'Success', 'Query processed successfully');
>>>>>>> 001-modify-analyzer-method

    } catch (error) {
      const errorMessage: EnhancedChatMessage = {
        id: (Date.now() + 1).toString(),
        sender: 'system',
        content: `RAG API Error: ${
          error instanceof Error ? error.message : 'Service not available'
        }. Please configure RAG endpoints on your server.`,
        timestamp: new Date(),
      };
<<<<<<< HEAD
      setChatMessages(prev => [...prev, errorMessage]);
      toast.error('Failed to process query');
    } finally {
      setIsLoading(false);
    }
  }, [currentMessage, isLoading, ragService]);
=======
      setChatMessages(prev => {
        // Ensure welcome message is removed when adding error message
        const filtered = prev.filter(msg => msg.id !== 'welcome');
        return [...filtered, errorMessage];
      });
      await saveMessage(errorMessage);
      showToast('error', 'Error', 'Failed to process query');
    } finally {
      setIsLoading(false);
    }
  }, [currentMessage, isLoading, ragService, ensureSession, saveMessage, chatMessages.length]);
>>>>>>> 001-modify-analyzer-method

  // Toggle message expansion
  const toggleExpanded = useCallback((messageId: string) => {
    setExpandedMessages(prev => {
      const newSet = new Set(prev);
      if (newSet.has(messageId)) {
        newSet.delete(messageId);
      } else {
        newSet.add(messageId);
      }
      return newSet;
    });
  }, []);

  // Change message view mode
  const changeViewMode = useCallback((messageId: string, mode: ViewMode) => {
    setMessageViewModes(prev => ({
      ...prev,
      [messageId]: mode,
    }));
  }, []);

  // Edit message and resend
  const editMessage = useCallback(async (messageId: string, newQuery: string) => {
    // Find the message to edit
    const messageIndex = chatMessages.findIndex(msg => msg.id === messageId);
    if (messageIndex === -1) return;

    // Remove all messages after the edited one
    const updatedMessages = chatMessages.slice(0, messageIndex);
    setChatMessages(updatedMessages);

    // Send new query
    setCurrentMessage(newQuery);
    setTimeout(() => {
      sendMessage();
    }, 100);

<<<<<<< HEAD
    toast.info('Resending query with updated text');
=======
    showToast('info', 'Info', 'Resending query with updated text');
>>>>>>> 001-modify-analyzer-method
  }, [chatMessages, sendMessage]);

  // Copy to clipboard
  const copyToClipboard = useCallback((text: string) => {
    navigator.clipboard.writeText(text).then(() => {
<<<<<<< HEAD
      toast.success('Copied to clipboard');
    }).catch(() => {
      toast.error('Failed to copy to clipboard');
    });
  }, []);
=======
      showToast('success', 'Success', 'Copied to clipboard');
    }).catch(() => {
      showToast('error', 'Error', 'Failed to copy to clipboard');
    });
  }, [showToast]);
>>>>>>> 001-modify-analyzer-method

  // Clear all messages
  const clearMessages = useCallback(() => {
    setChatMessages([]);
    setExpandedMessages(new Set());
    setMessageViewModes({});
    setSearchTerm('');
<<<<<<< HEAD
    toast.success('Chat history cleared');
  }, []);
=======
    showToast('success', 'Success', 'Chat history cleared');
  }, [showToast]);
>>>>>>> 001-modify-analyzer-method

  // Export messages
  const exportMessages = useCallback(() => {
    const exportData = {
      timestamp: new Date().toISOString(),
      total_messages: chatMessages.length,
      messages: chatMessages.map(msg => ({
        id: msg.id,
        sender: msg.sender,
        content: msg.content,
        timestamp: msg.timestamp.toISOString(),
        natural_query: msg.natural_query,
        translated_query: msg.translated_query,
        query_metadata: msg.query_metadata,
        structured_data: msg.structured_data
      }))
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `rag-chat-export-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

<<<<<<< HEAD
    toast.success('Chat history exported');
  }, [chatMessages]);
=======
    showToast('success', 'Success', 'Chat history exported');
  }, [chatMessages, showToast]);

  // Load prepared prompts
  const loadPreparedPrompts = useCallback(async () => {
    try {
      setPromptsLoading(true);
      // Try to get prompts from API if method exists
      // For now, we'll use a fallback approach
      const data = await (ragService as any).getPreparedPrompts?.();
      
      if (data && data.prompts) {
        const prompts: PreparedPrompt[] = (data.prompts || []).map((prompt: any) => ({
          id: prompt.id || prompt.title?.toLowerCase().replace(/\s+/g, '_') || Math.random().toString(36).substr(2, 9),
          title: prompt.title || 'Untitled Prompt',
          description: prompt.description || '',
          category: prompt.category || 'general',
          template: prompt.template || prompt.prompt || '',
          variables: prompt.variables || [],
          created_at: prompt.created_at,
          updated_at: prompt.updated_at,
        }));
        setPreparedPrompts(prompts);
      } else {
        // Fallback: Use expanded default example prompts
        setPreparedPrompts([
          {
            id: 'example-1',
            title: 'Transaction Analysis',
            description: 'Analyze transactions over a certain amount',
            category: 'analysis',
            template: 'Show me all transactions over $1000 from the last 30 days',
            variables: [],
          },
          {
            id: 'example-2',
            title: 'Pattern Detection',
            description: 'Find patterns in user behavior',
            category: 'analysis',
            template: 'Find patterns in user behavior data',
            variables: [],
          },
          {
            id: 'example-3',
            title: 'Risk Indicators',
            description: 'Identify common risk indicators',
            category: 'risk',
            template: 'What are the top risk indicators in the data?',
            variables: [],
          },
          {
            id: 'example-4',
            title: 'Fraud Detection',
            description: 'Identify potential fraud patterns',
            category: 'fraud',
            template: 'Show me transactions that match known fraud patterns',
            variables: [],
          },
          {
            id: 'example-5',
            title: 'User Activity Timeline',
            description: 'Get chronological activity for a user',
            category: 'investigation',
            template: 'Show me all activity for user {user_id} in the last 7 days',
            variables: ['user_id'],
          },
          {
            id: 'example-6',
            title: 'IP Address Analysis',
            description: 'Analyze transactions from a specific IP',
            category: 'network',
            template: 'Analyze all transactions from IP address {ip_address}',
            variables: ['ip_address'],
          },
          {
            id: 'example-7',
            title: 'Device Fingerprinting',
            description: 'Find devices associated with suspicious activity',
            category: 'device',
            template: 'Find all devices linked to high-risk transactions',
            variables: [],
          },
          {
            id: 'example-8',
            title: 'Geographic Patterns',
            description: 'Identify unusual geographic patterns',
            category: 'location',
            template: 'Show me transactions with unusual geographic patterns',
            variables: [],
          },
          {
            id: 'example-9',
            title: 'Payment Method Analysis',
            description: 'Analyze transactions by payment method',
            category: 'analysis',
            template: 'Compare fraud rates across different payment methods',
            variables: [],
          },
          {
            id: 'example-10',
            title: 'Time-based Anomalies',
            description: 'Find anomalies in transaction timing',
            category: 'analysis',
            template: 'Identify transactions that occurred at unusual times',
            variables: [],
          },
          {
            id: 'example-11',
            title: 'High-Value Transactions',
            description: 'Find and analyze high-value transactions',
            category: 'analysis',
            template: 'Show me all transactions above $5000 with risk scores',
            variables: [],
          },
          {
            id: 'example-12',
            title: 'Cross-Entity Analysis',
            description: 'Find connections between different entities',
            category: 'investigation',
            template: 'Find connections between user {user_id} and IP {ip_address}',
            variables: ['user_id', 'ip_address'],
          },
        ]);
      }
    } catch (error) {
      console.warn('Failed to load prepared prompts, using defaults:', error);
      // Use default prompts on error (same as fallback)
      setPreparedPrompts([
        {
          id: 'example-1',
          title: 'Transaction Analysis',
          description: 'Analyze transactions over a certain amount',
          category: 'analysis',
          template: 'Show me all transactions over $1000 from the last 30 days',
          variables: [],
        },
        {
          id: 'example-2',
          title: 'Pattern Detection',
          description: 'Find patterns in user behavior',
          category: 'analysis',
          template: 'Find patterns in user behavior data',
          variables: [],
        },
        {
          id: 'example-3',
          title: 'Risk Indicators',
          description: 'Identify common risk indicators',
          category: 'risk',
          template: 'What are the top risk indicators in the data?',
          variables: [],
        },
        {
          id: 'example-4',
          title: 'Fraud Detection',
          description: 'Identify potential fraud patterns',
          category: 'fraud',
          template: 'Show me transactions that match known fraud patterns',
          variables: [],
        },
        {
          id: 'example-5',
          title: 'User Activity Timeline',
          description: 'Get chronological activity for a user',
          category: 'investigation',
          template: 'Show me all activity for user {user_id} in the last 7 days',
          variables: ['user_id'],
        },
        {
          id: 'example-6',
          title: 'IP Address Analysis',
          description: 'Analyze transactions from a specific IP',
          category: 'network',
          template: 'Analyze all transactions from IP address {ip_address}',
          variables: ['ip_address'],
        },
        {
          id: 'example-7',
          title: 'Device Fingerprinting',
          description: 'Find devices associated with suspicious activity',
          category: 'device',
          template: 'Find all devices linked to high-risk transactions',
          variables: [],
        },
        {
          id: 'example-8',
          title: 'Geographic Patterns',
          description: 'Identify unusual geographic patterns',
          category: 'location',
          template: 'Show me transactions with unusual geographic patterns',
          variables: [],
        },
        {
          id: 'example-9',
          title: 'Payment Method Analysis',
          description: 'Analyze transactions by payment method',
          category: 'analysis',
          template: 'Compare fraud rates across different payment methods',
          variables: [],
        },
        {
          id: 'example-10',
          title: 'Time-based Anomalies',
          description: 'Find anomalies in transaction timing',
          category: 'analysis',
          template: 'Identify transactions that occurred at unusual times',
          variables: [],
        },
        {
          id: 'example-11',
          title: 'High-Value Transactions',
          description: 'Find and analyze high-value transactions',
          category: 'analysis',
          template: 'Show me all transactions above $5000 with risk scores',
          variables: [],
        },
        {
          id: 'example-12',
          title: 'Cross-Entity Analysis',
          description: 'Find connections between different entities',
          category: 'investigation',
          template: 'Find connections between user {user_id} and IP {ip_address}',
          variables: ['user_id', 'ip_address'],
        },
      ]);
    } finally {
      setPromptsLoading(false);
    }
  }, [ragService]);

  // Apply prompt to input or send immediately
  const applyPrompt = useCallback((prompt: PreparedPrompt) => {
    if (autoSendPrompts) {
      // Mark that conversation has started
      hasStartedConversationRef.current = true;
      
      // Auto-send: Remove welcome message and send immediately
      const queryToSend = prompt.template;
      
      // Remove welcome message immediately
      setChatMessages(prev => {
        const filtered = prev.filter(msg => msg.id !== 'welcome');
        return filtered;
      });
      
      // Clear input and trigger send with the prompt text directly
      setCurrentMessage('');
      
      // Use setTimeout to ensure state updates complete, then send
      setTimeout(async () => {
        // Ensure we have a session
        const sessionId = await ensureSession();
        if (!sessionId) {
          setIsLoading(false);
          return;
        }

        // Add user message immediately (ensure welcome message is removed)
        const userMessage: EnhancedChatMessage = {
          id: Date.now().toString(),
          sender: 'user',
          content: queryToSend,
          timestamp: new Date(),
          natural_query: queryToSend,
        };

        setChatMessages(prev => {
          // Remove welcome message and add user message atomically
          const filtered = prev.filter(msg => msg.id !== 'welcome');
          return [...filtered, userMessage];
        });

        // Save user message to database
        await saveMessage(userMessage);

        setIsLoading(true);
        try {
          // Send query to RAG API
          const ragResponse = await ragService.query({
            query_text: queryToSend,
            limit: 10,
            similarity_threshold: 0.7,
            user_id: 'demo-user'
          });

          // Create assistant message with citations
          const assistantMessage: EnhancedChatMessage = {
            id: (Date.now() + 1).toString(),
            sender: 'assistant',
            content: ragResponse.answer,
            timestamp: new Date(),
            natural_query: queryToSend,
            query_metadata: {
              execution_time: ragResponse.processing_time_ms,
              result_count: ragResponse.sources.length,
              sources: ragResponse.sources.map(s => ({
                chunk_id: s.chunk_id,
                content: s.content,
                similarity_score: s.similarity_score,
                source_type: s.source_type,
                source_name: s.source_name,
                metadata: s.metadata
              })),
              confidence: ragResponse.confidence,
              citations: ragResponse.citations
            },
          };

          // Analyze response for structured data (optional)
          const analysisResult = ResponseAnalyzer.analyzeResponse(assistantMessage.content);

          let finalMessage: EnhancedChatMessage;
          if (analysisResult.hasStructuredData) {
            finalMessage = ResponseAnalyzer.enhanceMessage(
              assistantMessage,
              analysisResult
            );
          } else {
            finalMessage = assistantMessage;
          }

          setChatMessages(prev => {
            // Ensure welcome message is removed when adding assistant response
            const filtered = prev.filter(msg => msg.id !== 'welcome');
            return [...filtered, finalMessage];
          });

          // Save assistant message to database
          await saveMessage(finalMessage);

          // Update session title from first user message
          const firstUserMsg = queryToSend.substring(0, 50);
          try {
            await ragService.updateChatSession(sessionId, {
              title: firstUserMsg.length < queryToSend.length ? `${firstUserMsg}...` : firstUserMsg
            });
          } catch (error) {
            // Ignore title update errors
          }

          // Show success toast
          showToast('success', 'Success', 'Query processed successfully');

        } catch (error) {
          const errorMessage: EnhancedChatMessage = {
            id: (Date.now() + 1).toString(),
            sender: 'system',
            content: `RAG API Error: ${
              error instanceof Error ? error.message : 'Service not available'
            }. Please configure RAG endpoints on your server.`,
            timestamp: new Date(),
          };
          setChatMessages(prev => {
            // Ensure welcome message is removed when adding error message
            const filtered = prev.filter(msg => msg.id !== 'welcome');
            return [...filtered, errorMessage];
          });
          await saveMessage(errorMessage);
          showToast('error', 'Error', 'Failed to process query');
        } finally {
          setIsLoading(false);
        }
      }, 50);
      showToast('success', 'Success', `Sent prompt: ${prompt.title}`);
    } else {
      // Normal mode: Just fill the input
    setCurrentMessage(prompt.template);
    showToast('success', 'Success', `Applied prompt: ${prompt.title}`);
    }
  }, [autoSendPrompts, ensureSession, saveMessage, ragService, chatMessages]);
>>>>>>> 001-modify-analyzer-method

  // Load sample data on mount (for demo purposes)
  useEffect(() => {
    const loadSampleData = () => {
      const welcomeMessage: EnhancedChatMessage = {
        id: 'welcome',
<<<<<<< HEAD
        sender: 'assistant',
=======
        sender: 'system',
>>>>>>> 001-modify-analyzer-method
        content: `Welcome to the RAG Intelligence Chat Interface!

I can help you query and analyze your data using natural language. Here's what I can do:

• **Natural Language Queries**: Ask questions in plain English about your data
• **Structured Data Display**: View results in table format with filtering and sorting
• **Multiple View Modes**: Switch between enhanced, table, and raw views
• **Query Translation**: See how your natural language gets converted to actual queries
• **Export & History**: Save your conversations and results for later reference

Try asking me something like:
- "Show me all transactions over $1000 from last month"
- "Find patterns in user behavior data"
- "What are the most common risk indicators?"

How can I help you today?`,
        timestamp: new Date(),
      };

      setChatMessages([welcomeMessage]);
    };

<<<<<<< HEAD
    if (chatMessages.length === 0) {
      loadSampleData();
    }
  }, [chatMessages.length]);

  return (
    <div className={`flex flex-col h-full bg-white rounded-lg border border-gray-200 shadow-sm ${className}`}>
      {/* Header */}
      <div className="flex-shrink-0 px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              RAG Chat Interface
            </h2>
            <p className="text-sm text-gray-600 mt-1">
=======
    // Only show welcome message if:
    // 1. There are no messages
    // 2. No current session
    // 3. User hasn't started a conversation yet
    // (if we're loading a session, don't show welcome)
    if (chatMessages.length === 0 && !currentSessionId && !hasStartedConversationRef.current) {
      loadSampleData();
    }
  }, [chatMessages.length, currentSessionId]);

  // Load prepared prompts on mount
  useEffect(() => {
    loadPreparedPrompts();
  }, [loadPreparedPrompts]);

  return (
    <div className={`flex flex-col h-full relative ${className}`}>
      {/* Chat History Sidebar */}
      <ChatHistorySidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onSelectSession={loadChatSession}
        currentSessionId={currentSessionId}
      />
      {/* Header */}
      <div className="flex-shrink-0 px-6 py-4 border-b-2 border-corporate-accentPrimary/40 bg-black/40 backdrop-blur-md">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-corporate-textPrimary">
              RAG Chat Interface
            </h2>
            <p className="text-sm text-corporate-textSecondary mt-1">
>>>>>>> 001-modify-analyzer-method
              Ask questions about your data in natural language
            </p>
          </div>

          <div className="flex items-center space-x-2">
<<<<<<< HEAD
            <div className={`
              flex items-center space-x-2 px-3 py-1.5 rounded-full text-xs font-medium
              ${isLoading
                ? 'bg-yellow-100 text-yellow-800'
                : 'bg-green-100 text-green-800'
=======
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 rounded-lg hover:bg-black/40 text-corporate-textSecondary hover:text-corporate-accentPrimary transition-colors border-2 border-corporate-borderPrimary/40 hover:border-corporate-accentPrimary/60"
              title="Chat History"
            >
              <History className="w-5 h-5" />
            </button>
            <div className={`
              flex items-center space-x-2 px-3 py-1.5 rounded-full text-xs font-medium border-2
              ${isLoading
                ? 'bg-corporate-warning/20 text-corporate-warning border-corporate-warning/50'
                : 'bg-corporate-success/20 text-corporate-success border-corporate-success/50'
>>>>>>> 001-modify-analyzer-method
              }
            `}>
              <div className={`
                w-2 h-2 rounded-full
<<<<<<< HEAD
                ${isLoading ? 'bg-yellow-400 animate-pulse' : 'bg-green-400'}
=======
                ${isLoading ? 'bg-corporate-warning animate-pulse' : 'bg-corporate-success'}
>>>>>>> 001-modify-analyzer-method
              `} />
              <span>{isLoading ? 'Processing...' : 'Ready'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 min-h-0">
        <MessageList
          messages={chatMessages}
          expandedMessages={expandedMessages}
          messageViewModes={messageViewModes}
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          onToggleExpand={toggleExpanded}
          onChangeViewMode={changeViewMode}
          onEditMessage={editMessage}
          onCopy={copyToClipboard}
          onClearMessages={clearMessages}
          onExportMessages={exportMessages}
        />
      </div>

<<<<<<< HEAD
      {/* Input */}
      <div className="flex-shrink-0 p-4 border-t border-gray-200 bg-gray-50">
=======
      {/* Pre-made Prompts Section */}
      <div className="flex-shrink-0 px-4 pt-4 border-t-2 border-corporate-accentPrimary/40 bg-black/40 backdrop-blur-md">
        <WizardPanel
          title="Pre-made Prompts"
          isExpanded={promptsExpanded}
          onToggle={() => setPromptsExpanded(!promptsExpanded)}
          icon={<Sparkles className="w-5 h-5" />}
          className="mb-4"
        >
          {/* Auto-send checkbox */}
          <div className="flex items-center justify-between mb-3 pb-3 border-b border-corporate-borderPrimary/40">
            <label className="flex items-center space-x-2 cursor-pointer group">
              <input
                type="checkbox"
                checked={autoSendPrompts}
                onChange={(e) => setAutoSendPrompts(e.target.checked)}
                className="w-4 h-4 rounded border-2 border-corporate-borderPrimary bg-black/40 text-corporate-accentPrimary focus:ring-2 focus:ring-corporate-accentPrimary focus:ring-offset-2 focus:ring-offset-black cursor-pointer"
              />
              <span className="text-sm text-corporate-textSecondary group-hover:text-corporate-textPrimary transition-colors">
                Auto-send on click
              </span>
            </label>
            <span className="text-xs text-corporate-textTertiary">
              {preparedPrompts.length} prompt{preparedPrompts.length !== 1 ? 's' : ''} available
            </span>
          </div>
          {promptsLoading ? (
            <div className="text-center py-4">
              <div className="text-sm text-corporate-textTertiary">Loading prompts...</div>
            </div>
          ) : preparedPrompts.length === 0 ? (
            <div className="text-center py-4">
              <FileText className="w-8 h-8 text-corporate-textTertiary mx-auto mb-2" />
              <div className="text-sm text-corporate-textTertiary">No prompts available</div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-64 overflow-y-auto scrollbar-thin scrollbar-thumb-corporate-borderPrimary scrollbar-track-transparent">
              {preparedPrompts.map((prompt) => (
                <button
                  key={prompt.id}
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    applyPrompt(prompt);
                  }}
                  className="text-left p-3 bg-black/40 backdrop-blur-md border-2 border-corporate-borderPrimary/40 rounded-lg hover:border-corporate-accentPrimary/60 transition-colors group cursor-pointer"
                >
                  <div className="flex items-start justify-between mb-1">
                    <h4 className="text-sm font-medium text-corporate-textPrimary group-hover:text-corporate-accentPrimary transition-colors">
                      {prompt.title}
                    </h4>
                    {prompt.category && (
                      <span className="px-1.5 py-0.5 text-xs bg-corporate-accentPrimary/20 text-corporate-accentPrimary rounded border border-corporate-accentPrimary/40">
                        {prompt.category}
                      </span>
                    )}
                  </div>
                  {prompt.description && (
                    <p className="text-xs text-corporate-textTertiary mb-2 line-clamp-2">
                      {prompt.description}
                    </p>
                  )}
                  <div className="text-xs text-corporate-textSecondary font-mono bg-black/40 p-2 rounded border border-corporate-borderPrimary/40 line-clamp-2">
                    {prompt.template}
                  </div>
                </button>
              ))}
            </div>
          )}
        </WizardPanel>
      </div>

      {/* Input */}
      <div className="flex-shrink-0 p-4 bg-black/40 backdrop-blur-md">
>>>>>>> 001-modify-analyzer-method
        <MessageInput
          currentMessage={currentMessage}
          setCurrentMessage={setCurrentMessage}
          onSendMessage={sendMessage}
          isLoading={isLoading}
          placeholder="Ask anything about your data..."
        />
      </div>
    </div>
  );
};

export default ChatInterface;