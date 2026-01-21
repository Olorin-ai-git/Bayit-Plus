import React, { useState } from 'react';
import {
  XMarkIcon,
  InformationCircleIcon,
  CheckIcon,
  PlayIcon,
  UserIcon,
  DocumentTextIcon,
  ClockIcon
} from '@heroicons/react/24/outline';

interface Investigation {
  id: string;
  title: string;
  status: 'active' | 'completed' | 'paused';
  priority: 'low' | 'medium' | 'high';
  created_at: string;
  description: string;
  riskScore?: number;
  progress?: number;
  assignedAgents?: string[];
  updatedAt?: string;
}

interface EnhancedCreateInvestigationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateInvestigation: (investigation: Partial<Investigation>) => Promise<Investigation>;
}

interface FormData {
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high';
  investigators: string[];
  methodology: {
    approach: 'reactive' | 'proactive' | 'hybrid';
    timeline: string;
    expectedDuration: number;
    urgencyLevel: string;
  };
  parameters: {
    dataSource: string[];
    includeHistorical: boolean;
    riskThreshold: number;
    requireApproval: boolean;
  };
  metadata: {
    accountId?: string;
    userId?: string;
    transactionId?: string;
    ipAddress?: string;
    entityType?: string;
  };
  tags: string[];
}

const availableInvestigators = [
  {
    id: 'fraud-specialist-1',
    name: 'Sarah Chen',
    role: 'Senior Fraud Analyst',
    expertise: 'Transaction patterns, Money laundering',
    availability: 'available'
  },
  {
    id: 'fraud-specialist-2',
    name: 'Marcus Rodriguez',
    role: 'Identity Verification Expert',
    expertise: 'KYC, Document verification',
    availability: 'available'
  },
  {
    id: 'fraud-specialist-3',
    name: 'Lisa Thompson',
    role: 'Behavioral Analyst',
    expertise: 'User behavior, Account takeover',
    availability: 'busy'
  },
  {
    id: 'fraud-specialist-4',
    name: 'David Kim',
    role: 'Technical Investigator',
    expertise: 'Device fingerprinting, Network analysis',
    availability: 'available'
  }
];

