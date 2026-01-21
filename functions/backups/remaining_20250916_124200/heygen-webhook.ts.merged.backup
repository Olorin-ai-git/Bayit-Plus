// @ts-ignore - Export conflicts/**
 * HeyGen Webhook Handler Function
 * 
 * Firebase Function to handle HeyGen webhook callbacks for real-time
 * video generation status updates with comprehensive error handling.
 * 
 * @author Gil Klainert
 * @version 1.0.0
 */

import { onRequest } from 'firebase-functions/v2/https';
import { videoWebhookHandler } from '../services/video-providers/webhook-handler.service';
import { VideoProviderError, VideoProviderErrorType } from '../services/video-providers/base-provider.interface';
import { requestCorsOptions, corsMiddleware } from '../config/cors';

/**
 * HeyGen Webhook Handler
 * 
 * Receives webhook callbacks from HeyGen API when video generation
 * status changes (queued -> processing -> completed/failed)
 */
export const heygenWebhook = onRequest(
  {
    timeoutSeconds: 60,
    memory: '1GiB',
    maxInstances: 100,
    ...requestCorsOptions
  },
  async (request, response) => {
    // Apply CORS middleware
    corsMiddleware(request, response);
    const startTime = Date.now();
    
    try {
      
      // Validate HTTP method
      if (request.method !== 'POST') {
        response.status(405).json({
          error: 'Method not allowed',
          allowed: ['POST']
        });
        return;
      }
      
      // Validate content type
      const contentType = request.headers['content-type'];
      if (!contentType || !contentType.includes('application/json')) {
        response.status(400).json({
          error: 'Invalid content type',
          expected: 'application/json'
        });
        return;
      }
      
      // Validate payload exists
      if (!request.body || Object.keys(request.body).length === 0) {
        response.status(400).json({
          error: 'Empty payload',
          message: 'Webhook payload is required'
        });
        return;
      }
      
      // Extract headers for validation
      const headers: Record<string, string> = {};
      for (const [key, value] of Object.entries(request.headers)) {
        if (typeof value === 'string') {
          headers[key.toLowerCase()] = value;
        } else if (Array.isArray(value)) {
          headers[key.toLowerCase()] = value[0];
        }
      }
      
      console.log('[HeyGen Webhook] Processing payload:', {
        video_id: request.body.video_id,
        status: request.body.status,
        callback_id: request.body.callback_id
      });
      
      // Process webhook through handler
      const result = await videoWebhookHandler.processWebhook(
        'heygen',
        headers,
        request.body
      );
      
      const processingTime = Date.now() - startTime;
      
      console.log(`[HeyGen Webhook] Successfully processed in ${processingTime}ms:`, {
        jobId: result.jobId,
        status: result.status,
        progress: result.progress
      });
      
      // Return success response
      response.status(200).json({
        success: true,
        message: 'Webhook processed successfully',
        data: {
          jobId: result.jobId,
          status: result.status,
          progress: result.progress,
          processingTime
        },
        timestamp: new Date().toISOString()
      });
      return;
      
    } catch (error: any) {
      const processingTime = Date.now() - startTime;
      
      console.error('[HeyGen Webhook] Processing failed:', {
        error: error.message,
        type: error.type || 'unknown',
        stack: error.stack,
        processingTime,
        payload: request.body
      });
      
      // Handle specific error types
      if (error instanceof VideoProviderError) {
        switch (error.type) {
          case VideoProviderErrorType.WEBHOOK_ERROR:
            response.status(400).json({
              error: 'Webhook validation failed',
              message: error.message,
              type: error.type,
              retryable: error.retryable
            });
            return;
            
          case VideoProviderErrorType.AUTHENTICATION_ERROR:
            response.status(401).json({
              error: 'Authentication failed',
              message: error.message,
              type: error.type
            });
            return;
            
          default:
            response.status(500).json({
              error: 'Processing error',
              message: error.message,
              type: error.type,
              retryable: error.retryable
            });
            return;
        }
      }
      
      // Handle unexpected errors
      response.status(500).json({
        error: 'Internal server error',
        message: 'An unexpected error occurred while processing the webhook',
        timestamp: new Date().toISOString(),
        processingTime
      });
      return;
    }
  }
);

/**
 * General Video Webhook Handler
 * 
 * Generic webhook endpoint that can handle multiple providers
 * based on the provider parameter in the URL path
 */
export const videoWebhook = onRequest(
  {
    timeoutSeconds: 60,
    memory: '1GiB',
    maxInstances: 100,
    ...requestCorsOptions
  },
  async (request, response) => {
    // Apply CORS middleware
    corsMiddleware(request, response);
    const startTime = Date.now();
    
    try {
      // Extract provider from query parameter
      const provider = request.query.provider as string;
      
      if (!provider) {
        response.status(400).json({
          error: 'Missing provider parameter',
          message: 'Provider must be specified in query parameters',
          example: '?provider=heygen'
        });
        return;
      }
      
      
      // Validate method and content type
      if (request.method !== 'POST') {
        response.status(405).json({ error: 'Method not allowed' });
        return;
      }
      
      if (!request.headers['content-type']?.includes('application/json')) {
        response.status(400).json({ error: 'Invalid content type' });
        return;
      }
      
      // Extract headers
      const headers: Record<string, string> = {};
      for (const [key, value] of Object.entries(request.headers)) {
        if (typeof value === 'string') {
          headers[key.toLowerCase()] = value;
        } else if (Array.isArray(value)) {
          headers[key.toLowerCase()] = value[0];
        }
      }
      
      // Process webhook
      const result = await videoWebhookHandler.processWebhook(
        provider,
        headers,
        request.body
      );
      
      const processingTime = Date.now() - startTime;
      
      console.log(`[Video Webhook] ${provider} processed successfully:`, {
        jobId: result.jobId,
        status: result.status,
        processingTime
      });
      
      response.status(200).json({
        success: true,
        provider,
        data: {
          jobId: result.jobId,
          status: result.status,
          progress: result.progress
        },
        processingTime
      });
      return;
      
    } catch (error: any) {
      const processingTime = Date.now() - startTime;
      
      console.error('[Video Webhook] Processing failed:', {
        error: error.message,
        provider: request.query.provider,
        processingTime
      });
      
      response.status(500).json({
        error: 'Webhook processing failed',
        message: error.message,
        processingTime
      });
      return;
    }
  }
);

/**
 * Webhook Health Check Endpoint
 * 
 * Simple health check endpoint for monitoring webhook availability
 */
export const webhookHealth = onRequest(
  {
    timeoutSeconds: 10,
    memory: '256MiB',
    ...requestCorsOptions
  },
  async (request, response) => {
    // Apply CORS middleware
    corsMiddleware(request, response);
    try {
      const health = {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        environment: process.env.NODE_ENV || 'development'
      };
      
      response.status(200).json(health);
      return;
      
    } catch (error: any) {
      
      response.status(500).json({
        status: 'unhealthy',
        error: error.message,
        timestamp: new Date().toISOString()
      });
      return;
    }
  }
);