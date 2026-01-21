// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflictsimport { onRequest } from 'firebase-functions/v2/https';
import { Request, Response } from 'firebase-functions';
import { profileManagerService } from '../../services/profile-manager.service';
import { getPublicProfile } from '../../models/public-profile.service';

interface ProfileViewResponse {
  success: boolean;
  profile?: {
    id: string;
    slug: string;
    title: string;
    subtitle: string;
    bio: string;
    contactInfo: {
      email?: string;
      phone?: string;
      location?: string;
      website?: string;
    };
    socialLinks: Record<string, string>;
    skills: string[];
    experience: Array<{
      title: string;
      company: string;
      duration: string;
      description: string;
    }>;
    education: Array<{
      degree: string;
      institution: string;
      year: string;
      grade?: string;
    }>;
    achievements: string[];
    portfolio: Array<{
      id: string;
      title: string;
      description: string;
      mediaType: 'image' | 'video' | 'audio' | 'document';
      mediaUrl: string;
      thumbnailUrl?: string;
    }>;
    testimonials: Array<{
      id: string;
      authorName: string;
      authorTitle?: string;
      authorCompany?: string;
      content: string;
      rating?: number;
      createdAt: string;
    }>;
    theme: string;
    sections: string[];
    customCSS?: string;
    settings: {
      allowContact: boolean;
      allowDownloads: boolean;
      showLastActive: boolean;
    };
    analytics?: {
      totalViews: number;
      uniqueViews: number;
      lastViewedAt?: string;
    };
    seoData: {
      title: string;
      description: string;
      keywords: string[];
      canonicalUrl: string;
      ogImage: string;
    };
    qrCodeUrl: string;
  };
  message?: string;
}

export const viewPublicProfile = onRequest(
  {
    timeoutSeconds: 60,
    memory: '512MiB',
    maxInstances: 200,
    cors: {
      origin: true,
      methods: ['GET', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-Forwarded-For'],
      credentials: true
    }
  },
  async (req: Request, res: Response) => {
    try {
      console.log('Public profile view request received');

      // Handle preflight OPTIONS request
      if (req.method === 'OPTIONS') {
        res.set('Access-Control-Allow-Origin', '*');
        res.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
        res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, X-Forwarded-For');
        res.status(200).send('');
        return;
      }

      // Only allow GET method
      if (req.method !== 'GET') {
        res.status(405).json({
          success: false,
          message: 'Method not allowed. Use GET.'
        } as ProfileViewResponse);
        return;
      }

      // Extract profile identifier from URL path
      const urlParts = req.path.split('/');
      const profileIdentifier = urlParts[urlParts.length - 1];

      if (!profileIdentifier || profileIdentifier.length < 3) {
        res.status(400).json({
          success: false,
          message: 'Valid profile identifier is required'
        } as ProfileViewResponse);
        return;
      }

      console.log(`Viewing public profile: ${profileIdentifier}`);

      // Gather visitor context for analytics
      const visitorContext = {
        visitorId: req.query.visitor_id as string,
        userAgent: req.headers['user-agent'],
        ipAddress: getClientIP(req),
        referrer: req.headers.referer || req.headers.referrer as string,
        utm: {
          source: req.query.utm_source as string,
          medium: req.query.utm_medium as string,
          campaign: req.query.utm_campaign as string,
          term: req.query.utm_term as string,
          content: req.query.utm_content as string
        }
      };

      // Check if identifier is a profile ID or slug
      let profile;
      if (profileIdentifier.length > 20) {
        // Looks like a profile ID
        profile = await getPublicProfile(profileIdentifier);
      } else {
        // Treat as slug
        profile = await profileManagerService.viewProfile(profileIdentifier, visitorContext);
      }

      if (!profile) {
        res.status(404).json({
          success: false,
          message: 'Profile not found'
        } as ProfileViewResponse);
        return;
      }

      // Check if profile is active
      if (!profile.isActive) {
        res.status(404).json({
          success: false,
          message: 'Profile is not available'
        } as ProfileViewResponse);
        return;
      }

      // Check password protection
      const providedPassword = req.query.password as string;
      if (profile.settings.passwordProtected && !providedPassword) {
        res.status(401).json({
          success: false,
          message: 'Password required to view this profile'
        } as ProfileViewResponse);
        return;
      }

      if (profile.settings.passwordProtected && providedPassword) {
        // In production, use proper password hashing (bcrypt)
        // For now, simple string comparison (not secure)
        if (providedPassword !== profile.settings.password) {
          res.status(401).json({
            success: false,
            message: 'Incorrect password'
          } as ProfileViewResponse);
          return;
        }
      }

      // Prepare response data (filter sensitive information)
      const responseProfile = {
        id: profile.id,
        slug: profile.slug,
        title: profile.title,
        subtitle: profile.subtitle,
        bio: profile.bio,
        contactInfo: filterContactInfo(profile.contactInfo, profile.settings.allowContact),
        socialLinks: profile.socialLinks,
        skills: profile.skills,
        experience: profile.experience,
        education: profile.education,
        achievements: profile.achievements,
        portfolio: profile.portfolio,
        testimonials: profile.testimonials,
        theme: profile.theme,
        sections: profile.sections,
        customCSS: profile.customCSS,
        settings: {
          allowContact: profile.settings.allowContact,
          allowDownloads: profile.settings.allowDownloads,
          showLastActive: profile.settings.showLastActive
        },
        analytics: profile.settings.showAnalytics ? {
          totalViews: profile.analytics.totalViews,
          uniqueViews: profile.analytics.uniqueViews,
          lastViewedAt: profile.analytics.lastViewedAt?.toDate().toISOString()
        } : undefined,
        seoData: profile.seoData,
        qrCodeUrl: profile.qrCodeUrl
      };

      // Set appropriate cache headers
      const cacheMaxAge = profile.settings.showLastActive ? 300 : 3600; // 5 minutes if showing activity, 1 hour otherwise
      res.set({
        'Cache-Control': `public, max-age=${cacheMaxAge}`,
        'ETag': generateETag(profile),
        'Last-Modified': profile.updatedAt.toDate().toUTCString()
      });

      // Set SEO headers
      res.set({
        'X-Robots-Tag': profile.settings.seoOptimized ? 'index, follow' : 'noindex, nofollow'
      });

      console.log(`Public profile viewed successfully: ${profile.slug}`);

      res.status(200).json({
        success: true,
        profile: responseProfile
      } as ProfileViewResponse);

    } catch (error) {
      console.error('Profile view error:', error);

      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Internal server error while viewing profile'
      } as ProfileViewResponse);
    }
  }
);

/**
 * Filter contact information based on privacy settings
 */
function filterContactInfo(contactInfo: any, allowContact: boolean) {
  if (!allowContact) {
    // Return limited contact info
    return {
      location: contactInfo.location,
      website: contactInfo.website
    };
  }

  return contactInfo;
}

/**
 * Generate ETag for caching
 */
function generateETag(profile: any): string {
  const hash = require('crypto')
    .createHash('md5')
    .update(JSON.stringify({
      id: profile.id,
      updatedAt: profile.updatedAt,
      analytics: profile.analytics.totalViews
    }))
    .digest('hex');

  return `"${hash}"`;
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