export interface IndustrySpecialization {
  industry: string;
  subIndustries: string[];
  keySkills: string[];
  certifications: string[];
  experienceLevel: 'entry' | 'mid' | 'senior' | 'executive';
}

export interface IndustryMatch {
  industry: string;
  matchScore: number;
  relevantSkills: string[];
  missingSkills: string[];
  recommendations: string[];
}

export interface IndustryAnalysis {
  primaryIndustry: IndustryMatch;
  secondaryIndustries: IndustryMatch[];
  careerTransitionOpportunities: string[];
}

export interface IndustryModel {
  id: string;
  name: string;
  description: string;
  categories: string[];
  requiredSkills: string[];
}

export interface SkillDefinition {
  id: string;
  name: string;
  category: string;
  level: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  description: string;
}

export interface CareerPath {
  id: string;
  title: string;
  industry: string;
  levels: CareerLevel[];
  requirements: string[];
}

export interface CareerLevel {
  level: number;
  title: string;
  responsibilities: string[];
  requiredExperience: number;
  salary?: {
    min: number;
    max: number;
    currency: string;
  };
}

export interface CompanyProfile {
  id: string;
  name: string;
  industry: string;
  size: 'startup' | 'small' | 'medium' | 'large' | 'enterprise';
  culture: string[];
}

export type IndustryTypes = 'technology' | 'healthcare' | 'finance' | 'education' | 'manufacturing' | 'retail' | 'other';