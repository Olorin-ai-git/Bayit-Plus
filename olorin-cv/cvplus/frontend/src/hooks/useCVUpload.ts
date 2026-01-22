/**
 * React Hook for CV Upload
 * Uses React Query for state management
 */

import { useMutation, useQuery } from '@tanstack/react-query';
import { cvAPI } from '../services/api';

export function useCVUpload() {
  return useMutation({
    mutationFn: (file: File) => cvAPI.upload(file),
  });
}

export function useCVAnalyze() {
  return useMutation({
    mutationFn: ({ cvText, language = 'en' }: { cvText: string; language?: string }) =>
      cvAPI.analyze(cvText, language),
  });
}

export function useCVStatus(jobId: string | null, enabled = true) {
  return useQuery({
    queryKey: ['cv-status', jobId],
    queryFn: () => cvAPI.getStatus(jobId!),
    enabled: enabled && !!jobId,
    refetchInterval: (query) => {
      const data = query.state.data;
      if (!data) return false;
      return data.status === 'processing' ? 3000 : false;
    },
  });
}

export function useCVGenerate() {
  return useMutation({
    mutationFn: ({
      userData,
      template = 'professional',
      language = 'en',
    }: {
      userData: object;
      template?: string;
      language?: string;
    }) => cvAPI.generate(userData, template, language),
  });
}
