import { useState, useCallback, useMemo } from 'react';
import { 
  AgentNodeData, 
  ConnectionData, 
  InvestigationFlowData, 
  TerminalLogEntry,
  AnimationSpeed,
  NodeStatus,
  EdgeStatus 
} from '../../../../types/AutonomousDisplayTypes';

interface UseCombinedDisplayProps {
  investigationId: string;
  initialAgents: AgentNodeData[];
  initialConnections: ConnectionData[];
  initialFlow: InvestigationFlowData;
  initialLogs: TerminalLogEntry[];
}

interface UseCombinedDisplayReturn {
  agents: AgentNodeData[];
  connections: ConnectionData[];
  investigationFlow: InvestigationFlowData;
  logs: TerminalLogEntry[];
  animationSpeed: AnimationSpeed;
  updateAgentStatus: (agentId: string, status: NodeStatus, confidence?: number) => void;
  updateConnectionStatus: (connectionId: string, status: EdgeStatus) => void;
  updateGraphProgress: (progress: number, currentPhase?: string) => void;
  addLog: (log: Omit<TerminalLogEntry, 'id'>) => void;
  clearLogs: () => void;
  setAnimationSpeed: (speed: AnimationSpeed) => void;
  resetDisplay: () => void;
}

export const useCombinedDisplay = ({
  investigationId,
  initialAgents,
  initialConnections,
  initialFlow,
  initialLogs
}: UseCombinedDisplayProps): UseCombinedDisplayReturn => {
  // State management
  const [agents, setAgents] = useState<AgentNodeData[]>(initialAgents);
  const [connections, setConnections] = useState<ConnectionData[]>(initialConnections);
  const [investigationFlow, setInvestigationFlow] = useState<InvestigationFlowData>(initialFlow);
  const [logs, setLogs] = useState<TerminalLogEntry[]>(initialLogs);
  const [animationSpeed, setAnimationSpeed] = useState<AnimationSpeed>('normal');

  // Update agent status
  const updateAgentStatus = useCallback((agentId: string, status: NodeStatus, confidence?: number) => {
    setAgents(prevAgents => 
      prevAgents.map(agent => 
        agent.id === agentId 
          ? { 
              ...agent, 
              status, 
              confidence: confidence !== undefined ? confidence : agent.confidence,
              lastUpdate: new Date().toISOString()
            }
          : agent
      )
    );
  }, []);

  // Update connection status
  const updateConnectionStatus = useCallback((connectionId: string, status: EdgeStatus) => {
    setConnections(prevConnections =>
      prevConnections.map(connection =>
        connection.id === connectionId
          ? { ...connection, status }
          : connection
      )
    );
  }, []);

  // Update graph progress
  const updateGraphProgress = useCallback((progress: number, currentPhase?: string) => {
    setInvestigationFlow(prevFlow => ({
      ...prevFlow,
      progress,
      currentPhase
    }));

    // Update corresponding graph nodes
    if (currentPhase) {
      setInvestigationFlow(prevFlow => ({
        ...prevFlow,
        nodes: prevFlow.nodes.map(node => ({
          ...node,
          status: node.phase === currentPhase ? 'active' : 
                 (prevFlow.progress && prevFlow.progress > 0.8) ? 'completed' : node.status
        }))
      }));
    }
  }, []);

  // Add new log entry
  const addLog = useCallback((log: Omit<TerminalLogEntry, 'id'>) => {
    const newLog: TerminalLogEntry = {
      ...log,
      id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    };

    setLogs(prevLogs => [...prevLogs, newLog]);
  }, []);

  // Clear all logs
  const clearLogs = useCallback(() => {
    setLogs([]);
  }, []);

  // Reset all display state
  const resetDisplay = useCallback(() => {
    setAgents(initialAgents);
    setConnections(initialConnections);
    setInvestigationFlow(initialFlow);
    setLogs(initialLogs);
  }, [initialAgents, initialConnections, initialFlow, initialLogs]);

  // Memoized return object to prevent unnecessary re-renders
  const returnValue = useMemo(() => ({
    agents,
    connections,
    investigationFlow,
    logs,
    animationSpeed,
    updateAgentStatus,
    updateConnectionStatus,
    updateGraphProgress,
    addLog,
    clearLogs,
    setAnimationSpeed,
    resetDisplay
  }), [
    agents,
    connections,
    investigationFlow,
    logs,
    animationSpeed,
    updateAgentStatus,
    updateConnectionStatus,
    updateGraphProgress,
    addLog,
    clearLogs,
    setAnimationSpeed,
    resetDisplay
  ]);

  return returnValue;
};