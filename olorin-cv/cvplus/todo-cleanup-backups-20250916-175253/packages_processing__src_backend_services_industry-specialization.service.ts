// @ts-ignore
/**
 * Industry Specialization Service
 * 
 * Provides industry-specific CV optimization and predictions
 * for the 10 priority industries in Phase 2.
  */

import * as admin from 'firebase-admin';
import { IndustryModel, SkillDefinition, CareerPath, CompanyProfile } from '../../types/phase2-models';
// import ... from "../types/job"; // TODO: Restore after job types migration

// Initialize admin if not already done
if (!admin.apps.length) {
  admin.initializeApp();
}

export interface IndustryOptimizationRequest {
  userId: string;
  cvData: ParsedCV;
  targetIndustry: string;
  targetRole?: string;
  experienceLevel?: 'entry' | 'mid' | 'senior' | 'executive';
  region?: string;
}

export interface IndustryOptimizationResult {
  industryScore: number;
  industryFit: 'excellent' | 'good' | 'fair' | 'poor';
  missingSkills: SkillDefinition[];
  skillGaps: {
    critical: string[];
    important: string[];
    nice_to_have: string[];
  };
  recommendations: IndustryRecommendation[];
  salaryBenchmark: {
    min: number;
    max: number;
    median: number;
    percentile: number;
  };
  careerPath: CareerPath;
  marketInsights: {
    growth: number;
    demand: 'low' | 'medium' | 'high';
    competitiveness: 'low' | 'medium' | 'high';
    trends: string[];
  };
  topCompanies: CompanyProfile[];
}

export interface IndustryRecommendation {
  type: 'skill' | 'certification' | 'experience' | 'project' | 'keyword';
  priority: 1 | 2 | 3 | 4 | 5;
  title: string;
  description: string;
  impact: number; // 0-1 score improvement potential
  effort: 'low' | 'medium' | 'high';
  timeframe: string;
  resources?: string[];
}

export class IndustrySpecializationService {
  private static instance: IndustrySpecializationService;
  private industryModels = new Map<string, IndustryModel>();
  private initialized = false;

  public static getInstance(): IndustrySpecializationService {
    if (!IndustrySpecializationService.instance) {
      IndustrySpecializationService.instance = new IndustrySpecializationService();
    }
    return IndustrySpecializationService.instance;
  }

  /**
   * Initialize industry models and knowledge bases
    */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      await this.loadIndustryModels();
      this.initialized = true;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Optimize CV for specific industry
    */
  async optimizeForIndustry(request: IndustryOptimizationRequest): Promise<IndustryOptimizationResult> {
    await this.initialize();

    const industryModel = this.industryModels.get(request.targetIndustry.toLowerCase());
    if (!industryModel) {
      throw new Error(`Unsupported industry: ${request.targetIndustry}`);
    }

    // Calculate industry-specific score
    const industryScore = await this.calculateIndustryScore(request.cvData, industryModel);
    
    // Analyze skill gaps
    const skillGaps = await this.analyzeSkillGaps(request.cvData, industryModel);
    
    // Generate recommendations
    const recommendations = await this.generateIndustryRecommendations(
      request.cvData, 
      industryModel, 
      skillGaps,
      request.experienceLevel
    );
    
    // Get salary benchmark
    const salaryBenchmark = await this.getSalaryBenchmark(
      industryModel,
      request.experienceLevel || 'mid',
      request.region || 'US'
    );
    
    // Get career path
    const careerPath = this.getRecommendedCareerPath(request.cvData, industryModel);
    
    // Get market insights
    const marketInsights = await this.getMarketInsights(industryModel);

    return {
      industryScore: Math.round(industryScore),
      industryFit: this.calculateIndustryFit(industryScore),
      missingSkills: skillGaps.missing,
      skillGaps: {
        critical: skillGaps.critical,
        important: skillGaps.important,
        nice_to_have: skillGaps.niceToHave
      },
      recommendations,
      salaryBenchmark,
      careerPath,
      marketInsights,
      topCompanies: this.getTopCompanies(industryModel)
    };
  }

