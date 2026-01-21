import { useState, useCallback, useEffect } from 'react';
import {
  InvestigationStep,
  StepStatus,
  ChecklistItem
} from '../types/manualInvestigation';
import { manualInvestigationService } from '../services/manualInvestigationService';
import { collaborationService } from '../services/collaborationService';
import { notificationService } from '../services/notificationService';

interface UseInvestigationStepsState {
  steps: InvestigationStep[];
  currentStep: InvestigationStep | null;
  isLoading: boolean;
  isUpdating: boolean;
  error: string | null;
  progress: {
    completed: number;
    total: number;
    percentage: number;
    estimatedTimeRemaining: number;
  };
}

interface UseInvestigationStepsActions {
  // Step management
  updateStep: (stepId: string, updates: Partial<InvestigationStep>) => Promise<void>;
  startStep: (stepId: string) => Promise<void>;
  completeStep: (stepId: string, notes?: string) => Promise<void>;
  blockStep: (stepId: string, reason: string) => Promise<void>;
  skipStep: (stepId: string, reason: string) => Promise<void>;
  assignStep: (stepId: string, assigneeId: string) => Promise<void>;

  // Checklist management
  updateChecklistItem: (stepId: string, itemId: string, completed: boolean, notes?: string) => Promise<void>;
  addChecklistItem: (stepId: string, item: Omit<ChecklistItem, 'id'>) => Promise<void>;
  removeChecklistItem: (stepId: string, itemId: string) => Promise<void>;

  // Notes management
  addStepNote: (stepId: string, note: string) => Promise<void>;
  updateStepNotes: (stepId: string, notes: string) => Promise<void>;

  // Navigation
  setCurrentStep: (stepId: string | null) => void;
  getNextStep: (currentStepId: string) => InvestigationStep | null;
  getPreviousStep: (currentStepId: string) => InvestigationStep | null;

  // Utility
  canStartStep: (stepId: string) => boolean;
  canCompleteStep: (stepId: string) => boolean;
  getStepProgress: (stepId: string) => number;
  getEstimatedTimeRemaining: (stepId: string) => number;
  clearError: () => void;
}

interface UseInvestigationStepsOptions {
  investigationId: string;
  currentUserId: string;
  currentUserName: string;
  enableRealtime?: boolean;
}

