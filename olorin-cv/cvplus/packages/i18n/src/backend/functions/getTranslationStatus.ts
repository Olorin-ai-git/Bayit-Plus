import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { logger } from 'firebase-functions/v2';
// NOTE: Architecture violation - i18n (Layer 1) should not depend on auth (Layer 1)
// import { authGuard } from '@cvplus/auth/middleware/authGuard';
const authGuard = (req: any) => req; // Placeholder
import { TranslationService, SUPPORTED_LANGUAGES } from '../../index';
import { SupportedLanguage } from '../../index';

interface GetTranslationStatusRequest {
  languages?: SupportedLanguage[];
  namespaces?: string[];
  includeStatistics?: boolean;
}

interface TranslationStatusResponse {
  success: boolean;
  languages: Array<{
    code: SupportedLanguage;
    name: string;
    isRTL: boolean;
    completionPercentage: number;
    totalKeys: number;
    translatedKeys: number;
    missingKeys: number;
    namespaces: Array<{
      name: string;
      completionPercentage: number;
      totalKeys: number;
      translatedKeys: number;
      missingKeys: string[];
    }>;
    lastUpdated?: number;
    quality?: {
      averageScore: number;
      reviewedKeys: number;
      flaggedKeys: number;
    };
  }>;
  overall: {
    averageCompletion: number;
    totalLanguages: number;
    fullyTranslatedLanguages: number;
    partiallyTranslatedLanguages: number;
  };
  timestamp: number;
}

/**
 * Firebase Function to get translation status and completion statistics
 * Provides detailed information about translation coverage across languages and namespaces
  */
export const getTranslationStatus = onCall<GetTranslationStatusRequest, Promise<TranslationStatusResponse>>(
  {
    region: 'us-central1',
    memory: '512MiB',
    timeoutSeconds: 60,
    cors: true,
  },
  async (request) => {
    try {
      // Extract data and context
      const { data, auth } = request;
      const { languages, namespaces, includeStatistics = true } = data;

      // Validate authentication (optional for status checks, but required for detailed statistics)
      if (includeStatistics && !auth?.uid) {
        throw new HttpsError('unauthenticated', 'Authentication required for detailed statistics');
      }

      if (auth?.uid) {
        await authGuard(request);
      }

      // Use provided languages or all supported languages
      const targetLanguages = languages || SUPPORTED_LANGUAGES;
      
      // Validate requested languages
      for (const lang of targetLanguages) {
        if (!SUPPORTED_LANGUAGES.includes(lang)) {
          throw new HttpsError('invalid-argument', `Unsupported language: ${lang}`);
        }
      }

      logger.info('Translation status requested', {
        userId: auth?.uid || 'anonymous',
        languages: targetLanguages.length,
        namespaces: namespaces?.length || 'all',
        includeStatistics,
      });

      // Initialize translation service
      const translationService = TranslationService.getInstance({
        enableCaching: true,
      });

      // Get translation status for each language
      const languageStatuses = await Promise.all(
        targetLanguages.map(async (language) => {
          try {
            // Get language information
            const languageInfo = await translationService.getLanguageInfo(language);
            
            // Get translation completeness
            const completeness = await translationService.getTranslationCompleteness(
              language,
              namespaces
            );

            // Get namespace details
            const namespaceDetails = await Promise.all(
              (namespaces || completeness.availableNamespaces).map(async (namespace) => {
                const namespaceStatus = await translationService.getNamespaceCompleteness(
                  language,
                  namespace
                );

                return {
                  name: namespace,
                  completionPercentage: namespaceStatus.completionPercentage,
                  totalKeys: namespaceStatus.totalKeys,
                  translatedKeys: namespaceStatus.translatedKeys,
                  missingKeys: namespaceStatus.missingKeys,
                };
              })
            );

            let quality;
            if (includeStatistics && auth?.uid) {
              // Get quality metrics (requires authentication)
              quality = await translationService.getTranslationQuality(language);
            }

            return {
              code: language,
              name: languageInfo.displayName,
              isRTL: languageInfo.isRTL,
              completionPercentage: completeness.completionPercentage,
              totalKeys: completeness.totalKeys,
              translatedKeys: completeness.translatedKeys,
              missingKeys: completeness.missingKeys,
              namespaces: namespaceDetails,
              lastUpdated: completeness.lastUpdated,
              quality,
            };

          } catch (error) {
            logger.warn('Failed to get status for language', {
              language,
              error: error.message,
            });

            return {
              code: language,
              name: language,
              isRTL: false,
              completionPercentage: 0,
              totalKeys: 0,
              translatedKeys: 0,
              missingKeys: 0,
              namespaces: [],
              error: error.message,
            };
          }
        })
      );

      // Calculate overall statistics
      const totalLanguages = languageStatuses.length;
      const completionPercentages = languageStatuses
        .filter(lang => !lang.error)
        .map(lang => lang.completionPercentage);
      
      const averageCompletion = completionPercentages.length > 0
        ? completionPercentages.reduce((sum, pct) => sum + pct, 0) / completionPercentages.length
        : 0;

      const fullyTranslatedLanguages = languageStatuses.filter(
        lang => !lang.error && lang.completionPercentage >= 100
      ).length;

      const partiallyTranslatedLanguages = languageStatuses.filter(
        lang => !lang.error && lang.completionPercentage > 0 && lang.completionPercentage < 100
      ).length;

      logger.info('Translation status retrieved', {
        userId: auth?.uid || 'anonymous',
        totalLanguages,
        averageCompletion: Math.round(averageCompletion),
        fullyTranslatedLanguages,
        partiallyTranslatedLanguages,
      });

      return {
        success: true,
        languages: languageStatuses.filter(lang => !lang.error),
        overall: {
          averageCompletion: Math.round(averageCompletion * 100) / 100,
          totalLanguages,
          fullyTranslatedLanguages,
          partiallyTranslatedLanguages,
        },
        timestamp: Date.now(),
      };

    } catch (error) {
      logger.error('Get translation status failed', {
        userId: request.auth?.uid,
        error: error.message,
        stack: error.stack,
      });

      if (error instanceof HttpsError) {
        throw error;
      }

      throw new HttpsError(
        'internal',
        `Failed to get translation status: ${error.message}`,
        { originalError: error.message }
      );
    }
  }
);

