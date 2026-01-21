/**
 * Cloud Functions for RAG Chat feature
  */

import { onCall, CallableRequest, HttpsError } from 'firebase-functions/v2/https';
import { admin, FieldValue } from '@cvplus/core';
import { embeddingService } from '../../services/embedding.service';
import { chatService } from '../../services/chat.service';
import { enhancedDbService } from '../../services/enhanced-db.service';
import { ParsedCV, EnhancedJob, UserRAGProfile } from '../../types/enhanced-models';
import { nanoid } from 'nanoid';
import { corsOptions } from '../../config/cors';

/**
 * Initialize RAG for a CV
  */
export const initializeRAG = onCall(
  {
    timeoutSeconds: 540,
    memory: '2GiB',
    ...corsOptions
  },
  async (request: CallableRequest<{ jobId: string; systemPrompt?: string; personality?: string }>) => {
    // Check authentication
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'User must be authenticated');
    }

    const { jobId } = request.data;
    if (!jobId) {
      throw new HttpsError('invalid-argument', 'Job ID is required');
    }

    try {
      // Get job and verify ownership
      const jobDoc = await admin.firestore().collection('jobs').doc(jobId).get();
      if (!jobDoc.exists) {
        throw new HttpsError('not-found', 'Job not found');
      }

      const job = jobDoc.data() as EnhancedJob;
      if (job.userId !== request.auth.uid) {
        throw new HttpsError('permission-denied', 'Not authorized to access this job');
      }

      if (!job.parsedData) {
        throw new HttpsError('failed-precondition', 'CV must be parsed before initializing RAG');
      }

      // Generate vector namespace
      const vectorNamespace = `user-${request.auth.uid}-job-${jobId}`;

      // Create CV chunks with embeddings
      const chunks = await embeddingService.createCVChunks(job.parsedData, jobId);

      // Store in vector database
      await embeddingService.storeEmbeddings(
        chunks,
        vectorNamespace,
        jobId
      );

      // Create RAG profile
      const ragProfile: UserRAGProfile = {
        userId: request.auth.uid,
        jobId,
        vectorStoreId: vectorNamespace,
        embeddingsGenerated: true,
        lastEmbeddingUpdate: new Date(),
        chunks: chunks,
        chatHistory: [],
        personalityContext: '',
        expertiseAreas: [],
        conversationalTone: 'professional',
        availableTopics: [],
        settings: {
          temperature: 0.7,
          maxTokens: 500,
          systemPrompt: request.data.systemPrompt,
          allowedTopics: ['experience', 'skills', 'education', 'projects', 'achievements'],
          enablePersonalization: true
        },
      };

      // Store RAG profile
      await enhancedDbService.upsertRAGProfile(ragProfile);

      // Update job with RAG status
      await admin.firestore().collection('jobs').doc(jobId).update({
        'ragChat.enabled': true,
        'ragChat.vectorNamespace': vectorNamespace,
        'ragChat.lastIndexed': new Date(),
        'ragChat.settings': ragProfile.settings,
        'enhancedFeatures.ragChat': {
          enabled: true,
          status: 'completed',
          data: {
            chunksCount: chunks.length,
            vectorNamespace
          }
        }
      });

      return {
        success: true,
        vectorNamespace,
        chunksCount: chunks.length,
        message: 'RAG chat initialized successfully'
      };
    } catch (error: any) {
      
      // Update job with error status
      await admin.firestore().collection('jobs').doc(jobId).update({
        'enhancedFeatures.ragChat': {
          enabled: false,
          status: 'failed',
          error: error.message
        }
      });
      
      throw new HttpsError('internal', error.message);
    }
  });

/**
 * Start a new chat session
  */