  /**
   * Get supported industries
    */
  getSupportedIndustries(): string[] {
    return [
      'Technology',
      'Finance',
      'Healthcare',
      'Marketing',
      'Sales',
      'Consulting',
      'Education',
      'Engineering',
      'Legal',
      'Manufacturing'
    ];
  }

  /**
   * Load industry models from configuration
    */
  private async loadIndustryModels(): Promise<void> {
    const industries = [
      await this.createTechnologyModel(),
      await this.createFinanceModel(),
      await this.createHealthcareModel(),
      await this.createMarketingModel(),
      await this.createSalesModel(),
      await this.createConsultingModel(),
      await this.createEducationModel(),
      await this.createEngineeringModel(),
      await this.createLegalModel(),
      await this.createManufacturingModel()
    ];

    industries.forEach(model => {
      if (model.industry) {
        this.industryModels.set(model.industry.toLowerCase(), model);
      }
    });
  }

  /**
   * Calculate industry-specific score
    */
  private async calculateIndustryScore(cv: ParsedCV, model: IndustryModel): Promise<number> {
    let score = 0;

    // Skills analysis (40% weight)
    const skillsScore = this.calculateSkillsScore(cv, model);
    score += skillsScore * 0.4;

    // Experience analysis (30% weight)
    const experienceScore = this.calculateExperienceScore(cv, model);
    score += experienceScore * 0.3;

    // Education analysis (20% weight)
    const educationScore = this.calculateEducationScore(cv, model);
    score += educationScore * 0.2;

    // Certifications analysis (10% weight)
    const certificationScore = this.calculateCertificationScore(cv, model);
    score += certificationScore * 0.1;

    return score * 100; // Convert to 0-100 scale
  }

  private getSkillsArray(skills: string[] | { [key: string]: string[] | undefined; technical?: string[]; soft?: string[]; languages?: string[]; tools?: string[]; frontend?: string[]; backend?: string[]; databases?: string[]; cloud?: string[]; competencies?: string[]; frameworks?: string[]; expertise?: string[]; } | undefined): string[] {
    if (!skills) return [];
    if (Array.isArray(skills)) return skills;
    
    // Combine all skill categories
    const allSkills: string[] = [];
    const categories = ['technical', 'soft', 'languages', 'tools', 'frontend', 'backend', 'databases', 'cloud', 'competencies', 'frameworks', 'expertise'];
    
    for (const category of categories) {
      if (skills[category] && Array.isArray(skills[category])) {
        allSkills.push(...skills[category]);
      }
    }
    
    return allSkills;
  }

  private calculateSkillsScore(cv: ParsedCV, model: IndustryModel): number {
    const userSkills = this.getSkillsArray(cv.skills);
    const coreSkills = model.coreSkills || [];
    const emergingSkills = model.emergingSkills || [];

    let score = 0;
    let totalWeight = 0;

    // Check core skills (weight: 1.0)
    coreSkills.forEach((skill: SkillDefinition) => {
      totalWeight += 1.0;
      if (this.hasSkill(userSkills, skill)) {
        score += skill.demandLevel;
      }
    });

    // Check emerging skills (weight: 0.6)
    emergingSkills.forEach((skill: SkillDefinition) => {
      totalWeight += 0.6;
      if (this.hasSkill(userSkills, skill)) {
        score += skill.demandLevel * 0.6;
      }
    });

    return totalWeight > 0 ? score / totalWeight : 0;
  }

  private calculateExperienceScore(cv: ParsedCV, model: IndustryModel): number {
    const experience = cv.experience || [];
    if (experience.length === 0) return 0;

    let relevanceScore = 0;
    let totalYears = 0;

    experience.forEach(exp => {
      const years = this.calculateExperienceYears(exp);
      totalYears += years;

      // Calculate relevance to industry
      const relevance = this.calculateExperienceRelevance(exp, model);
      relevanceScore += relevance * years;
    });

    const avgRelevance = totalYears > 0 ? relevanceScore / totalYears : 0;
    const yearsFactor = Math.min(1, totalYears / 5); // Cap at 5 years for full score

    return avgRelevance * yearsFactor;
  }

