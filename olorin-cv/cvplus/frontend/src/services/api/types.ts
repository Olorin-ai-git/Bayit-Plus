/**
 * API Type Definitions
 * TypeScript interfaces for all API requests and responses
 */

export interface CVAnalysisResult {
  job_id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  analysis?: {
    skills: string[];
    experience_years?: number;
    education_level?: string;
    work_history: Array<{
      company: string;
      role: string;
      start_date: string;
      end_date?: string;
      responsibilities: string;
    }>;
    education: Array<{
      institution: string;
      degree: string;
      field: string;
      year: string;
    }>;
    certifications: string[];
    completeness_score: number;
    ats_score: number;
    recommendations: string[];
    missing_sections: string[];
  };
}

export interface Profile {
  profile_id: string;
  slug: string;
  public_url: string;
  qr_code_url?: string;
}

export interface AnalyticsSummary {
  total_views: number;
  total_downloads: number;
  unique_visitors: number;
  top_sources: Array<{ source: string; count: number }>;
  time_period: string;
}

export interface UserInfo {
  id: string;
  email: string;
  full_name?: string;
  role: string;
  subscription_tier: string;
  is_active: boolean;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  user: UserInfo;
}

export interface ContactData {
  sender_name: string;
  sender_email: string;
  message: string;
  sender_phone?: string;
  company?: string;
}
