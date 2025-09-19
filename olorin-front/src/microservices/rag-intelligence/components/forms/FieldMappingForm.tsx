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
    <div className={`bg-white rounded-lg border border-gray-200 shadow-sm ${className}`}>
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              RAG Configuration Management
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              Manage field mappings, extraction patterns, and dynamic commands
            </p>
          </div>

          <div className="flex items-center space-x-2">
            {activeTab === 'mappings' && (
              <button
                onClick={() => setShowAddMapping(true)}
                disabled={isLoading}
                className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-1"
              >
                <Plus className="w-4 h-4" />
                <span>Add Mapping</span>
              </button>
            )}
            {activeTab === 'patterns' && (
              <button
                onClick={() => setShowAddPattern(true)}
                disabled={isLoading}
                className="px-3 py-1.5 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-1"
              >
                <Plus className="w-4 h-4" />
                <span>Add Pattern</span>
              </button>
            )}
            {activeTab === 'commands' && (
              <button
                onClick={() => setShowAddCommand(true)}
                disabled={isLoading}
                className="px-3 py-1.5 bg-purple-600 text-white text-sm rounded-lg hover:bg-purple-700 transition-colors flex items-center space-x-1"
              >
                <Plus className="w-4 h-4" />
                <span>Add Command</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8 px-6">
          {tabs.map(({ id, label, icon: Icon, count }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id as any)}
              className={`
                flex items-center space-x-2 py-4 border-b-2 font-medium text-sm transition-colors
                ${activeTab === id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }
              `}
            >
              <Icon className="w-4 h-4" />
              <span>{label}</span>
              <span className={`
                px-2 py-0.5 rounded-full text-xs
                ${activeTab === id ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600'}
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
                <Database className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No field mappings configured</h3>
                <p className="text-gray-500 mb-4">Create field mappings to categorize and organize your data fields.</p>
                <button
                  onClick={() => setShowAddMapping(true)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Add Your First Mapping
                </button>
              </div>
            ) : (
              <div className="grid gap-4">
                {fieldMappings.map((mapping, index) => (
                  <div key={index} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <Database className="w-4 h-4 text-blue-600" />
                          <h4 className="font-medium text-gray-900">{mapping.category}</h4>
                          <span className="text-xs text-gray-500">({mapping.fields.length} fields)</span>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {mapping.fields.map((field, fieldIndex) => (
                            <span
                              key={fieldIndex}
                              className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-md"
                            >
                              {field}
                            </span>
                          ))}
                        </div>
                      </div>
                      {onDeleteFieldMapping && (
                        <button
                          onClick={() => onDeleteFieldMapping(mapping.category)}
                          className="p-1 text-gray-400 hover:text-red-600 transition-colors"
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
                <Hash className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No regex patterns configured</h3>
                <p className="text-gray-500 mb-4">Create regex patterns to extract specific data from fields.</p>
                <button
                  onClick={() => setShowAddPattern(true)}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  Add Your First Pattern
                </button>
              </div>
            ) : (
              <div className="grid gap-4">
                {rexPatterns.map((pattern, index) => (
                  <div key={index} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <Hash className="w-4 h-4 text-green-600" />
                          <h4 className="font-medium text-gray-900">{pattern.field_name}</h4>
                        </div>
                        <div className="bg-white p-2 rounded border font-mono text-sm text-gray-700">
                          {pattern.pattern}
                        </div>
                      </div>
                      {onDeleteRexPattern && (
                        <button
                          onClick={() => onDeleteRexPattern(pattern.field_name)}
                          className="p-1 text-gray-400 hover:text-red-600 transition-colors"
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
                <Edit3 className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No eval commands configured</h3>
                <p className="text-gray-500 mb-4">Create dynamic evaluation commands for advanced data processing.</p>
                <button
                  onClick={() => setShowAddCommand(true)}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                >
                  Add Your First Command
                </button>
              </div>
            ) : (
              <div className="grid gap-4">
                {evalCommands.map((command, index) => (
                  <div key={index} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <Edit3 className="w-4 h-4 text-purple-600" />
                          <h4 className="font-medium text-gray-900">Dynamic Command</h4>
                        </div>
                        <div className="bg-white p-2 rounded border font-mono text-sm text-gray-700">
                          {command.command}
                        </div>
                      </div>
                      {onDeleteEvalCommand && (
                        <button
                          onClick={() => onDeleteEvalCommand(command.command)}
                          className="p-1 text-gray-400 hover:text-red-600 transition-colors"
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Add Field Mapping</h3>
              <button
                onClick={() => setShowAddMapping(false)}
                className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                <input
                  type="text"
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  placeholder="e.g., fraud_indicators, user_data"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Fields (comma-separated)</label>
                <textarea
                  value={newFields}
                  onChange={(e) => setNewFields(e.target.value)}
                  placeholder="e.g., transaction_amount, user_id, timestamp"
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">Separate multiple fields with commas</p>
              </div>
            </div>

            <div className="flex justify-end space-x-3 p-6 border-t border-gray-200">
              <button
                onClick={() => setShowAddMapping(false)}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAddFieldMapping}
                disabled={!newCategory.trim() || !newFields.trim() || isLoading}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-1"
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Add Rex Pattern</h3>
              <button
                onClick={() => setShowAddPattern(false)}
                className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Field Name</label>
                <input
                  type="text"
                  value={newFieldName}
                  onChange={(e) => setNewFieldName(e.target.value)}
                  placeholder="e.g., email, phone, ip_address"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Regex Pattern</label>
                <textarea
                  value={newPattern}
                  onChange={(e) => setNewPattern(e.target.value)}
                  placeholder="e.g., \b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b"
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 font-mono text-sm"
                />
                <p className="text-xs text-gray-500 mt-1">Enter a valid regex pattern for field extraction</p>
              </div>
            </div>

            <div className="flex justify-end space-x-3 p-6 border-t border-gray-200">
              <button
                onClick={() => setShowAddPattern(false)}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAddRexPattern}
                disabled={!newFieldName.trim() || !newPattern.trim() || isLoading}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-1"
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Add Eval Command</h3>
              <button
                onClick={() => setShowAddCommand(false)}
                className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Dynamic Command</label>
                <textarea
                  value={newEvalCommand}
                  onChange={(e) => setNewEvalCommand(e.target.value)}
                  placeholder="e.g., stats count by user_id | sort -count"
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 font-mono text-sm"
                />
                <p className="text-xs text-gray-500 mt-1">Enter a dynamic evaluation command for data processing</p>
              </div>
            </div>

            <div className="flex justify-end space-x-3 p-6 border-t border-gray-200">
              <button
                onClick={() => setShowAddCommand(false)}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAddEvalCommand}
                disabled={!newEvalCommand.trim() || isLoading}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-1"
              >
                <Save className="w-4 h-4" />
                <span>Add Command</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FieldMappingForm;