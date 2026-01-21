import React, { useState } from 'react';
import {
  XMarkIcon,
  InformationCircleIcon,
  CheckIcon,
  PlayIcon,
} from '@heroicons/react/24/outline';
import { Investigation, InvestigationPriority, AgentConfiguration } from '../types/investigation';

interface CreateInvestigationProps {
  onCreateInvestigation: (investigation: Partial<Investigation>) => Promise<Investigation>;
  onCancel: () => void;
}

interface FormData {
  title: string;
  description: string;
  priority: InvestigationPriority;
  agents: AgentConfiguration[];
  parameters: {
    timeRange: string;
    threshold: number;
    includeHistorical: boolean;
    maxDuration: number;
    parallelAgents: boolean;
  };
  metadata: {
    accountId?: string;
    userId?: string;
    transactionId?: string;
    ipAddress?: string;
    deviceId?: string;
  };
  tags: string[];
}

const availableAgents = [
  {
    id: 'device-analyzer',
    name: 'Device Analyzer',
    description: 'Analyzes device fingerprints and hardware characteristics',
    type: 'device',
    defaultConfig: { sensitivity: 'medium', includeHistory: true },
  },
  {
    id: 'location-analyzer',
    name: 'Location Analyzer',
    description: 'Examines geographic patterns and location anomalies',
    type: 'location',
    defaultConfig: { radiusKm: 50, includeVPN: true },
  },
  {
    id: 'network-analyzer',
    name: 'Network Analyzer',
    description: 'Investigates network patterns and connections',
    type: 'network',
    defaultConfig: { depth: 'medium', includeProxy: true },
  },
  {
    id: 'behavior-analyzer',
    name: 'Behavior Analyzer',
    description: 'Analyzes user behavior patterns and anomalies',
    type: 'behavior',
    defaultConfig: { lookbackDays: 30, sensitivity: 'high' },
  },
  {
    id: 'transaction-analyzer',
    name: 'Transaction Analyzer',
    description: 'Examines transaction patterns and financial anomalies',
    type: 'transaction',
    defaultConfig: { threshold: 0.8, includeRelated: true },
  },
  {
    id: 'logs-analyzer',
    name: 'Logs Analyzer',
    description: 'Searches and analyzes system logs for suspicious activity',
    type: 'logs',
    defaultConfig: { sources: ['api', 'auth', 'audit'], timespan: '7d' },
  },
];

