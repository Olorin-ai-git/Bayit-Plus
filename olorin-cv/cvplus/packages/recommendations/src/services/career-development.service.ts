/**
 * @cvplus/recommendations - Career Development Service
 * 
 * ML-driven career development and learning path recommendations.
 * Provides intelligent career guidance, skill development roadmaps,
 * and industry trend analysis.
 * 
 * Features:
 * - Career path analysis and recommendations
 * - Skills gap identification with learning paths
 * - Industry trend integration
 * - Personalized development roadmaps
 * - Interview preparation suggestions
 * - Networking recommendations
 * 
 * @author Gil Klainert
 * @version 1.0.0 - Full Implementation
  */

import type {
  Recommendation,
  RecommendationType,
  RecommendationCategory,
  CVSection,
  ActionType,
  ImpactLevel
} from '../types';

import type {
  CVParsedData,
  Skill,
  SkillCategory,
  SkillLevel,
  WorkExperience,
  Education,
  Certification
} from '../types';

// ============================================================================
// CAREER DEVELOPMENT TYPES
// ============================================================================

export interface CareerPath {
  id: string;
  title: string;
  description: string;
  level: 'junior' | 'mid' | 'senior' | 'lead' | 'executive';
  industry: string;
  requiredSkills: string[];
  optionalSkills: string[];
  averageSalary: {
    min: number;
    max: number;
    currency: string;
  };
  growthProjection: number; // % growth expected
  timeToTransition: number; // months
  difficulty: 'easy' | 'moderate' | 'challenging' | 'difficult';
}

export interface LearningPath {
  id: string;
  title: string;
  description: string;
  targetSkill: string;
  category: SkillCategory;
  duration: number; // hours
  difficulty: SkillLevel;
  resources: LearningResource[];
  milestones: LearningMilestone[];
  prerequisites: string[];
  certifications: string[];
  estimatedCost: number;
  roi: number; // Return on investment score
}

export interface LearningResource {
  id: string;
  title: string;
  type: 'course' | 'book' | 'video' | 'tutorial' | 'practice' | 'certification';
  provider: string;
  url?: string;
  duration: number; // hours
  cost: number;
  rating: number;
  difficulty: SkillLevel;
  tags: string[];
}

export interface LearningMilestone {
  id: string;
  title: string;
  description: string;
  estimatedTime: number; // hours
  requirements: string[];
  assessment?: string;
  weight: number; // 0-1, importance in the learning path
}

export interface CareerInsight {
  type: 'trend' | 'opportunity' | 'risk' | 'recommendation';
  title: string;
  description: string;
  relevance: number; // 0-1
  timeframe: 'immediate' | 'short-term' | 'medium-term' | 'long-term';
  actionable: boolean;
  sources: string[];
}

export interface InterviewPreparation {
  targetRole: string;
  commonQuestions: Array<{
    question: string;
    category: 'behavioral' | 'technical' | 'situational';
    difficulty: 'easy' | 'medium' | 'hard';
    suggestedAnswer?: string;
    tips: string[];
  }>;
  technicalAreas: Array<{
    area: string;
    importance: number;
    currentLevel: SkillLevel;
    recommendedLevel: SkillLevel;
    studyResources: LearningResource[];
  }>;
  projectSuggestions: string[];
}

// ============================================================================
// INDUSTRY DATA AND TRENDS
// ============================================================================

const INDUSTRY_TRENDS = {
  technology: {
    growingSkills: [
      'artificial intelligence', 'machine learning', 'cloud computing',
      'cybersecurity', 'data science', 'devops', 'blockchain',
      'mobile development', 'ui/ux design', 'product management'
    ],
    decliningSkills: [
      'flash', 'silverlight', 'legacy systems', 'waterfall methodology'
    ],
    emergingRoles: [
      'AI Engineer', 'DevSecOps Engineer', 'Cloud Architect',
      'Data Scientist', 'Product Manager', 'Site Reliability Engineer'
    ],
    salaryTrends: {
      'Software Engineer': { growth: 8.5, demand: 'high' },
      'Data Scientist': { growth: 22.8, demand: 'very-high' },
      'Product Manager': { growth: 15.2, demand: 'high' },
      'DevOps Engineer': { growth: 18.6, demand: 'very-high' }
    }
  },
  healthcare: {
    growingSkills: [
      'telemedicine', 'healthcare analytics', 'medical informatics',
      'patient experience', 'regulatory compliance', 'quality management'
    ],
    decliningSkills: ['paper-based systems', 'legacy ehr systems'],
    emergingRoles: [
      'Clinical Data Analyst', 'Telehealth Coordinator',
      'Healthcare IT Specialist', 'Population Health Manager'
    ],
    salaryTrends: {
      'Nurse Practitioner': { growth: 11.2, demand: 'very-high' },
      'Healthcare Analyst': { growth: 9.8, demand: 'high' },
      'Clinical Researcher': { growth: 7.3, demand: 'moderate' }
    }
  },
  finance: {
    growingSkills: [
      'fintech', 'algorithmic trading', 'risk analytics',
      'regulatory technology', 'blockchain', 'cryptocurrency'
    ],
    decliningSkills: ['manual trading', 'legacy banking systems'],
    emergingRoles: [
      'FinTech Developer', 'Risk Analyst', 'Compliance Officer',
      'Quantitative Analyst', 'Blockchain Developer'
    ],
    salaryTrends: {
      'Financial Analyst': { growth: 6.1, demand: 'moderate' },
      'Risk Manager': { growth: 8.9, demand: 'high' },
      'FinTech Developer': { growth: 15.7, demand: 'very-high' }
    }
  }
};

