// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts/**
 * Regional CV Optimization Service
 * Moved from i18n module to correct cv-processing domain
 */

import * as admin from 'firebase-admin';
import { RegionalScoreCalculator } from './regional-score-calculator.service';
import { ComplianceChecker } from './compliance-checker.service';
import { CulturalOptimizer } from './cultural-optimizer.service';
import {
  RegionalOptimizationRequest,
  RegionalOptimizationResult,
  LocalizedRecommendation,
  RegionalConfiguration,
  ParsedCV
} from '../types/regional';

// Initialize admin if not already done
if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

export class RegionalOptimizationService {
  private static instance: RegionalOptimizationService;
  private regionalConfigs = new Map<string, RegionalConfiguration>();
  private initialized = false;

  // Modular services
  private scoreCalculator = new RegionalScoreCalculator();
  private complianceChecker = new ComplianceChecker();
  private culturalOptimizer = new CulturalOptimizer();

  public static getInstance(): RegionalOptimizationService {
    if (!RegionalOptimizationService.instance) {
      RegionalOptimizationService.instance = new RegionalOptimizationService();
    }
    return RegionalOptimizationService.instance;
  }

  /**
   * Initialize regional configurations
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      await this.loadRegionalConfigurations();
      this.initialized = true;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get countries for a given region
   */
  public getCountriesForRegion(region: string): string[] {
    // Map regions to countries
    const regionCountriesMap: Record<string, string[]> = {
      'us': ['United States'],
      'uk': ['United Kingdom', 'England', 'Scotland', 'Wales', 'Northern Ireland'],
      'eu': ['Germany', 'France', 'Spain', 'Italy', 'Netherlands', 'Belgium', 'Austria', 'Portugal', 'Greece', 'Ireland', 'Poland', 'Czech Republic', 'Hungary', 'Finland', 'Sweden', 'Denmark', 'Norway'],
      'canada': ['Canada'],
      'australia': ['Australia', 'New Zealand'],
      'asia': ['Japan', 'South Korea', 'Singapore', 'Hong Kong', 'Taiwan', 'Malaysia', 'Thailand', 'India', 'China'],
      'middle_east': ['United Arab Emirates', 'Saudi Arabia', 'Israel', 'Qatar', 'Kuwait', 'Bahrain'],
      'latin_america': ['Mexico', 'Brazil', 'Argentina', 'Chile', 'Colombia', 'Peru', 'Venezuela'],
      'africa': ['South Africa', 'Nigeria', 'Kenya', 'Ghana', 'Morocco', 'Egypt']
    };

    return regionCountriesMap[region.toLowerCase()] || [];
  }

  /**
   * Optimize CV for specific region
   */
  async optimizeForRegion(request: RegionalOptimizationRequest): Promise<RegionalOptimizationResult> {
    const startTime = Date.now();

    await this.initialize();

    const regionConfig = this.regionalConfigs.get(request.targetRegion.toLowerCase());
    if (!regionConfig) {
      throw new Error(`Unsupported region: ${request.targetRegion}`);
    }

    try {
      // Calculate regional compatibility score
      const regionScore = await this.scoreCalculator.calculateRegionalScore(request.cvData, regionConfig);

      // Check legal compliance
      const legalCompliance = await this.complianceChecker.checkLegalCompliance(request.cvData, regionConfig);

      // Generate cultural optimizations
      const culturalOptimization = await this.culturalOptimizer.generateCulturalOptimizations(
        request.cvData,
        regionConfig
      );

      // Get market insights
      const marketInsights = this.getMarketInsights(regionConfig);

      // Generate localized recommendations
      const localizedRecommendations = this.generateRecommendations(
        legalCompliance,
        culturalOptimization,
        regionConfig,
        request
      );

      // Determine cultural fit
      const culturalFit = this.determineCulturalFit(regionScore.overall);

      // Generate optimized CV if requested
      const optimizedCV = await this.generateOptimizedCV(request.cvData, legalCompliance, culturalOptimization);

      // Calculate confidence score
      const confidence = this.calculateConfidence(regionScore, legalCompliance, culturalOptimization);

      const processingTime = Date.now() - startTime;

      return {
        regionScore: regionScore.overall,
        culturalFit,
        legalCompliance,
        culturalOptimization,
        marketInsights,
        localizedRecommendations,
        optimizedCV,
        confidence,
        processingMetadata: {
          processedAt: new Date(),
          version: '1.0.0',
          processingTime
        }
      };

    } catch (error) {
      console.error('Regional optimization failed:', error);
      throw new Error(`Failed to optimize CV for region ${request.targetRegion}: ${error.message}`);
    }
  }

  /**
   * Get list of supported regions
   */
  getSupportedRegions(): string[] {
    return Array.from(this.regionalConfigs.keys());
  }

