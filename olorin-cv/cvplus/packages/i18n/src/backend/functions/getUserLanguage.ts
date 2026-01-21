import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { logger } from 'firebase-functions/v2';
import { getFirestore } from 'firebase-admin/firestore';
// NOTE: Architecture violation - local auth middleware doesn't exist
// import { authGuard } from '../middleware/authGuard';
const authGuard = (req: any) => Promise.resolve(req); // Placeholder
import { SupportedLanguage, SUPPORTED_LANGUAGES } from '@cvplus/i18n';

interface GetUserLanguageRequest {
  userId?: string;
}

interface GetUserLanguageResponse {
  success: boolean;
  language: SupportedLanguage;
  isDefault: boolean;
  lastUpdated?: number;
  preferences?: {
    cvLanguage?: SupportedLanguage;
    interfaceLanguage?: SupportedLanguage;
    communicationLanguage?: SupportedLanguage;
  };
}

/**
 * Firebase Function to get user's preferred language settings
 * Returns user language preferences or defaults
  */
export const getUserLanguage = onCall<GetUserLanguageRequest, Promise<GetUserLanguageResponse>>(
  {
    region: 'us-central1',
    memory: '512MiB',
    timeoutSeconds: 30,
    cors: true,
  },
  async (request) => {
    try {
      // Extract data and context
      const { data, auth } = request;
      const { userId } = data;

      // Validate authentication
      if (!auth?.uid) {
        throw new HttpsError('unauthenticated', 'User must be authenticated');
      }

      // Apply authentication middleware
      await authGuard(request);

      const targetUserId = userId || auth.uid;

      // Ensure user can only access their own language settings (or admin access)
      if (targetUserId !== auth.uid && !auth.token?.admin) {
        throw new HttpsError('permission-denied', 'Cannot access other user language settings');
      }

      // Initialize Firestore
      const db = getFirestore();

      // Get user language preferences from Firestore
      const userDocRef = db.collection('users').doc(targetUserId);
      const userDoc = await userDocRef.get();

      let language: SupportedLanguage = 'en';
      let isDefault = true;
      let lastUpdated: number | undefined;
      let preferences: any = {};

      if (userDoc.exists) {
        const userData = userDoc.data();

        // Check for language preferences
        if (userData?.language && SUPPORTED_LANGUAGES.includes(userData.language)) {
          language = userData.language;
          isDefault = false;
        }

        // Get detailed preferences
        if (userData?.languagePreferences) {
          preferences = {
            cvLanguage: userData.languagePreferences.cv || language,
            interfaceLanguage: userData.languagePreferences.interface || language,
            communicationLanguage: userData.languagePreferences.communication || language,
          };
        }

        lastUpdated = userData?.languageUpdated || userData?.updatedAt;
      }

      // If no language set, try to detect from browser/request
      if (isDefault) {
        const browserLanguage = request.rawRequest?.headers?.['accept-language'];
        if (browserLanguage) {
          const detectedLanguage = detectLanguageFromHeader(browserLanguage);
          if (detectedLanguage && SUPPORTED_LANGUAGES.includes(detectedLanguage)) {
            language = detectedLanguage;

            // Save detected language for future use
            await userDocRef.set({
              language: detectedLanguage,
              languageUpdated: Date.now(),
              languageSource: 'auto-detected',
            }, { merge: true });

            isDefault = false;
          }
        }
      }

      logger.info('User language retrieved', {
        userId: targetUserId,
        language,
        isDefault,
        requestedBy: auth.uid,
      });

      return {
        success: true,
        language,
        isDefault,
        lastUpdated,
        preferences: Object.keys(preferences).length > 0 ? preferences : undefined,
      };

    } catch (error) {
      logger.error('Get user language failed', {
        userId: request.auth?.uid,
        error: error.message,
        stack: error.stack,
      });

      // Handle different error types
      if (error instanceof HttpsError) {
        throw error;
      }

      // Generic error handling
      throw new HttpsError(
        'internal',
        `Failed to get user language: ${error.message}`,
        { originalError: error.message }
      );
    }
  }
);

/**
 * Update user language preferences
  */
export const updateUserLanguage = onCall<{
  language: SupportedLanguage;
  preferences?: {
    cvLanguage?: SupportedLanguage;
    interfaceLanguage?: SupportedLanguage;
    communicationLanguage?: SupportedLanguage;
  };
}, Promise<{ success: boolean; updated: number }>>(
  {
    region: 'us-central1',
    memory: '512MiB',
    timeoutSeconds: 30,
    cors: true,
  },
  async (request) => {
    try {
      const { data, auth } = request;
      const { language, preferences } = data;

      if (!auth?.uid) {
        throw new HttpsError('unauthenticated', 'User must be authenticated');
      }

      await authGuard(request);

      if (!language || !SUPPORTED_LANGUAGES.includes(language)) {
        throw new HttpsError('invalid-argument', 'Invalid language specified');
      }

      // Validate preferences if provided
      if (preferences) {
        const { cvLanguage, interfaceLanguage, communicationLanguage } = preferences;

        if (cvLanguage && !SUPPORTED_LANGUAGES.includes(cvLanguage)) {
          throw new HttpsError('invalid-argument', 'Invalid CV language specified');
        }
        if (interfaceLanguage && !SUPPORTED_LANGUAGES.includes(interfaceLanguage)) {
          throw new HttpsError('invalid-argument', 'Invalid interface language specified');
        }
        if (communicationLanguage && !SUPPORTED_LANGUAGES.includes(communicationLanguage)) {
          throw new HttpsError('invalid-argument', 'Invalid communication language specified');
        }
      }

      const db = getFirestore();
      const userDocRef = db.collection('users').doc(auth.uid);

      const updateData: any = {
        language,
        languageUpdated: Date.now(),
        languageSource: 'user-selected',
      };

      if (preferences) {
        updateData.languagePreferences = preferences;
      }

      await userDocRef.set(updateData, { merge: true });

      logger.info('User language updated', {
        userId: auth.uid,
        language,
        preferences: preferences ? Object.keys(preferences) : undefined,
      });

      return {
        success: true,
        updated: Date.now(),
      };

    } catch (error) {
      logger.error('Update user language failed', {
        userId: request.auth?.uid,
        error: error.message,
        stack: error.stack,
      });

      if (error instanceof HttpsError) {
        throw error;
      }

      throw new HttpsError(
        'internal',
        `Failed to update user language: ${error.message}`,
        { originalError: error.message }
      );
    }
  }
);

/**
 * Detect language from Accept-Language header
  */
function detectLanguageFromHeader(acceptLanguage: string): SupportedLanguage | null {
  const languages = acceptLanguage
    .split(',')
    .map(lang => lang.split(';')[0].trim().toLowerCase())
    .map(lang => lang.split('-')[0]); // Extract language code (ignore region)

  for (const lang of languages) {
    if (SUPPORTED_LANGUAGES.includes(lang as SupportedLanguage)) {
      return lang as SupportedLanguage;
    }
  }

  return null;
}