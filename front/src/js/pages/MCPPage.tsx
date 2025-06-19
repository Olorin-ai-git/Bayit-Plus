import React, { useState, useRef, useEffect } from 'react';
import { useMCPClient } from '../hooks/useMCPClient';
import { useMCPTools } from '../hooks/useMCPTools';
import { ChatMessage, OlorinTool } from '../services/mcpTypes';
import {
  Box,
  Typography,
  Button,
  Paper,
  Card,
  CardContent,
  TextField,
  IconButton,
  Chip,
  Alert,
  LinearProgress,
  Grid,
  useTheme,
  Divider
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  Chat as ChatIcon,
  Build as BuildIcon,
  Send as SendIcon,
  Close as CloseIcon,
  Extension as ExtensionIcon,
  Settings as SettingsIcon
} from '@mui/icons-material';

/**
 * Main MCP Client page component that provides access to MCP tools and chat interface
 */
const MCPPage: React.FC = () => {
  const { state, connect, disconnect, executeTool, sendMessage } = useMCPClient();
  const { isExecuting } = useMCPTools();
  const theme = useTheme();
  
  // UI state
  const [selectedTool, setSelectedTool] = useState<OlorinTool | null>(null);
  const [toolArgs, setToolArgs] = useState<Record<string, any>>({});
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  
  // Layout state
  const [isChatOpen, setIsChatOpen] = useState(true);
  const [toolsSectionHeight, setToolsSectionHeight] = useState(400);
  const draggingRef = useRef(false);
  const splitterRef = useRef<HTMLDivElement>(null);

  // Mouse event handlers for resizable splitter
  useEffect(() => {
    function onMouseMove(e: MouseEvent) {
      if (!draggingRef.current) return;
      const newHeight = Math.max(200, Math.min(600, toolsSectionHeight + e.movementY));
      setToolsSectionHeight(newHeight);
    }

    function onMouseUp() {
      draggingRef.current = false;
    }

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);

    return function cleanup() {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };
  }, [toolsSectionHeight]);

  // Handle tool execution
  const handleToolExecution = async (tool: OlorinTool, args: Record<string, any>) => {
    try {
      const result = await executeTool({
        name: tool.name,
        arguments: args
      });

      const resultText = result.content
        .map(c => c.text)
        .join('\n');

      // Add tool execution to chat
      const toolMessage: ChatMessage = {
        role: 'assistant',
        content: [{ type: 'text', text: `**Tool Executed: ${tool.name}**\n\n${resultText}` }],
      };

      setMessages(prev => [...prev, toolMessage]);
      setSelectedTool(null);
      setToolArgs({});
    } catch (error) {
      console.error('Tool execution failed:', error);
    }
  };

  // Handle chat message sending
  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isSendingMessage) return;

    const userMessage: ChatMessage = {
      role: 'user',
      content: [{ type: 'text', text: inputMessage }],
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsSendingMessage(true);

    // Simple response - in a real implementation, this would integrate with an AI service
    try {
      const assistantMessage: ChatMessage = {
        role: 'assistant',
        content: [{ type: 'text', text: `I received your message: "${inputMessage}". You can use the available tools on the left to analyze data or perform specific tasks. There are ${state.tools.length} tools available.` }],
      };

      setTimeout(() => {
        setMessages(prev => [...prev, assistantMessage]);
        setIsSendingMessage(false);
      }, 1000);
    } catch (error) {
      setIsSendingMessage(false);
    }
  };

  const handleArgumentChange = (argName: string, value: any) => {
    setToolArgs(prev => ({ ...prev, [argName]: value }));
  };

  const renderToolCard = (tool: OlorinTool) => (
    <Card 
      key={tool.name} 
      sx={{ 
        mb: 2,
        '&:hover': { 
          boxShadow: '0 4px 12px rgba(147, 51, 234, 0.15)',
          transform: 'translateY(-2px)'
        },
        transition: 'all 0.2s ease-in-out'
      }}
    >
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
          <Typography variant="h6" sx={{ fontWeight: 600, color: 'text.primary' }}>
            {tool.name}
          </Typography>
          <IconButton
            onClick={() => setSelectedTool(tool)}
            disabled={isExecuting}
            sx={{ 
              color: 'primary.main',
              '&:hover': { backgroundColor: 'primary.50' }
            }}
          >
            <BuildIcon />
          </IconButton>
        </Box>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {tool.description}
        </Typography>
        
        {tool.inputSchema.required && tool.inputSchema.required.length > 0 && (
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
            {tool.inputSchema.required.map(req => (
              <Chip
                key={req}
                label={`${req} *`}
                size="small"
                sx={{ 
                  backgroundColor: 'primary.100',
                  color: 'primary.main',
                  fontWeight: 600
                }}
              />
            ))}
          </Box>
        )}
      </CardContent>
    </Card>
  );

  if (state.isLoading) {
    return (
      <Box sx={{ 
        height: '100%', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        backgroundColor: 'background.default'
      }}>
        <Box sx={{ textAlign: 'center' }}>
          <LinearProgress sx={{ width: 200, mb: 2 }} />
          <Typography variant="body1" color="text.secondary">
            Connecting to MCP Server...
          </Typography>
        </Box>
      </Box>
    );
  }

  if (state.error) {
    return (
      <Box sx={{ 
        height: '100%', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        backgroundColor: 'background.default'
      }}>
        <Box sx={{ textAlign: 'center', maxWidth: 400 }}>
          <Alert severity="error" sx={{ mb: 3 }}>
            <Typography variant="h6" sx={{ mb: 1 }}>
              Connection Error
            </Typography>
            <Typography variant="body2">
              {state.error}
            </Typography>
          </Alert>
          <Button
            variant="contained"
            startIcon={<RefreshIcon />}
            onClick={connect}
            sx={{ textTransform: 'none', fontWeight: 600 }}
          >
            Retry Connection
          </Button>
        </Box>
      </Box>
    );
  }

  if (!state.isConnected) {
    return (
      <Box sx={{ 
        height: '100%', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        backgroundColor: 'background.default'
      }}>
        <Box sx={{ textAlign: 'center' }}>
          <ExtensionIcon sx={{ fontSize: 64, color: 'grey.400', mb: 2 }} />
          <Typography variant="h6" color="text.secondary" sx={{ mb: 2 }}>
            Not connected to MCP Server
          </Typography>
          <Button
            variant="contained"
            startIcon={<RefreshIcon />}
            onClick={connect}
            sx={{ textTransform: 'none', fontWeight: 600 }}
          >
            Connect
          </Button>
        </Box>
      </Box>
    );
  }

  return (
    <Box sx={{ height: '100%', backgroundColor: 'background.default' }}>
      {/* Header */}
      <Box sx={{ p: 3, borderBottom: 1, borderColor: 'divider' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box>
            <Typography variant="h4" component="h1" sx={{ fontWeight: 700, color: 'text.primary', mb: 1 }}>
              MCP Tools
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Model Context Protocol tools and chat interface
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Button
              variant="outlined"
              startIcon={<SettingsIcon />}
              onClick={disconnect}
              sx={{ textTransform: 'none', fontWeight: 600 }}
            >
              Disconnect
            </Button>
            <Button
              variant="contained"
              startIcon={<ChatIcon />}
              onClick={() => setIsChatOpen(!isChatOpen)}
              sx={{ 
                textTransform: 'none', 
                fontWeight: 600,
                boxShadow: '0 4px 12px rgba(147, 51, 234, 0.3)',
                '&:hover': {
                  boxShadow: '0 6px 16px rgba(147, 51, 234, 0.4)',
                },
              }}
            >
              {isChatOpen ? 'Hide Chat' : 'Show Chat'}
            </Button>
          </Box>
        </Box>
      </Box>

      {/* Main Content */}
      <Box sx={{ display: 'flex', height: 'calc(100% - 120px)' }}>
        {/* Tools Section */}
        <Box sx={{ 
          width: isChatOpen ? '60%' : '100%', 
          height: '100%',
          p: 3,
          overflow: 'auto'
        }}>
          <Typography variant="h5" sx={{ fontWeight: 600, mb: 3, color: 'text.primary' }}>
            Available Tools ({state.tools.length})
          </Typography>
          
          {state.tools.map(renderToolCard)}

          {/* Selected Tool Details */}
          {selectedTool && (
            <Paper sx={{ p: 3, mt: 3, backgroundColor: 'primary.50' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6" sx={{ fontWeight: 600, color: 'primary.main' }}>
                  Execute: {selectedTool.name}
                </Typography>
                <IconButton
                  onClick={() => setSelectedTool(null)}
                  sx={{ color: 'primary.main' }}
                >
                  <CloseIcon />
                </IconButton>
              </Box>
              
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                {selectedTool.description}
              </Typography>

              {selectedTool.inputSchema.required && selectedTool.inputSchema.required.length > 0 && (
                <Box sx={{ mb: 3 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 2 }}>
                    Required Parameters:
                  </Typography>
                  {selectedTool.inputSchema.required.map(param => (
                    <TextField
                      key={param}
                      label={param}
                      variant="outlined"
                      size="small"
                      sx={{ mb: 2, width: '100%' }}
                      value={toolArgs[param] || ''}
                      onChange={(e) => handleArgumentChange(param, e.target.value)}
                    />
                  ))}
                </Box>
              )}

              <Button
                variant="contained"
                onClick={() => handleToolExecution(selectedTool, toolArgs)}
                disabled={isExecuting}
                startIcon={<BuildIcon />}
                sx={{ 
                  textTransform: 'none', 
                  fontWeight: 600,
                  boxShadow: '0 4px 12px rgba(147, 51, 234, 0.3)',
                  '&:hover': {
                    boxShadow: '0 6px 16px rgba(147, 51, 234, 0.4)',
                  },
                }}
              >
                {isExecuting ? 'Executing...' : 'Execute Tool'}
              </Button>
            </Paper>
          )}
        </Box>

        {/* Chat Section */}
        {isChatOpen && (
          <>
            <Divider orientation="vertical" flexItem />
            <Box sx={{ 
              width: '40%', 
              height: '100%',
              display: 'flex',
              flexDirection: 'column'
            }}>
              <Box sx={{ p: 3, borderBottom: 1, borderColor: 'divider' }}>
                <Typography variant="h6" sx={{ fontWeight: 600, color: 'text.primary' }}>
                  Chat Interface
                </Typography>
              </Box>
              
              {/* Messages */}
              <Box sx={{ 
                flex: 1, 
                overflow: 'auto', 
                p: 2,
                backgroundColor: 'grey.50'
              }}>
                {messages.map((message, index) => (
                  <Box key={index} sx={{ mb: 2 }}>
                    <Paper sx={{ 
                      p: 2, 
                      backgroundColor: message.role === 'user' ? 'primary.50' : 'white',
                      border: message.role === 'user' ? '1px solid' : 'none',
                      borderColor: 'primary.200'
                    }}>
                      <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
                        {message.role === 'user' ? 'You' : 'Assistant'}
                      </Typography>
                      <Typography variant="body2">
                        {message.content.map(c => c.text).join(' ')}
                      </Typography>
                    </Paper>
                  </Box>
                ))}
              </Box>

              {/* Input */}
              <Box sx={{ p: 2, borderTop: 1, borderColor: 'divider' }}>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <TextField
                    variant="outlined"
                    placeholder="Type your message..."
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                    size="small"
                    sx={{ width: '100%' }}
                  />
                  <IconButton
                    onClick={handleSendMessage}
                    disabled={!inputMessage.trim() || isSendingMessage}
                    sx={{ 
                      backgroundColor: 'primary.main',
                      color: 'white',
                      '&:hover': { backgroundColor: 'primary.dark' },
                      '&:disabled': { backgroundColor: 'grey.300' }
                    }}
                  >
                    <SendIcon />
                  </IconButton>
                </Box>
              </Box>
            </Box>
          </>
        )}
      </Box>
    </Box>
  );
};

export default MCPPage; 