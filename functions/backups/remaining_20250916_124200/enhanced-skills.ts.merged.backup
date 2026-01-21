// @ts-ignore - Export conflicts/**
 * Enhanced Skills and Certification Types
 * 
 * Skill visualization, certification management, and language proficiency types
 * for enhanced CV features. Focuses on skills presentation and validation.
 * 
 * @author Gil Klainert
 * @version 1.0.0
 */

/**
 * Flexible skills format that supports various skill organization structures
 * Used throughout the system to handle different ways skills can be structured
 */
export type FlexibleSkillsFormat = string[] | {
  [key: string]: string[];
  technical?: string[];
  soft?: string[];
  languages?: string[];
  tools?: string[];
  frontend?: string[];
  backend?: string[];
  databases?: string[];
  cloud?: string[];
  competencies?: string[];
  frameworks?: string[];
  expertise?: string[];
} | undefined;

/**
 * Skills visualization configuration
 * Controls how skills are displayed in interactive visualizations
 */
export interface SkillsVisualization {
  /** Technical skills categorized by type */
  technical: SkillCategory[];
  
  /** Soft skills categorized by type */
  soft: SkillCategory[];
  
  /** Language skills */
  languages?: LanguageSkill[];
  
  /** Professional certifications */
  certifications?: Certification[];
  
  /** Visualization layout type */
  layout?: 'radar' | 'bar' | 'bubble' | 'tree';
  
  /** Color scheme identifier */
  colorScheme?: string;
  
  /** Whether to enable animations in the visualization */
  animations?: boolean;
}

/**
 * Skill category grouping
 * Groups related skills together for better organization and visualization
 */
export interface SkillCategory {
  /** Category name (e.g., "Frontend Development", "Data Analysis") */
  name: string;
  
  /** Skills within this category */
  skills: Array<{
    /** Skill name */
    name: string;
    
    /** Proficiency level (1-10 scale) */
    level: number;
    
    /** Years of experience with this skill */
    yearsOfExperience?: number;
    
    /** Whether the user has certification for this skill */
    certified?: boolean;
  }>;
  
  /** Display color for the category */
  color: string;
  
  /** Optional icon identifier for visual representation */
  icon?: string;
}

/**
 * Language proficiency data
 * Represents language skills and proficiency levels
 */
export interface LanguageSkill {
  /** Language name (e.g., "English", "Spanish", "Mandarin") */
  language: string;
  
  /** Proficiency level according to common standards */
  proficiency: 'beginner' | 'intermediate' | 'advanced' | 'native' | 'basic' | 'conversational' | 'professional' | 'fluent';
  
  /** Whether the user has official certification */
  certified?: boolean;
  
  /** Name of the certification if applicable */
  certificationName?: string;
  
  /** Alternative property name for certifications (backward compatibility) */
  certifications?: string[];
}

/**
 * Professional certification data
 * Represents professional certifications, licenses, and credentials
 */
export interface Certification {
  /** Unique identifier */
  id: string;
  
  /** Certification name */
  name: string;
  
  /** Issuing organization or authority */
  issuer: string;
  
  /** Date when certification was issued */
  issueDate: Date;
  
  /** Legacy date property for backward compatibility */
  date: Date;
  
  /** Optional expiration date for time-limited certifications */
  expirationDate?: Date;
  
  /** Legacy expiry date property for backward compatibility */
  expiryDate?: Date;
  
  /** Credential ID or certificate number */
  credentialId?: string;
  
  /** URL for verification of the certification */
  verificationUrl?: string;
  
  /** Optional digital badge URL */
  badgeUrl?: string;
  
  /** Legacy badge property for backward compatibility */
  badge?: string;
  
  /** Whether this certification has been verified */
  isVerified: boolean;
  
  /** Certification category (e.g., "IT", "Project Management", "Marketing") */
  category: string;
}