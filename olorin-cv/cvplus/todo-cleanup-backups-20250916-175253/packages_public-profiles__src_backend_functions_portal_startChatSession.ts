/**
 * Start Chat Session Firebase Function
 *
 * POST /portal/{portalId}/chat/start
 * Initiates a new chat session with the AI assistant for a specific portal
 *
 * @author CVPlus Team
 * @version 1.0.0
  */

import { https } from 'firebase-functions/v2';
import { Request, Response } from 'express';
import { getFirestore } from 'firebase-admin/firestore';
import { authenticateUser } from '../middleware/auth.middleware';
import { RAGService } from '@cvplus/public-profiles/backend/services/rag.service';
import { ClaudeService } from '@cvplus/public-profiles/backend/services/claude.service';

/**
 * Start Chat Session Request Body
  */
interface StartChatSessionRequest {
  userMessage?: string; // Optional initial message
  context?: {
    visitorId?: string; // For anonymous visitors
    referrer?: string;
    userAgent?: string;
  };
  preferences?: {
    language?: string;
    responseStyle?: 'professional' | 'casual' | 'detailed';
  };
}

/**
 * Start Chat Session Response
  */
interface StartChatSessionResponse {
  success: boolean;
  sessionId?: string;
  portalId?: string;
  welcomeMessage?: string;
  context?: {
    cvOwnerName?: string;
    availableTopics?: string[];
    sessionExpiry?: string;
    ragEnabled?: boolean;
    embeddingsReady?: boolean;
  };
  error?: string;
}

/**
 * Chat session initialization handler
  */
