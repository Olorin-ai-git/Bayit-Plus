// @ts-ignore - Export conflicts/**
 * Industry-Specific Template System
 * 
 * Comprehensive templates for different industry sectors
 * Dynamic selection and scoring algorithms
 * 
 * @author Gil Klainert
 * @version 1.0.0
 */

import { ParsedCV } from '../types/enhanced-models';

export interface IndustryTemplate {
  id: string;
  name: string;
  sector: string;
  description: string;
  keyCharacteristics: string[];
  vocabularyFocus: string[];
  messageStructure: {
    hook: string;
    credibility: string;
    differentiation: string;
    callToAction: string;
  };
  requirements: string[];
  scoringWeights: {
    technicalSkills: number;
    leadership: number;
    results: number;
    innovation: number;
    collaboration: number;
  };
  personalityFit: {
    communicationStyles: string[];
    leadershipTypes: string[];
    preferredTraits: string[];
  };
  commonKeywords: string[];
  avoidKeywords: string[];
  industrySpecificMetrics: string[];
}

export interface TemplateMatchScore {
  templateId: string;
  score: number;
  matchReasons: string[];
  strengthAreas: string[];
  improvementAreas: string[];
  confidence: number;
}

/**
 * Industry Templates Service
 */
export class IndustryTemplatesService {
  private templates: Map<string, IndustryTemplate>;

  constructor() {
    this.templates = new Map();
    this.initializeTemplates();
  }

  /**
   * Get template by industry identifier
   */
  getTemplate(industryId: string): IndustryTemplate | null {
    return this.templates.get(industryId) || this.templates.get('general-business');
  }

  /**
   * Analyze CV and recommend best industry template
   */
  analyzeAndRecommendTemplate(cv: ParsedCV): TemplateMatchScore[] {
    const scores: TemplateMatchScore[] = [];

    for (const [templateId, template] of this.templates) {
      const score = this.calculateTemplateMatch(cv, template);
      scores.push(score);
    }

    return scores.sort((a, b) => b.score - a.score);
  }

  /**
   * Get all available templates
   */
  getAllTemplates(): IndustryTemplate[] {
    return Array.from(this.templates.values());
  }

  /**
   * Calculate how well a CV matches an industry template
   */
  private calculateTemplateMatch(cv: ParsedCV, template: IndustryTemplate): TemplateMatchScore {
    let totalScore = 0;
    const matchReasons: string[] = [];
    const strengthAreas: string[] = [];
    const improvementAreas: string[] = [];

    // Technical skills alignment (25%)
    const techScore = this.assessTechnicalAlignment(cv, template);
    totalScore += techScore * 0.25;
    if (techScore > 0.7) {
      matchReasons.push(`Strong technical alignment with ${template.name} requirements`);
      strengthAreas.push('Technical Skills');
    } else if (techScore < 0.4) {
      improvementAreas.push('Technical Skills Gap');
    }

    // Experience relevance (30%)
    const expScore = this.assessExperienceRelevance(cv, template);
    totalScore += expScore * 0.30;
    if (expScore > 0.7) {
      matchReasons.push(`Relevant experience in ${template.sector} sector`);
      strengthAreas.push('Industry Experience');
    }

    // Achievement alignment (20%)
    const achievementScore = this.assessAchievementAlignment(cv, template);
    totalScore += achievementScore * 0.20;
    if (achievementScore > 0.6) {
      strengthAreas.push('Achievement Alignment');
    }

    // Keyword presence (15%)
    const keywordScore = this.assessKeywordPresence(cv, template);
    totalScore += keywordScore * 0.15;

    // Role progression fit (10%)
    const progressionScore = this.assessCareerProgression(cv, template);
    totalScore += progressionScore * 0.10;

    const confidence = this.calculateConfidence(totalScore, cv, template);

    return {
      templateId: template.id,
      score: Math.round(totalScore * 100) / 100,
      matchReasons,
      strengthAreas,
      improvementAreas,
      confidence
    };
  }

