/**
 * Validation Constants
 * 
 * Constants for data validation rules and constraints.
 * 
 * @author Gil Klainert
 * @version 1.0.0
  */

// ============================================================================
// FIELD LENGTH CONSTRAINTS
// ============================================================================

export const FIELD_LENGTHS = {
  // Personal Information
  FIRST_NAME: { min: 1, max: 50 },
  LAST_NAME: { min: 1, max: 50 },
  EMAIL: { min: 5, max: 255 },
  PHONE: { min: 10, max: 20 },
  SUMMARY: { min: 10, max: 500 },
  OBJECTIVE: { min: 10, max: 300 },
  
  // Work Experience
  COMPANY_NAME: { min: 1, max: 100 },
  JOB_TITLE: { min: 1, max: 100 },
  JOB_DESCRIPTION: { min: 10, max: 2000 },
  RESPONSIBILITY: { min: 5, max: 200 },
  ACHIEVEMENT: { min: 5, max: 200 },
  
  // Education
  INSTITUTION: { min: 1, max: 100 },
  DEGREE: { min: 1, max: 100 },
  FIELD_OF_STUDY: { min: 1, max: 100 },
  
  // Skills
  SKILL_NAME: { min: 1, max: 50 },
  SKILL_DESCRIPTION: { min: 0, max: 200 },
  
  // Projects
  PROJECT_NAME: { min: 1, max: 100 },
  PROJECT_DESCRIPTION: { min: 10, max: 1000 },
  PROJECT_HIGHLIGHT: { min: 5, max: 200 },
  
  // Certifications
  CERTIFICATION_NAME: { min: 1, max: 100 },
  CERTIFICATION_ISSUER: { min: 1, max: 100 },
  CERTIFICATION_ID: { min: 1, max: 100 },
  
  // Achievements
  ACHIEVEMENT_TITLE: { min: 1, max: 100 },
  ACHIEVEMENT_DESCRIPTION: { min: 10, max: 500 },
  
  // General
  URL: { min: 5, max: 500 },
  LOCATION: { min: 1, max: 100 },
  GENERIC_TEXT: { min: 1, max: 1000 },
} as const;

// ============================================================================
// REGEX PATTERNS
// ============================================================================

