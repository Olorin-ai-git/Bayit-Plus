# Firebase Functions Authentication Fix - 2025-08-22

## Issue Summary
Firebase Functions (specifically `generatePodcast` and other authenticated functions) are returning **401 Unauthorized** errors despite users being properly authenticated on the frontend.

## Root Cause Analysis

### 1. Authentication Token Handling
- **Problem**: Functions expect Firebase Auth tokens but may not be receiving or validating them properly
- **Evidence**: `withPremiumAccess` wrapper checks for `request.auth` but returns 401 errors
- **Impact**: All premium-gated functions fail for authenticated users

### 2. CORS Configuration Issues
- **Problem**: Frontend authentication tokens may not be transmitted properly due to CORS misconfigurations
- **Evidence**: Complex CORS setup in `cors.ts` with multiple origins and regex patterns
- **Impact**: Auth headers may be stripped or rejected

### 3. Premium Guard Implementation
- **Problem**: `premiumGuard` middleware has complex premium validation that may fail
- **Evidence**: Checks for `subscription.lifetimeAccess` and `subscription.features[feature]`
- **Impact**: Even authenticated users fail premium checks

## Security Assessment Findings

### Critical Issues Identified:

1. **Authentication Bypass Risk**: Functions don't have fallback authentication mechanisms
2. **Token Validation Gap**: No explicit token verification beyond Firebase's built-in validation
3. **Premium Access Logic**: Complex subscription checks may have edge cases
4. **Error Handling**: Authentication failures don't provide enough debugging information

## Comprehensive Fix Implementation

### 1. Enhanced Authentication Middleware
```typescript
// /Users/gklainert/Documents/cvplus/functions/src/middleware/authGuard.ts
import { HttpsError, CallableRequest } from 'firebase-functions/v2/https';
import { logger } from 'firebase-functions';
import * as admin from 'firebase-admin';

export interface AuthenticatedRequest extends CallableRequest {
  auth: {
    uid: string;
    token: admin.auth.DecodedIdToken;
  };
}

export const requireAuth = async (request: CallableRequest): Promise<AuthenticatedRequest> => {
  // Check if auth context exists
  if (!request.auth) {
    logger.error('Authentication failed: No auth context', {
      headers: request.data?.headers,
      origin: request.rawRequest?.headers?.origin
    });
    throw new HttpsError('unauthenticated', 'User must be authenticated');
  }

  const { uid, token } = request.auth;
  
  // Verify the token is valid and not expired
  if (!uid || !token) {
    logger.error('Authentication failed: Invalid token', { uid: !!uid, token: !!token });
    throw new HttpsError('unauthenticated', 'Invalid authentication token');
  }

  // Additional token validation
  try {
    // Verify token is not expired (Firebase should handle this, but double-check)
    const currentTime = Math.floor(Date.now() / 1000);
    if (token.exp <= currentTime) {
      logger.error('Authentication failed: Token expired', {
        uid,
        exp: token.exp,
        currentTime
      });
      throw new HttpsError('unauthenticated', 'Authentication token has expired');
    }

    // Verify token was issued recently (within 24 hours)
    if (currentTime - token.iat > 86400) {
      logger.warn('Authentication warning: Old token', {
        uid,
        iat: token.iat,
        age: currentTime - token.iat
      });
    }

    logger.info('Authentication successful', {
      uid,
      email: token.email,
      emailVerified: token.email_verified
    });

    return {
      ...request,
      auth: { uid, token }
    } as AuthenticatedRequest;

  } catch (error) {
    logger.error('Authentication validation failed', { error, uid });
    throw new HttpsError('unauthenticated', 'Authentication validation failed');
  }
};
```

