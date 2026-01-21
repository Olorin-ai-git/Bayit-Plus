import React, { useState, useEffect } from 'react';
import {
  InvestigationStep,
  StepStatus,
  ChecklistItem,
  Evidence
} from '../types/manualInvestigation';

interface InvestigationStepTrackerProps {
  steps: InvestigationStep[];
  evidence: Evidence[];
  currentUserId: string;
  currentUserName: string;
  onUpdateStep: (stepId: string, updates: Partial<InvestigationStep>) => void;
  onAddNote: (stepId: string, note: string) => void;
  onAssignStep: (stepId: string, assigneeId: string) => void;
  onCompleteChecklist: (stepId: string, itemId: string, completed: boolean, notes?: string) => void;
  onStartStep: (stepId: string) => void;
  onCompleteStep: (stepId: string) => void;
  onBlockStep: (stepId: string, reason: string) => void;
  canEdit: boolean;
  canAssign: boolean;
  isLoading?: boolean;
}

interface StepFilters {
  status: StepStatus | 'all';
  assignedTo: string | 'all';
  showOnlyMySteps: boolean;
}

const STEP_STATUSES: { value: StepStatus; label: string; color: string }[] = [
  { value: 'pending', label: 'Pending', color: 'bg-gray-100 text-gray-800' },
  { value: 'in_progress', label: 'In Progress', color: 'bg-blue-100 text-blue-800' },
  { value: 'completed', label: 'Completed', color: 'bg-green-100 text-green-800' },
  { value: 'skipped', label: 'Skipped', color: 'bg-orange-100 text-orange-800' },
  { value: 'blocked', label: 'Blocked', color: 'bg-red-100 text-red-800' },
  { value: 'requires_review', label: 'Requires Review', color: 'bg-purple-100 text-purple-800' }
];

