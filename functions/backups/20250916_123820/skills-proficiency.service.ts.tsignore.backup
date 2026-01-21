// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts/**
 * Skills Proficiency Analysis Service  
 * Analyzes and calculates actual skill proficiency levels from CV data
 */

import { ParsedCV } from '../types/enhanced-models';
import OpenAI from 'openai';
import { config } from '../config/environment';

interface SkillProficiency {
  name: string;
  level: number; // 0-100
  category: 'technical' | 'soft' | 'language' | 'tool' | 'framework' | 'platform';
  experience: string; // e.g., "5+ years", "Expert level"
  context: string[]; // Where this skill was used
  verified: boolean; // If we found evidence of usage
}

interface SkillsBreakdown {
  technical: SkillProficiency[];
  soft: SkillProficiency[];
  languages: SkillProficiency[];
  tools: SkillProficiency[];
  frameworks: SkillProficiency[];
  platforms: SkillProficiency[];
}

export class SkillsProficiencyService {
  private openai: OpenAI;

  constructor() {
    this.openai = new OpenAI({
      apiKey: config.openai?.apiKey || process.env.OPENAI_API_KEY || ''
    });
  }

  /**
   * Analyze and calculate skill proficiency from CV data
   */
  async analyzeSkillsProficiency(cv: ParsedCV): Promise<SkillsBreakdown> {
    // Extract all skill mentions from CV
    const skillMentions = await this.extractSkillMentions(cv);
    
    // Calculate proficiency levels
    const proficiencies = await this.calculateProficiencyLevels(skillMentions, cv);
    
    // Categorize skills
    return this.categorizeSkills(proficiencies);
  }

  /**
   * Extract skill mentions from entire CV
   */
  private async extractSkillMentions(cv: ParsedCV): Promise<Map<string, string[]>> {
    const skillMentions = new Map<string, string[]>();

    // Extract from explicit skills section
    if (cv.skills) {
      if (!Array.isArray(cv.skills)) {
        const skillsObj = cv.skills as { technical: string[]; soft: string[]; languages?: string[]; tools?: string[]; };
        
        if (skillsObj.technical) {
          skillsObj.technical.forEach((skill: string) => {
            if (!skillMentions.has(skill)) skillMentions.set(skill, []);
            skillMentions.get(skill)!.push('Listed in technical skills');
          });
        }
        
        if (skillsObj.soft) {
          skillsObj.soft.forEach((skill: string) => {
            if (!skillMentions.has(skill)) skillMentions.set(skill, []);
            skillMentions.get(skill)!.push('Listed in soft skills');
          });
        }
        
        if (skillsObj.languages) {
          skillsObj.languages.forEach((skill: string) => {
            if (!skillMentions.has(skill)) skillMentions.set(skill, []);
            skillMentions.get(skill)!.push('Listed in languages');
          });
        }
      } else {
        // Handle array format
        (cv.skills as string[]).forEach((skill: string) => {
          if (!skillMentions.has(skill)) skillMentions.set(skill, []);
          skillMentions.get(skill)!.push('Listed in skills');
        });
      }
    }

    // Extract from work experience
    if (cv.experience) {
      for (const job of cv.experience) {
        const jobContext = `${job.company} (${job.position})`;
        
        // From job description
        if (job.description) {
          const extractedSkills = await this.extractSkillsFromText(job.description);
          extractedSkills.forEach((skill: any) => {
            if (!skillMentions.has(skill)) skillMentions.set(skill, []);
            skillMentions.get(skill)!.push(jobContext + ' - Description');
          });
        }

        // From achievements
        if (job.achievements) {
          for (const achievement of job.achievements) {
            const extractedSkills = await this.extractSkillsFromText(achievement);
            extractedSkills.forEach((skill: any) => {
              if (!skillMentions.has(skill)) skillMentions.set(skill, []);
              skillMentions.get(skill)!.push(jobContext + ' - Achievement');
            });
          }
        }

        // From technologies used
        if (job.technologies) {
          job.technologies.forEach(tech => {
            if (!skillMentions.has(tech)) skillMentions.set(tech, []);
            skillMentions.get(tech)!.push(jobContext + ' - Technology used');
          });
        }
      }
    }

    return skillMentions;
  }

