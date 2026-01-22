/**
 * Error handling and sanitization utilities
 */

/**
 * Sanitize error messages for production
 * Prevents exposure of internal details
 */
export const sanitizeErrorMessage = (error: Error): string => {
  if (process.env.NODE_ENV === 'production') {
    // Log full error for debugging
    console.error('Error details:', error);
    // Return generic message to user
    return 'An error occurred. Please try again later.';
  }
  return error.message;
};