export function useInvestigationSteps(
  initialSteps: InvestigationStep[],
  options: UseInvestigationStepsOptions
): UseInvestigationStepsState & UseInvestigationStepsActions {
  const { investigationId, currentUserId, currentUserName, enableRealtime = true } = options;

  const [state, setState] = useState<UseInvestigationStepsState>({
    steps: initialSteps,
    currentStep: null,
    isLoading: false,
    isUpdating: false,
    error: null,
    progress: calculateProgress(initialSteps)
  });

  // Calculate progress from steps
  function calculateProgress(steps: InvestigationStep[]) {
    const completed = steps.filter(step => step.status === 'completed').length;
    const total = steps.length;
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

    const estimatedTimeRemaining = steps
      .filter(step => step.status !== 'completed' && step.status !== 'skipped')
      .reduce((total, step) => {
        if (step.status === 'in_progress' && step.startedAt) {
          const elapsed = Math.round((Date.now() - new Date(step.startedAt).getTime()) / 60000);
          return total + Math.max(0, step.estimatedDuration - elapsed);
        }
        return total + step.estimatedDuration;
      }, 0);

    return {
      completed,
      total,
      percentage,
      estimatedTimeRemaining
    };
  }

  // Update steps and recalculate progress
  const updateStepsState = useCallback((updater: (steps: InvestigationStep[]) => InvestigationStep[]) => {
    setState(prev => {
      const newSteps = updater(prev.steps);
      return {
        ...prev,
        steps: newSteps,
        progress: calculateProgress(newSteps),
        currentStep: prev.currentStep
          ? newSteps.find(s => s.id === prev.currentStep!.id) || null
          : null
      };
    });
  }, []);

  // Step management functions
  const updateStep = useCallback(async (stepId: string, updates: Partial<InvestigationStep>) => {
    setState(prev => ({ ...prev, isUpdating: true, error: null }));

    try {
      const response = await manualInvestigationService.updateStep(investigationId, stepId, updates);

      if (!response.success) {
        throw new Error(response.error || 'Failed to update step');
      }

      const updatedStep = response.data!;

      updateStepsState(steps =>
        steps.map(step => step.id === stepId ? updatedStep : step)
      );

      // Send real-time update
      if (enableRealtime) {
        collaborationService.sendStepUpdated(updatedStep);
      }

      setState(prev => ({ ...prev, isUpdating: false }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to update step',
        isUpdating: false
      }));
    }
  }, [investigationId, enableRealtime, updateStepsState]);

  const startStep = useCallback(async (stepId: string) => {
    setState(prev => ({ ...prev, isUpdating: true, error: null }));

    try {
      const response = await manualInvestigationService.startStep(investigationId, stepId);

      if (!response.success) {
        throw new Error(response.error || 'Failed to start step');
      }

      const updatedStep = response.data!;

      updateStepsState(steps =>
        steps.map(step => step.id === stepId ? updatedStep : step)
      );

      // Send real-time update
      if (enableRealtime) {
        collaborationService.sendStepUpdated(updatedStep);
      }

      // Create notification if step is assigned to someone else
      if (updatedStep.assignedTo && updatedStep.assignedTo !== currentUserId) {
        await notificationService.createNotification({
          type: 'step_assigned',
          investigationId,
          investigationTitle: '', // Will be filled by the service
          relatedEntityId: stepId,
          relatedEntityType: 'step',
          variables: { stepTitle: updatedStep.title }
        });
      }

      setState(prev => ({ ...prev, isUpdating: false }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to start step',
        isUpdating: false
      }));
    }
  }, [investigationId, currentUserId, enableRealtime, updateStepsState]);

  const completeStep = useCallback(async (stepId: string, notes?: string) => {
    setState(prev => ({ ...prev, isUpdating: true, error: null }));

    try {
      const response = await manualInvestigationService.completeStep(investigationId, stepId, notes);

      if (!response.success) {
        throw new Error(response.error || 'Failed to complete step');
      }

      const updatedStep = response.data!;

      updateStepsState(steps =>
        steps.map(step => step.id === stepId ? updatedStep : step)
      );

      // Send real-time update
      if (enableRealtime) {
        collaborationService.sendStepUpdated(updatedStep);
      }

      // Create notification
      await notificationService.createNotification({
        type: 'step_completed',
        investigationId,
        investigationTitle: '', // Will be filled by the service
        relatedEntityId: stepId,
        relatedEntityType: 'step',
        variables: { stepTitle: updatedStep.title }
      });

      setState(prev => ({ ...prev, isUpdating: false }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to complete step',
        isUpdating: false
      }));
    }
  }, [investigationId, enableRealtime, updateStepsState]);

  const blockStep = useCallback(async (stepId: string, reason: string) => {
    await updateStep(stepId, {
      status: 'blocked',
      notes: reason
    });
  }, [updateStep]);

  const skipStep = useCallback(async (stepId: string, reason: string) => {
    await updateStep(stepId, {
      status: 'skipped',
      notes: reason
    });
  }, [updateStep]);

  const assignStep = useCallback(async (stepId: string, assigneeId: string) => {
    await updateStep(stepId, {
      assignedTo: assigneeId
    });
  }, [updateStep]);

  // Checklist management
  const updateChecklistItem = useCallback(async (
    stepId: string,
    itemId: string,
    completed: boolean,
    notes?: string
  ) => {
    try {
      const response = await manualInvestigationService.updateChecklist(
        investigationId,
        stepId,
        itemId,
        completed,
        notes
      );

      if (!response.success) {
        throw new Error(response.error || 'Failed to update checklist item');
      }

      const updatedItem = response.data!;

      updateStepsState(steps =>
        steps.map(step => {
          if (step.id !== stepId) return step;
          return {
            ...step,
            checklist: step.checklist.map(item =>
              item.id === itemId ? updatedItem : item
            )
          };
        })
      );
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to update checklist item'
      }));
    }
  }, [investigationId, updateStepsState]);

  const addChecklistItem = useCallback(async (stepId: string, item: Omit<ChecklistItem, 'id'>) => {
    const newItem: ChecklistItem = {
      ...item,
      id: `item-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    };

    updateStepsState(steps =>
      steps.map(step => {
        if (step.id !== stepId) return step;
        return {
          ...step,
          checklist: [...step.checklist, newItem]
        };
      })
    );
  }, [updateStepsState]);

  const removeChecklistItem = useCallback(async (stepId: string, itemId: string) => {
    updateStepsState(steps =>
      steps.map(step => {
        if (step.id !== stepId) return step;
        return {
          ...step,
          checklist: step.checklist.filter(item => item.id !== itemId)
        };
      })
    );
  }, [updateStepsState]);

  // Notes management
  const addStepNote = useCallback(async (stepId: string, note: string) => {
    const step = state.steps.find(s => s.id === stepId);
    if (!step) return;

    const existingNotes = step.notes || '';
    const timestamp = new Date().toLocaleString();
    const newNote = `[${timestamp}] ${currentUserName}: ${note}`;
    const updatedNotes = existingNotes ? `${existingNotes}\n\n${newNote}` : newNote;

    await updateStep(stepId, { notes: updatedNotes });
  }, [state.steps, currentUserName, updateStep]);

  const updateStepNotes = useCallback(async (stepId: string, notes: string) => {
    await updateStep(stepId, { notes });
  }, [updateStep]);

  // Navigation
  const setCurrentStep = useCallback((stepId: string | null) => {
    setState(prev => ({
      ...prev,
      currentStep: stepId ? prev.steps.find(s => s.id === stepId) || null : null
    }));
  }, []);

  const getNextStep = useCallback((currentStepId: string): InvestigationStep | null => {
    const currentStep = state.steps.find(s => s.id === currentStepId);
    if (!currentStep) return null;

    const sortedSteps = [...state.steps].sort((a, b) => a.order - b.order);
    const currentIndex = sortedSteps.findIndex(s => s.id === currentStepId);

    return currentIndex < sortedSteps.length - 1 ? sortedSteps[currentIndex + 1] : null;
  }, [state.steps]);

  const getPreviousStep = useCallback((currentStepId: string): InvestigationStep | null => {
    const currentStep = state.steps.find(s => s.id === currentStepId);
    if (!currentStep) return null;

    const sortedSteps = [...state.steps].sort((a, b) => a.order - b.order);
    const currentIndex = sortedSteps.findIndex(s => s.id === currentStepId);

    return currentIndex > 0 ? sortedSteps[currentIndex - 1] : null;
  }, [state.steps]);

  // Utility functions
  const canStartStep = useCallback((stepId: string): boolean => {
    const step = state.steps.find(s => s.id === stepId);
    if (!step || step.status !== 'pending') return false;

    // Check dependencies
    const dependencySteps = step.dependencies.map(depId =>
      state.steps.find(s => s.id === depId)
    ).filter(Boolean);

    return dependencySteps.every(dep => dep?.status === 'completed');
  }, [state.steps]);

  const canCompleteStep = useCallback((stepId: string): boolean => {
    const step = state.steps.find(s => s.id === stepId);
    if (!step || step.status !== 'in_progress') return false;

    // Check required checklist items
    const requiredItems = step.checklist.filter(item => item.required);
    return requiredItems.every(item => item.completed);
  }, [state.steps]);

  const getStepProgress = useCallback((stepId: string): number => {
    const step = state.steps.find(s => s.id === stepId);
    if (!step || step.checklist.length === 0) return 0;

    const completed = step.checklist.filter(item => item.completed).length;
    return Math.round((completed / step.checklist.length) * 100);
  }, [state.steps]);

  const getEstimatedTimeRemaining = useCallback((stepId: string): number => {
    const step = state.steps.find(s => s.id === stepId);
    if (!step) return 0;

    if (step.status === 'completed' || step.status === 'skipped') return 0;

    if (step.status === 'in_progress' && step.startedAt) {
      const elapsed = Math.round((Date.now() - new Date(step.startedAt).getTime()) / 60000);
      return Math.max(0, step.estimatedDuration - elapsed);
    }

    return step.estimatedDuration;
  }, [state.steps]);

  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  // Real-time event handlers
  useEffect(() => {
    if (!enableRealtime) return;

    const handleStepUpdated = (event: any) => {
      if (event.data.step && event.investigationId === investigationId) {
        updateStepsState(steps =>
          steps.map(step => step.id === event.data.step.id ? event.data.step : step)
        );
      }
    };

    const unsubscribe = collaborationService.onEvent('step_updated', handleStepUpdated);

    return unsubscribe;
  }, [enableRealtime, investigationId, updateStepsState]);

  // Update steps when initial steps change
  useEffect(() => {
    setState(prev => ({
      ...prev,
      steps: initialSteps,
      progress: calculateProgress(initialSteps),
      currentStep: prev.currentStep
        ? initialSteps.find(s => s.id === prev.currentStep!.id) || null
        : null
    }));
  }, [initialSteps]);

  return {
    // State
    ...state,

    // Actions
    updateStep,
    startStep,
    completeStep,
    blockStep,
    skipStep,
    assignStep,
    updateChecklistItem,
    addChecklistItem,
    removeChecklistItem,
    addStepNote,
    updateStepNotes,
    setCurrentStep,
    getNextStep,
    getPreviousStep,
    canStartStep,
    canCompleteStep,
    getStepProgress,
    getEstimatedTimeRemaining,
    clearError
  };
}