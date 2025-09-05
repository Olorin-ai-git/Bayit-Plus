import { useEffect, useRef, useState } from 'react';
import { RAGEventData, RAGPerformanceData, RAGKnowledgeSource } from '../types/RAGTypes';

interface RAGWebSocketOptions {
  investigationId: string;
  onRAGEvent?: (event: RAGEventData) => void;
  onPerformanceUpdate?: (data: RAGPerformanceData) => void;
  onKnowledgeSourcesUpdate?: (sources: RAGKnowledgeSource[]) => void;
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
      // WebSocket URL for RAG events - use production API URL if in production
      const baseUrl = process.env.NODE_ENV === 'production' 
        ? (process.env.REACT_APP_WS_BASE_URL || 'wss://api.olorin.ai')
        : (process.env.REACT_APP_WS_BASE_URL || 'ws://localhost:8090');
      const wsUrl = `${baseUrl}/ws/rag/${investigationId}`;
      
      wsRef.current = new WebSocket(wsUrl);

      wsRef.current.onopen = () => {
        console.log('RAG WebSocket connected');
        setState(prev => ({ ...prev, isConnected: true, isReconnecting: false, error: null }));
        reconnectAttempts.current = 0;
      };

      wsRef.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          // Handle different types of RAG events
          switch (data.type) {
            case 'rag_event':
              setState(prev => ({ ...prev, lastEvent: data.data }));
              onRAGEvent?.(data.data);
              break;
              
            case 'rag_performance':
              onPerformanceUpdate?.(data.data);
              break;
              
            case 'rag_knowledge_sources':
              onKnowledgeSourcesUpdate?.(data.data.sources || []);
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