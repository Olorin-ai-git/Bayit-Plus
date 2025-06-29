import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  Chip,
  Alert,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  LinearProgress
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  Security as SecurityIcon,
  Build as BuildIcon,
  Extension as ExtensionIcon
} from '@mui/icons-material';
import { mcpClient, MCPTool, MCPToolResult } from '../services/MCPClient';

interface ToolInfo {
  name: string;
  display_name: string;
  description: string;
  category: string;
  schema: any;
}

interface CategorizedTools {
  olorin_tools: ToolInfo[];
  mcp_tools: ToolInfo[];
}

interface MCPToolsPanelProps {
  onToolSelect?: (tool: ToolInfo) => void;
}

const MCPToolsPanel: React.FC<MCPToolsPanelProps> = ({ onToolSelect }) => {
  const [categorizedTools, setCategorizedTools] = useState<CategorizedTools>({ 
    olorin_tools: [], 
    mcp_tools: [] 
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadCategorizedTools();
  }, []);

  const loadCategorizedTools = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/mcp/tools/categories');
      if (!response.ok) {
        throw new Error(`Failed to load tools: ${response.statusText}`);
      }
      
      const data = await response.json();
      setCategorizedTools(data);
    } catch (err) {
      console.error('Error loading categorized tools:', err);
      setError(err instanceof Error ? err.message : 'Failed to load tools');
    } finally {
      setLoading(false);
    }
  };

  const renderToolCard = (tool: ToolInfo, isOlorinTool: boolean = false) => (
    <Card 
      key={tool.name}
      sx={{ 
        mb: 2,
        border: isOlorinTool ? '2px solid' : '1px solid',
        borderColor: isOlorinTool ? 'primary.main' : 'divider',
        backgroundColor: isOlorinTool ? 'primary.50' : 'background.paper',
        cursor: onToolSelect ? 'pointer' : 'default',
        '&:hover': onToolSelect ? { 
          boxShadow: isOlorinTool ? '0 6px 16px rgba(147, 51, 234, 0.25)' : '0 4px 12px rgba(147, 51, 234, 0.15)',
          transform: 'translateY(-2px)'
        } : {},
        transition: 'all 0.2s ease-in-out'
      }}
      onClick={() => onToolSelect?.(tool)}
    >
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'flex-start', mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flex: 1 }}>
            {isOlorinTool && <SecurityIcon sx={{ color: 'primary.main', fontSize: '1.2rem' }} />}
            <Typography variant="h6" sx={{ 
              fontWeight: 600, 
              color: isOlorinTool ? 'primary.main' : 'text.primary',
              fontSize: '1rem'
            }}>
              {tool.display_name}
            </Typography>
          </Box>
          <Chip
            label={isOlorinTool ? 'Investigation' : 'General'}
            size="small"
            sx={{
              backgroundColor: isOlorinTool ? 'primary.200' : 'grey.200',
              color: isOlorinTool ? 'primary.main' : 'text.secondary',
              fontWeight: 600,
              fontSize: '0.7rem'
            }}
          />
        </Box>
        
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
          <strong>Tool:</strong> <code>{tool.name}</code>
        </Typography>
        
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {tool.description || 'No description available'}
        </Typography>

        {/* Required parameters */}
        {tool.schema?.required && Array.isArray(tool.schema.required) && tool.schema.required.length > 0 && (
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
            {tool.schema.required.map((param: string) => (
              <Chip
                key={param}
                label={`${param} *`}
                size="small"
                variant="outlined"
                sx={{ 
                  borderColor: isOlorinTool ? 'primary.main' : 'grey.400',
                  color: isOlorinTool ? 'primary.main' : 'text.secondary',
                  fontSize: '0.7rem'
                }}
              />
            ))}
          </Box>
        )}
      </CardContent>
    </Card>
  );

  if (loading) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <LinearProgress sx={{ mb: 2 }} />
        <Typography variant="body2" color="text.secondary">
          Loading investigation tools...
        </Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
        <Button
          variant="outlined"
          onClick={loadCategorizedTools}
          startIcon={<BuildIcon />}
          sx={{ textTransform: 'none' }}
        >
          Retry Loading
        </Button>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* Olorin Investigation Tools Section */}
      <Alert severity="info" sx={{ mb: 3, backgroundColor: 'primary.50', borderColor: 'primary.200' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
          <SecurityIcon sx={{ color: 'primary.main', fontSize: '1.5rem' }} />
          <Typography variant="h6" sx={{ fontWeight: 700, color: 'primary.main' }}>
            🔍 Olorin Investigation Tools ({categorizedTools.olorin_tools.length})
          </Typography>
        </Box>
        <Typography variant="body2" color="text.secondary">
          Specialized tools for fraud investigation, security analysis, and behavioral pattern detection.
        </Typography>
      </Alert>

      {categorizedTools.olorin_tools.length > 0 ? (
        <Box sx={{ mb: 4 }}>
          {categorizedTools.olorin_tools.map(tool => renderToolCard(tool, true))}
        </Box>
      ) : (
        <Alert severity="warning" sx={{ mb: 4 }}>
          No Olorin investigation tools available. Check server configuration.
        </Alert>
      )}

      {/* Standard MCP Tools Section */}
      <Accordion defaultExpanded={false}>
        <AccordionSummary 
          expandIcon={<ExpandMoreIcon />}
          sx={{ 
            backgroundColor: 'grey.50',
            '&:hover': { backgroundColor: 'grey.100' }
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <ExtensionIcon sx={{ color: 'text.secondary', fontSize: '1.2rem' }} />
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              🛠️ Standard MCP Tools ({categorizedTools.mcp_tools.length})
            </Typography>
          </Box>
        </AccordionSummary>
        <AccordionDetails sx={{ p: 0, pt: 2 }}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3, px: 2 }}>
            General-purpose tools for web search, file operations, API calls, and data processing.
          </Typography>
          
          {categorizedTools.mcp_tools.length > 0 ? (
            <Box sx={{ px: 2 }}>
              {categorizedTools.mcp_tools.map(tool => renderToolCard(tool, false))}
            </Box>
          ) : (
            <Alert severity="info" sx={{ mx: 2 }}>
              No standard MCP tools available.
            </Alert>
          )}
        </AccordionDetails>
      </Accordion>

      {/* Summary */}
      <Box sx={{ mt: 3, p: 2, backgroundColor: 'grey.50', borderRadius: 1 }}>
        <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center' }}>
          Total: {categorizedTools.olorin_tools.length + categorizedTools.mcp_tools.length} tools available
          {onToolSelect && ' • Click any tool to configure and execute'}
        </Typography>
      </Box>
    </Box>
  );
};

export default MCPToolsPanel; 