// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts/**
 * Job type definitions (keeping existing structure)
 */

export interface Job {
  id: string;
  userId: string;
  status: 'pending' | 'processing' | 'parsed' | 'analyzed' | 'generating' | 'completed' | 'failed';
  fileUrl?: string;
  mimeType?: string;
  isUrl?: boolean;
  parsedData?: ParsedCV;
  generatedCV?: {
    html: string;
    htmlUrl?: string;
    pdfUrl?: string;
    docxUrl?: string;
    features?: string[];
  };
  selectedTemplate?: string;
  selectedFeatures?: string[];
  error?: string;
  createdAt: any;
  updatedAt: any;
  quickCreate?: boolean;
  userInstructions?: string;
  piiDetection?: {
    hasPII: boolean;
    detectedTypes: string[];
    recommendations: string[];
  };
}

export interface ParsedCV {
  personalInfo?: {
    name?: string;
    title?: string; // Professional title
    email?: string;
    phone?: string;
    address?: string;
    summary?: string;
    linkedin?: string;
    github?: string;
    website?: string;
    photo?: string; // Photo property
    age?: number; // Age property
    maritalStatus?: string; // Marital status
    gender?: string; // Gender property
    nationality?: string; // Nationality property
  };
  // Alias for personalInfo for compatibility
  personal?: {
    name?: string;
    title?: string; // Professional title
    email?: string;
    phone?: string;
    address?: string;
    summary?: string;
    linkedin?: string;
    github?: string;
    website?: string;
    photo?: string;
    age?: number;
    maritalStatus?: string;
    gender?: string;
    nationality?: string;
  };
  experience?: Array<{
    company: string;
    position: string;
    role?: string; // Alias for position for compatibility
    duration: string;
    startDate: string;
    endDate?: string;
    description?: string;
    achievements?: string[];
    technologies?: string[];
    companyLogo?: string; // Company logo URL
  }>;
  education?: Array<{
    institution: string;
    degree: string;
    field: string;
    graduationDate: string;
    startDate?: string; // For compatibility with formatters
    endDate?: string; // For compatibility with formatters
    gpa?: string;
    honors?: string[];
    description?: string;
  }>;
  skills?: string[] | {
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
    [key: string]: string[] | undefined;
  };
  achievements?: string[];
  certifications?: Array<{
    name: string;
    issuer: string;
    date: string;
    credentialId?: string;
    certificateImage?: string; // Certificate image URL
  }>;
  projects?: Array<{
    name: string;
    description: string;
    technologies: string[];
    url?: string;
    images?: string[]; // Project image URLs
  }>;
  publications?: Array<{
    title: string;
    publication: string;
    date: string;
    url?: string;
  }>;
  interests?: string[];
  summary?: string; // Top-level summary field
  customSections?: { [sectionName: string]: string }; // For custom sections
  
  // Additional properties for regional scoring
  languages?: Array<{
    language: string;
    proficiency: string;
  }>;
  references?: Array<{
    name: string;
    title?: string; // Optional for compatibility
    position?: string; // Alternative field name
    company: string;
    email?: string;
    phone?: string;
    contact?: string; // Alternative contact field
  }>;
}
// CV Improvement Types
export interface CVRecommendation {
  id: string;
  type: 'content' | 'structure' | 'formatting' | 'section_addition' | 'keyword_optimization';
  category: 'professional_summary' | 'experience' | 'skills' | 'education' | 'achievements' | 'formatting' | 'ats_optimization';
  title: string;
  description: string;
  currentContent?: string;
  suggestedContent?: string;
  impact: 'high' | 'medium' | 'low';
  priority: number;
  section: string;
  actionRequired: 'replace' | 'add' | 'modify' | 'reformat';
  keywords?: string[];
  estimatedScoreImprovement: number;
}

export interface CVTransformationResult {
  originalCV: ParsedCV;
  improvedCV: ParsedCV;
  appliedRecommendations: CVRecommendation[];
  transformationSummary: {
    totalChanges: number;
    sectionsModified: string[];
    newSections: string[];
    keywordsAdded: string[];
    estimatedScoreIncrease: number;
  };
  comparisonReport: {
    beforeAfter: Array<{
      section: string;
      before: string;
      after: string;
      improvement: string;
    }>;
  };
}

