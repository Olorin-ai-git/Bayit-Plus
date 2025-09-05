import React, { useMemo } from 'react';
import { TypewriterEffect } from './TypewriterEffect';
import { TerminalLineProps } from '../../../../types/AutonomousDisplayTypes';

const logTypeStyles = {
  prompt: 'text-blue-400',
  success: 'text-green-400',
  warning: 'text-yellow-400',
  error: 'text-red-400',
  info: 'text-gray-300'
};

const agentStyles = {
  ORCHESTRATOR: 'text-blue-300',
  'NETWORK-AGENT': 'text-green-300',
  'DEVICE-AGENT': 'text-orange-300',
  'LOCATION-AGENT': 'text-purple-300',
  'LOGS-AGENT': 'text-red-300',
  'RISK-AGENT': 'text-yellow-300'
};

export const TerminalLine: React.FC<TerminalLineProps> = ({
  log,
  typewriterEffect = false,
  typewriterSpeed = 50,
  className = ''
}) => {
  const { timestamp, type, message, agent } = log;

  // Format timestamp
  const formattedTimestamp = useMemo(() => {
    return new Date(timestamp).toLocaleTimeString();
  }, [timestamp]);

  // Parse message for special formatting
  const formattedMessage = useMemo(() => {
    let msg = message;
    
    // Handle agent prefixes
    Object.keys(agentStyles).forEach(agentName => {
      const regex = new RegExp(`\\[${agentName}\\]`, 'g');
      msg = msg.replace(regex, `<span class="${agentStyles[agentName as keyof typeof agentStyles]} font-bold">[${agentName}]</span>`);
    });
    
    // Handle warning symbols
    msg = msg.replace(/⚠️/g, '<span class="text-yellow-400">⚠️</span>');
    
    // Handle error symbols
    msg = msg.replace(/❌/g, '<span class="text-red-400">❌</span>');
    
    // Handle success symbols
    msg = msg.replace(/✅/g, '<span class="text-green-400">✅</span>');
    
    // Handle alert symbols
    msg = msg.replace(/🚨/g, '<span class="text-red-400 animate-pulse">🚨</span>');
    
    // Handle confidence percentages
    msg = msg.replace(/(\d+%)/g, '<span class="text-green-300 font-bold">$1</span>');
    
    // Handle time values
    msg = msg.replace(/(\d+(?:\.\d+)?\s*(?:ms|s|min|h))/g, '<span class="text-cyan-400">$1</span>');
    
    // Handle IP addresses
    msg = msg.replace(/(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})/g, '<span class="text-blue-300">$1</span>');
    
    // Handle file paths and names
    msg = msg.replace(/([\w-]+\.(json|md|log|txt|py))/g, '<span class="text-purple-300">$1</span>');
    
    // Handle scores and numbers in "X/Y" format
    msg = msg.replace(/(\d+\/\d+)/g, '<span class="text-yellow-300 font-bold">$1</span>');
    
    return msg;
  }, [message]);

  // Base line styling
  const baseClasses = useMemo(() => {
    return `terminal-line flex items-start font-mono text-sm ${logTypeStyles[type]} ${className}`;
  }, [type, className]);

  return (
    <div className={baseClasses}>
      {/* Timestamp */}
      <span className="text-gray-500 text-xs mr-2 flex-shrink-0 mt-0.5">
        [{formattedTimestamp}]
      </span>
      
      {/* Message content */}
      <div className="flex-1">
        {typewriterEffect ? (
          <TypewriterEffect
            text={formattedMessage}
            speed={typewriterSpeed}
            className="inline"
          />
        ) : (
          <span dangerouslySetInnerHTML={{ __html: formattedMessage }} />
        )}
        
        {/* Agent badge */}
        {agent && (
          <span className="ml-2 px-2 py-0.5 bg-gray-800 text-gray-300 text-xs rounded border">
            {agent}
          </span>
        )}
      </div>
      
      {/* Special indicators for different log types */}
      {type === 'error' && (
        <div className="ml-2 w-2 h-2 bg-red-400 rounded-full animate-pulse flex-shrink-0 mt-2"></div>
      )}
      
      {type === 'warning' && (
        <div className="ml-2 w-2 h-2 bg-yellow-400 rounded-full animate-pulse flex-shrink-0 mt-2"></div>
      )}
      
      {type === 'success' && (
        <div className="ml-2 w-2 h-2 bg-green-400 rounded-full flex-shrink-0 mt-2"></div>
      )}
    </div>
  );
};