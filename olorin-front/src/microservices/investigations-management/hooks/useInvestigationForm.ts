/**
 * useInvestigationForm Hook
 * Manages investigation form state and submission
 */

import { useState, useCallback } from 'react';
import { Investigation, InvestigationFormData, CreateInvestigationRequest } from '../types/investigations';
import { investigationsManagementService } from '../services/investigationsManagementService';

interface UseInvestigationFormReturn {
  isSubmitting: boolean;
  error: string | null;
  submitForm: (data: InvestigationFormData, investigationId?: string) => Promise<Investigation>;
}

export const useInvestigationForm = (): UseInvestigationFormReturn => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submitForm = useCallback(async (
    formData: InvestigationFormData,
    investigationId?: string
  ): Promise<Investigation> => {
    setIsSubmitting(true);
    setError(null);

    try {
      const request: CreateInvestigationRequest = {
        name: formData.name.trim(),
        owner: formData.owner.trim(),
        description: formData.description.trim() || undefined,
        riskModel: formData.riskModel,
        sources: formData.sources.length > 0 ? formData.sources : undefined,
        tools: formData.tools.length > 0 ? formData.tools : undefined,
        from: formData.from ? new Date(formData.from).toISOString() : undefined,
        to: formData.to ? new Date(formData.to).toISOString() : undefined,
        status: formData.status,
        autoRun: formData.autoRun
      };

      let result: Investigation;
      if (investigationId) {
        // Update existing investigation
        result = await investigationsManagementService.update(investigationId, request);
      } else {
        // Create new investigation
        result = await investigationsManagementService.create(request);
      }

      setIsSubmitting(false);
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to save investigation';
      setError(errorMessage);
      setIsSubmitting(false);
      throw err;
    }
  }, []);

  return {
    isSubmitting,
    error,
    submitForm
  };
};

