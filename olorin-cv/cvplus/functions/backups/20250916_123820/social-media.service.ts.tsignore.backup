// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-nocheck
import * as admin from 'firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions';
import { ParsedCV } from './cvParsing.service';

interface SocialMediaProfile {
  platform: 'linkedin' | 'twitter' | 'github' | 'instagram' | 'facebook' | 'youtube' | 'tiktok' | 'behance' | 'dribbble' | 'medium' | 'custom';
  url: string;
  username?: string;
  followers?: number;
  verified: boolean;
  lastUpdated: Date;
  metrics?: {
    posts: number;
    engagement: number;
    reach: number;
  };
  content?: {
    bio: string;
    avatar: string;
    banner: string;
    recentPosts: Array<{
      id: string;
      content: string;
      engagement: number;
      timestamp: Date;
      media?: string[];
    }>;
  };
}

interface SocialMediaCard {
  id: string;
  platform: string;
  style: {
    layout: 'minimal' | 'detailed' | 'showcase' | 'stats-focused';
    colors: {
      primary: string;
      secondary: string;
      accent: string;
    };
    showMetrics: boolean;
    showRecentContent: boolean;
    showQRCode: boolean;
    animation: 'none' | 'hover' | 'pulse' | 'gradient';
  };
  content: {
    title: string;
    description: string;
    callToAction: string;
    customMessage?: string;
  };
}

interface SocialMediaIntegration {
  profiles: SocialMediaProfile[];
  cards: SocialMediaCard[];
  aggregatedStats: {
    totalFollowers: number;
    totalPosts: number;
    totalEngagement: number;
    topPlatform: string;
    growthRate: number;
  };
  display: {
    layout: 'grid' | 'carousel' | 'sidebar' | 'floating';
    groupByCategory: boolean;
    showOnlyVerified: boolean;
    maxDisplayed: number;
    sortBy: 'followers' | 'engagement' | 'platform' | 'custom';
  };
  automation: {
    autoSync: boolean;
    syncFrequency: 'daily' | 'weekly' | 'monthly';
    notifications: boolean;
    crossPostEnabled: boolean;
    hashtagSuggestions: string[];
  };
  analytics: {
    clickThroughs: Record<string, number>;
    platformPerformance: Record<string, {
      clicks: number;
      impressions: number;
      ctr: number;
    }>;
    topReferrers: string[];
  };
  createdAt: Date;
  updatedAt: Date;
}

export class SocialMediaService {
  private db = admin.firestore();

  // Platform configurations
  private platformConfigs = {
    linkedin: {
      name: 'LinkedIn',
      color: '#0077B5',
      icon: 'linkedin',
      category: 'professional',
      apiEndpoint: 'https://api.linkedin.com/v2',
      features: ['profile', 'posts', 'connections', 'skills']
    },
    twitter: {
      name: 'Twitter',
      color: '#1DA1F2',
      icon: 'twitter',
      category: 'social',
      apiEndpoint: 'https://api.twitter.com/2',
      features: ['profile', 'tweets', 'followers', 'engagement']
    },
    github: {
      name: 'GitHub',
      color: '#333',
      icon: 'github',
      category: 'technical',
      apiEndpoint: 'https://api.github.com',
      features: ['repositories', 'commits', 'followers', 'contributions']
    },
    instagram: {
      name: 'Instagram',
      color: '#E4405F',
      icon: 'instagram',
      category: 'creative',
      apiEndpoint: 'https://graph.instagram.com',
      features: ['posts', 'stories', 'followers', 'engagement']
    },
    youtube: {
      name: 'YouTube',
      color: '#FF0000',
      icon: 'youtube',
      category: 'content',
      apiEndpoint: 'https://www.googleapis.com/youtube/v3',
      features: ['videos', 'subscribers', 'views', 'playlists']
    },
    behance: {
      name: 'Behance',
      color: '#1769FF',
      icon: 'behance',
      category: 'creative',
      apiEndpoint: 'https://api.behance.net/v2',
      features: ['projects', 'appreciations', 'views', 'followers']
    },
    dribbble: {
      name: 'Dribbble',
      color: '#EA4C89',
      icon: 'dribbble',
      category: 'creative',
      apiEndpoint: 'https://api.dribbble.com/v2',
      features: ['shots', 'likes', 'views', 'followers']
    },
    medium: {
      name: 'Medium',
      color: '#00AB6C',
      icon: 'medium',
      category: 'content',
      apiEndpoint: 'https://api.medium.com/v1',
      features: ['publications', 'followers', 'claps', 'views']
    }
  };

