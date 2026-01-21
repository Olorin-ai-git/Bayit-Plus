 * Get Portal Analytics Firebase Function
 *
 * GET /portal/{portalId}/analytics
 * Retrieves analytics and engagement metrics for a specific portal
 *
 * @author CVPlus Team
 * @version 1.0.0
  */

import { https } from 'firebase-functions/v2';
import { Request, Response } from 'express';
import { getFirestore } from 'firebase-admin/firestore';
import { authenticateUser } from '../middleware/auth.middleware';

/**
 * Portal Analytics Response
  */
interface PortalAnalyticsResponse {
  success: boolean;
  portalId?: string;
  analytics?: {
    overview: {
      totalViews: number;
      uniqueVisitors: number;
      chatSessionsStarted: number;
      totalMessages: number;
      averageSessionDuration?: number;
      conversionRate?: number;
    };
    engagement: {
      topQuestions: Array<{
        question: string;
        count: number;
      }>;
      topTopics: Array<{
        topic: string;
        count: number;
      }>;
      userFeedback?: {
        positive: number;
        negative: number;
        average: number;
      };
    };
    timeline: {
      daily: Array<{
        date: string;
        views: number;
        sessions: number;
        messages: number;
      }>;
      weekly?: Array<{
        week: string;
        views: number;
        sessions: number;
        messages: number;
      }>;
    };
    geographic?: {
      countries: Array<{
        country: string;
        count: number;
        percentage: number;
      }>;
      cities?: Array<{
        city: string;
        country: string;
        count: number;
      }>;
    };
    technology?: {
      browsers: Array<{
        browser: string;
        count: number;
        percentage: number;
      }>;
      devices: Array<{
        device: string;
        count: number;
        percentage: number;
      }>;
    };
    performance: {
      averageResponseTime: number;
      uptime: number;
      errorRate: number;
    };
  };
  dateRange?: {
    from: string;
    to: string;
  };
  error?: string;
}

/**
 * Portal analytics retrieval handler
  */
