import { BaseApiService } from './BaseApiService';
import { env } from '../config/env.config';

export interface ErrorReport {
  message: string;
  stack?: string;
  componentStack?: string;
  userAgent: string;
  url: string;
  timestamp: string;
  severity: 'error' | 'warning' | 'fatal';
  context?: Record<string, any>;
}

export interface ErrorReportResponse {
  id: string;
  reported: boolean;
}

export class ErrorReportingService extends BaseApiService {
  constructor() {
    super(env.apiBaseUrl);
  }

  async reportError(error: Error, errorInfo?: React.ErrorInfo, context?: Record<string, any>): Promise<ErrorReportResponse> {
    const report: ErrorReport = {
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo?.componentStack,
      userAgent: navigator.userAgent,
      url: window.location.href,
      timestamp: new Date().toISOString(),
      severity: 'error',
      context
    };

    try {
      return await this.post<ErrorReportResponse>('/api/errors/report', report);
    } catch (reportError) {
      console.error('Failed to report error to server:', reportError);
      throw reportError;
    }
  }

  async reportFatalError(error: Error, errorInfo?: React.ErrorInfo): Promise<ErrorReportResponse> {
    const report: ErrorReport = {
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo?.componentStack,
      userAgent: navigator.userAgent,
      url: window.location.href,
      timestamp: new Date().toISOString(),
      severity: 'fatal',
    };

    return this.post<ErrorReportResponse>('/api/errors/report', report);
  }
}

export const errorReportingService = new ErrorReportingService();
