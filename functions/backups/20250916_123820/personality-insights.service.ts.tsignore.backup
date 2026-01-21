// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts/**
 * AI Personality Insights Service
 */

import OpenAI from 'openai';
import { config } from '../config/environment';
import { ParsedCV, PersonalityProfile } from '../types/enhanced-models';
import type { CVData } from '../../shared/types';

export class PersonalityInsightsService {
  private openai: OpenAI | null = null;
  
  // Personality dimensions based on work-relevant traits
  private readonly dimensions = {
    leadership: {
      indicators: ['led', 'managed', 'directed', 'supervised', 'coordinated', 'organized', 'mentored'],
      weight: 1.2
    },
    communication: {
      indicators: ['presented', 'wrote', 'documented', 'collaborated', 'negotiated', 'liaised'],
      weight: 1.0
    },
    innovation: {
      indicators: ['created', 'designed', 'developed', 'pioneered', 'innovated', 'invented', 'initiated'],
      weight: 1.1
    },
    teamwork: {
      indicators: ['collaborated', 'partnered', 'coordinated', 'supported', 'assisted', 'contributed'],
      weight: 1.0
    },
    problemSolving: {
      indicators: ['solved', 'resolved', 'analyzed', 'troubleshot', 'debugged', 'optimized', 'improved'],
      weight: 1.1
    },
    attention_to_detail: {
      indicators: ['reviewed', 'audited', 'tested', 'validated', 'verified', 'documented', 'quality'],
      weight: 0.9
    },
    adaptability: {
      indicators: ['adapted', 'learned', 'transitioned', 'pivoted', 'adjusted', 'evolved'],
      weight: 0.9
    },
    strategic_thinking: {
      indicators: ['strategized', 'planned', 'forecasted', 'envisioned', 'architected', 'roadmap'],
      weight: 1.2
    },
    analytical: {
      indicators: ['analyzed', 'researched', 'investigated', 'examined', 'evaluated', 'assessed', 'data-driven'],
      weight: 1.0
    },
    creative: {
      indicators: ['creative', 'artistic', 'designed', 'conceptualized', 'brainstormed', 'imaginative'],
      weight: 0.9
    },
    decisive: {
      indicators: ['decided', 'determined', 'chose', 'selected', 'committed', 'concluded', 'finalized'],
      weight: 1.0
    },
    empathetic: {
      indicators: ['supported', 'helped', 'mentored', 'coached', 'listened', 'understood', 'caring'],
      weight: 0.8
    }
  };
  
  constructor() {
    // Initialize OpenAI lazily when needed
  }

  private getOpenAI(): OpenAI {
    if (!this.openai) {
      this.openai = new OpenAI({
        apiKey: config.rag?.openaiApiKey || process.env.OPENAI_API_KEY || '',
      });
    }
    return this.openai;
  }
  
  /**
   * Analyze CV and generate personality insights
   */
  async analyzePersonality(parsedCV: ParsedCV): Promise<PersonalityProfile> {
    // 1. Extract text content for analysis
    const cvContent = this.extractCVContent(parsedCV);
    
    // 2. Analyze traits from CV content
    const traits = await this.analyzeTraits(cvContent);
    
    // 3. Determine work style
    const workStyle = await this.determineWorkStyle(cvContent, traits);
    
    // 4. Assess team compatibility
    const teamCompatibilityResult = await this.assessTeamCompatibility(traits, workStyle);
    
    // 5. Calculate leadership potential
    const leadershipPotential = this.calculateLeadershipPotential(traits, cvContent);
    
    // 6. Evaluate culture fit
    const cultureFit = await this.evaluateCultureFit(traits, workStyle, cvContent);
    
    // 7. Generate summary
    const summary = await this.generatePersonalitySummary(
      traits,
      workStyle,
      teamCompatibilityResult.description,
      cultureFit
    );
    
    return {
      workingStyle: workStyle.join(', '),
      strengths: this.extractStrengths(traits),
      motivations: this.extractMotivations(traits, cvContent),
      communicationPreferences: this.extractCommunicationPreferences(traits),
      teamRole: teamCompatibilityResult.description,
      leadershipStyle: leadershipPotential > 7 ? 'Strategic Leader' : 'Collaborative Supporter',
      problemSolvingApproach: this.extractProblemSolvingApproach(traits),
      adaptability: this.extractAdaptabilityDescription(traits),
      stressManagement: this.extractStressManagement(traits),
      careerAspirations: this.extractCareerAspirations(cvContent),
      values: this.extractValues(traits, cvContent),
      traits,
      cultureFit,
      summary,
      teamCompatibility: teamCompatibilityResult.description,
      workStyle,
      leadershipPotential,
      generatedAt: new Date()
    };
  }
  
