// User types
export interface User {
  id: string;
  email: string;
  displayName: string;
  role: 'FREE_USER' | 'PREMIUM_USER' | 'ADMIN' | 'SUPER_ADMIN';
  plan: 'free' | 'premium';
  isActive: boolean;
}

// CV Job types
export interface CVJob {
  id: string;
  userId: string;
  status: 'uploading' | 'processing' | 'ready' | 'error';
  fileName: string;
  fileSize: number;
  fileType: string;
  uploadedAt: Date;
  processedAt?: Date;
  cvData?: CVData;
}

export interface CVData {
  personalInfo: PersonalInfo;
  experience: Experience[];
  education: Education[];
  skills: Skill[];
  summary: string;
}

export interface PersonalInfo {
  fullName: string;
  email: string;
  phone?: string;
  location?: string;
  linkedin?: string;
  website?: string;
}

export interface Experience {
  id: string;
  company: string;
  position: string;
  startDate: string;
  endDate?: string;
  description: string;
  current: boolean;
}

export interface Education {
  id: string;
  institution: string;
  degree: string;
  field: string;
  startDate: string;
  endDate?: string;
  gpa?: string;
}

export interface Skill {
  id: string;
  name: string;
  level: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  score?: number;
}

// API Response types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
}

// Upload types
export interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
}
