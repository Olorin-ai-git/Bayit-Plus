import { HttpsError, CallableRequest } from 'firebase-functions/v2/https';
import { logger } from 'firebase-functions';
import * as admin from 'firebase-admin';

export interface AuthenticatedRequest extends CallableRequest {
  auth: {
    uid: string;
    token: any;
  };
}

export const requireAuth = async (request: any): Promise<AuthenticatedRequest> => {
  if (!request.auth) {
    logger.warn('Authentication required but not provided');
    throw new HttpsError('unauthenticated', 'Authentication required');
  }
  
  if (!request.auth.uid) {
    logger.warn('Invalid authentication token');
    throw new HttpsError('permission-denied', 'Invalid authentication token');
  }
  
  return request as AuthenticatedRequest;
};

export const withAuth = (handler: (request: AuthenticatedRequest, context?: any) => Promise<any>) => {
  return async (request: any, context?: any) => {
    const authenticatedRequest = await requireAuth(request);
    return handler(authenticatedRequest, context);
  };
};