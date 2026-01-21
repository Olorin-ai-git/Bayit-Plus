// @ts-ignore - Export conflicts/**
 * Timeline Processor Insights Service
 * Handles analysis and insight generation from timeline events
 */

import { ParsedCV } from '../../../types/enhanced-models';
import { TimelineEvent, TimelineData } from '../types/timeline.types';

export class TimelineProcessorInsightsService {
  
  /**
   * Generate career insights
   */
  async generateInsights(events: TimelineEvent[], cv: ParsedCV): Promise<TimelineData['insights']> {
    try {
      const workEvents = events.filter(e => e?.type === 'work');
      
      // Analyze career progression
      let careerProgression = 'Steady career growth';
      if (workEvents.length > 1) {
        const titles = workEvents.map(e => e.title.toLowerCase());
        const hasManagement = titles.some(t => 
          t.includes('manager') || t.includes('director') || t.includes('lead') || t.includes('head')
        );
        const hasSenior = titles.some(t => t.includes('senior') || t.includes('principal'));
        
        if (hasManagement) {
          careerProgression = 'Progressive advancement into leadership roles';
        } else if (hasSenior) {
          careerProgression = 'Technical expertise growth to senior levels';
        }
      }
      
      return {
        careerProgression,
        industryFocus: this.identifyIndustries(workEvents),
        skillEvolution: this.analyzeSkillEvolution(events),
        nextSteps: this.suggestNextSteps(events, cv)
      };
    } catch (error) {
      return {
        careerProgression: 'Career progression analysis not available',
        industryFocus: [],
        skillEvolution: 'Skill evolution analysis not available',
        nextSteps: []
      };
    }
  }
  
  /**
   * Identify industries from work experience
   */
  private identifyIndustries(workEvents: TimelineEvent[]): string[] {
    const industries = new Set<string>();
    const industryKeywords: Record<string, string[]> = {
      'Technology': ['software', 'tech', 'it', 'digital', 'app', 'platform', 'saas'],
      'Finance': ['bank', 'financial', 'investment', 'trading', 'fintech', 'insurance'],
      'Healthcare': ['health', 'medical', 'pharma', 'hospital', 'clinic', 'biotech'],
      'E-commerce': ['ecommerce', 'retail', 'marketplace', 'shopping'],
      'Education': ['education', 'university', 'school', 'learning', 'training'],
      'Consulting': ['consulting', 'advisory', 'strategy', 'management consulting']
    };
    
    for (const event of workEvents) {
      const combined = `${event.organization} ${event.description || ''}`.toLowerCase();
      for (const [industry, keywords] of Object.entries(industryKeywords)) {
        if (keywords.some(keyword => combined.includes(keyword))) {
          industries.add(industry);
        }
      }
    }
    
    return Array.from(industries).slice(0, 3);
  }
  
  /**
   * Analyze skill evolution over time
   */
  private analyzeSkillEvolution(events: TimelineEvent[]): string {
    const workEvents = events.filter(e => e?.type === 'work');
    
    if (workEvents.length === 0) {
      return 'Building foundational skills';
    }
    
    const earliestSkills = workEvents[0].skills || [];
    const latestSkills = workEvents[workEvents.length - 1].skills || [];
    
    // Check for technology progression
    const hasProgression = latestSkills.some(skill => 
      !earliestSkills.includes(skill) && 
      (skill.includes('lead') || skill.includes('architect') || skill.includes('senior'))
    );
    
    if (hasProgression) {
      return 'Evolution from implementation to architecture and leadership';
    }
    
    // Check for specialization
    if (latestSkills.length > earliestSkills.length * 1.5) {
      return 'Expanding technical expertise across multiple domains';
    }
    
    return 'Deepening expertise in core technology areas';
  }
  
  /**
   * Suggest next career steps
   */
  private suggestNextSteps(events: TimelineEvent[], cv: ParsedCV): string[] {
    const suggestions: string[] = [];
    const workEvents = events.filter(e => e?.type === 'work');
    const certEvents = events.filter(e => e?.type === 'certification');
    
    // Check current role level
    const currentRole = workEvents.find(e => e?.current);
    if (currentRole) {
      const title = currentRole.title.toLowerCase();
      
      if (!title.includes('senior') && !title.includes('lead') && !title.includes('manager')) {
        suggestions.push('Consider advancing to a senior or lead position');
      } else if (!title.includes('manager') && !title.includes('director')) {
        suggestions.push('Explore management or technical leadership opportunities');
      }
    }
    
    // Check for recent certifications
    const recentCerts = certEvents.filter(e => 
      new Date(e.startDate).getTime() > Date.now() - (365 * 24 * 60 * 60 * 1000)
    );
    
    if (recentCerts.length === 0) {
      suggestions.push('Update certifications to stay current with industry standards');
    }
    
    // Skills recommendations
    const technicalSkills = this.getTechnicalSkills(cv?.skills);
    if (technicalSkills.length > 0) {
      const hasCloud = technicalSkills.some(s => 
        s.toLowerCase().includes('aws') || 
        s.toLowerCase().includes('azure') || 
        s.toLowerCase().includes('gcp')
      );
      
      if (!hasCloud) {
        suggestions.push('Add cloud platform expertise (AWS, Azure, or GCP)');
      }
      
      const hasAI = technicalSkills.some(s => 
        s.toLowerCase().includes('ai') || 
        s.toLowerCase().includes('machine learning') || 
        s.toLowerCase().includes('ml')
      );
      
      if (!hasAI) {
        suggestions.push('Explore AI/ML technologies to stay ahead of industry trends');
      }
    }
    
    return suggestions.slice(0, 4);
  }
  
  /**
   * Helper function to safely extract technical skills from various skill formats
   */
  private getTechnicalSkills(skills: string[] | { [key: string]: string[]; technical?: string[]; soft?: string[]; languages?: string[]; tools?: string[]; frontend?: string[]; backend?: string[]; databases?: string[]; cloud?: string[]; competencies?: string[]; frameworks?: string[]; expertise?: string[]; } | undefined): string[] {
    if (!skills) return [];
    if (Array.isArray(skills)) return skills; // Assume all are technical if it's an array
    
    // Combine all technical skill categories
    const technicalCategories = ['technical', 'frontend', 'backend', 'databases', 'cloud', 'frameworks', 'tools', 'expertise'];
    const allTechnicalSkills: string[] = [];
    
    for (const category of technicalCategories) {
      if (skills[category] && Array.isArray(skills[category])) {
        allTechnicalSkills.push(...skills[category]);
      }
    }
    
    return allTechnicalSkills;
  }
}

export const timelineProcessorInsightsService = new TimelineProcessorInsightsService();