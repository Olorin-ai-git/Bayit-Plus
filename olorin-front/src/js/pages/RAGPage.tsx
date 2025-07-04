import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Typography,
  Button,
  Paper,
  Card,
  CardContent,
  TextField,
  IconButton,
  Alert,
  Chip,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Table,
  TableContainer,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  Tabs,
  Tab,
  Collapse,
  Switch,
  Tooltip,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Grid,
  Divider,
  Badge,
} from '@mui/material';
import {
  Send as SendIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Settings as SettingsIcon,
  Psychology as PsychologyIcon,
  Code as CodeIcon,
  Storage as StorageIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  ContentCopy as CopyIcon,
  PlayArrow as PlayArrowIcon,
  Refresh as RefreshIcon,
  Help as HelpIcon,
  Search as SearchIcon,
  Close as CloseIcon,
  GetApp as DownloadIcon,
  TableChart as TableIcon,
  Chat as ChatIcon,
  Visibility as ViewIcon,
} from '@mui/icons-material';
import { ResponseAnalyzer } from '../services/ResponseAnalyzer';
import { TableView } from '../components/rag/views/TableView';
import { EnhancedChatMessage, ViewMode } from '../types/EnhancedChatMessage';
import { RAGApiService } from '../services/RAGApiService';

interface FieldMapping {
  category: string;
  fields: string[];
}

interface RexPattern {
  field_name: string;
  pattern: string;
}

interface EvalCommand {
  command: string;
}

// Using EnhancedChatMessage from types instead of local ChatMessage interface

interface PreparedPrompt {
  id: string;
  title: string;
  description: string;
  category: string;
  template: string;
  variables: string[];
  created_at?: string;
  updated_at?: string;
  // Legacy fields for backward compatibility
  prompt?: string;
  example_output?: string;
}

