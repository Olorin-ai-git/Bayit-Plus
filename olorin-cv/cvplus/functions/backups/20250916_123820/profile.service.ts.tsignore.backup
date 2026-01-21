// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflictsimport { 
  PublicProfileData, 
  ProfileCreationOptions, 
  ProfileUpdateOptions,
  PublicProfileResult,
  ProfileUpdateResult,
  ProfileURLs,
  SEOReport
} from '../types/profile.types';
import { PROFILE_CONSTANTS } from '../constants/profile.constants';
import { SEOService } from './seo.service';
import { AnalyticsService } from './analytics.service';
import { NetworkingService } from './networking.service';
import { TemplateService } from './template.service';
import { ValidationService } from './validation.service';
import { StorageService } from './storage.service';

export class ProfileService {
  private seoService: SEOService;
  private analyticsService: AnalyticsService;
  private networkingService: NetworkingService;
  private templateService: TemplateService;
  private validationService: ValidationService;
  private storageService: StorageService;

  constructor() {
    this.seoService = new SEOService();
    this.analyticsService = new AnalyticsService();
    this.networkingService = new NetworkingService();
    this.templateService = new TemplateService();
    this.validationService = new ValidationService();
    this.storageService = new StorageService();
  }

  async createPublicProfile(
    userId: string,
    profileData: Partial<PublicProfileData>,
    options: ProfileCreationOptions = {}
  ): Promise<PublicProfileResult> {
    try {
      // Validate profile data
      const validation = await this.validationService.validateProfileData(profileData);
      if (!validation.valid) {
        return { 
          success: false, 
          errors: validation.errors 
        };
      }

      // Generate unique profile slug
      const slug = await this.generateUniqueSlug(
        profileData.name || 'profile', 
        profileData.title
      );

      // Create base profile structure
      const profile: PublicProfileData = {
        id: this.generateProfileId(userId, slug),
        userId,
        slug,
        isPublic: options.publishImmediately ?? false,
        name: profileData.name || '',
        title: profileData.title || '',
        headline: profileData.headline,
        profileImage: profileData.profileImage,
        backgroundImage: profileData.backgroundImage,
        location: profileData.location,
        email: profileData.email,
        phone: profileData.phone,
        website: profileData.website,
        socialLinks: profileData.socialLinks || {},
        summary: profileData.summary || '',
        skills: profileData.skills || [],
        experience: profileData.experience || [],
        education: profileData.education || [],
        certifications: profileData.certifications || [],
        portfolio: profileData.portfolio || [],
        testimonials: profileData.testimonials || [],
        contactInfo: this.getDefaultContactInfo(),
        seoSettings: await this.getDefaultSEOSettings(profileData),
        privacySettings: this.getDefaultPrivacySettings(),
        brandingSettings: await this.getDefaultBrandingSettings(options.template),
        metadata: await this.generateProfileMetadata(profileData, options),
        analytics: this.getDefaultAnalytics(),
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // Apply template if specified
      if (options.template) {
        profile.brandingSettings = await this.templateService.applyTemplate(
          profile.brandingSettings,
          options.template,
          options.customizations
        );
      }

      // Set up SEO optimization
      if (options.seoOptimization) {
        const seoResult = await this.seoService.optimizeProfile(profile, {
          targetKeywords: options.targetKeywords,
          industryFocus: options.industryFocus,
          locationTargeting: options.locationTargeting
        });
        
        profile.seoSettings = seoResult.optimizedSettings;
      }

      // Set up analytics tracking
      if (options.analyticsEnabled) {
        await this.analyticsService.setupProfileTracking(
          profile.id,
          profile.slug
        );
      }

      // Set up networking features
      if (options.socialIntegration) {
        await this.networkingService.enableNetworking(
          profile.id,
          this.getDefaultNetworkingOptions()
        );
      }

      // Save profile to storage
      await this.storageService.saveProfile(profile);

      // Generate profile URLs
      const urls = await this.generateProfileURLs(profile);

      // Generate SEO report if requested
      let seoReport: SEOReport | undefined;
      if (options.seoOptimization) {
        seoReport = await this.seoService.generateSEOReport(profile.id);
      }

      return {
        success: true,
        profile,
        urls,
        seoReport
      };

    } catch (error) {
      return {
        success: false,
        errors: [`Profile creation failed: ${error instanceof Error ? error.message : 'Unknown error'}`]
      };
    }
  }

  async updatePublicProfile(
    profileId: string,
    updates: Partial<PublicProfileData>,
    options: ProfileUpdateOptions = {}
  ): Promise<ProfileUpdateResult> {
    try {
      // Get existing profile
      const existingProfile = await this.storageService.getProfile(profileId);
      if (!existingProfile) {
        return { 
          success: false, 
          errors: ['Profile not found'] 
        };
      }

      // Validate updates
      const validation = await this.validationService.validateProfileUpdates(updates);
      if (!validation.valid) {
        return { 
          success: false, 
          errors: validation.errors 
        };
      }

      // Track changes
      const changes = this.identifyChanges(existingProfile, updates);

      // Apply updates
      const updatedProfile: PublicProfileData = {
        ...existingProfile,
        ...updates,
        updatedAt: new Date()
      };

      // Update SEO if content changed
      if (this.hasContentChanged(changes) && options.seoOptions) {
        const seoResult = await this.seoService.updateProfileSEO(
          updatedProfile, 
          options.seoOptions
        );
        updatedProfile.seoSettings = seoResult.optimizedSettings;
      }

      // Update analytics configuration
      if (options.analyticsUpdate) {
        await this.analyticsService.updateProfileConfiguration(
          profileId, 
          updatedProfile
        );
      }

      // Save updated profile
      await this.storageService.saveProfile(updatedProfile);

      // Re-index for search if published and content changed
      if (updatedProfile.isPublic && options.reindexForSearch && this.hasContentChanged(changes)) {
        await this.seoService.reindexProfile(updatedProfile);
      }

      // Generate updated SEO report
      let seoReport: SEOReport | undefined;
      if (options.seoOptions) {
        seoReport = await this.seoService.generateSEOReport(profileId);
      }

      return {
        success: true,
        profile: updatedProfile,
        changes,
        seoReport
      };

    } catch (error) {
      return {
        success: false,
        errors: [`Profile update failed: ${error instanceof Error ? error.message : 'Unknown error'}`]
      };
    }
  }

  async getPublicProfile(identifier: string): Promise<PublicProfileData | null> {
    try {
      // Try to get by ID first, then by slug
      let profile = await this.storageService.getProfile(identifier);
      
      if (!profile) {
        profile = await this.storageService.getProfileBySlug(identifier);
      }

      if (!profile || !profile.isPublic) {
        return null;
      }

      // Track profile view
      await this.analyticsService.trackProfileView(profile.id, {
        timestamp: new Date(),
        source: 'direct'
      });

      return profile;

    } catch (error) {
      console.error('Error getting public profile:', error);
      return null;
    }
  }

  async publishProfile(profileId: string): Promise<boolean> {
    try {
      const profile = await this.storageService.getProfile(profileId);
      if (!profile) {
        return false;
      }

      // Validate profile is ready for publishing
      const validation = await this.validationService.validateForPublishing(profile);
      if (!validation.valid) {
        throw new Error(`Profile not ready for publishing: ${validation.errors.join(', ')}`);
      }

      // Update profile status
      profile.isPublic = true;
      profile.updatedAt = new Date();

      // Generate and submit sitemap
      await this.seoService.generateSitemap(profile);

      // Set up analytics tracking
      await this.analyticsService.setupProfileTracking(profile.id, profile.slug);

      // Save updated profile
      await this.storageService.saveProfile(profile);

      return true;

    } catch (error) {
      console.error('Error publishing profile:', error);
      return false;
    }
  }

  async unpublishProfile(profileId: string): Promise<boolean> {
    try {
      const profile = await this.storageService.getProfile(profileId);
      if (!profile) {
        return false;
      }

      // Update profile status
      profile.isPublic = false;
      profile.updatedAt = new Date();

      // Remove from search index
      await this.seoService.removeFromIndex(profileId);

      // Save updated profile
      await this.storageService.saveProfile(profile);

      return true;

    } catch (error) {
      console.error('Error unpublishing profile:', error);
      return false;
    }
  }

  async deleteProfile(profileId: string): Promise<boolean> {
    try {
      const profile = await this.storageService.getProfile(profileId);
      if (!profile) {
        return false;
      }

      // Remove from search index
      if (profile.isPublic) {
        await this.seoService.removeFromIndex(profileId);
      }

      // Clean up analytics data
      await this.analyticsService.cleanupProfileData(profileId);

      // Clean up networking data
      await this.networkingService.cleanupProfileData(profileId);

      // Delete profile files and media
      await this.storageService.deleteProfileMedia(profileId);

      // Delete profile record
      await this.storageService.deleteProfile(profileId);

      return true;

    } catch (error) {
      console.error('Error deleting profile:', error);
      return false;
    }
  }

  private async generateUniqueSlug(name: string, title?: string): Promise<string> {
    const baseSlug = this.createSlug(name, title);
    let slug = baseSlug;
    let counter = 0;

    while (await this.storageService.isSlugTaken(slug)) {
      counter++;
      slug = `${baseSlug}-${counter}`;
    }

    return slug;
  }

  private createSlug(name: string, title?: string): string {
    let slugText = name;
    if (title) {
      slugText += ` ${title}`;
    }

    return slugText
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .substring(0, PROFILE_CONSTANTS.MAX_SLUG_LENGTH);
  }

  private generateProfileId(userId: string, slug: string): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    return `${userId}-${slug}-${timestamp}-${random}`;
  }

