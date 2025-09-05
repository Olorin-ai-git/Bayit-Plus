import React, { useCallback, useMemo } from 'react';
import { NeuralNodeProps } from '../../../../types/AutonomousDisplayTypes';

const agentIcons: Record<string, string> = {
  orchestrator: 'fa-cogs',
  network: 'fa-network-wired',
  device: 'fa-mobile-alt',
  location: 'fa-map-marker-alt',
  logs: 'fa-file-alt',
  risk: 'fa-exclamation-triangle'
};

const agentColors: Record<string, { border: string; bg: string; text: string; glow: string }> = {
  orchestrator: { 
    border: 'border-blue-400', 
    bg: 'bg-blue-500/30', 
    text: 'text-blue-100',
    glow: 'shadow-blue-400/50'
  },
  network: { 
    border: 'border-green-400', 
    bg: 'bg-green-500/30', 
    text: 'text-green-100',
    glow: 'shadow-green-400/50'
  },
  device: { 
    border: 'border-orange-400', 
    bg: 'bg-orange-500/30', 
    text: 'text-orange-100',
    glow: 'shadow-orange-400/50'
  },
  location: { 
    border: 'border-purple-400', 
    bg: 'bg-purple-500/30', 
    text: 'text-purple-100',
    glow: 'shadow-purple-400/50'
  },
  logs: { 
    border: 'border-red-400', 
    bg: 'bg-red-500/30', 
    text: 'text-red-100',
    glow: 'shadow-red-400/50'
  },
  risk: { 
    border: 'border-yellow-400', 
    bg: 'bg-yellow-500/30', 
    text: 'text-yellow-100',
    glow: 'shadow-yellow-400/50'
  }
};

export const NeuralNode: React.FC<NeuralNodeProps> = ({
  node,
  onClick,
  className = ''
}) => {
  const { id, name, type, position, status, confidence, lastUpdate } = node;

  // Get styling based on agent type
  const styling = useMemo(() => agentColors[type] || agentColors.orchestrator, [type]);
  const icon = useMemo(() => agentIcons[type] || agentIcons.orchestrator, [type]);

  // Handle click events
  const handleClick = useCallback((event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    if (onClick) {
      onClick(id, node);
    }
  }, [id, node, onClick]);

  // Animation classes based on status
  const statusClasses = useMemo(() => {
    switch (status) {
      case 'active':
        return 'animate-pulse scale-110';
      case 'completed':
        return 'animate-bounce';
      case 'error':
        return 'animate-ping';
      default:
        return '';
    }
  }, [status]);

  // Shadow intensity based on status
  const shadowClass = useMemo(() => {
    switch (status) {
      case 'active':
        return `shadow-2xl ${styling.glow}`;
      case 'completed':
        return `shadow-lg ${styling.glow}`;
      default:
        return 'shadow-md';
    }
  }, [status, styling.glow]);

  return (
    <div
      className={`neural-node absolute cursor-pointer transform transition-all duration-300 hover:scale-125 hover:z-10 ${className}`}
      style={{
        left: `${position.x}%`,
        top: `${position.y}%`,
        transform: 'translate(-50%, -50%)'
      }}
      onClick={handleClick}
    >
      {/* Node circle */}
      <div
        className={`
          w-16 h-16 rounded-full border-4 ${styling.border} ${styling.bg} ${shadowClass}
          flex flex-col items-center justify-center
          ${statusClasses}
          backdrop-blur-sm
        `}
      >
        {/* Agent icon */}
        <i className={`fas ${icon} text-lg ${styling.text}`}></i>
        
        {/* Agent name */}
        <span className={`text-xs font-bold ${styling.text} mt-1`}>
          {name.toUpperCase()}
        </span>
      </div>

      {/* Confidence indicator */}
      {confidence !== undefined && (
        <div className="absolute -top-2 -right-2 w-6 h-6 bg-green-500 text-white text-xs rounded-full flex items-center justify-center font-bold border-2 border-white">
          {Math.round(confidence)}
        </div>
      )}

      {/* Status indicator */}
      <div className={`absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-3 h-3 rounded-full border-2 border-white ${
        status === 'active' ? 'bg-green-400 animate-pulse' :
        status === 'completed' ? 'bg-blue-400' :
        status === 'error' ? 'bg-red-400' :
        'bg-gray-400'
      }`}></div>

      {/* Hover tooltip */}
      <div className="absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 opacity-0 hover:opacity-100 transition-opacity duration-200 pointer-events-none z-20">
        <div className="bg-black bg-opacity-90 text-white text-xs rounded-lg px-3 py-2 whitespace-nowrap">
          <div className="font-bold">{type.charAt(0).toUpperCase() + type.slice(1)} Agent</div>
          <div>Status: {status}</div>
          {confidence !== undefined && <div>Confidence: {confidence.toFixed(1)}%</div>}
          {lastUpdate && <div>Updated: {lastUpdate}</div>}
          <div className="text-gray-400">Click for details</div>
        </div>
        {/* Tooltip arrow */}
        <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-black"></div>
      </div>
    </div>
  );
};