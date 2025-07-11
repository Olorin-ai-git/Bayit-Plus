import React, { useState } from 'react';
import {
  Box,
  TextField,
  Button,
  Typography,
  Paper,
  useTheme,
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';

/**
 * Represents a single comment message in the chat window.
 */
export interface CommentMessage {
  sender: string;
  text: string;
  timestamp: number;
  investigationId: string;
  entityId: string;
  entityType: string;
}

/**
 * Props for the ChatWindow component.
 */
interface ChatWindowProps {
  title: string;
  messages: CommentMessage[];
  onSend: (text: string) => void;
  sender: string;
  /** Optional prefix to prepend to the text */
  prefix?: string;
}

/**
 * ChatWindow component for displaying and sending chat messages.
 * @param {ChatWindowProps} props - The chat window props
 * @returns {JSX.Element} The rendered chat window
 */
const ChatWindow: React.FC<ChatWindowProps> = ({
  title,
  messages,
  onSend,
  sender,
  prefix = '',
}) => {
  const theme = useTheme();
  const [input, setInput] = useState('');

  /**
   * Handles sending a message if input is not empty.
   * @returns {void}
   */
  const handleSend = () => {
    const trimmed = input.trim();
    if (trimmed) {
      onSend(`${prefix}${trimmed}`);
      setInput('');
    }
    return undefined;
  };

  return (
    <Paper
      elevation={1}
      sx={{
        p: 2,
        width: '100%',
        height: '16rem',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: theme.palette.background.paper,
      }}
    >
      <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1 }}>
        {title}
      </Typography>

      <Box
        sx={{
          flex: 1,
          overflowY: 'auto',
          mb: 1,
          p: 1,
          border: 1,
          borderColor: 'divider',
          borderRadius: 1,
          backgroundColor: theme.palette.grey[50],
        }}
      >
        {messages.map((msg) => (
          <Box
            key={`${msg.timestamp}-${msg.sender}-${msg.text}`}
            sx={{ mb: 1 }}
          >
            <Typography
              component="span"
              variant="body2"
              sx={{ fontWeight: 600 }}
            >
              {msg.sender}:
            </Typography>{' '}
            <Typography component="span" variant="body2">
              {msg.text}
            </Typography>
            <Typography
              component="span"
              variant="caption"
              sx={{ ml: 1, color: theme.palette.text.secondary }}
            >
              {new Date(msg.timestamp).toLocaleTimeString()}
            </Typography>
          </Box>
        ))}
      </Box>

      <Box sx={{ display: 'flex', gap: 1 }}>
        <TextField
          size="small"
          fullWidth
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          placeholder={`Type a comment as ${sender}...`}
          variant="outlined"
          sx={{
            '& .MuiOutlinedInput-root': {
              backgroundColor: theme.palette.background.paper,
            },
          }}
        />
        <Button
          variant="contained"
          size="small"
          onClick={handleSend}
          endIcon={<SendIcon />}
          sx={{ minWidth: 'auto', px: 2 }}
        >
          Send
        </Button>
      </Box>
    </Paper>
  );
};

export default ChatWindow;