  private calculateEducationScore(cv: ParsedCV, model: IndustryModel): number {
    const education = cv.education || [];
    if (education.length === 0) return 0.3; // Base score for work experience only

    let maxScore = 0;

    education.forEach((edu: any) => {
      const degreeRelevance = this.calculateEducationRelevance(edu, model);
      const prestige = this.calculateInstitutionPrestige(edu.institution);
      const score = (degreeRelevance * 0.8) + (prestige * 0.2);
      maxScore = Math.max(maxScore, score);
    });

    return maxScore;
  }

  private calculateCertificationScore(cv: ParsedCV, model: IndustryModel): number {
    const certifications = cv.certifications || [];
    if (certifications.length === 0) return 0;

    let score = 0;
    let count = 0;

    certifications.forEach((cert: any) => {
      const relevance = this.calculateCertificationRelevance(cert, model);
      if (relevance > 0.3) { // Only count relevant certifications
        score += relevance;
        count++;
      }
    });

    return count > 0 ? Math.min(1, score / count) : 0;
  }

  /**
   * Analyze skill gaps for industry
    */
  private async analyzeSkillGaps(cv: ParsedCV, model: IndustryModel): Promise<{
    missing: SkillDefinition[];
    critical: string[];
    important: string[];
    niceToHave: string[];
  }> {
    const userSkills = this.getSkillsArray(cv.skills);
    const coreSkills = model.coreSkills || [];
    const emergingSkills = model.emergingSkills || [];

    const missing: SkillDefinition[] = [];
    const critical: string[] = [];
    const important: string[] = [];
    const niceToHave: string[] = [];

    // Check core skills
    coreSkills.forEach(skill => {
      if (!this.hasSkill(userSkills, skill)) {
        missing.push(skill);
        const skillName = skill.name || skill.skillName;
        if (skill.demandLevel > 0.8) {
          critical.push(skillName);
        } else if (skill.demandLevel > 0.6) {
          important.push(skillName);
        } else {
          niceToHave.push(skillName);
        }
      }
    });

    // Check emerging skills
    emergingSkills.forEach(skill => {
      if (!this.hasSkill(userSkills, skill)) {
        missing.push(skill);
        const skillName = skill.name || skill.skillName;
        if (skill.demandLevel > 0.7) {
          important.push(skillName);
        } else {
          niceToHave.push(skillName);
        }
      }
    });

    return {
      missing,
      critical,
      important,
      niceToHave
    };
  }

  private hasSkill(userSkills: string[], targetSkill: SkillDefinition): boolean {
    const userSkillsLower = userSkills.map(s => s.toLowerCase());
    
    // Check exact match with primary name
    const skillName = targetSkill.name || targetSkill.skillName;
    if (skillName && userSkillsLower.includes(skillName.toLowerCase())) {
      return true;
    }

    // Check alternative names
    return targetSkill.alternativeNames?.some(alt => 
      userSkillsLower.includes(alt.toLowerCase())
    ) || false;
  }

  private calculateIndustryFit(score: number): 'excellent' | 'good' | 'fair' | 'poor' {
    if (score >= 85) return 'excellent';
    if (score >= 70) return 'good';
    if (score >= 50) return 'fair';
    return 'poor';
  }

  // Helper methods for analysis
  private calculateExperienceYears(_exp: any): number {
    // Simple implementation - in real scenario, parse dates properly
    return 2; // Default 2 years per role
  }

  private calculateExperienceRelevance(exp: any, model: IndustryModel): number {
    // Simple relevance calculation based on job title/company
    const title = exp.position?.toLowerCase() || '';
    const company = exp.company?.toLowerCase() || '';
    
    // Check if role title or company matches industry
    const industryKeywords = model.industry?.toLowerCase().split(' ') || [];
    const hasIndustryKeyword = industryKeywords.some(keyword => 
      title.includes(keyword) || company.includes(keyword)
    );
    
    return hasIndustryKeyword ? 0.8 : 0.3;
  }