export const startChatSession = onCall(
  { ...corsOptions },
  async (request: CallableRequest<{ jobId: string; visitorId?: string; metadata?: any }>) => {
    const { jobId, visitorId, metadata } = request.data;

    if (!jobId) {
      throw new HttpsError('invalid-argument', 'Job ID is required');
    }

    try {
      // Get job to check if RAG is enabled
      const jobDoc = await admin.firestore().collection('jobs').doc(jobId).get();
      if (!jobDoc.exists) {
        throw new HttpsError('not-found', 'CV not found');
      }

      const job = jobDoc.data() as EnhancedJob;
      if (!job.ragChat?.enabled) {
        throw new HttpsError('failed-precondition', 'Chat is not enabled for this CV');
      }

      // Get public profile settings
      const publicProfileDoc = await admin.firestore()
        .collection('publicProfiles')
        .doc(jobId)
        .get();

      if (publicProfileDoc.exists) {
        const publicProfile = publicProfileDoc.data();
        if (!publicProfile?.settings?.showChat) {
          throw new HttpsError('permission-denied', 'Chat is disabled for this profile');
        }
      }

    // Create new session
    const sessionId = await chatService.initializeSession(
      jobId,
      job.userId,
      visitorId || nanoid(),
      metadata
    );

    // Get suggested questions
    const suggestedQuestions = await chatService.getSuggestedQuestions(
      job.ragChat.vectorNamespace!,
      jobId
    );

    return {
      success: true,
      sessionId,
      suggestedQuestions,
      settings: {
        language: job.ragChat.settings.language || 'en'
      }
    };
    } catch (error: any) {
      if (error instanceof HttpsError) {
        throw error;
      }
      throw new HttpsError('internal', error.message);
    }
  });

/**
 * Send a chat message
  */
export const sendChatMessage = onCall(
  {
    timeoutSeconds: 60,
    ...corsOptions
  },
  async (request: CallableRequest<{ sessionId: string; message: string }>) => {
    const { sessionId, message } = request.data;

    if (!sessionId || !message) {
      throw new HttpsError('invalid-argument', 'Session ID and message are required');
    }

    try {
      // Validate message
      const validation = chatService.validateMessage(message);
      if (!validation.valid) {
        throw new HttpsError('invalid-argument', validation.error || 'Invalid message');
      }

      // Get session
      const sessionDoc = await admin.firestore()
        .collection('chatSessions')
        .doc(sessionId)
        .get();

      if (!sessionDoc.exists) {
        throw new HttpsError('not-found', 'Session not found');
      }

      const session = sessionDoc.data();
      const jobId = session?.jobId;

      // Get job and RAG profile
      const jobDoc = await admin.firestore().collection('jobs').doc(jobId).get();
      const job = jobDoc.data() as EnhancedJob;

      if (!job.ragChat?.enabled) {
        throw new HttpsError('failed-precondition', 'Chat is not available');
      }

      // Get RAG profile
      const ragProfileDoc = await admin.firestore()
        .collection('ragProfiles')
        .doc(`${job.userId}_${jobId}`)
        .get();

      if (!ragProfileDoc.exists) {
        throw new HttpsError('failed-precondition', 'RAG profile not found');
      }

      const ragProfile = ragProfileDoc.data() as UserRAGProfile;

      // Process message and generate response
      const startTime = Date.now();
      const response = await chatService.processMessage(
        sessionId,
        message,
        job.ragChat.vectorNamespace!,
        ragProfile
      );
      const responseTime = Date.now() - startTime;

      // Update statistics
      await admin.firestore()
        .collection('ragProfiles')
        .doc(`${job.userId}_${jobId}`)
        .update({
          'statistics.totalQueries': FieldValue.increment(1),
          'statistics.averageResponseTime': FieldValue.increment(responseTime)
        });

      return {
        success: true,
        response: {
          content: response.content,
          timestamp: response.timestamp,
        }
      };
    } catch (error: any) {
      if (error instanceof HttpsError) {
        throw error;
      }
      throw new HttpsError('internal', error.message);
    }
  });

/**
 * End chat session and collect feedback
  */
export const endChatSession = onCall(
  { ...corsOptions },
  async (request: CallableRequest<{ sessionId: string; rating?: number; feedback?: string }>) => {
    const { sessionId, rating, feedback } = request.data;

    if (!sessionId) {
      throw new HttpsError('invalid-argument', 'Session ID is required');
    }

    try {
      // Update session with feedback
      await admin.firestore()
        .collection('chatSessions')
        .doc(sessionId)
        .update({
          'satisfaction.rating': rating,
          'satisfaction.feedback': feedback,
          endedAt: new Date()
        });

      return {
        success: true,
        message: 'Thank you for your feedback!'
      };
    } catch (error: any) {
      throw new HttpsError('internal', error.message);
    }
  });

/**
 * Update RAG embeddings when CV is updated
  */