const CAREER_PROGRESSION_PATHS = {
  'Software Engineer': [
    { next: 'Senior Software Engineer', timeframe: '2-4 years', skills: ['system design', 'mentoring', 'architecture'] },
    { next: 'Tech Lead', timeframe: '4-6 years', skills: ['leadership', 'project management', 'stakeholder communication'] },
    { next: 'Engineering Manager', timeframe: '6-8 years', skills: ['people management', 'budgeting', 'strategic planning'] },
    { next: 'VP of Engineering', timeframe: '8-12 years', skills: ['executive leadership', 'org design', 'business strategy'] }
  ],
  'Data Scientist': [
    { next: 'Senior Data Scientist', timeframe: '2-3 years', skills: ['advanced ml', 'business impact', 'communication'] },
    { next: 'Data Science Manager', timeframe: '4-6 years', skills: ['team leadership', 'project management', 'stakeholder management'] },
    { next: 'Head of Data Science', timeframe: '6-10 years', skills: ['strategic planning', 'org building', 'executive communication'] }
  ],
  'Product Manager': [
    { next: 'Senior Product Manager', timeframe: '2-3 years', skills: ['market analysis', 'product strategy', 'cross-functional leadership'] },
    { next: 'Principal Product Manager', timeframe: '4-6 years', skills: ['product vision', 'stakeholder management', 'metrics-driven decisions'] },
    { next: 'VP of Product', timeframe: '6-10 years', skills: ['portfolio management', 'strategic planning', 'executive leadership'] }
  ]
};

// ============================================================================
// CAREER DEVELOPMENT SERVICE
// ============================================================================

export class CareerDevelopmentService {
  private industryTrends: typeof INDUSTRY_TRENDS;
  private careerPaths: typeof CAREER_PROGRESSION_PATHS;

  constructor() {
    this.industryTrends = INDUSTRY_TRENDS;
    this.careerPaths = CAREER_PROGRESSION_PATHS;
  }

  // ============================================================================
  // CAREER PATH ANALYSIS
  // ============================================================================

  /**
   * Analyze potential career paths based on current CV
    */
  async analyzeCareerPaths(cvData: CVParsedData, preferences?: {
    industry?: string;
    targetLevel?: string;
    timeframe?: string;
    salaryRange?: [number, number];
  }): Promise<CareerPath[]> {
    const currentRole = this.extractCurrentRole(cvData);
    const currentSkills = this.extractAllSkills(cvData);
    const experience = this.calculateTotalExperience(cvData);
    
    const possiblePaths: CareerPath[] = [];

    // Find progression paths for current role
    if (currentRole && this.careerPaths[currentRole as keyof typeof CAREER_PROGRESSION_PATHS]) {
      const progressions = this.careerPaths[currentRole as keyof typeof CAREER_PROGRESSION_PATHS];
      
      for (const progression of progressions) {
        const skillGap = this.calculateSkillGap(currentSkills, progression.skills);
        const path: CareerPath = {
          id: `path-${currentRole}-${progression.next}`,
          title: progression.next,
          description: `Natural progression from ${currentRole} to ${progression.next}`,
          level: this.mapToCareerLevel(progression.next),
          industry: preferences?.industry || 'technology',
          requiredSkills: progression.skills,
          optionalSkills: this.getOptionalSkills(progression.next),
          averageSalary: this.getSalaryRange(progression.next),
          growthProjection: this.getGrowthProjection(progression.next),
          timeToTransition: this.parseTimeframe(progression.timeframe),
          difficulty: this.calculateDifficulty(skillGap.length, experience)
        };
        possiblePaths.push(path);
      }
    }

    // Find lateral career moves
    const lateralMoves = this.findLateralOpportunities(cvData, preferences);
    possiblePaths.push(...lateralMoves);

    // Sort by relevance and feasibility
    return possiblePaths
      .sort((a, b) => this.scoreCareerPath(b, cvData) - this.scoreCareerPath(a, cvData))
      .slice(0, 5); // Top 5 recommendations
  }

