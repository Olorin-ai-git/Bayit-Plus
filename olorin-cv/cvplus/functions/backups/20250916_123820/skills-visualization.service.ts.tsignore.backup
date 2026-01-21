// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts/**
 * Skills Visualization Service
 */

import { ParsedCV, SkillsVisualization, SkillCategory, LanguageSkill, Certification } from '../types/enhanced-models';
import OpenAI from 'openai';
import { config } from '../config/environment';

export class SkillsVisualizationService {
  private openai: OpenAI | null = null;
  
  // Color palette for skill categories
  private readonly categoryColors = [
    '#4A90E2', '#50C878', '#FF6B6B', '#FFA500', 
    '#9B59B6', '#1ABC9C', '#E74C3C', '#34495E',
    '#2ECC71', '#3498DB', '#F39C12', '#8E44AD'
  ];
  
  // Common skill categories
  private readonly skillCategories = {
    technical: {
      programming: ['javascript', 'typescript', 'python', 'java', 'c++', 'c#', 'ruby', 'go', 'rust', 'swift', 'kotlin', 'php', 'scala'],
      frameworks: ['react', 'angular', 'vue', 'next.js', 'express', 'django', 'flask', 'spring', 'rails', '.net', 'laravel'],
      databases: ['mysql', 'postgresql', 'mongodb', 'redis', 'elasticsearch', 'cassandra', 'dynamodb', 'oracle'],
      cloud: ['aws', 'azure', 'gcp', 'docker', 'kubernetes', 'terraform', 'jenkins', 'ci/cd'],
      tools: ['git', 'jira', 'slack', 'vscode', 'intellij', 'postman', 'figma', 'photoshop']
    },
    soft: {
      leadership: ['leadership', 'management', 'mentoring', 'coaching', 'delegation', 'decision making'],
      communication: ['communication', 'presentation', 'public speaking', 'writing', 'negotiation', 'listening'],
      collaboration: ['teamwork', 'collaboration', 'cross-functional', 'stakeholder management', 'conflict resolution'],
      analytical: ['problem solving', 'analytical thinking', 'critical thinking', 'research', 'data analysis'],
      creative: ['creativity', 'innovation', 'design thinking', 'ideation', 'brainstorming']
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
   * Analyze and visualize skills from CV
   */
  async analyzeSkills(parsedCV: ParsedCV, targetRole?: string): Promise<SkillsVisualization> {
    // 1. Extract and categorize technical skills
    const technicalSkills = await this.analyzeTechnicalSkills(parsedCV);
    
    // 2. Extract and analyze soft skills
    const softSkills = await this.analyzeSoftSkills(parsedCV);
    
    // 3. Analyze language skills
    const languages = this.analyzeLanguageSkills(parsedCV);
    
    // 4. Process certifications
    const certifications = this.processCertifications(parsedCV);
    
    return {
      technical: technicalSkills,
      soft: softSkills,
      languages,
      certifications
    };
  }
  
  /**
   * Analyze technical skills
   */
  private async analyzeTechnicalSkills(cv: ParsedCV): Promise<SkillCategory[]> {
    const categories: SkillCategory[] = [];
    // Extract all text is done in individual analysis methods
    
    // Extract skills from CV
    const extractedSkills = this.extractSkillsFromCV(cv);
    
    // Infer skills from experience
    const inferredSkills = await this.inferSkillsFromExperience(cv);
    
    // Combine all skills
    const allSkills = new Set([...extractedSkills.technical, ...inferredSkills]);
    
    // Categorize skills
    for (const [categoryName, keywords] of Object.entries(this.skillCategories.technical)) {
      const categorySkills: Array<{
        name: string;
        level: number;
        yearsOfExperience?: number;
        lastUsed?: Date;
        endorsed?: boolean;
      }> = [];
      
      allSkills.forEach((skill: any) => {
        const skillLower = skill.toLowerCase();
        if (keywords.some(keyword => skillLower.includes(keyword))) {
          const skillData = {
            name: skill,
            level: this.assessSkillLevel(skill, cv),
            yearsOfExperience: this.estimateYearsOfExperience(skill, cv),
            lastUsed: this.findLastUsed(skill, cv) || null, // Ensure no undefined values for Firestore
            endorsed: false // Can be updated based on external data
          };
          categorySkills.push(skillData);
        }
      });
      
      if (categorySkills.length > 0) {
        categories.push({
          name: this.formatCategoryName(categoryName),
          skills: categorySkills.sort((a, b) => b.level - a.level),
          color: this.categoryColors[categories.length % this.categoryColors.length]
        });
      }
    }
    
    // Add uncategorized skills
    const categorizedSkills = new Set(
      categories.flatMap(cat => cat.skills.map(s => s.name.toLowerCase()))
    );
    
    const uncategorized = Array.from(allSkills).filter(
      skill => !categorizedSkills.has(skill.toLowerCase())
    );
    
    if (uncategorized.length > 0) {
      categories.push({
        name: 'Other Technical Skills',
        skills: uncategorized.map((skill: any) => ({
          name: skill,
          level: this.assessSkillLevel(skill, cv),
          yearsOfExperience: this.estimateYearsOfExperience(skill, cv)
        })),
        color: this.categoryColors[categories.length % this.categoryColors.length]
      });
    }
    
    return categories;
  }
  
  /**
   * Analyze soft skills
   */
  private async analyzeSoftSkills(cv: ParsedCV): Promise<SkillCategory[]> {
    const categories: SkillCategory[] = [];
    // Extract all text is done in individual analysis methods
    
    // Extract explicitly mentioned soft skills
    const explicitSkills = cv.skills && !Array.isArray(cv.skills) 
      ? (cv.skills as { technical: string[]; soft: string[]; languages?: string[]; tools?: string[]; }).soft || []
      : [];
    
    // Infer soft skills from achievements and experience
    const inferredSkills = await this.inferSoftSkillsFromContent(cv);
    
    // Combine and deduplicate
    const allSoftSkills = new Set([...explicitSkills, ...inferredSkills]);
    
    // Categorize soft skills
    for (const [categoryName, keywords] of Object.entries(this.skillCategories.soft)) {
      const categorySkills: Array<{
        name: string;
        level: number;
        yearsOfExperience?: number;
      }> = [];
      
      allSoftSkills.forEach((skill: any) => {
        const skillLower = skill.toLowerCase();
        if (keywords.some(keyword => skillLower.includes(keyword))) {
          categorySkills.push({
            name: skill,
            level: this.assessSoftSkillLevel(skill, cv)
          });
        }
      });
      
      if (categorySkills.length > 0) {
        categories.push({
          name: this.formatCategoryName(categoryName),
          skills: categorySkills.sort((a, b) => b.level - a.level),
          color: this.categoryColors[categories.length % this.categoryColors.length]
        });
      }
    }
    
    return categories;
  }
  
  /**
   * Analyze language skills
   */
  private analyzeLanguageSkills(cv: ParsedCV): LanguageSkill[] {
    const languages: LanguageSkill[] = [];
    
    // Check explicit language skills
    if (cv.skills && !Array.isArray(cv.skills)) {
      const skillsObj = cv.skills as { technical: string[]; soft: string[]; languages?: string[]; tools?: string[]; };
      if (skillsObj.languages) {
        skillsObj.languages.forEach((lang: string) => {
          const parsed = this.parseLanguageSkill(lang);
          languages.push(parsed);
        });
      }
    }
    
    // Infer from education or certifications
    if (cv.education) {
      cv.education.forEach((edu: any) => {
        const langMatch = edu.field?.match(/language|linguistics|translation/i);
        if (langMatch) {
          // Extract language from degree
          const langFromDegree = this.extractLanguageFromEducation(edu);
          if (langFromDegree && !languages.find(l => l.language === langFromDegree.language)) {
            languages.push(langFromDegree);
          }
        }
      });
    }
    
    // Always include English if any content exists
    if (!languages.find(l => l.language.toLowerCase() === 'english')) {
      languages.unshift({
        language: 'English',
        proficiency: 'professional',
        certifications: []
      });
    }
    
    return languages;
  }
  
  /**
   * Process certifications
   */
  private processCertifications(cv: ParsedCV): Certification[] {
    const certifications: Certification[] = [];
    
    if (cv.certifications) {
      cv.certifications.forEach(cert => {
        const processed: Certification = {
          id: `cert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          name: cert.name,
          issuer: cert.issuer,
          issueDate: new Date(cert.date),
          date: new Date(cert.date),
          credentialId: cert.credentialId,
          verificationUrl: this.generateVerificationUrl(cert),
          badgeUrl: this.generateBadgeUrl(cert),
          badge: this.generateBadgeUrl(cert),
          isVerified: false,
          category: this.categorizeCertification(cert.name)
        };
        
        // Estimate expiry date for common certifications
        const expiryMonths = this.getExpiryMonths(cert.name);
        if (expiryMonths) {
          const expiryDate = new Date(cert.date);
          expiryDate.setMonth(expiryDate.getMonth() + expiryMonths);
          processed.expiryDate = expiryDate;
        }
        
        certifications.push(processed);
      });
    }
    
    // Sort by date (most recent first)
    return certifications.sort((a, b) => b.date.getTime() - a.date.getTime());
  }
  
  /**
   * Extract skills from CV
   */
  private extractSkillsFromCV(cv: ParsedCV): { technical: string[]; soft: string[] } {
    if (!cv.skills || Array.isArray(cv.skills)) {
      return { technical: Array.isArray(cv.skills) ? cv.skills : [], soft: [] };
    }
    
    const skillsObj = cv.skills as { technical: string[]; soft: string[]; languages?: string[]; tools?: string[]; };
    const technical = skillsObj.technical || [];
    const soft = skillsObj.soft || [];
    const tools = skillsObj.tools || [];
    
    return {
      technical: [...technical, ...tools],
      soft
    };
  }
  
  /**
   * Infer skills from experience using AI
   */
  private async inferSkillsFromExperience(cv: ParsedCV): Promise<string[]> {
    if (!cv.experience || cv.experience.length === 0) return [];
    
    try {
      const experienceText = cv.experience
        .map(exp => `${exp.position} at ${exp.company}: ${exp.description} ${exp.achievements?.join('. ')}`)
        .join('\n');
      
      const prompt = `Extract technical skills from this work experience. Return only skill names as a comma-separated list:

${experienceText}

Technical skills only (languages, frameworks, tools, platforms):`;

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
      
      const skills = response.choices[0].message?.content
        ?.trim()
        .split(',')
        .map(s => s.trim())
        .filter(s => s.length > 0) || [];
      
      return skills;
    } catch (error) {
      return [];
    }
  }
  
  /**
   * Infer soft skills from content
   */
  private async inferSoftSkillsFromContent(cv: ParsedCV): Promise<string[]> {
    const softSkills: string[] = [];
    const allText = this.extractAllText(cv);
    
    // Leadership indicators
    if (allText.match(/led|managed|supervised|directed|coordinated/i)) {
      softSkills.push('Leadership');
    }
    
    // Communication indicators
    if (allText.match(/presented|wrote|documented|communicated|liaised/i)) {
      softSkills.push('Communication');
    }
    
    // Teamwork indicators
    if (allText.match(/collaborated|team|cross-functional|partnered/i)) {
      softSkills.push('Teamwork');
    }
    
    // Problem solving indicators
    if (allText.match(/solved|resolved|troubleshot|analyzed|improved/i)) {
      softSkills.push('Problem Solving');
    }
    
    // Project management indicators
    if (allText.match(/project management|agile|scrum|delivered|planned/i)) {
      softSkills.push('Project Management');
    }
    
    return softSkills;
  }
  
  /**
   * Assess skill level based on context
   */
  private assessSkillLevel(skill: string, cv: ParsedCV): number {
    let level = 5; // Base level
    const skillLower = skill.toLowerCase();
    
    // Check years of experience
    const years = this.estimateYearsOfExperience(skill, cv);
    if (years > 5) level += 3;
    else if (years > 3) level += 2;
    else if (years > 1) level += 1;
    
    // Check if in recent experience
    if (cv.experience?.[0]?.technologies?.some(t => t.toLowerCase() === skillLower)) {
      level += 1;
    }
    
    // Check if mentioned in achievements
    const achievements = cv.experience?.flatMap(e => e.achievements || []).join(' ');
    if (achievements?.toLowerCase().includes(skillLower)) {
      level += 1;
    }
    
    return Math.min(10, level);
  }
  
  /**
   * Assess soft skill level
   */
  private assessSoftSkillLevel(skill: string, cv: ParsedCV): number {
    let level = 5;
    const allText = this.extractAllText(cv).toLowerCase();
    const skillLower = skill.toLowerCase();
    
    // Count mentions
    const mentions = (allText.match(new RegExp(skillLower, 'gi')) || []).length;
    level += Math.min(3, mentions);
    
    // Check for leadership roles
    if (skillLower.includes('leadership') && allText.match(/manager|director|lead|head/i)) {
      level += 2;
    }
    
    return Math.min(10, level);
  }
  
  /**
   * Estimate years of experience for a skill
   */
  private estimateYearsOfExperience(skill: string, cv: ParsedCV): number {
    if (!cv.experience) return 0;
    
    let totalYears = 0;
    const skillLower = skill.toLowerCase();
    
    cv.experience.forEach(exp => {
      const hasSkill = 
        exp.technologies?.some(t => t.toLowerCase().includes(skillLower)) ||
        exp.description?.toLowerCase().includes(skillLower) ||
        exp.achievements?.some(a => a.toLowerCase().includes(skillLower));
      
      if (hasSkill && exp.startDate) {
        const start = new Date(exp.startDate);
        const end = exp.endDate ? new Date(exp.endDate) : new Date();
        const years = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 365);
        totalYears += years;
      }
    });
    
    return Math.round(totalYears);
  }
  
  /**
   * Find when skill was last used
   */
  private findLastUsed(skill: string, cv: ParsedCV): Date | null {
    if (!cv.experience) return null;
    
    const skillLower = skill.toLowerCase();
    
    for (const exp of cv.experience) {
      const hasSkill = 
        exp.technologies?.some(t => t.toLowerCase().includes(skillLower)) ||
        exp.description?.toLowerCase().includes(skillLower);
      
      if (hasSkill) {
        return exp.endDate ? new Date(exp.endDate) : new Date();
      }
    }
    
    return null; // Return null instead of undefined for Firestore compatibility
  }
  
  /**
   * Parse language skill string
   */
  private parseLanguageSkill(langString: string): LanguageSkill {
    const proficiencyMap: Record<string, LanguageSkill['proficiency']> = {
      native: 'native',
      fluent: 'fluent',
      professional: 'professional',
      conversational: 'conversational',
      basic: 'basic',
      advanced: 'fluent',
      intermediate: 'conversational',
      beginner: 'basic'
    };
    
    // Try to extract proficiency
    let language = langString;
    let proficiency: LanguageSkill['proficiency'] = 'professional';
    
    for (const [key, value] of Object.entries(proficiencyMap)) {
      if (langString.toLowerCase().includes(key)) {
        proficiency = value;
        language = langString.replace(new RegExp(key, 'i'), '').trim();
        break;
      }
    }
    
    // Clean up language name
    language = language.replace(/[(),-]/g, '').trim();
    
    return {
      language: language.charAt(0).toUpperCase() + language.slice(1),
      proficiency,
      certifications: []
    };
  }
  
  /**
   * Extract language from education
   */
  private extractLanguageFromEducation(edu: any): LanguageSkill | null {
    const field = edu.field?.toLowerCase() || '';
    const degree = edu.degree?.toLowerCase() || '';
    
    // Common language patterns in degrees
    const languagePatterns = [
      /(\w+)\s+language/i,
      /(\w+)\s+linguistics/i,
      /(\w+)\s+literature/i,
      /(\w+)\s+studies/i
    ];
    
    for (const pattern of languagePatterns) {
      const match = field.match(pattern) || degree.match(pattern);
      if (match && match[1]) {
        return {
          language: match[1].charAt(0).toUpperCase() + match[1].slice(1),
          proficiency: 'professional',
          certifications: []
        };
      }
    }
    
    return null;
  }
  
  /**
   * Generate verification URL for certification
   */
  private generateVerificationUrl(cert: any): string | undefined {
    if (cert.credentialId) {
      // Common certification providers
      const providers: Record<string, string> = {
        microsoft: 'https://www.credly.com/badges/',
        aws: 'https://www.credly.com/badges/',
        google: 'https://www.credential.net/',
        cisco: 'https://www.cisco.com/c/en/us/training-events/training-certifications/certifications.html',
        comptia: 'https://www.comptia.org/certifications/verify',
      };
      
      const issuerLower = cert.issuer.toLowerCase();
      for (const [provider, baseUrl] of Object.entries(providers)) {
        if (issuerLower.includes(provider)) {
          return baseUrl + cert.credentialId;
        }
      }
    }
    
    return undefined;
  }
  
  /**
   * Generate badge URL for certification
   */
  private generateBadgeUrl(cert: any): string | undefined {
    // Placeholder - would integrate with actual badge providers
    // Badge providers list (for future implementation)
    // const badgeProviders = ['credly', 'acclaim', 'badgr'];
    
    // For demo purposes, return a placeholder
    return undefined;
  }
  
  /**
   * Categorize certification
   */
  private categorizeCertification(certName: string): string {
    const certLower = certName.toLowerCase();
    
    if (certLower.includes('aws') || certLower.includes('azure') || certLower.includes('gcp')) return 'Cloud';
    if (certLower.includes('microsoft') || certLower.includes('office')) return 'Microsoft';
    if (certLower.includes('cisco') || certLower.includes('network')) return 'Networking';
    if (certLower.includes('comptia') || certLower.includes('security')) return 'Security';
    if (certLower.includes('pmp') || certLower.includes('project')) return 'Project Management';
    if (certLower.includes('scrum') || certLower.includes('agile')) return 'Agile/Scrum';
    if (certLower.includes('google') || certLower.includes('analytics')) return 'Google';
    
    return 'Other';
  }

  /**
   * Get expiry months for common certifications
   */
  private getExpiryMonths(certName: string): number | null {
    const certLower = certName.toLowerCase();
    
    // Common certification expiry periods
    if (certLower.includes('aws')) return 36;
    if (certLower.includes('microsoft') || certLower.includes('azure')) return 24;
    if (certLower.includes('cisco')) return 36;
    if (certLower.includes('comptia')) return 36;
    if (certLower.includes('pmp')) return 36;
    if (certLower.includes('scrum') || certLower.includes('agile')) return 24;
    
    return null;
  }
  
  /**
   * Extract all text from CV
   */
  private extractAllText(cv: ParsedCV): string {
    const parts: string[] = [];
    
    if (cv.personalInfo?.summary) parts.push(cv.personalInfo.summary);
    
    if (cv.experience) {
      cv.experience.forEach(exp => {
        parts.push(exp.position, exp.company, exp.description || '');
        if (exp.achievements) parts.push(...exp.achievements);
      });
    }
    
    if (cv.skills) {
      if (Array.isArray(cv.skills)) {
        parts.push(...cv.skills);
      } else {
        parts.push(...((cv.skills as any).technical || []));
        parts.push(...((cv.skills as any).soft || []));
      }
    }
    
    return parts.join(' ');
  }
  
  /**
   * Format category name
   */
  private formatCategoryName(name: string): string {
    return name
      .split(/[\s_-]/)
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }
  
  /**
   * Generate skills matrix for visualization
   */
  generateSkillsMatrix(visualization: SkillsVisualization): {
    labels: string[];
    datasets: Array<{
      label: string;
      data: number[];
      backgroundColor: string;
    }>;
  } {
    const allSkills = new Set<string>();
    const categories: string[] = [];
    
    // Collect all unique skills
    [...visualization.technical, ...visualization.soft].forEach(category => {
      categories.push(category.name);
      category.skills.forEach((skill: any) => allSkills.add(skill.name));
    });
    
    const labels = Array.from(allSkills);
    const datasets = categories.map((categoryName, index) => {
      const category = [...visualization.technical, ...visualization.soft]
        .find(c => c.name === categoryName);
      
      const data = labels.map(skillName => {
        const skill = category?.skills.find(s => s.name === skillName);
        return skill ? skill.level : 0;
      });
      
      const colors = [
        '#4A90E2', '#50C878', '#FF6B6B', '#FFA500', 
        '#9B59B6', '#1ABC9C', '#E74C3C', '#34495E'
      ];
      
      return {
        label: categoryName,
        data,
        backgroundColor: colors[index % colors.length]
      };
    });
    
    return { labels, datasets };
  }

  /**
   * Generate skills visualization
   */
  async generateVisualization(
    parsedCV: ParsedCV,
    chartTypes: string[] = ['radar', 'bar'],
    options?: { includeProgress?: boolean; includeEndorsements?: boolean }
  ): Promise<SkillsVisualization> {
    return await this.analyzeSkills(parsedCV);
  }

  /**
   * Export skills data to CSV
   */
  exportToCSV(visualization: SkillsVisualization): string {
    let csv = 'Category,Skill,Level,Experience\n';
    
    // Export technical skills
    visualization.technical.forEach((category: SkillCategory) => {
      category.skills.forEach((skill: any) => {
        csv += `${category.name},${skill.name},${skill.level},${skill.yearsOfExperience || 'N/A'}\n`;
      });
    });
    
    // Export soft skills  
    visualization.soft.forEach((category: SkillCategory) => {
      category.skills.forEach((skill: any) => {
        csv += `${category.name},${skill.name},${skill.level},${skill.yearsOfExperience || 'N/A'}\n`;
      });
    });
    
    return csv;
  }

  /**
   * Add endorsement to visualization
   */
  async addEndorsement(
    visualization: SkillsVisualization,
    skillName: string,
    endorsement: any
  ): Promise<SkillsVisualization> {
    // Add endorsement logic here
    return visualization;
  }
}

export const skillsVisualizationService = new SkillsVisualizationService();