export const updateRAGEmbeddings = onCall(
  {
    timeoutSeconds: 540,
    memory: '2GiB',
    ...corsOptions
  },
  async (request: CallableRequest<{ jobId: string }>) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'User must be authenticated');
    }

    const { jobId } = request.data;
    if (!jobId) {
      throw new HttpsError('invalid-argument', 'Job ID is required');
    }

    try {
      // Get job and verify ownership
      const jobDoc = await admin.firestore().collection('jobs').doc(jobId).get();
      if (!jobDoc.exists) {
        throw new HttpsError('not-found', 'Job not found');
      }

      const job = jobDoc.data() as EnhancedJob;
      if (job.userId !== request.auth.uid) {
        throw new HttpsError('permission-denied', 'Not authorized');
      }

      if (!job.ragChat?.enabled || !job.ragChat?.vectorNamespace) {
        throw new HttpsError('failed-precondition', 'RAG not initialized');
      }

      // Delete old embeddings
      await embeddingService.deleteEmbeddings(job.ragChat.vectorNamespace, jobId);

      // Create new chunks with embeddings
      const chunks = await embeddingService.createCVChunks(job.parsedData!, jobId);

      // Store new embeddings
      await embeddingService.storeEmbeddings(
        chunks,
        job.ragChat.vectorNamespace,
        jobId
      );

      // Update RAG profile
      await admin.firestore()
        .collection('ragProfiles')
        .doc(`${request.auth.uid}_${jobId}`)
        .update({
          chunks: chunks,
          lastIndexed: new Date()
        });

      // Update job
      await admin.firestore().collection('jobs').doc(jobId).update({
        'ragChat.lastIndexed': new Date()
      });

      return {
        success: true,
        chunksCount: chunks.length,
        message: 'RAG embeddings updated successfully'
      };
    } catch (error: any) {
      throw new HttpsError('internal', error.message);
    }
  });

/**
 * Get chat analytics
  */
export const getChatAnalytics = onCall(
  { ...corsOptions },
  async (request: CallableRequest<{ jobId: string }>) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'User must be authenticated');
    }

    const { jobId } = request.data;
    if (!jobId) {
      throw new HttpsError('invalid-argument', 'Job ID is required');
    }

    try {
      // Verify ownership
      const jobDoc = await admin.firestore().collection('jobs').doc(jobId).get();
      if (!jobDoc.exists) {
        throw new HttpsError('not-found', 'Job not found');
      }

      const job = jobDoc.data() as EnhancedJob;
      if (job.userId !== request.auth.uid) {
        throw new HttpsError('permission-denied', 'Not authorized');
      }

      // Get chat sessions
      const sessions = await admin.firestore()
        .collection('chatSessions')
        .where('jobId', '==', jobId)
        .orderBy('createdAt', 'desc')
        .limit(100)
        .get();

      // Calculate analytics
      const sessionData = sessions.docs.map(doc => doc.data());
      const totalSessions = sessionData.length;
      const completedSessions = sessionData.filter(s => s.satisfaction?.rating).length;
      const averageRating = completedSessions > 0
        ? sessionData.reduce((sum, s) => sum + (s.satisfaction?.rating || 0), 0) / completedSessions
        : 0;

      const messageCount = sessionData.reduce((sum, s) => sum + (s.messages?.length || 0), 0);
      const averageMessagesPerSession = totalSessions > 0 ? messageCount / totalSessions : 0;

      // Get RAG profile stats
      const ragProfileDoc = await admin.firestore()
        .collection('ragProfiles')
        .doc(`${request.auth.uid}_${jobId}`)
        .get();

    const ragStats = ragProfileDoc.exists ? ragProfileDoc.data()?.statistics : null;

    return {
      success: true,
      analytics: {
        totalSessions,
        completedSessions,
        averageRating: averageRating.toFixed(2),
        totalMessages: messageCount,
        averageMessagesPerSession: averageMessagesPerSession.toFixed(1),
        totalQueries: ragStats?.totalQueries || 0,
        averageResponseTime: ragStats?.averageResponseTime 
          ? `${(ragStats.averageResponseTime / ragStats.totalQueries).toFixed(0)}ms`
          : 'N/A',
        recentSessions: sessionData.slice(0, 10).map(s => ({
          sessionId: s.sessionId,
          createdAt: s.createdAt,
          messageCount: s.messages?.length || 0,
          rating: s.satisfaction?.rating,
          duration: s.endedAt 
            ? Math.floor((s.endedAt.toDate() - s.createdAt.toDate()) / 1000 / 60) 
            : null
        }))
      }
    };
    } catch (error: any) {
      throw new HttpsError('internal', error.message);
    }
  });