export const EnhancedCreateInvestigationModal: React.FC<EnhancedCreateInvestigationModalProps> = ({
  isOpen,
  onClose,
  onCreateInvestigation,
}) => {
  const [formData, setFormData] = useState<FormData>({
    title: '',
    description: '',
    priority: 'medium',
    investigators: [],
    methodology: {
      approach: 'reactive',
      timeline: '7d',
      expectedDuration: 8, // 8 hours
      urgencyLevel: 'normal',
    },
    parameters: {
      dataSource: ['transactions', 'logs'],
      includeHistorical: true,
      riskThreshold: 0.7,
      requireApproval: false,
    },
    metadata: {},
    tags: [],
  });

  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [tagInput, setTagInput] = useState('');

  if (!isOpen) return null;

  const handleInvestigatorToggle = (investigatorId: string) => {
    setFormData(prev => {
      const isSelected = prev.investigators.includes(investigatorId);
      if (isSelected) {
        return {
          ...prev,
          investigators: prev.investigators.filter(id => id !== investigatorId),
        };
      } else {
        return {
          ...prev,
          investigators: [...prev.investigators, investigatorId],
        };
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

    if (formData.investigators.length === 0) {
      alert('Please assign at least one investigator');
      return;
    }

    setIsSubmitting(true);

    try {
      const investigation: Partial<Investigation> = {
        title: formData.title,
        description: formData.description,
        priority: formData.priority,
        assignedAgents: formData.investigators,
        // Additional metadata for manual investigations
      };

      await onCreateInvestigation(investigation);

      // Reset form
      setFormData({
        title: '',
        description: '',
        priority: 'medium',
        investigators: [],
        methodology: {
          approach: 'reactive',
          timeline: '7d',
          expectedDuration: 8,
          urgencyLevel: 'normal',
        },
        parameters: {
          dataSource: ['transactions', 'logs'],
          includeHistorical: true,
          riskThreshold: 0.7,
          requireApproval: false,
        },
        metadata: {},
        tags: [],
      });
      setCurrentStep(1);
      onClose();
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
        return formData.investigators.length > 0;
      case 3:
        return true; // Methodology step is always valid with defaults
      default:
        return false;
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-screen overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">Create Manual Investigation</h1>
            <p className="text-sm text-gray-600 mt-1">Configure and assign a human-guided investigation</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-md"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        {/* Progress Steps */}
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center space-x-8">
            {[
              { step: 1, title: 'Case Details', description: 'Investigation information', icon: DocumentTextIcon },
              { step: 2, title: 'Assign Team', description: 'Select investigators', icon: UserIcon },
              { step: 3, title: 'Methodology', description: 'Configure approach', icon: ClockIcon },
              { step: 4, title: 'Review', description: 'Confirm and start', icon: CheckIcon },
            ].map(({ step, title, description, icon: Icon }) => (
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
                    <Icon className="h-4 w-4" />
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

        {/* Step Content */}
        <div className="p-6">
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
                  placeholder="Describe the suspected fraud or issue to investigate"
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
                  onChange={(e) => setFormData(prev => ({ ...prev, priority: e.target.value as 'low' | 'medium' | 'high' }))}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
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
                <h2 className="text-lg font-medium text-gray-900">Assign Investigation Team</h2>
                <InformationCircleIcon className="h-5 w-5 text-gray-400" title="Select fraud investigators for this case" />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {availableInvestigators.map(investigator => {
                  const isSelected = formData.investigators.includes(investigator.id);
                  const isAvailable = investigator.availability === 'available';

                  return (
                    <div
                      key={investigator.id}
                      className={`
                        border-2 rounded-lg p-4 cursor-pointer transition-all duration-150
                        ${!isAvailable ? 'opacity-60 cursor-not-allowed' : ''}
                        ${isSelected
                          ? 'border-blue-500 bg-blue-50'
                          : isAvailable
                            ? 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                            : 'border-gray-200 bg-gray-50'
                        }
                      `}
                      onClick={() => isAvailable && handleInvestigatorToggle(investigator.id)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="font-medium text-gray-900">{investigator.name}</h3>
                          <p className="text-sm text-gray-600 mt-1">{investigator.role}</p>
                          <p className="text-xs text-gray-500 mt-1">{investigator.expertise}</p>
                          <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium mt-2 ${
                            isAvailable ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                          }`}>
                            {investigator.availability}
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
                Selected {formData.investigators.length} investigators. You can configure investigation methodology in the next step.
              </p>
            </div>
          )}

          {currentStep === 3 && (
            <div className="space-y-6">
              <h2 className="text-lg font-medium text-gray-900">Investigation Methodology</h2>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h3 className="text-md font-medium text-gray-900">Approach & Timeline</h3>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Investigation Approach
                    </label>
                    <select
                      value={formData.methodology.approach}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        methodology: { ...prev.methodology, approach: e.target.value as 'reactive' | 'proactive' | 'hybrid' }
                      }))}
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="reactive">Reactive - Response to known incident</option>
                      <option value="proactive">Proactive - Preventive investigation</option>
                      <option value="hybrid">Hybrid - Mixed approach</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Expected Duration ({formData.methodology.expectedDuration} hours)
                    </label>
                    <input
                      type="range"
                      min="1"
                      max="40"
                      step="1"
                      value={formData.methodology.expectedDuration}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        methodology: { ...prev.methodology, expectedDuration: parseInt(e.target.value) }
                      }))}
                      className="w-full"
                    />
                    <div className="flex justify-between text-xs text-gray-500 mt-1">
                      <span>1 hour</span>
                      <span>40 hours</span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Risk Threshold ({formData.parameters.riskThreshold})
                    </label>
                    <input
                      type="range"
                      min="0.1"
                      max="1.0"
                      step="0.1"
                      value={formData.parameters.riskThreshold}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        parameters: { ...prev.parameters, riskThreshold: parseFloat(e.target.value) }
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
                      <span className="ml-2 text-sm text-gray-700">Include historical data analysis</span>
                    </label>

                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={formData.parameters.requireApproval}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          parameters: { ...prev.parameters, requireApproval: e.target.checked }
                        }))}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <span className="ml-2 text-sm text-gray-700">Require supervisor approval</span>
                    </label>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-md font-medium text-gray-900">Case Context (Optional)</h3>

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
                      Transaction ID
                    </label>
                    <input
                      type="text"
                      value={formData.metadata.transactionId || ''}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        metadata: { ...prev.metadata, transactionId: e.target.value }
                      }))}
                      placeholder="Enter transaction ID"
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {currentStep === 4 && (
            <div className="space-y-6">
              <h2 className="text-lg font-medium text-gray-900">Review and Start Investigation</h2>

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
                  <h3 className="font-medium text-gray-900">Assigned Team ({formData.investigators.length})</h3>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {formData.investigators.map(investigatorId => {
                      const investigator = availableInvestigators.find(inv => inv.id === investigatorId);
                      return (
                        <span
                          key={investigatorId}
                          className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-800"
                        >
                          {investigator?.name}
                        </span>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <h3 className="font-medium text-gray-900">Methodology</h3>
                  <div className="mt-2 space-y-1 text-sm text-gray-600">
                    <p><span className="font-medium">Approach:</span> {formData.methodology.approach}</p>
                    <p><span className="font-medium">Expected Duration:</span> {formData.methodology.expectedDuration} hours</p>
                    <p><span className="font-medium">Risk Threshold:</span> {formData.parameters.riskThreshold}</p>
                    <p><span className="font-medium">Include Historical:</span> {formData.parameters.includeHistorical ? 'Yes' : 'No'}</p>
                    <p><span className="font-medium">Require Approval:</span> {formData.parameters.requireApproval ? 'Yes' : 'No'}</p>
                  </div>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
                <div className="flex">
                  <InformationCircleIcon className="h-5 w-5 text-blue-400" />
                  <div className="ml-3">
                    <p className="text-sm text-blue-800">
                      This investigation will be assigned to the selected team members and they will receive notifications to start their analysis.
                      You can monitor progress and collaborate on findings from the investigation dashboard.
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
                onClick={onClose}
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
                      Start Investigation
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