 * Send Chat Message Firebase Function
 *
 * POST /portal/{portalId}/chat/{sessionId}/message
 * Processes a chat message and returns AI-generated response
 *
 * @author CVPlus Team
 * @version 1.0.0
  */

import { https } from 'firebase-functions/v2';
import { Request, Response } from 'express';
import { getFirestore } from 'firebase-admin/firestore';
import { authenticateUser } from '../middleware/auth.middleware';
import { RAGService } from '@cvplus/public-profiles/backend/services/rag.service';
import { ClaudeService, ChatContext } from '@cvplus/public-profiles/backend/services/claude.service';

/**
 * Send Chat Message Request Body
  */
interface SendChatMessageRequest {
  message: string;
  messageType?: 'text' | 'question' | 'feedback';
  context?: {
    previousMessageId?: string;
    topic?: string;
  };
}

/**
 * Send Chat Message Response
  */
interface SendChatMessageResponse {
  success: boolean;
  messageId?: string;
  aiResponse?: {
    message: string;
    messageId: string;
    timestamp: string;
    context?: {
      sources?: string[];
      confidence?: number;
      suggestedFollowUps?: string[];
    };
  };
  sessionStatus?: 'active' | 'expired' | 'rate_limited';
  error?: string;
}

/**
 * Chat message processing handler
  */