  /**
   * Extract skills from text using AI or keyword matching
   */
  private async extractSkillsFromText(text: string): Promise<string[]> {
    if (!this.openai.apiKey) {
      return this.fallbackSkillExtraction(text);
    }

    try {
      const prompt = `
Extract technical skills, programming languages, frameworks, tools, and platforms mentioned in this text:

"${text}"

Return only a JSON array of skill names. Focus on:
- Programming languages (JavaScript, Python, Java, etc.)
- Frameworks (React, Angular, Django, etc.)  
- Tools (Docker, Jenkins, Git, etc.)
- Platforms (AWS, Azure, GCP, etc.)
- Databases (PostgreSQL, MongoDB, etc.)
- Technologies and methodologies

Example: ["JavaScript", "React", "AWS", "Docker", "PostgreSQL"]

Return empty array if no technical skills found.
`;

      const response = await this.openai.chat.completions.create({
        model: 'gpt-4',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.1,
        max_tokens: 300
      });

      return JSON.parse(response.choices[0].message.content || '[]');

    } catch (error) {
      return this.fallbackSkillExtraction(text);
    }
  }

  /**
   * Fallback skill extraction using keyword matching
   */
  private fallbackSkillExtraction(text: string): string[] {
    const commonSkills = [
      'JavaScript', 'TypeScript', 'Python', 'Java', 'C#', 'C++', 'React', 'Angular', 'Vue',
      'Node.js', 'Express', 'Django', 'Spring', 'Laravel', 'AWS', 'Azure', 'GCP',
      'Docker', 'Kubernetes', 'Jenkins', 'Git', 'PostgreSQL', 'MySQL', 'MongoDB',
      'Redis', 'Elasticsearch', 'GraphQL', 'REST', 'Microservices', 'Agile', 'Scrum'
    ];

    const lowerText = text.toLowerCase();
    return commonSkills.filter((skill: any) => 
      lowerText.includes(skill.toLowerCase())
    );
  }

  /**
   * Calculate proficiency levels based on context and frequency
   */
  private async calculateProficiencyLevels(
    skillMentions: Map<string, string[]>, 
    cv: ParsedCV
  ): Promise<SkillProficiency[]> {
    const proficiencies: SkillProficiency[] = [];

    for (const [skill, contexts] of skillMentions) {
      const proficiency = await this.calculateSingleSkillProficiency(skill, contexts, cv);
      if (proficiency) {
        proficiencies.push(proficiency);
      }
    }

    return proficiencies;
  }

  /**
   * Calculate proficiency for a single skill
   */
  private async calculateSingleSkillProficiency(
    skill: string, 
    contexts: string[], 
    cv: ParsedCV
  ): Promise<SkillProficiency | null> {
    let level = 30; // Base level

    // Boost for multiple contexts
    level += Math.min(contexts.length * 10, 30);

    // Boost for recent experience
    const careerYears = this.calculateCareerYears(cv);
    const recentContexts = contexts.filter(ctx => 
      ctx.includes('2023') || ctx.includes('2024') || ctx.includes('2025') ||
      ctx.includes('current') || ctx.includes('present')
    );
    
    if (recentContexts.length > 0) {
      level += 15;
    }

    // Boost for leadership/senior contexts
    const seniorContexts = contexts.filter(ctx => 
      ctx.toLowerCase().includes('lead') || 
      ctx.toLowerCase().includes('senior') ||
      ctx.toLowerCase().includes('architect') ||
      ctx.toLowerCase().includes('principal')
    );
    
    if (seniorContexts.length > 0) {
      level += 20;
    }

    // Boost for achievement contexts
    const achievementContexts = contexts.filter(ctx => 
      ctx.includes('Achievement')
    );
    
    if (achievementContexts.length > 0) {
      level += 15;
    }

    // Cap at 100
    level = Math.min(100, level);

    // Determine experience description
    const experience = this.getExperienceDescription(level, contexts.length, careerYears);

    return {
      name: skill,
      level,
      category: this.categorizeSkill(skill),
      experience,
      context: contexts,
      verified: contexts.length > 1 // Verified if mentioned in multiple contexts
    };
  }

  /**
   * Calculate total career years from CV
   */
  private calculateCareerYears(cv: ParsedCV): number {
    if (!cv.experience || cv.experience.length === 0) return 0;

    const startYear = cv.experience
      .map(exp => {
        if (exp.startDate) {
          const match = exp.startDate.match(/\d{4}/);
          return match ? parseInt(match[0]) : null;
        }
        return null;
      })
      .filter(year => year !== null)
      .sort((a, b) => a! - b!)[0];

    const currentYear = new Date().getFullYear();
    return startYear ? currentYear - startYear : 0;
  }

  /**
   * Get experience description based on level and context
   */
  private getExperienceDescription(level: number, contextCount: number, careerYears: number): string {
    if (level >= 90) return `Expert level (${careerYears}+ years)`;
    if (level >= 75) return `Advanced (${Math.floor(careerYears * 0.7)}+ years)`;
    if (level >= 60) return `Proficient (${Math.floor(careerYears * 0.5)}+ years)`;
    if (level >= 40) return `Intermediate (${Math.floor(careerYears * 0.3)}+ years)`;
    return `Basic (${contextCount} mentions)`;
  }