async function handleGetPortalAnalytics(req: Request, res: Response): Promise<void> {
  try {
    // Validate request method
    if (req.method !== 'GET') {
      res.status(405).json({
        success: false,
        error: 'Method not allowed',
      } as PortalAnalyticsResponse);
      return;
    }

    // Extract portalId from URL path
    const portalId = req.params.portalId || req.url.split('/')[2];

    if (!portalId) {
      res.status(400).json({
        success: false,
        error: 'portalId is required',
      } as PortalAnalyticsResponse);
      return;
    }

    // Authenticate user
    const authResult = await authenticateUser(req, { required: true });
    if (!authResult.success || !authResult.userId) {
      res.status(401).json({
        success: false,
        error: authResult.error || 'User authentication required',
      } as PortalAnalyticsResponse);
      return;
    }
    const userId = authResult.userId;

    // Parse query parameters
    const { from, to, timeframe } = req.query;
    const dateFrom = from
      ? new Date(from as string)
      : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // 30 days ago
    const dateTo = to ? new Date(to as string) : new Date();

    // Initialize Firestore
    const db = getFirestore();

    // Verify portal exists and belongs to user
    const portalDoc = await db.collection('portals').doc(portalId).get();

    if (!portalDoc.exists) {
      res.status(404).json({
        success: false,
        error: 'Portal not found',
      } as PortalAnalyticsResponse);
      return;
    }

    const portalData = portalDoc.data();

    // Verify ownership
    if (portalData?.userId !== userId) {
      res.status(403).json({
        success: false,
        error: 'Access denied to this portal analytics',
      } as PortalAnalyticsResponse);
      return;
    }

    // Fetch analytics data
    const [overviewData, chatSessions, viewEvents, feedbackData] = await Promise.all([
      getOverviewAnalytics(db, portalId, dateFrom, dateTo),
      getChatSessionAnalytics(db, portalId, dateFrom, dateTo),
      getViewAnalytics(db, portalId, dateFrom, dateTo),
      getFeedbackAnalytics(db, portalId, dateFrom, dateTo),
    ]);

    // Calculate engagement metrics
    const engagementMetrics = calculateEngagementMetrics(chatSessions);

    // Generate timeline data
    const timelineData = generateTimelineData(viewEvents, chatSessions, dateFrom, dateTo);

    // Build analytics response
    const analytics = {
      overview: {
        totalViews: viewEvents.length,
        uniqueVisitors: new Set(viewEvents.map((e: any) => e.visitorId || e.userId)).size,
        chatSessionsStarted: chatSessions.length,
        totalMessages: chatSessions.reduce(
          (sum: number, session: any) => sum + (session.messageCount || 0),
          0
        ),
        averageSessionDuration: calculateAverageSessionDuration(chatSessions),
        conversionRate: calculateConversionRate(viewEvents.length, chatSessions.length),
      },
      engagement: {
        topQuestions: engagementMetrics.topQuestions,
        topTopics: engagementMetrics.topTopics,
        userFeedback: feedbackData,
      },
      timeline: {
        daily: timelineData.daily,
      },
      geographic: await getGeographicData(db, portalId, dateFrom, dateTo),
      technology: await getTechnologyData(db, portalId, dateFrom, dateTo),
      performance: {
        averageResponseTime: 1.2, // seconds (mock data)
        uptime: 99.9, // percentage
        errorRate: 0.1, // percentage
      },
    };

    // Build response
    const response: PortalAnalyticsResponse = {
      success: true,
      portalId,
      analytics,
      dateRange: {
        from: dateFrom.toISOString(),
        to: dateTo.toISOString(),
      },
    };

    res.status(200).json(response);
  } catch (error) {
    logger.error('Error in getPortalAnalytics:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    } as PortalAnalyticsResponse);
  }
}

/**
 * Get overview analytics from Firestore
  */
async function getOverviewAnalytics(
  db: FirebaseFirestore.Firestore,
  portalId: string,
  from: Date,
  to: Date
) {
  const analyticsDoc = await db.collection('portalAnalytics').doc(portalId).get();

  return analyticsDoc.exists ? analyticsDoc.data() : {};
}

/**
 * Get chat session analytics
  */
async function getChatSessionAnalytics(
  db: FirebaseFirestore.Firestore,
  portalId: string,
  from: Date,
  to: Date
) {
  const sessionsSnapshot = await db
    .collection('chatSessions')
    .where('portalId', '==', portalId)
    .where('createdAt', '>=', from)
    .where('createdAt', '<=', to)
    .get();

  return sessionsSnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
  }));
}

/**
 * Get view analytics
  */
async function getViewAnalytics(
  db: FirebaseFirestore.Firestore,
  portalId: string,
  from: Date,
  to: Date
) {
  const viewsSnapshot = await db
    .collection('portalViews')
    .where('portalId', '==', portalId)
    .where('timestamp', '>=', from)
    .where('timestamp', '<=', to)
    .get();

  return viewsSnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
  }));
}

/**
 * Get feedback analytics
  */
async function getFeedbackAnalytics(
  db: FirebaseFirestore.Firestore,
  portalId: string,
  from: Date,
  to: Date
) {
  const feedbackSnapshot = await db
    .collection('portalFeedback')
    .where('portalId', '==', portalId)
    .where('createdAt', '>=', from)
    .where('createdAt', '<=', to)
    .get();

  const feedback = feedbackSnapshot.docs.map(doc => doc.data());
  const positive = feedback.filter(f => f.rating >= 4).length;
  const negative = feedback.filter(f => f.rating <= 2).length;
  const average =
    feedback.length > 0 ? feedback.reduce((sum, f) => sum + f.rating, 0) / feedback.length : 0;

  return { positive, negative, average };
}

/**
 * Calculate engagement metrics
  */
