import React, { useRef, useEffect, useState } from 'react';
import { LogEntry, LogLevel } from '../types/RiskAssessment';
import {
  AGENT_COLORS,
  ANIMATION_TIMING,
  INITIAL_LOGS_COUNT,
  SIDEBAR_DIMENSIONS,
} from '../constants/definitions';

interface AgentLogSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  logs: LogEntry[];
  onClearLogs: () => void;
  onCopyLogs?: () => void;
  cancelledRef: React.RefObject<boolean>;
  onLogDisplayed?: (log: LogEntry) => void;
}

interface AnimatedTextProps {
  text: string;
  className?: string;
  charSpeed?: number;
}

/**
 * A component that animates text by displaying it one character at a time.
 * @param {string} text - The text to animate
 * @param {string} className - Optional CSS class name
 * @param {number} charSpeed - Speed of character animation in milliseconds
 * @returns {JSX.Element} The animated text component
 */
const AnimatedText: React.FC<AnimatedTextProps> = ({
  text,
  className = '',
  charSpeed = ANIMATION_TIMING.CHARACTER_SPEED,
}) => {
  const [displayText, setDisplayText] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAnimating, setIsAnimating] = useState(true);

  useEffect(() => {
    if (!isAnimating) return;

    if (currentIndex < text.length) {
      const timer = setTimeout(() => {
        setDisplayText((prev) => prev + text[currentIndex]);
        setCurrentIndex((prev) => prev + 1);
      }, charSpeed);

      return () => {
        clearTimeout(timer);
      };
    }

    setIsAnimating(false);
  }, [currentIndex, text, charSpeed, isAnimating]);

  return (
    <span
      className={className}
      dangerouslySetInnerHTML={{ __html: displayText }}
    />
  );
};



/**
 * A blinking caret component that appears after each log message for 3 seconds
 * @returns {JSX.Element} The caret component
 */
const Caret: React.FC = () => {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(
      () => setIsVisible(false),
      ANIMATION_TIMING.CARET_DURATION,
    );
    return () => clearTimeout(timer);
  }, []);

  if (!isVisible) return null;

  return (
    <span
      className="inline-block border-r-2 border-black ml-1"
      style={{
        height: '1em',
        animation: 'blink 1s step-end infinite',
      }}
    />
  );
};

/**
 * Sidebar component that displays animated agent activity logs with drag-resize functionality.
 * @param {Object} props - The component props
 * @param {boolean} props.isOpen - Whether the sidebar is open
 * @param {Function} props.onClose - Function to close the sidebar
 * @param {Array<LogEntry>} props.logs - Array of log entries to display
 * @param {Function} props.onClearLogs - Function to clear all logs
 * @param {Function} props.onCopyLogs - Function to copy logs to clipboard
 * @returns {JSX.Element} The agent log sidebar component
 */
