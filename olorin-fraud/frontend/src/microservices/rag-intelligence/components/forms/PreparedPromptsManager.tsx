import React, { useState, useCallback } from 'react';
import {
  Plus,
  Trash2,
  Edit3,
  Save,
  X,
  Play,
  Copy,
  Search,
  Filter,
  FileText,
  Tag,
  Clock
} from 'lucide-react';
import { PreparedPrompt } from '../../types/ragIntelligence';

interface PreparedPromptsManagerProps {
  prompts: PreparedPrompt[];
  onCreatePrompt: (prompt: Omit<PreparedPrompt, 'id' | 'created_at' | 'updated_at'>) => Promise<void>;
  onUpdatePrompt: (id: string, prompt: Partial<PreparedPrompt>) => Promise<void>;
  onDeletePrompt: (id: string) => Promise<void>;
  onApplyPrompt: (prompt: PreparedPrompt) => void;
  isLoading?: boolean;
  className?: string;
}

const PreparedPromptsManager: React.FC<PreparedPromptsManagerProps> = ({
  prompts,
  onCreatePrompt,
  onUpdatePrompt,
  onDeletePrompt,
  onApplyPrompt,
  isLoading = false,
  className = ""
}) => {
  // State management
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingPrompt, setEditingPrompt] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Form state
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    template: '',
    category: '',
    variables: [] as string[]
  });

  // Get unique categories
  const categories = Array.from(new Set(prompts.map(p => p.category))).filter(Boolean);

  // Filter prompts
  const filteredPrompts = prompts.filter(prompt => {
    const matchesSearch = !searchTerm ||
      prompt.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      prompt.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      prompt.template.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesCategory = selectedCategory === 'all' || prompt.category === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  // Extract variables from template
  const extractVariables = useCallback((template: string): string[] => {
    const variableRegex = /\{\{(\w+)\}\}/g;
    const variables: string[] = [];
    let match;

    while ((match = variableRegex.exec(template)) !== null) {
      if (!variables.includes(match[1])) {
        variables.push(match[1]);
      }
    }

    return variables;
  }, []);

  // Handle form submission
  const handleSubmit = useCallback(async () => {
    if (!formData.title.trim() || !formData.template.trim()) return;

    try {
      const variables = extractVariables(formData.template);

      if (editingPrompt) {
        await onUpdatePrompt(editingPrompt, {
          ...formData,
          variables,
          updated_at: new Date().toISOString()
        });
      } else {
        await onCreatePrompt({
          ...formData,
          variables
        });
      }

      // Reset form
      setFormData({
        title: '',
        description: '',
        template: '',
        category: '',
        variables: []
      });
      setShowCreateDialog(false);
      setEditingPrompt(null);
    } catch (error) {
      console.error('Failed to save prompt:', error);
    }
  }, [formData, editingPrompt, extractVariables, onCreatePrompt, onUpdatePrompt]);

  // Start editing
  const startEdit = useCallback((prompt: PreparedPrompt) => {
    setFormData({
      title: prompt.title,
      description: prompt.description,
      template: prompt.template,
      category: prompt.category,
      variables: prompt.variables
    });
    setEditingPrompt(prompt.id);
    setShowCreateDialog(true);
  }, []);

  // Copy prompt to clipboard
  const copyPrompt = useCallback((template: string) => {
    navigator.clipboard.writeText(template);
  }, []);

  return (
    <div className={`space-y-6 ${className}`}>
      <div className="bg-black/40 backdrop-blur-md border-2 border-corporate-accentPrimary/40 rounded-lg">
        {/* Header */}
        <div className="px-6 py-4 border-b-2 border-corporate-accentPrimary/20">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-corporate-textPrimary">
                Prepared Prompts Library
              </h3>
              <p className="text-sm text-corporate-textSecondary mt-1">
                Manage reusable prompt templates with variable substitution
              </p>
            </div>

            <button
              onClick={() => setShowCreateDialog(true)}
              disabled={isLoading}
              className="px-4 py-2 bg-corporate-accentPrimary/80 text-white rounded-lg hover:bg-corporate-accentPrimary transition-colors flex items-center space-x-2 disabled:opacity-50 border-2 border-corporate-accentPrimary/40"
            >
              <Plus className="w-4 h-4" />
              <span>New Prompt</span>
            </button>
          </div>

          {/* Search and Filter */}
          <div className="flex items-center space-x-4 mt-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-corporate-textTertiary w-4 h-4" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search prompts..."
                className="w-full pl-10 pr-4 py-2 bg-black/40 border-2 border-corporate-borderPrimary/40 rounded-lg text-corporate-textPrimary placeholder-corporate-textTertiary focus:ring-2 focus:ring-corporate-accentPrimary/20 focus:border-corporate-accentPrimary/60 focus:outline-none"
              />
            </div>

            <div className="flex items-center space-x-2">
              <Filter className="w-4 h-4 text-corporate-textTertiary" />
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="bg-black/40 border-2 border-corporate-borderPrimary/40 rounded-lg px-3 py-2 text-corporate-textPrimary focus:ring-2 focus:ring-corporate-accentPrimary/20 focus:border-corporate-accentPrimary/60 focus:outline-none"
              >
                <option value="all">All Categories</option>
                {categories.map(category => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Prompts List */}
        <div className="p-6">
          {filteredPrompts.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="w-12 h-12 text-corporate-textTertiary mx-auto mb-4" />
              <h3 className="text-lg font-medium text-corporate-textPrimary mb-2">
                {searchTerm || selectedCategory !== 'all' ? 'No prompts match your criteria' : 'No prompts configured'}
              </h3>
              <p className="text-corporate-textSecondary mb-4">
                {searchTerm || selectedCategory !== 'all'
                  ? 'Try adjusting your search or filter settings'
                  : 'Create reusable prompt templates to speed up your queries'
                }
              </p>
              {(!searchTerm && selectedCategory === 'all') && (
                <button
                  onClick={() => setShowCreateDialog(true)}
                  className="px-4 py-2 bg-corporate-accentPrimary/80 text-white rounded-lg hover:bg-corporate-accentPrimary transition-colors border-2 border-corporate-accentPrimary/40"
                >
                  Create Your First Prompt
                </button>
              )}
            </div>
          ) : (
            <div className="grid gap-4">
              {filteredPrompts.map((prompt) => (
                <div key={prompt.id} className="bg-black/40 backdrop-blur-md rounded-lg p-4 border-2 border-corporate-borderPrimary/40 hover:border-corporate-accentPrimary/60 transition-colors">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <h4 className="font-medium text-corporate-textPrimary">{prompt.title}</h4>
                        {prompt.category && (
                          <span className="px-2 py-0.5 bg-corporate-accentPrimary/20 text-corporate-accentPrimary text-xs rounded-full flex items-center space-x-1 border border-corporate-accentPrimary/40">
                            <Tag className="w-3 h-3" />
                            <span>{prompt.category}</span>
                          </span>
                        )}
                      </div>

                      {prompt.description && (
                        <p className="text-sm text-corporate-textSecondary mb-2">{prompt.description}</p>
                      )}

                      {/* Variables */}
                      {prompt.variables.length > 0 && (
                        <div className="flex items-center space-x-1 mb-2">
                          <span className="text-xs text-corporate-textTertiary">Variables:</span>
                          {prompt.variables.map((variable, index) => (
                            <span
                              key={index}
                              className="px-1.5 py-0.5 bg-corporate-warning/20 text-corporate-warning text-xs rounded font-mono border border-corporate-warning/40"
                            >
                              {variable}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Timestamps */}
                      <div className="flex items-center space-x-4 text-xs text-corporate-textTertiary">
                        {prompt.created_at && (
                          <div className="flex items-center space-x-1">
                            <Clock className="w-3 h-3" />
                            <span>Created {new Date(prompt.created_at).toLocaleDateString()}</span>
                          </div>
                        )}
                        {prompt.updated_at && prompt.updated_at !== prompt.created_at && (
                          <div className="flex items-center space-x-1">
                            <Clock className="w-3 h-3" />
                            <span>Updated {new Date(prompt.updated_at).toLocaleDateString()}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center space-x-1 ml-4">
                      <button
                        onClick={() => onApplyPrompt(prompt)}
                        className="p-2 text-corporate-success hover:bg-corporate-success/20 rounded-lg transition-colors"
                        title="Apply prompt"
                      >
                        <Play className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => copyPrompt(prompt.template)}
                        className="p-2 text-corporate-textSecondary hover:text-corporate-accentPrimary rounded-lg transition-colors"
                        title="Copy template"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => startEdit(prompt)}
                        className="p-2 text-corporate-accentPrimary hover:bg-corporate-accentPrimary/20 rounded-lg transition-colors"
                        title="Edit prompt"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => onDeletePrompt(prompt.id)}
                        className="p-2 text-corporate-error hover:bg-corporate-error/20 rounded-lg transition-colors"
                        title="Delete prompt"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Template Preview */}
                  <div className="bg-black/40 backdrop-blur-md rounded border-2 border-corporate-borderPrimary/40 p-3">
                    <div className="text-xs font-medium text-corporate-textSecondary mb-1">Template:</div>
                    <div className="text-sm text-corporate-textPrimary font-mono whitespace-pre-wrap max-h-20 overflow-y-auto">
                      {prompt.template.length > 200
                        ? `${prompt.template.substring(0, 200)}...`
                        : prompt.template
                      }
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Create/Edit Dialog */}
      {showCreateDialog && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-black/90 backdrop-blur-md border-2 border-corporate-accentPrimary/40 rounded-lg shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b-2 border-corporate-accentPrimary/20">
              <h3 className="text-lg font-semibold text-corporate-textPrimary">
                {editingPrompt ? 'Edit Prompt' : 'Create New Prompt'}
              </h3>
              <button
                onClick={() => {
                  setShowCreateDialog(false);
                  setEditingPrompt(null);
                  setFormData({ title: '', description: '', template: '', category: '', variables: [] });
                }}
                className="p-1 text-corporate-textSecondary hover:text-corporate-textPrimary transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-corporate-textSecondary mb-1">Title</label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="Prompt title"
                    className="w-full px-3 py-2 bg-black/40 border-2 border-corporate-borderPrimary/40 rounded-lg text-corporate-textPrimary placeholder-corporate-textTertiary focus:ring-2 focus:ring-corporate-accentPrimary/20 focus:border-corporate-accentPrimary/60 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-corporate-textSecondary mb-1">Category</label>
                  <input
                    type="text"
                    value={formData.category}
                    onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                    placeholder="e.g., analysis, reporting"
                    className="w-full px-3 py-2 bg-black/40 border-2 border-corporate-borderPrimary/40 rounded-lg text-corporate-textPrimary placeholder-corporate-textTertiary focus:ring-2 focus:ring-corporate-accentPrimary/20 focus:border-corporate-accentPrimary/60 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-corporate-textSecondary mb-1">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Brief description of what this prompt does"
                  rows={2}
                  className="w-full px-3 py-2 bg-black/40 border-2 border-corporate-borderPrimary/40 rounded-lg text-corporate-textPrimary placeholder-corporate-textTertiary focus:ring-2 focus:ring-corporate-accentPrimary/20 focus:border-corporate-accentPrimary/60 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-corporate-textSecondary mb-1">Template</label>
                <textarea
                  value={formData.template}
                  onChange={(e) => {
                    const newTemplate = e.target.value;
                    const variables = extractVariables(newTemplate);
                    setFormData(prev => ({
                      ...prev,
                      template: newTemplate,
                      variables
                    }));
                  }}
                  placeholder="Enter your prompt template. Use {{variable}} for dynamic substitution."
                  rows={8}
                  className="w-full px-3 py-2 bg-black/40 border-2 border-corporate-borderPrimary/40 rounded-lg text-corporate-textPrimary placeholder-corporate-textTertiary focus:ring-2 focus:ring-corporate-accentPrimary/20 focus:border-corporate-accentPrimary/60 focus:outline-none font-mono text-sm"
                />
                <p className="text-xs text-corporate-textTertiary mt-1">
                  Use double curly braces for variables: <code className="bg-black/40 px-1 rounded border border-corporate-borderPrimary/40 text-corporate-textSecondary">{"{{variable_name}}"}</code>
                </p>
              </div>

              {/* Variables Preview */}
              {formData.variables.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-corporate-textSecondary mb-1">Detected Variables</label>
                  <div className="flex flex-wrap gap-1">
                    {formData.variables.map((variable, index) => (
                      <span
                        key={index}
                        className="px-2 py-1 bg-corporate-warning/20 text-corporate-warning text-xs rounded font-mono border border-corporate-warning/40"
                      >
                        {variable}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end space-x-3 p-6 border-t-2 border-corporate-accentPrimary/20">
              <button
                onClick={() => {
                  setShowCreateDialog(false);
                  setEditingPrompt(null);
                  setFormData({ title: '', description: '', template: '', category: '', variables: [] });
                }}
                className="px-4 py-2 text-corporate-textSecondary bg-black/40 rounded-lg hover:bg-black/60 transition-colors border-2 border-corporate-borderPrimary/40"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={!formData.title.trim() || !formData.template.trim() || isLoading}
                className="px-4 py-2 bg-corporate-accentPrimary/80 text-white rounded-lg hover:bg-corporate-accentPrimary transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-1 border-2 border-corporate-accentPrimary/40"
              >
                <Save className="w-4 h-4" />
                <span>{editingPrompt ? 'Update' : 'Create'} Prompt</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PreparedPromptsManager;