### 2. Improved Premium Guard with Better Error Handling
```typescript
// Enhanced premiumGuard.ts with detailed logging
import { HttpsError } from 'firebase-functions/v2/https';
import { logger } from 'firebase-functions';
import { getUserSubscriptionInternal } from '../functions/payments/getUserSubscription';
import { requireAuth, AuthenticatedRequest } from './authGuard';

type PremiumFeature = 'webPortal' | 'aiChat' | 'podcast' | 'advancedAnalytics' | 'videoIntroduction';

export const premiumGuard = (feature: PremiumFeature) => {
  return async (request: any): Promise<AuthenticatedRequest> => {
    // First ensure user is authenticated
    const authenticatedRequest = await requireAuth(request);
    const { uid } = authenticatedRequest.auth;

    try {
      logger.info('Premium access check initiated', { uid, feature });

      // Get user subscription with detailed logging
      const subscription = await getUserSubscriptionInternal(uid);
      
      logger.info('Subscription data retrieved', {
        uid,
        hasSubscription: !!subscription,
        lifetimeAccess: subscription?.lifetimeAccess,
        subscriptionStatus: subscription?.subscriptionStatus,
        features: subscription?.features
      });

      // Check for lifetime premium access
      if (!subscription?.lifetimeAccess) {
        logger.warn('Premium access denied: No lifetime access', {
          uid,
          feature,
          subscriptionStatus: subscription?.subscriptionStatus
        });

        throw new HttpsError(
          'permission-denied',
          `This feature requires lifetime premium access. Please upgrade to access '${feature}'.`,
          {
            feature,
            upgradeUrl: '/pricing',
            accessType: 'lifetime',
            currentStatus: subscription?.subscriptionStatus || 'free'
          }
        );
      }

      // Check specific feature access
      if (!subscription?.features?.[feature]) {
        logger.warn('Premium access denied: Feature not included', {
          uid,
          feature,
          availableFeatures: Object.keys(subscription.features || {})
        });

        throw new HttpsError(
          'permission-denied',
          `Your premium subscription does not include access to '${feature}'. Please upgrade your plan.`,
          {
            feature,
            upgradeUrl: '/pricing',
            availableFeatures: subscription.features
          }
        );
      }

      logger.info('Premium access granted', {
        uid,
        feature,
        subscriptionStatus: subscription.subscriptionStatus
      });

      return authenticatedRequest;

    } catch (error) {
      if (error instanceof HttpsError) {
        throw error;
      }

      logger.error('Premium guard error', { error, uid, feature });
      throw new HttpsError(
        'internal',
        'Failed to verify premium access',
        { feature, originalError: error }
      );
    }
  };
};

// Enhanced wrapper with better error context
export const withPremiumAccess = (feature: PremiumFeature, handler: Function) => {
  return async (request: any, context?: any) => {
    try {
      // Check premium access and authenticate
      const authenticatedRequest = await premiumGuard(feature)(request);
      
      // Execute the original handler with authenticated request
      return await handler(authenticatedRequest, context);
    } catch (error) {
      logger.error('Premium function execution failed', {
        feature,
        error: error instanceof Error ? error.message : error,
        uid: request.auth?.uid
      });
      throw error;
    }
  };
};
```

