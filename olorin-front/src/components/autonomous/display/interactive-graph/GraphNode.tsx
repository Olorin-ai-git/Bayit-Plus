import React, { useCallback, useMemo } from 'react';
import { GraphNodeProps } from '../../../../types/AutonomousDisplayTypes';

const nodeTypeConfig = {
  start: {
    icon: 'fa-play',
    color: 'border-blue-400 bg-blue-500/30 text-blue-100',
    glow: 'shadow-blue-400/50'
  },
  agent: {
    icon: 'fa-robot',
    color: 'border-green-400 bg-green-500/30 text-green-100',
    glow: 'shadow-green-400/50'
  },
  decision: {
    icon: 'fa-code-branch',
    color: 'border-purple-400 bg-purple-500/30 text-purple-100',
    glow: 'shadow-purple-400/50'
  },
  result: {
    icon: 'fa-exclamation-triangle',
    color: 'border-red-400 bg-red-500/30 text-red-100',
    glow: 'shadow-red-400/50'
  }
};

const phaseIcons: Record<string, string> = {
  'network_analysis': 'fa-network-wired',
  'device_analysis': 'fa-mobile-alt',
  'location_analysis': 'fa-map-marker-alt',
  'logs_analysis': 'fa-file-alt',
  'risk_assessment': 'fa-exclamation-triangle',
  'start': 'fa-play',
  'decision': 'fa-code-branch',
  'result': 'fa-chart-line'
};

export const GraphNode: React.FC<GraphNodeProps> = ({
  node,
  onClick,
  onHover,
  className = ''
}) => {
  const { id, name, type, position, status, icon, phase } = node;

  // Get node configuration
  const config = useMemo(() => nodeTypeConfig[type] || nodeTypeConfig.agent, [type]);
  
  // Determine icon to use
  const nodeIcon = useMemo(() => {
    if (icon) return icon;
    if (phase && phaseIcons[phase]) return phaseIcons[phase];
    return config.icon;
  }, [icon, phase, config.icon]);

  // Handle click events
  const handleClick = useCallback((event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    if (onClick) {
      onClick(id, node);
    }
  }, [id, node, onClick]);

  // Handle hover events
  const handleMouseEnter = useCallback(() => {
    if (onHover) {
      onHover(id, node);
    }
  }, [id, node, onHover]);

  // Status-based styling
  const statusStyling = useMemo(() => {
    switch (status) {
      case 'active':
        return {
          animation: 'animate-pulse scale-110',
          shadow: `shadow-2xl ${config.glow}`,
          border: 'border-4'
        };
      case 'completed':
        return {
          animation: 'animate-bounce',
          shadow: `shadow-lg ${config.glow}`,
          border: 'border-4'
        };
      case 'error':
        return {
          animation: 'animate-ping',
          shadow: 'shadow-2xl shadow-red-400/50',
          border: 'border-4 border-red-400'
        };
      default:
        return {
          animation: '',
          shadow: 'shadow-md',
          border: 'border-2'
        };
    }
  }, [status, config.glow]);

  // Node size classes
  const sizeClasses = useMemo(() => {
    if (className.includes('size-small')) return 'w-16 h-14';
    if (className.includes('size-large')) return 'w-24 h-20';
    return 'w-20 h-16'; // medium (default)
  }, [className]);

  return (
    <div
      className={`graph-node absolute cursor-pointer transform transition-all duration-300 hover:scale-115 hover:z-10 ${className}`}
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        transform: 'translate(-50%, -50%)'
      }}
      onClick={handleClick}
      onMouseEnter={handleMouseEnter}
    >
      {/* Main node */}
      <div
        className={`
          ${sizeClasses} rounded-xl ${statusStyling.border} ${config.color} ${statusStyling.shadow}
          flex flex-col items-center justify-center
          ${statusStyling.animation}
          backdrop-blur-sm
          hover:scale-105 hover:shadow-2xl
        `}
      >
        {/* Node icon */}
        <i className={`fas ${nodeIcon} text-lg mb-1`}></i>
        
        {/* Node name */}
        <span className="text-xs font-bold text-center leading-tight">
          {name.toUpperCase()}
        </span>
        
        {/* Phase indicator */}
        {phase && (
          <div className="text-xs opacity-75 text-center">
            {phase.replace('_', ' ')}
          </div>
        )}
      </div>

      {/* Status indicator dot */}
      <div className={`absolute -top-1 -right-1 w-4 h-4 rounded-full border-2 border-white ${
        status === 'active' ? 'bg-green-400 animate-pulse' :
        status === 'completed' ? 'bg-blue-400' :
        status === 'error' ? 'bg-red-400 animate-ping' :
        'bg-gray-400'
      }`}></div>

      {/* Progress ring for active nodes */}
      {status === 'active' && (
        <div className="absolute inset-0 rounded-xl border-2 border-transparent">
          <div className="absolute inset-0 rounded-xl border-2 border-green-400 animate-spin opacity-50"
               style={{ 
                 borderTopColor: 'transparent',
                 borderRightColor: 'transparent',
                 animationDuration: '2s'
               }}
          />
        </div>
      )}

      {/* Hover tooltip */}
      <div className="absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 opacity-0 hover:opacity-100 transition-opacity duration-200 pointer-events-none z-30">
        <div className="bg-black bg-opacity-95 text-white text-xs rounded-lg px-3 py-2 whitespace-nowrap shadow-2xl">
          <div className="font-bold text-orange-400">{name}</div>
          <div>Type: {type.charAt(0).toUpperCase() + type.slice(1)}</div>
          <div>Status: {status}</div>
          {phase && <div>Phase: {phase.replace('_', ' ')}</div>}
          <div className="text-gray-400 mt-1">Click for details</div>
        </div>
        {/* Tooltip arrow */}
        <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-black"></div>
      </div>

      {/* Connection anchor points */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Top anchor */}
        <div className="absolute -top-1 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-white rounded-full opacity-0 hover:opacity-100 transition-opacity"></div>
        {/* Bottom anchor */}
        <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-white rounded-full opacity-0 hover:opacity-100 transition-opacity"></div>
        {/* Left anchor */}
        <div className="absolute -left-1 top-1/2 transform -translate-y-1/2 w-2 h-2 bg-white rounded-full opacity-0 hover:opacity-100 transition-opacity"></div>
        {/* Right anchor */}
        <div className="absolute -right-1 top-1/2 transform -translate-y-1/2 w-2 h-2 bg-white rounded-full opacity-0 hover:opacity-100 transition-opacity"></div>
      </div>
    </div>
  );
};