export const CreateInvestigation: React.FC<CreateInvestigationProps> = ({
  onCreateInvestigation,
  onCancel,
}) => {
  const [formData, setFormData] = useState<FormData>({
    title: '',
    description: '',
    priority: 'medium',
    agents: [],
    parameters: {
      timeRange: '7d',
      threshold: 0.8,
      includeHistorical: true,
      maxDuration: 3600, // 1 hour in seconds
      parallelAgents: true,
    },
    metadata: {},
    tags: [],
  });

  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [tagInput, setTagInput] = useState('');

  const handleAgentToggle = (agentId: string) => {
    setFormData(prev => {
      const existingIndex = prev.agents.findIndex(a => a.id === agentId);
      if (existingIndex >= 0) {
        // Remove agent
        return {
          ...prev,
          agents: prev.agents.filter(a => a.id !== agentId),
        };
      } else {
        // Add agent with default config
        const agent = availableAgents.find(a => a.id === agentId);
        if (agent) {
          return {
            ...prev,
            agents: [
              ...prev.agents,
              {
                id: agentId,
                enabled: true,
                config: agent.defaultConfig,
              },
            ],
          };
        }
        return prev;
      }
    });
  };


  const handleAddTag = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && tagInput.trim()) {
      e.preventDefault();
      const newTag = tagInput.trim().toLowerCase();
      if (!formData.tags.includes(newTag)) {
        setFormData(prev => ({
          ...prev,
          tags: [...prev.tags, newTag],
        }));
      }
      setTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove),
    }));
  };

  const handleSubmit = async () => {
    if (!formData.title.trim()) {
      alert('Please enter a title for the investigation');
      return;
    }

    if (formData.agents.length === 0) {
      alert('Please select at least one agent for the investigation');
      return;
    }

    setIsSubmitting(true);

    try {
      const investigation: Partial<Investigation> = {
        title: formData.title,
        description: formData.description,
        priority: formData.priority,
        assignedAgents: formData.agents.map(a => a.id),
        configuration: {
          agents: formData.agents,
          parameters: formData.parameters,
          notifications: {
            onProgress: true,
            onCompletion: true,
            onError: true,
          },
        },
        metadata: formData.metadata,
        tags: formData.tags,
      };

      await onCreateInvestigation(investigation);
    } catch (error) {
      alert('Failed to create investigation. Please try again.');
      console.error('Error creating investigation:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const isStepValid = () => {
    switch (currentStep) {
      case 1:
        return formData.title.trim().length > 0;
      case 2:
        return formData.agents.length > 0;
      case 3:
        return true; // Parameters step is always valid with defaults
      default:
        return false;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-6">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <div>
              <h1 className="text-xl font-semibold text-gray-900">Create New Investigation</h1>
              <p className="text-sm text-gray-600 mt-1">Configure and launch an autonomous investigation</p>
            </div>
            <button
              onClick={onCancel}
              className="p-2 text-gray-400 hover:text-gray-600 rounded-md"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>

          {/* Progress Steps */}
          <div className="px-6 py-4">
            <div className="flex items-center space-x-8">
              {[
                { step: 1, title: 'Basic Info', description: 'Investigation details' },
                { step: 2, title: 'Select Agents', description: 'Choose AI agents' },
                { step: 3, title: 'Configure', description: 'Set parameters' },
                { step: 4, title: 'Review', description: 'Confirm and launch' },
              ].map(({ step, title, description }) => (
                <div key={step} className="flex items-center">
                  <div
                    className={`
                      flex items-center justify-center w-8 h-8 rounded-full border-2 transition-colors duration-150
                      ${currentStep >= step
                        ? 'border-blue-500 bg-blue-500 text-white'
                        : 'border-gray-300 bg-white text-gray-500'
                      }
                    `}
                  >
                    {currentStep > step ? (
                      <CheckIcon className="h-4 w-4" />
                    ) : (
                      <span className="text-sm font-medium">{step}</span>
                    )}
                  </div>
                  <div className="ml-3">
                    <p className={`text-sm font-medium ${currentStep >= step ? 'text-gray-900' : 'text-gray-500'}`}>
                      {title}
                    </p>
                    <p className="text-xs text-gray-500">{description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Step Content */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          {currentStep === 1 && (
            <div className="space-y-6">
              <h2 className="text-lg font-medium text-gray-900">Investigation Details</h2>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Title *
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Enter investigation title"
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Describe what you want to investigate"
                  rows={4}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Priority
                </label>
                <select
                  value={formData.priority}
                  onChange={(e) => setFormData(prev => ({ ...prev, priority: e.target.value as InvestigationPriority }))}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tags
                </label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {formData.tags.map(tag => (
                    <span
                      key={tag}
                      className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-800"
                    >
                      {tag}
                      <button
                        onClick={() => handleRemoveTag(tag)}
                        className="ml-2 inline-flex items-center justify-center w-4 h-4 rounded-full hover:bg-blue-200"
                      >
                        <XMarkIcon className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
                <input
                  type="text"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={handleAddTag}
                  placeholder="Add tags (press Enter)"
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
          )}

          {currentStep === 2 && (
            <div className="space-y-6">
              <div className="flex items-center space-x-2">
                <h2 className="text-lg font-medium text-gray-900">Select AI Agents</h2>
                <InformationCircleIcon className="h-5 w-5 text-gray-400" title="Choose which AI agents will analyze your investigation" />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {availableAgents.map(agent => {
                  const isSelected = formData.agents.some(a => a.id === agent.id);
                  return (
                    <div
                      key={agent.id}
                      className={`
                        border-2 rounded-lg p-4 cursor-pointer transition-all duration-150
                        ${isSelected
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                        }
                      `}
                      onClick={() => handleAgentToggle(agent.id)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="font-medium text-gray-900">{agent.name}</h3>
                          <p className="text-sm text-gray-600 mt-1">{agent.description}</p>
                          <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-800 mt-2">
                            {agent.type}
                          </span>
                        </div>
                        <div className={`
                          w-5 h-5 rounded border-2 flex items-center justify-center transition-colors duration-150
                          ${isSelected ? 'border-blue-500 bg-blue-500' : 'border-gray-300'}
                        `}>
                          {isSelected && <CheckIcon className="h-3 w-3 text-white" />}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <p className="text-sm text-gray-600">
                Selected {formData.agents.length} agents. You can configure individual agent settings in the next step.
              </p>
            </div>
          )}

          {currentStep === 3 && (
            <div className="space-y-6">
              <h2 className="text-lg font-medium text-gray-900">Configuration</h2>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h3 className="text-md font-medium text-gray-900">General Parameters</h3>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Time Range
                    </label>
                    <select
                      value={formData.parameters.timeRange}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        parameters: { ...prev.parameters, timeRange: e.target.value }
                      }))}
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="1h">Last 1 hour</option>
                      <option value="24h">Last 24 hours</option>
                      <option value="7d">Last 7 days</option>
                      <option value="30d">Last 30 days</option>
                      <option value="90d">Last 90 days</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Detection Threshold ({formData.parameters.threshold})
                    </label>
                    <input
                      type="range"
                      min="0.1"
                      max="1.0"
                      step="0.1"
                      value={formData.parameters.threshold}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        parameters: { ...prev.parameters, threshold: parseFloat(e.target.value) }
                      }))}
                      className="w-full"
                    />
                    <div className="flex justify-between text-xs text-gray-500 mt-1">
                      <span>Low Sensitivity</span>
                      <span>High Sensitivity</span>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={formData.parameters.includeHistorical}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          parameters: { ...prev.parameters, includeHistorical: e.target.checked }
                        }))}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <span className="ml-2 text-sm text-gray-700">Include historical data</span>
                    </label>

                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={formData.parameters.parallelAgents}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          parameters: { ...prev.parameters, parallelAgents: e.target.checked }
                        }))}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <span className="ml-2 text-sm text-gray-700">Run agents in parallel</span>
                    </label>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-md font-medium text-gray-900">Metadata (Optional)</h3>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Account ID
                    </label>
                    <input
                      type="text"
                      value={formData.metadata.accountId || ''}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        metadata: { ...prev.metadata, accountId: e.target.value }
                      }))}
                      placeholder="Enter account ID"
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      User ID
                    </label>
                    <input
                      type="text"
                      value={formData.metadata.userId || ''}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        metadata: { ...prev.metadata, userId: e.target.value }
                      }))}
                      placeholder="Enter user ID"
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      IP Address
                    </label>
                    <input
                      type="text"
                      value={formData.metadata.ipAddress || ''}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        metadata: { ...prev.metadata, ipAddress: e.target.value }
                      }))}
                      placeholder="Enter IP address"
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {currentStep === 4 && (
            <div className="space-y-6">
              <h2 className="text-lg font-medium text-gray-900">Review and Launch</h2>

              <div className="bg-gray-50 rounded-lg p-4 space-y-4">
                <div>
                  <h3 className="font-medium text-gray-900">Investigation Details</h3>
                  <div className="mt-2 space-y-1 text-sm text-gray-600">
                    <p><span className="font-medium">Title:</span> {formData.title}</p>
                    <p><span className="font-medium">Priority:</span> {formData.priority}</p>
                    {formData.description && (
                      <p><span className="font-medium">Description:</span> {formData.description}</p>
                    )}
                    {formData.tags.length > 0 && (
                      <p><span className="font-medium">Tags:</span> {formData.tags.join(', ')}</p>
                    )}
                  </div>
                </div>

                <div>
                  <h3 className="font-medium text-gray-900">Selected Agents ({formData.agents.length})</h3>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {formData.agents.map(agent => {
                      const agentInfo = availableAgents.find(a => a.id === agent.id);
                      return (
                        <span
                          key={agent.id}
                          className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-800"
                        >
                          {agentInfo?.name}
                        </span>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <h3 className="font-medium text-gray-900">Parameters</h3>
                  <div className="mt-2 space-y-1 text-sm text-gray-600">
                    <p><span className="font-medium">Time Range:</span> {formData.parameters.timeRange}</p>
                    <p><span className="font-medium">Threshold:</span> {formData.parameters.threshold}</p>
                    <p><span className="font-medium">Include Historical:</span> {formData.parameters.includeHistorical ? 'Yes' : 'No'}</p>
                    <p><span className="font-medium">Parallel Execution:</span> {formData.parameters.parallelAgents ? 'Yes' : 'No'}</p>
                  </div>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
                <div className="flex">
                  <InformationCircleIcon className="h-5 w-5 text-blue-400" />
                  <div className="ml-3">
                    <p className="text-sm text-blue-800">
                      This investigation will be launched immediately and agents will begin analysis.
                      You can monitor progress and view results from the investigation dashboard.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Navigation */}
          <div className="flex items-center justify-between pt-6 border-t border-gray-200 mt-8">
            <div>
              {currentStep > 1 && (
                <button
                  onClick={() => setCurrentStep(prev => prev - 1)}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                >
                  Back
                </button>
              )}
            </div>

            <div className="flex items-center space-x-3">
              <button
                onClick={onCancel}
                className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
              >
                Cancel
              </button>

              {currentStep < 4 ? (
                <button
                  onClick={() => setCurrentStep(prev => prev + 1)}
                  disabled={!isStepValid()}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              ) : (
                <button
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <PlayIcon className="h-4 w-4 mr-2" />
                      Launch Investigation
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};