function calculateEngagementMetrics(chatSessions: any[]) {
  const questionCounts: Record<string, number> = {};
  const topicCounts: Record<string, number> = {};

  chatSessions.forEach(session => {
    session.messages?.forEach((msg: any) => {
      if (msg.type === 'user') {
        // Simple keyword extraction (to be enhanced with NLP)
        const words = msg.message.toLowerCase().split(' ');
        words.forEach(word => {
          if (word.length > 3) {
            questionCounts[word] = (questionCounts[word] || 0) + 1;
          }
        });

        // Topic extraction
        if (msg.context?.topic) {
          topicCounts[msg.context.topic] = (topicCounts[msg.context.topic] || 0) + 1;
        }
      }
    });
  });

  const topQuestions = Object.entries(questionCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10)
    .map(([question, count]) => ({ question, count }));

  const topTopics = Object.entries(topicCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([topic, count]) => ({ topic, count }));

  return { topQuestions, topTopics };
}

/**
 * Calculate average session duration
  */
function calculateAverageSessionDuration(chatSessions: any[]): number {
  if (chatSessions.length === 0) return 0;

  const durations = chatSessions
    .filter(session => session.lastActivity && session.createdAt)
    .map(session => {
      const start = session.createdAt.toDate?.() || new Date(session.createdAt);
      const end = session.lastActivity.toDate?.() || new Date(session.lastActivity);
      return (end.getTime() - start.getTime()) / 1000; // seconds
    });

  return durations.length > 0
    ? durations.reduce((sum, duration) => sum + duration, 0) / durations.length
    : 0;
}

/**
 * Calculate conversion rate (chat sessions / views)
  */
function calculateConversionRate(views: number, sessions: number): number {
  return views > 0 ? (sessions / views) * 100 : 0;
}

/**
 * Generate timeline data
  */
function generateTimelineData(viewEvents: any[], chatSessions: any[], from: Date, to: Date) {
  const daily: Array<{ date: string; views: number; sessions: number; messages: number }> = [];

  const currentDate = new Date(from);
  while (currentDate <= to) {
    const dateStr = currentDate.toISOString().split('T')[0];

    const dayViews = viewEvents.filter(event => {
      const eventDate = (event.timestamp?.toDate?.() || new Date(event.timestamp))
        .toISOString()
        .split('T')[0];
      return eventDate === dateStr;
    }).length;

    const daySessions = chatSessions.filter(session => {
      const sessionDate = (session.createdAt?.toDate?.() || new Date(session.createdAt))
        .toISOString()
        .split('T')[0];
      return sessionDate === dateStr;
    });

    const dayMessages = daySessions.reduce((sum, session) => sum + (session.messageCount || 0), 0);

    daily.push({
      date: dateStr,
      views: dayViews,
      sessions: daySessions.length,
      messages: dayMessages,
    });

    currentDate.setDate(currentDate.getDate() + 1);
  }

  return { daily };
}

/**
 * Get geographic data (mock implementation)
  */
async function getGeographicData(
  db: FirebaseFirestore.Firestore,
  portalId: string,
  from: Date,
  to: Date
) {
  // This would typically analyze IP addresses or user location data
  return {
    countries: [
      { country: 'United States', count: 45, percentage: 60 },
      { country: 'United Kingdom', count: 15, percentage: 20 },
      { country: 'Canada', count: 8, percentage: 10.7 },
      { country: 'Germany', count: 7, percentage: 9.3 },
    ],
  };
}

/**
 * Get technology data (mock implementation)
  */
async function getTechnologyData(
  db: FirebaseFirestore.Firestore,
  portalId: string,
  from: Date,
  to: Date
) {
  // This would analyze user agent strings
  return {
    browsers: [
      { browser: 'Chrome', count: 50, percentage: 66.7 },
      { browser: 'Safari', count: 15, percentage: 20 },
      { browser: 'Firefox', count: 7, percentage: 9.3 },
      { browser: 'Edge', count: 3, percentage: 4 },
    ],
    devices: [
      { device: 'Desktop', count: 45, percentage: 60 },
      { device: 'Mobile', count: 25, percentage: 33.3 },
      { device: 'Tablet', count: 5, percentage: 6.7 },
    ],
  };
}

/**
 * Firebase Function: Get Portal Analytics
 * Endpoint: GET /portal/{portalId}/analytics
  */
export const getPortalAnalytics = https.onRequest(
  {
    cors: true,
    memory: '512MiB',
    timeoutSeconds: 30,
    maxInstances: 10,
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
    await handleGetPortalAnalytics(req, res);
  }
);
