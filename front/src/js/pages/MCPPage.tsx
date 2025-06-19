import React, { useState, useRef, useEffect } from 'react';
import { useMCPClient } from '../hooks/useMCPClient';
import { useMCPTools } from '../hooks/useMCPTools';
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
  Divider,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  List,
  ListItem,
  ListItemText,
  ListItemButton
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  Chat as ChatIcon,
  Build as BuildIcon,
  Send as SendIcon,
  Close as CloseIcon,
  Extension as ExtensionIcon,
  Settings as SettingsIcon,
  ExpandMore as ExpandMoreIcon,
  Security as SecurityIcon,
  Search as SearchIcon,
  QuestionMark as QuestionMarkIcon
} from '@mui/icons-material';

interface ToolInfo {
  name: string;
  display_name: string;
  description: string;
  category: string;
  schema: {
    type: string;
    properties: Record<string, any>;
    required?: string[];
  };
}

interface InvestigationPrompt {
  id: string;
  title: string;
  description: string;
  prompt: string;
}

interface SimpleChatMessage {
  id: string;
  content: string;
  sender: 'user' | 'assistant' | 'system';
  timestamp: Date;
}

interface CategorizedTools {
  olorin_tools: ToolInfo[];
  mcp_tools: ToolInfo[];
}

/**
 * Main MCP Client page component that provides access to MCP tools and chat interface
 */
