 * Get Portal Status Firebase Function
 *
 * GET /portal/{portalId}/status
 * Retrieves the current status and details of a portal generation/update process
 *
 * @author CVPlus Team
 * @version 1.0.0
  */

import { https } from 'firebase-functions/v2';
import { Request, Response } from 'express';
import { getFirestore } from 'firebase-admin/firestore';
import { authenticateUser } from '../middleware/auth.middleware';

/**
 * Portal Status Response
  */
interface PortalStatusResponse {
  success: boolean;
  portalId?: string;
  status?: 'queued' | 'processing' | 'completed' | 'failed';
  progress?: number; // 0-100
  message?: string;
  details?: {
    createdAt?: string;
    updatedAt?: string;
    completedAt?: string;
    processingSteps?: Array<{
      step: string;
      status: 'pending' | 'processing' | 'completed' | 'failed';
      timestamp?: string;
      details?: string;
    }>;
    config?: Record<string, any>;
    urls?: {
      portal?: string;
      analytics?: string;
    };
  };
  error?: string;
}

/**
 * Portal status retrieval handler
  */
async function handleGetPortalStatus(req: Request, res: Response): Promise<void> {
  try {
    // Validate request method
    if (req.method !== 'GET') {
      res.status(405).json({
        success: false,
        error: 'Method not allowed',
      } as PortalStatusResponse);
      return;
    }

    // Extract portalId from URL path
    const portalId = req.params.portalId || req.url.split('/')[2];

    if (!portalId) {
      res.status(400).json({
        success: false,
        error: 'portalId is required',
      } as PortalStatusResponse);
      return;
    }

    // Authenticate user
    const authResult = await authenticateUser(req, { required: true });
    if (!authResult.success || !authResult.userId) {
      res.status(401).json({
        success: false,
        error: authResult.error || 'User authentication required',
      } as PortalStatusResponse);
      return;
    }
    const userId = authResult.userId;

    // Initialize Firestore
    const db = getFirestore();

    // Get portal document
    const portalDoc = await db.collection('portals').doc(portalId).get();

    if (!portalDoc.exists) {
      res.status(404).json({
        success: false,
        error: 'Portal not found',
      } as PortalStatusResponse);
      return;
    }

    const portalData = portalDoc.data();

    // Verify ownership
    if (portalData?.userId !== userId) {
      res.status(403).json({
        success: false,
        error: 'Access denied to this portal',
      } as PortalStatusResponse);
      return;
    }

    // Calculate progress based on status
    let progress = 0;
    switch (portalData.status) {
      case 'queued':
        progress = 10;
        break;
      case 'processing':
        progress = portalData.progress || 50;
        break;
      case 'completed':
        progress = 100;
        break;
      case 'failed':
        progress = portalData.progress || 0;
        break;
    }

    // Build response
    const response: PortalStatusResponse = {
      success: true,
      portalId,
      status: portalData.status,
      progress,
      message: portalData.message || getStatusMessage(portalData.status),
      details: {
        createdAt: portalData.createdAt?.toDate?.()?.toISOString() || portalData.createdAt,
        updatedAt: portalData.updatedAt?.toDate?.()?.toISOString() || portalData.updatedAt,
        completedAt: portalData.completedAt?.toDate?.()?.toISOString() || portalData.completedAt,
        processingSteps: portalData.processingSteps || [],
        config: portalData.config || {},
        urls: {
          portal: portalData.portalUrl,
          analytics: portalData.analyticsUrl,
        },
      },
    };

    res.status(200).json(response);
  } catch (error) {
    logger.error('Error in getPortalStatus:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    } as PortalStatusResponse);
  }
}

/**
 * Get human-readable status message
  */
function getStatusMessage(status: string): string {
  switch (status) {
    case 'queued':
      return 'Portal generation queued for processing';
    case 'processing':
      return 'Portal is being generated';
    case 'completed':
      return 'Portal generation completed successfully';
    case 'failed':
      return 'Portal generation failed';
    default:
      return 'Unknown status';
  }
}

/**
 * Firebase Function: Get Portal Status
 * Endpoint: GET /portal/{portalId}/status
  */
export const getPortalStatus = https.onRequest(
  {
    cors: true,
    memory: '512MiB',
    timeoutSeconds: 30,
    maxInstances: 20,
    region: 'us-central1',
  },
  async (req: Request, res: Response) => {
    // Handle preflight OPTIONS request
    if (req.method === 'OPTIONS') {
      res.set('Access-Control-Allow-Origin', '*');
      res.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
      res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
      res.status(200).send('');
      return;
    }

    // Handle the request
    await handleGetPortalStatus(req, res);
  }
);
