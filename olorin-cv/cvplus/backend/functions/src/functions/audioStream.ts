/**
 * Cloud Functions for Audio Streaming
 *
 * Provides streaming TTS/STT endpoints with:
 * - Authentication
 * - Rate limiting
 * - Security validation
 * - Real-time audio streaming
 */

import * as functionsV1 from 'firebase-functions/v1';
import { Request, Response } from 'express';
import { OlorinTTSService, OlorinSTTService } from '../services/audio/olorin-audio.service';
import {
  AudioRateLimiter,
  AudioContentValidator,
  AudioAuditLogger,
} from '../services/audio/audio-security.service';
import { auth } from '../config/firebase';
import { TTSOptions, STTOptions } from '../types/audio';

// Initialize services
const ttsService = new OlorinTTSService();
const sttService = new OlorinSTTService();
const rateLimiter = new AudioRateLimiter();
const contentValidator = new AudioContentValidator();
const auditLogger = new AudioAuditLogger();

/**
 * Stream TTS Audio
 *
 * POST /audioStreamTTS
 * Headers: Authorization: Bearer <token>
 * Body: { text, voice, language, model }
 * Response: Streaming audio/mpeg
 */
export const audioStreamTTS = functionsV1.https.onRequest(
  async (req: Request, res: Response) => {
    try {
      // CORS headers
      res.set('Access-Control-Allow-Origin', '*');
      res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
      res.set('Access-Control-Allow-Headers', 'Authorization, Content-Type');

      // Handle preflight
      if (req.method === 'OPTIONS') {
        res.status(204).send('');
        return;
      }

      // Only accept POST
      if (req.method !== 'POST') {
        res.status(405).json({ error: 'Method not allowed' });
        return;
      }

      // Authenticate request
      const authHeader = req.headers.authorization;
      if (!authHeader?.startsWith('Bearer ')) {
        res.status(401).json({ error: 'Unauthorized: Missing token' });
        return;
      }

      const idToken = authHeader.split('Bearer ')[1];
      let userId: string;

      try {
        const decodedToken = await auth.verifyIdToken(idToken);
        userId = decodedToken.uid;
      } catch (error) {
        res.status(401).json({ error: 'Unauthorized: Invalid token' });
        return;
      }

      // Check rate limit
      const rateLimit = await rateLimiter.checkRateLimit(userId);
      if (rateLimit.exceeded) {
        res.status(429).json({
          error: 'Rate limit exceeded',
          hourlyLimit: rateLimit.hourlyLimit,
          dailyLimit: rateLimit.dailyLimit,
          resetAt: rateLimit.resetAt,
        });
        await auditLogger.logRateLimitViolation({
          userId,
          operation: 'tts',
          currentCount: rateLimit.hourlyCount,
          limit: rateLimit.hourlyLimit,
        });
        return;
      }

      // Validate request body
      const { text, voice, language, model } = req.body;

      if (!text || typeof text !== 'string') {
        res.status(400).json({ error: 'Invalid or missing text' });
        return;
      }

      // Validate text content
      const contentValidation = contentValidator.validateTTSText(text);
      if (!contentValidation.valid) {
        res.status(400).json({ error: contentValidation.error });
        return;
      }

      // Increment rate limit counter
      await rateLimiter.incrementCounter(userId);

      // Prepare TTS options
      const options: TTSOptions = {
        voice,
        language,
        model,
      };

      // Set response headers for streaming
      res.set('Content-Type', 'audio/mpeg');
      res.set('Transfer-Encoding', 'chunked');
      res.set('Cache-Control', 'no-cache');
      res.set('X-Content-Type-Options', 'nosniff');

      const startTime = Date.now();
      let chunkCount = 0;
      let totalBytes = 0;

      try {
        // Stream audio chunks from Olorin TTS
        for await (const chunk of ttsService.generateSpeech(text, options)) {
          chunkCount++;
          totalBytes += chunk.length;
          res.write(chunk);
        }

        res.end();

        const duration = Date.now() - startTime;

        // Audit log
        await auditLogger.logTTSGeneration({
          userId,
          textLength: text.length,
          voice: voice || 'Rachel',
          language: language || 'en',
          duration,
          audioFileId: '', // Not stored, streaming only
        });

        functionsV1.logger.info('TTS streaming completed', {
          userId,
          textLength: text.length,
          chunkCount,
          totalBytes,
          durationMs: duration,
        });
      } catch (streamError) {
        functionsV1.logger.error('TTS streaming error', {
          error: streamError,
          userId,
          textLength: text.length,
        });

        if (!res.headersSent) {
          res.status(500).json({ error: 'Audio generation failed' });
        } else {
          res.end();
        }
      }
    } catch (error) {
      functionsV1.logger.error('TTS endpoint error', { error });

      if (!res.headersSent) {
        res.status(500).json({
          error: 'Internal server error',
          message: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }
  }
);

/**
 * Transcribe Audio (STT)
 *
 * POST /audioTranscribe
 * Headers: Authorization: Bearer <token>
 * Body: multipart/form-data with audio file
 * Response: { transcript, language, confidence, duration }
 */
export const audioTranscribe = functionsV1.https.onRequest(
  async (req: Request, res: Response) => {
    try {
      // CORS headers
      res.set('Access-Control-Allow-Origin', '*');
      res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
      res.set('Access-Control-Allow-Headers', 'Authorization, Content-Type');

      // Handle preflight
      if (req.method === 'OPTIONS') {
        res.status(204).send('');
        return;
      }

      // Only accept POST
      if (req.method !== 'POST') {
        res.status(405).json({ error: 'Method not allowed' });
        return;
      }

      // Authenticate request
      const authHeader = req.headers.authorization;
      if (!authHeader?.startsWith('Bearer ')) {
        res.status(401).json({ error: 'Unauthorized: Missing token' });
        return;
      }

      const idToken = authHeader.split('Bearer ')[1];
      let userId: string;

      try {
        const decodedToken = await auth.verifyIdToken(idToken);
        userId = decodedToken.uid;
      } catch (error) {
        res.status(401).json({ error: 'Unauthorized: Invalid token' });
        return;
      }

      // Check rate limit
      const rateLimit = await rateLimiter.checkRateLimit(userId);
      if (rateLimit.exceeded) {
        res.status(429).json({
          error: 'Rate limit exceeded',
          hourlyLimit: rateLimit.hourlyLimit,
          dailyLimit: rateLimit.dailyLimit,
          resetAt: rateLimit.resetAt,
        });
        await auditLogger.logRateLimitViolation({
          userId,
          operation: 'stt',
          currentCount: rateLimit.hourlyCount,
          limit: rateLimit.hourlyLimit,
        });
        return;
      }

      // Get audio file from request
      // Note: In production, use multer or similar for multipart/form-data parsing
      const contentType = req.headers['content-type'] || '';
      const audioBuffer = req.body as Buffer;

      // Validate audio file
      const contentValidation = contentValidator.validateAudioFile(
        audioBuffer,
        contentType
      );
      if (!contentValidation.valid) {
        res.status(400).json({ error: contentValidation.error });
        return;
      }

      // Increment rate limit counter
      await rateLimiter.incrementCounter(userId);

      // Prepare STT options
      const options: STTOptions = {
        language: 'auto',
      };

      // Transcribe audio
      const result = await sttService.transcribeAudio(audioBuffer, options);

      // Audit log
      await auditLogger.logSTTTranscription({
        userId,
        audioSize: audioBuffer.length,
        language: result.language,
        transcriptLength: result.transcript.length,
        containsPII: false, // Would detect PII in production
        audioFileId: '', // Not stored
      });

      functionsV1.logger.info('STT transcription completed', {
        userId,
        audioSize: audioBuffer.length,
        language: result.language,
        transcriptLength: result.transcript.length,
        confidence: result.confidence,
        duration: result.duration,
      });

      res.status(200).json({
        transcript: result.transcript,
        language: result.language,
        confidence: result.confidence,
        duration: result.duration,
      });
    } catch (error) {
      functionsV1.logger.error('STT endpoint error', { error });

      res.status(500).json({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

/**
 * Health check for audio services
 *
 * GET /audioHealth
 */
export const audioHealth = functionsV1.https.onRequest(
  async (_req: Request, res: Response) => {
    try {
      // Health check: verify services are initialized
      const ttsHealthy = ttsService !== null && ttsService !== undefined;
      const sttHealthy = sttService !== null && sttService !== undefined;

      res.status(200).json({
        tts: { healthy: ttsHealthy },
        stt: { healthy: sttHealthy },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      res.status(500).json({
        error: 'Health check failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);