async function handleStartChatSession(req: Request, res: Response): Promise<void> {
  try {
    // Validate request method
    if (req.method !== 'POST') {
      res.status(405).json({
        success: false,
        error: 'Method not allowed',
      } as StartChatSessionResponse);
      return;
    }

    // Extract portalId from URL path
    const portalId = req.params.portalId || req.url.split('/')[2];

    if (!portalId) {
      res.status(400).json({
        success: false,
        error: 'portalId is required',
      } as StartChatSessionResponse);
      return;
    }

    // Parse request body
    const { userMessage, context, preferences } = req.body as StartChatSessionRequest;

    // Initialize Firestore
    const db = getFirestore();

    // Get portal document
    const portalDoc = await db.collection('portals').doc(portalId).get();

    if (!portalDoc.exists) {
      res.status(404).json({
        success: false,
        error: 'Portal not found',
      } as StartChatSessionResponse);
      return;
    }

    const portalData = portalDoc.data();

    // Check if portal is active/completed
    if (portalData?.status !== 'completed') {
      res.status(400).json({
        success: false,
        error: 'Portal is not ready for chat sessions',
      } as StartChatSessionResponse);
      return;
    }

    // Get CV data for context
    const cvDoc = await db.collection('processedCVs').doc(portalData.processedCvId).get();

    const cvData = cvDoc.exists ? cvDoc.data() : null;

    // Generate session ID
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Set session expiry (24 hours from now)
    const sessionExpiry = new Date();
    sessionExpiry.setHours(sessionExpiry.getHours() + 24);

    // Create chat session document
    const chatSessionData = {
      sessionId,
      portalId,
      userId: res.locals.uid || null, // May be null for anonymous users
      visitorId: context?.visitorId || null,
      status: 'active',
      createdAt: new Date(),
      expiresAt: sessionExpiry,
      context: {
        referrer: context?.referrer,
        userAgent: context?.userAgent,
        language: preferences?.language || 'en',
        responseStyle: preferences?.responseStyle || 'professional',
      },
      messages: [], // Will store chat history
      metadata: {
        version: '1.0.0',
        portalVersion: portalData.metadata?.version,
      },
    };

    // Save session to Firestore
    await db.collection('chatSessions').doc(sessionId).set(chatSessionData);

    // Initialize RAG services for chat
    const ragService = new RAGService();
    const claudeService = new ClaudeService();

    // Verify RAG system is ready
    const hasEmbeddings = await ragService.hasCVEmbeddings(portalData.processedCvId);
    let ragReady = hasEmbeddings;

    if (!hasEmbeddings) {
      console.log(`No embeddings found for CV ${portalData.processedCvId}, attempting to generate...`);
      // Attempt to generate embeddings if they don't exist
      ragReady = await ragService.processAndStoreCVEmbeddings(cvData);
    }

    // Generate welcome message based on CV data
    const welcomeMessage = ragReady
      ? claudeService.generateWelcomeMessage({
          cvOwnerName: cvData?.personalInfo?.name,
          cvTitle: cvData?.personalInfo?.title || cvData?.summary?.title,
          language: preferences?.language,
          responseStyle: preferences?.responseStyle
        })
      : generateWelcomeMessage(cvData, preferences?.language);

    // Extract available topics from CV
    const availableTopics = extractAvailableTopics(cvData);

    // Build response
    const response: StartChatSessionResponse = {
      success: true,
      sessionId,
      portalId,
      welcomeMessage,
      context: {
        cvOwnerName: cvData?.personalInfo?.name || 'Professional',
        availableTopics,
        sessionExpiry: sessionExpiry.toISOString(),
        ragEnabled: ragReady,
        embeddingsReady: hasEmbeddings
      },
    };

    // If there's an initial user message, handle it
    if (userMessage?.trim()) {
      // TODO: Process initial message and add AI response
      // This will be implemented in T035 (sendChatMessage)
      console.log('Initial message received:', userMessage);
    }

    // Update portal analytics
    await updatePortalAnalytics(db, portalId, 'chat_session_started');

    res.status(200).json(response);
  } catch (error) {
    console.error('Error in startChatSession:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    } as StartChatSessionResponse);
  }
}

/**
 * Generate welcome message based on CV data
  */
function generateWelcomeMessage(cvData: any, language = 'en'): string {
  const name = cvData?.personalInfo?.name || 'this professional';
  const title = cvData?.personalInfo?.title || cvData?.summary?.title || 'professional';

  const messages = {
    en: `Hello! I'm an AI assistant here to help you learn more about ${name}, a ${title}. Feel free to ask me about their experience, skills, projects, or any other questions you might have.`,
    es: `¡Hola! Soy un asistente de IA aquí para ayudarte a conocer más sobre ${name}, un/a ${title}. Siéntete libre de preguntarme sobre su experiencia, habilidades, proyectos o cualquier otra pregunta que puedas tener.`,
    fr: `Bonjour ! Je suis un assistant IA ici pour vous aider à en savoir plus sur ${name}, un/e ${title}. N'hésitez pas à me poser des questions sur son expérience, ses compétences, ses projets ou toute autre question que vous pourriez avoir.`,
  };

  return messages[language as keyof typeof messages] || messages.en;
}

/**
 * Extract available topics from CV data
  */
function extractAvailableTopics(cvData: any): string[] {
  const topics = ['Experience', 'Skills', 'Education'];

  if (cvData?.projects?.length > 0) topics.push('Projects');
  if (cvData?.certifications?.length > 0) topics.push('Certifications');
  if (cvData?.achievements?.length > 0) topics.push('Achievements');
  if (cvData?.languages?.length > 0) topics.push('Languages');

  return topics;
}

/**
 * Update portal analytics
  */
async function updatePortalAnalytics(
  db: FirebaseFirestore.Firestore,
  portalId: string,
  event: string
): Promise<void> {
  try {
    const analyticsRef = db.collection('portalAnalytics').doc(portalId);

    await db.runTransaction(async transaction => {
      const doc = await transaction.get(analyticsRef);

      if (doc.exists) {
        const data = doc.data();
        transaction.update(analyticsRef, {
          chatSessionsStarted: (data?.chatSessionsStarted || 0) + 1,
          lastActivity: new Date(),
        });
      } else {
        transaction.set(analyticsRef, {
          portalId,
          chatSessionsStarted: 1,
          totalMessages: 0,
          uniqueVisitors: 1,
          createdAt: new Date(),
          lastActivity: new Date(),
        });
      }
    });
  } catch (error) {
    console.warn('Failed to update portal analytics:', error);
  }
}

/**
 * Firebase Function: Start Chat Session
 * Endpoint: POST /portal/{portalId}/chat/start
  */
export const startChatSession = https.onRequest(
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
      res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
      res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
      res.status(200).send('');
      return;
    }

    // Note: Chat sessions may be available for anonymous users
    // So we don't require authentication, but validate if token is present
    if (req.headers.authorization) {
      const authResult = await authenticateUser(req, { required: false });
      if (authResult.success && authResult.userId) {
        // Add userId to res.locals for the handler
        res.locals = { ...res.locals, uid: authResult.userId };
      }
    }

    // Handle the request
    await handleStartChatSession(req, res);
  }
);
