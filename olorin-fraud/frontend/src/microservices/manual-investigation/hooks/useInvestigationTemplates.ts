import { useState, useEffect, useCallback } from 'react';
import {
  InvestigationTemplate,
  InvestigationType,
  StepTemplate
} from '../types/manualInvestigation';
import { manualInvestigationService } from '../services/manualInvestigationService';

interface UseInvestigationTemplatesState {
  templates: InvestigationTemplate[];
  currentTemplate: InvestigationTemplate | null;
  isLoading: boolean;
  isCreating: boolean;
  isUpdating: boolean;
  error: string | null;
  filteredTemplates: InvestigationTemplate[];
}

interface UseInvestigationTemplatesActions {
  // Template management
  loadTemplates: () => Promise<void>;
  loadTemplate: (id: string) => Promise<void>;
  createTemplate: (template: Omit<InvestigationTemplate, 'id' | 'createdAt' | 'updatedAt'>) => Promise<InvestigationTemplate | null>;
  updateTemplate: (id: string, updates: Partial<InvestigationTemplate>) => Promise<void>;
  deleteTemplate: (id: string) => Promise<void>;
  duplicateTemplate: (id: string, newName: string) => Promise<InvestigationTemplate | null>;

  // Template activation/deactivation
  activateTemplate: (id: string) => Promise<void>;
  deactivateTemplate: (id: string) => Promise<void>;

  // Filtering and search
  filterByType: (type: InvestigationType | 'all') => void;
  filterByActive: (active: boolean | 'all') => void;
  searchTemplates: (query: string) => void;
  clearFilters: () => void;

  // Step management within templates
  addStepToTemplate: (templateId: string, step: Omit<StepTemplate, 'id'>) => Promise<void>;
  updateTemplateStep: (templateId: string, stepIndex: number, updates: Partial<StepTemplate>) => Promise<void>;
  removeStepFromTemplate: (templateId: string, stepIndex: number) => Promise<void>;
  reorderTemplateSteps: (templateId: string, fromIndex: number, toIndex: number) => Promise<void>;

  // Utility
  getTemplatesByType: (type: InvestigationType) => InvestigationTemplate[];
  getActiveTemplates: () => InvestigationTemplate[];
  getTemplateEstimatedDuration: (templateId: string) => number;
  validateTemplate: (template: Partial<InvestigationTemplate>) => { isValid: boolean; errors: string[] };
  clearError: () => void;
}

interface UseInvestigationTemplatesFilters {
  type: InvestigationType | 'all';
  active: boolean | 'all';
  searchQuery: string;
}

interface UseInvestigationTemplatesOptions {
  autoLoad?: boolean;
  filterDefaults?: Partial<UseInvestigationTemplatesFilters>;
}

