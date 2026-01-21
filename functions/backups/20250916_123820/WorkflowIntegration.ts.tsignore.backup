// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts/**
 * Workflow Integration for CV Processing
 *
 * Provides integration layer for workflow services from @cvplus/workflow submodule.
 * Uses dependency injection pattern to avoid direct dependencies between same-layer modules.
 */

import { ParsedCV } from '../../cvParser';

// Integration types for workflow services
export interface CertificationBadgesCollection {
  badges: any[];
  categories: string[];
  statistics: {
    totalCertifications: number;
    verifiedCertifications: number;
    activeCertifications: number;
    skillsCovered: string[];
  };
  displayOptions: {
    layout: string;
    showExpired: boolean;
    groupByCategory: boolean;
    animateOnHover: boolean;
    showVerificationStatus: boolean;
  };
}

export interface WorkflowProvider {
  createCertificationBadgesService(): CertificationBadgesService;
}

export interface CertificationBadgesService {
  generateCertificationBadges(cv: any, jobId: string): Promise<CertificationBadgesCollection>;
  verifyCertification(jobId: string, badgeId: string, verificationData: any): Promise<any>;
}

/**
 * Integration layer for workflow services
 */
export class WorkflowIntegration {
  private static provider: WorkflowProvider | null = null;

  /**
   * Set the workflow provider (called by root application during startup)
   */
  static setProvider(provider: WorkflowProvider): void {
    this.provider = provider;
  }

  /**
   * Get certification badges service from workflow submodule
   */
  static getCertificationBadgesService(): CertificationBadgesService | null {
    if (!this.provider) {
      return null;
    }

    try {
      return this.provider.createCertificationBadgesService();
    } catch (error) {
      console.warn('Failed to create certification badges service:', error);
      return null;
    }
  }

  /**
   * Create fallback certification badges service
   */
  static createFallbackCertificationBadgesService(): CertificationBadgesService {
    return new FallbackCertificationBadgesService();
  }

  /**
   * Get certification badges service with fallback
   */
  static getCertificationBadgesServiceWithFallback(): CertificationBadgesService {
    return this.getCertificationBadgesService() || this.createFallbackCertificationBadgesService();
  }

  /**
   * Check if provider is available
   */
  static isProviderAvailable(): boolean {
    return this.provider !== null;
  }
}

/**
 * Fallback certification badges service for when workflow submodule is not available
 */
export class FallbackCertificationBadgesService implements CertificationBadgesService {
  async generateCertificationBadges(cv: any, jobId: string): Promise<CertificationBadgesCollection> {
    // Extract certifications from CV data
    const certifications = cv.certifications || [];

    // Create basic badges collection
    const badges = certifications.map((cert: any, index: number) => ({
      id: `fallback-${jobId}-${index}`,
      title: cert.name || cert.title || 'Certification',
      issuer: cert.issuer || cert.organization || 'Unknown Issuer',
      date: cert.date || cert.issueDate || new Date().toISOString(),
      isVerified: false,
      category: this.determineCertificationCategory(cert),
      fallbackMode: true
    }));

    // Create statistics
    const statistics = {
      totalCertifications: badges.length,
      verifiedCertifications: 0, // No verification in fallback mode
      activeCertifications: badges.length,
      skillsCovered: this.extractSkillsFromCertifications(certifications)
    };

    // Create categories
    const categories = Array.from(new Set(badges.map(badge => badge.category)));

    return {
      badges,
      categories,
      statistics,
      displayOptions: {
        layout: 'grid',
        showExpired: true,
        groupByCategory: true,
        animateOnHover: false,
        showVerificationStatus: false
      }
    };
  }

  async verifyCertification(jobId: string, badgeId: string, verificationData: any): Promise<any> {
    // Fallback verification - always returns unverified
    return {
      isVerified: false,
      verificationStatus: 'fallback_mode',
      message: 'Verification requires the workflow module'
    };
  }

  private determineCertificationCategory(cert: any): string {
    const name = (cert.name || cert.title || '').toLowerCase();

    if (name.includes('aws') || name.includes('azure') || name.includes('gcp') || name.includes('cloud')) {
      return 'Cloud Computing';
    }
    if (name.includes('security') || name.includes('cissp') || name.includes('ceh')) {
      return 'Security';
    }
    if (name.includes('project') || name.includes('pmp') || name.includes('scrum')) {
      return 'Project Management';
    }
    if (name.includes('developer') || name.includes('programming') || name.includes('coding')) {
      return 'Development';
    }
    if (name.includes('data') || name.includes('analytics') || name.includes('science')) {
      return 'Data & Analytics';
    }

    return 'Professional';
  }

  private extractSkillsFromCertifications(certifications: any[]): string[] {
    const skills = new Set<string>();

    certifications.forEach(cert => {
      // Extract skills from certification names and descriptions
      const text = `${cert.name || ''} ${cert.title || ''} ${cert.description || ''}`.toLowerCase();

      // Common skill keywords
      const skillKeywords = [
        'javascript', 'python', 'java', 'react', 'node.js', 'aws', 'azure', 'docker',
        'kubernetes', 'sql', 'mongodb', 'git', 'linux', 'security', 'agile', 'scrum'
      ];

      skillKeywords.forEach(keyword => {
        if (text.includes(keyword)) {
          skills.add(keyword.charAt(0).toUpperCase() + keyword.slice(1));
        }
      });
    });

    return Array.from(skills);
  }
}

// Export singleton instance for compatibility
export const certificationBadgesService = WorkflowIntegration.getCertificationBadgesServiceWithFallback();