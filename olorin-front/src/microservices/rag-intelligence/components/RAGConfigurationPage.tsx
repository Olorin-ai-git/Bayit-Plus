import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@shared/components/ui/tabs';
import { toast } from 'react-hot-toast';
import { Settings, MessageSquare, Database, FileText } from 'lucide-react';
import ChatInterface from './chat/ChatInterface';
import FieldMappingForm from './forms/FieldMappingForm';
import PreparedPromptsManager from './forms/PreparedPromptsManager';
import { FieldMapping, RexPattern, EvalCommand, PreparedPrompt } from '../types/ragIntelligence';
import { RAGApiService } from '@shared/services/RAGApiService';

interface RAGConfigurationPageProps {
  className?: string;
}

const RAGConfigurationPage: React.FC<RAGConfigurationPageProps> = ({ className = "" }) => {
  // State management
  const [activeTab, setActiveTab] = useState('chat');
  const [isLoading, setIsLoading] = useState(false);

  // Configuration states
  const [fieldMappings, setFieldMappings] = useState<FieldMapping[]>([]);
  const [rexPatterns, setRexPatterns] = useState<RexPattern[]>([]);
  const [evalCommands, setEvalCommands] = useState<EvalCommand[]>([]);
  const [preparedPrompts, setPreparedPrompts] = useState<PreparedPrompt[]>([]);

  // Initialize RAG service
  const ragService = useMemo(() => new RAGApiService(null), []);

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
      toast.success('Field mapping added successfully');
    } catch (error) {
      console.error('Failed to add field mapping:', error);
      toast.error('Failed to add field mapping');
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
      toast.success('Rex pattern added successfully');
    } catch (error) {
      console.error('Failed to add rex pattern:', error);
      toast.error('Failed to add rex pattern');
    }
  }, [ragService, loadFieldMappings]);

  const handleAddEvalCommand = useCallback(async (command: string) => {
    try {
      await ragService.addEvalCommand({
        command,
        user_id: 'demo-user',
      });

      await loadFieldMappings();
      toast.success('Eval command added successfully');
    } catch (error) {
      console.error('Failed to add eval command:', error);
      toast.error('Failed to add eval command');
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
      toast.success('Prompt created successfully');
    } catch (error) {
      console.error('Failed to create prompt:', error);
      toast.error('Failed to create prompt');
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
      toast.success('Prompt updated successfully');
    } catch (error) {
      console.error('Failed to update prompt:', error);
      toast.error('Failed to update prompt');
    }
  }, []);

  const handleDeletePrompt = useCallback(async (id: string) => {
    try {
      setPreparedPrompts(prev => prev.filter(prompt => prompt.id !== id));
      toast.success('Prompt deleted successfully');
    } catch (error) {
      console.error('Failed to delete prompt:', error);
      toast.error('Failed to delete prompt');
    }
  }, []);

  const handleApplyPrompt = useCallback((prompt: PreparedPrompt) => {
    // Switch to chat tab and apply the prompt
    setActiveTab('chat');
    // This would ideally be handled by the ChatInterface component
    toast.success(`Applied prompt: ${prompt.title}`);
  }, []);

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
    <div className={`h-full bg-gray-50 ${className}`}>
      <div className="h-full flex flex-col">
        {/* Header */}
        <div className="flex-shrink-0 bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                RAG Intelligence Service
              </h1>
              <p className="text-gray-600 mt-1">
                Retrieval-Augmented Generation with intelligent data processing
              </p>
            </div>

            <div className="flex items-center space-x-2">
              <div className={`
                flex items-center space-x-2 px-3 py-1.5 rounded-full text-xs font-medium
                ${isLoading
                  ? 'bg-yellow-100 text-yellow-800'
                  : 'bg-green-100 text-green-800'
                }
              `}>
                <div className={`
                  w-2 h-2 rounded-full
                  ${isLoading ? 'bg-yellow-400 animate-pulse' : 'bg-green-400'}
                `} />
                <span>{isLoading ? 'Loading...' : 'Ready'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex-1 min-h-0">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
            {/* Tab List */}
            <div className="flex-shrink-0 bg-white border-b border-gray-200">
              <TabsList className="w-full justify-start bg-transparent p-0">
                {tabs.map(({ id, label, icon: Icon, description }) => (
                  <TabsTrigger
                    key={id}
                    value={id}
                    className="flex items-center space-x-2 px-6 py-4 text-sm font-medium text-gray-500 hover:text-gray-700 data-[state=active]:text-blue-600 data-[state=active]:border-b-2 data-[state=active]:border-blue-600 rounded-none bg-transparent"
                  >
                    <Icon className="w-4 h-4" />
                    <span>{label}</span>
                  </TabsTrigger>
                ))}
              </TabsList>
            </div>

            {/* Tab Content */}
            <div className="flex-1 min-h-0">
              <TabsContent value="chat" className="h-full p-6 m-0">
                <ChatInterface className="h-full" />
              </TabsContent>

              <TabsContent value="configuration" className="h-full p-6 m-0">
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

              <TabsContent value="prompts" className="h-full p-6 m-0">
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