const AgentLogSidebar: React.FC<AgentLogSidebarProps> = ({
  isOpen,
  onClose,
  logs,
  onClearLogs,
  onCopyLogs,
  cancelledRef,
  onLogDisplayed,
}) => {
  const logContainerRef = useRef<HTMLDivElement>(null);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const dragHandleRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);
  const startXRef = useRef(0);
  const startWidthRef = useRef(0);
  const [visibleLogs, setVisibleLogs] = useState<LogEntry[]>([]);
  const [currentLogIndex, setCurrentLogIndex] = useState(0);
  const logTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [copied, setCopied] = useState(false);
  const [shouldRender, setShouldRender] = useState(isOpen);
  const [fadeState, setFadeState] = useState(
    isOpen ? 'slide-fade-in' : 'slide-fade-out',
  );
  const [isDragging, setIsDragging] = useState(false);

  /**
   * Copies the logs to the clipboard and shows a success message.
   */
  const handleCopyLogs = async () => {
    const logText = logs
      .map(
        (log) =>
          `${new Date(log.timestamp).toLocaleTimeString()} - ${log.message}`,
      )
      .join('\n');
    try {
      await navigator.clipboard.writeText(logText);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
      if (onCopyLogs) onCopyLogs();
    } catch (err) {
      // Silently fail
    }
  };

  useEffect(() => {
    if (
      logs.length > 0 &&
      currentLogIndex < logs.length &&
      !cancelledRef?.current
    ) {
      logTimeoutRef.current = setTimeout(() => {
        if (cancelledRef?.current) {
          if (logTimeoutRef.current) {
            clearTimeout(logTimeoutRef.current);
            logTimeoutRef.current = null;
          }
          return;
        }
        const currentLog = logs[currentLogIndex];
        setVisibleLogs((prev) => [...prev, currentLog]);
        setCurrentLogIndex((prev) => prev + 1);
        if (onLogDisplayed) onLogDisplayed(currentLog);
      }, ANIMATION_TIMING.LOG_DISPLAY_DELAY);
    }

    return () => {
      if (logTimeoutRef.current) {
        clearTimeout(logTimeoutRef.current);
        logTimeoutRef.current = null;
      }
    };
  }, [logs, currentLogIndex, cancelledRef, onLogDisplayed]);

  // Add a separate effect to handle logs reset
  useEffect(() => {
    if (
      logs.length === INITIAL_LOGS_COUNT &&
      (logs[0].message.includes('Initializing') ||
        logs[0].message.includes('Investigation started'))
    ) {
      setCurrentLogIndex(0);
      setVisibleLogs([]);
      if (logTimeoutRef.current) {
        clearTimeout(logTimeoutRef.current);
        logTimeoutRef.current = null;
      }
    }
  }, [logs, onClearLogs]);

  useEffect(() => {
    /**
     * Handles mouse movement during sidebar resizing
     * @param {MouseEvent} e - The mouse event
     */
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDraggingRef.current || !sidebarRef.current) {
        return;
      }
      const dx = e.clientX - startXRef.current;
      // Expand to the right (increase width as you drag right)
      const newWidth = Math.max(
        SIDEBAR_DIMENSIONS.MIN_WIDTH,
        Math.min(SIDEBAR_DIMENSIONS.MAX_WIDTH, startWidthRef.current - dx),
      );
      sidebarRef.current.style.width = `${newWidth}px`;
    };

    /**
     * Handles mouse up to stop sidebar resizing
     */
    const handleMouseUp = () => {
      isDraggingRef.current = false;
      setIsDragging(false);
      document.body.style.userSelect = '';
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  useEffect(() => {
    if (isOpen) {
      setShouldRender(true);
      setFadeState('slide-fade-in');
    } else if (shouldRender) {
      setFadeState('slide-fade-out');
      const timeout = setTimeout(() => setShouldRender(false), 400);
      return () => clearTimeout(timeout);
    }
  }, [isOpen, shouldRender]);

  // Set initial sidebar width to 384px (24rem) on mount
  useEffect(() => {
    if (sidebarRef.current) {
      sidebarRef.current.style.width = '384px';
    }
  }, []);

  /**
   * Gets the text color class for a given log level
   * @param {LogLevel} type - The log level to get the color for
   * @returns {string} The Tailwind CSS color class
   */
  const getLogTypeColor = (type: LogLevel): string => {
    switch (type) {
      case LogLevel.SUCCESS:
        return 'text-green-500';
      case LogLevel.ERROR:
        return 'text-red-500';
      case LogLevel.WARNING:
        return 'text-yellow-500';
      case LogLevel.INFO:
      default:
        return 'text-gray-500';
    }
  };

  /**
   * Gets the text color class for a given agent name
   * @param {string} agentName - The name of the agent
   * @returns {string} The Tailwind CSS color class
   */
  const getAgentColor = (agentName: string): string =>
    AGENT_COLORS[agentName] || 'text-gray-800';

  /**
   * Formats a message by wrapping agent names in colored spans
   * @param {string} message - The message to format
   * @returns {string} The formatted message with colored agent names
   */
  const formatMessage = (message: string): string => {
    const agentNames = Object.keys(AGENT_COLORS);
    let formattedMessage = message;

    agentNames.forEach((agentName) => {
      const regex = new RegExp(agentName, 'g');
      const color = getAgentColor(agentName);
      formattedMessage = formattedMessage.replace(
        regex,
        `<span class="font-bold ${color}">${agentName}</span>`,
      );
    });

    return formattedMessage;
  };

  if (!shouldRender) return null;

  return (
    <>
      <style>
        {`
                    @keyframes blink {
                        0%, 100% { opacity: 1; }
                        50% { opacity: 0; }
                    }
                    @keyframes slideInRight {
                        0% {
                            transform: translateX(100%);
                            opacity: 0;
                        }
                        100% {
                            transform: translateX(0);
                            opacity: 1;
                        }
                    }
                    @keyframes slideOutRight {
                        0% {
                            transform: translateX(0);
                            opacity: 1;
                        }
                        100% {
                            transform: translateX(100%);
                            opacity: 0;
                        }
                    }
                    .slide-fade-in {
                        animation: slideInRight 0.3s ease-out forwards;
                    }
                    .slide-fade-out {
                        animation: slideOutRight 0.3s ease-in forwards;
                    }
                    .sidebar-tooltip {
                        position: absolute;
                        left: 50%;
                        transform: translateX(-50%);
                        bottom: -2.2rem;
                        background: #222;
                        color: #fff;
                        padding: 2px 10px;
                        border-radius: 4px;
                        font-size: 0.85rem;
                        white-space: nowrap;
                        opacity: 0;
                        pointer-events: none;
                        transition: opacity 0.2s;
                        z-index: 100;
                    }
                    .sidebar-btn:hover .sidebar-tooltip,
                    .sidebar-btn:focus .sidebar-tooltip {
                        opacity: 1;
                        pointer-events: auto;
                    }
                `}
      </style>
      <div
        ref={sidebarRef}
        data-testid="agent-log-sidebar"
        className={`w-72 flex flex-col h-full bg-white shadow-lg z-40 relative ${
          isDragging ? '' : 'transition-all duration-500 ease-in-out'
        } ${fadeState}`}
        style={{ boxShadow: '0 0 16px rgba(0,0,0,0.08)' }}
      >
        <div
          ref={dragHandleRef}
          onMouseDown={(e) => {
            setIsDragging(true);
            isDraggingRef.current = true;
            startXRef.current = e.clientX;
            startWidthRef.current = sidebarRef.current?.offsetWidth || 384;
            document.body.style.userSelect = 'none';
          }}
          className="absolute left-0 top-0 bottom-0 w-2 cursor-col-resize hover:bg-blue-200 active:bg-blue-300 transition-colors"
          style={{ zIndex: 100, color: 'black', borderWidth: 'thin' }}
        />
        <div className="flex justify-between items-center p-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-800">
            Agent Activity Log
          </h2>
          <div className="flex gap-2 relative">
            <div className="relative sidebar-btn">
              <button
                type="button"
                onClick={handleCopyLogs}
                className="p-2 text-gray-500 hover:text-gray-700 focus:outline-none cursor-pointer"
                aria-label="Copy logs to clipboard"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path d="M8 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" />
                  <path d="M6 3a2 2 0 00-2 2v11a2 2 0 002 2h8a2 2 0 002-2V5a2 2 0 00-2-2 3 3 0 01-3 3H9a3 3 0 01-3-3z" />
                </svg>
              </button>
              <span className="sidebar-tooltip" role="tooltip">
                Copy logs
              </span>
              {copied && (
                <span
                  className="sidebar-tooltip"
                  style={{ bottom: '-2.2rem', background: '#16a34a' }}
                  role="status"
                >
                  Copied!
                </span>
              )}
            </div>
            <div className="relative sidebar-btn">
              <button
                type="button"
                onClick={onClearLogs}
                className="p-2 text-gray-500 hover:text-red-600 focus:outline-none cursor-pointer"
                aria-label="Clear Logs"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M1 7h22M8 7V5a2 2 0 012-2h4a2 2 0 012 2v2"
                  />
                </svg>
              </button>
              <span className="sidebar-tooltip" role="tooltip">
                Clear Logs
              </span>
            </div>
            <div className="relative sidebar-btn">
              <button
                type="button"
                onClick={onClose}
                className="p-2 text-gray-500 hover:text-gray-700 focus:outline-none"
                aria-label="Close sidebar"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>
              <span className="sidebar-tooltip" role="tooltip">
                Close sidebar
              </span>
            </div>
          </div>
        </div>
        <div
          ref={logContainerRef}
          className="h-[calc(92vh-4rem)] w-full overflow-y-auto overflow-x-hidden p-4"
        >
          {[...visibleLogs].reverse().map((log) => (
            <div
              key={`${log.timestamp}-${log.message}`}
              className="mb-3 last:mb-0"
            >
              <div className="text-xs text-black-500 mb-1">
                {new Date(log.timestamp).toLocaleTimeString()}
              </div>
              <div
                className={`text-xs ${getLogTypeColor(
                  log.type,
                )} flex items-baseline break-words`}
              >
                <AnimatedText
                  text={formatMessage(log.message)}
                  charSpeed={ANIMATION_TIMING.CHARACTER_SPEED}
                />
                <Caret />
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
};

export default AgentLogSidebar;