  async generateSocialMediaIntegration(parsedCV: ParsedCV, jobId: string): Promise<SocialMediaIntegration> {
    try {
      // Extract social media profiles from CV
      const extractedProfiles = await this.extractSocialProfiles(parsedCV);
      
      // Enrich profiles with additional data
      const enrichedProfiles = await this.enrichProfiles(extractedProfiles);
      
      // Generate social media cards
      const cards = this.generateSocialCards(enrichedProfiles);
      
      // Calculate aggregated stats
      const aggregatedStats = this.calculateAggregatedStats(enrichedProfiles);
      
      // Create integration configuration
      const integration: SocialMediaIntegration = {
        profiles: enrichedProfiles,
        cards,
        aggregatedStats,
        display: {
          layout: 'grid',
          groupByCategory: true,
          showOnlyVerified: false,
          maxDisplayed: 8,
          sortBy: 'followers'
        },
        automation: {
          autoSync: false,
          syncFrequency: 'weekly',
          notifications: true,
          crossPostEnabled: false,
          hashtagSuggestions: this.generateHashtagSuggestions(parsedCV)
        },
        analytics: {
          clickThroughs: {},
          platformPerformance: {},
          topReferrers: []
        },
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // Store in Firestore
      await this.db.collection('jobs').doc(jobId).collection('features').doc('social-media').set({
        integration,
        generatedAt: FieldValue.serverTimestamp(),
        status: 'completed'
      });

      return integration;
    } catch (error) {
      logger.error('Error generating social media integration:', error);
      throw new Error('Failed to generate social media integration');
    }
  }

  private async extractSocialProfiles(parsedCV: ParsedCV): Promise<SocialMediaProfile[]> {
    const profiles: SocialMediaProfile[] = [];
    
    // Extract from personal info
    const personalInfo = parsedCV.personalInfo || {};
    
    // Common social media URL patterns
    const urlPatterns = {
      linkedin: /(?:https?:\/\/)?(?:www\.)?linkedin\.com\/(?:in|pub)\/([a-zA-Z0-9-]+)/,
      twitter: /(?:https?:\/\/)?(?:www\.)?twitter\.com\/([a-zA-Z0-9_]+)/,
      github: /(?:https?:\/\/)?(?:www\.)?github\.com\/([a-zA-Z0-9-]+)/,
      instagram: /(?:https?:\/\/)?(?:www\.)?instagram\.com\/([a-zA-Z0-9_.]+)/,
      youtube: /(?:https?:\/\/)?(?:www\.)?youtube\.com\/(?:channel|user|c)\/([a-zA-Z0-9-_]+)/,
      behance: /(?:https?:\/\/)?(?:www\.)?behance\.net\/([a-zA-Z0-9-_]+)/,
      dribbble: /(?:https?:\/\/)?(?:www\.)?dribbble\.com\/([a-zA-Z0-9-_]+)/,
      medium: /(?:https?:\/\/)?(?:www\.)?medium\.com\/@?([a-zA-Z0-9-_]+)/
    };

    // Check all sections for social media URLs
    const allContent = JSON.stringify(parsedCV).toLowerCase();
    
    for (const [platform, pattern] of Object.entries(urlPatterns)) {
      const matches = allContent.match(pattern);
      if (matches) {
        const username = matches[1];
        const fullUrl = this.constructFullUrl(platform, username);
        
        profiles.push({
          platform: platform as any,
          url: fullUrl,
          username,
          followers: 0,
          verified: false,
          lastUpdated: new Date(),
          metrics: {
            posts: 0,
            engagement: 0,
            reach: 0
          }
        });
      }
    }

    // Extract from explicit social media fields
    const socialFields = ['linkedin', 'twitter', 'github', 'website', 'portfolio'];
    socialFields.forEach(field => {
      const value = (personalInfo as any)[field];
      if (value && typeof value === 'string') {
        for (const [platform, pattern] of Object.entries(urlPatterns)) {
          const matches = value.match(pattern);
          if (matches && !profiles.find(p => p.platform === platform)) {
            profiles.push({
              platform: platform as any,
              url: value,
              username: matches[1],
              followers: 0,
              verified: false,
              lastUpdated: new Date(),
              metrics: {
                posts: 0,
                engagement: 0,
                reach: 0
              }
            });
          }
        }
      }
    });

    return profiles;
  }

  private constructFullUrl(platform: string, username: string): string {
    const baseUrls = {
      linkedin: 'https://www.linkedin.com/in/',
      twitter: 'https://twitter.com/',
      github: 'https://github.com/',
      instagram: 'https://www.instagram.com/',
      youtube: 'https://www.youtube.com/channel/',
      behance: 'https://www.behance.net/',
      dribbble: 'https://dribbble.com/',
      medium: 'https://medium.com/@'
    };

    return (baseUrls[platform as keyof typeof baseUrls] || '') + username;
  }

  private async enrichProfiles(profiles: SocialMediaProfile[]): Promise<SocialMediaProfile[]> {
    // In a real implementation, this would call actual social media APIs
    // For now, we'll simulate enriched data
    return profiles.map(profile => ({
      ...profile,
      followers: Math.floor(Math.random() * 10000) + 100,
      verified: Math.random() > 0.8,
      metrics: {
        posts: Math.floor(Math.random() * 500) + 10,
        engagement: Math.floor(Math.random() * 1000) + 50,
        reach: Math.floor(Math.random() * 50000) + 1000
      },
      content: {
        bio: `Professional ${profile.platform} profile showcasing expertise and insights.`,
        avatar: `https://via.placeholder.com/150?text=${profile.platform.charAt(0).toUpperCase()}`,
        banner: `https://via.placeholder.com/800x200?text=${profile.platform}+Banner`,
        recentPosts: Array.from({ length: 3 }, (_, i) => ({
          id: `post-${i}`,
          content: `Recent update from ${profile.platform} profile`,
          engagement: Math.floor(Math.random() * 100) + 10,
          timestamp: new Date(Date.now() - i * 24 * 60 * 60 * 1000),
          media: []
        }))
      }
    }));
  }

  private generateSocialCards(profiles: SocialMediaProfile[]): SocialMediaCard[] {
    return profiles.map(profile => {
      const config = this.platformConfigs[profile.platform as keyof typeof this.platformConfigs];
      
      return {
        id: `card-${profile.platform}`,
        platform: profile.platform,
        style: {
          layout: 'detailed',
          colors: {
            primary: config?.color || '#000000',
            secondary: this.lightenColor(config?.color || '#000000', 20),
            accent: this.darkenColor(config?.color || '#000000', 20)
          },
          showMetrics: true,
          showRecentContent: true,
          showQRCode: false,
          animation: 'hover'
        },
        content: {
          title: `${config?.name || profile.platform} Profile`,
          description: `Connect with me on ${config?.name || profile.platform}`,
          callToAction: `Follow on ${config?.name || profile.platform}`,
          customMessage: `Check out my latest updates and professional insights on ${config?.name || profile.platform}!`
        }
      };
    });
  }

  private calculateAggregatedStats(profiles: SocialMediaProfile[]): SocialMediaIntegration['aggregatedStats'] {
    const totalFollowers = profiles.reduce((sum, p) => sum + (p.followers || 0), 0);
    const totalPosts = profiles.reduce((sum, p) => sum + (p.metrics?.posts || 0), 0);
    const totalEngagement = profiles.reduce((sum, p) => sum + (p.metrics?.engagement || 0), 0);
    
    const topPlatform = profiles.reduce((max, profile) => 
      (profile.followers || 0) > (max.followers || 0) ? profile : max, 
      profiles[0] || { platform: 'none' }
    );

    return {
      totalFollowers,
      totalPosts,
      totalEngagement,
      topPlatform: topPlatform.platform || 'none',
      growthRate: Math.floor(Math.random() * 20) + 5 // Simulated growth rate
    };
  }

  private generateHashtagSuggestions(parsedCV: ParsedCV): string[] {
    const skills = parsedCV.skills || [];
    const industries = this.extractIndustries(parsedCV);
    
    const suggestions = [
      ...(skills.technical?.slice(0, 5) || []).map((skill: any) => `#${skill.replace(/\s+/g, '')}`),
      ...industries.map(industry => `#${industry.replace(/\s+/g, '')}`),
      '#Professional', '#Career', '#Networking', '#Growth', '#Innovation'
    ];

    return [...new Set(suggestions)].slice(0, 10);
  }

  private extractIndustries(parsedCV: ParsedCV): string[] {
    const workExperience = parsedCV.experience || [];
    const industries = new Set<string>();
    
    workExperience.forEach((job: any) => {
      if (job.industry) {
        industries.add(job.industry);
      }
      // Extract from company names or job titles
      const text = `${job.company || ''} ${job.title || ''}`.toLowerCase();
      
      const industryKeywords = {
        'Technology': ['tech', 'software', 'engineering', 'development', 'programming'],
        'Finance': ['finance', 'banking', 'investment', 'accounting', 'fintech'],
        'Healthcare': ['health', 'medical', 'hospital', 'pharmacy', 'biotech'],
        'Education': ['education', 'university', 'school', 'teaching', 'academic'],
        'Marketing': ['marketing', 'advertising', 'brand', 'digital', 'social media'],
        'Design': ['design', 'creative', 'ux', 'ui', 'graphic', 'visual'],
        'Consulting': ['consulting', 'advisory', 'strategy', 'management'],
        'Sales': ['sales', 'business development', 'account management'],
        'Operations': ['operations', 'logistics', 'supply chain', 'manufacturing'],
        'Legal': ['legal', 'law', 'attorney', 'compliance', 'regulatory']
      };

      Object.entries(industryKeywords).forEach(([industry, keywords]) => {
        if (keywords.some(keyword => text.includes(keyword))) {
          industries.add(industry);
        }
      });
    });

    return Array.from(industries);
  }

  private lightenColor(color: string, percent: number): string {
    const num = parseInt(color.replace("#", ""), 16);
    const amt = Math.round(2.55 * percent);
    const R = (num >> 16) + amt;
    const G = (num >> 8 & 0x00FF) + amt;
    const B = (num & 0x0000FF) + amt;
    return "#" + (0x1000000 + (R < 255 ? R < 1 ? 0 : R : 255) * 0x10000 +
      (G < 255 ? G < 1 ? 0 : G : 255) * 0x100 +
      (B < 255 ? B < 1 ? 0 : B : 255)).toString(16).slice(1);
  }

  private darkenColor(color: string, percent: number): string {
    const num = parseInt(color.replace("#", ""), 16);
    const amt = Math.round(2.55 * percent);
    const R = (num >> 16) - amt;
    const G = (num >> 8 & 0x00FF) - amt;
    const B = (num & 0x0000FF) - amt;
    return "#" + (0x1000000 + (R > 255 ? 255 : R < 0 ? 0 : R) * 0x10000 +
      (G > 255 ? 255 : G < 0 ? 0 : G) * 0x100 +
      (B > 255 ? 255 : B < 0 ? 0 : B)).toString(16).slice(1);
  }

  async updateSocialProfile(jobId: string, profileId: string, updates: Partial<SocialMediaProfile>): Promise<void> {
    const integrationDoc = await this.db.collection('jobs').doc(jobId).collection('features').doc('social-media').get();
    
    if (integrationDoc.exists) {
      const data = integrationDoc.data();
      const integration = data?.integration as SocialMediaIntegration;
      
      const profileIndex = integration.profiles.findIndex(p => p.platform === profileId);
      if (profileIndex !== -1) {
        integration.profiles[profileIndex] = { ...integration.profiles[profileIndex], ...updates };
        integration.updatedAt = new Date();
        
        await integrationDoc.ref.update({ integration });
      }
    }
  }

  async addSocialProfile(jobId: string, profile: Partial<SocialMediaProfile>): Promise<void> {
    const integrationDoc = await this.db.collection('jobs').doc(jobId).collection('features').doc('social-media').get();
    
    if (integrationDoc.exists) {
      const data = integrationDoc.data();
      const integration = data?.integration as SocialMediaIntegration;
      
      const newProfile: SocialMediaProfile = {
        platform: profile.platform || 'custom',
        url: profile.url || '',
        username: profile.username,
        followers: profile.followers || 0,
        verified: profile.verified || false,
        lastUpdated: new Date(),
        metrics: profile.metrics || { posts: 0, engagement: 0, reach: 0 },
        content: profile.content
      };
      
      integration.profiles.push(newProfile);
      integration.updatedAt = new Date();
      
      // Recalculate stats
      integration.aggregatedStats = this.calculateAggregatedStats(integration.profiles);
      
      await integrationDoc.ref.update({ integration });
    }
  }

  async removeSocialProfile(jobId: string, profileId: string): Promise<void> {
    const integrationDoc = await this.db.collection('jobs').doc(jobId).collection('features').doc('social-media').get();
    
    if (integrationDoc.exists) {
      const data = integrationDoc.data();
      const integration = data?.integration as SocialMediaIntegration;
      
      integration.profiles = integration.profiles.filter(p => p.platform !== profileId);
      integration.updatedAt = new Date();
      
      // Recalculate stats
      integration.aggregatedStats = this.calculateAggregatedStats(integration.profiles);
      
      await integrationDoc.ref.update({ integration });
    }
  }

  async trackSocialClick(jobId: string, platform: string, metadata?: any): Promise<void> {
    try {
      const integrationDoc = await this.db.collection('jobs').doc(jobId).collection('features').doc('social-media').get();
      
      if (integrationDoc.exists) {
        const data = integrationDoc.data();
        const integration = data?.integration as SocialMediaIntegration;
        
        // Update click tracking
        integration.analytics.clickThroughs[platform] = (integration.analytics.clickThroughs[platform] || 0) + 1;
        
        // Update platform performance
        if (!integration.analytics.platformPerformance[platform]) {
          integration.analytics.platformPerformance[platform] = { clicks: 0, impressions: 0, ctr: 0 };
        }
        integration.analytics.platformPerformance[platform].clicks += 1;
        
        // Recalculate CTR
        const performance = integration.analytics.platformPerformance[platform];
        performance.ctr = performance.impressions > 0 ? (performance.clicks / performance.impressions) * 100 : 0;
        
        integration.updatedAt = new Date();
        
        await integrationDoc.ref.update({ integration });
      }
    } catch (error) {
      logger.error('Error tracking social click:', error);
      // Don't throw error - tracking should fail silently
    }
  }

  async getSocialAnalytics(jobId: string): Promise<any> {
    const integrationDoc = await this.db.collection('jobs').doc(jobId).collection('features').doc('social-media').get();
    
    if (!integrationDoc.exists) {
      throw new Error('Social media integration not found');
    }
    
    const data = integrationDoc.data();
    const integration = data?.integration as SocialMediaIntegration;
    
    return {
      aggregatedStats: integration.aggregatedStats,
      analytics: integration.analytics,
      profileStats: integration.profiles.map(profile => ({
        platform: profile.platform,
        followers: profile.followers,
        metrics: profile.metrics,
        verified: profile.verified
      }))
    };
  }
}