import {
  PublicProfile,
  PublicProfileSettings,
  ContactInfo,
  SocialLinks,
  ProfileTheme,
  ProfileSection,
  PortfolioItem,
  Testimonial,
  ProfileAnalytics
} from '../../../shared/types/public-profile';
import { ProcessedCV } from '../../../shared/types/processed-cv';
import { GeneratedContent } from '../../../shared/types/generated-content';
import {
  createPublicProfile,
  updatePublicProfile,
  getPublicProfileBySlug,
  getPublicProfile,
  deletePublicProfile,
  ensureUniqueSlug,
  recordProfileView,
  searchPublicProfiles
} from '../models/public-profile.service';
import { getProcessedCV } from '../models/processed-cv.service';
import { getUserProfile } from '../models/user-profile.service';
import { getGeneratedContentByCV } from '../models/generated-content.service';
import { trackEvent } from '../models/analytics.service';
import * as admin from 'firebase-admin';
import { QRCodeService } from '../utils/qr-code.service';
import { SEOService } from '../utils/seo.service';

interface ProfileCreationOptions {
  userId: string;
  cvId: string;
  settings?: Partial<PublicProfileSettings>;
  customizations?: {
    theme?: ProfileTheme;
    sections?: ProfileSection[];
    customCSS?: string;
    customDomain?: string;
  };
}

interface ProfileUpdateOptions {
  profileId: string;
  userId: string;
  updates: Partial<PublicProfile>;
}

interface ProfileViewContext {
  visitorId?: string;
  userAgent?: string;
  ipAddress?: string;
  referrer?: string;
  utm?: {
    source?: string;
    medium?: string;
    campaign?: string;
    term?: string;
    content?: string;
  };
}

interface ProfileSearchOptions {
  query?: string;
  skills?: string[];
  location?: string;
  industry?: string;
  availableForWork?: boolean;
  limit?: number;
  sortBy?: 'relevance' | 'views' | 'recent' | 'alphabetical';
  theme?: ProfileTheme;
}

interface ProfileExportOptions {
  format: 'pdf' | 'json' | 'html';
  includeAnalytics?: boolean;
  includePrivateData?: boolean;
  customStyling?: string;
}

export class ProfileManagerService {
  private qrCodeService: QRCodeService;
  private seoService: SEOService;

  constructor() {
    this.qrCodeService = new QRCodeService();
    this.seoService = new SEOService();
  }