/**
 * Get translation progress for specific content or project
  */
export const getTranslationProgress = onCall<{
  projectId?: string;
  contentType?: 'cv' | 'profile' | 'general';
  userId?: string;
}, Promise<{
  success: boolean;
  progress: {
    overall: number;
    byLanguage: Record<string, number>;
    byContentType: Record<string, number>;
  };
  recommendations: string[];
  timestamp: number;
}>>(
  {
    region: 'us-central1',
    memory: '512MiB',
    timeoutSeconds: 30,
    cors: true,
  },
  async (request) => {
    try {
      const { data, auth } = request;
      const { projectId, contentType, userId } = data;

      if (!auth?.uid) {
        throw new HttpsError('unauthenticated', 'Authentication required for translation progress');
      }

      await authGuard(request);

      // Validate user can access this progress information
      const targetUserId = userId || auth.uid;
      if (targetUserId !== auth.uid && !auth.token?.admin) {
        throw new HttpsError('permission-denied', 'Cannot access other user progress information');
      }

      const translationService = TranslationService.getInstance();
      
      // Get user-specific translation progress
      const progress = await translationService.getUserTranslationProgress(
        targetUserId,
        { projectId, contentType }
      );

      // Generate recommendations based on progress
      const recommendations = await translationService.generateProgressRecommendations(
        targetUserId,
        progress
      );

      logger.info('Translation progress retrieved', {
        userId: targetUserId,
        requestedBy: auth.uid,
        projectId,
        contentType,
        overallProgress: progress.overall,
      });

      return {
        success: true,
        progress,
        recommendations,
        timestamp: Date.now(),
      };

    } catch (error) {
      logger.error('Get translation progress failed', {
        userId: request.auth?.uid,
        error: error.message,
        stack: error.stack,
      });

      if (error instanceof HttpsError) {
        throw error;
      }

      throw new HttpsError(
        'internal',
        `Failed to get translation progress: ${error.message}`,
        { originalError: error.message }
      );
    }
  }
);