  private async generateProfileURLs(profile: PublicProfileData): Promise<ProfileURLs> {
    const baseUrl = process.env.PUBLIC_PROFILES_BASE_URL || 'https://cvplus.io';
    
    return {
      publicUrl: `${baseUrl}/${profile.slug}`,
      customDomainUrl: profile.customDomain ? `https://${profile.customDomain}` : undefined,
      qrCodeUrl: `${baseUrl}/api/qr/${profile.id}`,
      pdfExportUrl: `${baseUrl}/api/export/pdf/${profile.id}`,
      apiUrl: `${baseUrl}/api/profiles/${profile.id}`,
      editUrl: `${baseUrl}/dashboard/profiles/${profile.id}/edit`,
      analyticsUrl: `${baseUrl}/dashboard/profiles/${profile.id}/analytics`,
      shareUrls: {
        linkedin: `https://linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(`${baseUrl}/${profile.slug}`)}`,
        twitter: `https://twitter.com/intent/tweet?url=${encodeURIComponent(`${baseUrl}/${profile.slug}`)}`,
        facebook: `https://facebook.com/sharer/sharer.php?u=${encodeURIComponent(`${baseUrl}/${profile.slug}`)}`,
        email: `mailto:?subject=${encodeURIComponent(`Check out ${profile.name}'s profile`)}&body=${encodeURIComponent(`${baseUrl}/${profile.slug}`)}`,
        whatsapp: `https://wa.me/?text=${encodeURIComponent(`${baseUrl}/${profile.slug}`)}`,
        telegram: `https://t.me/share/url?url=${encodeURIComponent(`${baseUrl}/${profile.slug}`)}`,
        copy: `${baseUrl}/${profile.slug}`
      }
    };
  }

