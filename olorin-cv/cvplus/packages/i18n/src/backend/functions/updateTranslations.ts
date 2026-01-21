import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { logger } from 'firebase-functions/v2';
import { getFirestore } from 'firebase-admin/firestore';
// NOTE: Architecture violation - i18n (Layer 1) should not depend on auth
// import { authGuard } from '@cvplus/auth/middleware/authGuard';
const authGuard = (req: any) => req; // Placeholder
import { SupportedLanguage, SUPPORTED_LANGUAGES } from '../../index';

interface UpdateTranslationsRequest {
  language: SupportedLanguage;
  namespace: string;
  translations: Record<string, string>;
  merge?: boolean;
  source?: 'manual' | 'automated' | 'import' | 'api';
}

interface UpdateTranslationsResponse {
  success: boolean;
  language: SupportedLanguage;
  namespace: string;
  updatedKeys: string[];
  skippedKeys: string[];
  newKeys: string[];
  errors: Array<{
    key: string;
    error: string;
  }>;
  statistics: {
    totalProvided: number;
    successfulUpdates: number;
    failedUpdates: number;
    newTranslations: number;
  };
  timestamp: number;
}

/**
 * Firebase Function to update translation files and manage translation content
 * Requires admin privileges or translator role
  */
export const updateTranslations = onCall<UpdateTranslationsRequest, Promise<UpdateTranslationsResponse>>(
  {
    region: 'us-central1',
    memory: '1GiB',
    timeoutSeconds: 180,
    cors: true,
  },
  async (request) => {
    try {
      // Extract data and context
      const { data, auth } = request;
      const { language, namespace, translations, merge = true, source = 'manual' } = data;

      // Validate authentication
      if (!auth?.uid) {
        throw new HttpsError('unauthenticated', 'Authentication required for translation updates');
      }

      await authGuard(request);

      // Check admin or translator permissions
      if (!auth.token?.admin && !auth.token?.translator) {
        throw new HttpsError('permission-denied', 'Admin or translator privileges required');
      }

      // Validate input data
      if (!language || !SUPPORTED_LANGUAGES.includes(language)) {
        throw new HttpsError('invalid-argument', `Invalid language: ${language}`);
      }

      if (!namespace || typeof namespace !== 'string') {
        throw new HttpsError('invalid-argument', 'Valid namespace is required');
      }

      if (!translations || typeof translations !== 'object') {
        throw new HttpsError('invalid-argument', 'Valid translations object is required');
      }

      const translationKeys = Object.keys(translations);
      if (translationKeys.length === 0) {
        throw new HttpsError('invalid-argument', 'At least one translation is required');
      }

      if (translationKeys.length > 1000) {
        throw new HttpsError('invalid-argument', 'Maximum 1000 translation keys per update');
      }

      logger.info('Translation update requested', {
        userId: auth.uid,
        language,
        namespace,
        keyCount: translationKeys.length,
        merge,
        source,
      });

      // Initialize Firestore
      const db = getFirestore();

      // Get current translations
      const translationDocRef = db
        .collection('translations')
        .doc(language)
        .collection('namespaces')
        .doc(namespace);

      const currentDoc = await translationDocRef.get();
      const currentTranslations = currentDoc.exists ? currentDoc.data()?.translations || {} : {};

      // Process updates
      const updatedKeys: string[] = [];
      const skippedKeys: string[] = [];
      const newKeys: string[] = [];
      const errors: Array<{ key: string; error: string }> = [];

      const finalTranslations = merge ? { ...currentTranslations } : {};

      for (const [key, value] of Object.entries(translations)) {
        try {
          // Validate translation key format
          if (!isValidTranslationKey(key)) {
            errors.push({
              key,
              error: 'Invalid key format. Keys must be alphanumeric with dots, underscores, or hyphens.',
            });
            continue;
          }

          // Validate translation value
          if (typeof value !== 'string' || value.trim().length === 0) {
            errors.push({
              key,
              error: 'Translation value must be a non-empty string.',
            });
            continue;
          }

          // Check if key exists
          const isNewKey = !(key in currentTranslations);
          const hasChanged = currentTranslations[key] !== value;

          if (isNewKey) {
            newKeys.push(key);
            finalTranslations[key] = value.trim();
          } else if (hasChanged) {
            updatedKeys.push(key);
            finalTranslations[key] = value.trim();
          } else {
            skippedKeys.push(key);
          }

        } catch (error) {
          errors.push({
            key,
            error: error.message || 'Unknown error processing translation',
          });
        }
      }

      // Update Firestore document
      const updateData = {
        translations: finalTranslations,
        metadata: {
          lastUpdated: Date.now(),
          updatedBy: auth.uid,
          source,
          version: (currentDoc.data()?.metadata?.version || 0) + 1,
          keyCount: Object.keys(finalTranslations).length,
        },
      };

      await translationDocRef.set(updateData, { merge: false });

      // Log translation update activity
      await db.collection('translationActivity').add({
        userId: auth.uid,
        action: 'update',
        language,
        namespace,
        source,
        statistics: {
          totalProvided: translationKeys.length,
          successfulUpdates: updatedKeys.length,
          newTranslations: newKeys.length,
          failedUpdates: errors.length,
        },
        timestamp: Date.now(),
      });

      // Update translation cache (trigger cache refresh)
      try {
        await db.collection('system').doc('cache').set({
          [`translations_${language}_${namespace}`]: Date.now(),
        }, { merge: true });
      } catch (cacheError) {
        logger.warn('Failed to update translation cache marker', {
          language,
          namespace,
          error: cacheError.message,
        });
      }

      const statistics = {
        totalProvided: translationKeys.length,
        successfulUpdates: updatedKeys.length + newKeys.length,
        failedUpdates: errors.length,
        newTranslations: newKeys.length,
      };

      logger.info('Translation update completed', {
        userId: auth.uid,
        language,
        namespace,
        statistics,
        errorCount: errors.length,
      });

      return {
        success: true,
        language,
        namespace,
        updatedKeys,
        skippedKeys,
        newKeys,
        errors,
        statistics,
        timestamp: Date.now(),
      };

    } catch (error) {
      logger.error('Update translations failed', {
        userId: request.auth?.uid,
        error: error.message,
        stack: error.stack,
      });

      if (error instanceof HttpsError) {
        throw error;
      }

      throw new HttpsError(
        'internal',
        `Failed to update translations: ${error.message}`,
        { originalError: error.message }
      );
    }
  }
);

