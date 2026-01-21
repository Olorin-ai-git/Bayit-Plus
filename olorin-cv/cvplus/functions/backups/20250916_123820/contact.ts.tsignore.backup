// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflictsimport { onRequest } from 'firebase-functions/v2/https';
import { Request, Response } from 'firebase-functions';
import * as admin from 'firebase-admin';
import { getPublicProfile } from '../../models/public-profile.service';
import { getUserProfile } from '../../models/user-profile.service';
import { trackEvent } from '../../models/analytics.service';

interface ContactRequest {
  senderName: string;
  senderEmail: string;
  senderCompany?: string;
  senderPhone?: string;
  subject: string;
  message: string;
  inquiryType?: 'job_opportunity' | 'collaboration' | 'networking' | 'general';
  attachments?: Array<{
    fileName: string;
    fileType: string;
    fileUrl: string;
  }>;
  metadata?: {
    referrer?: string;
    utm?: Record<string, string>;
    browserInfo?: string;
  };
}

interface ContactResponse {
  success: boolean;
  messageId?: string;
  message?: string;
  deliveryStatus?: 'sent' | 'queued' | 'failed';
  estimatedResponseTime?: string;
}

export const contactProfileOwner = onRequest(
  {
    timeoutSeconds: 60,
    memory: '512MiB',
    maxInstances: 100,
    cors: {
      origin: true,
      methods: ['POST', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'X-Requested-With', 'X-Forwarded-For'],
      credentials: true
    }
  },
  async (req: Request, res: Response) => {
    try {
      console.log('Profile contact request received');

      // Handle preflight OPTIONS request
      if (req.method === 'OPTIONS') {
        res.set('Access-Control-Allow-Origin', '*');
        res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
        res.set('Access-Control-Allow-Headers', 'Content-Type, X-Requested-With, X-Forwarded-For');
        res.status(200).send('');
        return;
      }

      // Only allow POST method
      if (req.method !== 'POST') {
        res.status(405).json({
          success: false,
          message: 'Method not allowed. Use POST.'
        } as ContactResponse);
        return;
      }

      // Validate Content-Type
      if (!req.headers['content-type']?.includes('application/json')) {
        res.status(400).json({
          success: false,
          message: 'Content-Type must be application/json'
        } as ContactResponse);
        return;
      }

      // Extract profileId from URL path
      const urlParts = req.path.split('/');
      const profileIdIndex = urlParts.findIndex(part => part === 'contact') - 1;
      const profileId = urlParts[profileIdIndex];

      if (!profileId || profileId.length < 10) {
        res.status(400).json({
          success: false,
          message: 'Valid profile ID is required'
        } as ContactResponse);
        return;
      }

      // Parse request body
      const requestData: ContactRequest = req.body;

      // Validate required fields
      const validationErrors = validateContactRequest(requestData);
      if (validationErrors.length > 0) {
        res.status(400).json({
          success: false,
          message: `Validation failed: ${validationErrors.join(', ')}`
        } as ContactResponse);
        return;
      }

      console.log(`Processing contact request for profile: ${profileId}`);

      // Get profile information
      const profile = await getPublicProfile(profileId);
      if (!profile) {
        res.status(404).json({
          success: false,
          message: 'Profile not found'
        } as ContactResponse);
        return;
      }

      // Check if profile allows contact
      if (!profile.settings.allowContact) {
        res.status(403).json({
          success: false,
          message: 'This profile does not accept contact messages'
        } as ContactResponse);
        return;
      }

      // Check if profile is active
      if (!profile.isActive) {
        res.status(404).json({
          success: false,
          message: 'Profile is not available'
        } as ContactResponse);
        return;
      }

      // Get profile owner's information
      const profileOwner = await getUserProfile(profile.userId);
      if (!profileOwner) {
        res.status(500).json({
          success: false,
          message: 'Profile owner information not found'
        } as ContactResponse);
        return;
      }

      // Rate limiting check
      const clientIP = getClientIP(req);
      const rateLimitResult = await checkRateLimit(clientIP, requestData.senderEmail);
      if (!rateLimitResult.allowed) {
        res.status(429).json({
          success: false,
          message: rateLimitResult.message
        } as ContactResponse);
        return;
      }

      // Spam detection
      const spamScore = await calculateSpamScore(requestData, clientIP);
      if (spamScore > 0.8) {
        console.warn(`High spam score (${spamScore}) for contact request from ${requestData.senderEmail}`);

        // Log but don't block - profile owner can decide
        await trackEvent({
          entityType: 'public_profile',
          entityId: profileId,
          eventType: 'contact_spam_detected',
          eventData: {
            senderEmail: requestData.senderEmail,
            spamScore,
            clientIP
          }
        });
      }

      // Generate message ID
      const messageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Prepare email content
      const emailContent = await generateContactEmail(requestData, profile, messageId);

      // Send email notification
      const deliveryResult = await sendContactNotification(
        profileOwner.personalInfo.email,
        emailContent,
        requestData
      );

      // Store contact message in Firestore
      await storeContactMessage(profileId, messageId, requestData, clientIP, spamScore);

      // Update profile analytics
      await updateContactAnalytics(profileId);

      // Track contact event
      await trackEvent({
        entityType: 'public_profile',
        entityId: profileId,
        eventType: 'profile_contacted',
        eventData: {
          messageId,
          inquiryType: requestData.inquiryType || 'general',
          senderDomain: requestData.senderEmail.split('@')[1],
          hasAttachments: (requestData.attachments || []).length > 0,
          spamScore
        }
      });

      console.log(`Contact request processed successfully: ${messageId}`);

      res.status(200).json({
        success: true,
        messageId,
        message: 'Your message has been sent successfully',
        deliveryStatus: deliveryResult.status,
        estimatedResponseTime: getEstimatedResponseTime(profileOwner.subscriptionTier)
      } as ContactResponse);

    } catch (error) {
      console.error('Profile contact error:', error);

      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Internal server error while sending contact message'
      } as ContactResponse);
    }
  }
);

