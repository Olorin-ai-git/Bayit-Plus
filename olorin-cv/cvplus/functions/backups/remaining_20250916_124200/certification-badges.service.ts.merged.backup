// @ts-ignore - Export conflicts/**
 * Certification Badges Service
 * Generates verified badges for professional certifications
 */

import { ParsedCV } from '../types/enhanced-models';
import * as admin from 'firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import OpenAI from 'openai';
import { config } from '../config/environment';

export interface CertificationBadge {
  id: string;
  name: string;
  issuer: string;
  issueDate: Date;
  expiryDate?: Date;
  credentialId?: string;
  verificationUrl?: string;
  badgeImage: {
    type: 'generated' | 'official' | 'custom';
    url: string;
    colors: {
      primary: string;
      secondary: string;
      accent: string;
    };
  };
  category: 'technical' | 'professional' | 'academic' | 'language' | 'other';
  level?: 'foundation' | 'associate' | 'professional' | 'expert';
  skills: string[];
  verified: boolean;
  verificationMethod?: 'manual' | 'api' | 'blockchain' | 'email';
  metadata: {
    provider?: string;
    score?: number;
    percentile?: number;
    modules?: string[];
  };
}

export interface CertificationBadgesCollection {
  badges: CertificationBadge[];
  categories: {
    technical: CertificationBadge[];
    professional: CertificationBadge[];
    academic: CertificationBadge[];
    language: CertificationBadge[];
    other: CertificationBadge[];
  };
  statistics: {
    totalCertifications: number;
    verifiedCertifications: number;
    activeCertifications: number;
    expiredCertifications: number;
    topIssuers: { issuer: string; count: number }[];
    skillsCovered: string[];
  };
  displayOptions: {
    layout: 'grid' | 'list' | 'carousel' | 'timeline';
    showExpired: boolean;
    groupByCategory: boolean;
    animateOnHover: boolean;
    showVerificationStatus: boolean;
  };
}

export class CertificationBadgesService {
  private openai: OpenAI;
  
  // Known certification providers and their badge colors
  private certificationProviders: Record<string, any> = {
    'AWS': {
      colors: { primary: '#FF9900', secondary: '#232F3E', accent: '#FFFFFF' },
      verificationUrl: 'https://aws.amazon.com/verification',
      category: 'technical',
      levels: ['Cloud Practitioner', 'Associate', 'Professional', 'Specialty']
    },
    'Microsoft': {
      colors: { primary: '#0078D4', secondary: '#005A9E', accent: '#FFFFFF' },
      verificationUrl: 'https://www.credly.com/users/',
      category: 'technical',
      levels: ['Fundamentals', 'Associate', 'Expert', 'Specialty']
    },
    'Google': {
      colors: { primary: '#4285F4', secondary: '#34A853', accent: '#EA4335' },
      verificationUrl: 'https://www.credential.net/',
      category: 'technical'
    },
    'CompTIA': {
      colors: { primary: '#C8202F', secondary: '#000000', accent: '#FFFFFF' },
      verificationUrl: 'https://www.certmetrics.com/comptia/public/verification.aspx',
      category: 'technical'
    },
    'Cisco': {
      colors: { primary: '#1BA0D7', secondary: '#004C97', accent: '#FFFFFF' },
      verificationUrl: 'https://www.cisco.com/c/en/us/support/training-events/training-certifications/certifications/tracking-system.html',
      category: 'technical',
      levels: ['Entry', 'Associate', 'Professional', 'Expert']
    },
    'PMI': {
      colors: { primary: '#0085CA', secondary: '#003A70', accent: '#FFFFFF' },
      verificationUrl: 'https://www.pmi.org/certifications/certification-resources/registry',
      category: 'professional'
    },
    'Scrum': {
      colors: { primary: '#F5A623', secondary: '#4A4A4A', accent: '#FFFFFF' },
      verificationUrl: 'https://www.scrum.org/certificates',
      category: 'professional'
    },
    'Oracle': {
      colors: { primary: '#F80000', secondary: '#000000', accent: '#FFFFFF' },
      verificationUrl: 'https://education.oracle.com/certification',
      category: 'technical'
    },
    'Salesforce': {
      colors: { primary: '#00A1E0', secondary: '#032E61', accent: '#FFFFFF' },
      verificationUrl: 'https://trailhead.salesforce.com/credentials/verification',
      category: 'technical'
    },
    'Adobe': {
      colors: { primary: '#FF0000', secondary: '#000000', accent: '#FFFFFF' },
      verificationUrl: 'https://www.adobe.com/products/certified-associate.html',
      category: 'professional'
    }
  };
  