/**
 * Delete translation keys
  */
export const deleteTranslationKeys = onCall<{
  language: SupportedLanguage;
  namespace: string;
  keys: string[];
}, Promise<{
  success: boolean;
  deletedKeys: string[];
  notFoundKeys: string[];
  timestamp: number;
}>>(
  {
    region: 'us-central1',
    memory: '512MiB',
    timeoutSeconds: 60,
    cors: true,
  },
  async (request) => {
    try {
      const { data, auth } = request;
      const { language, namespace, keys } = data;

      if (!auth?.uid) {
        throw new HttpsError('unauthenticated', 'Authentication required');
      }

      await authGuard(request);

      // Check admin privileges for deletion
      if (!auth.token?.admin) {
        throw new HttpsError('permission-denied', 'Admin privileges required for deletion');
      }

      if (!Array.isArray(keys) || keys.length === 0) {
        throw new HttpsError('invalid-argument', 'Keys array is required');
      }

      const db = getFirestore();
      const translationDocRef = db
        .collection('translations')
        .doc(language)
        .collection('namespaces')
        .doc(namespace);

      const currentDoc = await translationDocRef.get();
      if (!currentDoc.exists) {
        throw new HttpsError('not-found', 'Translation namespace not found');
      }

      const currentTranslations = currentDoc.data()?.translations || {};
      const deletedKeys: string[] = [];
      const notFoundKeys: string[] = [];

      // Process deletions
      for (const key of keys) {
        if (key in currentTranslations) {
          delete currentTranslations[key];
          deletedKeys.push(key);
        } else {
          notFoundKeys.push(key);
        }
      }

      // Update document
      await translationDocRef.update({
        translations: currentTranslations,
        'metadata.lastUpdated': Date.now(),
        'metadata.updatedBy': auth.uid,
        'metadata.keyCount': Object.keys(currentTranslations).length,
      });

      logger.info('Translation keys deleted', {
        userId: auth.uid,
        language,
        namespace,
        deletedCount: deletedKeys.length,
        notFoundCount: notFoundKeys.length,
      });

      return {
        success: true,
        deletedKeys,
        notFoundKeys,
        timestamp: Date.now(),
      };

    } catch (error) {
      logger.error('Delete translation keys failed', {
        userId: request.auth?.uid,
        error: error.message,
        stack: error.stack,
      });

      if (error instanceof HttpsError) {
        throw error;
      }

      throw new HttpsError(
        'internal',
        `Failed to delete translation keys: ${error.message}`,
        { originalError: error.message }
      );
    }
  }
);

/**
 * Validate translation key format
  */
function isValidTranslationKey(key: string): boolean {
  // Allow alphanumeric characters, dots, underscores, and hyphens
  const validKeyPattern = /^[a-zA-Z0-9._-]+$/;
  return validKeyPattern.test(key) && key.length > 0 && key.length <= 200;
}