async function handleSendChatMessage(req: Request, res: Response): Promise<void> {
  try {
    // Validate request method
    if (req.method !== 'POST') {
      res.status(405).json({
        success: false,
        error: 'Method not allowed',
      } as SendChatMessageResponse);
      return;
    }

    // Extract portalId and sessionId from URL path
    const pathParts = req.url.split('/');
    const portalId = req.params.portalId || pathParts[2];
    const sessionId = req.params.sessionId || pathParts[4];

    if (!portalId || !sessionId) {
      res.status(400).json({
        success: false,
        error: 'portalId and sessionId are required',
      } as SendChatMessageResponse);
      return;
    }

    // Parse request body
    const { message, messageType, context } = req.body as SendChatMessageRequest;

    if (!message?.trim()) {
      res.status(400).json({
        success: false,
        error: 'Message is required',
      } as SendChatMessageResponse);
      return;
    }

    // Initialize Firestore
    const db = getFirestore();

    // Validate session exists and is active
    const sessionDoc = await db.collection('chatSessions').doc(sessionId).get();

    if (!sessionDoc.exists) {
      res.status(404).json({
        success: false,
        error: 'Chat session not found',
      } as SendChatMessageResponse);
      return;
    }

    const sessionData = sessionDoc.data();

    // Verify session belongs to the portal
    if (sessionData?.portalId !== portalId) {
      res.status(400).json({
        success: false,
        error: 'Session does not belong to this portal',
      } as SendChatMessageResponse);
      return;
    }

    // Check session expiry
    const now = new Date();
    const expiresAt = sessionData?.expiresAt?.toDate?.() || new Date(sessionData?.expiresAt);

    if (now > expiresAt) {
      res.status(410).json({
        success: false,
        error: 'Chat session has expired',
        sessionStatus: 'expired',
      } as SendChatMessageResponse);
      return;
    }

    // Check rate limiting (simple implementation)
    const recentMessages =
      sessionData?.messages?.filter((msg: any) => {
        const msgTime = msg.timestamp?.toDate?.() || new Date(msg.timestamp);
        return now.getTime() - msgTime.getTime() < 60000; // Last minute
      }) || [];

    if (recentMessages.length >= 10) {
      res.status(429).json({
        success: false,
        error: 'Rate limit exceeded. Please wait before sending more messages.',
        sessionStatus: 'rate_limited',
      } as SendChatMessageResponse);
      return;
    }

    // Get portal and CV data for context
    const [portalDoc, cvDoc] = await Promise.all([
      db.collection('portals').doc(portalId).get(),
      sessionData.portalId
        ? db
            .collection('processedCVs')
            .doc(sessionData.processedCvId || '')
            .get()
        : Promise.resolve(null),
    ]);

    const portalData = portalDoc.exists ? portalDoc.data() : null;
    const cvData = cvDoc?.exists ? cvDoc.data() : null;

    // Generate message IDs
    const userMessageId = `msg_${Date.now()}_user`;
    const aiMessageId = `msg_${Date.now()}_ai`;

    // Create user message object
    const userMessage = {
      messageId: userMessageId,
      type: 'user',
      message: message.trim(),
      messageType: messageType || 'text',
      timestamp: now,
      context: context || {},
    };

    // Generate AI response using RAG system
    const aiResponse = await generateRAGResponse(
      message,
      portalData?.processedCvId || sessionData.processedCvId,
      cvData,
      sessionData
    );

    // Create AI message object
    const aiMessage = {
      messageId: aiMessageId,
      type: 'ai',
      message: aiResponse.message,
      timestamp: new Date(),
      context: aiResponse.context || {},
    };

    // Update session with new messages
    await db
      .collection('chatSessions')
      .doc(sessionId)
      .update({
        messages: [...(sessionData.messages || []), userMessage, aiMessage],
        lastActivity: now,
        messageCount: (sessionData.messageCount || 0) + 2,
      });

    // Update portal analytics
    await updateChatAnalytics(db, portalId, sessionId);

    // Build response
    const response: SendChatMessageResponse = {
      success: true,
      messageId: userMessageId,
      aiResponse: {
        message: aiMessage.message,
        messageId: aiMessageId,
        timestamp: aiMessage.timestamp.toISOString(),
        context: aiResponse.context,
      },
      sessionStatus: 'active',
    };

    res.status(200).json(response);
  } catch (error) {
    logger.error('Error in sendChatMessage:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    } as SendChatMessageResponse);
  }
}

/**
 * Generate RAG-powered AI response using Claude
  */
async function generateRAGResponse(
  userMessage: string,
  processedCvId: string,
  cvData: any,
  sessionData: any
): Promise<{
  message: string;
  context?: {
    sources?: string[];
    confidence?: number;
    suggestedFollowUps?: string[];
  };
}> {
  try {
    // Initialize RAG and Claude services
    const ragService = new RAGService();
    const claudeService = new ClaudeService();

    logger.info(`Generating RAG response for CV ${processedCvId}, query: "${userMessage}"`);

    // Step 1: Search for relevant CV content
    const ragContext = await ragService.searchRelevantContent(processedCvId, userMessage);

    // Step 2: Build chat context
    const chatContext: ChatContext = {
      cvOwnerName: cvData?.personalInfo?.name,
      cvTitle: cvData?.personalInfo?.title || cvData?.summary?.title,
      language: sessionData?.context?.language || 'en',
      responseStyle: sessionData?.context?.responseStyle || 'professional',
      conversationHistory: sessionData?.messages?.slice(-5)?.map((msg: any) => ({
        role: msg.type === 'user' ? 'user' : 'assistant',
        content: msg.message,
        timestamp: msg.timestamp
      })) || []
    };

    // Step 3: Generate Claude response
    const claudeResponse = await claudeService.generateResponse(
      userMessage,
      ragContext,
      chatContext
    );

    logger.info(`RAG response generated with ${ragContext.results.length} context chunks, confidence: ${ragContext.confidence.toFixed(3)}`);

    return {
      message: claudeResponse.message,
      context: {
        sources: claudeResponse.sources,
        confidence: claudeResponse.confidence,
        suggestedFollowUps: claudeResponse.suggestedFollowUps,
      },
    };

  } catch (error) {
    logger.error('Error generating RAG response:', error);

    // Fallback to simple response if RAG fails
    return generateFallbackResponse(userMessage, cvData);
  }
}

/**
 * Generate fallback response when RAG system is unavailable
  */
function generateFallbackResponse(
  userMessage: string,
  cvData: any
): {
  message: string;
  context?: {
    sources?: string[];
    confidence?: number;
    suggestedFollowUps?: string[];
  };
} {
  const name = cvData?.personalInfo?.name || 'this professional';

  return {
    message: `I'm sorry, but I'm currently experiencing technical difficulties with my advanced search capabilities. I can still help you learn about ${name}, but my responses may be more limited. Please try asking your question again, or contact support if the issue persists.`,
    context: {
      sources: ['System Message'],
      confidence: 0.5,
      suggestedFollowUps: [
        'Tell me about their experience',
        'What skills do they have?',
        'What is their educational background?'
      ]
    }
  };
}

/**
 * Update chat analytics
  */
async function updateChatAnalytics(
  db: FirebaseFirestore.Firestore,
  portalId: string,
  sessionId: string
): Promise<void> {
  try {
    const analyticsRef = db.collection('portalAnalytics').doc(portalId);

    await db.runTransaction(async transaction => {
      const doc = await transaction.get(analyticsRef);

      if (doc.exists) {
        const data = doc.data();
        transaction.update(analyticsRef, {
          totalMessages: (data?.totalMessages || 0) + 2, // User + AI message
          lastActivity: new Date(),
        });
      } else {
        transaction.set(analyticsRef, {
          portalId,
          chatSessionsStarted: 0,
          totalMessages: 2,
          uniqueVisitors: 1,
          createdAt: new Date(),
          lastActivity: new Date(),
        });
      }
    });
  } catch (error) {
    logger.warn('Failed to update chat analytics:', error);
  }
}

/**
 * Firebase Function: Send Chat Message
 * Endpoint: POST /portal/{portalId}/chat/{sessionId}/message
  */
export const sendChatMessage = https.onRequest(
  {
    cors: true,
    memory: '1GiB',
    timeoutSeconds: 60,
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

    // Note: Chat messages may be available for anonymous users
    // So we don't require authentication, but validate if token is present
    if (req.headers.authorization) {
      const authResult = await authenticateUser(req, { required: false });
      if (authResult.success && authResult.userId) {
        // Add userId to res.locals for the handler
        res.locals = { ...res.locals, uid: authResult.userId };
      }
    }

    // Handle the request
    await handleSendChatMessage(req, res);
  }
);