  private getDefaultContactInfo() {
    return {
      allowDirectContact: true,
      showEmail: true,
      showPhone: false,
      preferredContactMethod: 'email' as const,
      availableForWork: true,
      workLocation: 'flexible' as const,
      contactFormSettings: {
        enabled: true,
        requireMessage: true,
        customFields: [],
        autoReply: false,
        spamProtection: true,
        rateLimitEnabled: true
      }
    };
  }

  private async getDefaultSEOSettings(profileData: Partial<PublicProfileData>) {
    return {
      metaTitle: profileData.name ? `${profileData.name} - ${profileData.title || 'Professional Profile'}` : undefined,
      metaDescription: profileData.summary?.substring(0, 160),
      keywords: profileData.skills?.slice(0, 10) || [],
      robotsIndex: true,
      robotsFollow: true,
      openGraphSettings: {
        type: 'profile' as const,
        locale: 'en_US',
        siteName: 'CVPlus'
      },
      twitterCardSettings: {
        card: 'summary_large_image' as const
      },
      structuredDataEnabled: true,
      customMeta: []
    };
  }

  private getDefaultPrivacySettings() {
    return {
      profileVisibility: 'public' as const,
      searchEngineIndexing: true,
      showInDirectory: true,
      allowDirectMessages: true,
      showLastActiveDate: false,
      hideContactInfo: false,
      blockedUsers: [],
      gdprCompliant: true,
      cookieConsent: true
    };
  }

