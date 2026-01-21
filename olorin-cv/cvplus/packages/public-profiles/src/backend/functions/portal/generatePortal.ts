 * Generate Portal Firebase Function
 *
 * POST /portal/generate
 * Creates a new interactive AI portal for a processed CV
 *
 * @author CVPlus Team
 * @version 1.0.0
  */

import { https } from 'firebase-functions/v2';
import { Request, Response } from 'express';
import { getFirestore } from 'firebase-admin/firestore';
import { authenticateUser } from '../middleware/auth.middleware';

/**
 * Generate Portal Request Body
  */
interface GeneratePortalRequest {
  processedCvId: string;
  portalConfig?: {
    theme?: 'professional' | 'creative' | 'minimal';
    features?: string[];
    customization?: Record<string, any>;
  };
}

/**
 * Generate Portal Response
  */
interface GeneratePortalResponse {
  success: boolean;
  portalId?: string;
  status?: 'queued' | 'processing' | 'completed' | 'failed';
  message?: string;
  error?: string;
}

/**
 * Portal generation handler
  */
async function handleGeneratePortal(req: Request, res: Response): Promise<void> {
  try {
    // Validate request method
    if (req.method !== 'POST') {
      res.status(405).json({
        success: false,
        error: 'Method not allowed',
      } as GeneratePortalResponse);
      return;
    }

    // Validate request body
    const { processedCvId, portalConfig } = req.body as GeneratePortalRequest;

    if (!processedCvId) {
      res.status(400).json({
        success: false,
        error: 'processedCvId is required',
      } as GeneratePortalResponse);
      return;
    }

    // Authenticate user
    const authResult = await authenticateUser(req, { required: true });
    if (!authResult.success || !authResult.userId) {
      res.status(401).json({
        success: false,
        error: authResult.error || 'User authentication required',
      } as GeneratePortalResponse);
      return;
    }
    const userId = authResult.userId;

    // Initialize Firestore
    const db = getFirestore();

    // Verify the processed CV exists and belongs to the user
    const cvDoc = await db.collection('processedCVs').doc(processedCvId).get();

    if (!cvDoc.exists) {
      res.status(404).json({
        success: false,
        error: 'Processed CV not found',
      } as GeneratePortalResponse);
      return;
    }

    const cvData = cvDoc.data();
    if (cvData?.userId !== userId) {
      res.status(403).json({
        success: false,
        error: 'Access denied to this CV',
      } as GeneratePortalResponse);
      return;
    }

    // Generate portal ID
    const portalId = `portal_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Create portal document
    const portalData = {
      portalId,
      userId,
      processedCvId,
      status: 'queued',
      config: portalConfig || {
        theme: 'professional',
        features: ['chat', 'analytics', 'sharing'],
        customization: {},
      },
      createdAt: new Date(),
      updatedAt: new Date(),
      metadata: {
        version: '1.0.0',
        generatedBy: 'cvplus-portal-generator',
      },
    };

    // Save portal to Firestore
    await db.collection('portals').doc(portalId).set(portalData);

    // Start portal generation process with the public-profiles service
    try {
      // Update status to processing
      await db.collection('portals').doc(portalId).update({
        status: 'processing',
        updatedAt: new Date(),
        processingStartedAt: new Date(),
      });

      // Import the portal generation service from the public-profiles package
      const { portalGenerationService } = await import('../../../packages/public-profiles/src/backend/services/portals/portal-generation.service');

      // Start portal generation (async process)
      portalGenerationService.generatePortal(processedCvId, portalConfig, {
        portalId,
        userId,
        timeout: 60000, // 60 seconds max
      }).then(async (result) => {
        // Update portal with generation results
        const updateData = {
          status: result.success ? 'completed' : 'failed',
          updatedAt: new Date(),
          processingCompletedAt: new Date(),
          ...(result.success ? {
            urls: result.urls,
            metadata: result.metadata,
            stepsCompleted: result.stepsCompleted || [],
          } : {
            error: result.error,
            warnings: result.warnings || [],
          }),
        };

        await db.collection('portals').doc(portalId).update(updateData);

        // If successful, update the original processed CV with portal URLs
        if (result.success && result.urls) {
          await db.collection('processedCVs').doc(processedCvId).update({
            portalUrls: result.urls,
            portalId,
            portalGenerated: true,
            portalGeneratedAt: new Date(),
          });
        }
      }).catch(async (error) => {
        // Handle generation failure
        logger.error('Portal generation failed:', error);
        await db.collection('portals').doc(portalId).update({
          status: 'failed',
          updatedAt: new Date(),
          processingCompletedAt: new Date(),
          error: {
            code: 'INTERNAL_ERROR',
            message: error.message,
            timestamp: new Date(),
            context: { processedCvId, portalId },
          },
        });
      });

      // Return immediate successful response (generation continues in background)
      res.status(200).json({
        success: true,
        portalId,
        status: 'processing',
        message: 'Portal generation initiated successfully. Check status using portal ID.',
      } as GeneratePortalResponse);

    } catch (serviceError) {
      logger.error('Error starting portal generation:', serviceError);

      // Update portal status to failed
      await db.collection('portals').doc(portalId).update({
        status: 'failed',
        updatedAt: new Date(),
        error: {
          code: 'INTERNAL_ERROR',
          message: serviceError.message,
          timestamp: new Date(),
          context: { processedCvId },
        },
      });

      res.status(500).json({
        success: false,
        error: 'Failed to start portal generation',
      } as GeneratePortalResponse);
    }
  } catch (error) {
    logger.error('Error in generatePortal:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    } as GeneratePortalResponse);
  }
}

/**
 * Firebase Function: Generate Portal
 * Endpoint: POST /portal/generate
  */
export const generatePortal = https.onRequest(
  {
    cors: true,
    memory: '1GiB',
    timeoutSeconds: 60,
    maxInstances: 10,
    region: 'us-central1',
  },
  async (req: Request, res: Response) => {
    // Handle preflight OPTIONS request
    if (req.method === 'OPTIONS') {
      res.set('Access-Control-Allow-Origin', '*');
      res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
      res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
      res.status(200).send('');
      return;
    }

    // Handle the request
    await handleGeneratePortal(req, res);
  }
);
