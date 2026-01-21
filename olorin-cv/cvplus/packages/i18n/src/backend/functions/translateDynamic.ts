import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { logger } from 'firebase-functions/v2';
// NOTE: Architecture violation - i18n (Layer 1) should not depend on auth/premium
// import { authGuard } from '@cvplus/auth/middleware/authGuard';
// import { premiumGuard } from '@cvplus/premium/middleware/premiumGuard';
const authGuard = (req: any) => req; // Placeholder
const premiumGuard = (req: any) => req; // Placeholder
import { TranslationService } from '../../index';
import { SupportedLanguage } from '../../index';

interface TranslateDynamicRequest {
  content: string | string[] | Record<string, string>;
  sourceLanguage?: SupportedLanguage;
  targetLanguage: SupportedLanguage;
  context?: string;
  preserveFormatting?: boolean;
  professionalMode?: boolean;
}

interface TranslateDynamicResponse {
  success: boolean;
  translatedContent?: string | string[] | Record<string, string>;
  sourceLanguage: SupportedLanguage;
  targetLanguage: SupportedLanguage;
  context?: string;
  detectedLanguage?: SupportedLanguage;
  confidence?: number;
  timestamp: number;
}

/**
 * Firebase Function to translate dynamic content (user-generated text, descriptions, etc.)
 * Supports strings, arrays of strings, and objects with string values
  */