export const REGEX_PATTERNS = {
  EMAIL: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
  PHONE: /^\+?[\d\s\-\(\)]{10,20}$/,
  URL: /^https?:\/\/(?:www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b(?:[-a-zA-Z0-9()@:%_\+.~#?&=]*)$/,
  LINKEDIN: /^https?:\/\/(www\.)?linkedin\.com\/in\/[a-zA-Z0-9-]+\/?$/,
  GITHUB: /^https?:\/\/(www\.)?github\.com\/[a-zA-Z0-9-]+\/?$/,
  POSTAL_CODE: /^[a-zA-Z0-9\s-]{3,10}$/,
  PASSWORD: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
  USERNAME: /^[a-zA-Z0-9_]{3,30}$/,
  DATE: /^\d{4}-\d{2}-\d{2}$/,
  TIME: /^\d{2}:\d{2}$/,
  DATETIME: /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/,
  SLUG: /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
  HEX_COLOR: /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/,
  UUID: /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
} as const;

// ============================================================================
// VALIDATION MESSAGES
// ============================================================================

export const VALIDATION_MESSAGES = {
  REQUIRED: 'This field is required',
  INVALID_EMAIL: 'Please enter a valid email address',
  INVALID_PHONE: 'Please enter a valid phone number',
  INVALID_URL: 'Please enter a valid URL',
  INVALID_DATE: 'Please enter a valid date',
  INVALID_PASSWORD: 'Password must be at least 8 characters with uppercase, lowercase, number and special character',
  TOO_SHORT: (min: number) => `Must be at least ${min} characters`,
  TOO_LONG: (max: number) => `Must be no more than ${max} characters`,
  INVALID_FORMAT: 'Invalid format',
  INVALID_OPTION: 'Invalid option selected',
  FILE_TOO_LARGE: (maxSize: string) => `File size must be less than ${maxSize}`,
  UNSUPPORTED_FILE_TYPE: 'File type not supported',
  FUTURE_DATE_NOT_ALLOWED: 'Future dates are not allowed',
  END_DATE_BEFORE_START: 'End date must be after start date',
  DUPLICATE_ENTRY: 'This entry already exists',
  INVALID_GPA: 'GPA must be between 0.0 and 4.0',
  INVALID_PERCENTAGE: 'Must be between 0 and 100',
  INVALID_EXPERIENCE_YEARS: 'Years of experience must be between 0 and 50',
} as const;

// ============================================================================
// VALIDATION RULES
// ============================================================================

export const VALIDATION_RULES = {
  // GPA validation
  GPA: {
    min: 0.0,
    max: 4.0,
    decimal_places: 2,
  },
  
  // Years of experience
  EXPERIENCE_YEARS: {
    min: 0,
    max: 50,
  },
  
  // Percentage values
  PERCENTAGE: {
    min: 0,
    max: 100,
  },
  
  // Rating scales
  SKILL_RATING: {
    min: 1,
    max: 5,
  },
  
  // File validation
  FILE_UPLOAD: {
    max_files: 10,
    allowed_extensions: ['.pdf', '.doc', '.docx', '.txt', '.rtf'],
    max_size_mb: 10,
  },
  
  // Array size limits
  ARRAY_LIMITS: {
    work_experience: { min: 0, max: 20 },
    education: { min: 0, max: 10 },
    skills: { min: 0, max: 100 },
    projects: { min: 0, max: 50 },
    certifications: { min: 0, max: 50 },
    achievements: { min: 0, max: 20 },
    languages: { min: 0, max: 20 },
    references: { min: 0, max: 10 },
  },
  
  // Text content rules
  TEXT_CONTENT: {
    min_words: {
      summary: 10,
      job_description: 5,
      project_description: 5,
    },
    max_words: {
      summary: 100,
      job_description: 300,
      project_description: 200,
    },
  },
} as const;

// ============================================================================
// VALIDATION GROUPS
// ============================================================================

export const VALIDATION_GROUPS = {
  BASIC_INFO: ['firstName', 'lastName', 'email'],
  CONTACT_INFO: ['email', 'phone', 'location'],
  PROFESSIONAL_INFO: ['summary', 'workExperience'],
  EDUCATION_INFO: ['education'],
  SKILLS_INFO: ['skills', 'languages'],
  ADDITIONAL_INFO: ['projects', 'certifications', 'achievements'],
  COMPLETE_PROFILE: [
    'firstName',
    'lastName',
    'email',
    'phone',
    'summary',
    'workExperience',
    'education',
    'skills',
  ],
} as const;

// ============================================================================
// ALLOWED VALUES
// ============================================================================

export const ALLOWED_VALUES = {
  SKILL_LEVELS: ['beginner', 'intermediate', 'advanced', 'expert'],
  LANGUAGE_PROFICIENCY: ['basic', 'conversational', 'fluent', 'native'],
  EDUCATION_LEVELS: [
    'high_school',
    'associate',
    'bachelor',
    'master',
    'doctorate',
    'certificate',
    'diploma',
  ],
  EMPLOYMENT_TYPES: ['full-time', 'part-time', 'contract', 'freelance', 'internship'],
  PROJECT_STATUSES: ['completed', 'in-progress', 'maintained', 'archived'],
  ACHIEVEMENT_TYPES: ['award', 'recognition', 'publication', 'patent', 'competition'],
  TEMPLATE_CATEGORIES: ['modern', 'classic', 'creative', 'minimal', 'executive'],
  CV_FORMATS: ['html', 'pdf', 'docx', 'json'],
  PRIVACY_LEVELS: ['public', 'private', 'restricted'],
} as const;

// ============================================================================
// BUSINESS RULES
// ============================================================================

export const BUSINESS_RULES = {
  // Minimum requirements for CV completeness
  MIN_COMPLETENESS: {
    work_experience_entries: 1,
    education_entries: 1,
    skills_count: 5,
    summary_words: 10,
  },
  
  // Quality thresholds
  QUALITY_THRESHOLDS: {
    excellent: 90,
    good: 75,
    fair: 60,
    poor: 40,
  },
  
  // ATS optimization rules
  ATS_RULES: {
    min_keyword_density: 2, // percentage
    max_keyword_density: 15, // percentage
    recommended_sections: [
      'personal_info',
      'summary',
      'work_experience',
      'education',
      'skills',
    ],
  },
} as const;