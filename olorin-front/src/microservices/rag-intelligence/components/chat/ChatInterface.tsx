import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { toast } from 'react-hot-toast';
import { EnhancedChatMessage, ViewMode } from '../../types/ragIntelligence';
import RAGApiService from '@shared/services/RAGApiService';
import ResponseAnalyzer from '@shared/services/ResponseAnalyzer';
import MessageInput from './MessageInput';
import MessageList from './MessageList';

interface ChatInterfaceProps {
  className?: string;
}

const ChatInterface: React.FC<ChatInterfaceProps> = ({ className = "" }) => {
  // State management
  const [chatMessages, setChatMessages] = useState<EnhancedChatMessage[]>([]);
  const [currentMessage, setCurrentMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // View control states
  const [expandedMessages, setExpandedMessages] = useState<Set<string>>(new Set());
  const [messageViewModes, setMessageViewModes] = useState<Record<string, ViewMode>>({});

  // Initialize RAG service
  const ragService = useMemo(() => new RAGApiService(null), []);

  // Send message to RAG API
  const sendMessage = useCallback(async () => {
    if (!currentMessage.trim() || isLoading) return;

    setIsLoading(true);

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
        }
      }

      // Show success toast
      toast.success('Query processed successfully');

    } catch (error) {
      const errorMessage: EnhancedChatMessage = {
        id: (Date.now() + 1).toString(),
        sender: 'system',
        content: `RAG API Error: ${
          error instanceof Error ? error.message : 'Service not available'
        }. Please configure RAG endpoints on your server.`,
        timestamp: new Date(),
      };
      setChatMessages(prev => [...prev, errorMessage]);
      toast.error('Failed to process query');
    } finally {
      setIsLoading(false);
    }
  }, [currentMessage, isLoading, ragService]);

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

    toast.info('Resending query with updated text');
  }, [chatMessages, sendMessage]);

  // Copy to clipboard
  const copyToClipboard = useCallback((text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      toast.success('Copied to clipboard');
    }).catch(() => {
      toast.error('Failed to copy to clipboard');
    });
  }, []);

  // Clear all messages
  const clearMessages = useCallback(() => {
    setChatMessages([]);
    setExpandedMessages(new Set());
    setMessageViewModes({});
    setSearchTerm('');
    toast.success('Chat history cleared');
  }, []);

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

    toast.success('Chat history exported');
  }, [chatMessages]);

  // Load sample data on mount (for demo purposes)
  useEffect(() => {
    const loadSampleData = () => {
      const welcomeMessage: EnhancedChatMessage = {
        id: 'welcome',
        sender: 'assistant',
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
              Ask questions about your data in natural language
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <div className={`
              flex items-center space-x-2 px-3 py-1.5 rounded-full text-xs font-medium
              ${isLoading
                ? 'bg-yellow-100 text-yellow-800'
                : 'bg-green-100 text-green-800'
              }
            `}>
              <div className={`
                w-2 h-2 rounded-full
                ${isLoading ? 'bg-yellow-400 animate-pulse' : 'bg-green-400'}
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

      {/* Input */}
      <div className="flex-shrink-0 p-4 border-t border-gray-200 bg-gray-50">
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