  /**
   * Get regional configuration for a specific region
   */
  async getRegionalConfiguration(regionId: string): Promise<RegionalConfiguration | null> {
    await this.initialize();
    return this.regionalConfigs.get(regionId.toLowerCase()) || null;
  }

  /**
   * Load regional configurations from database
   */
  private async loadRegionalConfigurations(): Promise<void> {
    try {
      const configsSnapshot = await db.collection('regional_configurations').get();

      configsSnapshot.docs.forEach(doc => {
        const config = doc.data() as RegionalConfiguration;
        this.regionalConfigs.set(doc.id.toLowerCase(), config);
      });

      // Add default configurations if none exist
      if (this.regionalConfigs.size === 0) {
        this.addDefaultConfigurations();
      }

    } catch (error) {
      console.warn('Failed to load regional configurations from database, using defaults:', error);
      this.addDefaultConfigurations(); // Fallback to defaults
    }
  }

  private getMarketInsights(regionConfig: RegionalConfiguration) {
    const networkingValue = regionConfig.culturalFactors?.networkingImportance || 0;
    const networkingImportance: 'low' | 'medium' | 'high' =
      networkingValue > 0.7 ? 'high' : networkingValue > 0.4 ? 'medium' : 'low';

    const competitiveAdvantages = this.generateCompetitiveAdvantages(regionConfig);
    const marketChallenges = this.generateMarketChallenges(regionConfig);

    return {
      popularIndustries: regionConfig.marketData?.topIndustries?.map((i: any) => i.industry) || [],
      averageJobSearchDuration: regionConfig.marketData?.averageJobSearchDuration || 90,
      networkingImportance,
      remoteWorkAdoption: regionConfig.applicationPreferences?.remoteWorkAcceptance || 0.5,
      salaryExpectations: {
        expectationLevel: 'market_rate' as const,
        currencyPreference: regionConfig.currency || 'USD',
        negotiationCulture: 'subtle' as const,
        benefitsImportance: 0.7,
        salaryTransparency: 'optional' as const
      },
      competitiveAdvantages,
      marketChallenges
    };
  }

  private generateCompetitiveAdvantages(regionConfig: RegionalConfiguration): string[] {
    const advantages: string[] = [];

    if (regionConfig.culturalFactors?.networkingImportance && regionConfig.culturalFactors.networkingImportance > 0.7) {
      advantages.push('Strong networking culture provides relationship-building opportunities');
    }

    if (regionConfig.marketData?.economicGrowth && regionConfig.marketData.economicGrowth > 3) {
      advantages.push('Strong economic growth creates expanding job opportunities');
    }

    if (regionConfig.applicationPreferences?.remoteWorkAcceptance && regionConfig.applicationPreferences.remoteWorkAcceptance > 0.6) {
      advantages.push('High remote work adoption provides flexible opportunities');
    }

    return advantages.length > 0 ? advantages : ['Stable market conditions', 'Professional development opportunities'];
  }

  private generateMarketChallenges(regionConfig: RegionalConfiguration): string[] {
    const challenges: string[] = [];

    if (regionConfig.marketData?.competitiveness && regionConfig.marketData.competitiveness > 0.8) {
      challenges.push('Highly competitive job market requires strong differentiation');
    }

    if (regionConfig.marketData?.unemploymentRate && regionConfig.marketData.unemploymentRate > 6) {
      challenges.push('Higher unemployment rate increases competition for positions');
    }

    if (regionConfig.applicationPreferences?.averageTimeToHire && regionConfig.applicationPreferences.averageTimeToHire > 60) {
      challenges.push('Longer hiring processes require patience and persistence');
    }

    return challenges.length > 0 ? challenges : ['Standard market conditions require professional presentation'];
  }