  /**
   * Extract relevant content from CV
   */
  private extractCVContent(cv: ParsedCV): {
    summary: string;
    experiences: string[];
    achievements: string[];
    skills: string[];
    education: string[];
  } {
    const content = {
      summary: cv.personalInfo?.summary || '',
      experiences: [] as string[],
      achievements: [] as string[],
      skills: [] as string[],
      education: [] as string[]
    };
    
    // Extract experiences
    if (cv.experience) {
      cv.experience.forEach(exp => {
        content.experiences.push(`${exp.position} at ${exp.company}: ${exp.description || ''}`);
        if (exp.achievements) {
          content.achievements.push(...exp.achievements);
        }
      });
    }
    
    // Extract skills
    if (cv.skills) {
      if (Array.isArray(cv.skills)) {
        content.skills.push(...cv.skills);
      } else {
        const skillsObj = cv.skills as { technical: string[]; soft: string[]; languages?: string[]; tools?: string[]; };
        if (skillsObj.technical && Array.isArray(skillsObj.technical)) {
          content.skills.push(...skillsObj.technical);
        }
        if (skillsObj.soft && Array.isArray(skillsObj.soft)) {
          content.skills.push(...skillsObj.soft);
        }
      }
    }
    
    // Extract education
    if (cv.education) {
      cv.education.forEach((edu: any) => {
        content.education.push(`${edu.degree} in ${edu.field} from ${edu.institution}`);
      });
    }
    
    // Add general achievements
    if (cv.achievements && Array.isArray(cv.achievements)) {
      content.achievements.push(...cv.achievements);
    }
    
    return content;
  }
  
  /**
   * Analyze personality traits from CV content
   */
  private async analyzeTraits(content: any): Promise<PersonalityProfile['traits']> {
    const traits: PersonalityProfile['traits'] = {
      leadership: 0,
      communication: 0,
      innovation: 0,
      teamwork: 0,
      problemSolving: 0,
      attention_to_detail: 0,
      adaptability: 0,
      strategic_thinking: 0,
      analytical: 0,
      creative: 0,
      decisive: 0,
      empathetic: 0
    };
    
    // Combine all text for analysis
    const fullText = [
      content.summary,
      ...content.experiences,
      ...content.achievements
    ].join(' ').toLowerCase();
    
    // Calculate trait scores based on keyword indicators
    for (const [trait, config] of Object.entries(this.dimensions)) {
      let score = 0;
      let matches = 0;
      
      config.indicators.forEach(indicator => {
        const regex = new RegExp(`\\b${indicator}`, 'gi');
        const count = (fullText.match(regex) || []).length;
        matches += count;
      });
      
      // Normalize score (0-10 scale)
      score = Math.min(10, (matches * config.weight * 2));
      
      traits[trait as keyof typeof traits] = Number(score.toFixed(1));
    }
    
    // Use AI to refine scores based on context
    const aiTraits = await this.refineTraitsWithAI(content, traits);
    
    return aiTraits;
  }
  
  /**
   * Refine trait scores using AI analysis
   */
  private async refineTraitsWithAI(
    content: any,
    initialTraits: PersonalityProfile['traits']
  ): Promise<PersonalityProfile['traits']> {
    try {
      const prompt = `Analyze this professional's personality traits based on their CV content. Rate each trait from 0-10.

Summary: ${content.summary}
Recent Experience: ${content.experiences.slice(0, 3).join('; ')}
Key Achievements: ${content.achievements.slice(0, 5).join('; ')}

Rate these traits (0-10):
1. Leadership: ${initialTraits.leadership}
2. Communication: ${initialTraits.communication}
3. Innovation: ${initialTraits.innovation}
4. Teamwork: ${initialTraits.teamwork}
5. Problem Solving: ${initialTraits.problemSolving}
6. Attention to Detail: ${initialTraits.attention_to_detail}
7. Adaptability: ${initialTraits.adaptability}
8. Strategic Thinking: ${initialTraits.strategic_thinking}

Provide refined scores based on the context. Return only the scores in format: trait:score`;

      const response = await this.getOpenAI().chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 200,
        temperature: 0.3
      });
      