  private calculateEducationRelevance(edu: any, model: IndustryModel): number {
    // Simple relevance based on degree field
    const field = edu.field?.toLowerCase() || edu.degree?.toLowerCase() || '';
    const industryKeywords = model.industry?.toLowerCase().split(' ') || [];
    
    const hasRelevantField = industryKeywords.some(keyword => field.includes(keyword));
    return hasRelevantField ? 0.9 : 0.5;
  }

  private calculateInstitutionPrestige(institution: string): number {
    // Simple prestige calculation
    const prestigiousInstitutions = [
      'harvard', 'mit', 'stanford', 'berkeley', 'carnegie mellon',
      'oxford', 'cambridge', 'eth zurich', 'toronto', 'waterloo'
    ];
    
    const instLower = institution.toLowerCase();
    return prestigiousInstitutions.some(prestigious => instLower.includes(prestigious)) ? 1.0 : 0.7;
  }

  private calculateCertificationRelevance(cert: any, model: IndustryModel): number {
    // Simple certification relevance
    const certName = cert.name?.toLowerCase() || cert.certification?.toLowerCase() || '';
    const industryKeywords = model.industry?.toLowerCase().split(' ') || [];
    
    const hasRelevantKeyword = industryKeywords.some(keyword => certName.includes(keyword));
    return hasRelevantKeyword ? 0.8 : 0.3;
  }

  // Industry model factories
  private async createTechnologyModel(): Promise<IndustryModel> {
    return {
      industry: 'Technology',
      coreSkills: [
        { 
          skillId: 'programming', 
          skillName: 'Programming', 
          skillCategory: 'technical', 
          level: 'intermediate', 
          priority: 'essential', 
          demandLevel: 0.9, 
          salaryImpact: 15, 
          learningPath: { estimatedHours: 200, difficulty: 'hard', prerequisites: [], resources: [] },
          relatedSkills: [], 
          complementarySkills: [], 
          relevantIndustries: ['Technology'], 
          relevantRoles: [],
          name: 'Programming', 
          alternativeNames: ['Coding', 'Software Development'] 
        },
        { 
          skillId: 'javascript', 
          skillName: 'JavaScript', 
          skillCategory: 'technical', 
          level: 'intermediate', 
          priority: 'essential', 
          demandLevel: 0.8, 
          salaryImpact: 10, 
          learningPath: { estimatedHours: 100, difficulty: 'medium', prerequisites: [], resources: [] },
          relatedSkills: [], 
          complementarySkills: [], 
          relevantIndustries: ['Technology'], 
          relevantRoles: [],
          name: 'JavaScript', 
          alternativeNames: ['JS'] 
        },
        { 
          skillId: 'python', 
          skillName: 'Python', 
          skillCategory: 'technical', 
          level: 'intermediate', 
          priority: 'essential', 
          demandLevel: 0.8, 
          salaryImpact: 12, 
          learningPath: { estimatedHours: 80, difficulty: 'medium', prerequisites: [], resources: [] },
          relatedSkills: [], 
          complementarySkills: [], 
          relevantIndustries: ['Technology'], 
          relevantRoles: [],
          name: 'Python', 
          alternativeNames: ['Python3'] 
        },
        { 
          skillId: 'git', 
          skillName: 'Git', 
          skillCategory: 'technical', 
          level: 'beginner', 
          priority: 'important', 
          demandLevel: 0.7, 
          salaryImpact: 5, 
          learningPath: { estimatedHours: 20, difficulty: 'easy', prerequisites: [], resources: [] },
          relatedSkills: [], 
          complementarySkills: [], 
          relevantIndustries: ['Technology'], 
          relevantRoles: [],
          name: 'Git', 
          alternativeNames: ['Version Control'] 
        }
      ],
      emergingSkills: [
        { 
          skillId: 'ml', 
          skillName: 'Machine Learning', 
          skillCategory: 'technical', 
          level: 'advanced', 
          priority: 'important', 
          demandLevel: 0.8, 
          salaryImpact: 20, 
          learningPath: { estimatedHours: 300, difficulty: 'hard', prerequisites: [], resources: [] },
          relatedSkills: [], 
          complementarySkills: [], 
          relevantIndustries: ['Technology'], 
          relevantRoles: [],
          name: 'Machine Learning', 
          alternativeNames: ['ML', 'AI'] 
        },
        { 
          skillId: 'cloud', 
          skillName: 'Cloud Computing', 
          skillCategory: 'technical', 
          level: 'intermediate', 
          priority: 'important', 
          demandLevel: 0.7, 
          salaryImpact: 15, 
          learningPath: { estimatedHours: 150, difficulty: 'medium', prerequisites: [], resources: [] },
          relatedSkills: [], 
          complementarySkills: [], 
          relevantIndustries: ['Technology'], 
          relevantRoles: [],
          name: 'Cloud Computing', 
          alternativeNames: ['AWS', 'Azure'] 
        }
      ]
    };
  }

