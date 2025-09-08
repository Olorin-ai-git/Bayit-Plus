import { useEffect, useCallback, useRef } from 'react';
import { AutonomousInvestigationClient, InvestigationEventHandler } from '../../../../js/services/AutonomousInvestigationClient';
import { 
  AgentNodeData, 
  TerminalLogEntry,
  NodeStatus,
  LogType 
} from '../../../../types/AutonomousDisplayTypes';
import { LogLevel } from '../../../../js/types/RiskAssessment';

interface UseWebSocketIntegrationProps {
  investigationId?: string;
  isActive: boolean;
  onAgentStatusUpdate: (agentId: string, status: NodeStatus, confidence?: number) => void;
  onGraphProgressUpdate: (progress: number, currentPhase?: string) => void;
  onLogAdd: (log: Omit<TerminalLogEntry, 'id'>) => void;
  agents: AgentNodeData[];
}

export const useWebSocketIntegration = ({
  investigationId,
  isActive,
  onAgentStatusUpdate,
  onGraphProgressUpdate,
  onLogAdd,
  agents
}: UseWebSocketIntegrationProps) => {
  const clientRef = useRef<AutonomousInvestigationClient | null>(null);
  const isConnectedRef = useRef(false);
  const connectionAttemptsRef = useRef(0);
  const lastAttemptTimeRef = useRef<number | null>(null);

  // Map log levels to terminal log types
  const mapLogLevelToType = useCallback((level: LogLevel): LogType => {
    switch (level) {
      case LogLevel.ERROR:
        return 'error';
      case LogLevel.WARNING:
        return 'warning';
      case LogLevel.SUCCESS:
        return 'success';
      case LogLevel.INFO:
      default:
        return 'info';
    }
  }, []);

  // Extract agent type from phase name
  const getAgentTypeFromPhase = useCallback((phase: string): string => {
    if (phase.includes('network')) return 'network';
    if (phase.includes('device')) return 'device'; 
    if (phase.includes('location')) return 'location';
    if (phase.includes('logs')) return 'logs';
    if (phase.includes('risk')) return 'risk';
    return 'orchestrator';
  }, []);

  // Map phase to agent node status
  const mapPhaseToNodeStatus = useCallback((phase: string, progress: number): NodeStatus => {
    if (progress >= 1.0) return 'completed';
    if (progress > 0) return 'active';
    return 'idle';
  }, []);

  // Create event handlers for the WebSocket client
  const createEventHandlers = useCallback((): InvestigationEventHandler => ({
    onPhaseUpdate: (data) => {
      const { phase, progress, message, agent_response, timestamp } = data;
      
      // Update graph progress
      onGraphProgressUpdate(progress, phase);
      
      // Update corresponding agent status
      const agentType = getAgentTypeFromPhase(phase);
      const agentNode = agents.find(agent => agent.type === agentType);
      
      if (agentNode) {
        const status = mapPhaseToNodeStatus(phase, progress);
        const confidence = agent_response?.confidence;
        onAgentStatusUpdate(agentNode.id, status, confidence);
      }
      
      // Add terminal log
      onLogAdd({
        timestamp,
        type: 'info',
        message: `[${phase.toUpperCase()}] ${(progress * 100).toFixed(1)}% - ${message}`,
        agent: agentType.toUpperCase()
      });
    },

    onStatusUpdate: (data) => {
      const { status, current_phase, progress, message, timestamp } = data;
      
      // Update overall progress
      if (progress !== undefined) {
        onGraphProgressUpdate(progress, current_phase);
      }
      
      // Add status log
      onLogAdd({
        timestamp,
        type: status === 'error' ? 'error' : status === 'completed' ? 'success' : 'info',
        message: `Status: ${status} - ${message}`,
        agent: current_phase ? getAgentTypeFromPhase(current_phase).toUpperCase() : undefined
      });
    },

    onError: (data) => {
      const { error_code, message, phase, timestamp, retry_available } = data;
      
      // Update agent status to error if phase is specified
      if (phase) {
        const agentType = getAgentTypeFromPhase(phase);
        const agentNode = agents.find(agent => agent.type === agentType);
        
        if (agentNode) {
          onAgentStatusUpdate(agentNode.id, 'error');
        }
      }
      
      // Add error log
      onLogAdd({
        timestamp,
        type: 'error',
        message: `❌ Error in ${phase || 'system'}: ${message} (Code: ${error_code})`,
        agent: phase ? getAgentTypeFromPhase(phase).toUpperCase() : undefined
      });
      
      // Add retry notice if available
      if (retry_available) {
        onLogAdd({
          timestamp: new Date().toISOString(),
          type: 'warning',
          message: '⚠️ Retry option available',
          agent: phase ? getAgentTypeFromPhase(phase).toUpperCase() : undefined
        });
      }
    },

    onComplete: (results) => {
      // Mark all agents as completed
      agents.forEach(agent => {
        onAgentStatusUpdate(agent.id, 'completed');
      });
      
      // Update progress to 100%
      onGraphProgressUpdate(1.0, 'completed');
      
      // Add completion log
      onLogAdd({
        timestamp: new Date().toISOString(),
        type: 'success',
        message: '✅ Investigation completed successfully',
        agent: 'ORCHESTRATOR'
      });
      
      // Log results summary
      const resultKeys = Object.keys(results);
      if (resultKeys.length > 0) {
        onLogAdd({
          timestamp: new Date().toISOString(),
          type: 'info',
          message: `📊 Results available: ${resultKeys.join(', ')}`,
          agent: 'ORCHESTRATOR'
        });
      }
    },

    onCancelled: () => {
      // Reset all agents to idle
      agents.forEach(agent => {
        onAgentStatusUpdate(agent.id, 'idle');
      });
      
      // Add cancellation log
      onLogAdd({
        timestamp: new Date().toISOString(),
        type: 'warning',
        message: '🛑 Investigation cancelled',
        agent: 'ORCHESTRATOR'
      });
    },

    onLog: (message, level) => {
      // Add general log messages
      onLogAdd({
        timestamp: new Date().toISOString(),
        type: mapLogLevelToType(level),
        message,
        agent: 'CLIENT'
      });
    }
  }), [
    onGraphProgressUpdate, 
    onAgentStatusUpdate, 
    onLogAdd, 
    agents, 
    getAgentTypeFromPhase, 
    mapPhaseToNodeStatus, 
    mapLogLevelToType
  ]);

  // Initialize WebSocket connection
  const initializeConnection = useCallback(async () => {
    if (!investigationId || !isActive || isConnectedRef.current) {
      return;
    }

    // Increment connection attempts counter
    connectionAttemptsRef.current += 1;
    lastAttemptTimeRef.current = Date.now();
    
    // Log connection attempt
    onLogAdd({
      timestamp: new Date().toISOString(),
      type: 'info',
      message: `🔄 Connection attempt #${connectionAttemptsRef.current} for investigation ${investigationId}`,
      agent: 'CLIENT'
    });

    try {
      // Create new client instance
      const client = new AutonomousInvestigationClient({
        apiBaseUrl: process.env.NODE_ENV === 'production' ? 'https://api.olorin.ai/v1' : 'http://localhost:8090/v1',
        wsBaseUrl: process.env.NODE_ENV === 'production' ? 'wss://api.olorin.ai' : 'ws://localhost:8090',
        parallel: true,
        retryAttempts: 3,
        retryDelay: 1000
      });

      clientRef.current = client;

      // Start investigation with event handlers
      await client.startInvestigation(
        investigationId,
        'user_id',
        createEventHandlers()
      );

      isConnectedRef.current = true;

      // Add connection success log with attempt info
      onLogAdd({
        timestamp: new Date().toISOString(),
        type: 'success',
        message: `🔗 Connected to investigation: ${investigationId} (attempt #${connectionAttemptsRef.current})`,
        agent: 'CLIENT'
      });

    } catch (error) {
      console.error('Failed to initialize WebSocket connection:', error);
      
      onLogAdd({
        timestamp: new Date().toISOString(),
        type: 'error',
        message: `❌ Connection failed (attempt #${connectionAttemptsRef.current}): ${error instanceof Error ? error.message : 'Unknown error'}`,
        agent: 'CLIENT'
      });
    }
  }, [investigationId, isActive, createEventHandlers, onLogAdd]);

  // Reset connection state (for new investigations)
  const resetConnectionState = useCallback(() => {
    connectionAttemptsRef.current = 0;
    lastAttemptTimeRef.current = null;
  }, []);

  // Cleanup connection
  const cleanupConnection = useCallback(() => {
    if (clientRef.current && isConnectedRef.current) {
      clientRef.current.stopInvestigation();
      clientRef.current = null;
      isConnectedRef.current = false;
      
      onLogAdd({
        timestamp: new Date().toISOString(),
        type: 'info',
        message: `🔌 WebSocket connection closed (${connectionAttemptsRef.current} attempts made)`,
        agent: 'CLIENT'
      });
    }
  }, [onLogAdd]);

  // Effect to manage connection lifecycle
  useEffect(() => {
    if (isActive && investigationId) {
      // Reset connection state for new investigations
      resetConnectionState();
      initializeConnection();
    } else {
      cleanupConnection();
    }

    // Cleanup on unmount
    return cleanupConnection;
  }, [isActive, investigationId, initializeConnection, cleanupConnection, resetConnectionState]);

  // Return connection utilities and status
  return {
    isConnected: isConnectedRef.current,
    client: clientRef.current,
    reconnect: initializeConnection,
    disconnect: cleanupConnection,
    investigationId,
    connectionAttempts: connectionAttemptsRef.current,
    lastAttemptTime: lastAttemptTimeRef.current,
    resetConnectionState
  };
};