### 3. Enhanced Function Implementation
```typescript
// Updated generatePodcast.ts with better authentication handling
import { onCall } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { corsOptions } from '../config/cors';
import { withPremiumAccess } from '../middleware/premiumGuard';
import { podcastGenerationService } from '../services/podcast-generation.service';
import { sanitizeForFirestore, sanitizeErrorContext } from '../utils/firestore-sanitizer';
import { logger } from 'firebase-functions';

export const generatePodcast = onCall(
  {
    timeoutSeconds: 540,
    memory: '2GiB',
    secrets: ['ELEVENLABS_API_KEY', 'ELEVENLABS_HOST1_VOICE_ID', 'ELEVENLABS_HOST2_VOICE_ID', 'OPENAI_API_KEY'],
    ...corsOptions
  },
  withPremiumAccess('podcast', async (request) => {
    const startTime = Date.now();
    logger.info('🎙️ generatePodcast function called', {
      uid: request.auth.uid,
      data: request.data,
      timestamp: new Date().toISOString()
    });
    
    const { 
      jobId, 
      style = 'casual',
      duration = 'medium',
      focus = 'balanced' 
    } = request.data;

    if (!jobId) {
      logger.error('❌ Missing jobId parameter');
      throw new Error('Job ID is required');
    }

    try {
      logger.info('📖 Fetching job document', { jobId, uid: request.auth.uid });
      
      // Get the job data with parsed CV
      const jobDoc = await admin.firestore()
        .collection('jobs')
        .doc(jobId)
        .get();
      
      if (!jobDoc.exists) {
        logger.error('❌ Job document not found', { jobId, uid: request.auth.uid });
        throw new Error('Job not found');
      }
      
      const jobData = jobDoc.data();
      
      // Verify job ownership
      if (jobData?.userId !== request.auth.uid) {
        logger.error('❌ Job ownership verification failed', {
          jobId,
          requestUid: request.auth.uid,
          jobUserId: jobData?.userId
        });
        throw new Error('Access denied: Job belongs to different user');
      }
      
      if (!jobData?.parsedData) {
        logger.error('❌ No parsedData found in job document', {
          jobId,
          availableFields: Object.keys(jobData || {})
        });
        throw new Error('CV data not found. Please ensure CV is parsed first.');
      }
      
      logger.info('✅ Job validation successful, proceeding with podcast generation', {
        jobId,
        uid: request.auth.uid,
        hasParseData: !!jobData.parsedData
      });

      // Update status to processing
      await admin.firestore()
        .collection('jobs')
        .doc(jobId)
        .update({
          'enhancedFeatures.generatePodcast.status': 'processing',
          'enhancedFeatures.generatePodcast.progress': 25,
          'enhancedFeatures.generatePodcast.currentStep': 'Creating podcast script...',
          'enhancedFeatures.generatePodcast.startedAt': FieldValue.serverTimestamp(),
          podcastStatus: 'generating',
          updatedAt: FieldValue.serverTimestamp()
        });

      // Generate conversational podcast
      const podcastResult = await podcastGenerationService.generatePodcast(
        jobData.parsedData,
        jobId,
        request.auth.uid,
        { style, duration, focus }
      );

      // Update progress
      await admin.firestore()
        .collection('jobs')
        .doc(jobId)
        .update({
          'enhancedFeatures.generatePodcast.progress': 75,
          'enhancedFeatures.generatePodcast.currentStep': 'Finalizing podcast audio...'
        });

      const sanitizedPodcastData = sanitizeForFirestore(podcastResult);
      
      const updateData = sanitizeForFirestore({
        'enhancedFeatures.generatePodcast.status': 'completed',
        'enhancedFeatures.generatePodcast.progress': 100,
        'enhancedFeatures.generatePodcast.data': sanitizedPodcastData,
        'enhancedFeatures.generatePodcast.processedAt': FieldValue.serverTimestamp(),
        'enhancedFeatures.generatePodcast.processingTime': Date.now() - startTime,
        podcastStatus: 'completed',
        podcast: sanitizeForFirestore({
          url: podcastResult.audioUrl,
          transcript: podcastResult.transcript,
          duration: podcastResult.duration,
          chapters: podcastResult.chapters,
          generatedAt: FieldValue.serverTimestamp()
        }),
        'enhancedFeatures.podcast': sanitizeForFirestore({
          enabled: true,
          status: 'completed',
          data: {
            url: podcastResult.audioUrl,
            duration: podcastResult.duration
          }
        }),
        updatedAt: FieldValue.serverTimestamp()
      });

      await admin.firestore()
        .collection('jobs')
        .doc(jobId)
        .update(updateData);

      logger.info('✅ Podcast generation completed successfully', {
        jobId,
        uid: request.auth.uid,
        processingTime: Date.now() - startTime,
        audioUrl: podcastResult.audioUrl
      });

      return {
        success: true,
        podcastUrl: podcastResult.audioUrl,
        transcript: podcastResult.transcript,
        duration: podcastResult.duration,
        chapters: podcastResult.chapters
      };

    } catch (error: any) {
      const processingTime = Date.now() - startTime;
      logger.error('❌ Podcast generation failed', {
        error: error.message,
        stack: error.stack,
        jobId,
        uid: request.auth.uid,
        processingTime
      });
      
      const sanitizedErrorContext = sanitizeErrorContext({
        errorMessage: error.message,
        errorStack: error.stack,
        errorCode: error.code,
        processingTime,
        timestamp: new Date().toISOString()
      });
      
      const errorUpdateData = sanitizeForFirestore({
        'enhancedFeatures.generatePodcast.status': 'failed',
        'enhancedFeatures.generatePodcast.error': error.message || 'Unknown error',
        'enhancedFeatures.generatePodcast.errorContext': sanitizedErrorContext,
        'enhancedFeatures.generatePodcast.processedAt': FieldValue.serverTimestamp(),
        podcastStatus: 'failed',
        podcastError: error.message || 'Unknown error',
        updatedAt: FieldValue.serverTimestamp()
      });
      
      await admin.firestore()
        .collection('jobs')
        .doc(jobId)
        .update(errorUpdateData);
      
      throw new Error(`Failed to generate podcast: ${error.message}`);
    }
  })
);
```

