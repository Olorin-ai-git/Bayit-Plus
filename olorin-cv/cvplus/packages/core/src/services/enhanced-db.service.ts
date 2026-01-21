/**
 * Enhanced database service for new CV features
  */

import * as admin from 'firebase-admin';
import { 
  EnhancedJob, 
  PublicCVProfile, 
  FeatureAnalytics, 
  UserRAGProfile, 
  ChatSession,
  ChatMessage,
  ContactFormSubmission,
  QRCodeScan,
  FeatureInteraction,
  ParsedCV
} from '../types/enhanced-models';
import { generateSlug } from '../utils/slug';

export class EnhancedDatabaseService {
  private db = admin.firestore();

  /**
   * Create or update enhanced job features
    */
  async updateEnhancedFeatures(
    jobId: string, 
    features: Partial<EnhancedJob['enhancedFeatures']>
  ): Promise<void> {
    const jobRef = this.db.collection('jobs').doc(jobId);
    
    const updates: any = {};
    if (features) {
      for (const [featureId, featureData] of Object.entries(features)) {
        updates[`enhancedFeatures.${featureId}`] = {
          ...(typeof featureData === 'object' && featureData !== null ? featureData : {}),
          processedAt: Date.now()
        };
      }
    }
    
    await jobRef.update(updates);
  }

  /**
   * Create public CV profile
    */
  async createPublicProfile(jobId: string, userId: string): Promise<PublicCVProfile> {
    const slug = await this.generateUniqueSlug(jobId);
    
    const profile: PublicCVProfile = {
      id: jobId,
      jobId,
      userId,
      slug,
      title: 'Professional CV',
      parsedCV: {} as ParsedCV, // Will be populated with PII-masked data
      features: {},
      template: 'modern',
      isPublic: true,
      allowContactForm: true,
      showAnalytics: true,
      qrCodeUrl: '',
      publicUrl: `https://cvplus.ai/public/${slug}`,
      socialSharing: {
        enabled: true,
        platforms: ['linkedin', 'twitter', 'facebook'],
        customMessage: 'Check out my professional CV'
      },
      createdAt: Date.now(),
      updatedAt: Date.now(),
      analytics: {
        totalViews: 0,
        uniqueVisitors: 0,
        averageTimeOnPage: 0,
        bounceRate: 0,
        featureUsage: {},
        conversionRate: 0,
        lastAnalyticsUpdate: Date.now(),
        views: 0,
        qrScans: 0,
        contactSubmissions: 0,
        lastViewedAt: null
      }
    };
    
    await this.db.collection('publicProfiles').doc(jobId).set(profile);
    
    // Update job with public profile info
    await this.db.collection('jobs').doc(jobId).update({
      'publicProfile.isPublic': true,
      'publicProfile.slug': slug
    });
    
    return profile;
  }

  /**
   * Generate unique slug for public profile
    */
  private async generateUniqueSlug(jobId: string): Promise<string> {
    let slug = generateSlug();
    let attempts = 0;
    
    while (attempts < 10) {
      const existing = await this.db
        .collection('publicProfiles')
        .where('slug', '==', slug)
        .limit(1)
        .get();
      
      if (existing.empty) {
        return slug;
      }
      
      slug = generateSlug();
      attempts++;
    }
    
    // Fallback to job ID based slug
    return `cv-${jobId.substring(0, 8)}`;
  }

  /**
   * Track feature analytics
    */
  async trackFeatureInteraction(
    jobId: string,
    featureId: string,
    interaction: Omit<FeatureInteraction, 'timestamp'>
  ): Promise<void> {
    const analyticsRef = this.db
      .collection('featureAnalytics')
      .doc(`${jobId}_${featureId}`);
    
    const interactionData: FeatureInteraction = {
      ...interaction,
      timestamp: Date.now()
    };
    
    await this.db.runTransaction(async (transaction) => {
      const doc = await transaction.get(analyticsRef);
      
      if (!doc.exists) {
        // Create new analytics document
        const analytics: FeatureAnalytics = {
          jobId,
          feature: featureId,
          timestamp: Date.now(),
          value: interactionData,
          interactions: [interactionData],
          aggregates: {
            totalInteractions: 1,
            uniqueUsers: 1,
            averageEngagementTime: interactionData.duration || 0,
            lastInteraction: Date.now()
          }
        };
        transaction.set(analyticsRef, analytics);
      } else {
        // Update existing analytics
        const data = doc.data() as FeatureAnalytics;
        const currentInteractions = data.interactions || [];
        const currentAggregates = data.aggregates || { totalInteractions: 0, averageEngagementTime: 0 };

        transaction.update(analyticsRef, {
          interactions: [...currentInteractions, interactionData],
          'aggregates.totalInteractions': currentAggregates.totalInteractions + 1,
          'aggregates.lastInteraction': Date.now(),
          'aggregates.averageEngagementTime':
            ((currentAggregates.averageEngagementTime * currentAggregates.totalInteractions) +
            (interactionData.duration || 0)) / (currentAggregates.totalInteractions + 1)
        });
      }
    });
  }

