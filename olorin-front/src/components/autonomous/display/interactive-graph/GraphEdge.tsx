import React, { useCallback, useMemo } from 'react';
import { GraphEdgeProps } from '../../../../types/AutonomousDisplayTypes';

export const GraphEdge: React.FC<GraphEdgeProps> = ({
  edge,
  fromNode,
  toNode,
  onClick,
  className = ''
}) => {
  const { id, status, progress = 0 } = edge;

  // Calculate edge geometry
  const geometry = useMemo(() => {
    const dx = toNode.position.x - fromNode.position.x;
    const dy = toNode.position.y - fromNode.position.y;
    const length = Math.sqrt(dx * dx + dy * dy);
    const angle = Math.atan2(dy, dx) * 180 / Math.PI;
    
    return {
      length,
      angle,
      startX: fromNode.position.x,
      startY: fromNode.position.y,
      midX: fromNode.position.x + dx / 2,
      midY: fromNode.position.y + dy / 2
    };
  }, [fromNode.position, toNode.position]);

  // Handle click events
  const handleClick = useCallback((event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    if (onClick) {
      onClick(id, edge);
    }
  }, [id, edge, onClick]);

  // Edge styling based on status
  const edgeStyling = useMemo(() => {
    switch (status) {
      case 'active':
        return {
          background: 'linear-gradient(90deg, transparent 0%, #4a90ff 20%, #6c5ce7 50%, #00ff88 80%, transparent 100%)',
          height: '4px',
          opacity: '1.0',
          boxShadow: '0 0 12px rgba(74, 144, 255, 0.6)',
          animation: 'flow-active 1.5s infinite'
        };
      case 'completed':
        return {
          background: 'linear-gradient(90deg, transparent 0%, #4caf50 50%, transparent 100%)',
          height: '4px',
          opacity: '0.9',
          boxShadow: '0 0 8px rgba(76, 175, 80, 0.4)',
          animation: 'flow-completed 3s infinite'
        };
      default:
        return {
          background: 'linear-gradient(90deg, transparent 0%, #4a90ff 20%, #6c5ce7 80%, transparent 100%)',
          height: '3px',
          opacity: '0.6',
          boxShadow: 'none',
          animation: 'flow-idle 4s infinite'
        };
    }
  }, [status]);

  // Progress indicator styling
  const progressStyling = useMemo(() => {
    if (progress > 0) {
      return {
        width: `${progress * 100}%`,
        background: 'linear-gradient(90deg, #00ff88, #4caf50)',
        height: '2px',
        marginTop: '1px'
      };
    }
    return null;
  }, [progress]);

  return (
    <div
      className={`graph-edge absolute cursor-pointer group ${className}`}
      style={{
        left: `${geometry.startX}px`,
        top: `${geometry.startY}px`,
        width: `${geometry.length}px`,
        transformOrigin: 'left center',
        transform: `rotate(${geometry.angle}deg)`,
        zIndex: status === 'active' ? 20 : 10
      }}
      onClick={handleClick}
    >
      {/* Main edge line */}
      <div
        className="relative transition-all duration-300 group-hover:scale-y-150"
        style={edgeStyling}
      >
        {/* Progress overlay */}
        {progressStyling && (
          <div
            className="absolute top-0 left-0"
            style={progressStyling}
          />
        )}

        {/* Flow particles for active edges */}
        {status === 'active' && (
          <>
            <div 
              className="absolute w-2 h-2 bg-white rounded-full animate-ping opacity-80"
              style={{
                left: '15%',
                top: '50%',
                transform: 'translateY(-50%)',
                animationDelay: '0s',
                animationDuration: '1s'
              }}
            />
            <div 
              className="absolute w-2 h-2 bg-yellow-300 rounded-full animate-ping opacity-80"
              style={{
                left: '50%',
                top: '50%',
                transform: 'translateY(-50%)',
                animationDelay: '0.33s',
                animationDuration: '1s'
              }}
            />
            <div 
              className="absolute w-2 h-2 bg-green-300 rounded-full animate-ping opacity-80"
              style={{
                left: '85%',
                top: '50%',
                transform: 'translateY(-50%)',
                animationDelay: '0.66s',
                animationDuration: '1s'
              }}
            />
          </>
        )}

        {/* Arrowhead */}
        <div 
          className="absolute right-0 top-1/2 transform -translate-y-1/2 translate-x-1/2"
          style={{
            width: 0,
            height: 0,
            borderLeft: '8px solid',
            borderTop: '4px solid transparent',
            borderBottom: '4px solid transparent',
            borderLeftColor: status === 'active' ? '#00ff88' : 
                           status === 'completed' ? '#4caf50' : '#4a90ff'
          }}
        />
      </div>

      {/* Hover area (invisible, larger hit target) */}
      <div 
        className="absolute -top-2 -bottom-2 left-0 right-0 opacity-0 group-hover:opacity-20 bg-white transition-opacity duration-200"
      />

      {/* Edge label for important connections */}
      {(status === 'active' || progress > 0) && (
        <div 
          className="absolute top-full mt-1 left-1/2 transform -translate-x-1/2 bg-black bg-opacity-80 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap z-30"
        >
          {fromNode.name} → {toNode.name}
          {progress > 0 && <div>{Math.round(progress * 100)}% complete</div>}
        </div>
      )}

      {/* Hover tooltip */}
      <div 
        className="absolute top-full mt-2 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-40"
        style={{ transform: `translateX(-50%) rotate(-${geometry.angle}deg)` }}
      >
        <div className="bg-black bg-opacity-95 text-white text-xs rounded-lg px-3 py-2 whitespace-nowrap shadow-2xl">
          <div className="font-bold text-orange-400">Connection</div>
          <div>From: {fromNode.name}</div>
          <div>To: {toNode.name}</div>
          <div>Status: {status}</div>
          {progress > 0 && <div>Progress: {Math.round(progress * 100)}%</div>}
          <div className="text-gray-400 mt-1">Click for details</div>
        </div>
        {/* Tooltip arrow */}
        <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-black"></div>
      </div>
    </div>
  );
};