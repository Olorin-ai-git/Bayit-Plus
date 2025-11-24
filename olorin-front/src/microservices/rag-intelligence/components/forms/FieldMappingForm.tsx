import React, { useState, useCallback } from 'react';
import { Plus, Trash2, Save, X, Database, Hash, Edit3 } from 'lucide-react';
import { FieldMapping, RexPattern, EvalCommand } from '../../types/ragIntelligence';

interface FieldMappingFormProps {
  fieldMappings: FieldMapping[];
  rexPatterns: RexPattern[];
  evalCommands: EvalCommand[];
  onAddFieldMapping: (category: string, fields: string[]) => Promise<void>;
  onAddRexPattern: (fieldName: string, pattern: string) => Promise<void>;
  onAddEvalCommand: (command: string) => Promise<void>;
  onDeleteFieldMapping?: (category: string) => Promise<void>;
  onDeleteRexPattern?: (fieldName: string) => Promise<void>;
  onDeleteEvalCommand?: (command: string) => Promise<void>;
  isLoading?: boolean;
  className?: string;
}

const FieldMappingForm: React.FC<FieldMappingFormProps> = ({
  fieldMappings,
  rexPatterns,
  evalCommands,
  onAddFieldMapping,
  onAddRexPattern,
  onAddEvalCommand,
  onDeleteFieldMapping,
  onDeleteRexPattern,
  onDeleteEvalCommand,
  isLoading = false,
  className = ""
}) => {
  // Form states
  const [activeTab, setActiveTab] = useState<'mappings' | 'patterns' | 'commands'>('mappings');
  const [newCategory, setNewCategory] = useState('');
  const [newFields, setNewFields] = useState('');
  const [newFieldName, setNewFieldName] = useState('');
  const [newPattern, setNewPattern] = useState('');
  const [newEvalCommand, setNewEvalCommand] = useState('');

  // Dialog states
  const [showAddMapping, setShowAddMapping] = useState(false);
  const [showAddPattern, setShowAddPattern] = useState(false);
  const [showAddCommand, setShowAddCommand] = useState(false);

  const handleAddFieldMapping = useCallback(async () => {
    if (!newCategory.trim() || !newFields.trim()) return;

    try {
      const fields = newFields.split(',').map(f => f.trim()).filter(f => f.length > 0);
      await onAddFieldMapping(newCategory.trim(), fields);
      setNewCategory('');
      setNewFields('');
      setShowAddMapping(false);
    } catch (error) {
      console.error('Failed to add field mapping:', error);
    }
  }, [newCategory, newFields, onAddFieldMapping]);

  const handleAddRexPattern = useCallback(async () => {
    if (!newFieldName.trim() || !newPattern.trim()) return;

    try {
      await onAddRexPattern(newFieldName.trim(), newPattern.trim());
      setNewFieldName('');
      setNewPattern('');
      setShowAddPattern(false);
    } catch (error) {
      console.error('Failed to add rex pattern:', error);
    }
  }, [newFieldName, newPattern, onAddRexPattern]);

  const handleAddEvalCommand = useCallback(async () => {
    if (!newEvalCommand.trim()) return;

    try {
      await onAddEvalCommand(newEvalCommand.trim());
      setNewEvalCommand('');
      setShowAddCommand(false);
    } catch (error) {
      console.error('Failed to add eval command:', error);
    }
  }, [newEvalCommand, onAddEvalCommand]);

  const tabs = [
    { id: 'mappings', label: 'Field Mappings', icon: Database, count: fieldMappings.length },
    { id: 'patterns', label: 'Rex Patterns', icon: Hash, count: rexPatterns.length },
    { id: 'commands', label: 'Eval Commands', icon: Edit3, count: evalCommands.length }
  ];

  return (
    <div className={`space-y-6 ${className}`}>
      <div className="bg-black/40 backdrop-blur-md border-2 border-corporate-accentPrimary/40 rounded-lg">
        {/* Header */}
        <div className="px-6 py-4 border-b-2 border-corporate-accentPrimary/20">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-corporate-textPrimary">
                RAG Configuration Management
              </h3>
              <p className="text-sm text-corporate-textSecondary mt-1">
                Manage field mappings, extraction patterns, and dynamic commands
              </p>
            </div>

            <div className="flex items-center space-x-2">
              {activeTab === 'mappings' && (
                <button
                  onClick={() => setShowAddMapping(true)}
                  disabled={isLoading}
                  className="px-3 py-1.5 bg-corporate-accentPrimary/80 text-white text-sm rounded-lg hover:bg-corporate-accentPrimary transition-colors flex items-center space-x-1 border-2 border-corporate-accentPrimary/40"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Mapping</span>
                </button>
              )}
              {activeTab === 'patterns' && (
                <button
                  onClick={() => setShowAddPattern(true)}
                  disabled={isLoading}
                  className="px-3 py-1.5 bg-corporate-success/80 text-white text-sm rounded-lg hover:bg-corporate-success transition-colors flex items-center space-x-1 border-2 border-corporate-success/40"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Pattern</span>
                </button>
              )}
              {activeTab === 'commands' && (
                <button
                  onClick={() => setShowAddCommand(true)}
                  disabled={isLoading}
                  className="px-3 py-1.5 bg-corporate-accentSecondary/80 text-white text-sm rounded-lg hover:bg-corporate-accentSecondary transition-colors flex items-center space-x-1 border-2 border-corporate-accentSecondary/40"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Command</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b-2 border-corporate-accentPrimary/20">
          <nav className="flex space-x-8 px-6">
            {tabs.map(({ id, label, icon: Icon, count }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id as any)}
                className={`
                  flex items-center space-x-2 py-4 border-b-2 font-medium text-sm transition-colors
                  ${activeTab === id
                    ? 'border-corporate-accentPrimary text-corporate-accentPrimary'
                    : 'border-transparent text-corporate-textSecondary hover:text-corporate-textPrimary hover:border-corporate-accentPrimary/40'
                  }
                `}
              >
                <Icon className="w-4 h-4" />
                <span>{label}</span>
                <span className={`
                  px-2 py-0.5 rounded-full text-xs border
                  ${activeTab === id ? 'bg-corporate-accentPrimary/20 text-corporate-accentPrimary border-corporate-accentPrimary/40' : 'bg-black/40 text-corporate-textTertiary border-corporate-borderPrimary/40'}
                `}>
                  {count}
                </span>
              </button>
            ))}
          </nav>
        </div>

      {/* Content */}
      <div className="p-6">
        {/* Field Mappings Tab */}
        {activeTab === 'mappings' && (
          <div className="space-y-4">
            {fieldMappings.length === 0 ? (
              <div className="text-center py-12">
                <Database className="w-12 h-12 text-corporate-textTertiary mx-auto mb-4" />
                <h3 className="text-lg font-medium text-corporate-textPrimary mb-2">No field mappings configured</h3>
                <p className="text-corporate-textSecondary mb-4">Create field mappings to categorize and organize your data fields.</p>
                <button
                  onClick={() => setShowAddMapping(true)}
                  className="px-4 py-2 bg-corporate-accentPrimary/80 text-white rounded-lg hover:bg-corporate-accentPrimary transition-colors border-2 border-corporate-accentPrimary/40"
                >
                  Add Your First Mapping
                </button>
              </div>
            ) : (
              <div className="grid gap-4">
                {fieldMappings.map((mapping, index) => (
                  <div key={index} className="bg-black/40 backdrop-blur-md rounded-lg p-4 border-2 border-corporate-borderPrimary/40">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <Database className="w-4 h-4 text-corporate-accentPrimary" />
                          <h4 className="font-medium text-corporate-textPrimary">{mapping.category}</h4>
                          <span className="text-xs text-corporate-textTertiary">({mapping.fields.length} fields)</span>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {mapping.fields.map((field, fieldIndex) => (
                            <span
                              key={fieldIndex}
                              className="px-2 py-1 bg-corporate-accentPrimary/20 text-corporate-accentPrimary text-xs rounded-md border border-corporate-accentPrimary/40"
                            >
                              {field}
                            </span>
                          ))}
                        </div>
                      </div>
                      {onDeleteFieldMapping && (
                        <button
                          onClick={() => onDeleteFieldMapping(mapping.category)}
                          className="p-1 text-corporate-textSecondary hover:text-corporate-error transition-colors"
                          title="Delete mapping"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Rex Patterns Tab */}
        {activeTab === 'patterns' && (
          <div className="space-y-4">
            {rexPatterns.length === 0 ? (
              <div className="text-center py-12">
                <Hash className="w-12 h-12 text-corporate-textTertiary mx-auto mb-4" />
                <h3 className="text-lg font-medium text-corporate-textPrimary mb-2">No regex patterns configured</h3>
                <p className="text-corporate-textSecondary mb-4">Create regex patterns to extract specific data from fields.</p>
                <button
                  onClick={() => setShowAddPattern(true)}
                  className="px-4 py-2 bg-corporate-success/80 text-white rounded-lg hover:bg-corporate-success transition-colors border-2 border-corporate-success/40"
                >
                  Add Your First Pattern
                </button>
              </div>
            ) : (
              <div className="grid gap-4">
                {rexPatterns.map((pattern, index) => (
                  <div key={index} className="bg-black/40 backdrop-blur-md rounded-lg p-4 border-2 border-corporate-borderPrimary/40">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <Hash className="w-4 h-4 text-corporate-success" />
                          <h4 className="font-medium text-corporate-textPrimary">{pattern.field_name}</h4>
                        </div>
                        <div className="bg-black/40 backdrop-blur-md p-2 rounded border-2 border-corporate-borderPrimary/40 font-mono text-sm text-corporate-textPrimary">
                          {pattern.pattern}
                        </div>
                      </div>
                      {onDeleteRexPattern && (
                        <button
                          onClick={() => onDeleteRexPattern(pattern.field_name)}
                          className="p-1 text-corporate-textSecondary hover:text-corporate-error transition-colors"
                          title="Delete pattern"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Eval Commands Tab */}
        {activeTab === 'commands' && (
          <div className="space-y-4">
            {evalCommands.length === 0 ? (
              <div className="text-center py-12">
                <Edit3 className="w-12 h-12 text-corporate-textTertiary mx-auto mb-4" />
                <h3 className="text-lg font-medium text-corporate-textPrimary mb-2">No eval commands configured</h3>
                <p className="text-corporate-textSecondary mb-4">Create dynamic evaluation commands for advanced data processing.</p>
                <button
                  onClick={() => setShowAddCommand(true)}
                  className="px-4 py-2 bg-corporate-accentSecondary/80 text-white rounded-lg hover:bg-corporate-accentSecondary transition-colors border-2 border-corporate-accentSecondary/40"
                >
                  Add Your First Command
                </button>
              </div>
            ) : (
              <div className="grid gap-4">
                {evalCommands.map((command, index) => (
                  <div key={index} className="bg-black/40 backdrop-blur-md rounded-lg p-4 border-2 border-corporate-borderPrimary/40">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <Edit3 className="w-4 h-4 text-corporate-accentSecondary" />
                          <h4 className="font-medium text-corporate-textPrimary">Dynamic Command</h4>
                        </div>
                        <div className="bg-black/40 backdrop-blur-md p-2 rounded border-2 border-corporate-borderPrimary/40 font-mono text-sm text-corporate-textPrimary">
                          {command.command}
                        </div>
                      </div>
                      {onDeleteEvalCommand && (
                        <button
                          onClick={() => onDeleteEvalCommand(command.command)}
                          className="p-1 text-corporate-textSecondary hover:text-corporate-error transition-colors"
                          title="Delete command"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Add Field Mapping Modal */}
      {showAddMapping && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-black/90 backdrop-blur-md border-2 border-corporate-accentPrimary/40 rounded-lg shadow-xl w-full max-w-md mx-4">
            <div className="flex items-center justify-between p-6 border-b-2 border-corporate-accentPrimary/20">
              <h3 className="text-lg font-semibold text-corporate-textPrimary">Add Field Mapping</h3>
              <button
                onClick={() => setShowAddMapping(false)}
                className="p-1 text-corporate-textSecondary hover:text-corporate-textPrimary transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-corporate-textSecondary mb-1">Category</label>
                <input
                  type="text"
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  placeholder="e.g., fraud_indicators, user_data"
                  className="w-full px-3 py-2 bg-black/40 border-2 border-corporate-borderPrimary/40 rounded-lg text-corporate-textPrimary placeholder-corporate-textTertiary focus:ring-2 focus:ring-corporate-accentPrimary/20 focus:border-corporate-accentPrimary/60 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-corporate-textSecondary mb-1">Fields (comma-separated)</label>
                <textarea
                  value={newFields}
                  onChange={(e) => setNewFields(e.target.value)}
                  placeholder="e.g., transaction_amount, user_id, timestamp"
                  rows={3}
                  className="w-full px-3 py-2 bg-black/40 border-2 border-corporate-borderPrimary/40 rounded-lg text-corporate-textPrimary placeholder-corporate-textTertiary focus:ring-2 focus:ring-corporate-accentPrimary/20 focus:border-corporate-accentPrimary/60 focus:outline-none"
                />
                <p className="text-xs text-corporate-textTertiary mt-1">Separate multiple fields with commas</p>
              </div>
            </div>

            <div className="flex justify-end space-x-3 p-6 border-t-2 border-corporate-accentPrimary/20">
              <button
                onClick={() => setShowAddMapping(false)}
                className="px-4 py-2 text-corporate-textSecondary bg-black/40 rounded-lg hover:bg-black/60 transition-colors border-2 border-corporate-borderPrimary/40"
              >
                Cancel
              </button>
              <button
                onClick={handleAddFieldMapping}
                disabled={!newCategory.trim() || !newFields.trim() || isLoading}
                className="px-4 py-2 bg-corporate-accentPrimary/80 text-white rounded-lg hover:bg-corporate-accentPrimary transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-1 border-2 border-corporate-accentPrimary/40"
              >
                <Save className="w-4 h-4" />
                <span>Add Mapping</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Rex Pattern Modal */}
      {showAddPattern && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-black/90 backdrop-blur-md border-2 border-corporate-success/40 rounded-lg shadow-xl w-full max-w-md mx-4">
            <div className="flex items-center justify-between p-6 border-b-2 border-corporate-success/20">
              <h3 className="text-lg font-semibold text-corporate-textPrimary">Add Rex Pattern</h3>
              <button
                onClick={() => setShowAddPattern(false)}
                className="p-1 text-corporate-textSecondary hover:text-corporate-textPrimary transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-corporate-textSecondary mb-1">Field Name</label>
                <input
                  type="text"
                  value={newFieldName}
                  onChange={(e) => setNewFieldName(e.target.value)}
                  placeholder="e.g., email, phone, ip_address"
                  className="w-full px-3 py-2 bg-black/40 border-2 border-corporate-borderPrimary/40 rounded-lg text-corporate-textPrimary placeholder-corporate-textTertiary focus:ring-2 focus:ring-corporate-success/20 focus:border-corporate-success/60 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-corporate-textSecondary mb-1">Regex Pattern</label>
                <textarea
                  value={newPattern}
                  onChange={(e) => setNewPattern(e.target.value)}
                  placeholder="e.g., \b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b"
                  rows={3}
                  className="w-full px-3 py-2 bg-black/40 border-2 border-corporate-borderPrimary/40 rounded-lg text-corporate-textPrimary placeholder-corporate-textTertiary focus:ring-2 focus:ring-corporate-success/20 focus:border-corporate-success/60 focus:outline-none font-mono text-sm"
                />
                <p className="text-xs text-corporate-textTertiary mt-1">Enter a valid regex pattern for field extraction</p>
              </div>
            </div>

            <div className="flex justify-end space-x-3 p-6 border-t-2 border-corporate-success/20">
              <button
                onClick={() => setShowAddPattern(false)}
                className="px-4 py-2 text-corporate-textSecondary bg-black/40 rounded-lg hover:bg-black/60 transition-colors border-2 border-corporate-borderPrimary/40"
              >
                Cancel
              </button>
              <button
                onClick={handleAddRexPattern}
                disabled={!newFieldName.trim() || !newPattern.trim() || isLoading}
                className="px-4 py-2 bg-corporate-success/80 text-white rounded-lg hover:bg-corporate-success transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-1 border-2 border-corporate-success/40"
              >
                <Save className="w-4 h-4" />
                <span>Add Pattern</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Eval Command Modal */}
      {showAddCommand && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-black/90 backdrop-blur-md border-2 border-corporate-accentSecondary/40 rounded-lg shadow-xl w-full max-w-md mx-4">
            <div className="flex items-center justify-between p-6 border-b-2 border-corporate-accentSecondary/20">
              <h3 className="text-lg font-semibold text-corporate-textPrimary">Add Eval Command</h3>
              <button
                onClick={() => setShowAddCommand(false)}
                className="p-1 text-corporate-textSecondary hover:text-corporate-textPrimary transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-corporate-textSecondary mb-1">Dynamic Command</label>
                <textarea
                  value={newEvalCommand}
                  onChange={(e) => setNewEvalCommand(e.target.value)}
                  placeholder="e.g., stats count by user_id | sort -count"
                  rows={3}
                  className="w-full px-3 py-2 bg-black/40 border-2 border-corporate-borderPrimary/40 rounded-lg text-corporate-textPrimary placeholder-corporate-textTertiary focus:ring-2 focus:ring-corporate-accentSecondary/20 focus:border-corporate-accentSecondary/60 focus:outline-none font-mono text-sm"
                />
                <p className="text-xs text-corporate-textTertiary mt-1">Enter a dynamic evaluation command for data processing</p>
              </div>
            </div>

            <div className="flex justify-end space-x-3 p-6 border-t-2 border-corporate-accentSecondary/20">
              <button
                onClick={() => setShowAddCommand(false)}
                className="px-4 py-2 text-corporate-textSecondary bg-black/40 rounded-lg hover:bg-black/60 transition-colors border-2 border-corporate-borderPrimary/40"
              >
                Cancel
              </button>
              <button
                onClick={handleAddEvalCommand}
                disabled={!newEvalCommand.trim() || isLoading}
                className="px-4 py-2 bg-corporate-accentSecondary/80 text-white rounded-lg hover:bg-corporate-accentSecondary transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-1 border-2 border-corporate-accentSecondary/40"
              >
                <Save className="w-4 h-4" />
                <span>Add Command</span>
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
};

export default FieldMappingForm;