  private async createFinanceModel(): Promise<IndustryModel> {
    return {
      industry: 'Finance',
      coreSkills: [
        { 
          skillId: 'financial-analysis', 
          skillName: 'Financial Analysis', 
          skillCategory: 'domain', 
          level: 'intermediate', 
          priority: 'essential', 
          demandLevel: 0.9, 
          salaryImpact: 20, 
          learningPath: { estimatedHours: 150, difficulty: 'medium', prerequisites: [], resources: [] },
          relatedSkills: [], 
          complementarySkills: [], 
          relevantIndustries: ['Finance'], 
          relevantRoles: [],
          name: 'Financial Analysis', 
          alternativeNames: ['Financial Modeling'] 
        }
      ],
      emergingSkills: [
        { 
          skillId: 'fintech', 
          skillName: 'FinTech', 
          skillCategory: 'domain', 
          level: 'advanced', 
          priority: 'important', 
          demandLevel: 0.7, 
          salaryImpact: 15, 
          learningPath: { estimatedHours: 100, difficulty: 'medium', prerequisites: [], resources: [] },
          relatedSkills: [], 
          complementarySkills: [], 
          relevantIndustries: ['Finance'], 
          relevantRoles: [],
          name: 'FinTech', 
          alternativeNames: ['Financial Technology'] 
        }
      ]
    };
  }

  private async createHealthcareModel(): Promise<IndustryModel> {
    return {
      industry: 'Healthcare',
      coreSkills: [],
      emergingSkills: []
    };
  }

  private async createMarketingModel(): Promise<IndustryModel> {
    return {
      industry: 'Marketing',
      coreSkills: [],
      emergingSkills: []
    };
  }

  private async createSalesModel(): Promise<IndustryModel> {
    return {
      industry: 'Sales',
      coreSkills: [],
      emergingSkills: []
    };
  }

  private async createConsultingModel(): Promise<IndustryModel> {
    return {
      industry: 'Consulting',
      coreSkills: [],
      emergingSkills: []
    };
  }

  private async createEducationModel(): Promise<IndustryModel> {
    return {
      industry: 'Education',
      coreSkills: [],
      emergingSkills: []
    };
  }

  private async createEngineeringModel(): Promise<IndustryModel> {
    return {
      industry: 'Engineering',
      coreSkills: [],
      emergingSkills: []
    };
  }

  private async createLegalModel(): Promise<IndustryModel> {
    return {
      industry: 'Legal',
      coreSkills: [],
      emergingSkills: []
    };
  }

  private async createManufacturingModel(): Promise<IndustryModel> {
    return {
      industry: 'Manufacturing',
      coreSkills: [],
      emergingSkills: []
    };
  }

