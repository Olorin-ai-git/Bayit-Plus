// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflictsimport { onCall, HttpsError } from 'firebase-functions/v2/https';
import { logger } from 'firebase-functions/v2';
import { authGuard } from '@cvplus/auth/middleware/authGuard';
import { premiumGuard } from '@cvplus/premium/middleware/premiumGuard';
import { TranslationService } from '@cvplus/i18n';
import { CVData, TranslatedCVData } from '@cvplus/core';

interface TranslateCVRequest {
  cvData: CVData;
  targetLanguage: string;
  sections?: string[];
  preserveFormatting?: boolean;
}

interface TranslateCVResponse {
  success: boolean;
  translatedCV?: TranslatedCVData;
  error?: string;
  language: string;
  translatedSections: string[];
  timestamp: number;
}

/**
 * Firebase Function to translate CV content to target language
 * Requires authentication and premium access for professional translations
 */
export const translateCV = onCall<TranslateCVRequest, Promise<TranslateCVResponse>>(
  {
    region: 'us-central1',
    memory: '1GiB',
    timeoutSeconds: 120,
    cors: true,
  },
  async (request) => {
    const startTime = Date.now();

    try {
      // Extract data and context
      const { data, auth } = request;
      const { cvData, targetLanguage, sections, preserveFormatting = true } = data;

      // Validate authentication
      if (!auth?.uid) {
        throw new HttpsError('unauthenticated', 'User must be authenticated to translate CV');
      }

      // Apply authentication middleware
      await authGuard(request);

      // Apply premium access guard for professional translation features
      await premiumGuard(request, 'cvTranslation');

      // Validate input data
      if (!cvData || typeof cvData !== 'object') {
        throw new HttpsError('invalid-argument', 'Valid CV data is required');
      }

      if (!targetLanguage || typeof targetLanguage !== 'string') {
        throw new HttpsError('invalid-argument', 'Target language is required');
      }

      // Log translation request
      logger.info('CV Translation requested', {
        userId: auth.uid,
        targetLanguage,
        sections: sections?.length || 'all',
        timestamp: startTime,
      });

      // Initialize translation service
      const translationService = TranslationService.getInstance({
        defaultLanguage: 'en',
        fallbackLanguage: 'en',
        enableProfessionalTerms: true,
        enableCaching: true,
      });

      // Perform CV translation
      const translationOptions = {
        preserveFormatting,
        includeProfessionalTerms: true,
        adaptCulturally: true,
        maintainStructure: true,
      };

      const translatedCV = await translationService.translateCV(
        cvData,
        targetLanguage,
        sections,
        translationOptions
      );

      // Calculate processing time
      const processingTime = Date.now() - startTime;

      // Log successful translation
      logger.info('CV Translation completed', {
        userId: auth.uid,
        targetLanguage,
        processingTime,
        sectionsTranslated: translatedCV.translatedSections?.length || 0,
      });

      return {
        success: true,
        translatedCV,
        language: targetLanguage,
        translatedSections: translatedCV.translatedSections || [],
        timestamp: Date.now(),
      };

    } catch (error) {
      const processingTime = Date.now() - startTime;

      logger.error('CV Translation failed', {
        userId: request.auth?.uid,
        error: error.message,
        processingTime,
        stack: error.stack,
      });

      // Handle different error types
      if (error instanceof HttpsError) {
        throw error;
      }

      // Generic error handling
      throw new HttpsError(
        'internal',
        `Failed to translate CV: ${error.message}`,
        {
          originalError: error.message,
          processingTime,
        }
      );
    }
  }
);