  private generateRecommendations(
    legalCompliance: any,
    culturalOptimization: any,
    regionConfig: RegionalConfiguration,
    request: RegionalOptimizationRequest
  ): LocalizedRecommendation[] {
    const recommendations: LocalizedRecommendation[] = [];

    // Add compliance recommendations
    for (const issue of legalCompliance.issues) {
      recommendations.push({
        category: 'legal',
        priority: issue.severity === 'critical' ? 1 : issue.severity === 'error' ? 2 : 3,
        title: 'Legal Compliance Issue',
        description: issue.description,
        actionItems: [issue.solution],
        culturalContext: `Required for compliance in ${regionConfig.regionName || regionConfig.regionId}`,
        impact: issue.severity === 'critical' ? 0.9 : issue.severity === 'error' ? 0.7 : 0.5,
        difficulty: issue.autoFixAvailable ? 'easy' : 'moderate',
        timeToImplement: issue.autoFixAvailable ? 'immediate' : 'short'
      });
    }

    // Add format recommendations
    for (const adjustment of culturalOptimization.formatAdjustments) {
      recommendations.push({
        category: 'format',
        priority: adjustment.importance === 'critical' ? 1 : adjustment.importance === 'high' ? 2 : 3,
        title: `${adjustment.aspect} Adjustment`,
        description: adjustment.reason,
        actionItems: [`Change from "${adjustment.current}" to "${adjustment.recommended}"`],
        culturalContext: adjustment.culturalContext || adjustment.reason,
        impact: adjustment.importance === 'critical' ? 0.8 : adjustment.importance === 'high' ? 0.6 : 0.4,
        difficulty: adjustment.autoApplyAvailable ? 'easy' : 'moderate',
        timeToImplement: adjustment.autoApplyAvailable ? 'immediate' : 'short'
      });
    }

    // Add content recommendations
    for (const adjustment of culturalOptimization.contentAdjustments) {
      recommendations.push({
        category: 'cultural',
        priority: adjustment.priority === 'critical' ? 1 : adjustment.priority === 'high' ? 2 : 3,
        title: `Content: ${adjustment.section}`,
        description: adjustment.description,
        actionItems: adjustment.examples || [adjustment.description],
        culturalContext: adjustment.culturalReason,
        impact: adjustment.impact,
        difficulty: adjustment.autoApplyAvailable ? 'easy' : 'moderate',
        timeToImplement: adjustment.type === 'add' ? 'medium' : 'short'
      });
    }

    // Add strategic recommendations based on industry and role
    if (request.industry && request.jobRole) {
      recommendations.push(...this.generateStrategicRecommendations(request, regionConfig));
    }

    return recommendations.sort((a, b) => a.priority - b.priority);
  }

  private generateStrategicRecommendations(
    request: RegionalOptimizationRequest,
    regionConfig: RegionalConfiguration
  ): LocalizedRecommendation[] {
    const recommendations: LocalizedRecommendation[] = [];

    // Industry-specific recommendations
    if (regionConfig.marketData?.topIndustries) {
      const isInDemandIndustry = regionConfig.marketData.topIndustries.some(
        (industry: any) => industry.industry.toLowerCase().includes(request.industry?.toLowerCase())
      );

      if (isInDemandIndustry) {
        recommendations.push({
          category: 'strategy',
          priority: 2,
          title: 'Industry Advantage',
          description: 'Your industry is in high demand in this region',
          actionItems: [
            'Emphasize industry-specific skills and experience',
            'Highlight relevant certifications and achievements',
            'Consider mentioning industry trends and knowledge'
          ],
          culturalContext: 'This region has strong growth in your industry sector',
          impact: 0.7,
          difficulty: 'easy',
          timeToImplement: 'short'
        });
      }
    }

    // Networking recommendations
    if (regionConfig.culturalFactors?.networkingImportance && regionConfig.culturalFactors.networkingImportance > 0.6) {
      recommendations.push({
        category: 'networking',
        priority: 3,
        title: 'Networking Strategy',
        description: 'Networking is highly valued in this region',
        actionItems: [
          'Include professional associations and memberships',
          'Mention speaking engagements or industry events',
          'Consider adding LinkedIn profile prominently'
        ],
        culturalContext: 'Strong networking culture values professional relationships',
        impact: 0.6,
        difficulty: 'moderate',
        timeToImplement: 'medium'
      });
    }

    return recommendations;
  }

  private determineCulturalFit(regionScore: number): 'excellent' | 'good' | 'fair' | 'needs_improvement' {
    if (regionScore >= 0.9) return 'excellent';
    if (regionScore >= 0.75) return 'good';
    if (regionScore >= 0.6) return 'fair';
    return 'needs_improvement';
  }

  private async generateOptimizedCV(
    originalCV: ParsedCV,
    legalCompliance: any,
    culturalOptimization: any
  ): Promise<ParsedCV> {
    // Clone the original CV
    const optimizedCV = JSON.parse(JSON.stringify(originalCV));

    // Apply auto-fixable compliance issues
    if (legalCompliance.issues) {
      const { fixedCV } = await this.complianceChecker.autoFixCompliance(optimizedCV, legalCompliance.issues);
      Object.assign(optimizedCV, fixedCV);
    }

    // Apply auto-fixable format adjustments
    for (const adjustment of culturalOptimization.formatAdjustments) {
      if (adjustment.autoApplyAvailable) {
        this.applyFormatAdjustment(optimizedCV, adjustment);
      }
    }

    // Apply auto-fixable content adjustments
    for (const adjustment of culturalOptimization.contentAdjustments) {
      if (adjustment.autoApplyAvailable && adjustment.type === 'remove') {
        this.applyContentAdjustment(optimizedCV, adjustment);
      }
    }

    return optimizedCV;
  }