const MCPPage: React.FC = () => {
  const { client, isConnected, error: connectionError } = useMCPClient();
  const { executeTool, isExecuting } = useMCPTools();
  const theme = useTheme();
  
  // Data state
  const [categorizedTools, setCategorizedTools] = useState<CategorizedTools>({ olorin_tools: [], mcp_tools: [] });
  const [investigationPrompts, setInvestigationPrompts] = useState<InvestigationPrompt[]>([]);
  const [loadingPrompts, setLoadingPrompts] = useState(false);
  
  // UI state
  const [selectedTool, setSelectedTool] = useState<ToolInfo | null>(null);
  const [toolArgs, setToolArgs] = useState<Record<string, any>>({});
  const [messages, setMessages] = useState<SimpleChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<'olorin' | 'mcp' | 'prompts'>('olorin');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPrompt, setSelectedPrompt] = useState<InvestigationPrompt | null>(null);
  const [isChatOpen, setIsChatOpen] = useState(true);
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const [toolsSectionHeight, setToolsSectionHeight] = useState(400);
  
  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef(false);
  const splitterRef = useRef<HTMLDivElement>(null);

  // Load categorized tools and prompts
  useEffect(() => {
    const loadCategorizedData = async () => {
      try {
        // Load categorized tools - use the MCP endpoint that includes schema info
        const toolsResponse = await fetch('/api/mcp/tools/categories');
        if (toolsResponse.ok) {
          const toolsData = await toolsResponse.json();
          setCategorizedTools(toolsData);
        }

        // Load investigation prompts
        setLoadingPrompts(true);
        const promptsResponse = await fetch('/api/mcp/prompts');
        if (promptsResponse.ok) {
          const promptsData = await promptsResponse.json();
          setInvestigationPrompts(promptsData);
        }
      } catch (error) {
        console.error('Failed to load categorized data:', error);
      } finally {
        setLoadingPrompts(false);
      }
    };

    if (isConnected) {
      loadCategorizedData();
    }
  }, [isConnected]);

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
  const handleToolExecution = async (tool: ToolInfo, args: Record<string, any>) => {
    try {
      const result = await executeTool({
        name: tool.name,
        arguments: args
      });
      
      const newMessage: SimpleChatMessage = {
        id: Date.now().toString(),
        content: `Executed ${tool.name}: ${JSON.stringify(result, null, 2)}`,
        sender: 'assistant',
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, newMessage]);
      setSelectedTool(null);
      setToolArgs({});
    } catch (error) {
      console.error('Tool execution failed:', error);
      const errorMessage: SimpleChatMessage = {
        id: Date.now().toString(),
        content: `Error executing ${tool.name}: ${error}`,
        sender: 'system',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    }
  };

  // Handle sending a prompt
  const handleSendPrompt = (prompt: string) => {
    setInputMessage(prompt);
    // Auto-send the prompt
    handleSendMessage(prompt);
  };

  // Handle chat message sending
  const handleSendMessage = async (messageText?: string) => {
    const textToSend = messageText || inputMessage;
    if (!textToSend.trim() || isSendingMessage) return;

    const userMessage: SimpleChatMessage = {
      id: Date.now().toString(),
      content: textToSend,
      sender: 'user',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsSendingMessage(true);

    // Simple response - in a real implementation, this would integrate with an AI service
    try {
      const assistantMessage: SimpleChatMessage = {
        id: (Date.now() + 1).toString(),
        content: `I received your message: "${textToSend}". This is a placeholder response. In a real implementation, this would connect to an AI service.`,
        sender: 'assistant',
        timestamp: new Date()
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

  const renderToolCard = (tool: ToolInfo, isOlorinTool: boolean = false) => (
    <Card 
      key={tool.name} 
      sx={{ 
        mb: 2,
        border: isOlorinTool ? '2px solid' : '1px solid',
        borderColor: isOlorinTool ? 'primary.main' : 'divider',
        backgroundColor: isOlorinTool ? 'primary.25' : 'background.paper',
        '&:hover': { 
          boxShadow: isOlorinTool ? '0 6px 16px rgba(147, 51, 234, 0.25)' : '0 4px 12px rgba(147, 51, 234, 0.15)',
          transform: 'translateY(-2px)'
        },
        transition: 'all 0.2s ease-in-out'
      }}
    >
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {isOlorinTool && <SecurityIcon sx={{ color: 'primary.main', fontSize: '1.2rem' }} />}
            <Typography variant="h6" sx={{ fontWeight: 600, color: isOlorinTool ? 'primary.main' : 'text.primary' }}>
              {tool.display_name || tool.name.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}
            </Typography>
          </Box>
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
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
          <strong>Tool:</strong> <code>{tool.name}</code>
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {tool.description}
        </Typography>
        
        {tool.schema?.required && Array.isArray(tool.schema.required) && tool.schema.required.length > 0 && (
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
            {tool.schema.required.map((req: string) => (
              <Chip
                key={req}
                label={`${req} *`}
                size="small"
                sx={{ 
                  backgroundColor: isOlorinTool ? 'primary.200' : 'primary.100',
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

  if (isLoading) {
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

  if (connectionError) {
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
              {connectionError}
            </Typography>
          </Alert>
          <Button
            variant="contained"
            startIcon={<RefreshIcon />}
            onClick={() => window.location.reload()}
            sx={{ textTransform: 'none', fontWeight: 600 }}
          >
            Retry Connection
          </Button>
        </Box>
      </Box>
    );
  }

  if (!isConnected) {
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
            onClick={() => window.location.reload()}
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
              Investigation Assistant
            </Typography>
            <Typography variant="body1" color="text.secondary">
              AI-powered investigation interface with specialized Olorin tools for fraud detection
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Button
              variant="outlined"
              startIcon={<SettingsIcon />}
              onClick={() => window.location.reload()}
              sx={{ textTransform: 'none', fontWeight: 600 }}
            >
              Refresh
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
          {/* Olorin Investigation Tools */}
          <Alert severity="info" sx={{ mb: 3, backgroundColor: 'primary.50', borderColor: 'primary.200' }}>
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 1, color: 'primary.main' }}>
              🔍 Olorin Investigation Tools
            </Typography>
            <Typography variant="body2" color="text.secondary">
              These specialized tools are designed for fraud investigation and security analysis. Use them to analyze user behavior, device patterns, network activity, and more.
            </Typography>
          </Alert>
          
          {categorizedTools.olorin_tools.map(tool => renderToolCard(tool, true))}

          {/* Standard MCP Tools */}
          <Typography variant="h5" sx={{ fontWeight: 600, mb: 2, mt: 4, color: 'text.primary' }}>
            🛠️ Standard MCP Tools ({categorizedTools.mcp_tools.length})
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            General-purpose tools for web search, file operations, API calls, and data processing.
          </Typography>
          
          {categorizedTools.mcp_tools.map(tool => renderToolCard(tool, false))}

          {/* Selected Tool Details */}
          {selectedTool && (
            <Paper sx={{ p: 3, mt: 3, backgroundColor: 'primary.50' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6" sx={{ fontWeight: 600, color: 'primary.main' }}>
                  Execute: {selectedTool.display_name || selectedTool.name.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}
                </Typography>
                <IconButton
                  onClick={() => setSelectedTool(null)}
                  sx={{ color: 'primary.main' }}
                >
                  <CloseIcon />
                </IconButton>
              </Box>
              
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                <strong>Tool:</strong> <code>{selectedTool.name}</code>
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                {selectedTool.description}
              </Typography>

              {selectedTool.schema?.required && Array.isArray(selectedTool.schema.required) && selectedTool.schema.required.length > 0 && (
                <Box sx={{ mb: 3 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 2 }}>
                    Required Parameters:
                  </Typography>
                  {selectedTool.schema.required.map((param: string) => (
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
                  Investigation Assistant
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
                      backgroundColor: message.sender === 'user' ? 'primary.50' : 'white',
                      border: message.sender === 'user' ? '1px solid' : 'none',
                      borderColor: 'primary.200'
                    }}>
                      <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
                        {message.sender === 'user' ? 'You' : 'Assistant'}
                      </Typography>
                      <Typography variant="body2">
                        {message.content}
                      </Typography>
                    </Paper>
                  </Box>
                ))}
              </Box>

              {/* Input */}
              <Box sx={{ p: 2, borderTop: 1, borderColor: 'divider' }}>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <TextField
                    fullWidth
                    placeholder="Ask me to investigate suspicious activity..."
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                    disabled={isSendingMessage}
                    size="small"
                  />
                  <IconButton
                    onClick={() => handleSendMessage()}
                    disabled={isSendingMessage || !inputMessage.trim()}
                    sx={{ color: 'primary.main' }}
                  >
                    <SendIcon />
                  </IconButton>
                </Box>
              </Box>

              {/* Investigation Prompts */}
              <Box sx={{ p: 2, borderTop: 1, borderColor: 'divider', backgroundColor: 'background.paper' }}>
                <Accordion>
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <QuestionMarkIcon sx={{ color: 'primary.main', fontSize: '1.2rem' }} />
                      <Typography variant="h6" sx={{ fontWeight: 600 }}>
                        Investigation Prompts
                      </Typography>
                    </Box>
                  </AccordionSummary>
                  <AccordionDetails sx={{ p: 0 }}>
                    {loadingPrompts ? (
                      <Box sx={{ p: 2, textAlign: 'center' }}>
                        <LinearProgress sx={{ mb: 1 }} />
                        <Typography variant="body2" color="text.secondary">
                          Loading prompts...
                        </Typography>
                      </Box>
                    ) : (
                      <List dense>
                        {investigationPrompts.map((prompt, index) => (
                          <ListItem key={index} disablePadding>
                            <ListItemButton 
                              onClick={() => handleSendPrompt(prompt.prompt)}
                              sx={{ 
                                '&:hover': { backgroundColor: 'primary.25' }
                              }}
                            >
                              <ListItemText
                                primary={prompt.title}
                                secondary={prompt.description}
                                primaryTypographyProps={{ 
                                  variant: 'body2', 
                                  fontWeight: 600,
                                  color: 'primary.main'
                                }}
                                secondaryTypographyProps={{ 
                                  variant: 'caption',
                                  color: 'text.secondary'
                                }}
                              />
                            </ListItemButton>
                          </ListItem>
                        ))}
                      </List>
                    )}
                  </AccordionDetails>
                </Accordion>
              </Box>
            </Box>
          </>
        )}
      </Box>
    </Box>
  );
};

export default MCPPage; 