  /**
   * Initialize all industry templates
   */
  private initializeTemplates(): void {
    // Technology Sector Template
    this.templates.set('technology', {
      id: 'technology',
      name: 'Technology & Software',
      sector: 'Technology',
      description: 'For software engineers, developers, IT professionals, and tech leaders',
      keyCharacteristics: [
        'Innovation-driven mindset',
        'Problem-solving approach',
        'Continuous learning culture',
        'Agile methodology expertise',
        'Technical excellence focus'
      ],
      vocabularyFocus: [
        'innovate', 'architect', 'optimize', 'scale', 'engineer',
        'develop', 'implement', 'integrate', 'automate', 'transform'
      ],
      messageStructure: {
        hook: 'Problem-solution-impact framework',
        credibility: 'Technical achievements and system impact',
        differentiation: 'Innovation and problem-solving examples',
        callToAction: 'Collaboration on technical challenges'
      },
      requirements: [
        'Demonstrate technical depth and breadth',
        'Show measurable system improvements',
        'Highlight innovation and problem-solving',
        'Emphasize learning and adaptation',
        'Include collaborative achievements'
      ],
      scoringWeights: {
        technicalSkills: 0.35,
        leadership: 0.20,
        results: 0.25,
        innovation: 0.30,
        collaboration: 0.25
      },
      personalityFit: {
        communicationStyles: ['analytical', 'direct', 'collaborative'],
        leadershipTypes: ['visionary', 'strategic', 'servant'],
        preferredTraits: ['analytical', 'innovative', 'detail-oriented', 'persistent']
      },
      commonKeywords: [
        'software development', 'architecture', 'scalability', 'performance',
        'cloud computing', 'DevOps', 'microservices', 'API', 'automation',
        'machine learning', 'data engineering', 'cybersecurity'
      ],
      avoidKeywords: ['basic computer skills', 'Microsoft Office', 'data entry'],
      industrySpecificMetrics: [
        'System performance improvements',
        'Code quality metrics',
        'Deployment frequency',
        'Bug reduction percentages',
        'User adoption rates'
      ]
    });

    // Marketing & Sales Template
    this.templates.set('marketing-sales', {
      id: 'marketing-sales',
      name: 'Marketing & Sales',
      sector: 'Marketing & Sales',
      description: 'For marketing professionals, sales leaders, and growth specialists',
      keyCharacteristics: [
        'Growth-focused mindset',
        'Customer-centric approach',
        'Data-driven decisions',
        'Creative problem solving',
        'Relationship building'
      ],
      vocabularyFocus: [
        'drive', 'accelerate', 'optimize', 'convert', 'engage',
        'generate', 'cultivate', 'expand', 'influence', 'deliver'
      ],
      messageStructure: {
        hook: 'Growth results and market impact',
        credibility: 'Revenue and growth metrics',
        differentiation: 'Unique strategies and campaign success',
        callToAction: 'Partnership for growth objectives'
      },
      requirements: [
        'Quantifiable growth and revenue results',
        'Customer acquisition and retention success',
        'Creative campaign and strategy examples',
        'Cross-functional collaboration evidence',
        'Market insight and trend awareness'
      ],
      scoringWeights: {
        technicalSkills: 0.15,
        leadership: 0.30,
        results: 0.40,
        innovation: 0.25,
        collaboration: 0.30
      },
      personalityFit: {
        communicationStyles: ['persuasive', 'collaborative', 'creative'],
        leadershipTypes: ['visionary', 'operational', 'strategic'],
        preferredTraits: ['outgoing', 'creative', 'results-driven', 'adaptable']
      },
      commonKeywords: [
        'revenue growth', 'customer acquisition', 'brand management',
        'digital marketing', 'lead generation', 'conversion optimization',
        'market research', 'campaign management', 'ROI', 'KPIs'
      ],
      avoidKeywords: ['cold calling', 'door-to-door', 'telemarketing'],
      industrySpecificMetrics: [
        'Revenue growth percentages',
        'Customer acquisition cost',
        'Conversion rates',
        'Market share gains',
        'Campaign ROI'
      ]
    });

    // Finance & Consulting Template
    this.templates.set('finance-consulting', {
      id: 'finance-consulting',
      name: 'Finance & Consulting',
      sector: 'Finance & Consulting',
      description: 'For financial professionals, consultants, and strategic advisors',
      keyCharacteristics: [
        'Analytical excellence',
        'Strategic thinking',
        'Risk assessment expertise',
        'Client relationship focus',
        'Regulatory compliance knowledge'
      ],
      vocabularyFocus: [
        'analyze', 'optimize', 'strategize', 'advise', 'evaluate',
        'forecast', 'mitigate', 'enhance', 'restructure', 'assess'
      ],
      messageStructure: {
        hook: 'Expertise and analytical depth',
        credibility: 'Financial results and strategic impact',
        differentiation: 'Unique insights and problem-solving approach',
        callToAction: 'Strategic partnership and advisory excellence'
      },
      requirements: [
        'Quantifiable financial impact and results',
        'Strategic analysis and decision-making examples',
        'Client success stories and relationship building',
        'Regulatory and compliance expertise',
        'Risk management and mitigation strategies'
      ],
      scoringWeights: {
        technicalSkills: 0.30,
        leadership: 0.25,
        results: 0.35,
        innovation: 0.15,
        collaboration: 0.25
      },
      personalityFit: {
        communicationStyles: ['analytical', 'direct', 'consultative'],
        leadershipTypes: ['strategic', 'operational', 'servant'],
        preferredTraits: ['analytical', 'detail-oriented', 'trustworthy', 'strategic']
      },
      commonKeywords: [
        'financial analysis', 'strategic planning', 'risk management',
        'portfolio management', 'due diligence', 'compliance',
        'financial modeling', 'investment strategy', 'audit', 'forecasting'
      ],
      avoidKeywords: ['basic accounting', 'bookkeeping', 'data entry'],
      industrySpecificMetrics: [
        'Portfolio performance',
        'Cost reduction achievements',
        'Revenue optimization',
        'Risk mitigation results',
        'Client satisfaction scores'
      ]
    });

    // Healthcare Template
    this.templates.set('healthcare', {
      id: 'healthcare',
      name: 'Healthcare & Life Sciences',
      sector: 'Healthcare',
      description: 'For healthcare professionals, researchers, and life sciences experts',
      keyCharacteristics: [
        'Patient-centered care',
        'Evidence-based practice',
        'Continuous learning commitment',
        'Interdisciplinary collaboration',
        'Quality and safety focus'
      ],
      vocabularyFocus: [
        'improve', 'heal', 'research', 'diagnose', 'treat',
        'prevent', 'care', 'support', 'advance', 'innovate'
      ],
      messageStructure: {
        hook: 'Patient impact and healthcare improvement',
        credibility: 'Clinical expertise and outcomes',
        differentiation: 'Specialized knowledge and patient success',
        callToAction: 'Collaboration for better health outcomes'
      },
      requirements: [
        'Patient care excellence and outcomes',
        'Clinical expertise and specialization',
        'Research and evidence-based practice',
        'Team collaboration and leadership',
        'Quality improvement initiatives'
      ],
      scoringWeights: {
        technicalSkills: 0.25,
        leadership: 0.20,
        results: 0.30,
        innovation: 0.20,
        collaboration: 0.35
      },
      personalityFit: {
        communicationStyles: ['empathetic', 'collaborative', 'analytical'],
        leadershipTypes: ['servant', 'operational', 'strategic'],
        preferredTraits: ['empathetic', 'detail-oriented', 'collaborative', 'resilient']
      },
      commonKeywords: [
        'patient care', 'clinical research', 'medical device', 'healthcare',
        'diagnosis', 'treatment', 'therapy', 'clinical trials',
        'quality improvement', 'healthcare technology'
      ],
      avoidKeywords: ['sales', 'marketing', 'profit-driven'],
      industrySpecificMetrics: [
        'Patient satisfaction scores',
        'Clinical outcomes improvement',
        'Research publication impact',
        'Quality measure achievements',
        'Patient safety indicators'
      ]
    });

    // Manufacturing & Operations Template
    this.templates.set('manufacturing', {
      id: 'manufacturing',
      name: 'Manufacturing & Operations',
      sector: 'Manufacturing',
      description: 'For manufacturing professionals, operations managers, and industrial engineers',
      keyCharacteristics: [
        'Operational excellence focus',
        'Process optimization mindset',
        'Safety and quality commitment',
        'Continuous improvement culture',
        'Cost efficiency awareness'
      ],
      vocabularyFocus: [
        'optimize', 'streamline', 'improve', 'manufacture', 'operate',
        'enhance', 'reduce', 'increase', 'implement', 'maintain'
      ],
      messageStructure: {
        hook: 'Operational improvements and efficiency gains',
        credibility: 'Process optimization and cost savings',
        differentiation: 'Lean methodology and safety excellence',
        callToAction: 'Partnership for operational excellence'
      },
      requirements: [
        'Operational efficiency improvements',
        'Cost reduction and quality enhancement',
        'Safety record and compliance',
        'Team leadership and development',
        'Process innovation and optimization'
      ],
      scoringWeights: {
        technicalSkills: 0.30,
        leadership: 0.30,
        results: 0.35,
        innovation: 0.20,
        collaboration: 0.30
      },
      personalityFit: {
        communicationStyles: ['direct', 'collaborative', 'systematic'],
        leadershipTypes: ['operational', 'servant', 'strategic'],
        preferredTraits: ['detail-oriented', 'systematic', 'safety-conscious', 'results-driven']
      },
      commonKeywords: [
        'lean manufacturing', 'process improvement', 'quality control',
        'supply chain', 'production', 'operations', 'safety',
        'efficiency', 'cost reduction', 'automation'
      ],
      avoidKeywords: ['theoretical', 'academic only', 'no hands-on experience'],
      industrySpecificMetrics: [
        'Production efficiency gains',
        'Cost reduction percentages',
        'Quality improvement metrics',
        'Safety incident reduction',
        'On-time delivery rates'
      ]
    });

    // General Business Template (Default)
    this.templates.set('general-business', {
      id: 'general-business',
      name: 'General Business Professional',
      sector: 'General Business',
      description: 'For cross-functional business professionals and leaders',
      keyCharacteristics: [
        'Strategic business acumen',
        'Cross-functional collaboration',
        'Results-driven approach',
        'Leadership and mentoring',
        'Adaptability and growth mindset'
      ],
      vocabularyFocus: [
        'lead', 'manage', 'develop', 'grow', 'achieve',
        'collaborate', 'influence', 'deliver', 'improve', 'excel'
      ],
      messageStructure: {
        hook: 'Professional expertise and leadership',
        credibility: 'Business results and team success',
        differentiation: 'Unique value proposition and approach',
        callToAction: 'Professional collaboration and partnership'
      },
      requirements: [
        'Business results and achievements',
        'Leadership and team development',
        'Cross-functional collaboration',
        'Strategic thinking and execution',
        'Professional growth and learning'
      ],
      scoringWeights: {
        technicalSkills: 0.20,
        leadership: 0.30,
        results: 0.30,
        innovation: 0.20,
        collaboration: 0.30
      },
      personalityFit: {
        communicationStyles: ['collaborative', 'direct', 'consultative'],
        leadershipTypes: ['strategic', 'operational', 'servant'],
        preferredTraits: ['adaptable', 'collaborative', 'results-driven', 'strategic']
      },
      commonKeywords: [
        'business development', 'project management', 'team leadership',
        'strategic planning', 'process improvement', 'stakeholder management',
        'business analysis', 'performance management'
      ],
      avoidKeywords: [],
      industrySpecificMetrics: [
        'Business growth metrics',
        'Team performance indicators',
        'Project success rates',
        'Stakeholder satisfaction',
        'Process improvement results'
      ]
    });
  }

