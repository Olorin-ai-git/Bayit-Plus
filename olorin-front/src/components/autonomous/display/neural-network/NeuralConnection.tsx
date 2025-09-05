import React, { useCallback, useMemo } from 'react';
import { NeuralConnectionProps } from '../../../../types/AutonomousDisplayTypes';

export const NeuralConnection: React.FC<NeuralConnectionProps> = ({
  connection,
  fromNode,
  toNode,
  onClick,
  className = ''
}) => {
  const { id, status, dataFlow } = connection;

  // Calculate connection geometry
  const geometry = useMemo(() => {
    const dx = toNode.position.x - fromNode.position.x;
    const dy = toNode.position.y - fromNode.position.y;
    const length = Math.sqrt(dx * dx + dy * dy);
    const angle = Math.atan2(dy, dx) * 180 / Math.PI;
    
    return {
      length: `${length}%`,
      angle,
      startX: fromNode.position.x,
      startY: fromNode.position.y
    };
  }, [fromNode.position, toNode.position]);

  // Handle click events
  const handleClick = useCallback((event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    if (onClick) {
      onClick(id, connection);
    }
  }, [id, connection, onClick]);

  // Animation classes based on status and data flow
  const animationClasses = useMemo(() => {
    const baseClasses = [];
    
    if (status === 'active') {
      baseClasses.push('animate-pulse');
    }
    
    if (dataFlow) {
      baseClasses.push('data-flow-animation');
    }
    
    return baseClasses.join(' ');
  }, [status, dataFlow]);

  // Connection color and styling based on status
  const connectionStyling = useMemo(() => {
    switch (status) {
      case 'active':
        return {
          background: 'linear-gradient(90deg, transparent 0%, #00ff41 20%, #ffff41 50%, #00ff41 80%, transparent 100%)',
          height: '4px',
          opacity: '0.9',
          boxShadow: '0 0 10px rgba(0, 255, 65, 0.5)'
        };
      case 'completed':
        return {
          background: 'linear-gradient(90deg, transparent 0%, #4caf50 50%, transparent 100%)',
          height: '3px',
          opacity: '0.7',
          boxShadow: '0 0 8px rgba(76, 175, 80, 0.3)'
        };
      default:
        return {
          background: 'linear-gradient(90deg, transparent 0%, #4a90ff 20%, #6c5ce7 50%, #4a90ff 80%, transparent 100%)',
          height: '2px',
          opacity: '0.6',
          boxShadow: 'none'
        };
    }
  }, [status]);

  return (
    <div
      className={`neural-connection absolute cursor-pointer transition-all duration-300 hover:scale-y-150 hover:z-10 ${className} ${animationClasses}`}
      style={{
        left: `${geometry.startX}%`,
        top: `${geometry.startY}%`,
        width: geometry.length,
        transformOrigin: 'left center',
        transform: `rotate(${geometry.angle}deg)`,
        ...connectionStyling
      }}
      onClick={handleClick}
    >
      {/* Data flow particles for active connections */}
      {status === 'active' && dataFlow && (
        <>
          <div 
            className="absolute w-2 h-2 bg-white rounded-full animate-ping"
            style={{
              left: '10%',
              top: '50%',
              transform: 'translateY(-50%)',
              animationDelay: '0s'
            }}
          />
          <div 
            className="absolute w-2 h-2 bg-yellow-300 rounded-full animate-ping"
            style={{
              left: '50%',
              top: '50%',
              transform: 'translateY(-50%)',
              animationDelay: '0.5s'
            }}
          />
          <div 
            className="absolute w-2 h-2 bg-green-300 rounded-full animate-ping"
            style={{
              left: '80%',
              top: '50%',
              transform: 'translateY(-50%)',
              animationDelay: '1s'
            }}
          />
        </>
      )}

      {/* Hover tooltip */}
      <div className="absolute top-full mt-2 left-1/2 transform -translate-x-1/2 opacity-0 hover:opacity-100 transition-opacity duration-200 pointer-events-none z-20">
        <div className="bg-black bg-opacity-90 text-white text-xs rounded-lg px-3 py-2 whitespace-nowrap">
          <div className="font-bold">Connection: {fromNode.name} → {toNode.name}</div>
          <div>Status: {status}</div>
          <div>Data Flow: {dataFlow ? 'Active' : 'Inactive'}</div>
          <div className="text-gray-400">Click for details</div>
        </div>
        {/* Tooltip arrow */}
        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-b-black"></div>
      </div>
    </div>
  );
};