  /**
   * Create a new public profile from CV data
   */
  async createProfile(options: ProfileCreationOptions): Promise<PublicProfile> {
    console.log(`Creating public profile for user ${options.userId}, CV ${options.cvId}`);

    // Get CV data
    const cvData = await getProcessedCV(options.cvId);
    if (!cvData) {
      throw new Error('CV data not found');
    }

    // Get user profile for subscription check
    const userProfile = await getUserProfile(options.userId);

    // Generate initial slug from name
    const initialSlug = this.generateSlugFromName(cvData.structuredData.personalInfo.fullName);
    const uniqueSlug = await ensureUniqueSlug(initialSlug);

    // Get generated content for this CV
    const generatedContent = await getGeneratedContentByCV(options.cvId);

    // Build profile data from CV
    const profileData: Omit<PublicProfile, 'id' | 'createdAt' | 'updatedAt'> = {
      userId: options.userId,
      cvId: options.cvId,
      slug: uniqueSlug,
      isActive: true,

      // Basic information
      title: cvData.structuredData.personalInfo.fullName,
      subtitle: cvData.structuredData.summary || '',
      bio: this.generateBioFromCV(cvData),

      // Contact information
      contactInfo: this.extractContactInfo(cvData),

      // Social links (empty initially, user can add later)
      socialLinks: {},

      // Professional data
      skills: cvData.structuredData.skills.technical.concat(cvData.structuredData.skills.soft),
      experience: cvData.structuredData.experience.map(exp => ({
        title: exp.title,
        company: exp.company,
        duration: `${exp.startDate} - ${exp.endDate || 'Present'}`,
        description: exp.description
      })),
      education: cvData.structuredData.education,
      achievements: cvData.structuredData.achievements || [],

      // Portfolio items from generated content
      portfolio: this.buildPortfolioFromContent(generatedContent),

      // Empty testimonials initially
      testimonials: [],

      // Settings
      settings: {
        isPublic: true,
        allowContact: true,
        showAnalytics: userProfile.subscriptionTier === 'premium' || userProfile.subscriptionTier === 'enterprise',
        passwordProtected: false,
        allowDownloads: true,
        showLastActive: true,
        seoOptimized: true,
        customDomain: options.customizations?.customDomain,
        ...options.settings
      },

      // Theme and styling
      theme: options.customizations?.theme || ProfileTheme.PROFESSIONAL,
      sections: options.customizations?.sections || [
        ProfileSection.ABOUT,
        ProfileSection.EXPERIENCE,
        ProfileSection.SKILLS,
        ProfileSection.EDUCATION
      ],
      customCSS: options.customizations?.customCSS,

      // Analytics
      analytics: {
        totalViews: 0,
        uniqueViews: 0,
        contactClicks: 0,
        portfolioViews: 0,
        lastViewedAt: null,
        topReferrers: [],
        viewsByCountry: [],
        viewsByDevice: []
      },

      // SEO
      seoData: await this.seoService.generateSEOData(cvData, uniqueSlug),

      // QR Code
      qrCodeUrl: await this.qrCodeService.generateQRCode(`https://cvplus.com/profile/${uniqueSlug}`)
    };

    // Create the profile
    const profile = await createPublicProfile(profileData);

    // Track profile creation event
    await trackEvent({
      userId: options.userId,
      entityType: 'public_profile',
      entityId: profile.id,
      eventType: 'profile_created',
      eventData: {
        cvId: options.cvId,
        theme: profile.theme,
        sectionsCount: profile.sections.length
      }
    });

    console.log(`Public profile created successfully: ${profile.id}`);
    return profile;
  }

  /**
   * Update an existing public profile
   */
  async updateProfile(options: ProfileUpdateOptions): Promise<PublicProfile> {
    console.log(`Updating public profile ${options.profileId}`);

    // Verify ownership
    const existingProfile = await getPublicProfile(options.profileId);
    if (!existingProfile || existingProfile.userId !== options.userId) {
      throw new Error('Profile not found or access denied');
    }

    // If slug is being updated, ensure uniqueness
    if (options.updates.slug && options.updates.slug !== existingProfile.slug) {
      options.updates.slug = await ensureUniqueSlug(options.updates.slug);

      // Update QR code with new slug
      options.updates.qrCodeUrl = await this.qrCodeService.generateQRCode(
        `https://cvplus.com/profile/${options.updates.slug}`
      );
    }

    // Update SEO data if content changed
    if (options.updates.title || options.updates.subtitle || options.updates.bio || options.updates.skills) {
      const cvData = await getProcessedCV(existingProfile.cvId);
      if (cvData) {
        options.updates.seoData = await this.seoService.generateSEOData(cvData, options.updates.slug || existingProfile.slug);
      }
    }

    // Update the profile
    const updatedProfile = await updatePublicProfile(options.profileId, options.updates);

    // Track update event
    await trackEvent({
      userId: options.userId,
      entityType: 'public_profile',
      entityId: options.profileId,
      eventType: 'profile_updated',
      eventData: {
        updatedFields: Object.keys(options.updates)
      }
    });

    console.log(`Public profile updated successfully: ${options.profileId}`);
    return updatedProfile;
  }

