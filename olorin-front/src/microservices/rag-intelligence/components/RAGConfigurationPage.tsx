import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@shared/components/ui/tabs';
import { useToast } from '@shared/components/ui/ToastProvider';
import { Settings, MessageSquare, Database, FileText, Server } from 'lucide-react';
import ChatInterface from './chat/ChatInterface';
import FieldMappingForm from './forms/FieldMappingForm';
import PreparedPromptsManager from './forms/PreparedPromptsManager';
import DataSourceConfig from './DataSourceConfig';
import { FieldMapping, RexPattern, EvalCommand, PreparedPrompt } from '../types/ragIntelligence';
import RAGApiService from '@shared/services/RAGApiService';

interface RAGConfigurationPageProps {
  className?: string;
}

const RAGConfigurationPage: React.FC<RAGConfigurationPageProps> = ({ className = "" }) => {
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  
  const validTabs = ['chat', 'data-sources', 'configuration', 'prompts'];
  
  // Get initial tab from URL, default to 'chat'
  const getInitialTab = () => {
    const tabFromUrl = searchParams.get('tab') || 'chat';
    return validTabs.includes(tabFromUrl) ? tabFromUrl : 'chat';
  };
  
  // State management
  const [activeTab, setActiveTab] = useState(() => getInitialTab());
  const [isLoading, setIsLoading] = useState(false);

  // Configuration states
  const [fieldMappings, setFieldMappings] = useState<FieldMapping[]>([]);
  const [rexPatterns, setRexPatterns] = useState<RexPattern[]>([]);
  const [evalCommands, setEvalCommands] = useState<EvalCommand[]>([]);
  const [preparedPrompts, setPreparedPrompts] = useState<PreparedPrompt[]>([]);

  // Initialize RAG service (singleton instance)
  const ragService = useMemo(() => RAGApiService, []);

  // Load field mappings and patterns
  const loadFieldMappings = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await ragService.getFieldMappings();

      // Handle case where API doesn't exist or returns undefined
      if (!data || !data.mappings) {
        console.warn('RAG API not available - field mappings disabled');
        setFieldMappings([]);
        setRexPatterns([]);
        setEvalCommands([]);
        return;
      }

      const mappings = Object.entries(data.mappings.field_mappings || {}).map(
        ([category, fields]) => ({
          category,
          fields: fields as string[],
        })
      );
      setFieldMappings(mappings);

      const patterns = Object.entries(data.mappings.rex_patterns || {}).map(
        ([field_name, pattern]) => ({
          field_name,
          pattern: pattern as string,
        })
      );
      setRexPatterns(patterns);

      setEvalCommands(
        (data.mappings.dynamic_eval_commands || []).map((cmd: string) => ({
          command: cmd,
        }))
      );
    } catch (error) {
      console.error('Failed to load field mappings:', error);
      // Set empty arrays as fallback when API is not available
      setFieldMappings([]);
      setRexPatterns([]);
      setEvalCommands([]);
    } finally {
      setIsLoading(false);
    }
  }, [ragService]);

  // Load prepared prompts
  const loadPreparedPrompts = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await ragService.getPreparedPrompts();

      // Handle case where API doesn't exist or returns undefined
      if (!data) {
        console.warn('RAG API not available - prepared prompts disabled');
        setPreparedPrompts([]);
        return;
      }

      // Transform the data to match our interface
      const prompts: PreparedPrompt[] = (data.prompts || []).map((prompt: any) => ({
        id: prompt.id || prompt.title?.toLowerCase().replace(/\s+/g, '_') || Math.random().toString(36).substr(2, 9),
        title: prompt.title || 'Untitled Prompt',
        description: prompt.description || '',
        category: prompt.category || 'general',
        template: prompt.template || prompt.prompt || '',
        variables: prompt.variables || [],
        created_at: prompt.created_at,
        updated_at: prompt.updated_at,
        // Legacy support
        prompt: prompt.prompt,
        example_output: prompt.example_output,
      }));

      setPreparedPrompts(prompts);
    } catch (error) {
      console.error('Failed to load prepared prompts:', error);
      setPreparedPrompts([]);
    } finally {
      setIsLoading(false);
    }
  }, [ragService]);

  // Field mapping handlers
  const handleAddFieldMapping = useCallback(async (category: string, fields: string[]) => {
    try {
      await ragService.addFieldMapping({
        category,
        fields,
        user_id: 'demo-user',
        overwrite: false,
      });

      await loadFieldMappings();
      showToast('success', 'Success', 'Field mapping added successfully');
    } catch (error) {
      console.error('Failed to add field mapping:', error);
      showToast('error', 'Error', 'Failed to add field mapping');
    }
  }, [ragService, loadFieldMappings]);

  const handleAddRexPattern = useCallback(async (fieldName: string, pattern: string) => {
    try {
      await ragService.addRexPattern({
        field_name: fieldName,
        pattern,
        user_id: 'demo-user',
        overwrite: false,
      });

      await loadFieldMappings();
      showToast('success', 'Success', 'Rex pattern added successfully');
    } catch (error) {
      console.error('Failed to add rex pattern:', error);
      showToast('error', 'Error', 'Failed to add rex pattern');
    }
  }, [ragService, loadFieldMappings]);

  const handleAddEvalCommand = useCallback(async (command: string) => {
    try {
      await ragService.addEvalCommand({
        command,
        user_id: 'demo-user',
      });

      await loadFieldMappings();
      showToast('success', 'Success', 'Eval command added successfully');
    } catch (error) {
      console.error('Failed to add eval command:', error);
      showToast('error', 'Error', 'Failed to add eval command');
    }
  }, [ragService, loadFieldMappings]);

  // Prepared prompts handlers
  const handleCreatePrompt = useCallback(async (prompt: Omit<PreparedPrompt, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      const newPrompt: PreparedPrompt = {
        ...prompt,
        id: Math.random().toString(36).substr(2, 9),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      // For now, store locally (in a real app, this would call the API)
      setPreparedPrompts(prev => [...prev, newPrompt]);
      showToast('success', 'Success', 'Prompt created successfully');
    } catch (error) {
      console.error('Failed to create prompt:', error);
      showToast('error', 'Error', 'Failed to create prompt');
    }
  }, []);

  const handleUpdatePrompt = useCallback(async (id: string, updates: Partial<PreparedPrompt>) => {
    try {
      setPreparedPrompts(prev =>
        prev.map(prompt =>
          prompt.id === id
            ? { ...prompt, ...updates, updated_at: new Date().toISOString() }
            : prompt
        )
      );
      showToast('success', 'Success', 'Prompt updated successfully');
    } catch (error) {
      console.error('Failed to update prompt:', error);
      showToast('error', 'Error', 'Failed to update prompt');
    }
  }, []);

  const handleDeletePrompt = useCallback(async (id: string) => {
    try {
      setPreparedPrompts(prev => prev.filter(prompt => prompt.id !== id));
      showToast('success', 'Success', 'Prompt deleted successfully');
    } catch (error) {
      console.error('Failed to delete prompt:', error);
      showToast('error', 'Error', 'Failed to delete prompt');
    }
  }, []);

  const handleApplyPrompt = useCallback((prompt: PreparedPrompt) => {
    // Switch to chat tab and apply the prompt
    const newSearchParams = new URLSearchParams(searchParams);
    newSearchParams.set('tab', 'chat');
    setSearchParams(newSearchParams, { replace: true });
    setActiveTab('chat');
    // This would ideally be handled by the ChatInterface component
    showToast('success', 'Success', `Applied prompt: ${prompt.title}`);
  }, [searchParams, setSearchParams]);

  // Initialize URL with default tab on mount if not present
  useEffect(() => {
    const currentTab = searchParams.get('tab');
    if (!currentTab || !validTabs.includes(currentTab)) {
      const newSearchParams = new URLSearchParams(searchParams);
      newSearchParams.set('tab', 'chat');
      setSearchParams(newSearchParams, { replace: true });
      setActiveTab('chat');
    } else if (currentTab !== activeTab) {
      setActiveTab(currentTab);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run only on mount

  // Sync tab state with URL on URL change (browser back/forward)
  useEffect(() => {
    const tabFromUrl = searchParams.get('tab') || 'chat';
    const validTab = validTabs.includes(tabFromUrl) ? tabFromUrl : 'chat';
    if (validTab !== activeTab) {
      setActiveTab(validTab);
    }
  }, [searchParams, activeTab, validTabs]);

  // Load data on mount
  useEffect(() => {
    loadFieldMappings();
    loadPreparedPrompts();
  }, [loadFieldMappings, loadPreparedPrompts]);

  const tabs = [
    {
      id: 'chat',
      label: 'Chat Interface',
      icon: MessageSquare,
      description: 'Interactive RAG chat with natural language queries'
    },
    {
      id: 'data-sources',
      label: 'Data Sources',
      icon: Server,
      description: 'Configure data sources for RAG queries'
    },
    {
      id: 'configuration',
      label: 'Field Mappings',
      icon: Database,
      description: 'Manage field mappings, patterns, and commands'
    },
    {
      id: 'prompts',
      label: 'Prepared Prompts',
      icon: FileText,
      description: 'Create and manage reusable prompt templates'
    }
  ];

  return (
    <div className={`min-h-screen bg-black ${className}`}>
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Page Title */}
        <h1 className="text-3xl font-bold text-corporate-textPrimary mb-6">
          Knowledge Base
        </h1>

        {/* Status Indicator */}
        <div className="mb-6 flex items-center justify-between">
          <p className="text-corporate-textSecondary">
            Retrieval-Augmented Generation with intelligent data processing
          </p>
          <div className={`
            flex items-center space-x-2 px-3 py-1.5 rounded-full text-xs font-medium border-2
            ${isLoading
              ? 'bg-corporate-warning/20 text-corporate-warning border-corporate-warning/50'
              : 'bg-corporate-success/20 text-corporate-success border-corporate-success/50'
            }
          `}>
            <div className={`
              w-2 h-2 rounded-full
              ${isLoading ? 'bg-corporate-warning animate-pulse' : 'bg-corporate-success'}
            `} />
            <span>{isLoading ? 'Loading...' : 'Ready'}</span>
          </div>
        </div>

        {/* Tabs */}
        <div className="space-y-6">
          <Tabs 
            value={activeTab} 
            onValueChange={(value) => {
              setActiveTab(value);
              const newSearchParams = new URLSearchParams(searchParams);
              newSearchParams.set('tab', value);
              setSearchParams(newSearchParams, { replace: true });
            }} 
            className="w-full"
          >
            {/* Tab List */}
            <div className="flex-shrink-0 bg-black/40 backdrop-blur-md border-2 border-corporate-accentPrimary/40 rounded-lg p-2 mb-6">
              <TabsList className="w-full justify-start bg-transparent p-0">
                {tabs.map(({ id, label, icon: Icon }) => (
                  <TabsTrigger
                    key={id}
                    value={id}
                    className="flex items-center space-x-2 px-4 py-2 text-sm font-medium text-corporate-textSecondary hover:text-corporate-textPrimary data-[state=active]:text-corporate-accentPrimary data-[state=active]:bg-black/50 rounded-md transition-colors"
                  >
                    <Icon className="w-4 h-4" />
                    <span>{label}</span>
                  </TabsTrigger>
                ))}
              </TabsList>
            </div>

            {/* Tab Content */}
            <div>
              <TabsContent value="chat" className="m-0">
                <ChatInterface className="h-full" />
              </TabsContent>

              <TabsContent value="data-sources" className="m-0">
                <DataSourceConfig className="h-full" />
              </TabsContent>

              <TabsContent value="configuration" className="m-0">
                <FieldMappingForm
                  fieldMappings={fieldMappings}
                  rexPatterns={rexPatterns}
                  evalCommands={evalCommands}
                  onAddFieldMapping={handleAddFieldMapping}
                  onAddRexPattern={handleAddRexPattern}
                  onAddEvalCommand={handleAddEvalCommand}
                  isLoading={isLoading}
                  className="h-full"
                />
              </TabsContent>

              <TabsContent value="prompts" className="m-0">
                <PreparedPromptsManager
                  prompts={preparedPrompts}
                  onCreatePrompt={handleCreatePrompt}
                  onUpdatePrompt={handleUpdatePrompt}
                  onDeletePrompt={handleDeletePrompt}
                  onApplyPrompt={handleApplyPrompt}
                  isLoading={isLoading}
                  className="h-full"
                />
              </TabsContent>
            </div>
          </Tabs>
        </div>
      </div>
    </div>
  );
};

export default RAGConfigurationPage;