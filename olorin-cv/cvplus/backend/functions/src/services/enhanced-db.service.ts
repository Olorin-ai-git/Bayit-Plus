/**
 * Enhanced database service for new CV features
 */

import { firestore } from '../config/firebase';
import { 
  EnhancedJob, 
  PublicCVProfile, 
  FeatureAnalytics, 
  UserRAGProfile, 
  ChatSession,
  ContactFormSubmission,
  QRCodeScan,
  FeatureInteraction
} from '../types/enhanced-models';
import { generateSlug } from '../utils/slug';

export class EnhancedDatabaseService {
  private db = firestore;

  /**
   * Create or update enhanced job features
   */
  async updateEnhancedFeatures(
    jobId: string, 
    features: Partial<EnhancedJob['enhancedFeatures']>
  ): Promise<void> {
    const jobRef = this.db.collection('jobs').doc(jobId);
    
    const updates: any = {};
    for (const [featureId, featureData] of Object.entries(features)) {
      updates[`enhancedFeatures.${featureId}`] = {
        ...featureData,
        processedAt: new Date()
      };
    }
    
    await jobRef.update(updates);
  }

  /**
   * Create public CV profile
   */
  async createPublicProfile(jobId: string, userId: string): Promise<PublicCVProfile> {
    const slug = await this.generateUniqueSlug(jobId);
    
    const profile: PublicCVProfile = {
      jobId,
      userId,
      slug,
      publicData: {}, // Will be populated with PII-masked data
      settings: {
        showContactForm: true,
        showCalendar: false,
        showChat: true,
        customBranding: false,
        analytics: true
      },
      createdAt: new Date(),
      updatedAt: new Date()
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
      timestamp: new Date()
    };
    
    await this.db.runTransaction(async (transaction) => {
      const doc = await transaction.get(analyticsRef);
      
      if (!doc.exists) {
        // Create new analytics document
        const analytics: FeatureAnalytics = {
          jobId,
          featureId,
          interactions: [interactionData],
          aggregates: {
            totalInteractions: 1,
            uniqueUsers: 1,
            averageEngagementTime: interactionData.duration || 0,
            lastInteraction: new Date()
          }
        };
        transaction.set(analyticsRef, analytics);
      } else {
        // Update existing analytics
        const data = doc.data() as FeatureAnalytics;
        transaction.update(analyticsRef, {
          interactions: [...data.interactions, interactionData],
          'aggregates.totalInteractions': data.aggregates.totalInteractions + 1,
          'aggregates.lastInteraction': new Date(),
          'aggregates.averageEngagementTime': 
            ((data.aggregates.averageEngagementTime * data.aggregates.totalInteractions) + 
            (interactionData.duration || 0)) / (data.aggregates.totalInteractions + 1)
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
      createdAt: new Date(),
      lastActivity: new Date()
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
      messages: firestore.FieldValue.arrayUnion(message),
      lastActivity: new Date()
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
      timestamp: new Date(),
      status: 'pending'
    };
    
    await submissionRef.set(data);
    
    // Update job analytics
    await this.incrementJobAnalytics(submission.jobId, {
      'analytics.contactFormSubmissions': 1
    });
    
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
      timestamp: new Date()
    };
    
    await scanRef.set(scanData);
    
    // Update job analytics
    await this.incrementJobAnalytics(scan.jobId, {
      'analytics.qrCodeScans': 1
    });
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
      updates[field] = firestore.FieldValue.increment(value);
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
    
    if (profiles.empty) {
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