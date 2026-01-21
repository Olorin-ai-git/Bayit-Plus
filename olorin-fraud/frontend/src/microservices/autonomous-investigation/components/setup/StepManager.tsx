import React, { useState, useCallback, useEffect } from 'react';
import {
  X,
  Plus,
  Minus,
  ChevronUp,
  ChevronDown,
  Settings,
  CheckSquare,
  Square,
  Lock,
  Tool
} from 'lucide-react';
import { InvestigationStep, StepStatus } from '../../types/investigation';

interface StepManagerProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (selectedSteps: InvestigationStep[]) => void;
  allSteps: InvestigationStep[];
  selectedSteps: InvestigationStep[];
  className?: string;
}

// Default available steps based on legacy configuration
const defaultAvailableSteps: InvestigationStep[] = [
  {
    id: 'network',
    title: 'Network Analysis',
    description: 'Analyzing network characteristics and potential threats',
    agent: 'Network Agent',
    status: StepStatus.PENDING,
    order: 1,
    required: false,
    parameters: {}
  },
  {
    id: 'location',
    title: 'Location Analysis',
    description: 'Checking for suspicious location patterns and travel anomalies',
    agent: 'Location Agent',
    status: StepStatus.PENDING,
    order: 2,
    required: false,
    parameters: {}
  },
  {
    id: 'device',
    title: 'Device Analysis',
    description: 'Examining device history and changes',
    agent: 'Device Agent',
    status: StepStatus.PENDING,
    order: 3,
    required: false,
    parameters: {}
  },
  {
    id: 'logs',
    title: 'Log Analysis',
    description: 'Reviewing system logs for suspicious patterns',
    agent: 'Log Agent',
    status: StepStatus.PENDING,
    order: 4,
    required: false,
    parameters: {}
  }
];

// Required steps that cannot be removed or reordered
const requiredSteps = ['initialization', 'risk-assessment'];

