// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflictsimport { onCall, HttpsError } from 'firebase-functions/v2/https';
import { logger } from 'firebase-functions/v2';
import { authGuard } from '@cvplus/auth/middleware/authGuard';
import { premiumGuard } from '@cvplus/premium/middleware/premiumGuard';
import { TranslationService, SupportedLanguage } from '@cvplus/i18n';

interface TranslateProfessionalRequest {
  items: Array<{
    id: string;
    type: 'jobTitle' | 'skill' | 'industry' | 'degree' | 'certification' | 'company';
    text: string;
    context?: string;
    industry?: string;
    level?: string;
  }>;
  targetLanguage: SupportedLanguage;
  sourceLanguage?: SupportedLanguage;
}

interface TranslateProfessionalResponse {
  success: boolean;
  translations: Array<{
    id: string;
    originalText: string;
    translatedText: string;
    type: string;
    confidence: number;
    alternatives?: string[];
  }>;
  targetLanguage: SupportedLanguage;
  sourceLanguage: SupportedLanguage;
  timestamp: number;
  statistics: {
    totalItems: number;
    successfulTranslations: number;
    failedTranslations: number;
    processingTime: number;
  };
}

/**
 * Firebase Function to translate professional terminology with industry-specific accuracy
 * Includes job titles, skills, industries, degrees, certifications, and company names
 */
export const translateProfessional = onCall<TranslateProfessionalRequest, Promise<TranslateProfessionalResponse>>(
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
      const { items, targetLanguage, sourceLanguage = 'en' } = data;

      // Validate authentication
      if (!auth?.uid) {
        throw new HttpsError('unauthenticated', 'User must be authenticated for professional translations');
      }

      // Apply authentication middleware
      await authGuard(request);

      // Apply premium guard - professional terminology requires premium access
      await premiumGuard(request, 'professionalTerminology');

      // Validate input data
      if (!Array.isArray(items) || items.length === 0) {
        throw new HttpsError('invalid-argument', 'Items array is required');
      }

      if (items.length > 200) {
        throw new HttpsError('invalid-argument', 'Maximum 200 items per request for professional translation');
      }

      if (!targetLanguage) {
        throw new HttpsError('invalid-argument', 'Target language is required');
      }

      // Validate all items have required fields
      for (const item of items) {
        if (!item.id || !item.type || !item.text) {
          throw new HttpsError('invalid-argument', 'Each item must have id, type, and text');
        }

        const validTypes = ['jobTitle', 'skill', 'industry', 'degree', 'certification', 'company'];
        if (!validTypes.includes(item.type)) {
          throw new HttpsError('invalid-argument', `Invalid type: ${item.type}. Must be one of: ${validTypes.join(', ')}`);
        }
      }

      logger.info('Professional terminology translation requested', {
        userId: auth.uid,
        itemCount: items.length,
        targetLanguage,
        sourceLanguage,
        types: [...new Set(items.map(item => item.type))],
        timestamp: startTime,
      });

      // Initialize translation service with professional terminology enabled
      const translationService = TranslationService.getInstance({
        defaultLanguage: sourceLanguage,
        fallbackLanguage: 'en',
        enableProfessionalTerms: true,
        enableIndustrySpecific: true,
        enableCaching: true,
        enableQualityAssurance: true,
      });

      // Process translations with professional context
      const translations = await Promise.allSettled(
        items.map(async (item) => {
          try {
            const translationOptions = {
              sourceLanguage,
              targetLanguage,
              context: item.context,
              industry: item.industry,
              level: item.level,
              type: item.type,
              enableAlternatives: true,
              qualityThreshold: 0.8,
            };

            let translatedText: string;
            let confidence: number = 1.0;
            let alternatives: string[] = [];

            switch (item.type) {
              case 'jobTitle':
                const jobResult = await translationService.translateJobTitle(
                  item.text,
                  targetLanguage,
                  item.industry,
                  translationOptions
                );
                translatedText = jobResult.translation;
                confidence = jobResult.confidence;
                alternatives = jobResult.alternatives || [];
                break;

              case 'skill':
                const skillResult = await translationService.translateSkill(
                  item.text,
                  targetLanguage,
                  item.context,
                  translationOptions
                );
                translatedText = skillResult.translation;
                confidence = skillResult.confidence;
                alternatives = skillResult.alternatives || [];
                break;

              case 'industry':
                translatedText = await translationService.translateIndustryTerm(
                  item.text,
                  targetLanguage,
                  translationOptions
                );
                break;

              case 'degree':
                translatedText = await translationService.translateEducationLevel(
                  item.text,
                  targetLanguage,
                  translationOptions
                );
                break;

              case 'certification':
                translatedText = await translationService.translateCertification(
                  item.text,
                  targetLanguage,
                  translationOptions
                );
                break;

              case 'company':
                // Company names often don't translate, but may need transliteration
                translatedText = await translationService.translateCompanyName(
                  item.text,
                  targetLanguage,
                  translationOptions
                );
                break;

              default:
                // Fallback to general professional translation
                translatedText = await translationService.translateProfessionalTerm(
                  item.text,
                  targetLanguage,
                  translationOptions
                );
            }

            return {
              id: item.id,
              originalText: item.text,
              translatedText,
              type: item.type,
              confidence,
              alternatives: alternatives.length > 0 ? alternatives : undefined,
              success: true,
            };

          } catch (error) {
            logger.warn('Professional term translation failed for item', {
              itemId: item.id,
              type: item.type,
              text: item.text,
              error: error.message,
            });

            return {
              id: item.id,
              originalText: item.text,
              translatedText: item.text, // Fallback to original text
              type: item.type,
              confidence: 0,
              success: false,
              error: error.message,
            };
          }
        })
      );

      // Process results
      const processedTranslations = translations.map(result => {
        if (result.status === 'fulfilled') {
          return result.value;
        } else {
          return {
            id: 'unknown',
            originalText: '',
            translatedText: '',
            type: '',
            confidence: 0,
            success: false,
            error: result.reason?.message || 'Unknown error',
          };
        }
      });

      // Calculate statistics
      const successfulTranslations = processedTranslations.filter(t => t.success).length;
      const failedTranslations = processedTranslations.length - successfulTranslations;
      const processingTime = Date.now() - startTime;

      logger.info('Professional terminology translation completed', {
        userId: auth.uid,
        targetLanguage,
        totalItems: items.length,
        successfulTranslations,
        failedTranslations,
        processingTime,
      });

      return {
        success: true,
        translations: processedTranslations.map(t => ({
          id: t.id,
          originalText: t.originalText,
          translatedText: t.translatedText,
          type: t.type,
          confidence: t.confidence,
          alternatives: t.alternatives,
        })),
        targetLanguage,
        sourceLanguage,
        timestamp: Date.now(),
        statistics: {
          totalItems: items.length,
          successfulTranslations,
          failedTranslations,
          processingTime,
        },
      };

    } catch (error) {
      const processingTime = Date.now() - startTime;

      logger.error('Professional terminology translation failed', {
        userId: request.auth?.uid,
        error: error.message,
        processingTime,
        stack: error.stack,
      });

      // Handle different error types
      if (error instanceof HttpsError) {
        throw error;
      }

      throw new HttpsError(
        'internal',
        `Professional translation failed: ${error.message}`,
        {
          originalError: error.message,
          processingTime,
        }
      );
    }
  }
);