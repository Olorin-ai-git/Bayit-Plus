import React, { useState, useEffect } from 'react';
import {
  ManualInvestigation,
  InvestigationStep,
  Evidence,
  Timeline,
  StepStatus,
  ManualInvestigationStatus,
  Collaborator
} from '../types/manualInvestigation';

interface ManualInvestigationDetailsProps {
  investigation: ManualInvestigation;
  onUpdateInvestigation: (investigation: ManualInvestigation) => void;
  onUpdateStep: (stepId: string, updates: Partial<InvestigationStep>) => void;
  onAddEvidence: (evidence: Omit<Evidence, 'id'>) => void;
  onAddCollaborator: (collaborator: Omit<Collaborator, 'id'>) => void;
  onChangeStatus: (status: ManualInvestigationStatus) => void;
  currentUserId: string;
  isLoading?: boolean;
}

export const ManualInvestigationDetails: React.FC<ManualInvestigationDetailsProps> = ({
  investigation,
  onUpdateInvestigation,
  onUpdateStep,
  onAddEvidence,
  onAddCollaborator,
  onChangeStatus,
  currentUserId,
  isLoading = false
}) => {
  const [activeTab, setActiveTab] = useState<'steps' | 'evidence' | 'timeline' | 'collaborators'>('steps');
  const [selectedStepId, setSelectedStepId] = useState<string | null>(null);
  const [showAddEvidenceModal, setShowAddEvidenceModal] = useState(false);
  const [showAddCollaboratorModal, setShowAddCollaboratorModal] = useState(false);

  const completedSteps = investigation.steps.filter(step => step.status === 'completed').length;
  const progressPercentage = Math.round((completedSteps / investigation.steps.length) * 100);

  const getStatusBadgeClass = (status: ManualInvestigationStatus | StepStatus) => {
    const baseClasses = 'px-3 py-1 rounded-full text-sm font-medium';
    switch (status) {
      case 'draft':
        return `${baseClasses} bg-gray-100 text-gray-800`;
      case 'in_progress':
        return `${baseClasses} bg-blue-100 text-blue-800`;
      case 'under_review':
        return `${baseClasses} bg-yellow-100 text-yellow-800`;
      case 'completed':
        return `${baseClasses} bg-green-100 text-green-800`;
      case 'cancelled':
        return `${baseClasses} bg-red-100 text-red-800`;
      case 'on_hold':
        return `${baseClasses} bg-gray-100 text-gray-800`;
      case 'pending':
        return `${baseClasses} bg-gray-100 text-gray-800`;
      case 'blocked':
        return `${baseClasses} bg-red-100 text-red-800`;
      case 'skipped':
        return `${baseClasses} bg-orange-100 text-orange-800`;
      case 'requires_review':
        return `${baseClasses} bg-purple-100 text-purple-800`;
      default:
        return `${baseClasses} bg-gray-100 text-gray-800`;
    }
  };

  const getPriorityBadgeClass = (priority: string) => {
    const baseClasses = 'px-2 py-1 rounded text-xs font-medium';
    switch (priority) {
      case 'critical':
        return `${baseClasses} bg-red-100 text-red-800`;
      case 'high':
        return `${baseClasses} bg-orange-100 text-orange-800`;
      case 'medium':
        return `${baseClasses} bg-yellow-100 text-yellow-800`;
      case 'low':
        return `${baseClasses} bg-green-100 text-green-800`;
      default:
        return `${baseClasses} bg-gray-100 text-gray-800`;
    }
  };

  const handleStepStatusChange = (stepId: string, newStatus: StepStatus) => {
    const step = investigation.steps.find(s => s.id === stepId);
    if (!step) return;

    const updates: Partial<InvestigationStep> = {
      status: newStatus,
      ...(newStatus === 'in_progress' && !step.startedAt ? { startedAt: new Date().toISOString() } : {}),
      ...(newStatus === 'completed' && !step.completedAt ? {
        completedAt: new Date().toISOString(),
        actualDuration: step.startedAt ? Math.round((Date.now() - new Date(step.startedAt).getTime()) / 60000) : undefined
      } : {})
    };

    onUpdateStep(stepId, updates);
  };

  const canEditInvestigation = () => {
    const userCollaborator = investigation.collaborators.find(c => c.id === currentUserId);
    return userCollaborator?.permissions.canEdit || investigation.leadInvestigator === currentUserId;
  };

  const canAssignSteps = () => {
    const userCollaborator = investigation.collaborators.find(c => c.id === currentUserId);
    return userCollaborator?.permissions.canAssignSteps || investigation.leadInvestigator === currentUserId;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header Section */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-2xl font-bold text-gray-900">{investigation.title}</h1>
              <span className={getStatusBadgeClass(investigation.status)}>
                {investigation.status.replace('_', ' ')}
              </span>
              <span className={getPriorityBadgeClass(investigation.priority)}>
                {investigation.priority}
              </span>
            </div>
            <p className="text-gray-600 mb-4">{investigation.description}</p>

            {/* Progress Bar */}
            <div className="mb-4">
              <div className="flex items-center justify-between text-sm text-gray-600 mb-1">
                <span>Investigation Progress</span>
                <span>{completedSteps}/{investigation.steps.length} steps completed ({progressPercentage}%)</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${progressPercentage}%` }}
                ></div>
              </div>
            </div>

            {/* Key Information */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="text-gray-500">Type:</span>
                <span className="ml-2 font-medium">{investigation.type.replace('_', ' ')}</span>
              </div>
              <div>
                <span className="text-gray-500">Created:</span>
                <span className="ml-2 font-medium">{new Date(investigation.createdAt).toLocaleDateString()}</span>
              </div>
              <div>
                <span className="text-gray-500">Lead Investigator:</span>
                <span className="ml-2 font-medium">{investigation.leadInvestigator}</span>
              </div>
              <div>
                <span className="text-gray-500">Due Date:</span>
                <span className="ml-2 font-medium">
                  {investigation.dueDate ? new Date(investigation.dueDate).toLocaleDateString() : 'Not set'}
                </span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          {canEditInvestigation() && (
            <div className="flex gap-2 ml-6">
              {investigation.status === 'draft' && (
                <button
                  onClick={() => onChangeStatus('in_progress')}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                >
                  Start Investigation
                </button>
              )}
              {investigation.status === 'in_progress' && (
                <>
                  <button
                    onClick={() => onChangeStatus('on_hold')}
                    className="px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700 transition-colors"
                  >
                    Put on Hold
                  </button>
                  <button
                    onClick={() => onChangeStatus('under_review')}
                    className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors"
                  >
                    Submit for Review
                  </button>
                </>
              )}
              {investigation.status === 'under_review' && (
                <button
                  onClick={() => onChangeStatus('completed')}
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
                >
                  Mark Complete
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6">
            {(['steps', 'evidence', 'timeline', 'collaborators'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`py-4 px-2 border-b-2 font-medium text-sm capitalize transition-colors ${
                  activeTab === tab
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab}
                {tab === 'steps' && (
                  <span className="ml-2 bg-gray-100 text-gray-600 py-1 px-2 rounded-full text-xs">
                    {investigation.steps.length}
                  </span>
                )}
                {tab === 'evidence' && (
                  <span className="ml-2 bg-gray-100 text-gray-600 py-1 px-2 rounded-full text-xs">
                    {investigation.evidence.length}
                  </span>
                )}
                {tab === 'collaborators' && (
                  <span className="ml-2 bg-gray-100 text-gray-600 py-1 px-2 rounded-full text-xs">
                    {investigation.collaborators.length}
                  </span>
                )}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {activeTab === 'steps' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-gray-900">Investigation Steps</h3>
                {canAssignSteps() && (
                  <button className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors">
                    Add Step
                  </button>
                )}
              </div>

              <div className="space-y-3">
                {investigation.steps
                  .sort((a, b) => a.order - b.order)
                  .map((step) => (
                    <div
                      key={step.id}
                      className="border border-gray-200 rounded-lg p-4 hover:shadow-sm transition-shadow"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h4 className="font-medium text-gray-900">{step.title}</h4>
                            <span className={getStatusBadgeClass(step.status)}>
                              {step.status.replace('_', ' ')}
                            </span>
                            {step.reviewRequired && (
                              <span className="px-2 py-1 bg-amber-100 text-amber-800 rounded text-xs font-medium">
                                Review Required
                              </span>
                            )}
                          </div>
                          <p className="text-gray-600 text-sm mb-2">{step.description}</p>

                          {step.instructions && (
                            <div className="bg-blue-50 border border-blue-200 rounded p-3 mb-3">
                              <h5 className="font-medium text-blue-900 text-sm mb-1">Instructions</h5>
                              <p className="text-blue-800 text-sm">{step.instructions}</p>
                            </div>
                          )}

                          <div className="flex items-center gap-4 text-sm text-gray-500">
                            <span>Est. Duration: {step.estimatedDuration} min</span>
                            {step.assignedTo && <span>Assigned: {step.assignedTo}</span>}
                            {step.actualDuration && <span>Actual: {step.actualDuration} min</span>}
                          </div>
                        </div>

                        {canEditInvestigation() && (
                          <div className="flex gap-2 ml-4">
                            {step.status === 'pending' && (
                              <button
                                onClick={() => handleStepStatusChange(step.id, 'in_progress')}
                                className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 transition-colors"
                              >
                                Start
                              </button>
                            )}
                            {step.status === 'in_progress' && (
                              <>
                                <button
                                  onClick={() => handleStepStatusChange(step.id, 'completed')}
                                  className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700 transition-colors"
                                >
                                  Complete
                                </button>
                                <button
                                  onClick={() => handleStepStatusChange(step.id, 'blocked')}
                                  className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700 transition-colors"
                                >
                                  Block
                                </button>
                              </>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Checklist */}
                      {step.checklist.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-gray-100">
                          <h5 className="font-medium text-gray-900 text-sm mb-2">Checklist</h5>
                          <div className="space-y-1">
                            {step.checklist.map((item) => (
                              <div key={item.id} className="flex items-center gap-2">
                                <input
                                  type="checkbox"
                                  checked={item.completed}
                                  onChange={(e) => {
                                    // Handle checklist item toggle
                                  }}
                                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                />
                                <span className={`text-sm ${item.completed ? 'text-gray-500 line-through' : 'text-gray-700'}`}>
                                  {item.text}
                                  {item.required && <span className="text-red-500 ml-1">*</span>}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
              </div>
            </div>
          )}

          {activeTab === 'evidence' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-gray-900">Evidence</h3>
                <button
                  onClick={() => setShowAddEvidenceModal(true)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                >
                  Add Evidence
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {investigation.evidence.map((evidence) => (
                  <div key={evidence.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="font-medium text-gray-900">{evidence.title}</h4>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        evidence.isVerified ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {evidence.isVerified ? 'Verified' : 'Pending'}
                      </span>
                    </div>
                    <p className="text-gray-600 text-sm mb-2">{evidence.description}</p>
                    <div className="text-xs text-gray-500">
                      <div>Type: {evidence.type.replace('_', ' ')}</div>
                      <div>Collected by: {evidence.collectedBy}</div>
                      <div>Date: {new Date(evidence.collectedAt).toLocaleDateString()}</div>
                      {evidence.fileName && <div>File: {evidence.fileName}</div>}
                    </div>
                    {evidence.tags.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {evidence.tags.map((tag, index) => (
                          <span key={index} className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs">
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'timeline' && (
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900">Investigation Timeline</h3>
              <div className="space-y-3">
                {investigation.timeline
                  .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
                  .map((event) => (
                    <div key={event.id} className="flex gap-3 p-3 border border-gray-200 rounded-lg">
                      <div className="flex-shrink-0 w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                      <div className="flex-1">
                        <p className="text-gray-900 font-medium">{event.description}</p>
                        <div className="text-sm text-gray-500 mt-1">
                          <span>{event.performedBy}</span>
                          <span className="mx-2">•</span>
                          <span>{new Date(event.timestamp).toLocaleString()}</span>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {activeTab === 'collaborators' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-gray-900">Team Members</h3>
                <button
                  onClick={() => setShowAddCollaboratorModal(true)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                >
                  Add Collaborator
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {investigation.collaborators.map((collaborator) => (
                  <div key={collaborator.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium text-gray-900">{collaborator.name}</h4>
                      <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-medium">
                        {collaborator.role.replace('_', ' ')}
                      </span>
                    </div>
                    <p className="text-gray-600 text-sm mb-2">{collaborator.email}</p>
                    <p className="text-gray-600 text-sm mb-3">{collaborator.department}</p>

                    <div className="text-xs text-gray-500">
                      <div className="grid grid-cols-2 gap-1">
                        {Object.entries(collaborator.permissions).map(([key, value]) => (
                          <div key={key} className={`${value ? 'text-green-600' : 'text-gray-400'}`}>
                            {key.replace('can', '').replace(/([A-Z])/g, ' $1').toLowerCase()}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};