  /**
   * Assessment helper methods
   */
  private assessTechnicalAlignment(cv: ParsedCV, template: IndustryTemplate): number {
    const cvSkills = this.extractSkills(cv);
    const templateKeywords = template.commonKeywords;
    
    if (cvSkills.length === 0) return 0;
    
    const matches = cvSkills.filter(skill => 
      templateKeywords.some(keyword => 
        skill.toLowerCase().includes(keyword.toLowerCase()) ||
        keyword.toLowerCase().includes(skill.toLowerCase())
      )
    );
    
    return Math.min(matches.length / Math.max(cvSkills.length * 0.3, 1), 1);
  }

  private assessExperienceRelevance(cv: ParsedCV, template: IndustryTemplate): number {
    if (!cv.experience || cv.experience.length === 0) return 0;
    
    let relevanceScore = 0;
    const totalExperience = cv.experience.length;
    
    for (const exp of cv.experience) {
      const expText = `${exp.company} ${exp.position} ${exp.description || ''}`.toLowerCase();
      const keywordMatches = template.commonKeywords.filter(keyword =>
        expText.includes(keyword.toLowerCase())
      );
      
      relevanceScore += keywordMatches.length / template.commonKeywords.length;
    }
    
    return Math.min(relevanceScore / totalExperience, 1);
  }