export const InvestigationStepTracker: React.FC<InvestigationStepTrackerProps> = ({
  steps,
  evidence,
  currentUserId,
  currentUserName,
  onUpdateStep,
  onAddNote,
  onAssignStep,
  onCompleteChecklist,
  onStartStep,
  onCompleteStep,
  onBlockStep,
  canEdit,
  canAssign,
  isLoading = false
}) => {
  const [filters, setFilters] = useState<StepFilters>({
    status: 'all',
    assignedTo: 'all',
    showOnlyMySteps: false
  });
  const [selectedStepId, setSelectedStepId] = useState<string | null>(null);
  const [showNotesModal, setShowNotesModal] = useState(false);
  const [newNote, setNewNote] = useState('');
  const [showBlockModal, setShowBlockModal] = useState(false);
  const [blockReason, setBlockReason] = useState('');
  const [expandedSteps, setExpandedSteps] = useState<Set<string>>(new Set());

  const sortedSteps = [...steps].sort((a, b) => a.order - b.order);

  const filteredSteps = sortedSteps.filter(step => {
    const matchesStatus = filters.status === 'all' || step.status === filters.status;
    const matchesAssignee = filters.assignedTo === 'all' || step.assignedTo === filters.assignedTo;
    const matchesMySteps = !filters.showOnlyMySteps || step.assignedTo === currentUserId;
    return matchesStatus && matchesAssignee && matchesMySteps;
  });

  const uniqueAssignees = Array.from(new Set(steps.map(s => s.assignedTo).filter(Boolean)));

  const getStatusInfo = (status: StepStatus) => {
    return STEP_STATUSES.find(s => s.value === status) || STEP_STATUSES[0];
  };

  const getStepProgress = (step: InvestigationStep) => {
    if (step.checklist.length === 0) return 0;
    const completed = step.checklist.filter(item => item.completed).length;
    return Math.round((completed / step.checklist.length) * 100);
  };

  const canStartStep = (step: InvestigationStep) => {
    if (!canEdit || step.status !== 'pending') return false;

    // Check dependencies
    const dependencySteps = step.dependencies.map(depId =>
      steps.find(s => s.id === depId)
    ).filter(Boolean);

    return dependencySteps.every(dep => dep?.status === 'completed');
  };

  const canCompleteStep = (step: InvestigationStep) => {
    if (!canEdit || step.status !== 'in_progress') return false;

    // Check required checklist items
    const requiredItems = step.checklist.filter(item => item.required);
    return requiredItems.every(item => item.completed);
  };

  const getEstimatedTimeRemaining = (step: InvestigationStep) => {
    if (step.status === 'completed') return 0;
    if (step.status === 'in_progress' && step.startedAt) {
      const elapsed = Math.round((Date.now() - new Date(step.startedAt).getTime()) / 60000);
      return Math.max(0, step.estimatedDuration - elapsed);
    }
    return step.estimatedDuration;
  };

  const formatDuration = (minutes: number) => {
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

  const getStepEvidence = (stepId: string) => {
    return evidence.filter(e => e.relatedStepId === stepId);
  };

  const toggleStepExpansion = (stepId: string) => {
    const newExpanded = new Set(expandedSteps);
    if (newExpanded.has(stepId)) {
      newExpanded.delete(stepId);
    } else {
      newExpanded.add(stepId);
    }
    setExpandedSteps(newExpanded);
  };

  const handleAddNote = () => {
    if (selectedStepId && newNote.trim()) {
      onAddNote(selectedStepId, newNote.trim());
      setNewNote('');
      setShowNotesModal(false);
    }
  };

  const handleBlockStep = () => {
    if (selectedStepId && blockReason.trim()) {
      onBlockStep(selectedStepId, blockReason.trim());
      setBlockReason('');
      setShowBlockModal(false);
    }
  };

  const handleChecklistToggle = (stepId: string, item: ChecklistItem, completed: boolean) => {
    onCompleteChecklist(stepId, item.id, completed, item.notes);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header and Progress Summary */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900">Investigation Steps</h2>
          <div className="text-sm text-gray-600">
            {steps.filter(s => s.status === 'completed').length} of {steps.length} completed
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mb-4">
          <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
            <span>Overall Progress</span>
            <span>{Math.round((steps.filter(s => s.status === 'completed').length / steps.length) * 100)}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${(steps.filter(s => s.status === 'completed').length / steps.length) * 100}%` }}
            ></div>
          </div>
        </div>

        {/* Status Summary */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
          {STEP_STATUSES.map(status => {
            const count = steps.filter(s => s.status === status.value).length;
            return (
              <div key={status.value} className="text-center">
                <div className="text-2xl font-bold text-gray-900">{count}</div>
                <div className={`text-sm px-2 py-1 rounded ${status.color}`}>
                  {status.label}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select
              value={filters.status}
              onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value as StepStatus | 'all' }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Statuses</option>
              {STEP_STATUSES.map(status => (
                <option key={status.value} value={status.value}>{status.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Assigned To</label>
            <select
              value={filters.assignedTo}
              onChange={(e) => setFilters(prev => ({ ...prev, assignedTo: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Assignees</option>
              {uniqueAssignees.map(assignee => (
                <option key={assignee} value={assignee}>{assignee}</option>
              ))}
            </select>
          </div>

          <div className="flex items-end">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={filters.showOnlyMySteps}
                onChange={(e) => setFilters(prev => ({ ...prev, showOnlyMySteps: e.target.checked }))}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="ml-2 text-sm text-gray-700">My steps only</span>
            </label>
          </div>

          <div className="flex items-end">
            <div className="text-sm text-gray-600">
              {filteredSteps.length} of {steps.length} steps
            </div>
          </div>
        </div>
      </div>

      {/* Steps List */}
      <div className="space-y-4">
        {filteredSteps.map((step, index) => {
          const statusInfo = getStatusInfo(step.status);
          const progress = getStepProgress(step);
          const isExpanded = expandedSteps.has(step.id);
          const stepEvidence = getStepEvidence(step.id);
          const timeRemaining = getEstimatedTimeRemaining(step);

          return (
            <div key={step.id} className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              {/* Step Header */}
              <div className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="flex items-center justify-center w-8 h-8 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                        {step.order}
                      </span>
                      <h3 className="font-medium text-gray-900">{step.title}</h3>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusInfo.color}`}>
                        {statusInfo.label}
                      </span>
                      {step.reviewRequired && (
                        <span className="px-2 py-1 bg-amber-100 text-amber-800 rounded text-xs font-medium">
                          Review Required
                        </span>
                      )}
                    </div>

                    <p className="text-gray-600 text-sm mb-3">{step.description}</p>

                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      <span>Est: {formatDuration(step.estimatedDuration)}</span>
                      {timeRemaining > 0 && (
                        <span>Remaining: {formatDuration(timeRemaining)}</span>
                      )}
                      {step.assignedTo && <span>Assigned: {step.assignedTo}</span>}
                      {stepEvidence.length > 0 && <span>Evidence: {stepEvidence.length}</span>}
                      {step.checklist.length > 0 && (
                        <span>Progress: {progress}% ({step.checklist.filter(i => i.completed).length}/{step.checklist.length})</span>
                      )}
                    </div>

                    {step.checklist.length > 0 && (
                      <div className="mt-3">
                        <div className="w-full bg-gray-200 rounded-full h-1">
                          <div
                            className="bg-green-600 h-1 rounded-full transition-all duration-300"
                            style={{ width: `${progress}%` }}
                          ></div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-2 ml-4">
                    {canStartStep(step) && (
                      <button
                        onClick={() => onStartStep(step.id)}
                        className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 transition-colors"
                      >
                        Start
                      </button>
                    )}
                    {canCompleteStep(step) && (
                      <button
                        onClick={() => onCompleteStep(step.id)}
                        className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700 transition-colors"
                      >
                        Complete
                      </button>
                    )}
                    {canEdit && step.status === 'in_progress' && (
                      <button
                        onClick={() => {
                          setSelectedStepId(step.id);
                          setShowBlockModal(true);
                        }}
                        className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700 transition-colors"
                      >
                        Block
                      </button>
                    )}
                    <button
                      onClick={() => {
                        setSelectedStepId(step.id);
                        setShowNotesModal(true);
                      }}
                      className="px-3 py-1 bg-gray-600 text-white rounded text-sm hover:bg-gray-700 transition-colors"
                    >
                      Add Note
                    </button>
                    <button
                      onClick={() => toggleStepExpansion(step.id)}
                      className="p-1 text-gray-400 hover:text-gray-600"
                    >
                      {isExpanded ? '🔼' : '🔽'}
                    </button>
                  </div>
                </div>
              </div>

              {/* Expanded Content */}
              {isExpanded && (
                <div className="border-t border-gray-200 p-4 bg-gray-50">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Instructions and Checklist */}
                    <div className="space-y-4">
                      {step.instructions && (
                        <div>
                          <h4 className="font-medium text-gray-900 mb-2">Instructions</h4>
                          <div className="bg-blue-50 border border-blue-200 rounded p-3">
                            <p className="text-blue-800 text-sm">{step.instructions}</p>
                          </div>
                        </div>
                      )}

                      {step.checklist.length > 0 && (
                        <div>
                          <h4 className="font-medium text-gray-900 mb-2">Checklist</h4>
                          <div className="space-y-2">
                            {step.checklist.map((item) => (
                              <div key={item.id} className="flex items-start gap-3">
                                <input
                                  type="checkbox"
                                  checked={item.completed}
                                  onChange={(e) => handleChecklistToggle(step.id, item, e.target.checked)}
                                  disabled={!canEdit}
                                  className="mt-1 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                />
                                <div className="flex-1">
                                  <span className={`text-sm ${item.completed ? 'text-gray-500 line-through' : 'text-gray-700'}`}>
                                    {item.text}
                                    {item.required && <span className="text-red-500 ml-1">*</span>}
                                  </span>
                                  {item.notes && (
                                    <p className="text-xs text-gray-500 mt-1">{item.notes}</p>
                                  )}
                                  {item.completed && item.completedBy && (
                                    <p className="text-xs text-gray-500 mt-1">
                                      Completed by {item.completedBy} on {new Date(item.completedAt!).toLocaleString()}
                                    </p>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Notes, Evidence, and Timeline */}
                    <div className="space-y-4">
                      {step.notes && (
                        <div>
                          <h4 className="font-medium text-gray-900 mb-2">Notes</h4>
                          <div className="bg-white border border-gray-200 rounded p-3">
                            <p className="text-gray-700 text-sm whitespace-pre-wrap">{step.notes}</p>
                          </div>
                        </div>
                      )}

                      {stepEvidence.length > 0 && (
                        <div>
                          <h4 className="font-medium text-gray-900 mb-2">Related Evidence ({stepEvidence.length})</h4>
                          <div className="space-y-2">
                            {stepEvidence.slice(0, 3).map((evidence) => (
                              <div key={evidence.id} className="flex items-center gap-2 p-2 bg-white border border-gray-200 rounded">
                                <span className="text-sm">📎</span>
                                <span className="text-sm text-gray-900 flex-1">{evidence.title}</span>
                                <span className={`px-2 py-1 rounded text-xs ${
                                  evidence.isVerified ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                                }`}>
                                  {evidence.isVerified ? 'Verified' : 'Pending'}
                                </span>
                              </div>
                            ))}
                            {stepEvidence.length > 3 && (
                              <p className="text-sm text-gray-500">+{stepEvidence.length - 3} more evidence items</p>
                            )}
                          </div>
                        </div>
                      )}

                      {(step.startedAt || step.completedAt) && (
                        <div>
                          <h4 className="font-medium text-gray-900 mb-2">Timeline</h4>
                          <div className="space-y-2 text-sm text-gray-600">
                            {step.startedAt && (
                              <div>Started: {new Date(step.startedAt).toLocaleString()}</div>
                            )}
                            {step.completedAt && (
                              <div>Completed: {new Date(step.completedAt).toLocaleString()}</div>
                            )}
                            {step.actualDuration && (
                              <div>Duration: {formatDuration(step.actualDuration)}</div>
                            )}
                            {step.reviewedAt && step.reviewedBy && (
                              <div>Reviewed by {step.reviewedBy} on {new Date(step.reviewedAt).toLocaleString()}</div>
                            )}
                          </div>
                        </div>
                      )}

                      {step.dependencies.length > 0 && (
                        <div>
                          <h4 className="font-medium text-gray-900 mb-2">Dependencies</h4>
                          <div className="space-y-1">
                            {step.dependencies.map(depId => {
                              const depStep = steps.find(s => s.id === depId);
                              if (!depStep) return null;
                              const depStatus = getStatusInfo(depStep.status);
                              return (
                                <div key={depId} className="flex items-center gap-2 text-sm">
                                  <span className="w-4 h-4 flex items-center justify-center text-xs">
                                    {depStep.order}
                                  </span>
                                  <span className="flex-1">{depStep.title}</span>
                                  <span className={`px-2 py-1 rounded text-xs ${depStatus.color}`}>
                                    {depStatus.label}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {filteredSteps.length === 0 && (
        <div className="text-center py-12">
          <div className="text-4xl mb-4">📋</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No steps found</h3>
          <p className="text-gray-600">Try adjusting your filters to see more steps.</p>
        </div>
      )}

      {/* Add Note Modal */}
      {showNotesModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Add Note</h3>
            </div>

            <div className="px-6 py-4">
              <textarea
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter your note..."
              />
            </div>

            <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-end gap-3">
              <button
                onClick={() => setShowNotesModal(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAddNote}
                disabled={!newNote.trim()}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                Add Note
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Block Step Modal */}
      {showBlockModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Block Step</h3>
            </div>

            <div className="px-6 py-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Reason for blocking this step
              </label>
              <textarea
                value={blockReason}
                onChange={(e) => setBlockReason(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Explain why this step is blocked..."
              />
            </div>

            <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-end gap-3">
              <button
                onClick={() => setShowBlockModal(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleBlockStep}
                disabled={!blockReason.trim()}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 transition-colors"
              >
                Block Step
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};