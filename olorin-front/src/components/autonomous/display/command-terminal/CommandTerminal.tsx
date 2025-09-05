import React, { useRef, useEffect, useCallback } from 'react';
import { TerminalLine } from './TerminalLine';
import { CommandTerminalProps, TerminalLogEntry } from '../../../../types/AutonomousDisplayTypes';

export const CommandTerminal: React.FC<CommandTerminalProps> = ({
  logs,
  typewriterSpeed = 50,
  maxLines = 20,
  autoScroll = true,
  onTerminalCommand,
  className = ''
}) => {
  const terminalRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom when new logs are added
  useEffect(() => {
    if (autoScroll && terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [logs, autoScroll]);

  // Handle command input
  const handleCommand = useCallback((event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      const command = event.currentTarget.value.trim();
      if (command && onTerminalCommand) {
        onTerminalCommand(command);
        event.currentTarget.value = '';
      }
    }
  }, [onTerminalCommand]);

  // Focus input when terminal is clicked
  const handleTerminalClick = useCallback(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  // Limit displayed logs to maxLines
  const displayedLogs = React.useMemo(() => {
    return logs.slice(-maxLines);
  }, [logs, maxLines]);

  return (
    <div className={`command-terminal bg-black border border-gray-800 rounded-lg overflow-hidden ${className}`}>
      {/* Terminal header */}
      <div className="terminal-header bg-gray-800 px-4 py-2 flex items-center justify-between border-b border-gray-700">
        <div className="flex items-center space-x-2">
          {/* Traffic light buttons */}
          <div className="w-3 h-3 bg-red-500 rounded-full"></div>
          <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
          <div className="w-3 h-3 bg-green-500 rounded-full"></div>
        </div>
        
        <div className="text-gray-300 text-sm font-mono">
          olorin-autonomous-investigation
        </div>
        
        <div className="flex items-center space-x-2 text-xs text-gray-400">
          <i className="fas fa-terminal"></i>
          <span>{logs.length} lines</span>
        </div>
      </div>

      {/* Terminal content */}
      <div 
        ref={terminalRef}
        className="terminal-content p-4 font-mono text-sm leading-relaxed overflow-y-auto cursor-text"
        style={{ 
          height: 'calc(100% - 120px)', // Account for header and input
          backgroundColor: '#0a0a0a'
        }}
        onClick={handleTerminalClick}
      >
        {displayedLogs.map((log, index) => (
          <TerminalLine
            key={`${log.id}-${index}`}
            log={log}
            typewriterEffect={index === displayedLogs.length - 1} // Only animate the last line
            typewriterSpeed={typewriterSpeed}
            className="mb-1"
          />
        ))}
        
        {/* Cursor for empty terminal */}
        {logs.length === 0 && (
          <div className="flex items-center">
            <span className="text-blue-400">$</span>
            <div className="ml-2 w-2 h-5 bg-blue-400 animate-blink"></div>
          </div>
        )}
      </div>

      {/* Command input area */}
      <div className="terminal-input border-t border-gray-700 bg-gray-900 p-3">
        <div className="flex items-center">
          <span className="text-blue-400 font-mono text-sm mr-2">investigation@olorin:~$</span>
          <input
            ref={inputRef}
            type="text"
            className="flex-1 bg-transparent text-green-400 font-mono text-sm outline-none"
            placeholder="Type command..."
            onKeyPress={handleCommand}
            autoComplete="off"
            spellCheck={false}
          />
        </div>
        
        {/* Command suggestions */}
        <div className="mt-2 text-xs text-gray-500 font-mono">
          Commands: help, status, clear, export, agents, logs
        </div>
      </div>

      {/* Terminal status bar */}
      <div className="terminal-status bg-gray-800 px-4 py-1 flex items-center justify-between text-xs text-gray-400 border-t border-gray-700">
        <div className="flex items-center space-x-4">
          <span>Lines: {displayedLogs.length}/{logs.length}</span>
          <span>Speed: {typewriterSpeed}ms</span>
          <span>Auto-scroll: {autoScroll ? 'ON' : 'OFF'}</span>
        </div>
        
        <div className="flex items-center space-x-2">
          <div className={`w-2 h-2 rounded-full ${logs.length > 0 ? 'bg-green-400 animate-pulse' : 'bg-gray-600'}`}></div>
          <span>{logs.length > 0 ? 'Active' : 'Idle'}</span>
        </div>
      </div>
    </div>
  );
};