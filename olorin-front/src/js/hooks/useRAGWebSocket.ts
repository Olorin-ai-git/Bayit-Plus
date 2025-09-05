import { useEffect, useRef, useState } from 'react';
import { RAGEventData, RAGPerformanceData, RAGKnowledgeSource } from '../types/RAGTypes';
import { AuthService } from '../services/AuthService';

interface RAGWebSocketOptions {
  investigationId: string;
  onRAGEvent?: (event: RAGEventData) => void;
  onPerformanceUpdate?: (data: RAGPerformanceData) => void;
  onKnowledgeSourcesUpdate?: (sources: RAGKnowledgeSource[]) => void;
  onKnowledgeUpdate?: (data: any) => void;
  onDomainUpdate?: (data: any) => void;
  onToolPerformanceUpdate?: (data: any) => void;
  onHealthUpdate?: (data: any) => void;
  onSystemAlert?: (alert: any) => void;
  onComparisonUpdate?: (data: any) => void;
  onConnectionChange?: (connected: boolean) => void;
  onError?: (error: Event) => void;
}

interface RAGWebSocketState {
  isConnected: boolean;
  isReconnecting: boolean;
  lastEvent: RAGEventData | null;
  error: string | null;
}

/**
 * Custom hook for RAG WebSocket integration
 * Provides real-time RAG system updates during investigations
 */
export const useRAGWebSocket = ({
  investigationId,
  onRAGEvent,
  onPerformanceUpdate,
  onKnowledgeSourcesUpdate,
  onKnowledgeUpdate,
  onDomainUpdate,
  onToolPerformanceUpdate,
  onHealthUpdate,
  onSystemAlert,
  onComparisonUpdate,
  onConnectionChange,
  onError,
}: RAGWebSocketOptions) => {
  const [state, setState] = useState<RAGWebSocketState>({
    isConnected: false,
    isReconnecting: false,
    lastEvent: null,
    error: null,
  });

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;

  const connect = () => {
    if (!investigationId) return;

    try {
      // Get JWT token for authentication
      const token = AuthService.getToken();
      if (!token) {
        console.error('No authentication token available for RAG WebSocket');
        setState(prev => ({ ...prev, error: 'Authentication token required' }));
        onError?.(new Event('Authentication token missing'));
        return;
      }

      // WebSocket URL for RAG events - use production API URL if in production
      const baseUrl = process.env.NODE_ENV === 'production' 
        ? (process.env.REACT_APP_WS_BASE_URL || 'wss://api.olorin.ai')
        : (process.env.REACT_APP_WS_BASE_URL || 'ws://localhost:8090');
      const wsUrl = `${baseUrl}/ws/rag/${investigationId}?token=${token}`;
      
      wsRef.current = new WebSocket(wsUrl);

      wsRef.current.onopen = () => {
        console.log('RAG WebSocket connected');
        setState(prev => ({ ...prev, isConnected: true, isReconnecting: false, error: null }));
        reconnectAttempts.current = 0;
        onConnectionChange?.(true);
      };

      wsRef.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          // Handle different types of RAG events
          switch (data.type) {
            case 'rag_event':
            case 'rag_knowledge_retrieved':
            case 'rag_context_augmented':
            case 'rag_tool_recommended':
            case 'rag_result_enhanced':
            case 'rag_tool_selection':
            case 'rag_tool_execution':
            case 'rag_tool_alternatives':
            case 'rag_validation':
            case 'rag_context_analysis':
              setState(prev => ({ ...prev, lastEvent: data }));
              onRAGEvent?.(data);
              break;
              
            case 'rag_performance':
            case 'rag_performance_metrics':
              onPerformanceUpdate?.(data);
              break;
              
            case 'rag_knowledge_sources':
              onKnowledgeSourcesUpdate?.(data.data?.sources || []);
              break;
              
            case 'rag_knowledge_update':
              onKnowledgeUpdate?.(data);
              break;
              
            case 'rag_domain_update':
              onDomainUpdate?.(data);
              break;
              
            case 'rag_tool_performance':
              onToolPerformanceUpdate?.(data);
              break;
              
            case 'rag_health_update':
              onHealthUpdate?.(data);
              break;
              
            case 'rag_system_alert':
              onSystemAlert?.(data.data);
              break;
              
            case 'rag_comparison_update':
              onComparisonUpdate?.(data);
              break;
              
            default:
              console.log('Unknown RAG WebSocket message type:', data.type);
          }
        } catch (error) {
          console.error('Error parsing RAG WebSocket message:', error);
          setState(prev => ({ ...prev, error: 'Failed to parse WebSocket message' }));
        }
      };

      wsRef.current.onclose = (event) => {
        console.log('RAG WebSocket disconnected:', event.code, event.reason);
        setState(prev => ({ ...prev, isConnected: false }));
        onConnectionChange?.(false);
        
        // Check if disconnection was due to authentication failure
        if (event.code === 1008) { // WS_1008_POLICY_VIOLATION - authentication failure
          console.error('RAG WebSocket authentication failed');
          setState(prev => ({ ...prev, error: 'Authentication failed' }));
          onError?.(new Event('Authentication failed'));
          return;
        }
        
        // Attempt to reconnect if not a clean close
        if (event.code !== 1000 && reconnectAttempts.current < maxReconnectAttempts) {
          setState(prev => ({ ...prev, isReconnecting: true }));
          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectAttempts.current++;
            connect();
          }, Math.pow(2, reconnectAttempts.current) * 1000); // Exponential backoff
        }
      };

      wsRef.current.onerror = (error) => {
        console.error('RAG WebSocket error:', error);
        setState(prev => ({ ...prev, error: 'WebSocket connection error' }));
        onError?.(error);
      };

    } catch (error) {
      console.error('Failed to create RAG WebSocket connection:', error);
      setState(prev => ({ ...prev, error: 'Failed to create WebSocket connection' }));
    }
  };

  const disconnect = () => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.close(1000, 'Client disconnect');
    }
    
    wsRef.current = null;
    setState(prev => ({ ...prev, isConnected: false, isReconnecting: false, error: null }));
  };

  const sendMessage = (message: any) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    } else {
      console.warn('RAG WebSocket is not connected');
    }
  };

  useEffect(() => {
    connect();
    return disconnect;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [investigationId]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, []);

  return {
    ...state,
    sendMessage,
    reconnect: connect,
    disconnect,
  };
};

export default useRAGWebSocket;