  // Additional helper methods
  private async generateIndustryRecommendations(
    cv: ParsedCV, 
    model: IndustryModel, 
    skillGaps: any,
    experienceLevel?: string
  ): Promise<IndustryRecommendation[]> {
    const recommendations: IndustryRecommendation[] = [];

    // Add skill recommendations for missing critical skills
    skillGaps.critical.forEach((skill: string, index: number) => {
      recommendations.push({
        type: 'skill',
        priority: (Math.min(index + 1, 5)) as 1 | 2 | 3 | 4 | 5,
        title: `Learn ${skill}`,
        description: `This is a critical skill for ${model.industry} industry`,
        impact: 0.8,
        effort: 'medium',
        timeframe: '3-6 months',
        resources: ['Online courses', 'Documentation']
      });
    });

    return recommendations.slice(0, 5); // Return top 5 recommendations
  }

  private async getSalaryBenchmark(
    model: IndustryModel, 
    experienceLevel: string, 
    region: string
  ): Promise<{ min: number; max: number; median: number; percentile: number; }> {
    // Simple salary benchmark based on experience level
    const baseSalaries = {
      entry: { min: 50000, max: 70000, median: 60000 },
      mid: { min: 70000, max: 120000, median: 95000 },
      senior: { min: 120000, max: 180000, median: 150000 },
      executive: { min: 180000, max: 300000, median: 240000 }
    };

    const salaryData = baseSalaries[experienceLevel as keyof typeof baseSalaries] || baseSalaries.mid;
    
    return {
      ...salaryData,
      percentile: 50 // Median percentile
    };
  }

  private getRecommendedCareerPath(_cv: ParsedCV, _model: IndustryModel): CareerPath {
    // Return a basic career path
    return {
      pathId: `${_model.industry?.toLowerCase()}_path`,
      pathName: `${_model.industry} Career Path`,
      industryId: _model.industry || 'Unknown',
      levels: [],
      averageProgressionTime: 2,
      entryRequirements: {
        education: ['Bachelor\'s degree'],
        skills: ['Communication', 'Problem solving'],
        experience: 0
      },
      outcomes: {
        averageSalaryProgression: [50000, 70000, 90000, 120000],
        jobSatisfaction: 4.0,
        marketDemand: 0.7,
        workLifeBalance: 4.0
      },
      commonTransitions: []
    };
  }

  private async getMarketInsights(model: IndustryModel): Promise<{
    growth: number;
    demand: 'low' | 'medium' | 'high';
    competitiveness: 'low' | 'medium' | 'high';
    trends: string[];
  }> {
    return {
      growth: model.growthRate || 0.1,
      demand: 'medium',
      competitiveness: 'medium',
      trends: ['Digital transformation', 'Remote work', 'Automation']
    };
  }

  private getTopCompanies(model: IndustryModel): CompanyProfile[] {
    const defaultCompanies = ['Company A', 'Company B', 'Company C', 'Company D', 'Company E'];
    
    return defaultCompanies.map((company: string, index: number) => ({
      companyId: company.toLowerCase().replace(/\s+/g, '-'),
      companyName: company,
      industryId: model.industry || 'unknown',
      size: 'medium' as const,
      founded: new Date().getFullYear() - 10 - index,
      headquarters: 'Unknown',
      hiringData: {
        averageTimeToHire: 30,
        interviewProcess: ['Phone Screen', 'Technical Interview', 'Final Interview'],
        hiringVolume: 50,
        retentionRate: 85
      },
      compensationData: {
        salaryCompetitiveness: 1.1,
        benefitsRating: 4.0,
        equityOffered: true,
        bonusStructure: 'Performance-based'
      },
      workEnvironment: {
        remotePolicy: 'hybrid' as const,
        workLifeBalance: 4,
        cultureRating: 4.2,
        diversityScore: 3.8
      },
      growthOpportunities: {
        careerProgression: 4,
        learningBudget: 2000,
        mentorshipPrograms: true,
        internalMobility: 3.5
      },
      cultureMetrics: {
        workLifeBalance: 4,
        careerGrowth: 4,
        diversity: 3.8,
        innovation: 4.2
      },
      typicalRequirements: {
        preferredBackground: ['Bachelor\'s degree', 'Relevant experience'],
        commonSkills: ['Communication', 'Problem solving'],
        culturefit: ['Team collaboration', 'Growth mindset']
      }
    }));
  }
}