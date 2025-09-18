import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  X,
  Copy,
  Trash2,
  Activity,
  Clock,
  AlertTriangle,
  CheckCircle,
  Info,
  AlertCircle
} from 'lucide-react';
import { LogEntry, LogLevel } from '../../types/investigation';

interface LogMonitorProps {
  isOpen: boolean;
  onClose: () => void;
  logs: LogEntry[];
  onClearLogs: () => void;
  onCopyLogs?: () => void;
  title?: string;
  className?: string;
  showRAGEnhancement?: boolean;
  investigationId?: string;
}

interface AnimatedTextProps {
  text: string;
  className?: string;
  charSpeed?: number;
}

// Animated text component for typewriter effect
const AnimatedText: React.FC<AnimatedTextProps> = ({
  text,
  className = '',
  charSpeed = 20
}) => {
  const [displayedCharCount, setDisplayedCharCount] = useState(0);
  const [isAnimating, setIsAnimating] = useState(true);

  useEffect(() => {
    if (!isAnimating) return;

    if (displayedCharCount < text.length) {
      const timer = setTimeout(() => {
        setDisplayedCharCount(prev => prev + 1);
      }, charSpeed);

      return () => clearTimeout(timer);
    } else {
      setIsAnimating(false);
    }
  }, [displayedCharCount, text.length, charSpeed, isAnimating]);

  // Parse and render text safely (basic HTML parsing)
  const renderFormattedText = () => {
    const visibleText = text.substring(0, displayedCharCount);

    // Simple parsing for bold text and other formatting
    const formatText = (str: string) => {
      return str
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>');
    };

    return (
      <span
        className={className}
        dangerouslySetInnerHTML={{ __html: formatText(visibleText) }}
      />
    );
  };

  return renderFormattedText();
};

// Blinking caret component
const Caret: React.FC = () => {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(false), 3000);
    return () => clearTimeout(timer);
  }, []);

  if (!isVisible) return null;

  return (
    <span className="inline-block w-0.5 h-4 bg-current ml-1 animate-pulse" />
  );
};