const StepManager: React.FC<StepManagerProps> = ({
  isOpen,
  onClose,
  onSave,
  allSteps,
  selectedSteps,
  className = ""
}) => {
  const [localSelectedSteps, setLocalSelectedSteps] = useState<InvestigationStep[]>(selectedSteps);
  const [selectedStepForTools, setSelectedStepForTools] = useState<InvestigationStep | null>(null);
  const [availableTools] = useState<string[]>([
    'Device Fingerprinting',
    'Behavioral Analysis',
    'Risk Scoring',
    'Pattern Recognition',
    'Anomaly Detection',
    'Fraud Rules Engine'
  ]);

  // Update local state when props change
  useEffect(() => {
    setLocalSelectedSteps(selectedSteps);
  }, [selectedSteps]);

  // Get available steps (not already selected)
  const availableSteps = (allSteps.length > 0 ? allSteps : defaultAvailableSteps).filter(
    (step) => !localSelectedSteps.some((s) => s.id === step.id)
  );

  // Check if step is required
  const isRequired = useCallback((stepId: string) => {
    return requiredSteps.includes(stepId);
  }, []);

  // Handle adding a step
  const handleAddStep = useCallback((step: InvestigationStep) => {
    const newStep = {
      ...step,
      order: localSelectedSteps.length,
      status: StepStatus.PENDING
    };
    setLocalSelectedSteps(prev => [...prev, newStep]);
  }, [localSelectedSteps.length]);

  // Handle removing a step
  const handleRemoveStep = useCallback((stepId: string) => {
    if (isRequired(stepId)) return;

    setLocalSelectedSteps(prev => prev.filter(s => s.id !== stepId));
    // Close tools panel if this step was selected
    if (selectedStepForTools?.id === stepId) {
      setSelectedStepForTools(null);
    }
  }, [isRequired, selectedStepForTools?.id]);

  // Handle moving step up
  const handleMoveUp = useCallback((index: number) => {
    if (index === 0) return;

    const stepToMove = localSelectedSteps[index];
    if (isRequired(stepToMove.id)) return;

    const newSteps = [...localSelectedSteps];
    [newSteps[index - 1], newSteps[index]] = [newSteps[index], newSteps[index - 1]];

    // Update order numbers
    newSteps.forEach((step, idx) => {
      step.order = idx;
    });

    setLocalSelectedSteps(newSteps);
  }, [localSelectedSteps, isRequired]);

  // Handle moving step down
  const handleMoveDown = useCallback((index: number) => {
    if (index === localSelectedSteps.length - 1) return;

    const stepToMove = localSelectedSteps[index];
    if (isRequired(stepToMove.id)) return;

    const newSteps = [...localSelectedSteps];
    [newSteps[index], newSteps[index + 1]] = [newSteps[index + 1], newSteps[index]];

    // Update order numbers
    newSteps.forEach((step, idx) => {
      step.order = idx;
    });

    setLocalSelectedSteps(newSteps);
  }, [localSelectedSteps, isRequired]);

  // Handle step click for tools configuration
  const handleStepClick = useCallback((step: InvestigationStep) => {
    setSelectedStepForTools(selectedStepForTools?.id === step.id ? null : step);
  }, [selectedStepForTools?.id]);

  // Handle tool toggle
  const handleToolToggle = useCallback((stepId: string, tool: string) => {
    setLocalSelectedSteps(prev => prev.map(step => {
      if (step.id !== stepId) return step;

      const currentTools = step.parameters?.tools || [];
      const newTools = currentTools.includes(tool)
        ? currentTools.filter((t: string) => t !== tool)
        : [...currentTools, tool];

      return {
        ...step,
        parameters: {
          ...step.parameters,
          tools: newTools
        }
      };
    }));
  }, []);

  // Handle save
  const handleSave = useCallback(() => {
    onSave(localSelectedSteps);
    onClose();
  }, [localSelectedSteps, onSave, onClose]);

  // Get selected tools for a step
  const getSelectedTools = useCallback((stepId: string): string[] => {
    const step = localSelectedSteps.find(s => s.id === stepId);
    return step?.parameters?.tools || [];
  }, [localSelectedSteps]);

  if (!isOpen) return null;

  return (
    <div className={`fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 ${className}`}>
      <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl mx-4 max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            Edit Investigation Steps
          </h2>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex h-[600px]">
          {/* Available Steps */}
          <div className="flex-1 p-6 border-r border-gray-200">
            <h3 className="text-sm font-medium text-gray-900 mb-3">
              Available Steps
            </h3>
            <div className="bg-gray-50 border border-gray-200 rounded-lg h-full p-3 overflow-y-auto">
              {availableSteps.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-8">
                  No steps available
                </p>
              ) : (
                <div className="space-y-2">
                  {availableSteps.map((step) => (
                    <div
                      key={step.id}
                      className="bg-white border border-gray-200 rounded-lg p-3 hover:shadow-sm hover:translate-x-1 transition-all duration-200"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <h4 className="text-sm font-medium text-gray-900">
                            {step.title}
                          </h4>
                          <p className="text-xs text-gray-600 mt-1">
                            {step.description}
                          </p>
                        </div>
                        <button
                          onClick={() => handleAddStep(step)}
                          className="ml-3 flex items-center space-x-1 px-3 py-1.5 bg-blue-600 text-white text-xs rounded-md hover:bg-blue-700 transition-colors"
                        >
                          <Plus className="w-3 h-3" />
                          <span>Add</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Selected Steps */}
          <div className="flex-1 p-6">
            <h3 className="text-sm font-medium text-gray-900 mb-3">
              Selected Steps (in order)
            </h3>
            <div className="bg-gray-50 border border-gray-200 rounded-lg h-full p-3 overflow-y-auto">
              {localSelectedSteps.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-8">
                  No steps selected
                </p>
              ) : (
                <div className="space-y-2">
                  {localSelectedSteps.map((step, index) => (
                    <div
                      key={step.id}
                      onClick={() => handleStepClick(step)}
                      className={`
                        bg-white border rounded-lg p-3 cursor-pointer transition-all duration-200
                        hover:shadow-sm hover:-translate-x-1
                        ${selectedStepForTools?.id === step.id
                          ? 'border-blue-500 bg-blue-50 shadow-md'
                          : 'border-gray-200'
                        }
                        ${isRequired(step.id) ? 'opacity-70' : ''}
                      `}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2">
                            <h4 className="text-sm font-medium text-gray-900">
                              {step.title}
                            </h4>
                            {selectedStepForTools?.id === step.id && (
                              <Tool className="w-4 h-4 text-blue-600" />
                            )}
                            {isRequired(step.id) && (
                              <Lock className="w-3 h-3 text-gray-400" />
                            )}
                          </div>
                          <p className="text-xs text-gray-600 mt-1">
                            {isRequired(step.id) ? 'Required' : 'Click to configure tools'}
                          </p>
                        </div>

                        <div className="flex items-center space-x-1">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleMoveUp(index);
                            }}
                            disabled={index === 0 || isRequired(step.id)}
                            className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                          >
                            <ChevronUp className="w-4 h-4" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleMoveDown(index);
                            }}
                            disabled={index === localSelectedSteps.length - 1 || isRequired(step.id)}
                            className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                          >
                            <ChevronDown className="w-4 h-4" />
                          </button>
                          {!isRequired(step.id) && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRemoveStep(step.id);
                              }}
                              className="ml-2 flex items-center space-x-1 px-2 py-1 bg-red-600 text-white text-xs rounded-md hover:bg-red-700 transition-colors"
                            >
                              <Minus className="w-3 h-3" />
                              <span>Remove</span>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Tools Configuration Panel */}
          {selectedStepForTools && (
            <div className="w-80 border-l border-gray-200 bg-gray-50">
              <div className="p-4 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Settings className="w-4 h-4 text-blue-600" />
                    <h3 className="text-sm font-medium text-gray-900">
                      Tools Configuration
                    </h3>
                  </div>
                  <button
                    onClick={() => setSelectedStepForTools(null)}
                    className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <p className="text-xs text-gray-600 mt-1">
                  Agent: {selectedStepForTools.agent}
                </p>
              </div>

              <div className="p-4 h-full overflow-y-auto">
                <h4 className="text-sm font-medium text-gray-900 mb-3">
                  Select Tools
                </h4>
                <div className="space-y-2">
                  {availableTools.map((tool) => {
                    const isSelected = getSelectedTools(selectedStepForTools.id).includes(tool);
                    return (
                      <label
                        key={tool}
                        className="flex items-center space-x-2 p-2 rounded-md hover:bg-gray-100 cursor-pointer transition-colors"
                      >
                        <button
                          type="button"
                          onClick={() => handleToolToggle(selectedStepForTools.id, tool)}
                          className="flex-shrink-0"
                        >
                          {isSelected ? (
                            <CheckSquare className="w-4 h-4 text-blue-600" />
                          ) : (
                            <Square className="w-4 h-4 text-gray-400" />
                          )}
                        </button>
                        <span className="text-sm text-gray-700">
                          {tool}
                        </span>
                      </label>
                    );
                  })}
                </div>

                <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-xs text-blue-700">
                    💡 These settings override global agent tool preferences and are saved automatically.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end space-x-3 px-6 py-4 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
};

export default StepManager;