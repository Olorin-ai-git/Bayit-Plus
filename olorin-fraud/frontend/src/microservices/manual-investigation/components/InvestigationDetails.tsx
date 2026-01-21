import React, { useState } from 'react';
import { Investigation } from '../types';
import { InvestigationStatusBadge } from './InvestigationStatusBadge';
import { InvestigationPriorityBadge } from './InvestigationPriorityBadge';

interface InvestigationDetailsProps {
  investigation: Investigation;
  onUpdateInvestigation?: (investigation: Investigation) => void;
  className?: string;
}

export const InvestigationDetails: React.FC<InvestigationDetailsProps> = ({
  investigation,
  onUpdateInvestigation,
  className = ''
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedInvestigation, setEditedInvestigation] = useState(investigation);

  const handleSave = () => {
    onUpdateInvestigation?.(editedInvestigation);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditedInvestigation(investigation);
    setIsEditing(false);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getProgressPercentage = () => {
    if (investigation.steps.length === 0) return 0;
    const completedSteps = investigation.steps.filter(step => step.status === 'completed').length;
    return Math.round((completedSteps / investigation.steps.length) * 100);
  };

  const getStatusColor = (status: Investigation['status']) => {
    switch (status) {
      case 'completed': return 'text-green-600';
      case 'running': return 'text-blue-600';
      case 'failed': return 'text-red-600';
      case 'cancelled': return 'text-red-600';
      case 'paused': return 'text-yellow-600';
      default: return 'text-gray-600';
    }
  };

  const addTag = (tag: string) => {
    if (tag.trim() && !editedInvestigation.tags.includes(tag.trim())) {
      setEditedInvestigation(prev => ({
        ...prev,
        tags: [...prev.tags, tag.trim()]
      }));
    }
  };

  const removeTag = (tagToRemove: string) => {
    setEditedInvestigation(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }));
  };

  return (
    <div className={`bg-white border border-gray-200 rounded-lg shadow-sm ${className}`}>
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <h2 className="text-xl font-semibold text-gray-900">Investigation Details</h2>
            <InvestigationStatusBadge status={investigation.status} />
            <InvestigationPriorityBadge priority={investigation.priority} />
          </div>

          {!isEditing && (
            <button
              onClick={() => setIsEditing(true)}
              className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
            >
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              Edit
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="px-6 py-6 space-y-6">
        {/* Basic Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Basic Information</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700">Name</label>
                {isEditing ? (
                  <input
                    type="text"
                    value={editedInvestigation.name}
                    onChange={(e) => setEditedInvestigation(prev => ({ ...prev, name: e.target.value }))}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                ) : (
                  <p className="mt-1 text-sm text-gray-900">{investigation.name}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Description</label>
                {isEditing ? (
                  <textarea
                    value={editedInvestigation.description}
                    onChange={(e) => setEditedInvestigation(prev => ({ ...prev, description: e.target.value }))}
                    rows={3}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                ) : (
                  <p className="mt-1 text-sm text-gray-600">{investigation.description || 'No description provided'}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Entity</label>
                <p className="mt-1 text-sm text-gray-900">
                  {investigation.entity_type}: {investigation.entity_id}
                </p>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Progress & Status</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700">Progress</label>
                <div className="mt-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">{getProgressPercentage()}% Complete</span>
                    <span className="text-gray-600">
                      {investigation.steps.filter(s => s.status === 'completed').length}/{investigation.steps.length} steps
                    </span>
                  </div>
                  <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${getProgressPercentage()}%` }}
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Status</label>
                <p className={`mt-1 text-sm font-medium ${getStatusColor(investigation.status)}`}>
                  {investigation.status.charAt(0).toUpperCase() + investigation.status.slice(1)}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Priority</label>
                {isEditing ? (
                  <select
                    value={editedInvestigation.priority}
                    onChange={(e) => setEditedInvestigation(prev => ({ ...prev, priority: e.target.value as Investigation['priority'] }))}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                  </select>
                ) : (
                  <p className="mt-1 text-sm text-gray-900">
                    {investigation.priority.charAt(0).toUpperCase() + investigation.priority.slice(1)}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Tags */}
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-4">Tags</h3>
          {isEditing ? (
            <div className="space-y-2">
              <div className="flex flex-wrap gap-2">
                {editedInvestigation.tags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800"
                  >
                    {tag}
                    <button
                      type="button"
                      onClick={() => removeTag(tag)}
                      className="ml-2 text-blue-600 hover:text-blue-800"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
              <input
                type="text"
                placeholder="Add new tag..."
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    addTag(e.currentTarget.value);
                    e.currentTarget.value = '';
                  }
                }}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {investigation.tags.length > 0 ? (
                investigation.tags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-800"
                  >
                    {tag}
                  </span>
                ))
              ) : (
                <p className="text-sm text-gray-500">No tags assigned</p>
              )}
            </div>
          )}
        </div>

        {/* Timestamps */}
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-4">Timeline</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-medium text-gray-700">Created:</span>
              <span className="ml-2 text-gray-600">{formatDate(investigation.created_at)}</span>
            </div>
            <div>
              <span className="font-medium text-gray-700">Last Updated:</span>
              <span className="ml-2 text-gray-600">{formatDate(investigation.updated_at)}</span>
            </div>
          </div>
        </div>

        {/* Edit Actions */}
        {isEditing && (
          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
            <button
              onClick={handleCancel}
              className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
            >
              Save Changes
            </button>
          </div>
        )}
      </div>
    </div>
  );
};