export function useInvestigationTemplates(
  options: UseInvestigationTemplatesOptions = {}
): UseInvestigationTemplatesState & UseInvestigationTemplatesActions {
  const {
    autoLoad = true,
    filterDefaults = {}
  } = options;

  const [templates, setTemplates] = useState<InvestigationTemplate[]>([]);
  const [filters, setFilters] = useState<UseInvestigationTemplatesFilters>({
    type: 'all',
    active: 'all',
    searchQuery: '',
    ...filterDefaults
  });

  const [state, setState] = useState({
    currentTemplate: null as InvestigationTemplate | null,
    isLoading: false,
    isCreating: false,
    isUpdating: false,
    error: null as string | null
  });

  // Filter templates based on current filters
  const filteredTemplates = templates.filter(template => {
    const matchesType = filters.type === 'all' || template.type === filters.type;
    const matchesActive = filters.active === 'all' || template.isActive === filters.active;
    const matchesSearch = !filters.searchQuery ||
      template.name.toLowerCase().includes(filters.searchQuery.toLowerCase()) ||
      template.description.toLowerCase().includes(filters.searchQuery.toLowerCase()) ||
      template.tags.some(tag => tag.toLowerCase().includes(filters.searchQuery.toLowerCase()));

    return matchesType && matchesActive && matchesSearch;
  });

  // Template management functions
  const loadTemplates = useCallback(async () => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const response = await manualInvestigationService.getTemplates();

      if (!response.success) {
        throw new Error(response.error || 'Failed to load templates');
      }

      setTemplates(response.data || []);
      setState(prev => ({ ...prev, isLoading: false }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to load templates',
        isLoading: false
      }));
    }
  }, []);

  const loadTemplate = useCallback(async (id: string) => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const response = await manualInvestigationService.getTemplate(id);

      if (!response.success) {
        throw new Error(response.error || 'Failed to load template');
      }

      setState(prev => ({
        ...prev,
        currentTemplate: response.data!,
        isLoading: false
      }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to load template',
        isLoading: false
      }));
    }
  }, []);

  const createTemplate = useCallback(async (
    template: Omit<InvestigationTemplate, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<InvestigationTemplate | null> => {
    setState(prev => ({ ...prev, isCreating: true, error: null }));

    try {
      // Validate template before creating
      const validation = validateTemplate(template);
      if (!validation.isValid) {
        throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
      }

      const response = await manualInvestigationService.createTemplate(template);

      if (!response.success) {
        throw new Error(response.error || 'Failed to create template');
      }

      const newTemplate = response.data!;

      setTemplates(prev => [newTemplate, ...prev]);
      setState(prev => ({
        ...prev,
        currentTemplate: newTemplate,
        isCreating: false
      }));

      return newTemplate;
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to create template',
        isCreating: false
      }));
      return null;
    }
  }, []);

  const updateTemplate = useCallback(async (
    id: string,
    updates: Partial<InvestigationTemplate>
  ) => {
    setState(prev => ({ ...prev, isUpdating: true, error: null }));

    try {
      // Find current template and merge updates for validation
      const currentTemplate = templates.find(t => t.id === id);
      if (!currentTemplate) {
        throw new Error('Template not found');
      }

      const updatedTemplate = { ...currentTemplate, ...updates };
      const validation = validateTemplate(updatedTemplate);
      if (!validation.isValid) {
        throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
      }

      // TODO: Implement template update endpoint
      // const response = await manualInvestigationService.updateTemplate(id, updates);

      // For now, update locally
      setTemplates(prev =>
        prev.map(template => template.id === id ? updatedTemplate : template)
      );

      setState(prev => ({
        ...prev,
        currentTemplate: prev.currentTemplate?.id === id ? updatedTemplate : prev.currentTemplate,
        isUpdating: false
      }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to update template',
        isUpdating: false
      }));
    }
  }, [templates]);

  const deleteTemplate = useCallback(async (id: string) => {
    setState(prev => ({ ...prev, isUpdating: true, error: null }));

    try {
      // TODO: Implement template delete endpoint
      // const response = await manualInvestigationService.deleteTemplate(id);

      // For now, remove locally
      setTemplates(prev => prev.filter(template => template.id !== id));

      setState(prev => ({
        ...prev,
        currentTemplate: prev.currentTemplate?.id === id ? null : prev.currentTemplate,
        isUpdating: false
      }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to delete template',
        isUpdating: false
      }));
    }
  }, []);

  const duplicateTemplate = useCallback(async (
    id: string,
    newName: string
  ): Promise<InvestigationTemplate | null> => {
    const originalTemplate = templates.find(t => t.id === id);
    if (!originalTemplate) {
      setState(prev => ({ ...prev, error: 'Template not found' }));
      return null;
    }

    const duplicatedTemplate = {
      ...originalTemplate,
      name: newName,
      isActive: false // Duplicated templates start as inactive
    };

    // Remove original template properties
    const { id: _, createdAt: __, updatedAt: ___, ...templateData } = duplicatedTemplate;

    return createTemplate(templateData);
  }, [templates, createTemplate]);

  // Template activation/deactivation
  const activateTemplate = useCallback(async (id: string) => {
    await updateTemplate(id, { isActive: true });
  }, [updateTemplate]);

  const deactivateTemplate = useCallback(async (id: string) => {
    await updateTemplate(id, { isActive: false });
  }, [updateTemplate]);

  // Filtering and search
  const filterByType = useCallback((type: InvestigationType | 'all') => {
    setFilters(prev => ({ ...prev, type }));
  }, []);

  const filterByActive = useCallback((active: boolean | 'all') => {
    setFilters(prev => ({ ...prev, active }));
  }, []);

  const searchTemplates = useCallback((query: string) => {
    setFilters(prev => ({ ...prev, searchQuery: query }));
  }, []);

  const clearFilters = useCallback(() => {
    setFilters({
      type: 'all',
      active: 'all',
      searchQuery: ''
    });
  }, []);

  // Step management within templates
  const addStepToTemplate = useCallback(async (
    templateId: string,
    step: Omit<StepTemplate, 'id'>
  ) => {
    const template = templates.find(t => t.id === templateId);
    if (!template) {
      setState(prev => ({ ...prev, error: 'Template not found' }));
      return;
    }

    const newStep = {
      ...step,
      id: `step-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    };

    const updatedSteps = [...template.steps, newStep];
    const estimatedDuration = updatedSteps.reduce((total, s) => total + s.estimatedDuration, 0);

    await updateTemplate(templateId, {
      steps: updatedSteps,
      estimatedDuration
    });
  }, [templates, updateTemplate]);

  const updateTemplateStep = useCallback(async (
    templateId: string,
    stepIndex: number,
    updates: Partial<StepTemplate>
  ) => {
    const template = templates.find(t => t.id === templateId);
    if (!template || stepIndex < 0 || stepIndex >= template.steps.length) {
      setState(prev => ({ ...prev, error: 'Template or step not found' }));
      return;
    }

    const updatedSteps = template.steps.map((step, index) =>
      index === stepIndex ? { ...step, ...updates } : step
    );

    const estimatedDuration = updatedSteps.reduce((total, s) => total + s.estimatedDuration, 0);

    await updateTemplate(templateId, {
      steps: updatedSteps,
      estimatedDuration
    });
  }, [templates, updateTemplate]);

  const removeStepFromTemplate = useCallback(async (
    templateId: string,
    stepIndex: number
  ) => {
    const template = templates.find(t => t.id === templateId);
    if (!template || stepIndex < 0 || stepIndex >= template.steps.length) {
      setState(prev => ({ ...prev, error: 'Template or step not found' }));
      return;
    }

    const updatedSteps = template.steps.filter((_, index) => index !== stepIndex);
    const estimatedDuration = updatedSteps.reduce((total, s) => total + s.estimatedDuration, 0);

    await updateTemplate(templateId, {
      steps: updatedSteps,
      estimatedDuration
    });
  }, [templates, updateTemplate]);

  const reorderTemplateSteps = useCallback(async (
    templateId: string,
    fromIndex: number,
    toIndex: number
  ) => {
    const template = templates.find(t => t.id === templateId);
    if (!template) {
      setState(prev => ({ ...prev, error: 'Template not found' }));
      return;
    }

    const updatedSteps = [...template.steps];
    const [movedStep] = updatedSteps.splice(fromIndex, 1);
    updatedSteps.splice(toIndex, 0, movedStep);

    await updateTemplate(templateId, { steps: updatedSteps });
  }, [templates, updateTemplate]);

  // Utility functions
  const getTemplatesByType = useCallback((type: InvestigationType): InvestigationTemplate[] => {
    return templates.filter(template => template.type === type && template.isActive);
  }, [templates]);

  const getActiveTemplates = useCallback((): InvestigationTemplate[] => {
    return templates.filter(template => template.isActive);
  }, [templates]);

  const getTemplateEstimatedDuration = useCallback((templateId: string): number => {
    const template = templates.find(t => t.id === templateId);
    return template?.estimatedDuration || 0;
  }, [templates]);

  const validateTemplate = useCallback((
    template: Partial<InvestigationTemplate>
  ): { isValid: boolean; errors: string[] } => {
    const errors: string[] = [];

    if (!template.name?.trim()) {
      errors.push('Template name is required');
    }

    if (!template.description?.trim()) {
      errors.push('Template description is required');
    }

    if (!template.type) {
      errors.push('Investigation type is required');
    }

    if (!template.steps || template.steps.length === 0) {
      errors.push('Template must have at least one step');
    } else {
      // Validate individual steps
      template.steps.forEach((step, index) => {
        if (!step.title?.trim()) {
          errors.push(`Step ${index + 1}: Title is required`);
        }

        if (!step.description?.trim()) {
          errors.push(`Step ${index + 1}: Description is required`);
        }

        if (!step.estimatedDuration || step.estimatedDuration <= 0) {
          errors.push(`Step ${index + 1}: Valid estimated duration is required`);
        }

        if (!step.category?.trim()) {
          errors.push(`Step ${index + 1}: Category is required`);
        }
      });
    }

    if (!template.requiredRoles || template.requiredRoles.length === 0) {
      errors.push('At least one required role must be specified');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }, []);

  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  // Auto-load templates on mount
  useEffect(() => {
    if (autoLoad) {
      loadTemplates();
    }
  }, [autoLoad, loadTemplates]);

  return {
    // State
    templates,
    filteredTemplates,
    ...state,

    // Actions
    loadTemplates,
    loadTemplate,
    createTemplate,
    updateTemplate,
    deleteTemplate,
    duplicateTemplate,
    activateTemplate,
    deactivateTemplate,
    filterByType,
    filterByActive,
    searchTemplates,
    clearFilters,
    addStepToTemplate,
    updateTemplateStep,
    removeStepFromTemplate,
    reorderTemplateSteps,
    getTemplatesByType,
    getActiveTemplates,
    getTemplateEstimatedDuration,
    validateTemplate,
    clearError
  };
}