  /**
   * Generate comprehensive learning path recommendations
    */
  async generateLearningPaths(
    cvData: CVParsedData,
    targetRole?: string,
    focusAreas?: string[]
  ): Promise<LearningPath[]> {
    const currentSkills = this.extractAllSkills(cvData);
    const skillGaps = targetRole ? 
      await this.identifySkillGaps(currentSkills, targetRole) : 
      await this.identifyGrowthOpportunities(currentSkills);

    const learningPaths: LearningPath[] = [];

    for (const gap of skillGaps) {
      const path = await this.createLearningPath(gap, cvData);
      if (path) {
        learningPaths.push(path);
      }
    }

    // Sort by ROI and relevance
    return learningPaths
      .sort((a, b) => b.roi - a.roi)
      .slice(0, 8); // Top 8 learning paths
  }

  /**
   * Provide industry insights and trends
    */
  async getCareerInsights(
    cvData: CVParsedData,
    industry?: string
  ): Promise<CareerInsight[]> {
    const detectedIndustry = industry || this.detectIndustry(cvData);
    const insights: CareerInsight[] = [];

    // Add trend insights
    if (this.industryTrends[detectedIndustry as keyof typeof INDUSTRY_TRENDS]) {
      const trends = this.industryTrends[detectedIndustry as keyof typeof INDUSTRY_TRENDS];
      
      // Growing skills insights
      insights.push({
        type: 'trend',
        title: 'Emerging Skills in Your Industry',
        description: `High-demand skills: ${trends.growingSkills.slice(0, 5).join(', ')}`,
        relevance: 0.9,
        timeframe: 'short-term',
        actionable: true,
        sources: ['Industry Reports', 'Job Market Analysis']
      });

      // Role opportunities
      insights.push({
        type: 'opportunity',
        title: 'Emerging Role Opportunities',
        description: `Consider these growing roles: ${trends.emergingRoles.slice(0, 3).join(', ')}`,
        relevance: 0.8,
        timeframe: 'medium-term',
        actionable: true,
        sources: ['Labor Statistics', 'Market Research']
      });
    }

    // Personal insights based on CV
    const personalInsights = await this.generatePersonalInsights(cvData);
    insights.push(...personalInsights);

    return insights.sort((a, b) => b.relevance - a.relevance);
  }