  private assessAchievementAlignment(cv: ParsedCV, template: IndustryTemplate): number {
    const achievements = cv.achievements || [];
    const expAchievements = cv.experience?.flatMap(exp => exp.achievements || []) || [];
    const allAchievements = [...achievements, ...expAchievements];
    
    if (allAchievements.length === 0) return 0;
    
    const metricMatches = allAchievements.filter(achievement =>
      template.industrySpecificMetrics.some(metric =>
        achievement.toLowerCase().includes(metric.toLowerCase().split(' ')[0])
      )
    );
    
    return Math.min(metricMatches.length / allAchievements.length, 1);
  }

  private assessKeywordPresence(cv: ParsedCV, template: IndustryTemplate): number {
    const cvText = this.getCVText(cv).toLowerCase();
    const presentKeywords = template.commonKeywords.filter(keyword =>
      cvText.includes(keyword.toLowerCase())
    );
    
    return presentKeywords.length / template.commonKeywords.length;
  }

  private assessCareerProgression(cv: ParsedCV, template: IndustryTemplate): number {
    if (!cv.experience || cv.experience.length < 2) return 0.5;
    
    // Simple progression assessment
    const hasProgressiveRoles = cv.experience.some((exp, index) =>
      index > 0 && (
        exp.position.toLowerCase().includes('senior') ||
        exp.position.toLowerCase().includes('lead') ||
        exp.position.toLowerCase().includes('manager') ||
        exp.position.toLowerCase().includes('director')
      )
    );
    
    return hasProgressiveRoles ? 0.8 : 0.6;
  }

  private calculateConfidence(score: number, cv: ParsedCV, template: IndustryTemplate): number {
    let confidence = score;
    
    // Boost confidence if CV has rich experience data
    if (cv.experience && cv.experience.length > 2) confidence += 0.1;
    if (cv.achievements && cv.achievements.length > 2) confidence += 0.1;
    if (cv.skills && (Array.isArray(cv.skills) ? cv.skills.length > 5 : 
        Object.values(cv.skills).flat().length > 5)) confidence += 0.1;
    
    return Math.min(confidence, 1);
  }

  private extractSkills(cv: ParsedCV): string[] {
    if (!cv.skills) return [];
    if (Array.isArray(cv.skills)) return cv.skills;
    return Object.values(cv.skills).flat();
  }

  private getCVText(cv: ParsedCV): string {
    const textParts = [
      cv.personalInfo?.summary || cv.personal?.summary || '',
      cv.summary || '',
      ...(cv.experience?.map(exp => 
        `${exp.company} ${exp.position} ${exp.description || ''}`
      ) || []),
      ...(cv.achievements || []),
      ...this.extractSkills(cv)
    ];
    
    return textParts.join(' ');
  }
}

export const industryTemplatesService = new IndustryTemplatesService();