  /**
   * View a public profile with analytics tracking
   */
  async viewProfile(slug: string, context: ProfileViewContext = {}): Promise<PublicProfile> {
    console.log(`Profile view for slug: ${slug}`);

    // Get profile by slug
    const profile = await getPublicProfileBySlug(slug);
    if (!profile || !profile.isActive) {
      throw new Error('Profile not found or inactive');
    }

    // Check password protection
    if (profile.settings.passwordProtected && !context.visitorId) {
      throw new Error('Password required');
    }

    // Record the view with analytics
    const updatedProfile = await recordProfileView(profile.id, {
      visitorId: context.visitorId,
      userAgent: context.userAgent,
      ipAddress: context.ipAddress,
      referrer: context.referrer,
      timestamp: admin.firestore.Timestamp.now()
    });

    // Track view event
    await trackEvent({
      entityType: 'public_profile',
      entityId: profile.id,
      eventType: 'profile_viewed',
      eventData: {
        slug,
        referrer: context.referrer,
        utm: context.utm
      }
    });

    console.log(`Profile view recorded for: ${slug}`);
    return updatedProfile;
  }

  /**
   * Search public profiles
   */
  async searchProfiles(options: ProfileSearchOptions = {}): Promise<{
    profiles: PublicProfile[];
    totalCount: number;
    hasMore: boolean;
  }> {
    console.log('Searching public profiles with options:', options);

    const searchResult = await searchPublicProfiles({
      isActive: true,
      ...options
    });

    return {
      profiles: searchResult.profiles,
      totalCount: searchResult.totalCount,
      hasMore: searchResult.hasMore
    };
  }

  /**
   * Delete a public profile
   */
  async deleteProfile(profileId: string, userId: string): Promise<void> {
    console.log(`Deleting public profile ${profileId}`);

    // Verify ownership
    const profile = await getPublicProfile(profileId);
    if (!profile || profile.userId !== userId) {
      throw new Error('Profile not found or access denied');
    }

    // Delete the profile
    await deletePublicProfile(profileId);

    // Track deletion event
    await trackEvent({
      userId: userId,
      entityType: 'public_profile',
      entityId: profileId,
      eventType: 'profile_deleted',
      eventData: {
        slug: profile.slug,
        totalViews: profile.analytics.totalViews
      }
    });

    console.log(`Public profile deleted successfully: ${profileId}`);
  }

  /**
   * Export profile data
   */
  async exportProfile(
    profileId: string,
    userId: string,
    options: ProfileExportOptions
  ): Promise<{ content: string | Buffer; filename: string; contentType: string }> {
    console.log(`Exporting profile ${profileId} as ${options.format}`);

    // Verify ownership
    const profile = await getPublicProfile(profileId);
    if (!profile || profile.userId !== userId) {
      throw new Error('Profile not found or access denied');
    }

    switch (options.format) {
      case 'json':
        return this.exportAsJSON(profile, options);
      case 'html':
        return this.exportAsHTML(profile, options);
      case 'pdf':
        return this.exportAsPDF(profile, options);
      default:
        throw new Error('Unsupported export format');
    }
  }

