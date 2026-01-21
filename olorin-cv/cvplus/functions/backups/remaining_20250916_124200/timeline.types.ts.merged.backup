// @ts-ignore - Export conflicts/**
 * Timeline Service Type Definitions
 * Shared types for timeline generation and validation
 */

export interface TimelineEvent {
  id: string;
  type: 'work' | 'education' | 'achievement' | 'certification';
  title: string;
  organization: string;
  startDate: string; // ISO string for Firestore compatibility
  endDate?: string; // ISO string for Firestore compatibility
  current?: boolean;
  description?: string;
  achievements?: string[];
  skills?: string[];
  location?: string;
  logo?: string;
  impact?: {
    metric: string;
    value: string;
  }[];
}

export interface TimelineData {
  events: TimelineEvent[];
  summary: {
    totalYearsExperience: number;
    companiesWorked: number;
    degreesEarned: number;
    certificationsEarned: number;
    careerHighlights: string[];
  };
  insights: {
    careerProgression: string;
    industryFocus: string[];
    skillEvolution: string;
    nextSteps: string[];
  };
}