  /**
   * Create or update RAG profile
    */
  async upsertRAGProfile(profile: UserRAGProfile): Promise<void> {
    const docId = `${profile.userId}_${profile.jobId}`;
    await this.db.collection('ragProfiles').doc(docId).set(profile, { merge: true });
  }

  /**
   * Create chat session
    */
  async createChatSession(session: Omit<ChatSession, 'sessionId'>): Promise<string> {
    const sessionRef = this.db.collection('chatSessions').doc();
    const sessionId = sessionRef.id;
    
    const sessionData: ChatSession = {
      ...session,
      sessionId,
      messages: [],
      createdAt: Date.now(),
      lastActivity: Date.now()
    };
    
    await sessionRef.set(sessionData);
    
    // Update job chat analytics
    await this.incrementJobAnalytics(session.jobId, {
      'analytics.chatSessions': 1
    });
    
    return sessionId;
  }

  /**
   * Add message to chat session
    */
  async addChatMessage(sessionId: string, message: ChatMessage): Promise<void> {
    const sessionRef = this.db.collection('chatSessions').doc(sessionId);
    
    await sessionRef.update({
      messages: admin.firestore.FieldValue.arrayUnion(message),
      lastActivity: Date.now()
    });
    
    // Get session to update job analytics
    const session = await sessionRef.get();
    if (session.exists) {
      const data = session.data() as ChatSession;
      await this.incrementJobAnalytics(data.jobId, {
        'analytics.chatMessages': 1
      });
    }
  }

  /**
   * Store contact form submission
    */
  async storeContactFormSubmission(
    submission: Omit<ContactFormSubmission, 'id' | 'timestamp'>
  ): Promise<string> {
    const submissionRef = this.db.collection('contactSubmissions').doc();
    const id = submissionRef.id;
    
    const data: ContactFormSubmission = {
      ...submission,
      id,
      timestamp: Date.now(),
      status: 'pending'
    };
    
    await submissionRef.set(data);
    
    // Update job analytics
    if (submission.jobId) {
      await this.incrementJobAnalytics(submission.jobId, {
        'analytics.contactFormSubmissions': 1
      });
    }
    
    return id;
  }

  /**
   * Track QR code scan
    */
  async trackQRCodeScan(scan: Omit<QRCodeScan, 'scanId' | 'timestamp'>): Promise<void> {
    const scanRef = this.db.collection('qrScans').doc();
    
    const scanData: QRCodeScan = {
      ...scan,
      scanId: scanRef.id,
      timestamp: Date.now()
    };
    
    await scanRef.set(scanData);
    
    // Update job analytics
    if (scan.jobId) {
      await this.incrementJobAnalytics(scan.jobId, {
        'analytics.qrCodeScans': 1
      });
    }
  }

  /**
   * Increment job analytics
    */
  private async incrementJobAnalytics(
    jobId: string, 
    increments: Record<string, number>
  ): Promise<void> {
    const jobRef = this.db.collection('jobs').doc(jobId);
    
    const updates: any = {};
    for (const [field, value] of Object.entries(increments)) {
      updates[field] = admin.firestore.FieldValue.increment(value);
    }
    
    await jobRef.update(updates);
  }

  /**
   * Get public profile by slug
    */
  async getPublicProfileBySlug(slug: string): Promise<PublicCVProfile | null> {
    const profiles = await this.db
      .collection('publicProfiles')
      .where('slug', '==', slug)
      .limit(1)
      .get();
    
    if (profiles.empty || !profiles.docs[0]) {
      return null;
    }
    
    return profiles.docs[0].data() as PublicCVProfile;
  }

  /**
   * Update privacy settings
    */
  async updatePrivacySettings(jobId: string, settings: any): Promise<void> {
    await this.db.collection('jobs').doc(jobId).update({
      'privacySettings': settings
    });
  }

  /**
   * Get feature analytics
    */
  async getFeatureAnalytics(jobId: string): Promise<FeatureAnalytics[]> {
    const analytics = await this.db
      .collection('featureAnalytics')
      .where('jobId', '==', jobId)
      .get();
    
    return analytics.docs.map(doc => doc.data() as FeatureAnalytics);
  }

  /**
   * Clean up expired sessions
    */
  async cleanupExpiredSessions(): Promise<void> {
    const cutoffDate = new Date();
    cutoffDate.setHours(cutoffDate.getHours() - 24); // 24 hour expiry
    
    const expiredSessions = await this.db
      .collection('chatSessions')
      .where('lastActivity', '<', cutoffDate)
      .get();
    
    const batch = this.db.batch();
    expiredSessions.docs.forEach(doc => {
      batch.delete(doc.ref);
    });
    
    await batch.commit();
  }
}

export const enhancedDbService = new EnhancedDatabaseService();