/**
 * Authentication Error Class
 * Used by admin services for authentication errors
  */
export class AuthenticationError extends Error {
  constructor(message: string, public code: string = 'AUTH_ERROR') {
    super(message);
    this.name = 'AuthenticationError';
  }
}