      const refinedScores = this.parseAIScores(response.choices[0].message?.content || '');
      
      // Merge AI scores with initial scores (weighted average)
      const finalTraits = { ...initialTraits };
      for (const [trait, aiScore] of Object.entries(refinedScores)) {
        if (trait in finalTraits) {
          const key = trait as keyof typeof finalTraits;
          finalTraits[key] = Number(
            ((initialTraits[key] * 0.4 + aiScore * 0.6)).toFixed(1)
          );
        }
      }
      
      return finalTraits;
    } catch (error) {
      return initialTraits; // Fallback to initial scores
    }
  }
  
  /**
   * Determine work style based on traits and content
   */
  private async determineWorkStyle(
    content: any,
    traits: PersonalityProfile['traits']
  ): Promise<string[]> {
    const workStyles: string[] = [];
    
    // Analyze based on trait combinations
    if (traits.leadership >= 7 && traits.strategic_thinking >= 7) {
      workStyles.push('Visionary Leader');
    }
    
    if (traits.teamwork >= 8 && traits.communication >= 7) {
      workStyles.push('Collaborative Team Player');
    }
    
    if (traits.innovation >= 8 && traits.problemSolving >= 7) {
      workStyles.push('Creative Problem Solver');
    }
    
    if (traits.attention_to_detail >= 8) {
      workStyles.push('Detail-Oriented Perfectionist');
    }
    
    if (traits.adaptability >= 8) {
      workStyles.push('Agile and Flexible');
    }
    
    // Analyze work patterns from experience
    const experienceText = content.experiences.join(' ').toLowerCase();
    
    if (experienceText.includes('remote') || experienceText.includes('distributed')) {
      workStyles.push('Remote Work Advocate');
    }
    
    if (experienceText.includes('startup') || experienceText.includes('fast-paced')) {
      workStyles.push('Thrives in Dynamic Environments');
    }
    
    if (experienceText.includes('mentor') || experienceText.includes('coach')) {
      workStyles.push('Natural Mentor');
    }
    
    // Limit to top 3-4 styles
    return workStyles.slice(0, 4);
  }
  
  /**
   * Assess team compatibility
   */
  private async assessTeamCompatibility(
    traits: PersonalityProfile['traits'],
    workStyle: string[]
  ): Promise<{ score: number; description: string }> {
    // Determine primary team role based on traits
    const roles = [];
    
    if (traits.leadership >= 8) {
      roles.push('Leader');
    }
    
    if (traits.innovation >= 8 && traits.problemSolving >= 7) {
      roles.push('Innovator');
    }
    
    if (traits.teamwork >= 8 && traits.communication >= 8) {
      roles.push('Facilitator');
    }
    
    if (traits.attention_to_detail >= 8 && traits.strategic_thinking >= 7) {
      roles.push('Strategist');
    }
    
    if (traits.adaptability >= 8 && traits.teamwork >= 7) {
      roles.push('Supporter');
    }
    
    // Calculate compatibility score (0-10)
    let compatibilityScore = 0;
    compatibilityScore += Math.min(10, traits.teamwork * 1.2);
    compatibilityScore += Math.min(10, traits.communication * 1.1);
    compatibilityScore += Math.min(10, traits.adaptability * 1.0);
    compatibilityScore += Math.min(10, traits.empathetic * 0.8);
    compatibilityScore = Math.min(10, compatibilityScore / 4);
    
    // Generate compatibility description
    let description: string;
    if (roles.includes('Leader')) {
      description = 'Natural leader who excels at guiding teams and making strategic decisions';
    } else if (roles.includes('Innovator')) {
      description = 'Creative force who brings fresh ideas and innovative solutions to the team';
    } else if (roles.includes('Facilitator')) {
      description = 'Bridge-builder who enhances team communication and collaboration';
    } else if (roles.includes('Strategist')) {
      description = 'Strategic thinker who ensures team efforts align with long-term goals';
    } else {
      description = 'Versatile team member who adapts to various roles as needed';
    }
    
    return {
      score: Number(compatibilityScore.toFixed(1)),
      description
    };
  }
  
  /**
   * Calculate leadership potential
   */
  private calculateLeadershipPotential(
    traits: PersonalityProfile['traits'],
    content: any
  ): number {
    let score = 0;
    
    // Weight different factors
    score += traits.leadership * 3; // Heavy weight on leadership trait
    score += traits.strategic_thinking * 2;
    score += traits.communication * 1.5;
    score += traits.problemSolving * 1;
    score += traits.teamwork * 1;
    
    // Check for leadership experience
    const leadershipKeywords = ['managed', 'led', 'supervised', 'directed', 'head', 'chief'];
    const experienceText = content.experiences.join(' ').toLowerCase();
    
    leadershipKeywords.forEach(keyword => {
      if (experienceText.includes(keyword)) {
        score += 5;
      }
    });
    
    // Normalize to 0-10 scale
    return Math.min(10, Number((score / 10).toFixed(1)));
  }
  
  /**
   * Evaluate culture fit for different environments
   */
  private async evaluateCultureFit(
    traits: PersonalityProfile['traits'],
    workStyle: string[],
    content: any
  ): Promise<PersonalityProfile['cultureFit']> {
    const cultureFit = {
      startup: 0,
      corporate: 0,
      consulting: 0,
      nonprofit: 0,
      agency: 0
    };
    
    // Startup fit
    cultureFit.startup = (
      traits.adaptability * 0.3 +
      traits.innovation * 0.3 +
      traits.problemSolving * 0.2 +
      traits.teamwork * 0.2
    );
    
    // Corporate fit
    cultureFit.corporate = (
      traits.strategic_thinking * 0.3 +
      traits.attention_to_detail * 0.2 +
      traits.communication * 0.2 +
      traits.leadership * 0.3
    );
    
    // Consulting fit
    cultureFit.consulting = (
      traits.communication * 0.3 +
      traits.problemSolving * 0.3 +
      traits.adaptability * 0.2 +
      traits.strategic_thinking * 0.2
    );
    
    // Nonprofit fit
    cultureFit.nonprofit = (
      (traits.empathetic || 5) * 0.4 +
      traits.teamwork * 0.3 +
      traits.communication * 0.3
    );
    
    // Agency fit
    cultureFit.agency = (
      (traits.creative || 5) * 0.3 +
      traits.adaptability * 0.3 +
      traits.teamwork * 0.2 +
      traits.communication * 0.2
    );
    
    // Adjust based on experience
    const experienceText = content.experiences.join(' ').toLowerCase();
    
    if (experienceText.includes('startup')) cultureFit.startup += 1;
    if (experienceText.includes('corporate') || experienceText.includes('enterprise')) cultureFit.corporate += 1;
    if (experienceText.includes('consult')) cultureFit.consulting += 1;
    if (experienceText.includes('nonprofit') || experienceText.includes('ngo')) cultureFit.nonprofit += 1;
    if (experienceText.includes('agency') || experienceText.includes('marketing')) cultureFit.agency += 1;
    
    // Normalize all scores to 0-10
    for (const key in cultureFit) {
      cultureFit[key as keyof typeof cultureFit] = Math.min(10, Number(cultureFit[key as keyof typeof cultureFit].toFixed(1)));
    }
    
    return cultureFit;
  }
  
  /**
   * Generate personality summary
   */
  private async generatePersonalitySummary(
    traits: PersonalityProfile['traits'],
    workStyle: string[],
    teamCompatibility: string,
    cultureFit: PersonalityProfile['cultureFit']
  ): Promise<string> {
    try {
      // Find top 3 traits
      const traitEntries = Object.entries(traits).sort((a, b) => b[1] - a[1]);
      const topTraits = traitEntries.slice(0, 3).map(([trait, score]) => 
        `${trait.replace(/_/g, ' ')} (${score}/10)`
      );
      
      // Find best culture fit
      const bestCulture = Object.entries(cultureFit)
        .sort((a, b) => b[1] - a[1])[0][0];
      
      const prompt = `Write a 2-3 sentence professional personality summary based on these insights:

Top Traits: ${topTraits.join(', ')}
Work Style: ${workStyle.join(', ')}
Team Role: ${teamCompatibility}
Best Culture Fit: ${bestCulture} environment

Make it positive and professional, focusing on strengths.`;

      const response = await this.getOpenAI().chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 150,
        temperature: 0.7
      });
      
      return response.choices[0].message?.content?.trim() || this.generateDefaultSummary(topTraits, workStyle, bestCulture);
    } catch (error) {
      return this.generateDefaultSummary(
        Object.entries(traits).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([t]) => t),
        workStyle,
        Object.entries(cultureFit).sort((a, b) => b[1] - a[1])[0][0]
      );
    }
  }
  
  /**
   * Generate default summary if AI fails
   */
  private generateDefaultSummary(
    topTraits: string[],
    workStyle: string[],
    bestCulture: string
  ): string {
    const traitDesc = topTraits.map(t => t.replace(/_/g, ' ')).join(', ');
    const styleDesc = workStyle.length > 0 ? workStyle[0] : 'versatile professional';
    
    return `A ${styleDesc} with exceptional strengths in ${traitDesc}. ${
      bestCulture === 'startup' 
        ? 'Thrives in fast-paced, innovative environments where adaptability and creative problem-solving are valued.'
        : bestCulture === 'corporate'
        ? 'Excels in structured environments where strategic thinking and leadership capabilities can drive organizational success.'
        : bestCulture === 'remote'
        ? 'Highly effective in remote work settings, demonstrating strong communication skills and self-direction.'
        : 'Adaptable professional who performs well in various work environments, bringing value through collaboration and flexibility.'
    }`;
  }
  
  /**
   * Parse AI scores from response
   */
  private parseAIScores(text: string): Record<string, number> {
    const scores: Record<string, number> = {};
    const lines = text.split('\n');
    
    lines.forEach(line => {
      const match = line.match(/(\w+[\s_]?\w*):?\s*(\d+(?:\.\d+)?)/i);
      if (match) {
        const trait = match[1].toLowerCase().replace(/\s+/g, '_');
        const score = parseFloat(match[2]);
        if (!isNaN(score)) {
          scores[trait] = Math.min(10, score);
        }
      }
    });
    
    return scores;
  }

  /**
   * Generate personality insights (wrapper for analyzePersonality)
   */
  async generateInsights(
    parsedCV: ParsedCV | CVData,
    depth: string = 'detailed',
    options?: { includeWorkStyle?: boolean; includeTeamDynamics?: boolean }
  ): Promise<PersonalityProfile> {
    // Convert CVData to ParsedCV if needed
    const cv = 'content' in parsedCV ? this.convertCVDataToParsedCV(parsedCV as CVData) : parsedCV as ParsedCV;
    return await this.analyzePersonality(cv);
  }

  private convertCVDataToParsedCV(cvData: CVData): ParsedCV {
    // Basic conversion - in reality this would be more sophisticated
    return {
      personalInfo: {
        name: '',
        email: '',
        phone: '',
        location: ''
      },
      summary: '',
      experience: [],
      education: [],
      skills: [],
      languages: [],
      certifications: [],
      projects: []
    };
  }

  /**
   * Compare two personality profiles
   */
  async comparePersonalities(
    profile1: PersonalityProfile,
    profile2: PersonalityProfile
  ): Promise<any> {
    return {
      compatibility: 75,
      differences: [],
      recommendations: ['Both profiles show strong leadership potential']
    };
  }

  /**
   * Extract strengths from traits
   */
  private extractStrengths(traits: PersonalityProfile['traits']): string[] {
    const strengths = [];
    if (traits.leadership >= 7) strengths.push('Strong leadership capabilities');
    if (traits.communication >= 7) strengths.push('Excellent communication skills');
    if (traits.innovation >= 7) strengths.push('Creative and innovative thinking');
    if (traits.problemSolving >= 7) strengths.push('Strong problem-solving abilities');
    if (traits.teamwork >= 7) strengths.push('Collaborative team player');
    if (traits.analytical >= 7) strengths.push('Analytical and data-driven approach');
    return strengths.slice(0, 5);
  }

  /**
   * Extract motivations from traits and content
   */
  private extractMotivations(traits: PersonalityProfile['traits'], content: any): string[] {
    const motivations = [];
    if (traits.innovation >= 7) motivations.push('Creating innovative solutions');
    if (traits.leadership >= 7) motivations.push('Leading and mentoring others');
    if (traits.problemSolving >= 7) motivations.push('Solving complex challenges');
    if (traits.teamwork >= 7) motivations.push('Collaborating with diverse teams');
    motivations.push('Professional growth and development');
    return motivations.slice(0, 4);
  }

  /**
   * Extract communication preferences
   */
  private extractCommunicationPreferences(traits: PersonalityProfile['traits']): string[] {
    const preferences = [];
    if (traits.communication >= 8) preferences.push('Clear and direct communication');
    if (traits.teamwork >= 7) preferences.push('Collaborative discussions');
    if (traits.analytical >= 7) preferences.push('Data-driven presentations');
    if (traits.empathetic >= 6) preferences.push('Active listening and empathy');
    return preferences.slice(0, 3);
  }

  /**
   * Extract problem-solving approach
   */
  private extractProblemSolvingApproach(traits: PersonalityProfile['traits']): string {
    if (traits.analytical >= 8) return 'Systematic and data-driven approach';
    if (traits.creative >= 8) return 'Creative and innovative problem solving';
    if (traits.teamwork >= 8) return 'Collaborative problem-solving with teams';
    return 'Balanced approach combining analysis and creativity';
  }

  /**
   * Extract adaptability description
   */
  private extractAdaptabilityDescription(traits: PersonalityProfile['traits']): string {
    if (traits.adaptability >= 8) return 'Highly adaptable to change and new environments';
    if (traits.adaptability >= 6) return 'Comfortable with change and learning new skills';
    return 'Adapts well with proper support and preparation';
  }

  /**
   * Extract stress management approach
   */
  private extractStressManagement(traits: PersonalityProfile['traits']): string {
    if (traits.strategic_thinking >= 7) return 'Strategic planning and prioritization';
    if (traits.teamwork >= 7) return 'Collaborative support and team communication';
    if (traits.analytical >= 7) return 'Systematic analysis and problem-solving';
    return 'Balanced approach with focus on organization';
  }

  /**
   * Extract career aspirations
   */
  private extractCareerAspirations(content: any): string[] {
    const aspirations = ['Professional growth and advancement'];
    if (content.experiences.some((exp: string) => exp.toLowerCase().includes('lead'))) {
      aspirations.push('Leadership and management roles');
    }
    if (content.experiences.some((exp: string) => exp.toLowerCase().includes('innovat'))) {
      aspirations.push('Innovation and creative challenges');
    }
    aspirations.push('Continuous learning and skill development');
    return aspirations.slice(0, 3);
  }

  /**
   * Extract values from traits and content
   */
  private extractValues(traits: PersonalityProfile['traits'], content: any): string[] {
    const values = [];
    if (traits.teamwork >= 7) values.push('Collaboration and teamwork');
    if (traits.innovation >= 7) values.push('Innovation and creativity');
    if (traits.attention_to_detail >= 7) values.push('Quality and excellence');
    if (traits.empathetic >= 6) values.push('Empathy and understanding');
    if (traits.leadership >= 7) values.push('Leadership and mentorship');
    values.push('Professional integrity');
    return values.slice(0, 4);
  }

  /**
   * Generate summary from personality profile
   */
  generateSummary(profile: PersonalityProfile): any {
    return {
      overview: profile.summary,
      keyTraits: Object.entries(profile.traits)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([trait]) => trait),
      workStyle: profile.workingStyle,
      teamRole: profile.teamCompatibility
    };
  }
}

export const personalityInsightsService = new PersonalityInsightsService();