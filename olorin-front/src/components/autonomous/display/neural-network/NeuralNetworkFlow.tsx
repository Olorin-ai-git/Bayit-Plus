import React, { useCallback, useMemo } from 'react';
import { NeuralNode } from './NeuralNode';
import { NeuralConnection } from './NeuralConnection';
import { NeuralNetworkFlowProps, AgentNodeData, ConnectionData } from '../../../../types/AutonomousDisplayTypes';

export const NeuralNetworkFlow: React.FC<NeuralNetworkFlowProps> = ({
  agents,
  connections,
  onNodeClick,
  onConnectionClick,
  animationSpeed = 'normal',
  className = ''
}) => {
  // Create a map for quick node lookup
  const nodeMap = useMemo(() => {
    const map = new Map<string, AgentNodeData>();
    agents.forEach(agent => map.set(agent.id, agent));
    return map;
  }, [agents]);

  // Handle node clicks with validation
  const handleNodeClick = useCallback((nodeId: string, nodeData: AgentNodeData) => {
    if (onNodeClick) {
      onNodeClick(nodeId, nodeData);
    }
  }, [onNodeClick]);

  // Handle connection clicks with validation
  const handleConnectionClick = useCallback((connectionId: string, connectionData: ConnectionData) => {
    if (onConnectionClick) {
      onConnectionClick(connectionId, connectionData);
    }
  }, [onConnectionClick]);

  // Calculate connection positions and angles
  const connectionElements = useMemo(() => {
    return connections.map(connection => {
      const fromNode = nodeMap.get(connection.fromNodeId);
      const toNode = nodeMap.get(connection.toNodeId);

      if (!fromNode || !toNode) {
        return null;
      }

      return (
        <NeuralConnection
          key={connection.id}
          connection={connection}
          fromNode={fromNode}
          toNode={toNode}
          onClick={handleConnectionClick}
          className={`animation-speed-${animationSpeed}`}
        />
      );
    }).filter(Boolean);
  }, [connections, nodeMap, handleConnectionClick, animationSpeed]);

  return (
    <div 
      className={`neural-network-container relative w-full h-full bg-gradient-to-br from-gray-900 to-black rounded-xl overflow-hidden ${className}`}
      style={{
        background: 'radial-gradient(circle at center, rgba(26, 29, 35, 1) 0%, rgba(10, 11, 13, 1) 100%)'
      }}
    >
      {/* Background grid pattern */}
      <div 
        className="absolute inset-0 opacity-10"
        style={{
          backgroundImage: `
            linear-gradient(rgba(0, 255, 65, 0.1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(0, 255, 65, 0.1) 1px, transparent 1px)
          `,
          backgroundSize: '20px 20px'
        }}
      />

      {/* Neural connections (rendered behind nodes) */}
      <div className="absolute inset-0">
        {connectionElements}
      </div>

      {/* Neural nodes */}
      <div className="absolute inset-0">
        {agents.map(agent => (
          <NeuralNode
            key={agent.id}
            node={agent}
            onClick={handleNodeClick}
            className={`animation-speed-${animationSpeed}`}
          />
        ))}
      </div>

      {/* Network activity indicator */}
      <div className="absolute top-4 right-4 flex items-center space-x-2 bg-black bg-opacity-50 rounded-full px-3 py-1">
        <div className="flex space-x-1">
          {agents.filter(a => a.status === 'active').map((_, index) => (
            <div 
              key={index}
              className="w-2 h-2 bg-green-400 rounded-full animate-pulse"
              style={{ animationDelay: `${index * 0.2}s` }}
            />
          ))}
        </div>
        <span className="text-green-400 text-xs font-mono">
          {agents.filter(a => a.status === 'active').length} ACTIVE
        </span>
      </div>

      {/* Neural network info panel */}
      <div className="absolute bottom-4 left-4 bg-black bg-opacity-70 rounded-lg p-3 text-xs font-mono">
        <div className="text-green-400 mb-1">NEURAL NETWORK STATUS</div>
        <div className="space-y-1 text-gray-300">
          <div>Nodes: {agents.length}</div>
          <div>Connections: {connections.length}</div>
          <div>Active: {agents.filter(a => a.status === 'active').length}</div>
          <div>Completed: {agents.filter(a => a.status === 'completed').length}</div>
        </div>
      </div>

      {/* Animation speed indicator */}
      <div className="absolute top-4 left-4 bg-black bg-opacity-50 rounded-full px-3 py-1">
        <span className="text-blue-400 text-xs font-mono">
          SPEED: {animationSpeed.toUpperCase()}
        </span>
      </div>
    </div>
  );
};