const LogMonitor: React.FC<LogMonitorProps> = ({
  isOpen,
  onClose,
  logs,
  onClearLogs,
  onCopyLogs,
  title = "Investigation Log Monitor",
  className = "",
  showRAGEnhancement = false,
  investigationId
}) => {
  const logContainerRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);
  const [visibleLogs, setVisibleLogs] = useState<LogEntry[]>([]);
  const [currentLogIndex, setCurrentLogIndex] = useState(0);

  // Auto-scroll to bottom when new logs are added
  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [visibleLogs]);

  // Animate log display
  useEffect(() => {
    if (logs.length > currentLogIndex) {
      const timer = setTimeout(() => {
        setVisibleLogs(prev => [...prev, logs[currentLogIndex]]);
        setCurrentLogIndex(prev => prev + 1);
      }, 100);

      return () => clearTimeout(timer);
    }
  }, [logs, currentLogIndex]);

  // Reset when logs are cleared
  useEffect(() => {
    if (logs.length === 0) {
      setVisibleLogs([]);
      setCurrentLogIndex(0);
    }
  }, [logs.length]);

  // Handle copy logs
  const handleCopyLogs = useCallback(async () => {
    const logText = logs
      .map(log =>
        `${new Date(log.timestamp).toLocaleTimeString()} [${log.type.toUpperCase()}] ${log.message}`
      )
      .join('\n');

    try {
      await navigator.clipboard.writeText(logText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      if (onCopyLogs) onCopyLogs();
    } catch (err) {
      console.error('Failed to copy logs:', err);
    }
  }, [logs, onCopyLogs]);

  // Get log type icon and color
  const getLogTypeDisplay = (type: LogLevel) => {
    switch (type) {
      case LogLevel.SUCCESS:
        return {
          icon: <CheckCircle className="w-4 h-4" />,
          color: 'text-green-600'
        };
      case LogLevel.ERROR:
        return {
          icon: <AlertTriangle className="w-4 h-4" />,
          color: 'text-red-600'
        };
      case LogLevel.WARNING:
        return {
          icon: <AlertCircle className="w-4 h-4" />,
          color: 'text-yellow-600'
        };
      case LogLevel.DEBUG:
        return {
          icon: <Info className="w-4 h-4" />,
          color: 'text-gray-500'
        };
      case LogLevel.INFO:
      default:
        return {
          icon: <Info className="w-4 h-4" />,
          color: 'text-blue-600'
        };
    }
  };

  // Format message for display
  const formatMessage = (message: string): string => {
    // Highlight agent names and important keywords
    const keywords = [
      'Device Analysis Agent',
      'Location Analysis Agent',
      'Network Analysis Agent',
      'Log Analysis Agent',
      'Risk Assessment Agent',
      'completed',
      'failed',
      'started',
      'analyzing',
      'ERROR',
      'SUCCESS',
      'WARNING'
    ];

    let formatted = message;
    keywords.forEach(keyword => {
      const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
      formatted = formatted.replace(regex, `**${keyword}**`);
    });

    return formatted;
  };

  if (!isOpen) return null;

  return (
    <div className={`fixed inset-y-0 right-0 w-96 bg-white shadow-xl border-l border-gray-200 z-50 flex flex-col ${className}`}>
      {/* Resize handle */}
      <div
        className="absolute left-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-400 bg-gray-300 transition-colors"
        onMouseDown={(e) => {
          setIsResizing(true);
          // Add resize logic here if needed
        }}
      />

      {/* Header */}
      <div className="flex-shrink-0 px-4 py-3 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Activity className="w-5 h-5 text-blue-600" />
            <h2 className="text-lg font-semibold text-gray-900">
              {title}
            </h2>
          </div>

          <div className="flex items-center space-x-1">
            {/* Copy logs button */}
            <div className="relative">
              <button
                onClick={handleCopyLogs}
                className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
                title="Copy logs to clipboard"
              >
                <Copy className="w-4 h-4" />
              </button>
              {copied && (
                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-1 px-2 py-1 bg-green-600 text-white text-xs rounded">
                  Copied!
                </div>
              )}
            </div>

            {/* Clear logs button */}
            <button
              onClick={onClearLogs}
              className="p-2 text-gray-500 hover:text-red-600 hover:bg-gray-100 rounded-md transition-colors"
              title="Clear all logs"
            >
              <Trash2 className="w-4 h-4" />
            </button>

            {/* Close button */}
            <button
              onClick={onClose}
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
              title="Close log monitor"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Log statistics */}
        <div className="mt-2 flex items-center justify-between text-xs text-gray-600">
          <div className="flex items-center space-x-4">
            <span>{logs.length} entries</span>
            <span className="flex items-center space-x-1">
              <Clock className="w-3 h-3" />
              <span>{logs.length > 0 ? new Date(logs[logs.length - 1].timestamp).toLocaleTimeString() : '--:--:--'}</span>
            </span>
          </div>
          <div className="flex items-center space-x-2">
            {logs.filter(l => l.type === LogLevel.ERROR).length > 0 && (
              <span className="text-red-600">{logs.filter(l => l.type === LogLevel.ERROR).length} errors</span>
            )}
            {logs.filter(l => l.type === LogLevel.SUCCESS).length > 0 && (
              <span className="text-green-600">{logs.filter(l => l.type === LogLevel.SUCCESS).length} success</span>
            )}
          </div>
        </div>
      </div>

      {/* Log content */}
      <div
        ref={logContainerRef}
        className="flex-1 overflow-y-auto overflow-x-hidden p-4 space-y-3 bg-gray-900 text-green-400 font-mono text-sm"
      >
        {visibleLogs.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Activity className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>No logs yet. Investigation activity will appear here.</p>
          </div>
        ) : (
          visibleLogs.map((log, index) => {
            const { icon, color } = getLogTypeDisplay(log.type);

            return (
              <div key={log.id} className="flex items-start space-x-2 py-2 border-b border-gray-800">
                <div className="flex-shrink-0 mt-0.5">
                  <div className={color}>
                    {icon}
                  </div>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2 text-xs text-gray-400 mb-1">
                    <span>{new Date(log.timestamp).toLocaleTimeString()}</span>
                    <span className="uppercase">[{log.type}]</span>
                    {log.agentName && (
                      <span className="text-blue-400">by {log.agentName}</span>
                    )}
                  </div>

                  <div className="text-sm">
                    <AnimatedText
                      text={formatMessage(log.message)}
                      className="break-words"
                      charSpeed={10}
                    />
                    {index === visibleLogs.length - 1 && <Caret />}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* RAG Enhancement Section (if enabled) */}
      {showRAGEnhancement && investigationId && isOpen && (
        <div className="flex-shrink-0 border-t border-gray-200 p-3 bg-blue-50">
          <div className="text-sm text-blue-800">
            <div className="font-medium mb-2">RAG Intelligence Enhancement</div>
            <div className="text-xs text-blue-600">
              AI-powered log analysis and contextual insights for investigation {investigationId}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LogMonitor;