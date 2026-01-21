// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflictsimport { onRequest } from 'firebase-functions/v2/https';
import { Request, Response } from 'firebase-functions';
import { profileManagerService } from '../../services/profile-manager.service';
import { getPublicProfile } from '../../models/public-profile.service';
import { getUserProfile } from '../../models/user-profile.service';
import { authenticateUser } from '../../middleware/auth.middleware';
import { ProfileTheme, ProfileSection } from '../../../../shared/types/public-profile';

interface ProfileUpdateRequest {
  personalInfo?: {
    title?: string;
    subtitle?: string;
    bio?: string;
    slug?: string;
  };
  contactInfo?: {
    email?: string;
    phone?: string;
    location?: string;
    website?: string;
  };
  socialLinks?: Record<string, string>;
  skills?: string[];
  achievements?: string[];
  settings?: {
    isPublic?: boolean;
    allowContact?: boolean;
    showAnalytics?: boolean;
    passwordProtected?: boolean;
    password?: string;
    allowDownloads?: boolean;
    showLastActive?: boolean;
    seoOptimized?: boolean;
    customDomain?: string;
  };
  customizations?: {
    theme?: ProfileTheme;
    sections?: ProfileSection[];
    customCSS?: string;
    logoUrl?: string;
  };
  testimonials?: Array<{
    id?: string;
    authorName: string;
    authorTitle?: string;
    authorCompany?: string;
    content: string;
    rating?: number;
  }>;
}

interface ProfileUpdateResponse {
  success: boolean;
  profileId?: string;
  slug?: string;
  profileUrl?: string;
  message?: string;
  updatedFields?: string[];
  validationErrors?: Array<{
    field: string;
    message: string;
  }>;
}

