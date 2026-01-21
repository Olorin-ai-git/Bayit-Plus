/**
 * useInvestigationReports Hook
 * React hook for generating investigation reports
 * Matches backend API from app/router/reports_router.py
 */

import { useState, useCallback } from 'react';
import { ReportService } from '../services/reportService';
import {
  InvestigationReportGenerateRequest,
  InvestigationReportGenerateResponse,
} from '../types/reports';

interface UseInvestigationReportsResult {
  generateReport: (request: InvestigationReportGenerateRequest) => Promise<InvestigationReportGenerateResponse | null>;
  isGenerating: boolean;
  error: string | null;
  clearError: () => void;
}

export function useInvestigationReports(): UseInvestigationReportsResult {
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateReport = useCallback(
    async (request: InvestigationReportGenerateRequest) => {
      setIsGenerating(true);
      setError(null);

      try {
        const response = await ReportService.generateInvestigationReport(request);
        return response;
      } catch (err: any) {
        const errorMessage =
          err.response?.data?.detail ||
          err.message ||
          'Failed to generate investigation report';
        setError(errorMessage);
        return null;
      } finally {
        setIsGenerating(false);
      }
    },
    []
  );

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    generateReport,
    isGenerating,
    error,
    clearError,
  };
}