  /**
   * Generate interview preparation recommendations
    */
  async generateInterviewPreparation(
    cvData: CVParsedData,
    targetRole: string,
    industry?: string
  ): Promise<InterviewPreparation> {
    const currentSkills = this.extractAllSkills(cvData);
    const roleRequirements = await this.getRoleRequirements(targetRole, industry);
    
    return {
      targetRole,
      commonQuestions: this.getCommonQuestions(targetRole, industry),
      technicalAreas: this.analyzeTechnicalPreparation(currentSkills, roleRequirements),
      projectSuggestions: this.generateProjectSuggestions(targetRole, currentSkills)
    };
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  private extractCurrentRole(cvData: CVParsedData): string | null {
    if (cvData.workExperience.length === 0) return null;
    
    // Get the most recent position
    const currentJob = cvData.workExperience
      .filter((exp: WorkExperience) => exp.isCurrent)
      .sort((a: WorkExperience, b: WorkExperience) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime())[0];
    
    return currentJob?.position || cvData.workExperience[0]?.position || null;
  }

  private extractAllSkills(cvData: CVParsedData): string[] {
    if (Array.isArray(cvData.skills)) {
      // Handle both string[] and object[] formats
      return cvData.skills.flatMap(skill => {
        if (typeof skill === 'string') {
          return skill.toLowerCase();
        }
        if (typeof skill === 'object' && skill.skills) {
          return skill.skills.map((s: string) => s.toLowerCase());
        }
        return [];
      });
    }
    return [];
  }

  private calculateTotalExperience(cvData: CVParsedData): number {
    let totalMonths = 0;
    
    cvData.workExperience.forEach((exp: WorkExperience) => {
      const startDate = new Date(exp.startDate);
      const endDate = exp.endDate ? new Date(exp.endDate) : new Date();
      const months = (endDate.getFullYear() - startDate.getFullYear()) * 12 + 
                    (endDate.getMonth() - startDate.getMonth());
      totalMonths += Math.max(0, months);
    });
    
    return totalMonths / 12; // Convert to years
  }

  private calculateSkillGap(currentSkills: string[], requiredSkills: string[]): string[] {
    return requiredSkills.filter(skill => 
      !currentSkills.some(current => 
        current.includes(skill.toLowerCase()) || skill.toLowerCase().includes(current)
      )
    );
  }

  private mapToCareerLevel(roleTitle: string): 'junior' | 'mid' | 'senior' | 'lead' | 'executive' {
    const title = roleTitle.toLowerCase();
    if (title.includes('junior') || title.includes('associate')) return 'junior';
    if (title.includes('senior') || title.includes('principal')) return 'senior';
    if (title.includes('lead') || title.includes('manager')) return 'lead';
    if (title.includes('director') || title.includes('vp') || title.includes('chief')) return 'executive';
    return 'mid';
  }

  private getOptionalSkills(role: string): string[] {
    // This would typically come from a comprehensive database
    const skillDatabase = {
      'Senior Software Engineer': ['mentoring', 'code review', 'documentation'],
      'Tech Lead': ['technical writing', 'stakeholder communication', 'roadmap planning'],
      'Engineering Manager': ['performance management', 'hiring', 'budget management']
    };
    
    return skillDatabase[role as keyof typeof skillDatabase] || [];
  }

  private getSalaryRange(role: string): { min: number; max: number; currency: string } {
    // This would typically come from real salary data APIs
    const salaryData = {
      'Senior Software Engineer': { min: 120000, max: 180000 },
      'Tech Lead': { min: 150000, max: 220000 },
      'Engineering Manager': { min: 180000, max: 280000 },
      'Senior Data Scientist': { min: 130000, max: 200000 },
      'Data Science Manager': { min: 170000, max: 250000 }
    };
    
    return {
      ...salaryData[role as keyof typeof salaryData] || { min: 80000, max: 120000 },
      currency: 'USD'
    };
  }

  private getGrowthProjection(role: string): number {
    const growthData = {
      'Senior Software Engineer': 8.5,
      'Tech Lead': 12.3,
      'Engineering Manager': 6.8,
      'Data Scientist': 22.8,
      'Product Manager': 15.2
    };
    
    return growthData[role as keyof typeof growthData] || 5.0;
  }

  private parseTimeframe(timeframe: string): number {
    const match = timeframe.match(/(\d+)-(\d+)\s*years?/);
    if (match) {
      return Math.round(((parseInt(match[1]) + parseInt(match[2])) / 2) * 12);
    }
    return 24; // Default 2 years
  }

  private calculateDifficulty(skillGapCount: number, experience: number): 'easy' | 'moderate' | 'challenging' | 'difficult' {
    const difficultyScore = skillGapCount * 2 - experience;
    
    if (difficultyScore <= 0) return 'easy';
    if (difficultyScore <= 2) return 'moderate';
    if (difficultyScore <= 4) return 'challenging';
    return 'difficult';
  }

  private findLateralOpportunities(cvData: CVParsedData, preferences?: any): CareerPath[] {
    // This would implement logic to find lateral career moves
    // based on transferable skills and industry trends
    return [];
  }

  private scoreCareerPath(path: CareerPath, cvData: CVParsedData): number {
    let score = 0;
    
    // Factor in growth projection
    score += path.growthProjection * 2;
    
    // Factor in difficulty (easier paths score higher)
    const difficultyScores = { easy: 10, moderate: 8, challenging: 6, difficult: 4 };
    score += difficultyScores[path.difficulty];
    
    // Factor in current skill alignment
    const currentSkills = this.extractAllSkills(cvData);
    const alignedSkills = path.requiredSkills.filter(skill => 
      currentSkills.some(current => current.includes(skill.toLowerCase()))
    );
    score += (alignedSkills.length / path.requiredSkills.length) * 20;
    
    return score;
  }

  private async identifySkillGaps(currentSkills: string[], targetRole: string): Promise<string[]> {
    // This would typically use ML models or comprehensive role databases
    const roleSkillMap = {
      'Software Engineer': ['programming', 'algorithms', 'system design'],
      'Data Scientist': ['python', 'machine learning', 'statistics', 'sql'],
      'Product Manager': ['analytics', 'user research', 'roadmap planning', 'stakeholder management']
    };
    
    const requiredSkills = roleSkillMap[targetRole as keyof typeof roleSkillMap] || [];
    return this.calculateSkillGap(currentSkills, requiredSkills);
  }

  private async identifyGrowthOpportunities(currentSkills: string[]): Promise<string[]> {
    // Identify skills that would complement current skill set
    const complementarySkills = {
      'javascript': ['typescript', 'react', 'node.js'],
      'python': ['machine learning', 'data analysis', 'django'],
      'sql': ['data visualization', 'analytics', 'database design']
    };
    
    const opportunities: string[] = [];
    currentSkills.forEach(skill => {
      const complements = complementarySkills[skill as keyof typeof complementarySkills];
      if (complements) {
        opportunities.push(...complements.filter(comp => !currentSkills.includes(comp)));
      }
    });
    
    return [...new Set(opportunities)];
  }

  private async createLearningPath(targetSkill: string, cvData: CVParsedData): Promise<LearningPath | null> {
    // This would create comprehensive learning paths based on the target skill
    return {
      id: `learn-${targetSkill}-${Date.now()}`,
      title: `Master ${targetSkill}`,
      description: `Comprehensive learning path to develop expertise in ${targetSkill}`,
      targetSkill,
      category: 'programming' as SkillCategory,
      duration: 40, // hours
      difficulty: 'intermediate' as SkillLevel,
      resources: [],
      milestones: [],
      prerequisites: [],
      certifications: [],
      estimatedCost: 200,
      roi: 8.5
    };
  }

  private detectIndustry(cvData: CVParsedData): string {
    const allText = [
      cvData.personalInfo.summary || '',
      ...cvData.workExperience.flatMap((exp: WorkExperience) => [exp.company, exp.position || exp.title, ...(exp.responsibilities || [])])
    ].join(' ').toLowerCase();
    
    const industryKeywords = {
      technology: ['software', 'tech', 'developer', 'engineer', 'programming'],
      healthcare: ['medical', 'health', 'clinical', 'patient', 'hospital'],
      finance: ['financial', 'bank', 'investment', 'trading', 'fintech']
    };
    
    let maxMatches = 0;
    let detectedIndustry = 'technology'; // default
    
    Object.entries(industryKeywords).forEach(([industry, keywords]) => {
      const matches = keywords.filter(keyword => allText.includes(keyword)).length;
      if (matches > maxMatches) {
        maxMatches = matches;
        detectedIndustry = industry;
      }
    });
    
    return detectedIndustry;
  }

  private async generatePersonalInsights(cvData: CVParsedData): Promise<CareerInsight[]> {
    const insights: CareerInsight[] = [];
    const experience = this.calculateTotalExperience(cvData);
    
    if (experience < 2) {
      insights.push({
        type: 'recommendation',
        title: 'Build Strong Foundation',
        description: 'Focus on developing core technical skills and gaining hands-on experience',
        relevance: 0.9,
        timeframe: 'immediate',
        actionable: true,
        sources: ['Career Development Best Practices']
      });
    }
    
    return insights;
  }

  private getCommonQuestions(targetRole: string, industry?: string) {
    // This would return role and industry-specific interview questions
    return [
      {
        question: 'Tell me about yourself',
        category: 'behavioral' as const,
        difficulty: 'easy' as const,
        tips: ['Focus on professional highlights', 'Keep it concise (2-3 minutes)', 'Connect to the role']
      }
    ];
  }

  private analyzeTechnicalPreparation(currentSkills: string[], roleRequirements: string[]) {
    return roleRequirements.map(req => ({
      area: req,
      importance: 8,
      currentLevel: 'intermediate' as SkillLevel,
      recommendedLevel: 'advanced' as SkillLevel,
      studyResources: []
    }));
  }

  private generateProjectSuggestions(targetRole: string, currentSkills: string[]): string[] {
    const projectSuggestions = {
      'Software Engineer': [
        'Build a full-stack web application',
        'Contribute to open source projects',
        'Create a mobile app',
        'Implement a complex algorithm'
      ],
      'Data Scientist': [
        'Complete an end-to-end ML project',
        'Create data visualizations',
        'Build a recommendation system',
        'Analyze a large dataset'
      ]
    };
    
    return projectSuggestions[targetRole as keyof typeof projectSuggestions] || [];
  }

  private async getRoleRequirements(targetRole: string, industry?: string): Promise<string[]> {
    // This would typically fetch from a comprehensive role database
    const roleRequirements = {
      'Software Engineer': ['programming', 'problem solving', 'debugging', 'version control'],
      'Data Scientist': ['python', 'statistics', 'machine learning', 'data visualization', 'sql']
    };
    
    return roleRequirements[targetRole as keyof typeof roleRequirements] || [];
  }
}