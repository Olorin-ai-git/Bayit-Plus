/**
 * Axios Error Handler Utility
 * Provides consistent error notification handling for all axios instances
 */

import { AxiosError } from 'axios';
import { eventBusInstance } from '@shared/events/UnifiedEventBus';

/**
 * Generate user-friendly error message and emit toast notification
 * @param error Axios error object
 */
export function handleAxiosError(error: AxiosError): void {
  // Generate user-friendly error messages
  let userMessage: string;
  let errorTitle: string;

  const statusCode = error.response?.status;

  if (statusCode === 400) {
    errorTitle = 'Bad Request';
    userMessage = 'Invalid request. Please check your input and try again.';
  } else if (statusCode === 401) {
    errorTitle = 'Unauthorized';
    userMessage = 'You are not authorized. Please log in again.';
  } else if (statusCode === 403) {
    errorTitle = 'Forbidden';
    userMessage = 'You do not have permission to access this resource.';
  } else if (statusCode === 404) {
    errorTitle = 'Not Found';
    userMessage = 'The requested resource was not found.';
  } else if (statusCode === 408) {
    errorTitle = 'Request Timeout';
    userMessage = 'The request took too long. Please try again.';
  } else if (statusCode === 429) {
    errorTitle = 'Too Many Requests';
    userMessage = 'Too many requests. Please wait a moment and try again.';
  } else if (statusCode && statusCode >= 500 && statusCode < 600) {
    errorTitle = 'Server Error';
    userMessage = 'A server error occurred. Our team has been notified.';
  } else if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
    errorTitle = 'Connection Timeout';
    userMessage = 'Unable to connect to the server. Please check your connection.';
  } else if (error.code === 'ERR_NETWORK') {
    errorTitle = 'Network Error';
    userMessage = 'Unable to reach the server. Please check your connection and try again.';
  } else {
    errorTitle = 'Request Failed';
    userMessage = error.message || 'An error occurred while processing your request.';
  }

  // Emit error notification via event bus
  eventBusInstance.emit('ui:notification:show', {
    notification: {
      id: `api_error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: 'error',
      title: errorTitle,
      message: userMessage,
      duration: 5000
    }
  });
}

/**
 * Create axios response interceptor with error notification handling
 * @param redirectOn401 Whether to redirect to login on 401 error (default: true)
 */
export function createAxiosErrorInterceptor(redirectOn401: boolean = true) {
  return (error: AxiosError) => {
    // Handle 401 with optional redirect
    if (error.response?.status === 401 && redirectOn401) {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('authToken');
      window.location.href = '/login';
    }

    // Emit toast notification
    handleAxiosError(error);

    return Promise.reject(error);
  };
}
