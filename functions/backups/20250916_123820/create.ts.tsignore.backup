// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflictsimport { onRequest } from 'firebase-functions/v2/https';
import { Request, Response } from 'firebase-functions';
import { profileManagerService } from '../../services/profile-manager.service';
import { getProcessedCV } from '../../models/processed-cv.service';
import { getUserProfile } from '../../models/user-profile.service';
import { authenticateUser } from '../../middleware/auth.middleware';
import { ProfileTheme, ProfileSection } from '../../../../shared/types/public-profile';

interface PublicProfileCreateRequest {
  cvId: string;
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
  personalInfo?: {
    title?: string;
    subtitle?: string;
    bio?: string;
    customSlug?: string;
  };
}

interface PublicProfileCreateResponse {
  success: boolean;
  profileId?: string;
  slug?: string;
  profileUrl?: string;
  message?: string;
  preview?: {
    title: string;
    subtitle: string;
    theme: ProfileTheme;
    sectionsCount: number;
  };
}

export const createPublicProfile = onRequest(
  {
    timeoutSeconds: 120,
    memory: '1GiB',
    maxInstances: 50,
    cors: {
      origin: true,
      methods: ['POST', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
      credentials: true
    }
  },
  async (req: Request, res: Response) => {
    try {
      console.log('Public profile creation request received');

      // Handle preflight OPTIONS request
      if (req.method === 'OPTIONS') {
        res.set('Access-Control-Allow-Origin', '*');
        res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
        res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
        res.status(200).send('');
        return;
      }

      // Only allow POST method
      if (req.method !== 'POST') {
        res.status(405).json({
          success: false,
          message: 'Method not allowed. Use POST.'
        } as PublicProfileCreateResponse);
        return;
      }

      // Validate Content-Type
      if (!req.headers['content-type']?.includes('application/json')) {
        res.status(400).json({
          success: false,
          message: 'Content-Type must be application/json'
        } as PublicProfileCreateResponse);
        return;
      }

      // Authenticate user
      const authResult = await authenticateUser(req);
      if (!authResult.success || !authResult.userId) {
        res.status(401).json({
          success: false,
          message: 'Authentication required'
        } as PublicProfileCreateResponse);
        return;
      }

      const userId = authResult.userId;

      // Parse request body
      const requestData: PublicProfileCreateRequest = req.body;

      if (!requestData.cvId) {
        res.status(400).json({
          success: false,
          message: 'CV ID is required'
        } as PublicProfileCreateResponse);
        return;
      }

      console.log(`Creating public profile for CV: ${requestData.cvId}, user: ${userId}`);

      // Verify CV exists and belongs to user
      const processedCV = await getProcessedCV(requestData.cvId);
      if (!processedCV) {
        res.status(404).json({
          success: false,
          message: 'CV not found'
        } as PublicProfileCreateResponse);
        return;
      }

      if (processedCV.userId !== userId) {
        res.status(403).json({
          success: false,
          message: 'Access denied. You can only create profiles for your own CVs.'
        } as PublicProfileCreateResponse);
        return;
      }

      // Get user profile for subscription checking
      const userProfile = await getUserProfile(userId);

      // Check subscription limits
      const subscriptionLimits = getProfileLimits(userProfile.subscriptionTier);

      if (!subscriptionLimits.allowsPublicProfiles) {
        res.status(403).json({
          success: false,
          message: 'Public profiles are not available in your subscription tier. Please upgrade to access this feature.'
        } as PublicProfileCreateResponse);
        return;
      }

      // Validate custom domain if provided (enterprise only)
      if (requestData.customizations?.customDomain && userProfile.subscriptionTier !== 'enterprise') {
        res.status(403).json({
          success: false,
          message: 'Custom domains are only available for Enterprise subscribers.'
        } as PublicProfileCreateResponse);
        return;
      }

      // Validate theme selection
      if (requestData.customizations?.theme && !isThemeAllowed(requestData.customizations.theme, userProfile.subscriptionTier)) {
        res.status(403).json({
          success: false,
          message: `Theme '${requestData.customizations.theme}' is not available in your ${userProfile.subscriptionTier} plan.`
        } as PublicProfileCreateResponse);
        return;
      }

      // Validate sections count
      const requestedSections = requestData.customizations?.sections || getDefaultSections();
      if (requestedSections.length > subscriptionLimits.maxSections) {
        res.status(403).json({
          success: false,
          message: `Section limit exceeded. Your ${userProfile.subscriptionTier} plan allows ${subscriptionLimits.maxSections} sections.`
        } as PublicProfileCreateResponse);
        return;
      }

      // Validate custom CSS (premium+ only)
      if (requestData.customizations?.customCSS && !['premium', 'enterprise'].includes(userProfile.subscriptionTier)) {
        res.status(403).json({
          success: false,
          message: 'Custom CSS is only available for Premium and Enterprise subscribers.'
        } as PublicProfileCreateResponse);
        return;
      }

      // Prepare profile creation options
      const profileOptions = {
        userId,
        cvId: requestData.cvId,
        settings: {
          ...requestData.settings,
          // Override settings based on subscription tier
          showAnalytics: requestData.settings?.showAnalytics && subscriptionLimits.allowsAnalytics,
          customDomain: requestData.settings?.customDomain && userProfile.subscriptionTier === 'enterprise'
            ? requestData.settings.customDomain
            : undefined
        },
        customizations: {
          theme: requestData.customizations?.theme || ProfileTheme.PROFESSIONAL,
          sections: requestedSections,
          customCSS: requestData.customizations?.customCSS && ['premium', 'enterprise'].includes(userProfile.subscriptionTier)
            ? requestData.customizations.customCSS
            : undefined
        }
      };

      // Create the public profile
      console.log('Creating public profile...');
      const createdProfile = await profileManagerService.createProfile(profileOptions);

      // Update profile with custom info if provided
      if (requestData.personalInfo?.title ||
          requestData.personalInfo?.subtitle ||
          requestData.personalInfo?.bio ||
          requestData.personalInfo?.customSlug) {

        const updates: any = {};

        if (requestData.personalInfo.title) updates.title = requestData.personalInfo.title;
        if (requestData.personalInfo.subtitle) updates.subtitle = requestData.personalInfo.subtitle;
        if (requestData.personalInfo.bio) updates.bio = requestData.personalInfo.bio;
        if (requestData.personalInfo.customSlug) updates.slug = requestData.personalInfo.customSlug;

        const updatedProfile = await profileManagerService.updateProfile({
          profileId: createdProfile.id,
          userId,
          updates
        });

        // Use updated profile for response
        Object.assign(createdProfile, updatedProfile);
      }

      const profileUrl = createdProfile.settings.customDomain
        ? `https://${createdProfile.settings.customDomain}`
        : `https://cvplus.com/profile/${createdProfile.slug}`;

      console.log(`Public profile created successfully: ${createdProfile.id}`);

      res.status(201).json({
        success: true,
        profileId: createdProfile.id,
        slug: createdProfile.slug,
        profileUrl,
        message: 'Public profile created successfully',
        preview: {
          title: createdProfile.title,
          subtitle: createdProfile.subtitle,
          theme: createdProfile.theme,
          sectionsCount: createdProfile.sections.length
        }
      } as PublicProfileCreateResponse);

    } catch (error) {
      console.error('Public profile creation error:', error);

      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Internal server error during profile creation'
      } as PublicProfileCreateResponse);
    }
  }
);

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