  /**
   * Categorize skill type
   */
  private categorizeSkill(skill: string): SkillProficiency['category'] {
    const lowerSkill = skill.toLowerCase();
    
    const languages = ['javascript', 'typescript', 'python', 'java', 'c#', 'c++', 'go', 'rust', 'swift', 'kotlin'];
    const frameworks = ['react', 'angular', 'vue', 'django', 'spring', 'laravel', 'express', 'flask', 'rails'];
    const platforms = ['aws', 'azure', 'gcp', 'firebase', 'heroku', 'vercel', 'netlify'];
    const tools = ['docker', 'kubernetes', 'jenkins', 'git', 'webpack', 'babel', 'eslint'];
    const softSkills = ['leadership', 'communication', 'teamwork', 'problem solving', 'project management'];
    
    if (languages.some(lang => lowerSkill.includes(lang))) return 'technical';
    if (frameworks.some(fw => lowerSkill.includes(fw))) return 'framework';
    if (platforms.some(plat => lowerSkill.includes(plat))) return 'platform';
    if (tools.some(tool => lowerSkill.includes(tool))) return 'tool';
    if (softSkills.some(soft => lowerSkill.includes(soft))) return 'soft';
    
    // Default to technical for most programming-related skills
    return 'technical';
  }

  /**
   * Categorize skills into breakdown structure
   */
  private categorizeSkills(proficiencies: SkillProficiency[]): SkillsBreakdown {
    return {
      technical: proficiencies.filter(s => s.category === 'technical').slice(0, 8),
      soft: proficiencies.filter(s => s.category === 'soft').slice(0, 5),
      languages: proficiencies.filter(s => s.category === 'language').slice(0, 5),
      tools: proficiencies.filter(s => s.category === 'tool').slice(0, 6),
      frameworks: proficiencies.filter(s => s.category === 'framework').slice(0, 6),
      platforms: proficiencies.filter(s => s.category === 'platform').slice(0, 5)
    };
  }

  /**
   * Generate skills visualization HTML
   */
  generateSkillsVisualizationHTML(skillsBreakdown: SkillsBreakdown): string {
    const allSkills = [
      ...skillsBreakdown.technical,
      ...skillsBreakdown.frameworks,
      ...skillsBreakdown.platforms,
      ...skillsBreakdown.tools
    ].sort((a, b) => b.level - a.level).slice(0, 10); // Top 10 skills

    if (!allSkills.length) {
      return '<p>No skills data available for visualization.</p>';
    }

    return `
      <div class="skills-visualization">
        <h3>Skills Proficiency</h3>
        ${allSkills.map((skill: any) => `
          <div class="skill-item">
            <div class="skill-header">
              <span class="skill-name">${skill.name}</span>
              <span class="skill-percentage">${skill.level}%</span>
            </div>
            <div class="skill-bar-container">
              <div class="skill-bar" style="width: ${skill.level}%"></div>
            </div>
            <div class="skill-meta">
              <span class="skill-experience">${skill.experience}</span>
              <span class="skill-verified">${skill.verified ? '✓ Verified' : '○ Mentioned'}</span>
            </div>
          </div>
        `).join('')}
      </div>
      
      <style>
        .skills-visualization {
          margin: 20px 0;
        }
        .skills-visualization h3 {
          color: #1e40af;
          margin-bottom: 20px;
          font-size: 18px;
          border-bottom: 2px solid #3b82f6;
          padding-bottom: 8px;
        }
        .skill-item {
          margin-bottom: 16px;
          padding: 12px;
          background: #f8fafc;
          border-radius: 8px;
          border-left: 4px solid #3b82f6;
        }
        .skill-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 8px;
        }
        .skill-name {
          font-weight: 600;
          color: #1f2937;
          font-size: 14px;
        }
        .skill-percentage {
          font-weight: 700;
          color: #1e40af;
          font-size: 14px;
        }
        .skill-bar-container {
          width: 100%;
          height: 8px;
          background: #e5e7eb;
          border-radius: 4px;
          overflow: hidden;
          margin-bottom: 6px;
        }
        .skill-bar {
          height: 100%;
          background: linear-gradient(90deg, #3b82f6 0%, #1d4ed8 100%);
          border-radius: 4px;
          transition: width 0.3s ease;
        }
        .skill-meta {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 11px;
          color: #6b7280;
        }
        .skill-experience {
          font-style: italic;
        }
        .skill-verified {
          color: #059669;
          font-weight: 500;
        }
      </style>
    `;
  }
}