  /**
   * Add testimonial to profile
   */
  async addTestimonial(
    profileId: string,
    userId: string,
    testimonial: Omit<Testimonial, 'id' | 'createdAt'>
  ): Promise<PublicProfile> {
    console.log(`Adding testimonial to profile ${profileId}`);

    const profile = await getPublicProfile(profileId);
    if (!profile || profile.userId !== userId) {
      throw new Error('Profile not found or access denied');
    }

    const newTestimonial: Testimonial = {
      id: `testimonial_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      ...testimonial,
      createdAt: admin.firestore.Timestamp.now()
    };

    const updatedProfile = await updatePublicProfile(profileId, {
      testimonials: [...profile.testimonials, newTestimonial]
    });

    // Track testimonial addition
    await trackEvent({
      userId: userId,
      entityType: 'public_profile',
      entityId: profileId,
      eventType: 'testimonial_added',
      eventData: {
        testimonialId: newTestimonial.id,
        authorName: testimonial.authorName
      }
    });

    return updatedProfile;
  }

  /**
   * Get profile analytics
   */
  async getProfileAnalytics(profileId: string, userId: string): Promise<ProfileAnalytics> {
    console.log(`Getting analytics for profile ${profileId}`);

    const profile = await getPublicProfile(profileId);
    if (!profile || profile.userId !== userId) {
      throw new Error('Profile not found or access denied');
    }

    return profile.analytics;
  }

  // Private helper methods

  private generateSlugFromName(fullName: string): string {
    return fullName
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .trim()
      .replace(/\s+/g, '-');
  }

  private generateBioFromCV(cvData: ProcessedCV): string {
    const summary = cvData.structuredData.summary;
    const personalityInsights = cvData.aiAnalysis?.personalityProfile?.summary;

    if (summary && summary.length > 50) {
      return summary;
    }

    if (personalityInsights) {
      return personalityInsights;
    }

    return `Experienced professional with expertise in ${cvData.structuredData.skills.technical.slice(0, 3).join(', ')}.`;
  }

  private extractContactInfo(cvData: ProcessedCV): ContactInfo {
    const personalInfo = cvData.structuredData.personalInfo;

    return {
      email: personalInfo.email,
      phone: personalInfo.phone,
      location: personalInfo.location,
      website: personalInfo.linkedin // Use LinkedIn as website for now
    };
  }

  private buildPortfolioFromContent(generatedContent: GeneratedContent[]): PortfolioItem[] {
    return generatedContent
      .filter(content => content.fileUrl)
      .map(content => ({
        id: content.id,
        title: this.getContentTitle(content.contentType),
        description: `Generated ${content.contentType.replace('_', ' ').toLowerCase()}`,
        mediaType: this.getMediaType(content.contentType),
        mediaUrl: content.fileUrl!,
        thumbnailUrl: content.thumbnailUrl,
        createdAt: content.createdAt,
        metadata: {
          duration: content.duration,
          fileSize: content.fileSize,
          contentType: content.contentType
        }
      }));
  }

  private getContentTitle(contentType: string): string {
    switch (contentType) {
      case 'PODCAST': return 'Professional Podcast';
      case 'VIDEO_INTRO': return 'Video Introduction';
      case 'PORTFOLIO_PDF': return 'Portfolio Document';
      case 'COVER_LETTER': return 'Cover Letter';
      default: return 'Generated Content';
    }
  }

  private getMediaType(contentType: string): 'image' | 'video' | 'audio' | 'document' {
    switch (contentType) {
      case 'PODCAST': return 'audio';
      case 'VIDEO_INTRO': return 'video';
      case 'PORTFOLIO_PDF':
      case 'COVER_LETTER': return 'document';
      default: return 'document';
    }
  }

  private async exportAsJSON(profile: PublicProfile, options: ProfileExportOptions): Promise<{
    content: string;
    filename: string;
    contentType: string;
  }> {
    const exportData = {
      ...profile,
      exportedAt: new Date().toISOString(),
      analytics: options.includeAnalytics ? profile.analytics : undefined
    };

    if (!options.includePrivateData) {
      delete exportData.contactInfo?.email;
      delete exportData.contactInfo?.phone;
    }

    return {
      content: JSON.stringify(exportData, null, 2),
      filename: `profile-${profile.slug}-${new Date().toISOString().split('T')[0]}.json`,
      contentType: 'application/json'
    };
  }

  private async exportAsHTML(profile: PublicProfile, options: ProfileExportOptions): Promise<{
    content: string;
    filename: string;
    contentType: string;
  }> {
    const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${profile.title} - Professional Profile</title>
    <style>
        ${options.customStyling || this.getDefaultCSS(profile.theme)}
    </style>
</head>
<body>
    <header>
        <h1>${profile.title}</h1>
        <h2>${profile.subtitle}</h2>
    </header>

    <main>
        <section class="bio">
            <h3>About</h3>
            <p>${profile.bio}</p>
        </section>

        <section class="experience">
            <h3>Experience</h3>
            ${profile.experience.map(exp => `
                <div class="experience-item">
                    <h4>${exp.title} at ${exp.company}</h4>
                    <p class="duration">${exp.duration}</p>
                    <p>${exp.description}</p>
                </div>
            `).join('')}
        </section>

        <section class="skills">
            <h3>Skills</h3>
            <ul>
                ${profile.skills.map(skill => `<li>${skill}</li>`).join('')}
            </ul>
        </section>
    </main>
</body>
</html>
    `;

    return {
      content: htmlContent.trim(),
      filename: `profile-${profile.slug}-${new Date().toISOString().split('T')[0]}.html`,
      contentType: 'text/html'
    };
  }

  private async exportAsPDF(profile: PublicProfile, options: ProfileExportOptions): Promise<{
    content: Buffer;
    filename: string;
    contentType: string;
  }> {
    // In production, use Puppeteer or similar to generate PDF from HTML
    // For now, return a placeholder
    const pdfContent = Buffer.from('PDF export placeholder');

    return {
      content: pdfContent,
      filename: `profile-${profile.slug}-${new Date().toISOString().split('T')[0]}.pdf`,
      contentType: 'application/pdf'
    };
  }

  private getDefaultCSS(theme: ProfileTheme): string {
    const themes = {
      [ProfileTheme.PROFESSIONAL]: `
        body { font-family: 'Segoe UI', sans-serif; color: #2c3e50; }
        header { background: #34495e; color: white; padding: 2rem; }
        main { padding: 2rem; max-width: 800px; margin: 0 auto; }
      `,
      [ProfileTheme.CREATIVE]: `
        body { font-family: 'Arial', sans-serif; color: #e74c3c; }
        header { background: linear-gradient(45deg, #e74c3c, #f39c12); color: white; padding: 2rem; }
        main { padding: 2rem; max-width: 800px; margin: 0 auto; }
      `,
      [ProfileTheme.MINIMAL]: `
        body { font-family: 'Helvetica', sans-serif; color: #333; }
        header { border-bottom: 1px solid #ddd; padding: 2rem; }
        main { padding: 2rem; max-width: 600px; margin: 0 auto; }
      `,
      [ProfileTheme.MODERN]: `
        body { font-family: 'SF Pro Display', sans-serif; color: #1a1a1a; }
        header { background: #007AFF; color: white; padding: 2rem; border-radius: 10px; }
        main { padding: 2rem; max-width: 900px; margin: 0 auto; }
      `
    };

    return themes[theme] || themes[ProfileTheme.PROFESSIONAL];
  }
}

// Utility services (simplified for now)
class QRCodeService {
  async generateQRCode(url: string): Promise<string> {
    // In production, use qrcode library
    return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(url)}`;
  }
}

class SEOService {
  async generateSEOData(cvData: ProcessedCV, slug: string): Promise<any> {
    const personalInfo = cvData.structuredData.personalInfo;

    return {
      title: `${personalInfo.fullName} - Professional Profile`,
      description: cvData.structuredData.summary || `Professional profile of ${personalInfo.fullName}`,
      keywords: cvData.structuredData.skills.technical.concat(cvData.structuredData.skills.soft).slice(0, 10),
      canonicalUrl: `https://cvplus.com/profile/${slug}`,
      ogImage: `https://cvplus.com/api/og-image/${slug}`,
      structuredData: {
        '@type': 'Person',
        'name': personalInfo.fullName,
        'jobTitle': cvData.structuredData.experience[0]?.title,
        'description': cvData.structuredData.summary
      }
    };
  }
}

// Export singleton instance
export const profileManagerService = new ProfileManagerService();

// Export individual functions for direct use
export async function createPublicProfileFromCV(options: ProfileCreationOptions): Promise<PublicProfile> {
  return profileManagerService.createProfile(options);
}

export async function updatePublicProfileData(options: ProfileUpdateOptions): Promise<PublicProfile> {
  return profileManagerService.updateProfile(options);
}

export async function viewPublicProfile(slug: string, context: ProfileViewContext = {}): Promise<PublicProfile> {
  return profileManagerService.viewProfile(slug, context);
}

export async function searchPublicProfilesData(options: ProfileSearchOptions = {}): Promise<{
  profiles: PublicProfile[];
  totalCount: number;
  hasMore: boolean;
}> {
  return profileManagerService.searchProfiles(options);
}