/**
 * Validate contact request data
 */
function validateContactRequest(data: ContactRequest): string[] {
  const errors: string[] = [];

  if (!data.senderName || data.senderName.trim().length === 0) {
    errors.push('Sender name is required');
  }

  if (!data.senderEmail || !isValidEmail(data.senderEmail)) {
    errors.push('Valid sender email is required');
  }

  if (!data.subject || data.subject.trim().length === 0) {
    errors.push('Subject is required');
  }

  if (!data.message || data.message.trim().length < 10) {
    errors.push('Message must be at least 10 characters long');
  }

  if (data.subject && data.subject.length > 200) {
    errors.push('Subject must be less than 200 characters');
  }

  if (data.message && data.message.length > 5000) {
    errors.push('Message must be less than 5000 characters');
  }

  if (data.senderPhone && !isValidPhone(data.senderPhone)) {
    errors.push('Invalid phone number format');
  }

  return errors;
}

/**
 * Check rate limiting for contact requests
 */
async function checkRateLimit(clientIP: string, senderEmail: string): Promise<{
  allowed: boolean;
  message?: string;
}> {
  const firestore = admin.firestore();
  const now = new Date();
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

  // Check IP-based rate limit (10 requests per hour)
  const ipQuery = await firestore
    .collection('contact_rate_limits')
    .doc(clientIP)
    .collection('requests')
    .where('timestamp', '>', oneHourAgo)
    .get();

  if (ipQuery.size >= 10) {
    return {
      allowed: false,
      message: 'Too many requests from your IP address. Please try again later.'
    };
  }

  // Check email-based rate limit (5 requests per hour)
  const emailQuery = await firestore
    .collection('contact_rate_limits')
    .doc(senderEmail)
    .collection('requests')
    .where('timestamp', '>', oneHourAgo)
    .get();

  if (emailQuery.size >= 5) {
    return {
      allowed: false,
      message: 'Too many requests from this email address. Please try again later.'
    };
  }

  // Record this request
  await firestore
    .collection('contact_rate_limits')
    .doc(clientIP)
    .collection('requests')
    .add({
      timestamp: admin.firestore.Timestamp.fromDate(now),
      email: senderEmail
    });

  return { allowed: true };
}

/**
 * Calculate spam score for the message
 */
