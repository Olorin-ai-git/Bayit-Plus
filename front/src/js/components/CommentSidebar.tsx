import React, { useState, useEffect, useRef } from 'react';
import CommentWindow, { CommentMessage } from './CommentWindow';
// import { fetchChatLog } from '../services/ChatService';
import ChatLogAnimated from './ChatLogAnimated';

/**
 * Props for the CommentSidebar component.
 */
interface CommentSidebarProps {
  isOpen: boolean;
  width: number;
  investigatorComments: CommentMessage[];
  policyComments: CommentMessage[];
  onInvestigatorSend: (text: string) => void;
  onPolicySend: (text: string) => void;
  investigationId: string;
  entityId?: string;
  entityType?: string;
  onClose: () => void;
  onCommentLogUpdateRequest: (role: 'Investigator' | 'Policy Team') => void;
  commentLog: CommentMessage[];
  selectedRole: 'Investigator' | 'Policy Team';
  messages?: CommentMessage[];
  onSend?: (text: string) => void;
  onLogUpdateRequest?: (role: 'Investigator' | 'Policy Team') => void;
  isLoading?: boolean;
  currentInvestigationId?: string;
}

const MIN_WIDTH = 280;
const MAX_WIDTH = 600;
const DEFAULT_WIDTH = 368; // 23rem, matches w-92
const commentPrefix = 'Investigation Comment: ';

/**
 * CommentSidebar component displays a sidebar for investigator and policy team comments with role selection and animated chat log.
 * @param {CommentSidebarProps} props - The sidebar props
 * @returns {JSX.Element|null} The rendered sidebar component or null if not open
 */
const CommentSidebar: React.FC<CommentSidebarProps> = ({
  isOpen,
  width: initialWidth,
  investigatorComments,
  policyComments,
  onInvestigatorSend,
  onPolicySend,
  investigationId,
  entityId,
  entityType,
  onClose,
  onCommentLogUpdateRequest,
  commentLog,
  selectedRole,
  messages,
  onSend,
  onLogUpdateRequest,
  isLoading,
  currentInvestigationId,
}) => {
  const sidebarRef = useRef<HTMLDivElement>(null);
  const dragHandleRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);
  const startXRef = useRef(0);
  const startWidthRef = useRef(0);
  const [shouldRender, setShouldRender] = useState(isOpen);
  const [fadeState, setFadeState] = useState(
    isOpen ? 'slide-fade-in' : 'slide-fade-out',
  );
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    // Set initial width on mount
    if (sidebarRef.current) {
      sidebarRef.current.style.width = `${Math.max(
        initialWidth || DEFAULT_WIDTH,
        MIN_WIDTH,
      )}px`;
    }
  }, [initialWidth]);
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDraggingRef.current || !sidebarRef.current) return;
      const dx = e.clientX - startXRef.current;
      const newWidth = Math.max(
        MIN_WIDTH,
        Math.min(MAX_WIDTH, startWidthRef.current + dx),
      );
      sidebarRef.current.style.width = `${newWidth}px`;
    };

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

  const handleDragMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    setIsDragging(true);
    isDraggingRef.current = true;
    startXRef.current = e.clientX;
    startWidthRef.current = sidebarRef.current?.offsetWidth || DEFAULT_WIDTH;
    document.body.style.userSelect = 'none';
  };

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

  if (!shouldRender) return null;

  return (
    <div
      ref={sidebarRef}
      className={`flex flex-col h-full z-40 relative ${
        isDragging ? '' : 'transition-all duration-500 ease-in-out'
      } ${fadeState}`}
      style={{
        background: 'rgba(255,255,255,0.98)',
        boxShadow: '0 0 16px rgba(0,0,0,0.08)',
      }}
    >
      {/* Drag handle on right edge */}
      <div
        ref={dragHandleRef}
        onMouseDown={handleDragMouseDown}
        className="absolute top-0 right-0 bottom-0 w-2 cursor-col-resize hover:bg-blue-200 active:bg-blue-300 transition-colors"
        style={{ zIndex: 100 }}
        role="separator"
        tabIndex={0}
        aria-orientation="vertical"
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            // Optionally, start dragging on Enter/Space
            handleDragMouseDown(e as any);
          }
        }}
      />
      <div className="p-4 border-b bg-white flex justify-between items-center">
        <div className="flex gap-4 items-center">
          <label
            className="flex items-center gap-1"
            htmlFor="chatRole-investigator"
          >
            <input
              id="chatRole-investigator"
              type="radio"
              name="chatRole"
              value="Investigator"
              checked={selectedRole === 'Investigator'}
              onChange={() => onCommentLogUpdateRequest('Investigator')}
            />
            Investigator
          </label>
          <label className="flex items-center gap-1" htmlFor="chatRole-policy">
            <input
              id="chatRole-policy"
              type="radio"
              name="chatRole"
              value="Policy Team"
              checked={selectedRole === 'Policy Team'}
              onChange={() => onCommentLogUpdateRequest('Policy Team')}
            />
            Policy Team
          </label>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="p-2 text-gray-500 hover:text-gray-700 focus:outline-none"
          aria-label="Close chat sidebar"
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
      </div>
      <div className="flex flex-col flex-1">
        <div>
          {selectedRole === 'Investigator' ? (
            <CommentWindow
              title="Investigator Comments"
              messages={investigatorComments}
              onSend={async (text) => {
                await onInvestigatorSend(text);
                onCommentLogUpdateRequest('Investigator');
              }}
              sender="Investigator"
              prefix={commentPrefix}
            />
          ) : (
            <CommentWindow
              title="Policy Team Comments"
              messages={policyComments}
              onSend={async (text) => {
                await onPolicySend(text);
                onCommentLogUpdateRequest('Policy Team');
              }}
              sender="Policy Team"
              prefix={commentPrefix}
            />
          )}
        </div>
        {/* Comment Log Window */}
        <div className="flex-1 bg-gray-100 rounded p-4 border border-gray-200 min-h-0">
          <div className="font-bold text-xs mb-1 text-gray-700">
            Comment Log for Investigation ID:{' '}
            <span className="font-mono">{investigationId}</span>
          </div>
          <div className="font-semibold text-xs mb-2 text-gray-600">
            {selectedRole} Comment Log
          </div>
          <ChatLogAnimated messages={commentLog} />
        </div>
      </div>
    </div>
  );
};

CommentSidebar.defaultProps = {
  isOpen: false,
  onClose: () => {},
  messages: [],
  onSend: () => {},
  onLogUpdateRequest: () => {},
  isLoading: false,
  currentInvestigationId: '',
  entityId: '',
  entityType: 'user_id',
};

export default CommentSidebar;
