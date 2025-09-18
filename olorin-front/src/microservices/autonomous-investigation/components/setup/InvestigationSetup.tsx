import React, { useState, useCallback } from 'react';
import { Play, Settings, User, Monitor, Timer, Database } from 'lucide-react';
import { EntityType, InvestigationEntityParams } from '../../types/investigation';

interface InvestigationSetupProps {
  onStartInvestigation: (params: InvestigationEntityParams & {
    autonomousMode: boolean;
    investigationTitle?: string;
    investigationDescription?: string;
  }) => Promise<void>;
  isLoading?: boolean;
  className?: string;
}

const InvestigationSetup: React.FC<InvestigationSetupProps> = ({
  onStartInvestigation,
  isLoading = false,
  className = ""
}) => {
  // Form state
  const [entityId, setEntityId] = useState('');
  const [entityType, setEntityType] = useState<EntityType>('userId');
  const [timeRange, setTimeRange] = useState('30d');
  const [autonomousMode, setAutonomousMode] = useState(true);
  const [investigationTitle, setInvestigationTitle] = useState('');
  const [investigationDescription, setInvestigationDescription] = useState('');

  // Form validation
  const isFormValid = entityId.trim() !== '';

  // Time range options based on legacy values
  const timeRangeOptions = [
    { value: '1d', label: '1 Day' },
    { value: '3d', label: '3 Days' },
    { value: '10d', label: '10 Days' },
    { value: '30d', label: '30 Days' },
    { value: '60d', label: '60 Days' },
    { value: '120d', label: '120 Days' },
    { value: '180d', label: '180 Days' },
    { value: '360d', label: '360 Days' }
  ];

  // Handle form submission
  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isFormValid || isLoading) return;

    try {
      await onStartInvestigation({
        entityId: entityId.trim(),
        entityType,
        timeRange,
        autonomousMode,
        investigationTitle: investigationTitle.trim() || undefined,
        investigationDescription: investigationDescription.trim() || undefined
      });
    } catch (error) {
      console.error('Failed to start investigation:', error);
    }
  }, [
    entityId, entityType, timeRange, autonomousMode,
    investigationTitle, investigationDescription,
    isFormValid, isLoading, onStartInvestigation
  ]);

  // Handle Enter key in form fields
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && isFormValid && !isLoading) {
      handleSubmit(e as React.FormEvent);
    }
  }, [handleSubmit, isFormValid, isLoading]);

  return (
    <div className={`bg-white rounded-lg border border-gray-200 shadow-sm ${className}`}>
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              Fraud Investigation System
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              Configure and start a new fraud investigation
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <Settings className="w-5 h-5 text-gray-400" />
            <span className="text-sm text-gray-500">Setup</span>
          </div>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="p-6">
        <div className="space-y-6">
          {/* Investigation Mode */}
          <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-base font-medium text-gray-900">
                  Investigation Mode
                </h3>
                <p className="text-sm text-gray-600">
                  {autonomousMode
                    ? 'Autonomous mode uses AI to run investigations automatically'
                    : 'Manual mode allows step-by-step investigation control'
                  }
                </p>
              </div>
              <div className="flex items-center space-x-2">
                <Monitor className="w-4 h-4 text-gray-400" />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <label className="flex items-center">
                  <input
                    type="radio"
                    checked={!autonomousMode}
                    onChange={() => setAutonomousMode(false)}
                    disabled={isLoading}
                    className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm font-medium text-gray-700">Manual</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    checked={autonomousMode}
                    onChange={() => setAutonomousMode(true)}
                    disabled={isLoading}
                    className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm font-medium text-gray-700">Autonomous</span>
                </label>
              </div>
            </div>
          </div>

          {/* Entity Configuration */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Entity Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Database className="w-4 h-4 inline mr-1" />
                Entity Type
              </label>
              <div className="space-y-2">
                <label className="flex items-center">
                  <input
                    type="radio"
                    value="userId"
                    checked={entityType === 'userId'}
                    onChange={(e) => setEntityType(e.target.value as EntityType)}
                    disabled={isLoading}
                    className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">User ID</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    value="deviceId"
                    checked={entityType === 'deviceId'}
                    onChange={(e) => setEntityType(e.target.value as EntityType)}
                    disabled={isLoading}
                    className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">Device ID</span>
                </label>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {entityType === 'userId'
                  ? 'Investigate by User ID for user-based analysis'
                  : 'Investigate by Device ID for device-based analysis'
                }
              </p>
            </div>

            {/* Time Range */}
            <div>
              <label htmlFor="timeRange" className="block text-sm font-medium text-gray-700 mb-2">
                <Timer className="w-4 h-4 inline mr-1" />
                Time Range
              </label>
              <select
                id="timeRange"
                value={timeRange}
                onChange={(e) => setTimeRange(e.target.value)}
                disabled={isLoading}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
              >
                {timeRangeOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-1">
                Historical data range for analysis
              </p>
            </div>
          </div>

          {/* Entity ID Input */}
          <div>
            <label htmlFor="entityId" className="block text-sm font-medium text-gray-700 mb-2">
              <User className="w-4 h-4 inline mr-1" />
              {entityType === 'userId' ? 'User ID' : 'Device ID'}
            </label>
            <input
              type="text"
              id="entityId"
              value={entityId}
              onChange={(e) => setEntityId(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={
                entityType === 'userId'
                  ? 'Enter User ID (e.g., user_12345)'
                  : 'Enter Device ID (e.g., device_abc123)'
              }
              disabled={isLoading}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              Primary identifier for the investigation target
            </p>
          </div>

          {/* Optional Investigation Details */}
          <div className="space-y-4">
            <div>
              <label htmlFor="investigationTitle" className="block text-sm font-medium text-gray-700 mb-2">
                Investigation Title (Optional)
              </label>
              <input
                type="text"
                id="investigationTitle"
                value={investigationTitle}
                onChange={(e) => setInvestigationTitle(e.target.value)}
                placeholder="Enter a descriptive title for this investigation"
                disabled={isLoading}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label htmlFor="investigationDescription" className="block text-sm font-medium text-gray-700 mb-2">
                Investigation Description (Optional)
              </label>
              <textarea
                id="investigationDescription"
                value={investigationDescription}
                onChange={(e) => setInvestigationDescription(e.target.value)}
                placeholder="Describe the purpose and context of this investigation"
                rows={3}
                disabled={isLoading}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Submit Button */}
        <div className="mt-8 flex justify-end">
          <button
            type="submit"
            disabled={!isFormValid || isLoading}
            className={`
              flex items-center space-x-2 px-6 py-3 rounded-lg font-medium text-white transition-colors
              ${isFormValid && !isLoading
                ? 'bg-blue-600 hover:bg-blue-700 shadow-sm'
                : 'bg-gray-400 cursor-not-allowed'
              }
            `}
          >
            {isLoading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Starting Investigation...</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4" />
                <span>Start Investigation</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default InvestigationSetup;