### 4. Frontend Authentication Token Verification
```typescript
// Enhanced frontend authentication service
// /Users/gklainert/Documents/cvplus/frontend/src/services/authService.ts
import { auth } from '../lib/firebase';
import { User, getIdToken } from 'firebase/auth';

export class AuthService {
  /**
   * Get fresh ID token for authenticated requests
   */
  static async getAuthToken(forceRefresh = false): Promise<string | null> {
    const user = auth.currentUser;
    if (!user) {
      console.warn('No authenticated user found');
      return null;
    }

    try {
      const token = await getIdToken(user, forceRefresh);
      console.log('✅ ID token retrieved successfully', {
        uid: user.uid,
        forceRefresh
      });
      return token;
    } catch (error) {
      console.error('❌ Failed to get ID token:', error);
      return null;
    }
  }

  /**
   * Verify user authentication status
   */
  static async verifyAuth(): Promise<{
    authenticated: boolean;
    user: User | null;
    token: string | null;
    error?: string;
  }> {
    try {
      const user = auth.currentUser;
      if (!user) {
        return { authenticated: false, user: null, token: null };
      }

      // Get fresh token
      const token = await getIdToken(user, true);
      
      // Verify token is valid
      if (!token) {
        return { 
          authenticated: false, 
          user: null, 
          token: null,
          error: 'Failed to retrieve authentication token'
        };
      }

      console.log('✅ Authentication verified', {
        uid: user.uid,
        email: user.email,
        tokenLength: token.length
      });

      return { authenticated: true, user, token };
    } catch (error) {
      console.error('❌ Authentication verification failed:', error);
      return { 
        authenticated: false, 
        user: null, 
        token: null,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}
```

## Implementation Plan

### Phase 1: Immediate Fixes (High Priority)
1. ✅ Create enhanced authentication middleware (`authGuard.ts`)
2. ✅ Update premium guard with better error handling
3. ✅ Enhance `generatePodcast` function with improved auth validation
4. 🔄 Test authentication flow end-to-end

### Phase 2: Comprehensive Security Enhancement
1. Apply enhanced auth middleware to all premium functions
2. Implement frontend auth token verification service
3. Add comprehensive logging for auth debugging
4. Create auth monitoring dashboard

### Phase 3: Testing & Validation
1. Test all premium functions with various user scenarios
2. Validate CORS configuration with auth headers
3. Performance test auth middleware overhead
4. Security audit of complete auth flow

## Security Recommendations

1. **Token Refresh Strategy**: Implement automatic token refresh for long-running operations
2. **Rate Limiting**: Add rate limiting to auth-sensitive endpoints
3. **Audit Logging**: Log all authentication events for security monitoring
4. **Fallback Mechanisms**: Implement graceful degradation for auth failures
5. **Security Headers**: Ensure all responses include appropriate security headers

## Testing Checklist

- [ ] Generate podcast with authenticated user
- [ ] Test premium access validation
- [ ] Verify CORS headers with auth tokens
- [ ] Test token expiration handling
- [ ] Validate error messages are user-friendly
- [ ] Check auth logging completeness
- [ ] Test multiple concurrent auth requests

## Success Metrics

- **Authentication Success Rate**: > 99%
- **Token Validation Time**: < 100ms
- **Error Rate Reduction**: > 90%
- **User-Friendly Error Messages**: 100% coverage