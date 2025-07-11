import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Paper,
  Typography,
  IconButton,
  Divider,
  useTheme,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import CommentWindow, { CommentMessage } from './CommentWindow';
// import { fetchChatLog } from '../services/ChatService';
import ChatLogAnimated from './ChatLogAnimated';

/**
 * Props for the CommentSidebar component.
 */
interface CommentSidebarProps {
  isOpen: boolean;
  width: number;
  systemPromptComments: CommentMessage[];
  onSystemPromptSend: (text: string) => void;
  investigationId: string;
  entityId?: string;
  entityType?: string;
  onClose: () => void;
  onCommentLogUpdateRequest: () => void;
  commentLog: CommentMessage[];
  messages?: CommentMessage[];
  onSend?: (text: string) => void;
  onLogUpdateRequest?: () => void;
  isLoading?: boolean;
  currentInvestigationId?: string;
}

const MIN_WIDTH = 280;
const MAX_WIDTH = 600;
const DEFAULT_WIDTH = 368; // 23rem, matches w-92
const commentPrefix = 'Investigation Comment: ';

/**
 * CommentSidebar component displays a sidebar for system prompt instructions and animated chat log.
 * @param {CommentSidebarProps} props - The sidebar props
 * @returns {JSX.Element|null} The rendered sidebar component or null if not open
 */
const CommentSidebar: React.FC<CommentSidebarProps> = ({
  isOpen = false,
  width: initialWidth,
  systemPromptComments,
  onSystemPromptSend,
  investigationId,
  entityId = '',
  entityType = 'user_id',
  onClose = () => {},
  onCommentLogUpdateRequest,
  commentLog,
  messages = [],
  onSend = () => {},
  onLogUpdateRequest = () => {},
  isLoading = false,
  currentInvestigationId = '',
}) => {
  const theme = useTheme();
  const sidebarRef = useRef<HTMLDivElement>(null);
  const dragHandleRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(initialWidth || DEFAULT_WIDTH);
  const [isDragging, setIsDragging] = useState(false);
  const startXRef = useRef(0);
  const startWidthRef = useRef(0);
  const [shouldRender, setShouldRender] = useState(isOpen);
  const [animationState, setAnimationState] = useState<
    'entering' | 'entered' | 'exiting' | 'exited'
  >(isOpen ? 'entered' : 'exited');

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      const dx = e.clientX - startXRef.current;
      const newWidth = Math.max(
        MIN_WIDTH,
        Math.min(MAX_WIDTH, startWidthRef.current + dx),
      );
      setWidth(newWidth);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.userSelect = 'none';
      document.body.style.cursor = 'col-resize';
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

  // Handle visibility state for animations
  useEffect(() => {
    if (isOpen) {
      setShouldRender(true);
      setAnimationState('entering');
      // Small delay to ensure DOM is ready before starting animation
      const enterTimeout = setTimeout(() => setAnimationState('entered'), 10);
      return () => clearTimeout(enterTimeout);
    } else {
      setAnimationState('exiting');
      // Delay hiding to allow animation to complete
      const exitTimeout = setTimeout(() => {
        setAnimationState('exited');
        setShouldRender(false);
      }, 300);
      return () => clearTimeout(exitTimeout);
    }
  }, [isOpen]);

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    startXRef.current = e.clientX;
    startWidthRef.current = width;
  };

  if (!shouldRender) return null;

  return (
    <Paper
      ref={sidebarRef}
      elevation={3}
      sx={{
        width: `${width}px`,
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: theme.palette.background.paper,
        transition: isDragging
          ? 'none'
          : 'transform 0.3s ease-in-out, opacity 0.3s ease-in-out',
        height: '100%',
        position: 'relative',
        transform:
          animationState === 'entered' ? 'translateX(0)' : 'translateX(-100%)',
        opacity: animationState === 'entered' ? 1 : 0,
      }}
    >
      {/* Drag handle */}
      <Box
        ref={dragHandleRef}
        onMouseDown={handleMouseDown}
        sx={{
          position: 'absolute',
          right: 0,
          top: 0,
          bottom: 0,
          width: '4px',
          cursor: 'col-resize',
          backgroundColor: 'transparent',
          '&:hover': {
            backgroundColor: theme.palette.primary.light,
          },
          '&:active': {
            backgroundColor: theme.palette.primary.main,
          },
          zIndex: 1,
        }}
      />

      {/* Header */}
      <Box
        sx={{
          p: 2,
          borderBottom: 1,
          borderColor: 'divider',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          backgroundColor: theme.palette.background.default,
        }}
      >
        <Typography variant="h6" sx={{ fontWeight: 600 }}>
          System Prompt Instructions
        </Typography>
        <IconButton
          onClick={onClose}
          size="small"
          sx={{ color: theme.palette.text.secondary }}
        >
          <CloseIcon />
        </IconButton>
      </Box>

      {/* Content */}
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          flex: 1,
          overflow: 'hidden',
        }}
      >
        {/* Comment Window */}
        <Box sx={{ p: 2 }}>
          <CommentWindow
            title="System Prompt Instructions"
            messages={systemPromptComments}
            onSend={async (text) => {
              await onSystemPromptSend(text);
              onCommentLogUpdateRequest();
            }}
            sender="System Prompt Instructions"
            prefix={commentPrefix}
          />
        </Box>

        <Divider />

        {/* Comment Log */}
        <Box
          sx={{
            flex: 1,
            p: 2,
            backgroundColor: theme.palette.grey[50],
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <Typography
            variant="caption"
            sx={{ fontWeight: 600, mb: 1, color: theme.palette.text.secondary }}
          >
            System Prompt Instructions Log
          </Typography>
          <Box sx={{ flex: 1, overflow: 'hidden' }}>
            <ChatLogAnimated messages={commentLog} />
          </Box>
        </Box>
      </Box>
    </Paper>
  );
};

export default CommentSidebar;