  constructor() {
    this.openai = new OpenAI({
      apiKey: config.openai?.apiKey || process.env.OPENAI_API_KEY || ''
    });
  }
  
  /**
   * Generate certification badges from CV
   */
  async generateCertificationBadges(
    parsedCV: ParsedCV, 
    jobId: string
  ): Promise<CertificationBadgesCollection> {
    // Extract certifications
    const badges = await this.extractAndEnhanceCertifications(parsedCV);
    
    // Categorize badges
    const categories = this.categorizeBadges(badges);
    
    // Generate statistics
    const statistics = this.generateStatistics(badges);
    
    // Set default display options
    const displayOptions = {
      layout: 'grid' as const,
      showExpired: false,
      groupByCategory: true,
      animateOnHover: true,
      showVerificationStatus: true
    };
    
    const collection: CertificationBadgesCollection = {
      badges,
      categories,
      statistics,
      displayOptions
    };
    
    // Store in Firestore
    await this.storeBadgesCollection(jobId, collection);
    
    return collection;
  }
  
  /**
   * Extract and enhance certifications
   */
  private async extractAndEnhanceCertifications(cv: ParsedCV): Promise<CertificationBadge[]> {
    const badges: CertificationBadge[] = [];
    
    // Process explicit certifications
    if (cv.certifications && Array.isArray(cv.certifications)) {
      for (const cert of cv.certifications) {
        const badge = await this.createBadgeFromCertification(cert);
        badges.push(badge);
      }
    }
    
    // Use AI to find additional certifications in experience
    const additionalCerts = await this.extractCertificationsFromExperience(cv);
    badges.push(...additionalCerts);
    
    // Sort by date (newest first)
    return badges.sort((a, b) => b.issueDate.getTime() - a.issueDate.getTime());
  }
  
