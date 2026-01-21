export interface ErrorContext {
  code: string;
  message: string;
  severity: 'info' | 'warning' | 'error';
}

export class ProcessingError extends Error {
  constructor(public code: string, public severity: 'info' | 'warning' | 'error' = 'error') {
    super(code);
  }
}