  private applyFormatAdjustment(cv: ParsedCV, adjustment: any): void {
    // Apply format adjustments based on type
    switch (adjustment.aspect) {
      case 'photo':
        if (adjustment.recommended === 'Remove photo' && cv.personalInfo?.photo) {
          delete cv.personalInfo.photo;
        }
        break;
      // Add other format adjustments as needed
    }
  }

  private applyContentAdjustment(cv: ParsedCV, adjustment: any): void {
    // Apply content adjustments based on type
    if (adjustment.type === 'remove') {
      // Remove sections as needed
      const sectionMap: Record<string, keyof ParsedCV> = {
        'photo': 'personalInfo',
        'references': 'references',
        'personal_info': 'personalInfo'
      };

      const sectionKey = sectionMap[adjustment.section];
      if (sectionKey && adjustment.section === 'photo' && cv.personalInfo) {
        delete cv.personalInfo.photo;
      }
    }
  }

  private calculateConfidence(regionScore: any, legalCompliance: any, culturalOptimization: any): number {
    let confidence = 0.8; // Base confidence

    // Adjust based on compliance issues
    if (legalCompliance.criticalViolations && legalCompliance.criticalViolations.length > 0) {
      confidence -= 0.3;
    } else if (legalCompliance.issues && legalCompliance.issues.length > 3) {
      confidence -= 0.2;
    }

    // Adjust based on cultural fit
    if (regionScore.overall > 0.8) {
      confidence += 0.1;
    } else if (regionScore.overall < 0.5) {
      confidence -= 0.2;
    }

    // Adjust based on optimization complexity
    const totalAdjustments = culturalOptimization.formatAdjustments.length +
                           culturalOptimization.contentAdjustments.length +
                           culturalOptimization.languageOptimization.length;

    if (totalAdjustments > 10) {
      confidence -= 0.1;
    }

    return Math.max(0.1, Math.min(1.0, confidence));
  }

  private addDefaultConfigurations(): void {
    // Add basic default configurations for common regions
    const defaultRegions = ['us', 'uk', 'eu', 'canada', 'australia'];

    defaultRegions.forEach(region => {
      if (!this.regionalConfigs.has(region)) {
        this.regionalConfigs.set(region, this.createDefaultConfig(region));
      }
    });
  }

  private createDefaultConfig(region: string): RegionalConfiguration {
    return {
      regionId: region,
      regionName: region.toUpperCase(),
      countryCode: region.toUpperCase(),
      languageCode: 'en',
      currency: region === 'us' ? 'USD' : region === 'uk' ? 'GBP' : 'EUR',
      marketData: {
        unemploymentRate: 5.0,
        averageSalary: 50000,
        costOfLiving: 100,
        economicGrowth: 2.0,
        inflationRate: 2.5,
        averageJobSearchDuration: 30,
        competitiveness: 0.7,
        topIndustries: [],
        skillsInDemand: []
      },
      applicationPreferences: {
        applicationMethods: ['email', 'online_form'],
        followUpCulture: 'neutral',
        responseTime: {
          average: 14,
          acceptable: 30
        }
      },
      formatPreferences: {
        photoRequired: region === 'eu',
        preferredLength: region === 'us' ? 1 : 2,
        dateFormat: region === 'us' ? 'MM/DD/YYYY' : 'DD/MM/YYYY',
        cvFormat: 'chronological',
        fileFormats: ['pdf', 'docx']
      },
      contentGuidelines: {
        requiredSections: ['personal_info', 'experience', 'education'],
        discouragedSections: region === 'us' ? ['photo', 'age'] : [],
        personalStatementRequired: region !== 'us',
        referencesRequired: region === 'uk'
      },
      languageGuidelines: {
        formalityLevel: 'formal',
        preferredTerminology: [],
        cvTerminology: region === 'us' ? 'Resume' : 'CV',
        businessLanguage: 'English'
      },
      legalRestrictions: {
        prohibitedInfo: region === 'us' ? ['age', 'marital_status', 'photo', 'gender'] : [],
        photoRequired: false,
        workPermitRequired: true,
        discriminationLaws: ['Equal Employment Opportunity'],
        dataPrivacyRegulations: region === 'eu' ? ['GDPR'] : []
      },
      culturalFactors: {
        workCulture: 'mixed',
        communicationStyle: 'direct',
        businessFormality: 'formal',
        interviewStyle: 'mixed',
        dresscode: 'business_casual',
        networkingImportance: 0.6,
        referralImpact: 0.4
      }
    };
  }
}

// Export singleton instance
export const regionalOptimizationService = RegionalOptimizationService.getInstance();