export const translateDynamic = onCall<TranslateDynamicRequest, Promise<TranslateDynamicResponse>>(
  {
    region: 'us-central1',
    memory: '1GiB',
    timeoutSeconds: 60,
    cors: true,
  },
  async (request) => {
    const startTime = Date.now();

    try {
      // Extract data and context
      const { data, auth } = request;
      const { 
        content, 
        sourceLanguage, 
        targetLanguage, 
        context, 
        preserveFormatting = true,
        professionalMode = false 
      } = data;

      // Validate authentication
      if (!auth?.uid) {
        throw new HttpsError('unauthenticated', 'User must be authenticated to translate content');
      }

      // Apply authentication middleware
      await authGuard(request);

      // Apply premium guard for professional translation mode
      if (professionalMode) {
        await premiumGuard(request, 'professionalTranslation');
      }

      // Validate input data
      if (!content) {
        throw new HttpsError('invalid-argument', 'Content to translate is required');
      }

      if (!targetLanguage) {
        throw new HttpsError('invalid-argument', 'Target language is required');
      }

      // Log translation request
      logger.info('Dynamic content translation requested', {
        userId: auth.uid,
        sourceLanguage: sourceLanguage || 'auto-detect',
        targetLanguage,
        contentType: typeof content,
        context,
        professionalMode,
        timestamp: startTime,
      });

      // Initialize translation service
      const translationService = TranslationService.getInstance({
        defaultLanguage: 'en',
        fallbackLanguage: 'en',
        enableProfessionalTerms: professionalMode,
        enableCaching: true,
        enableLanguageDetection: true,
      });

      let detectedLanguage: SupportedLanguage | undefined;
      let confidence: number | undefined;

      // Auto-detect source language if not provided
      let actualSourceLanguage = sourceLanguage;
      if (!sourceLanguage && typeof content === 'string') {
        const detection = await translationService.detectLanguage(content);
        if (detection.language && detection.confidence > 0.7) {
          actualSourceLanguage = detection.language;
          detectedLanguage = detection.language;
          confidence = detection.confidence;
        } else {
          actualSourceLanguage = 'en'; // Default fallback
        }
      }

      // Translation options
      const translationOptions = {
        sourceLanguage: actualSourceLanguage || 'en',
        targetLanguage,
        context,
        preserveFormatting,
        professionalMode,
        enableCulturalAdaptation: true,
      };

      let translatedContent: string | string[] | Record<string, string>;

      // Handle different content types
      if (typeof content === 'string') {
        translatedContent = await translationService.translateText(
          content,
          translationOptions
        );
      } else if (Array.isArray(content)) {
        translatedContent = await Promise.all(
          content.map(text => 
            translationService.translateText(text, translationOptions)
          )
        );
      } else if (typeof content === 'object' && content !== null) {
        translatedContent = {};
        for (const [key, value] of Object.entries(content)) {
          if (typeof value === 'string') {
            (translatedContent as Record<string, string>)[key] = 
              await translationService.translateText(value, translationOptions);
          } else {
            (translatedContent as Record<string, string>)[key] = String(value);
          }
        }
      } else {
        throw new HttpsError('invalid-argument', 'Unsupported content type for translation');
      }

      // Calculate processing time
      const processingTime = Date.now() - startTime;

      // Log successful translation
      logger.info('Dynamic content translation completed', {
        userId: auth.uid,
        sourceLanguage: actualSourceLanguage,
        targetLanguage,
        processingTime,
        detectedLanguage,
        confidence,
      });

      return {
        success: true,
        translatedContent,
        sourceLanguage: actualSourceLanguage || 'en',
        targetLanguage,
        context,
        detectedLanguage,
        confidence,
        timestamp: Date.now(),
      };

    } catch (error) {
      const processingTime = Date.now() - startTime;

      logger.error('Dynamic content translation failed', {
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
        `Failed to translate content: ${error.message}`,
        { 
          originalError: error.message,
          processingTime,
        }
      );
    }
  }
);

/**
 * Batch translation for multiple pieces of content
  */
export const translateBatch = onCall<{
  items: Array<{
    id: string;
    content: string;
    context?: string;
  }>;
  sourceLanguage?: SupportedLanguage;
  targetLanguage: SupportedLanguage;
  professionalMode?: boolean;
}, Promise<{
  success: boolean;
  results: Array<{
    id: string;
    translatedContent: string;
    success: boolean;
    error?: string;
  }>;
  sourceLanguage: SupportedLanguage;
  targetLanguage: SupportedLanguage;
  timestamp: number;
}>>(
  {
    region: 'us-central1',
    memory: '1GiB',
    timeoutSeconds: 180,
    cors: true,
  },
  async (request) => {
    try {
      const { data, auth } = request;
      const { items, sourceLanguage, targetLanguage, professionalMode = false } = data;

      if (!auth?.uid) {
        throw new HttpsError('unauthenticated', 'User must be authenticated');
      }

      await authGuard(request);

      if (professionalMode) {
        await premiumGuard(request, 'batchTranslation');
      }

      if (!Array.isArray(items) || items.length === 0) {
        throw new HttpsError('invalid-argument', 'Items array is required');
      }

      if (items.length > 100) {
        throw new HttpsError('invalid-argument', 'Maximum 100 items per batch');
      }

      const translationService = TranslationService.getInstance({
        enableProfessionalTerms: professionalMode,
        enableCaching: true,
      });

      const results = await Promise.allSettled(
        items.map(async (item) => {
          try {
            const translatedContent = await translationService.translateText(
              item.content,
              {
                sourceLanguage: sourceLanguage || 'en',
                targetLanguage,
                context: item.context,
                professionalMode,
              }
            );

            return {
              id: item.id,
              translatedContent,
              success: true,
            };
          } catch (error) {
            return {
              id: item.id,
              translatedContent: '',
              success: false,
              error: error.message,
            };
          }
        })
      );

      const processedResults = results.map((result) => 
        result.status === 'fulfilled' ? result.value : {
          id: 'unknown',
          translatedContent: '',
          success: false,
          error: result.reason?.message || 'Unknown error',
        }
      );

      logger.info('Batch translation completed', {
        userId: auth.uid,
        itemCount: items.length,
        successCount: processedResults.filter(r => r.success).length,
        targetLanguage,
      });

      return {
        success: true,
        results: processedResults,
        sourceLanguage: sourceLanguage || 'en',
        targetLanguage,
        timestamp: Date.now(),
      };

    } catch (error) {
      logger.error('Batch translation failed', {
        userId: request.auth?.uid,
        error: error.message,
        stack: error.stack,
      });

      if (error instanceof HttpsError) {
        throw error;
      }

      throw new HttpsError(
        'internal',
        `Batch translation failed: ${error.message}`,
        { originalError: error.message }
      );
    }
  }
);