/**
 * Check if theme is allowed for subscription tier
 */
function isThemeAllowed(theme: ProfileTheme, tier: string): boolean {
  const limits = getProfileLimits(tier);
  return limits.availableThemes.includes(theme);
}

/**
 * Get default profile sections
 */
function getDefaultSections(): ProfileSection[] {
  return [
    ProfileSection.ABOUT,
    ProfileSection.EXPERIENCE,
    ProfileSection.SKILLS,
    ProfileSection.EDUCATION
  ];
}

/**
 * Get available themes for subscription tier
 */
export function getAvailableThemes(tier: string): Array<{ id: ProfileTheme; name: string; description: string; preview?: string }> {
  const themeDatabase = {
    [ProfileTheme.PROFESSIONAL]: {
      name: 'Professional',
      description: 'Clean, corporate design perfect for business professionals',
      preview: '/themes/professional-preview.jpg'
    },
    [ProfileTheme.MODERN]: {
      name: 'Modern',
      description: 'Contemporary design with sleek animations and modern typography',
      preview: '/themes/modern-preview.jpg'
    },
    [ProfileTheme.CREATIVE]: {
      name: 'Creative',
      description: 'Vibrant, artistic design ideal for creative professionals',
      preview: '/themes/creative-preview.jpg'
    },
    [ProfileTheme.MINIMAL]: {
      name: 'Minimal',
      description: 'Clean, simple design focusing on content over decoration',
      preview: '/themes/minimal-preview.jpg'
    }
  };

  const limits = getProfileLimits(tier);

  return limits.availableThemes.map(theme => ({
    id: theme,
    name: themeDatabase[theme].name,
    description: themeDatabase[theme].description,
    preview: themeDatabase[theme].preview
  }));
}

/**
 * Get available sections for profiles
 */
export function getAvailableSections(): Array<{ id: ProfileSection; name: string; description: string; required: boolean }> {
  return [
    {
      id: ProfileSection.ABOUT,
      name: 'About',
      description: 'Personal bio and professional summary',
      required: true
    },
    {
      id: ProfileSection.EXPERIENCE,
      name: 'Experience',
      description: 'Work history and professional roles',
      required: true
    },
    {
      id: ProfileSection.SKILLS,
      name: 'Skills',
      description: 'Technical and soft skills showcase',
      required: false
    },
    {
      id: ProfileSection.EDUCATION,
      name: 'Education',
      description: 'Educational background and qualifications',
      required: false
    },
    {
      id: ProfileSection.PORTFOLIO,
      name: 'Portfolio',
      description: 'Showcase of work samples and projects',
      required: false
    },
    {
      id: ProfileSection.TESTIMONIALS,
      name: 'Testimonials',
      description: 'Recommendations and endorsements',
      required: false
    },
    {
      id: ProfileSection.CONTACT,
      name: 'Contact',
      description: 'Contact form and information',
      required: false
    }
  ];
}