export const updatePublicProfile = onRequest(
  {
    timeoutSeconds: 120,
    memory: '1GiB',
    maxInstances: 100,
    cors: {
      origin: true,
      methods: ['PUT', 'PATCH', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
      credentials: true
    }
  },
  async (req: Request, res: Response) => {
    try {
      console.log('Profile update request received');

      // Handle preflight OPTIONS request
      if (req.method === 'OPTIONS') {
        res.set('Access-Control-Allow-Origin', '*');
        res.set('Access-Control-Allow-Methods', 'PUT, PATCH, OPTIONS');
        res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
        res.status(200).send('');
        return;
      }

      // Allow PUT and PATCH methods
      if (!['PUT', 'PATCH'].includes(req.method)) {
        res.status(405).json({
          success: false,
          message: 'Method not allowed. Use PUT or PATCH.'
        } as ProfileUpdateResponse);
        return;
      }

      // Validate Content-Type
      if (!req.headers['content-type']?.includes('application/json')) {
        res.status(400).json({
          success: false,
          message: 'Content-Type must be application/json'
        } as ProfileUpdateResponse);
        return;
      }

      // Authenticate user
      const authResult = await authenticateUser(req);
      if (!authResult.success || !authResult.userId) {
        res.status(401).json({
          success: false,
          message: 'Authentication required'
        } as ProfileUpdateResponse);
        return;
      }

      const userId = authResult.userId;

      // Extract profileId from URL path
      const urlParts = req.path.split('/');
      const profileId = urlParts[urlParts.length - 1];

      if (!profileId || profileId.length < 10) {
        res.status(400).json({
          success: false,
          message: 'Valid profile ID is required'
        } as ProfileUpdateResponse);
        return;
      }

      // Parse request body
      const requestData: ProfileUpdateRequest = req.body;

      console.log(`Updating profile ${profileId} for user ${userId}`);

      // Verify profile exists and belongs to user
      const existingProfile = await getPublicProfile(profileId);
      if (!existingProfile) {
        res.status(404).json({
          success: false,
          message: 'Profile not found'
        } as ProfileUpdateResponse);
        return;
      }

      if (existingProfile.userId !== userId) {
        res.status(403).json({
          success: false,
          message: 'Access denied. You can only update your own profiles.'
        } as ProfileUpdateResponse);
        return;
      }

      // Get user profile for subscription checking
      const userProfile = await getUserProfile(userId);
      const subscriptionLimits = getProfileLimits(userProfile.subscriptionTier);

      // Validate updates against subscription tier
      const validationResult = await validateUpdates(requestData, userProfile.subscriptionTier, subscriptionLimits);
      if (!validationResult.valid) {
        res.status(403).json({
          success: false,
          message: 'Validation failed',
          validationErrors: validationResult.errors
        } as ProfileUpdateResponse);
        return;
      }

      // Build update object
      const updates: any = {};
      const updatedFields: string[] = [];

      // Personal information updates
      if (requestData.personalInfo) {
        if (requestData.personalInfo.title !== undefined) {
          updates.title = requestData.personalInfo.title;
          updatedFields.push('title');
        }
        if (requestData.personalInfo.subtitle !== undefined) {
          updates.subtitle = requestData.personalInfo.subtitle;
          updatedFields.push('subtitle');
        }
        if (requestData.personalInfo.bio !== undefined) {
          updates.bio = requestData.personalInfo.bio;
          updatedFields.push('bio');
        }
        if (requestData.personalInfo.slug !== undefined) {
          updates.slug = requestData.personalInfo.slug;
          updatedFields.push('slug');
        }
      }

      // Contact information updates
      if (requestData.contactInfo) {
        updates.contactInfo = {
          ...existingProfile.contactInfo,
          ...requestData.contactInfo
        };
        updatedFields.push('contactInfo');
      }

      // Social links updates
      if (requestData.socialLinks) {
        updates.socialLinks = {
          ...existingProfile.socialLinks,
          ...requestData.socialLinks
        };
        updatedFields.push('socialLinks');
      }

      // Skills updates
      if (requestData.skills) {
        updates.skills = requestData.skills;
        updatedFields.push('skills');
      }

      // Achievements updates
      if (requestData.achievements) {
        updates.achievements = requestData.achievements;
        updatedFields.push('achievements');
      }

      // Settings updates
      if (requestData.settings) {
        updates.settings = {
          ...existingProfile.settings,
          ...requestData.settings
        };

        // Override settings based on subscription tier
        if (!subscriptionLimits.allowsAnalytics) {
          updates.settings.showAnalytics = false;
        }

        if (userProfile.subscriptionTier !== 'enterprise') {
          delete updates.settings.customDomain;
        }

        updatedFields.push('settings');
      }

      // Customization updates
      if (requestData.customizations) {
        if (requestData.customizations.theme) {
          updates.theme = requestData.customizations.theme;
          updatedFields.push('theme');
        }

        if (requestData.customizations.sections) {
          updates.sections = requestData.customizations.sections;
          updatedFields.push('sections');
        }

        if (requestData.customizations.customCSS) {
          if (['premium', 'enterprise'].includes(userProfile.subscriptionTier)) {
            updates.customCSS = requestData.customizations.customCSS;
            updatedFields.push('customCSS');
          }
        }
      }

      // Testimonials updates (replace entire array)
      if (requestData.testimonials) {
        const testimonials = requestData.testimonials.map(testimonial => ({
          id: testimonial.id || `testimonial_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          authorName: testimonial.authorName,
          authorTitle: testimonial.authorTitle,
          authorCompany: testimonial.authorCompany,
          content: testimonial.content,
          rating: testimonial.rating,
          createdAt: testimonial.id ? existingProfile.testimonials.find(t => t.id === testimonial.id)?.createdAt : new Date()
        }));

        updates.testimonials = testimonials;
        updatedFields.push('testimonials');
      }

      // Perform the update
      console.log(`Updating profile with fields: ${updatedFields.join(', ')}`);

      const updatedProfile = await profileManagerService.updateProfile({
        profileId,
        userId,
        updates
      });

      const profileUrl = updatedProfile.settings.customDomain
        ? `https://${updatedProfile.settings.customDomain}`
        : `https://cvplus.com/profile/${updatedProfile.slug}`;

      console.log(`Profile updated successfully: ${profileId}`);

      res.status(200).json({
        success: true,
        profileId: updatedProfile.id,
        slug: updatedProfile.slug,
        profileUrl,
        message: 'Profile updated successfully',
        updatedFields
      } as ProfileUpdateResponse);

    } catch (error) {
      console.error('Profile update error:', error);

      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Internal server error during profile update'
      } as ProfileUpdateResponse);
    }
  }
);

/**
 * Validate updates against subscription tier
 */
async function validateUpdates(
  updates: ProfileUpdateRequest,
  tier: string,
  limits: any
): Promise<{ valid: boolean; errors: Array<{ field: string; message: string }> }> {
  const errors: Array<{ field: string; message: string }> = [];

  // Validate theme
  if (updates.customizations?.theme) {
    if (!limits.availableThemes.includes(updates.customizations.theme)) {
      errors.push({
        field: 'theme',
        message: `Theme '${updates.customizations.theme}' is not available in your ${tier} plan`
      });
    }
  }

  // Validate sections count
  if (updates.customizations?.sections) {
    if (updates.customizations.sections.length > limits.maxSections) {
      errors.push({
        field: 'sections',
        message: `Section limit exceeded. Your ${tier} plan allows ${limits.maxSections} sections`
      });
    }
  }

  // Validate custom CSS
  if (updates.customizations?.customCSS && !['premium', 'enterprise'].includes(tier)) {
    errors.push({
      field: 'customCSS',
      message: 'Custom CSS is only available for Premium and Enterprise subscribers'
    });
  }

  // Validate custom domain
  if (updates.settings?.customDomain && tier !== 'enterprise') {
    errors.push({
      field: 'customDomain',
      message: 'Custom domains are only available for Enterprise subscribers'
    });
  }

  // Validate slug format
  if (updates.personalInfo?.slug) {
    const slugRegex = /^[a-z0-9-]+$/;
    if (!slugRegex.test(updates.personalInfo.slug)) {
      errors.push({
        field: 'slug',
        message: 'Slug can only contain lowercase letters, numbers, and hyphens'
      });
    }

    if (updates.personalInfo.slug.length < 3 || updates.personalInfo.slug.length > 50) {
      errors.push({
        field: 'slug',
        message: 'Slug must be between 3 and 50 characters'
      });
    }
  }

  // Validate email format
  if (updates.contactInfo?.email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(updates.contactInfo.email)) {
      errors.push({
        field: 'email',
        message: 'Invalid email format'
      });
    }
  }

  // Validate social links
  if (updates.socialLinks) {
    Object.entries(updates.socialLinks).forEach(([platform, url]) => {
      try {
        new URL(url);
      } catch {
        errors.push({
          field: `socialLinks.${platform}`,
          message: `Invalid URL for ${platform}`
        });
      }
    });
  }

  // Validate testimonials
  if (updates.testimonials) {
    updates.testimonials.forEach((testimonial, index) => {
      if (!testimonial.authorName || testimonial.authorName.trim().length === 0) {
        errors.push({
          field: `testimonials[${index}].authorName`,
          message: 'Author name is required'
        });
      }

      if (!testimonial.content || testimonial.content.trim().length === 0) {
        errors.push({
          field: `testimonials[${index}].content`,
          message: 'Testimonial content is required'
        });
      }

      if (testimonial.rating && (testimonial.rating < 1 || testimonial.rating > 5)) {
        errors.push({
          field: `testimonials[${index}].rating`,
          message: 'Rating must be between 1 and 5'
        });
      }
    });
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Get profile limits based on subscription tier
 */
function getProfileLimits(tier: string) {
  const limits = {
    free: {
      allowsPublicProfiles: false,
      maxProfiles: 0,
      maxSections: 0,
      allowsAnalytics: false,
      allowsCustomThemes: false,
      availableThemes: []
    },
    basic: {
      allowsPublicProfiles: true,
      maxProfiles: 1,
      maxSections: 4,
      allowsAnalytics: false,
      allowsCustomThemes: false,
      availableThemes: [ProfileTheme.PROFESSIONAL]
    },
    premium: {
      allowsPublicProfiles: true,
      maxProfiles: 5,
      maxSections: 8,
      allowsAnalytics: true,
      allowsCustomThemes: true,
      availableThemes: [ProfileTheme.PROFESSIONAL, ProfileTheme.MODERN, ProfileTheme.CREATIVE]
    },
    enterprise: {
      allowsPublicProfiles: true,
      maxProfiles: 999,
      maxSections: 999,
      allowsAnalytics: true,
      allowsCustomThemes: true,
      availableThemes: [ProfileTheme.PROFESSIONAL, ProfileTheme.MODERN, ProfileTheme.CREATIVE, ProfileTheme.MINIMAL]
    }
  };

  return limits[tier as keyof typeof limits] || limits.free;
}