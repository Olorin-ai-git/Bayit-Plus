/**
 * CV API Methods
 * Endpoints for CV upload, analysis, generation, and download
 */

import { apiClient } from './client';
import { CVAnalysisResult } from './types';

export const cvAPI = {
  upload: async (file: File): Promise<CVAnalysisResult> => {
    const formData = new FormData();
    formData.append('file', file);

    const { data } = await apiClient.post<CVAnalysisResult>(
      '/cv/upload',
      formData,
      {
        headers: { 'Content-Type': 'multipart/form-data' },
      }
    );
    return data;
  },

  analyze: async (cvText: string, language = 'en'): Promise<CVAnalysisResult> => {
    const { data } = await apiClient.post<CVAnalysisResult>('/cv/analyze', {
      cv_text: cvText,
      language,
    });
    return data;
  },

  generate: async (userData: object, template = 'professional', language = 'en') => {
    const { data } = await apiClient.post('/cv/generate', {
      user_data: userData,
      template,
      language,
    });
    return data;
  },

  getStatus: async (jobId: string) => {
    const { data } = await apiClient.get(`/cv/status/${jobId}`);
    return data;
  },

  download: async (jobId: string) => {
    const { data } = await apiClient.get(`/cv/download/${jobId}`, {
      responseType: 'blob',
    });
    return data;
  },
};
