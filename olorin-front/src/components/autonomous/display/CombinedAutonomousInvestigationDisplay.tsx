import React, { useState, useEffect, useCallback } from 'react';
import { NeuralNetworkFlow } from './neural-network/NeuralNetworkFlow';
import { InteractiveInvestigationGraph } from './interactive-graph/InteractiveInvestigationGraph';
import { CommandTerminal } from './command-terminal/CommandTerminal';
import { useCombinedDisplay } from './hooks/useCombinedDisplay';
import { useWebSocketIntegration } from './hooks/useWebSocketIntegration';
import { 
  CombinedDisplayProps,
  GraphInteraction,
  AgentNodeData,
  ConnectionData,
  TerminalLogEntry 
} from '../../../types/AutonomousDisplayTypes';

export const CombinedAutonomousInvestigationDisplay: React.FC<CombinedDisplayProps> = ({
  investigationId,
  isActive,
  agents: initialAgents,
  connections: initialConnections,
  investigationFlow: initialFlow,
  logs: initialLogs,
  onComponentInteraction,
  className = ''
}) => {
  // Use custom hook for state management
  const {
    agents,
    connections,
    investigationFlow,
    logs,
    animationSpeed,
    updateAgentStatus,
    updateConnectionStatus,
    updateGraphProgress,
    addLog,
    setAnimationSpeed
  } = useCombinedDisplay({
    investigationId,
    initialAgents,
    initialConnections,
    initialFlow,
    initialLogs
  });

  // Use WebSocket integration hook
  const {
    isConnected,
    client,
    reconnect,
    disconnect,
    connectionAttempts
  } = useWebSocketIntegration({
    investigationId,
    isActive,
    onAgentStatusUpdate: updateAgentStatus,
    onGraphProgressUpdate: updateGraphProgress,
    onLogAdd: addLog,
    agents
  });

  // Handle neural network node clicks
  const handleNeuralNodeClick = useCallback((nodeId: string, nodeData: AgentNodeData) => {
    console.log(`Neural node clicked: ${nodeId}`, nodeData);
    onComponentInteraction?.('neural-network', { type: 'node_click', nodeId, nodeData });
  }, [onComponentInteraction]);

  // Handle neural network connection clicks
  const handleNeuralConnectionClick = useCallback((connectionId: string, connectionData: ConnectionData) => {
    console.log(`Neural connection clicked: ${connectionId}`, connectionData);
    onComponentInteraction?.('neural-network', { type: 'connection_click', connectionId, connectionData });
  }, [onComponentInteraction]);

  // Handle graph interactions
  const handleGraphInteraction = useCallback((interaction: GraphInteraction) => {
    console.log('Graph interaction:', interaction);
    onComponentInteraction?.('interactive-graph', interaction);
  }, [onComponentInteraction]);

  // Handle terminal commands
  const handleTerminalCommand = useCallback((command: string) => {
    console.log('Terminal command:', command);
    onComponentInteraction?.('command-terminal', { type: 'command', command });
  }, [onComponentInteraction]);

  return (
    <div className={`combined-autonomous-display ${className}`}>
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold text-blue-400 mb-2 drop-shadow-lg">
          <i className="fas fa-brain mr-3"></i>
          Autonomous Investigation Command Center
        </h1>
        <p className="text-gray-300 text-lg">
          Real-time AI agent coordination and investigation monitoring
        </p>
        {investigationId && (
          <p className="text-sm text-gray-500 mt-2">
            Investigation ID: {investigationId}
          </p>
        )}
      </div>

      {/* Main Display Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Neural Network Flow Panel */}
        <div className="bg-gradient-to-br from-gray-900 to-gray-800 border border-green-500 rounded-2xl overflow-hidden shadow-2xl">
          <div className="bg-gradient-to-r from-green-500 to-blue-500 px-6 py-4 border-b border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-semibold text-white flex items-center">
                  <i className="fas fa-project-diagram mr-2"></i>
                  Neural Network Flow
                </h3>
                <p className="text-green-100 text-sm">
                  AI agent coordination with real-time data flow
                </p>
              </div>
              <div className="flex items-center space-x-2">
                <span className={`w-3 h-3 rounded-full ${
                  isActive && isConnected ? 'bg-green-400 animate-pulse' : 
                  isActive ? 'bg-yellow-400 animate-pulse' : 'bg-gray-500'
                }`}></span>
                <span className="text-sm text-green-100">
                  {isActive && isConnected ? 'Connected' : 
                   isActive ? 'Connecting...' : 'Standby'}
                </span>
              </div>
            </div>
          </div>
          <div className="p-6 h-96">
            <NeuralNetworkFlow
              agents={agents}
              connections={connections}
              onNodeClick={handleNeuralNodeClick}
              onConnectionClick={handleNeuralConnectionClick}
              animationSpeed={animationSpeed}
              className="w-full h-full"
            />
          </div>
        </div>

        {/* Interactive Graph Panel */}
        <div className="bg-gradient-to-br from-gray-900 to-gray-800 border border-orange-500 rounded-2xl overflow-hidden shadow-2xl">
          <div className="bg-gradient-to-r from-orange-500 to-purple-500 px-6 py-4 border-b border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-semibold text-white flex items-center">
                  <i className="fas fa-sitemap mr-2"></i>
                  Interactive Graph
                </h3>
                <p className="text-orange-100 text-sm">
                  3D investigation flow with WebSocket updates
                </p>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-sm text-orange-100">
                  Progress: {Math.round((investigationFlow.progress || 0) * 100)}%
                </span>
              </div>
            </div>
          </div>
          <div className="p-6 h-96">
            <InteractiveInvestigationGraph
              investigationFlow={investigationFlow}
              onGraphInteraction={handleGraphInteraction}
              layout="standard"
              showProgress={true}
              className="w-full h-full"
            />
          </div>
        </div>
      </div>

      {/* Command Terminal Panel */}
      <div className="bg-gradient-to-br from-gray-900 to-gray-800 border border-yellow-500 rounded-2xl overflow-hidden shadow-2xl">
        <div className="bg-gradient-to-r from-yellow-500 to-green-500 px-6 py-4 border-b border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-semibold text-white flex items-center">
                <i className="fas fa-terminal mr-2"></i>
                Command Terminal
              </h3>
              <p className="text-yellow-100 text-sm">
                Live investigation logs with typewriter effect
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-sm text-yellow-100">
                Logs: {logs.length}
              </span>
            </div>
          </div>
        </div>
        <div className="p-0">
          <CommandTerminal
            logs={logs}
            typewriterSpeed={50}
            maxLines={20}
            autoScroll={true}
            onTerminalCommand={handleTerminalCommand}
            className="h-80"
          />
        </div>
      </div>

      {/* Animation Speed Control */}
      <div className="flex justify-center mt-6">
        <div className="bg-gray-800 border border-gray-600 rounded-lg px-4 py-2 flex items-center space-x-4">
          <span className="text-gray-300 text-sm">Animation Speed:</span>
          {(['slow', 'normal', 'fast'] as const).map((speed) => (
            <button
              key={speed}
              onClick={() => setAnimationSpeed(speed)}
              className={`px-3 py-1 text-xs rounded transition-colors ${
                animationSpeed === speed
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              {speed.charAt(0).toUpperCase() + speed.slice(1)}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};