  private async getDefaultBrandingSettings(template?: string) {
    return {
      customColors: {
        primary: PROFILE_CONSTANTS.DEFAULT_COLORS.PRIMARY,
        secondary: PROFILE_CONSTANTS.DEFAULT_COLORS.SECONDARY,
        accent: PROFILE_CONSTANTS.DEFAULT_COLORS.ACCENT,
        background: PROFILE_CONSTANTS.DEFAULT_COLORS.BACKGROUND,
        surface: PROFILE_CONSTANTS.DEFAULT_COLORS.SURFACE,
        text: PROFILE_CONSTANTS.DEFAULT_COLORS.TEXT,
        textSecondary: PROFILE_CONSTANTS.DEFAULT_COLORS.TEXT_SECONDARY,
        border: PROFILE_CONSTANTS.DEFAULT_COLORS.BORDER,
        success: PROFILE_CONSTANTS.DEFAULT_COLORS.SUCCESS,
        warning: PROFILE_CONSTANTS.DEFAULT_COLORS.WARNING,
        error: PROFILE_CONSTANTS.DEFAULT_COLORS.ERROR
      },
      typography: {
        fontFamily: 'Inter',
        fontSize: 'medium' as const,
        lineHeight: 1.5,
        letterSpacing: 0
      },
      layout: {
        template: (template as any) || 'professional',
        sectionOrder: [...PROFILE_CONSTANTS.LAYOUT_SETTINGS.SECTION_ORDER],
        showSectionIcons: true,
        compactMode: false,
        sidebarPosition: 'left' as const,
        headerStyle: 'banner' as const,
        animationsEnabled: true
      },
      customDomainEnabled: false
    };
  }

  private async generateProfileMetadata(
    profileData: Partial<PublicProfileData>, 
    _options: ProfileCreationOptions
  ) {
    return {
      version: '1.0.0',
      templateVersion: '1.0.0',
      language: 'en',
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      experienceLevel: this.determineExperienceLevel(profileData.experience || []),
      profileCompleteness: this.calculateProfileCompleteness(profileData),
      verificationStatus: {
        email: false,
        phone: false,
        identity: false,
        employment: false,
        education: false,
        certifications: false
      },
      premiumFeatures: {},
      subscriptionTier: 'free' as any
    };
  }

  private getDefaultAnalytics() {
    return {
      totalViews: 0,
      uniqueViews: 0,
      monthlyViews: 0,
      weeklyViews: 0,
      dailyViews: 0,
      viewsHistory: [],
      topReferrers: [],
      topCountries: [],
      averageSessionDuration: 0,
      bounceRate: 0,
      conversionRate: 0,
      contactFormSubmissions: 0,
      downloadCount: 0,
      shareCount: 0,
      lastAnalyticsUpdate: new Date()
    };
  }

  private getDefaultNetworkingOptions() {
    return {
      allowDirectConnections: true,
      allowDirectMessages: true,
      allowEndorsements: true,
      allowRecommendations: true,
      requireApproval: true
    };
  }

  private determineExperienceLevel(experience: any[]): 'entry' | 'mid' | 'senior' | 'executive' {
    const totalYears = experience.reduce((total, exp) => {
      const start = new Date(exp.startDate);
      const end = exp.current ? new Date() : new Date(exp.endDate);
      const years = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 365);
      return total + years;
    }, 0);

    if (totalYears < 2) return 'entry';
    if (totalYears < 5) return 'mid';
    if (totalYears < 10) return 'senior';
    return 'executive';
  }

  private calculateProfileCompleteness(profileData: Partial<PublicProfileData>): number {
    const requiredFields = [
      'name', 'title', 'summary', 'email', 'skills', 
      'experience', 'education'
    ];
    
    let completedFields = 0;
    requiredFields.forEach(field => {
      const value = profileData[field as keyof PublicProfileData];
      if (value && (Array.isArray(value) ? value.length > 0 : value.toString().length > 0)) {
        completedFields++;
      }
    });

    return Math.round((completedFields / requiredFields.length) * 100);
  }

  private identifyChanges(existing: PublicProfileData, updates: Partial<PublicProfileData>) {
    const changes: any[] = [];
    
    Object.keys(updates).forEach(key => {
      const oldValue = existing[key as keyof PublicProfileData];
      const newValue = updates[key as keyof PublicProfileData];
      
      if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
        changes.push({
          field: key,
          oldValue,
          newValue,
          timestamp: new Date(),
          changetype: 'update'
        });
      }
    });

    return changes;
  }

  private hasContentChanged(changes: any[]): boolean {
    const contentFields = [
      'name', 'title', 'headline', 'summary', 'skills', 
      'experience', 'education', 'portfolio', 'testimonials'
    ];
    
    return changes.some(change => contentFields.includes(change.field));
  }
}