  /**
   * Create badge from certification data
   */
  private async createBadgeFromCertification(cert: any): Promise<CertificationBadge> {
    const issuer = this.normalizeIssuer(cert.issuer);
    const provider = this.certificationProviders[issuer];
    
    // Extract credential ID and verification URL
    const { credentialId, verificationUrl } = this.extractVerificationInfo(cert);
    
    // Determine category and level
    const category = this.determineCategory(cert.name, issuer);
    const level = this.determineLevel(cert.name);
    
    // Extract skills
    const skills = await this.extractSkillsFromCertification(cert);
    
    // Generate badge image data
    const badgeImage = this.generateBadgeImage(
      cert.name,
      issuer,
      provider?.colors || this.getDefaultColors(category)
    );
    
    // Check if expired
    const expiryDate = cert.expiryDate ? new Date(cert.expiryDate) : undefined;
    
    return {
      id: `cert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: cert.name,
      issuer: issuer,
      issueDate: new Date(cert.date || cert.issueDate),
      expiryDate,
      credentialId,
      verificationUrl: verificationUrl || provider?.verificationUrl,
      badgeImage,
      category,
      level,
      skills,
      verified: !!credentialId && !!verificationUrl,
      verificationMethod: credentialId ? 'api' : 'manual',
      metadata: {
        provider: issuer,
        score: cert.score,
        percentile: cert.percentile,
        modules: cert.modules
      }
    };
  }
  
  /**
   * Extract certifications from experience using AI
   */
  private async extractCertificationsFromExperience(cv: ParsedCV): Promise<CertificationBadge[]> {
    const badges: CertificationBadge[] = [];
    
    const prompt = `Extract professional certifications mentioned in this CV content. Look for:
    - Certification names with issuing organizations
    - Certification IDs or credential numbers
    - Dates obtained
    - Any mentions of "certified", "certification", "credential"
    
    Experience: ${JSON.stringify(cv.experience?.slice(0, 5) || [])}
    Summary: ${cv.personalInfo?.summary || ''}
    Achievements: []
    
    Return as JSON array with: name, issuer, date, credentialId (if found)`;

    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'You are a certification extractor. Find professional certifications and return valid JSON.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3,
        response_format: { type: 'json_object' }
      });
      
      const result = JSON.parse(response.choices[0].message?.content || '{"certifications":[]}');
      const extractedCerts = result.certifications || [];
      
      for (const cert of extractedCerts) {
        const badge = await this.createBadgeFromCertification(cert);
        badges.push(badge);
      }
    } catch (error) {
    }
    
    return badges;
  }
  
  /**
   * Normalize issuer name
   */
  private normalizeIssuer(issuer: string): string {
    const issuerLower = issuer.toLowerCase();
    
    // Map variations to standard names
    if (issuerLower.includes('amazon') || issuerLower.includes('aws')) return 'AWS';
    if (issuerLower.includes('microsoft') || issuerLower.includes('azure')) return 'Microsoft';
    if (issuerLower.includes('google') || issuerLower.includes('gcp')) return 'Google';
    if (issuerLower.includes('comptia')) return 'CompTIA';
    if (issuerLower.includes('cisco')) return 'Cisco';
    if (issuerLower.includes('pmi') || issuerLower.includes('project management')) return 'PMI';
    if (issuerLower.includes('scrum') || issuerLower.includes('agile')) return 'Scrum';
    if (issuerLower.includes('oracle')) return 'Oracle';
    if (issuerLower.includes('salesforce')) return 'Salesforce';
    if (issuerLower.includes('adobe')) return 'Adobe';
    
    // Return original with proper casing
    return issuer.split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  }
  
  /**
   * Extract verification information
   */
  private extractVerificationInfo(cert: any): { 
    credentialId?: string; 
    verificationUrl?: string;
  } {
    let credentialId = cert.credentialId || cert.id || cert.certificateId;
    let verificationUrl = cert.verificationUrl || cert.url;
    
    // Try to extract from description or URL
    if (!credentialId && cert.url) {
      const idMatch = cert.url.match(/(?:id|credential|cert)[=/:]([A-Za-z0-9-]+)/i);
      if (idMatch) {
        credentialId = idMatch[1];
      }
    }
    
    return { credentialId, verificationUrl };
  }
  
  /**
   * Determine certification category
   */
  private determineCategory(
    certName: string, 
    _issuer: string
  ): CertificationBadge['category'] {
    const name = certName.toLowerCase();
    
    // Technical certifications
    if (name.includes('cloud') || name.includes('aws') || name.includes('azure') ||
        name.includes('developer') || name.includes('engineer') || name.includes('architect') ||
        name.includes('security') || name.includes('network') || name.includes('database') ||
        name.includes('devops') || name.includes('kubernetes') || name.includes('docker')) {
      return 'technical';
    }
    
    // Professional certifications
    if (name.includes('project') || name.includes('agile') || name.includes('scrum') ||
        name.includes('management') || name.includes('leadership') || name.includes('six sigma') ||
        name.includes('itil') || name.includes('business')) {
      return 'professional';
    }
    
    // Academic certifications
    if (name.includes('university') || name.includes('course') || name.includes('degree') ||
        name.includes('diploma') || name.includes('academic')) {
      return 'academic';
    }
    
    // Language certifications
    if (name.includes('language') || name.includes('toefl') || name.includes('ielts') ||
        name.includes('dele') || name.includes('delf') || name.includes('jlpt')) {
      return 'language';
    }
    
    // Check by issuer
    const provider = this.certificationProviders[_issuer];
    if (provider?.category) {
      return provider.category;
    }
    
    return 'other';
  }
  
  /**
   * Determine certification level
   */
  private determineLevel(certName: string): CertificationBadge['level'] | undefined {
    const name = certName.toLowerCase();
    
    if (name.includes('foundation') || name.includes('fundamental') || 
        name.includes('entry') || name.includes('basic')) {
      return 'foundation';
    }
    if (name.includes('associate') || name.includes('intermediate')) {
      return 'associate';
    }
    if (name.includes('professional') || name.includes('advanced')) {
      return 'professional';
    }
    if (name.includes('expert') || name.includes('specialist') || 
        name.includes('architect') || name.includes('senior')) {
      return 'expert';
    }
    
    return undefined;
  }
  
  /**
   * Extract skills from certification
   */
  private async extractSkillsFromCertification(cert: any): Promise<string[]> {
    const skills: string[] = [];
    const certName = cert.name.toLowerCase();
    
    // Common skill mappings
    const skillMappings: Record<string, string[]> = {
      'aws': ['Cloud Computing', 'AWS', 'Infrastructure'],
      'azure': ['Cloud Computing', 'Azure', 'Microsoft Cloud'],
      'google cloud': ['Cloud Computing', 'GCP', 'Google Cloud'],
      'kubernetes': ['Container Orchestration', 'Kubernetes', 'DevOps'],
      'docker': ['Containerization', 'Docker', 'DevOps'],
      'security': ['Cybersecurity', 'Information Security'],
      'network': ['Networking', 'Network Architecture'],
      'database': ['Database Management', 'SQL'],
      'project management': ['Project Management', 'Leadership'],
      'agile': ['Agile Methodology', 'Scrum'],
      'data': ['Data Analysis', 'Data Science'],
      'machine learning': ['Machine Learning', 'AI'],
      'devops': ['DevOps', 'CI/CD', 'Automation']
    };
    
    // Find matching skills
    for (const [keyword, relatedSkills] of Object.entries(skillMappings)) {
      if (certName.includes(keyword)) {
        skills.push(...relatedSkills);
      }
    }
    
    // Remove duplicates
    return [...new Set(skills)];
  }
  
  /**
   * Generate badge image data
   */
  private generateBadgeImage(
    certName: string,
    issuer: string,
    colors: { primary: string; secondary: string; accent: string }
  ): CertificationBadge['badgeImage'] {
    // In a real implementation, this could generate actual images
    // For now, we'll create SVG data URLs
    
    const initials = this.getInitials(issuer);
    const svgBadge = `
      <svg width="200" height="200" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
        <!-- Hexagon background -->
        <polygon points="100,10 170,50 170,130 100,170 30,130 30,50" 
                 fill="${colors.primary}" 
                 stroke="${colors.secondary}" 
                 stroke-width="4"/>
        
        <!-- Inner hexagon -->
        <polygon points="100,40 145,65 145,115 100,140 55,115 55,65" 
                 fill="${colors.secondary}" 
                 opacity="0.3"/>
        
        <!-- Text -->
        <text x="100" y="100" font-family="Arial, sans-serif" font-size="48" 
              font-weight="bold" fill="${colors.accent}" text-anchor="middle" 
              dominant-baseline="middle">${initials}</text>
        
        <!-- Bottom banner -->
        <rect x="20" y="150" width="160" height="30" fill="${colors.secondary}"/>
        <text x="100" y="170" font-family="Arial, sans-serif" font-size="14" 
              fill="${colors.accent}" text-anchor="middle" 
              dominant-baseline="middle">${issuer.toUpperCase()}</text>
      </svg>
    `;
    
    const dataUrl = `data:image/svg+xml;base64,${Buffer.from(svgBadge).toString('base64')}`;
    
    return {
      type: 'generated',
      url: dataUrl,
      colors
    };
  }
  
  /**
   * Get initials from issuer name
   */
  private getInitials(issuer: string): string {
    const words = issuer.split(' ');
    if (words.length === 1) {
      return issuer.substring(0, 2).toUpperCase();
    }
    return words.map(w => w[0]).join('').substring(0, 2).toUpperCase();
  }
  
  /**
   * Get default colors for category
   */
  private getDefaultColors(category: CertificationBadge['category']): {
    primary: string;
    secondary: string;
    accent: string;
  } {
    const colorSchemes = {
      technical: { primary: '#4F46E5', secondary: '#1E293B', accent: '#FFFFFF' },
      professional: { primary: '#059669', secondary: '#064E3B', accent: '#FFFFFF' },
      academic: { primary: '#7C3AED', secondary: '#4C1D95', accent: '#FFFFFF' },
      language: { primary: '#DC2626', secondary: '#7F1D1D', accent: '#FFFFFF' },
      other: { primary: '#6B7280', secondary: '#374151', accent: '#FFFFFF' }
    };
    
    return colorSchemes[category];
  }
  
  /**
   * Categorize badges
   */
  private categorizeBadges(badges: CertificationBadge[]): CertificationBadgesCollection['categories'] {
    return {
      technical: badges.filter(b => b.category === 'technical'),
      professional: badges.filter(b => b.category === 'professional'),
      academic: badges.filter(b => b.category === 'academic'),
      language: badges.filter(b => b.category === 'language'),
      other: badges.filter(b => b.category === 'other')
    };
  }
  
  /**
   * Generate statistics
   */
  private generateStatistics(badges: CertificationBadge[]): CertificationBadgesCollection['statistics'] {
    const now = new Date();
    const activeBadges = badges.filter(b => !b.expiryDate || b.expiryDate > now);
    const expiredBadges = badges.filter(b => b.expiryDate && b.expiryDate <= now);
    
    // Count by issuer
    const issuerCounts = badges.reduce((acc, badge) => {
      acc[badge.issuer] = (acc[badge.issuer] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    const topIssuers = Object.entries(issuerCounts)
      .map(([issuer, count]) => ({ issuer, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
    
    // Collect all skills
    const allSkills = badges.flatMap(b => b.skills);
    const uniqueSkills = [...new Set(allSkills)];
    
    return {
      totalCertifications: badges.length,
      verifiedCertifications: badges.filter(b => b.verified).length,
      activeCertifications: activeBadges.length,
      expiredCertifications: expiredBadges.length,
      topIssuers,
      skillsCovered: uniqueSkills
    };
  }
  
  /**
   * Store badges collection in Firestore
   */
  private async storeBadgesCollection(
    jobId: string, 
    collection: CertificationBadgesCollection
  ): Promise<void> {
    await admin.firestore()
      .collection('jobs')
      .doc(jobId)
      .update({
        'enhancedFeatures.certificationBadges': {
          enabled: true,
          status: 'completed',
          data: collection,
          generatedAt: FieldValue.serverTimestamp()
        }
      });
  }
  
  /**
   * Verify certification
   */
  async verifyCertification(
    jobId: string,
    badgeId: string,
    verificationData: {
      method: 'manual' | 'api' | 'blockchain' | 'email';
      credentialId?: string;
      verificationUrl?: string;
    }
  ): Promise<CertificationBadge> {
    const jobDoc = await admin.firestore()
      .collection('jobs')
      .doc(jobId)
      .get();
    
    const data = jobDoc.data();
    const collection = data?.enhancedFeatures?.certificationBadges?.data as CertificationBadgesCollection;
    
    if (!collection) {
      throw new Error('Certification badges not found');
    }
    
    const badgeIndex = collection.badges.findIndex(b => b.id === badgeId);
    if (badgeIndex === -1) {
      throw new Error('Badge not found');
    }
    
    // Update verification status
    collection.badges[badgeIndex] = {
      ...collection.badges[badgeIndex],
      verified: true,
      verificationMethod: verificationData.method,
      credentialId: verificationData.credentialId || collection.badges[badgeIndex].credentialId,
      verificationUrl: verificationData.verificationUrl || collection.badges[badgeIndex].verificationUrl
    };
    
    // Update statistics
    collection.statistics.verifiedCertifications = collection.badges.filter(b => b.verified).length;
    
    // Save
    await admin.firestore()
      .collection('jobs')
      .doc(jobId)
      .update({
        'enhancedFeatures.certificationBadges.data': collection,
        'enhancedFeatures.certificationBadges.lastModified': FieldValue.serverTimestamp()
      });
    
    return collection.badges[badgeIndex];
  }
}

export const certificationBadgesService = new CertificationBadgesService();