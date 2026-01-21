import React, { useState } from 'react';
import {
  ArrowRightIcon,
  ArrowLeftIcon,
  CheckIcon,
  ExclamationTriangleIcon,
  UserGroupIcon,
  CogIcon,
  PlayIcon,
} from '@heroicons/react/24/outline';

interface WizardStep {
  id: string;
  title: string;
  description: string;
  completed: boolean;
}

interface InvestigationWizardProps {
  onComplete?: (config: any) => void;
  className?: string;
}

const InvestigationWizard: React.FC<InvestigationWizardProps> = ({
  onComplete,
  className = ""
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    priority: 'medium',
    type: 'manual',
    agents: [] as string[],
    parameters: {
      userId: '',
      timeRange: '24h',
      includeTransactions: true,
      includeDeviceData: true,
      includeLocationData: true,
    }
  });

  const steps: WizardStep[] = [
    {
      id: 'basic',
      title: 'Basic Information',
      description: 'Set up investigation title, description, and priority',
      completed: false,
    },
    {
      id: 'type',
      title: 'Investigation Type',
      description: 'Choose between manual or autonomous investigation',
      completed: false,
    },
    {
      id: 'agents',
      title: 'Select Agents',
      description: 'Choose which AI agents to include in the investigation',
      completed: false,
    },
    {
      id: 'parameters',
      title: 'Parameters',
      description: 'Configure investigation parameters and data sources',
      completed: false,
    },
    {
      id: 'review',
      title: 'Review & Launch',
      description: 'Review your configuration and start the investigation',
      completed: false,
    },
  ];

  const availableAgents = [
    { id: 'location', name: 'Location Agent', description: 'Analyzes geographic and location data' },
    { id: 'device', name: 'Device Agent', description: 'Examines device fingerprints and characteristics' },
    { id: 'network', name: 'Network Agent', description: 'Investigates network patterns and connections' },
    { id: 'transaction', name: 'Transaction Agent', description: 'Reviews financial transactions and patterns' },
    { id: 'behavior', name: 'Behavior Agent', description: 'Analyzes user behavior patterns' },
    { id: 'document', name: 'Document Agent', description: 'Processes and analyzes documents' },
  ];

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = () => {
    if (onComplete) {
      onComplete(formData);
    }
  };

  const updateFormData = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const updateParameters = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      parameters: {
        ...prev.parameters,
        [field]: value
      }
    }));
  };

  const isStepValid = () => {
    switch (currentStep) {
      case 0:
        return formData.title.length > 0 && formData.description.length > 0;
      case 1:
        return formData.type !== '';
      case 2:
        return formData.agents.length > 0;
      case 3:
        return formData.parameters.userId.length > 0;
      case 4:
        return true;
      default:
        return false;
    }
  };

  return (
    <div className={`investigation-wizard p-6 ${className}`}>
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">New Investigation</h1>
          <p className="text-gray-600">Create a new fraud investigation with guided setup</p>
        </div>

        {/* Progress Steps */}
        <div className="mb-8">
          <nav aria-label="Progress">
            <ol className="flex items-center">
              {steps.map((step, index) => (
                <li key={step.id} className={`relative ${index !== steps.length - 1 ? 'pr-8 sm:pr-20' : ''}`}>
                  <div className="flex items-center">
                    <div className={`relative flex h-8 w-8 items-center justify-center rounded-full border-2 ${
                      index < currentStep
                        ? 'bg-blue-600 border-blue-600'
                        : index === currentStep
                        ? 'border-blue-600 bg-white'
                        : 'border-gray-300 bg-white'
                    }`}>
                      {index < currentStep ? (
                        <CheckIcon className="h-5 w-5 text-white" />
                      ) : (
                        <span className={`text-sm font-medium ${
                          index === currentStep ? 'text-blue-600' : 'text-gray-500'
                        }`}>
                          {index + 1}
                        </span>
                      )}
                    </div>
                    <span className={`ml-3 text-sm font-medium ${
                      index <= currentStep ? 'text-blue-600' : 'text-gray-500'
                    }`}>
                      {step.title}
                    </span>
                  </div>
                  {index !== steps.length - 1 && (
                    <div className="absolute top-4 left-4 -ml-px mt-0.5 h-0.5 w-full bg-gray-300" />
                  )}
                </li>
              ))}
            </ol>
          </nav>
        </div>

        {/* Step Content */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-8">
          <div className="mb-6">
            <h2 className="text-lg font-medium text-gray-900">{steps[currentStep].title}</h2>
            <p className="text-sm text-gray-600 mt-1">{steps[currentStep].description}</p>
          </div>

          {/* Step 0: Basic Information */}
          {currentStep === 0 && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Investigation Title *
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => updateFormData('title', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter investigation title..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description *
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => updateFormData('description', e.target.value)}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Describe the investigation purpose and scope..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Priority Level
                </label>
                <select
                  value={formData.priority}
                  onChange={(e) => updateFormData('priority', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>
              </div>
            </div>
          )}

          {/* Step 1: Investigation Type */}
          {currentStep === 1 && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div
                  className={`p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                    formData.type === 'manual'
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => updateFormData('type', 'manual')}
                >
                  <div className="flex items-center space-x-3">
                    <UserGroupIcon className="h-8 w-8 text-blue-600" />
                    <div>
                      <h3 className="font-medium text-gray-900">Manual Investigation</h3>
                      <p className="text-sm text-gray-600">Human-led investigation with AI assistance</p>
                    </div>
                  </div>
                </div>
                <div
                  className={`p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                    formData.type === 'autonomous'
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => updateFormData('type', 'autonomous')}
                >
                  <div className="flex items-center space-x-3">
                    <CogIcon className="h-8 w-8 text-blue-600" />
                    <div>
                      <h3 className="font-medium text-gray-900">Autonomous Investigation</h3>
                      <p className="text-sm text-gray-600">AI-driven investigation with minimal human oversight</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Select Agents */}
          {currentStep === 2 && (
            <div className="space-y-4">
              <p className="text-sm text-gray-600">Select the AI agents you want to include in this investigation:</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {availableAgents.map(agent => (
                  <div
                    key={agent.id}
                    className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                      formData.agents.includes(agent.id)
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => {
                      const newAgents = formData.agents.includes(agent.id)
                        ? formData.agents.filter(id => id !== agent.id)
                        : [...formData.agents, agent.id];
                      updateFormData('agents', newAgents);
                    }}
                  >
                    <div className="flex items-start space-x-3">
                      <div className={`mt-1 w-4 h-4 rounded border-2 ${
                        formData.agents.includes(agent.id)
                          ? 'bg-blue-600 border-blue-600'
                          : 'border-gray-300'
                      }`}>
                        {formData.agents.includes(agent.id) && (
                          <CheckIcon className="w-3 h-3 text-white" />
                        )}
                      </div>
                      <div>
                        <h3 className="font-medium text-gray-900">{agent.name}</h3>
                        <p className="text-sm text-gray-600">{agent.description}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Step 3: Parameters */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  User ID or Account *
                </label>
                <input
                  type="text"
                  value={formData.parameters.userId}
                  onChange={(e) => updateParameters('userId', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter user ID or account identifier..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Time Range
                </label>
                <select
                  value={formData.parameters.timeRange}
                  onChange={(e) => updateParameters('timeRange', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="1h">Last 1 hour</option>
                  <option value="24h">Last 24 hours</option>
                  <option value="7d">Last 7 days</option>
                  <option value="30d">Last 30 days</option>
                  <option value="custom">Custom range</option>
                </select>
              </div>
              <div className="space-y-3">
                <label className="block text-sm font-medium text-gray-700">
                  Data Sources
                </label>
                {[
                  { key: 'includeTransactions', label: 'Transaction Data' },
                  { key: 'includeDeviceData', label: 'Device Information' },
                  { key: 'includeLocationData', label: 'Location Data' },
                ].map(option => (
                  <div key={option.key} className="flex items-center">
                    <input
                      id={option.key}
                      type="checkbox"
                      checked={formData.parameters[option.key as keyof typeof formData.parameters] as boolean}
                      onChange={(e) => updateParameters(option.key, e.target.checked)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label htmlFor={option.key} className="ml-2 block text-sm text-gray-900">
                      {option.label}
                    </label>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Step 4: Review */}
          {currentStep === 4 && (
            <div className="space-y-6">
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-medium text-gray-900 mb-4">Investigation Summary</h3>
                <dl className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <dt className="font-medium text-gray-700">Title:</dt>
                    <dd className="text-gray-900">{formData.title}</dd>
                  </div>
                  <div>
                    <dt className="font-medium text-gray-700">Type:</dt>
                    <dd className="text-gray-900 capitalize">{formData.type}</dd>
                  </div>
                  <div>
                    <dt className="font-medium text-gray-700">Priority:</dt>
                    <dd className="text-gray-900 capitalize">{formData.priority}</dd>
                  </div>
                  <div>
                    <dt className="font-medium text-gray-700">Target User:</dt>
                    <dd className="text-gray-900">{formData.parameters.userId}</dd>
                  </div>
                  <div className="md:col-span-2">
                    <dt className="font-medium text-gray-700">Selected Agents:</dt>
                    <dd className="text-gray-900">
                      {formData.agents.map(agentId =>
                        availableAgents.find(a => a.id === agentId)?.name
                      ).join(', ')}
                    </dd>
                  </div>
                </dl>
              </div>
              <div className="flex items-center space-x-2 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <ExclamationTriangleIcon className="h-5 w-5 text-yellow-600" />
                <p className="text-sm text-yellow-800">
                  Once launched, this investigation will begin immediately. Make sure all settings are correct.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between">
          <button
            onClick={handlePrevious}
            disabled={currentStep === 0}
            className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ArrowLeftIcon className="h-4 w-4 mr-2" />
            Previous
          </button>

          <div className="flex space-x-3">
            {currentStep === steps.length - 1 ? (
              <button
                onClick={handleComplete}
                disabled={!isStepValid()}
                className="inline-flex items-center px-6 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <PlayIcon className="h-4 w-4 mr-2" />
                Launch Investigation
              </button>
            ) : (
              <button
                onClick={handleNext}
                disabled={!isStepValid()}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
                <ArrowRightIcon className="h-4 w-4 ml-2" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default InvestigationWizard;