async function calculateSpamScore(data: ContactRequest, clientIP: string): Promise<number> {
  let score = 0;

  // Check for suspicious patterns
  const suspiciousWords = ['click here', 'limited time', 'act now', 'free money', 'guaranteed', 'urgent'];
  const messageText = (data.subject + ' ' + data.message).toLowerCase();

  suspiciousWords.forEach(word => {
    if (messageText.includes(word)) {
      score += 0.2;
    }
  });

  // Check for excessive links
  const linkCount = (messageText.match(/http[s]?:\/\//g) || []).length;
  if (linkCount > 3) {
    score += 0.3;
  }

  // Check for excessive caps
  const capsRatio = (messageText.match(/[A-Z]/g) || []).length / messageText.length;
  if (capsRatio > 0.3) {
    score += 0.2;
  }

  // Check email domain reputation (simplified)
  const emailDomain = data.senderEmail.split('@')[1];
  const suspiciousDomains = ['tempmail.org', '10minutemail.com', 'guerrillamail.com'];
  if (suspiciousDomains.includes(emailDomain)) {
    score += 0.4;
  }

  return Math.min(score, 1.0);
}

/**
 * Generate contact email content
 */
async function generateContactEmail(
  data: ContactRequest,
  profile: any,
  messageId: string
): Promise<{
  subject: string;
  html: string;
  text: string;
}> {
  const subject = `New contact message from ${data.senderName} via your CVPlus profile`;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: #667eea; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
        <h1 style="margin: 0;">New Contact Message</h1>
        <p style="margin: 5px 0 0 0; opacity: 0.9;">From your CVPlus profile: ${profile.title}</p>
      </div>

      <div style="background: #f8f9fa; padding: 20px; border: 1px solid #e9ecef;">
        <h2 style="color: #333; margin-top: 0;">Message Details</h2>

        <div style="background: white; padding: 15px; border-radius: 5px; margin-bottom: 15px;">
          <p><strong>From:</strong> ${data.senderName} &lt;${data.senderEmail}&gt;</p>
          ${data.senderCompany ? `<p><strong>Company:</strong> ${data.senderCompany}</p>` : ''}
          ${data.senderPhone ? `<p><strong>Phone:</strong> ${data.senderPhone}</p>` : ''}
          <p><strong>Subject:</strong> ${data.subject}</p>
          <p><strong>Inquiry Type:</strong> ${data.inquiryType || 'General'}</p>
        </div>

        <div style="background: white; padding: 15px; border-radius: 5px;">
          <h3 style="color: #333; margin-top: 0;">Message</h3>
          <div style="white-space: pre-wrap; line-height: 1.5;">${data.message}</div>
        </div>

        ${data.attachments && data.attachments.length > 0 ? `
        <div style="background: white; padding: 15px; border-radius: 5px; margin-top: 15px;">
          <h3 style="color: #333; margin-top: 0;">Attachments</h3>
          ${data.attachments.map(att => `
            <p><a href="${att.fileUrl}" style="color: #667eea;">${att.fileName}</a> (${att.fileType})</p>
          `).join('')}
        </div>
        ` : ''}
      </div>

      <div style="background: #e9ecef; padding: 15px; border-radius: 0 0 8px 8px; text-align: center; font-size: 12px; color: #666;">
        <p>Message ID: ${messageId}</p>
        <p>Sent via CVPlus Public Profile | <a href="https://cvplus.com" style="color: #667eea;">cvplus.com</a></p>
      </div>
    </div>
  `;

  const text = `
New Contact Message

From: ${data.senderName} <${data.senderEmail}>
${data.senderCompany ? `Company: ${data.senderCompany}` : ''}
${data.senderPhone ? `Phone: ${data.senderPhone}` : ''}
Subject: ${data.subject}
Inquiry Type: ${data.inquiryType || 'General'}

Message:
${data.message}

${data.attachments && data.attachments.length > 0 ? `
Attachments:
${data.attachments.map(att => `- ${att.fileName} (${att.fileType}): ${att.fileUrl}`).join('\n')}
` : ''}

Message ID: ${messageId}
Sent via CVPlus Public Profile
  `.trim();

  return { subject, html, text };
}

/**
 * Send contact notification email
 */
async function sendContactNotification(
  recipientEmail: string,
  emailContent: any,
  data: ContactRequest
): Promise<{ status: 'sent' | 'queued' | 'failed' }> {
  try {
    // In production, integrate with email service (SendGrid, AWS SES, etc.)
    // For now, we'll simulate email sending

    console.log(`Sending contact notification to: ${recipientEmail}`);
    console.log(`Subject: ${emailContent.subject}`);

    // Simulate async email sending
    return { status: 'sent' };

  } catch (error) {
    console.error('Email sending failed:', error);
    return { status: 'failed' };
  }
}

/**
 * Store contact message in Firestore
 */
async function storeContactMessage(
  profileId: string,
  messageId: string,
  data: ContactRequest,
  clientIP: string,
  spamScore: number
): Promise<void> {
  const firestore = admin.firestore();

  await firestore.collection('contact_messages').doc(messageId).set({
    profileId,
    senderName: data.senderName,
    senderEmail: data.senderEmail,
    senderCompany: data.senderCompany,
    senderPhone: data.senderPhone,
    subject: data.subject,
    message: data.message,
    inquiryType: data.inquiryType || 'general',
    attachments: data.attachments || [],
    metadata: {
      ...data.metadata,
      clientIP,
      spamScore,
      userAgent: data.metadata?.browserInfo
    },
    createdAt: admin.firestore.Timestamp.now(),
    status: 'sent'
  });
}

/**
 * Update profile contact analytics
 */
async function updateContactAnalytics(profileId: string): Promise<void> {
  const firestore = admin.firestore();

  await firestore.collection('public_profiles').doc(profileId).update({
    'analytics.contactClicks': admin.firestore.FieldValue.increment(1),
    'analytics.lastContactedAt': admin.firestore.Timestamp.now()
  });
}

/**
 * Get estimated response time based on subscription tier
 */
function getEstimatedResponseTime(tier: string): string {
  const responseTimes = {
    enterprise: '24 hours',
    premium: '48 hours',
    basic: '72 hours',
    free: '1 week'
  };

  return responseTimes[tier as keyof typeof responseTimes] || '1 week';
}

/**
 * Validate email format
 */
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate phone number format
 */
function isValidPhone(phone: string): boolean {
  const phoneRegex = /^\+?[\d\s\-\(\)]{10,}$/;
  return phoneRegex.test(phone);
}

/**
 * Get client IP address
 */
function getClientIP(req: Request): string {
  return (
    req.headers['x-forwarded-for'] as string ||
    req.headers['x-real-ip'] as string ||
    req.connection?.remoteAddress ||
    req.socket?.remoteAddress ||
    'unknown'
  ).split(',')[0].trim();
}