const RAGPage: React.FC = () => {
  // State management
  const [activeTab, setActiveTab] = useState(0);
  const [subTab, setSubTab] = useState<'table' | 'prompts'>('table'); // Add sub-tab state for Data Analysis tab
  const [chatMessages, setChatMessages] = useState<EnhancedChatMessage[]>([]);
  const [currentMessage, setCurrentMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPrompts, setShowPrompts] = useState(false);
  const [fieldMappings, setFieldMappings] = useState<FieldMapping[]>([]);
  const [rexPatterns, setRexPatterns] = useState<RexPattern[]>([]);
  const [evalCommands, setEvalCommands] = useState<EvalCommand[]>([]);
  const [preparedPrompts, setPreparedPrompts] = useState<PreparedPrompt[]>([]);

  // Dialog states
  const [addMappingOpen, setAddMappingOpen] = useState(false);
  const [addRexOpen, setAddRexOpen] = useState(false);
  const [addEvalOpen, setAddEvalOpen] = useState(false);

  // Form states
  const [newCategory, setNewCategory] = useState('');
  const [newFields, setNewFields] = useState('');
  const [newFieldName, setNewFieldName] = useState('');
  const [newPattern, setNewPattern] = useState('');
  const [newEvalCommand, setNewEvalCommand] = useState('');

  // Search and filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [promptsPanelOpen, setPromptsPanelOpen] = useState(false);
  const [globalSearchTerm, setGlobalSearchTerm] = useState(''); // Add global search for table view

  // Sidebar resize states
  const [sidebarWidth, setSidebarWidth] = useState(320); // Default 320px
  const [isResizing, setIsResizing] = useState(false);
  const [resizeStartX, setResizeStartX] = useState(0);
  const [resizeStartWidth, setResizeStartWidth] = useState(0);

  // View control states
  const [expandedMessages, setExpandedMessages] = useState<Set<string>>(
    new Set(),
  );
  const [messageViewModes, setMessageViewModes] = useState<
    Record<string, ViewMode>
  >({});

  // Edit functionality states
  const [editingMessage, setEditingMessage] = useState<string | null>(null);
  const [editedTranslatedQuery, setEditedTranslatedQuery] = useState('');
  const [isResending, setIsResending] = useState(false);

  // Prompt CRUD states
  const [promptEditMode, setPromptEditMode] = useState<string | null>(null);
  const [showCreatePrompt, setShowCreatePrompt] = useState(false);
  const [promptFormData, setPromptFormData] = useState({
    title: '',
    description: '',
    template: '',
    category: '',
    variables: [] as string[],
  });
  const [isPromptLoading, setIsPromptLoading] = useState(false);

  // Initialize RAG service
  const ragService = new RAGApiService(null);

  // Load initial data
  useEffect(() => {
    loadFieldMappings();
    loadPreparedPrompts();
  }, []);

  // Prevent auto-scroll on mount
  useEffect(() => {
    // Scroll to top immediately on mount
    window.scrollTo(0, 0);
    document.body.scrollTop = 0;
    document.documentElement.scrollTop = 0;

    // Prevent any delayed scroll events
    const timer = setTimeout(() => {
      window.scrollTo(0, 0);
    }, 100);

    return () => clearTimeout(timer);
  }, []);

  // Sidebar resize event handlers
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;

      const deltaX = e.clientX - resizeStartX;
      const newWidth = Math.max(250, Math.min(600, resizeStartWidth + deltaX)); // Min 250px, Max 600px
      setSidebarWidth(newWidth);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    if (isResizing) {
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing, resizeStartX, resizeStartWidth]);

  const handleResizeStart = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
    setResizeStartX(e.clientX);
    setResizeStartWidth(sidebarWidth);
  };

  const loadFieldMappings = async () => {
    try {
      const data = await ragService.getFieldMappings();

      // Handle case where API doesn't exist or returns undefined
      if (!data || !data.mappings) {
        console.warn('RAG API not available - field mappings disabled');
        return;
      }

      const mappings = Object.entries(data.mappings.field_mappings || {}).map(
        ([category, fields]) => ({
          category,
          fields: fields as string[],
        }),
      );
      setFieldMappings(mappings);

      const patterns = Object.entries(data.mappings.rex_patterns || {}).map(
        ([field_name, pattern]) => ({
          field_name,
          pattern: pattern as string,
        }),
      );
      setRexPatterns(patterns);

      setEvalCommands(
        (data.mappings.dynamic_eval_commands || []).map((cmd: string) => ({
          command: cmd,
        })),
      );
    } catch (error) {
      console.error('Failed to load field mappings:', error);
      // Set empty arrays as fallback when API is not available
      setFieldMappings([]);
      setRexPatterns([]);
      setEvalCommands([]);
    }
  };

  const loadPreparedPrompts = async () => {
    try {
      const data = await ragService.getPreparedPrompts();

      // Handle case where API doesn't exist or returns undefined
      if (!data || !Array.isArray(data)) {
        console.warn('RAG API not available - prepared prompts disabled');
        return;
      }

      setPreparedPrompts(data);
    } catch (error) {
      console.error('Failed to load prepared prompts:', error);
      // Set empty array as fallback when API is not available
      setPreparedPrompts([]);
    }
  };

  const sendMessage = async () => {
    if (!currentMessage.trim()) return;

    const userMessage: EnhancedChatMessage = {
      id: Date.now().toString(),
      sender: 'user',
      content: currentMessage,
      timestamp: new Date(),
      natural_query: currentMessage,
    };

    setChatMessages((prev) => [...prev, userMessage]);
    setCurrentMessage('');
    setIsLoading(true);

    try {
      // Generate unique investigation ID for this query session
      const investigationId = `rag-query-${Date.now()}`;

      // Use the consolidated natural query endpoint
      const naturalQueryResponse = await ragService.sendNaturalQuery({
        natural_query: currentMessage,
        user_id: 'demo-user',
        auto_index: true, // Automatically index and query in one step
      });

      // Handle case where API doesn't exist or returns undefined
      if (!naturalQueryResponse) {
        const errorMessage: EnhancedChatMessage = {
          id: (Date.now() + 1).toString(),
          sender: 'system',
          content:
            'RAG API is not available. Please configure the RAG endpoints on your server.',
          timestamp: new Date(),
        };
        setChatMessages((prev) => [...prev, errorMessage]);
        return;
      }

      // Extract response content from the API response structure
      let responseContent = 'No response received';

      // Try multiple possible locations for the response content
      if (naturalQueryResponse.additional_data?.response) {
        responseContent = naturalQueryResponse.additional_data.response;
      } else if (naturalQueryResponse.response) {
        responseContent = naturalQueryResponse.response;
      } else if (naturalQueryResponse.message) {
        responseContent = naturalQueryResponse.message;
      } else if (naturalQueryResponse.llm_thoughts) {
        responseContent = naturalQueryResponse.llm_thoughts;
      }

      // Create basic assistant message with enhanced data
      const assistantMessage: EnhancedChatMessage = {
        id: (Date.now() + 1).toString(),
        sender: 'assistant',
        content: responseContent,
        timestamp: new Date(),
        natural_query: currentMessage,
        translated_query: naturalQueryResponse.translated_query || naturalQueryResponse.translation,
        query_metadata: {
          execution_time: naturalQueryResponse.execution_time,
          result_count: naturalQueryResponse.result_count || (naturalQueryResponse.additional_data?.sources?.length || 0),
          sources: naturalQueryResponse.additional_data?.sources || naturalQueryResponse.sources || [],
          confidence: naturalQueryResponse.confidence,
        },
      };

      // Analyze the response for structured data
      const analysisResult = ResponseAnalyzer.analyzeResponse(
        assistantMessage.content,
      );

      // If structured data is detected, enhance the message
      if (analysisResult.hasStructuredData) {
        const enhancedMessage = ResponseAnalyzer.enhanceMessage(
          assistantMessage,
          analysisResult,
        );

        // Set default view mode to table for structured data
        setMessageViewModes((prev) => ({
          ...prev,
          [enhancedMessage.id]: 'table',
        }));

        setChatMessages((prev) => [...prev, enhancedMessage]);
      } else {
        // No structured data, add as regular message
        setChatMessages((prev) => [...prev, assistantMessage]);
      }
    } catch (error) {
      const errorMessage: EnhancedChatMessage = {
        id: (Date.now() + 1).toString(),
        sender: 'system',
        content: `RAG API Error: ${
          error instanceof Error ? error.message : 'Service not available'
        }. Please configure RAG endpoints on your server.`,
        timestamp: new Date(),
      };
      setChatMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const addFieldMapping = async () => {
    if (!newCategory || !newFields) return;

    try {
      await ragService.addFieldMapping({
        category: newCategory,
        fields: newFields.split(',').map((f) => f.trim()),
        user_id: 'demo-user',
        overwrite: false,
      });

      await loadFieldMappings();
      setAddMappingOpen(false);
      setNewCategory('');
      setNewFields('');
    } catch (error) {
      console.error('Failed to add field mapping:', error);
      // Don't crash the UI when API is not available
    }
  };

  const addRexPattern = async () => {
    if (!newFieldName || !newPattern) return;

    try {
      await ragService.addRexPattern({
        field_name: newFieldName,
        pattern: newPattern,
        user_id: 'demo-user',
        overwrite: false,
      });

      await loadFieldMappings();
      setAddRexOpen(false);
      setNewFieldName('');
      setNewPattern('');
    } catch (error) {
      console.error('Failed to add rex pattern:', error);
      // Don't crash the UI when API is not available
    }
  };

  const addEvalCommand = async () => {
    if (!newEvalCommand) return;

    try {
      await ragService.addEvalCommand({
        command: newEvalCommand,
        user_id: 'demo-user',
      });

      await loadFieldMappings();
      setAddEvalOpen(false);
      setNewEvalCommand('');
    } catch (error) {
      console.error('Failed to add eval command:', error);
      // Don't crash the UI when API is not available
    }
  };

  const usePrompt = (prompt: PreparedPrompt) => {
    setCurrentMessage(prompt.template || prompt.prompt || '');
    setActiveTab(0); // Switch to Chat Interface tab to show the populated input
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  // Copy translated query to clipboard
  const copyTranslatedQuery = (message: EnhancedChatMessage) => {
    if (message.translated_query) {
      copyToClipboard(message.translated_query);
    }
  };

  // Start editing a translated query
  const startEditingMessage = (messageId: string, translatedQuery: string) => {
    setEditingMessage(messageId);
    setEditedTranslatedQuery(translatedQuery);
  };

  // Cancel editing
  const cancelEditing = () => {
    setEditingMessage(null);
    setEditedTranslatedQuery('');
  };

  // Resend with edited translated query using the two-step flow
  const resendEditedQuery = async () => {
    if (!editedTranslatedQuery.trim()) return;

    setIsResending(true);

    try {
      // Generate unique investigation ID for this edited query
      const investigationId = `rag-edit-${Date.now()}`;

      // Step 1: Execute and index the edited Splunk query
      const indexResponse = await ragService.indexData({
        user_id: 'demo-user',
        splunk_query: editedTranslatedQuery, // Use the edited query as Splunk query
        max_documents: 100,
      });

      // Check if indexing was successful
      if (!indexResponse) {
        throw new Error('Failed to index edited query');
      }

      // Step 2: Query the newly indexed data with the original natural language intent
      const queryResponse = await ragService.sendTranslatedQuery({
        query: editedTranslatedQuery, // Use the edited query for querying
        user_id: 'demo-user',
        investigation_id: investigationId,
        max_results: 50,
        include_sources: true,
      });

      // Extract response content from the API response structure
      let responseContent = 'No response received';

      // Try multiple possible locations for the response content
      if (queryResponse.additional_data?.response) {
        responseContent = queryResponse.additional_data.response;
      } else if (queryResponse.response) {
        responseContent = queryResponse.response;
      } else if (queryResponse.message) {
        responseContent = queryResponse.message;
      } else if (queryResponse.llm_thoughts) {
        responseContent = queryResponse.llm_thoughts;
      }

      // Create new assistant message with the response
      const assistantMessage: EnhancedChatMessage = {
        id: Date.now().toString(),
        sender: 'assistant',
        content: responseContent,
        timestamp: new Date(),
        natural_query: editedTranslatedQuery,
        translated_query: editedTranslatedQuery,
        query_metadata: {
          execution_time: queryResponse.execution_time,
          result_count: queryResponse.result_count || (queryResponse.additional_data?.sources?.length || 0),
          sources: queryResponse.additional_data?.sources || queryResponse.sources || [],
          confidence: queryResponse.confidence,
        },
      };

      // Analyze the response for structured data
      const analysisResult = ResponseAnalyzer.analyzeResponse(
        assistantMessage.content,
      );

      // If structured data is detected, enhance the message
      if (analysisResult.hasStructuredData) {
        const enhancedMessage = ResponseAnalyzer.enhanceMessage(
          assistantMessage,
          analysisResult,
        );

        setMessageViewModes((prev) => ({
          ...prev,
          [enhancedMessage.id]: 'table',
        }));

        setChatMessages((prev) => [...prev, enhancedMessage]);
      } else {
        setChatMessages((prev) => [...prev, assistantMessage]);
      }

      // Clear editing state
      cancelEditing();
    } catch (error) {
      const errorMessage: EnhancedChatMessage = {
        id: Date.now().toString(),
        sender: 'system',
        content: `Error resending query: ${
          error instanceof Error ? error.message : 'Service not available'
        }`,
        timestamp: new Date(),
      };
      setChatMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsResending(false);
    }
  };

  // Prompt CRUD Functions
  const resetPromptForm = () => {
    setPromptFormData({
      title: '',
      description: '',
      template: '',
      category: '',
      variables: [],
    });
    setPromptEditMode(null);
    setShowCreatePrompt(false);
  };

  const handleCreatePrompt = async () => {
    if (!promptFormData.title.trim() || !promptFormData.template.trim()) return;

    setIsPromptLoading(true);
    try {
      await ragService.createPrompt(promptFormData);
      await loadPreparedPrompts();
      resetPromptForm();
    } catch (error) {
      console.error('Failed to create prompt:', error);
    } finally {
      setIsPromptLoading(false);
    }
  };

  const handleEditPrompt = (prompt: PreparedPrompt) => {
    setPromptFormData({
      title: prompt.title,
      description: prompt.description,
      template: prompt.template || prompt.prompt || '',
      category: prompt.category,
      variables: prompt.variables || [],
    });
    setPromptEditMode(prompt.id);
    setShowCreatePrompt(true);
  };

  const handleUpdatePrompt = async () => {
    if (
      !promptEditMode ||
      !promptFormData.title.trim() ||
      !promptFormData.template.trim()
    )
      return;

    setIsPromptLoading(true);
    try {
      await ragService.updatePrompt(promptEditMode, promptFormData);
      await loadPreparedPrompts();
      resetPromptForm();
    } catch (error) {
      console.error('Failed to update prompt:', error);
    } finally {
      setIsPromptLoading(false);
    }
  };

  const handleDeletePrompt = async (promptId: string) => {
    if (!confirm('Are you sure you want to delete this prompt?')) return;

    setIsPromptLoading(true);
    try {
      await ragService.deletePrompt(promptId);
      await loadPreparedPrompts();
    } catch (error) {
      console.error('Failed to delete prompt:', error);
    } finally {
      setIsPromptLoading(false);
    }
  };

  // Enhanced message management functions
  const toggleMessageExpanded = (messageId: string) => {
    setExpandedMessages((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(messageId)) {
        newSet.delete(messageId);
      } else {
        newSet.add(messageId);
      }
      return newSet;
    });
  };

  const setMessageViewMode = (messageId: string, viewMode: ViewMode) => {
    setMessageViewModes((prev) => ({
      ...prev,
      [messageId]: viewMode,
    }));
  };

  const getAvailableViewModes = (message: EnhancedChatMessage): ViewMode[] => {
    const modes: ViewMode[] = ['chat'];

    if (
      message.structured_data?.data &&
      message.structured_data.data.length > 0
    ) {
      modes.push('table');
    }

    modes.push('raw');
    return modes;
  };

  const getCurrentViewMode = (messageId: string): ViewMode => {
    return messageViewModes[messageId] || 'chat';
  };

  // Demo function to test structured data detection
  const addDemoStructuredData = () => {
    const demoResponses = [
      {
        content: `Here are the recent login attempts:

| User ID | Login Time | IP Address | Location | Status |
|---------|------------|------------|----------|--------|
| user123 | 2024-01-15 10:30:00 | 192.168.1.100 | San Francisco, CA | Success |
| user456 | 2024-01-15 10:35:00 | 10.0.0.50 | New York, NY | Failed |
| user789 | 2024-01-15 10:40:00 | 172.16.0.25 | Austin, TX | Success |
| user123 | 2024-01-15 11:00:00 | 192.168.1.100 | San Francisco, CA | Success |

All login attempts have been analyzed for suspicious activity.`,
        title: 'User Login Analysis (Table Format)',
      },
      {
        content: `Transaction analysis results:

[
  {
    "transaction_id": "txn_001",
    "user_id": "user123",
    "amount": 250.00,
    "currency": "USD",
    "method": "credit_card",
    "status": "completed",
    "risk_score": 0.2,
    "timestamp": "2024-01-15T10:30:00Z"
  },
  {
    "transaction_id": "txn_002", 
    "user_id": "user456",
    "amount": 1500.00,
    "currency": "USD",
    "method": "bank_transfer",
    "status": "pending",
    "risk_score": 0.8,
    "timestamp": "2024-01-15T10:45:00Z"
  },
  {
    "transaction_id": "txn_003",
    "user_id": "user789",
    "amount": 75.50,
    "currency": "USD", 
    "method": "paypal",
    "status": "completed",
    "risk_score": 0.1,
    "timestamp": "2024-01-15T11:00:00Z"
  }
]

High-risk transactions have been flagged for review.`,
        title: 'Transaction Investigation (JSON Format)',
      },
    ];

    const selectedDemo =
      demoResponses[Math.floor(Math.random() * demoResponses.length)];

    const demoMessage: EnhancedChatMessage = {
      id: `demo_${Date.now()}`,
      sender: 'assistant',
      content: selectedDemo.content,
      timestamp: new Date(),
    };

    // Analyze the demo response for structured data
    const analysisResult = ResponseAnalyzer.analyzeResponse(
      demoMessage.content,
    );

    if (analysisResult.hasStructuredData) {
      const enhancedMessage = ResponseAnalyzer.enhanceMessage(
        demoMessage,
        analysisResult,
      );

      // Set default view mode to table for demo
      setMessageViewModes((prev) => ({
        ...prev,
        [enhancedMessage.id]: 'table',
      }));

      setChatMessages((prev) => [...prev, enhancedMessage]);

      // Add a system message explaining the demo
      const explanationMessage: EnhancedChatMessage = {
        id: `demo_explanation_${Date.now()}`,
        sender: 'system',
        content: `🎉 Demo: Added ${selectedDemo.title} - Notice the view mode switcher and export options above!`,
        timestamp: new Date(),
      };
      setChatMessages((prev) => [...prev, explanationMessage]);
    }
  };

  const handleExport = (format: string, messageId?: string, data?: any) => {
    let exportData = data;
    let filename = `rag-export-${new Date().toISOString().split('T')[0]}`;

    // If messageId is provided, export that specific message's structured data
    if (messageId) {
      const message = chatMessages.find((msg) => msg.id === messageId);
      if (message?.structured_data?.data) {
        exportData = message.structured_data.data;
        filename = `rag-structured-data-${messageId}`;
      }
    }

    // If no specific data, export all chat messages
    if (!exportData) {
      exportData = chatMessages;
      filename = 'rag-chat-history';
    }

    if (format === 'csv') {
      if (
        Array.isArray(exportData) &&
        exportData.length > 0 &&
        typeof exportData[0] === 'object'
      ) {
        const csvContent = convertToCSV(exportData);
        downloadFile(csvContent, `${filename}.csv`, 'text/csv');
      } else {
        console.error(
          'Cannot export to CSV: data is not a valid array of objects',
        );
      }
    } else if (format === 'json') {
      const jsonContent = JSON.stringify(exportData, null, 2);
      downloadFile(jsonContent, `${filename}.json`, 'application/json');
    }
  };

  const convertToCSV = (data: Record<string, any>[]): string => {
    if (data.length === 0) return '';

    const headers = Object.keys(data[0]);
    const csvRows = [
      headers.join(','),
      ...data.map((row) =>
        headers
          .map((header) => {
            const value = row[header];
            // Escape commas and quotes
            return typeof value === 'string' &&
              (value.includes(',') || value.includes('"'))
              ? `"${value.replace(/"/g, '""')}"`
              : value;
          })
          .join(','),
      ),
    ];

    return csvRows.join('\n');
  };

  const downloadFile = (
    content: string,
    filename: string,
    contentType: string,
  ) => {
    const blob = new Blob([content], { type: contentType });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  };

  // Create autocomplete options from prompt titles and descriptions
  const autocompleteOptions = preparedPrompts.map((prompt) => ({
    label: prompt.title,
    value: prompt.title,
    description: prompt.description,
  }));

  const filteredPrompts = preparedPrompts.filter((prompt) => {
    const matchesSearch =
      prompt.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      prompt.description.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  const renderChatTab = () => (
    <div className="h-full flex">
      {/* Prepared Prompts Panel - Left Side */}
      <div
        className={`
        transition-all duration-300 ease-in-out
        ${promptsPanelOpen ? 'opacity-100' : 'w-0 opacity-0'}
        overflow-hidden flex-shrink-0 relative
      `}
        style={{
          width: promptsPanelOpen ? `${sidebarWidth}px` : '0px',
        }}
      >
        <div
          className="h-full flex flex-col bg-white border-r"
          style={{ width: `${sidebarWidth}px` }}
        >
          {/* Prompts Header */}
          <div className="bg-gradient-to-r from-purple-600 to-pink-600 text-white p-4 flex-shrink-0">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <StorageIcon className="text-xl" />
                <div>
                  <h3 className="text-lg font-bold">AI Prompts Manager</h3>
                  <p className="text-purple-100 text-xs">
                    {preparedPrompts.length > 0
                      ? `${preparedPrompts.length} prompts available`
                      : 'RAG API not configured'}
                  </p>
                </div>
              </div>
              <IconButton
                size="small"
                onClick={() => setPromptsPanelOpen(false)}
                className="text-white hover:bg-white/20"
              >
                <CloseIcon />
              </IconButton>
            </div>

            {/* CRUD Action Buttons */}
            <div className="flex items-center gap-2">
              <Button
                variant="contained"
                size="small"
                startIcon={<AddIcon />}
                onClick={() => setShowCreatePrompt(true)}
                className="!bg-white/20 !border-white/30 !text-white hover:!bg-white/30 !text-xs flex-1"
              >
                New Prompt
              </Button>
              <Button
                variant="contained"
                size="small"
                startIcon={<RefreshIcon />}
                onClick={loadPreparedPrompts}
                className="!bg-white/20 !border-white/30 !text-white hover:!bg-white/30 !text-xs"
                disabled={isPromptLoading}
              >
                {isPromptLoading ? <CircularProgress size="sm" /> : 'Refresh'}
              </Button>
            </div>
          </div>

          {/* Search */}
          <div className="p-3 bg-white border-b flex-shrink-0">
            <TextField
              placeholder="Search prompts..."
              size="small"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: <SearchIcon className="text-gray-400 mr-2" />,
              }}
              fullWidth
            />
          </div>

          {/* Prompts List - Scrollable */}
          <div className="flex-1 overflow-y-auto p-4 bg-gray-50">
            <div className="space-y-3">
              {filteredPrompts.map((prompt) => (
                <div
                  key={prompt.id}
                  className="bg-white rounded-lg p-4 shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer border border-gray-200 hover:border-purple-200"
                  onClick={() => usePrompt(prompt)}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h4 className="font-semibold text-sm text-gray-800 mb-2">
                        {prompt.title}
                      </h4>
                      <Chip
                        label={prompt.category}
                        size="small"
                        className="bg-purple-100 text-purple-800 text-xs"
                      />
                    </div>
                    <Button
                      variant="contained"
                      size="small"
                      startIcon={<PlayArrowIcon />}
                      onClick={(e) => {
                        e.stopPropagation();
                        usePrompt(prompt);
                      }}
                      className="text-xs bg-purple-600 hover:bg-purple-700 text-white px-3 py-1"
                    >
                      Use
                    </Button>
                  </div>

                  <p className="text-gray-600 text-xs mb-3 leading-relaxed">
                    {prompt.description}
                  </p>

                  <div className="bg-gray-50 p-3 rounded-lg border text-xs">
                    <div
                      className="font-mono text-purple-700 leading-relaxed"
                      title={prompt.template}
                    >
                      {prompt.template}
                    </div>
                  </div>

                  <div className="flex gap-1 mt-3">
                    <IconButton
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation();
                        copyToClipboard(prompt.template);
                      }}
                      title="Copy template"
                      className="text-gray-500 hover:text-purple-600 hover:bg-purple-50"
                    >
                      <CopyIcon className="w-3 h-3" />
                    </IconButton>
                    <IconButton
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEditPrompt(prompt);
                      }}
                      title="Edit prompt"
                      className="text-gray-500 hover:text-blue-600 hover:bg-blue-50"
                    >
                      <EditIcon className="w-3 h-3" />
                    </IconButton>
                    <IconButton
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeletePrompt(prompt.id);
                      }}
                      title="Delete prompt"
                      className="text-gray-500 hover:text-red-600 hover:bg-red-50"
                      disabled={isPromptLoading}
                    >
                      <DeleteIcon className="w-3 h-3" />
                    </IconButton>
                  </div>
                </div>
              ))}

              {filteredPrompts.length === 0 && (
                <div className="text-center py-8">
                  <SearchIcon className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  {preparedPrompts.length === 0 ? (
                    <>
                      <p className="text-gray-500 text-sm font-medium">
                        No prompts available
                      </p>
                      <p className="text-gray-400 text-xs mt-1">
                        Configure RAG API endpoints to load prepared prompts
                      </p>
                    </>
                  ) : (
                    <>
                      <p className="text-gray-500 text-sm">No prompts found</p>
                      <p className="text-gray-400 text-xs">
                        Try a different search term
                      </p>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Resize Splitter */}
        {promptsPanelOpen && (
          <div
            className={`
              absolute right-0 top-0 w-1 h-full cursor-col-resize 
              hover:bg-purple-400 transition-colors duration-200
              ${isResizing ? 'bg-purple-500' : 'bg-gray-300'}
            `}
            onMouseDown={handleResizeStart}
            title="Drag to resize sidebar"
          >
            <div className="w-full h-full flex items-center justify-center">
              <div className="w-0.5 h-8 bg-gray-400 rounded-full opacity-50"></div>
            </div>
          </div>
        )}
      </div>

      {/* Chat Interface - Right Side */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Chat Header - Fixed */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-4 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <PsychologyIcon className="text-2xl" />
              <div>
                <h2 className="text-xl font-bold">Natural Language Query</h2>
                <p className="text-blue-100 text-sm">
                  Ask questions in plain English about your data
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {!promptsPanelOpen && (
                <Button
                  variant="contained"
                  size="small"
                  startIcon={<StorageIcon />}
                  onClick={() => setPromptsPanelOpen(true)}
                  className="!bg-transparent !border-white !text-white hover:!bg-white/20 !border-2"
                >
                  Show Prompts
                </Button>
              )}
              <Button
                variant="contained"
                size="small"
                startIcon={<TableIcon />}
                onClick={addDemoStructuredData}
                className="!bg-transparent !border-white !text-white hover:!bg-white/20 !border-2"
                title="Add demo structured data to test table view"
              >
                Demo Data
              </Button>
            </div>
          </div>
        </div>

        {/* Chat Input - Fixed */}
        <div className="p-4 bg-white border-b flex-shrink-0">
          <div className="flex gap-2">
            <TextField
              fullWidth
              multiline
              maxRows={3}
              value={currentMessage}
              onChange={(e) => setCurrentMessage(e.target.value)}
              placeholder="Ask a question about your data..."
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage();
                }
              }}
              className="flex-1"
            />
            <Button
              variant="contained"
              onClick={sendMessage}
              disabled={!currentMessage.trim() || isLoading}
              className="h-14"
            >
              <SendIcon />
            </Button>
          </div>
        </div>

        {/* Chat Messages - Scrollable */}
        <div className="flex-1 overflow-y-auto bg-gray-50">
          <div className="p-6 space-y-6">
            {chatMessages.length === 0 && (
              <div className="text-center py-16">
                <div className="bg-white rounded-full p-6 w-24 h-24 mx-auto mb-6 shadow-sm">
                  <PsychologyIcon className="w-12 h-12 text-blue-500 mx-auto" />
                </div>
                <h3 className="text-xl font-semibold text-gray-700 mb-3">
                  Start a Conversation
                </h3>
                <p className="text-gray-500 max-w-md mx-auto">
                  Ask questions about your data in natural language. Try the
                  Demo Data button to see structured data visualization in
                  action.
                </p>
              </div>
            )}

            {chatMessages.map((message) => {
              // Check if this message should use full width - for any structured data message
              const useFullWidth =
                message.structured_data && message.sender === 'assistant';

              return (
                <div
                  key={message.id}
                  className={`flex ${
                    message.sender === 'user' ? 'justify-end' : 'justify-start'
                  } ${useFullWidth ? '-mx-6' : ''}`}
                >
                  <div
                    className={`rounded-lg shadow-sm ${
                      // For any structured data message, use full width
                      useFullWidth ? 'w-full mx-6' : 'max-w-[85%]'
                    } ${
                      message.sender === 'user'
                        ? 'bg-blue-600 text-white'
                        : message.sender === 'system'
                        ? 'bg-red-50 text-red-800 border border-red-200'
                        : 'bg-white border border-gray-200'
                    }`}
                  >
                    {/* Message Header for Assistant Messages */}
                    {message.sender === 'assistant' && (
                      <div className="flex items-center justify-between p-4 border-b bg-gray-50 rounded-t-lg">
                        <div className="flex items-center gap-3">
                          <div className="bg-blue-100 p-2 rounded-full">
                            <PsychologyIcon className="w-4 h-4 text-blue-600" />
                          </div>
                          <div>
                            <span className="text-sm font-semibold text-gray-800">
                              Investigate With AI
                            </span>
                            {message.structured_data && (
                              <div className="flex items-center gap-1 mt-1">
                                <Chip
                                  label={`${message.structured_data.data.length} records`}
                                  size="small"
                                  color="success"
                                  className="text-xs"
                                />
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          {/* View Mode Selector */}
                          {getAvailableViewModes(message).length > 1 && (
                            <div className="flex bg-gray-200 rounded-lg p-1">
                              {getAvailableViewModes(message).map((mode) => (
                                <button
                                  key={mode}
                                  onClick={() =>
                                    setMessageViewMode(message.id, mode)
                                  }
                                  className={`px-3 py-1 text-xs rounded-md transition-colors flex items-center gap-1 ${
                                    getCurrentViewMode(message.id) === mode
                                      ? 'bg-white text-blue-600 shadow-sm font-medium'
                                      : 'text-gray-600 hover:text-blue-600 hover:bg-gray-100'
                                  }`}
                                >
                                  {mode === 'chat' && (
                                    <ChatIcon className="w-3 h-3" />
                                  )}
                                  {mode === 'table' && (
                                    <TableIcon className="w-3 h-3" />
                                  )}
                                  {mode === 'raw' && (
                                    <CodeIcon className="w-3 h-3" />
                                  )}
                                  <span className="capitalize">{mode}</span>
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Message Content Based on View Mode */}
                    <div
                      className={message.sender === 'assistant' ? 'p-6' : 'p-4'}
                    >
                      {message.sender === 'assistant' ? (
                        <>
                          {/* Render based on current view mode */}
                          {getCurrentViewMode(message.id) === 'table' &&
                          message.structured_data ? (
                            <div className="space-y-4">
                              {/* Table View */}
                              <TableView
                                message={message}
                                onExport={(format) =>
                                  handleExport(format, message.id)
                                }
                                className="shadow-sm"
                              />

                              {/* Show original response in collapsible section */}
                              <div className="border-t pt-4">
                                <button
                                  onClick={() =>
                                    toggleMessageExpanded(message.id)
                                  }
                                  className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-800 transition-colors font-medium"
                                >
                                  {expandedMessages.has(message.id) ? (
                                    <ExpandLessIcon className="w-4 h-4" />
                                  ) : (
                                    <ExpandMoreIcon className="w-4 h-4" />
                                  )}
                                  {expandedMessages.has(message.id)
                                    ? 'Hide'
                                    : 'Show'}{' '}
                                  Original Response
                                </button>

                                <Collapse in={expandedMessages.has(message.id)}>
                                  <div className="mt-3 p-4 bg-gray-50 rounded-lg border">
                                    <div className="whitespace-pre-wrap text-sm text-gray-700 leading-relaxed">
                                      {message.content}
                                    </div>
                                  </div>
                                </Collapse>
                              </div>
                            </div>
                          ) : getCurrentViewMode(message.id) === 'raw' ? (
                            <div className="space-y-3">
                              <div className="flex items-center justify-between">
                                <div className="text-sm font-medium text-gray-700">
                                  Raw Message Data
                                </div>
                                <Button
                                  variant="text"
                                  size="small"
                                  startIcon={<CopyIcon />}
                                  onClick={() => copyToClipboard(JSON.stringify(message, null, 2))}
                                  className="text-xs"
                                >
                                  Copy
                                </Button>
                              </div>
                              <pre className="mt-2 p-3 bg-gray-50 rounded text-xs overflow-auto max-h-48 whitespace-pre-wrap">
                                {JSON.stringify(message, null, 2)}
                              </pre>
                            </div>
                          ) : (
                            <div className="space-y-4">
                              {/* Enhanced Chat View - Better formatting for structured data */}
                              {message.structured_data ? (
                                <div className="space-y-4">
                                  {/* Show that this has structured data */}
                                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                    <div className="flex items-center gap-2 text-blue-800 text-sm font-medium mb-2">
                                      <TableIcon className="w-4 h-4" />
                                      Structured Data Detected
                                    </div>
                                    <p className="text-blue-700 text-sm">
                                      Switch to <strong>Table view</strong>{' '}
                                      above for better visualization with
                                      sorting, filtering, and export options.
                                    </p>
                                  </div>

                                  {/* Improved text presentation */}
                                  <div className="prose prose-sm max-w-none">
                                    <div className="whitespace-pre-wrap text-gray-800 leading-relaxed font-mono text-sm bg-gray-50 p-4 rounded-lg border">
                                      {message.content}
                                    </div>
                                  </div>

                                  {/* Quick preview of data if available */}
                                  {message.structured_data.data &&
                                    message.structured_data.data.length > 0 && (
                                      <div className="bg-gray-50 border rounded-lg p-4">
                                        <div className="text-sm font-medium text-gray-700 mb-2">
                                          📊 Data Summary:{' '}
                                          {message.structured_data.data.length}{' '}
                                          records found
                                        </div>
                                        <div className="text-xs text-gray-600 bg-white p-2 rounded border">
                                          <strong>Columns:</strong>{' '}
                                          {Object.keys(
                                            message.structured_data.data[0] ||
                                              {},
                                          ).join(' • ')}
                                        </div>
                                      </div>
                                    )}
                                </div>
                              ) : (
                                <div className="prose prose-sm max-w-none">
                                  <div className="whitespace-pre-wrap text-gray-800 leading-relaxed">
                                    {message.content}
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </>
                      ) : (
                        <div className="whitespace-pre-wrap leading-relaxed">
                          {message.content}
                        </div>
                      )}

                      {/* Sources */}
                      {message.query_metadata?.sources && message.query_metadata.sources.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-gray-200">
                          <div className="text-sm font-medium mb-2">
                            Sources:
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {message.query_metadata.sources.map((source, idx) => (
                              <Chip
                                key={idx}
                                label={source}
                                size="small"
                                className="text-xs bg-blue-100 text-blue-800"
                              />
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}

            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-white shadow-sm border rounded-lg p-4 flex items-center gap-3">
                  <CircularProgress size="sm" />
                  <span className="text-gray-600">
                    Processing your query...
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Edit Query Modal */}
        {editingMessage && (
          <div className="border-t bg-gray-50 p-4">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-800">
                  Edit and Resend Query
                </h3>
                <Button
                  variant="outlined"
                  size="small"
                  onClick={cancelEditing}
                  startIcon={<CloseIcon />}
                >
                  Cancel
                </Button>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">
                  Translated Query:
                </label>
                <TextField
                  value={editedTranslatedQuery}
                  onChange={(e) => setEditedTranslatedQuery(e.target.value)}
                  placeholder="Edit the translated query..."
                  multiline
                  rows={4}
                  fullWidth
                  className="font-mono text-sm"
                />
              </div>

              <div className="flex items-center gap-3">
                <Button
                  variant="contained"
                  onClick={resendEditedQuery}
                  disabled={!editedTranslatedQuery.trim() || isResending}
                  startIcon={
                    isResending ? <CircularProgress size="sm" /> : <SendIcon />
                  }
                >
                  {isResending ? 'Resending...' : 'Resend Query'}
                </Button>
                <Button variant="outlined" onClick={cancelEditing}>
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  const renderMappingsTab = () => (
    <div className="h-full flex flex-col">
      {/* Header - Fixed */}
      <div className="bg-gradient-to-r from-green-600 to-teal-600 text-white p-6 flex-shrink-0 rounded-t-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <SettingsIcon className="text-2xl" />
            <div>
              <h2 className="text-xl font-bold">Field Mappings Management</h2>
              <p className="text-green-100 text-sm">
                Configure how natural language queries are translated
              </p>
            </div>
          </div>
          <Button
            variant="contained"
            color="secondary"
            startIcon={<RefreshIcon />}
            onClick={loadFieldMappings}
            className="!bg-white !text-green-600 hover:!bg-gray-100 !font-semibold"
          >
            Refresh
          </Button>
        </div>
      </div>

      {/* Content - Scrollable */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-6 space-y-6">
          {/* Field Mappings */}
          <Card>
            <CardContent>
              <div className="flex items-center justify-between mb-4">
                <Typography variant="h6" className="flex items-center gap-2">
                  <StorageIcon />
                  Field Categories
                </Typography>
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={() => setAddMappingOpen(true)}
                >
                  Add Category
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {fieldMappings.map((mapping) => (
                  <div
                    key={mapping.category}
                    className="border rounded-lg p-4 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-semibold text-lg capitalize">
                        {mapping.category}
                      </h4>
                      <Chip size="small" label={mapping.fields.length.toString()} />
                    </div>
                    <div className="space-y-1">
                      {mapping.fields.map((field) => (
                        <div
                          key={field}
                          className="text-sm bg-gray-100 px-2 py-1 rounded"
                        >
                          {field}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Rex Patterns */}
          <Card>
            <CardContent>
              <div className="flex items-center justify-between mb-4">
                <Typography variant="h6" className="flex items-center gap-2">
                  <CodeIcon />
                  Rex Patterns
                </Typography>
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={() => setAddRexOpen(true)}
                >
                  Add Pattern
                </Button>
              </div>

              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Field Name</TableCell>
                      <TableCell>Pattern</TableCell>
                      <TableCell>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {rexPatterns.map((pattern, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-mono">
                          {pattern.field_name}
                        </TableCell>
                        <TableCell className="font-mono text-sm max-w-md">
                          <div className="truncate" title={pattern.pattern}>
                            {pattern.pattern}
                          </div>
                        </TableCell>
                        <TableCell>
                          <IconButton
                            size="small"
                            onClick={() => copyToClipboard(pattern.pattern)}
                            title="Copy pattern"
                          >
                            <CopyIcon />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>

          {/* Eval Commands */}
          <Card>
            <CardContent>
              <div className="flex items-center justify-between mb-4">
                <Typography variant="h6" className="flex items-center gap-2">
                  <CodeIcon />
                  Eval Commands
                </Typography>
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={() => setAddEvalOpen(true)}
                >
                  Add Command
                </Button>
              </div>

              <div className="space-y-2">
                {evalCommands.map((cmd, index) => (
                  <div
                    key={index}
                    className="bg-gray-50 p-3 rounded-lg font-mono text-sm flex items-center justify-between"
                  >
                    <span>{cmd.command}</span>
                    <IconButton
                      size="small"
                      onClick={() => copyToClipboard(cmd.command)}
                      title="Copy command"
                    >
                      <CopyIcon />
                    </IconButton>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );

  // Enhanced Data Analysis Tab with Table and Prompts functionality
  const renderDataAnalysisTab = () => (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-6 flex-shrink-0">
        <div className="flex items-center gap-3">
          <TableIcon className="text-2xl" />
          <div>
            <h2 className="text-xl font-bold">Data Analysis & Visualization</h2>
            <p className="text-blue-100 text-sm">
              Interactive tables, charts, and data exploration tools
            </p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">{renderTablePanel()}</div>
    </div>
  );

  // Global Table View Panel
  const renderTablePanel = () => {
    // Aggregate all structured data from chat messages
    const allStructuredData = chatMessages
      .filter((msg) => msg.structured_data?.data && msg.sender === 'assistant')
      .map((msg, index) => ({
        messageId: msg.id,
        timestamp: msg.timestamp,
        data: msg.structured_data!.data!,
        source: msg.content.substring(0, 100) + '...',
        confidence: msg.structured_data!.metadata?.confidence || 0,
        format: 'structured_data',
        index: index + 1,
      }));

    const filteredData = allStructuredData.filter((item) => {
      if (!globalSearchTerm) return true;
      return (
        item.source.toLowerCase().includes(globalSearchTerm.toLowerCase()) ||
        item.format.toLowerCase().includes(globalSearchTerm.toLowerCase())
      );
    });

    return (
      <div className="space-y-6 p-6">
        {/* Header with controls */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-6 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <TableIcon className="text-2xl" />
              <div>
                <h2 className="text-xl font-bold">Enhanced Table Analysis</h2>
                <p className="text-indigo-100 text-sm">
                  Global view of all structured data with advanced analysis
                  capabilities
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <TextField
                placeholder="Search across all data..."
                value={globalSearchTerm}
                onChange={(e) => setGlobalSearchTerm(e.target.value)}
                InputProps={{
                  startAdornment: <SearchIcon className="w-4 h-4" />,
                }}
                className="!bg-white/20 !text-white placeholder:!text-indigo-200 !border-white/30"
                size="small"
              />
              <Button
                variant="contained"
                startIcon={<DownloadIcon />}
                onClick={() =>
                  handleExport(
                    'csv',
                    undefined,
                    allStructuredData.flatMap((item) => item.data),
                  )
                }
                className="!bg-white !text-indigo-600 hover:!bg-indigo-50 !font-semibold"
              >
                Export All
              </Button>
            </div>
          </div>
        </div>

        {/* Data Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="bg-blue-100 p-2 rounded-lg">
                  <TableIcon className="text-blue-600 w-5 h-5" />
                </div>
                <div>
                  <Typography variant="h6" className="font-bold">
                    {allStructuredData.length}
                  </Typography>
                  <Typography variant="body2" className="text-gray-600">
                    Data Sources
                  </Typography>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="bg-green-100 p-2 rounded-lg">
                  <StorageIcon className="text-green-600 w-5 h-5" />
                </div>
                <div>
                  <Typography variant="h6" className="font-bold">
                    {allStructuredData.reduce(
                      (total, item) => total + item.data.length,
                      0,
                    )}
                  </Typography>
                  <Typography variant="body2" className="text-gray-600">
                    Total Records
                  </Typography>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="bg-purple-100 p-2 rounded-lg">
                  <ViewIcon className="text-purple-600 w-5 h-5" />
                </div>
                <div>
                  <Typography variant="h6" className="font-bold">
                    {Math.round(
                      (allStructuredData.reduce(
                        (avg, item) => avg + item.confidence,
                        0,
                      ) /
                        allStructuredData.length) *
                        100,
                    ) || 0}
                    %
                  </Typography>
                  <Typography variant="body2" className="text-gray-600">
                    Avg Confidence
                  </Typography>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Individual Data Sets */}
        {filteredData.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <TableIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <Typography variant="h6" className="text-gray-500 mb-2">
                No Structured Data Available
              </Typography>
              <Typography variant="body2" className="text-gray-400 mb-4">
                Send queries that return structured data to see enhanced table
                analysis here
              </Typography>
              <Button
                variant="contained"
                startIcon={<PlayArrowIcon />}
                onClick={addDemoStructuredData}
                className="!bg-indigo-600 hover:!bg-indigo-700"
              >
                Add Demo Data
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {filteredData.map((dataSet) => (
              <Card key={dataSet.messageId}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <Chip
                        label={`Dataset #${dataSet.index}`}
                        size="small"
                        className="!bg-indigo-100 !text-indigo-800 !font-medium"
                      />
                      <Typography variant="h6" className="font-semibold">
                        {dataSet.data.length} Records
                      </Typography>
                      <Chip
                        label={`${Math.round(dataSet.confidence * 100)}% Confidence`}
                        size="small"
                        className={`!font-medium ${
                          dataSet.confidence >= 0.8
                            ? '!bg-green-100 !text-green-800'
                            : dataSet.confidence >= 0.6
                            ? '!bg-yellow-100 !text-yellow-800'
                            : '!bg-red-100 !text-red-800'
                        }`}
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="contained"
                        size="small"
                        startIcon={<DownloadIcon />}
                        onClick={() =>
                          handleExport('csv', dataSet.messageId, dataSet.data)
                        }
                      >
                        Export CSV
                      </Button>
                      <Button
                        variant="contained"
                        size="small"
                        startIcon={<DownloadIcon />}
                        onClick={() =>
                          handleExport('json', dataSet.messageId, dataSet.data)
                        }
                      >
                        Export JSON
                      </Button>
                    </div>
                  </div>

                  <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                    <Typography
                      variant="body2"
                      className="text-gray-600 text-sm"
                    >
                      <strong>Source:</strong> {dataSet.source}
                    </Typography>
                    <Typography
                      variant="body2"
                      className="text-gray-500 text-xs mt-1"
                    >
                      <strong>Format:</strong> {dataSet.format} |{' '}
                      <strong>Detected:</strong>{' '}
                      {dataSet.timestamp.toLocaleString()}
                    </Typography>
                  </div>

                  {/* Enhanced TableView */}
                  <TableView
                    message={
                      chatMessages.find((msg) => msg.id === dataSet.messageId)!
                    }
                    onExport={handleExport}
                  />
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="h-screen bg-gray-100 flex flex-col">
      {/* Page Header - Fixed */}
      <div className="bg-white shadow-sm border-b flex-shrink-0">
        <div className="px-4 py-4">
          <div className="flex items-center gap-4">
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-3 rounded-lg">
              <PsychologyIcon className="text-white text-2xl" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Investigate with AI - The Natural Language way
              </h1>
              <p className="text-gray-600">
                Natural Language Query Interface with AI-powered investigation
                prompts
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs - Fixed */}
      <div className="bg-white border-b flex-shrink-0">
        <Tabs
          value={activeTab}
          onChange={(_, newValue) => setActiveTab(newValue)}
          className="px-4"
        >
          <Tab
            label="Chat Interface"
            icon={<PsychologyIcon />}
            className="!text-gray-700 !font-semibold hover:!text-blue-600 !normal-case !min-h-16 !text-sm"
          />
          <Tab
            label="Field Mappings"
            icon={<SettingsIcon />}
            className="!text-gray-700 !font-semibold hover:!text-blue-600 !normal-case !min-h-16 !text-sm"
          />
          <Tab
            label="Data Analysis"
            icon={<TableIcon />}
            className="!text-gray-700 !font-semibold hover:!text-blue-600 !normal-case !min-h-16 !text-sm"
          />
        </Tabs>
      </div>

      {/* Main Content - Scrollable */}
      <div className="flex-1 overflow-hidden">
        <div className="h-full p-6">
          <Paper elevation={1} className="h-full rounded-lg overflow-hidden">
            {activeTab === 0 && renderChatTab()}
            {activeTab === 1 && renderMappingsTab()}
            {activeTab === 2 && renderDataAnalysisTab()}
          </Paper>
        </div>
      </div>

      {/* Add Field Mapping Dialog */}
      <Dialog
        open={addMappingOpen}
        onClose={() => setAddMappingOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Add Field Mapping</DialogTitle>
        <DialogContent>
          <div className="space-y-4 pt-2">
            <TextField
              fullWidth
              label="Category Name"
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
              placeholder="e.g., payment, fraud_detection"
            />
            <TextField
              fullWidth
              label="Field Names"
              value={newFields}
              onChange={(e) => setNewFields(e.target.value)}
              placeholder="field1, field2, field3"
              helperText="Comma-separated list of field names"
              multiline
              rows={3}
            />
          </div>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddMappingOpen(false)}>Cancel</Button>
          <Button onClick={addFieldMapping} variant="contained">
            Add
          </Button>
        </DialogActions>
      </Dialog>

      {/* Add Rex Pattern Dialog */}
      <Dialog
        open={addRexOpen}
        onClose={() => setAddRexOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Add Rex Pattern</DialogTitle>
        <DialogContent>
          <div className="space-y-4 pt-2">
            <TextField
              fullWidth
              label="Field Name"
              value={newFieldName}
              onChange={(e) => setNewFieldName(e.target.value)}
              placeholder="e.g., payment_id"
            />
            <TextField
              fullWidth
              label="Regex Pattern"
              value={newPattern}
              onChange={(e) => setNewPattern(e.target.value)}
              placeholder="e.g., payment_id=(?P<payment_id>[^\s]+)"
              helperText="Use Python named group syntax"
              multiline
              rows={2}
            />
          </div>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddRexOpen(false)}>Cancel</Button>
          <Button onClick={addRexPattern} variant="contained">
            Add
          </Button>
        </DialogActions>
      </Dialog>

      {/* Add Eval Command Dialog */}
      <Dialog
        open={addEvalOpen}
        onClose={() => setAddEvalOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Add Eval Command</DialogTitle>
        <DialogContent>
          <div className="space-y-4 pt-2">
            <TextField
              fullWidth
              label="Eval Command"
              value={newEvalCommand}
              onChange={(e) => setNewEvalCommand(e.target.value)}
              placeholder="| eval decoded_field=urldecode(original_field)"
              helperText="Complete Splunk eval command"
              multiline
              rows={3}
            />
          </div>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddEvalOpen(false)}>Cancel</Button>
          <Button onClick={addEvalCommand} variant="contained">
            Add
          </Button>
        </DialogActions>
      </Dialog>

      {/* Create/Edit Prompt Dialog */}
      <Dialog
        open={showCreatePrompt}
        onClose={resetPromptForm}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {promptEditMode ? 'Edit Prompt' : 'Create New Prompt'}
        </DialogTitle>
        <DialogContent>
          <div className="space-y-4 pt-2">
            <div className="grid grid-cols-2 gap-4">
              <TextField
                fullWidth
                label="Title"
                value={promptFormData.title}
                onChange={(e) =>
                  setPromptFormData((prev) => ({
                    ...prev,
                    title: e.target.value,
                  }))
                }
                placeholder="e.g., Login Analysis Query"
                required
              />
              <Select
                fullWidth
                label="Category"
                value={promptFormData.category}
                onChange={(e) =>
                  setPromptFormData((prev) => ({
                    ...prev,
                    category: e.target.value,
                  }))
                }
              >
                <MenuItem value="security">Security</MenuItem>
                <MenuItem value="finance">Finance</MenuItem>
                <MenuItem value="device">Device</MenuItem>
                <MenuItem value="location">Location</MenuItem>
                <MenuItem value="general">General</MenuItem>
              </Select>
            </div>

            <TextField
              fullWidth
              label="Description"
              value={promptFormData.description}
              onChange={(e) =>
                setPromptFormData((prev) => ({
                  ...prev,
                  description: e.target.value,
                }))
              }
              placeholder="Brief description of what this prompt does"
              multiline
              rows={2}
              required
            />

            <TextField
              fullWidth
              label="Prompt Query"
              value={promptFormData.template}
              onChange={(e) =>
                setPromptFormData((prev) => ({
                  ...prev,
                  template: e.target.value,
                }))
              }
              placeholder="Enter the natural language query or Splunk command"
              multiline
              rows={4}
              required
            />

            <TextField
              fullWidth
              label="Variables (Optional)"
              value={promptFormData.variables.join(', ')}
              onChange={(e) =>
                setPromptFormData((prev) => ({
                  ...prev,
                  variables: e.target.value
                    .split(',')
                    .map((v) => v.trim())
                    .filter((v) => v),
                }))
              }
              placeholder="user_id, time_range, device_id"
              helperText="Comma-separated list of template variables"
            />
          </div>
        </DialogContent>
        <DialogActions>
          <Button onClick={resetPromptForm} disabled={isPromptLoading}>
            Cancel
          </Button>
          <Button
            onClick={promptEditMode ? handleUpdatePrompt : handleCreatePrompt}
            variant="contained"
            disabled={
              isPromptLoading ||
              !promptFormData.title.trim() ||
              !promptFormData.template.trim()
            }
            startIcon={
              isPromptLoading ? (
                <CircularProgress size="sm" />
              ) : promptEditMode ? (
                <EditIcon />
              ) : (
                <AddIcon />
              )
            }
          >
            {isPromptLoading
              ? 'Saving...'
              : promptEditMode
              ? 'Update'
              : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
};

export default RAGPage;
