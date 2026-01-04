import React from 'react';
import { SimpleStepStatusBadge } from './SimpleStepStatusBadge';

interface InvestigationStep {
  id: string;
  name: string;
  description?: string;
  status: 'pending' | 'ready' | 'running' | 'completed' | 'failed' | 'skipped';
  order_index: number;
  execution_time?: number;
  retry_count?: number;
  max_retries?: number;
  current_operation?: string;
}

interface SimpleStepTrackerProps {
  steps: InvestigationStep[];
  currentStepId?: string;
  onStepClick?: (step: InvestigationStep) => void;
  layout?: 'vertical' | 'horizontal';
  showProgress?: boolean;
  className?: string;
}

export const SimpleStepTracker: React.FC<SimpleStepTrackerProps> = ({
  steps,
  currentStepId,
  onStepClick,
  layout = 'vertical',
  showProgress = true,
  className = ''
}) => {
  const getStepIcon = (status: InvestigationStep['status']) => {
    switch (status) {
      case 'completed':
        return (
          <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
        );
      case 'running':
        return (
          <svg className="w-5 h-5 text-white animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
        );
      case 'failed':
        return (
          <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        );
      case 'skipped':
        return (
          <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M3 10a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
          </svg>
        );
      default:
        return (
          <span className="text-white text-xs font-medium">
            {steps.findIndex(s => s.id === currentStepId) + 1 || 1}
          </span>
        );
    }
  };

  const getStepColor = (step: InvestigationStep) => {
    if (step.id === currentStepId) {
      return 'bg-blue-600 border-blue-600';
    }

    switch (step.status) {
      case 'completed':
        return 'bg-green-600 border-green-600';
      case 'running':
        return 'bg-blue-600 border-blue-600';
      case 'failed':
        return 'bg-red-600 border-red-600';
      case 'skipped':
        return 'bg-gray-400 border-gray-400';
      case 'ready':
        return 'bg-blue-100 border-blue-300 text-blue-600';
      default:
        return 'bg-gray-100 border-gray-300 text-gray-600';
    }
  };

  const getConnectorColor = (fromStep: InvestigationStep, toStep: InvestigationStep) => {
    if (fromStep.status === 'completed') {
      return 'bg-green-600';
    }
    if (fromStep.status === 'running' || fromStep.id === currentStepId) {
      return 'bg-blue-600';
    }
    return 'bg-gray-300';
  };

  const getProgressPercentage = () => {
    if (steps.length === 0) return 0;
    const completedSteps = steps.filter(step => step.status === 'completed').length;
    return (completedSteps / steps.length) * 100;
  };

  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${Math.round(ms / 1000)}s`;
    return `${Math.round(ms / 60000)}m`;
  };

  if (steps.length === 0) {
    return (
      <div className={`text-center py-8 ${className}`}>
        <svg
          className="mx-auto h-12 w-12 text-gray-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
          />
        </svg>
        <h3 className="mt-2 text-sm font-medium text-gray-900">No Steps Defined</h3>
        <p className="mt-1 text-sm text-gray-500">
          Investigation steps will appear here once configured.
        </p>
      </div>
    );
  }

  if (layout === 'horizontal') {
    return (
      <div className={`${className}`}>
        {/* Progress Bar */}
        {showProgress && (
          <div className="mb-6">
            <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
              <span>Progress</span>
              <span>{Math.round(getProgressPercentage())}% Complete</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${getProgressPercentage()}%` }}
              />
            </div>
          </div>
        )}

        {/* Horizontal Steps */}
        <div className="flex items-center justify-between">
          {steps.map((step, index) => (
            <React.Fragment key={step.id}>
              <div className="flex flex-col items-center">
                <button
                  onClick={() => onStepClick?.(step)}
                  className={`w-10 h-10 rounded-full border-2 flex items-center justify-center transition-colors ${getStepColor(step)} ${
                    onStepClick ? 'hover:opacity-80 cursor-pointer' : ''
                  }`}
                  disabled={!onStepClick}
                >
                  {getStepIcon(step.status)}
                </button>

                <div className="mt-2 text-center max-w-24">
                  <p className="text-xs font-medium text-gray-900 truncate">{step.name}</p>
                  <SimpleStepStatusBadge status={step.status} className="mt-1" />
                  {step.execution_time && (
                    <p className="text-xs text-gray-500 mt-1">
                      {formatDuration(step.execution_time)}
                    </p>
                  )}
                </div>
              </div>

              {/* Connector */}
              {index < steps.length - 1 && (
                <div className="flex-1 mx-4">
                  <div className={`h-0.5 transition-colors ${getConnectorColor(step, steps[index + 1])}`} />
                </div>
              )}
            </React.Fragment>
          ))}
        </div>
      </div>
    );
  }

  // Vertical Layout
  return (
    <div className={`${className}`}>
      {/* Progress Summary */}
      {showProgress && (
        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium text-gray-700">Investigation Progress</span>
            <span className="text-gray-600">
              {steps.filter(s => s.status === 'completed').length}/{steps.length} steps completed
            </span>
          </div>
          <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${getProgressPercentage()}%` }}
            />
          </div>
        </div>
      )}

      {/* Vertical Steps */}
      <div className="space-y-6">
        {steps.map((step, index) => (
          <div key={step.id} className="relative">
            <div className="flex items-start">
              {/* Step Icon */}
              <div className="flex-shrink-0">
                <button
                  onClick={() => onStepClick?.(step)}
                  className={`w-10 h-10 rounded-full border-2 flex items-center justify-center transition-colors ${getStepColor(step)} ${
                    onStepClick ? 'hover:opacity-80 cursor-pointer' : ''
                  }`}
                  disabled={!onStepClick}
                >
                  {getStepIcon(step.status)}
                </button>
              </div>

              {/* Step Content */}
              <div className="ml-4 flex-1">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium text-gray-900">{step.name}</h3>
                  <SimpleStepStatusBadge status={step.status} />
                </div>

                {step.description && (
                  <p className="mt-1 text-sm text-gray-600">{step.description}</p>
                )}

                <div className="mt-2 flex items-center space-x-4 text-xs text-gray-500">
                  <span>Step #{step.order_index + 1}</span>
                  {step.execution_time && (
                    <span>Duration: {formatDuration(step.execution_time)}</span>
                  )}
                  {step.retry_count && step.retry_count > 0 && (
                    <span>Retries: {step.retry_count}/{step.max_retries || 3}</span>
                  )}
                </div>

                {step.current_operation && step.status === 'running' && (
                  <p className="mt-2 text-sm text-blue-600 italic">{step.current_operation}</p>
                )}
              </div>
            </div>

            {/* Vertical Connector */}
            {index < steps.length - 1 && (
              <div className="absolute top-10 left-5 w-0.5 h-6 -ml-px">
                <div className={`h-full transition-colors ${getConnectorColor(step, steps[index + 1])}`} />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};