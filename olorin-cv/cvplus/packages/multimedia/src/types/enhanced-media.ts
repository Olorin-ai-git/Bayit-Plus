/**
 * Enhanced Media Types
 * 
 * Media-related interfaces for enhanced CV features including portfolio images,
 * calendar integration, testimonials, and other interactive media components.
 * 
 * @author Gil Klainert
 * @version 1.0.0
  */

/**
 * Portfolio image data structure
 * Represents an image in a user's portfolio with metadata and categorization
  */
export interface PortfolioImage {
  /** Unique identifier for the portfolio image  */
  id: string;
  
  /** Full-size image URL  */
  url: string;
  
  /** Optimized thumbnail URL for previews  */
  thumbnailUrl: string;
  
  /** Image title for display  */
  title: string;
  
  /** Optional detailed description  */
  description?: string;
  
  /** Category for grouping (e.g., "Web Design", "Photography")  */
  category: string;
  
  /** Tags for filtering and search  */
  tags: string[];
  
  /** Optional URL to related project or case study  */
  projectUrl?: string;
  
  /** Upload timestamp  */
  uploadedAt: Date;
  
  /** Display order for sorting  */
  order: number;
}

/**
 * Calendar integration settings
 * Configuration for connecting external calendar services
  */
export interface CalendarSettings {
  /** Whether calendar integration is enabled  */
  enabled: boolean;
  
  /** Calendar service provider  */
  provider: 'calendly' | 'google' | 'outlook';
  
  /** Calendar URL for bookings  */
  calendarUrl?: string;
  
  /** Available time slots configuration  */
  availableSlots?: string[];
  
  /** User's timezone  */
  timeZone: string;
  
  /** Available meeting types and configurations  */
  meetingTypes: Array<{
    /** Meeting type identifier  */
    type: string;
    
    /** Duration in minutes  */
    duration: number;
    
    /** Description of the meeting type  */
    description: string;
  }>;
}

/**
 * Testimonial data structure
 * Represents a recommendation or testimonial from a colleague or client
  */
export interface Testimonial {
  /** Unique identifier  */
  id: string;
  
  /** Recommender's full name  */
  name: string;
  
  /** Recommender's job title  */
  title: string;
  
  /** Company or organization name  */
  company: string;
  
  /** Testimonial text content  */
  content: string;
  
  /** Optional star rating (1-5)  */
  rating?: number;
  
  /** Optional profile image URL  */
  imageUrl?: string;
  
  /** Optional LinkedIn profile URL  */
  linkedinUrl?: string;
  
  /** Whether this testimonial has been verified  */
  isVerified: boolean;
  
  /** Creation timestamp  */
  createdAt: Date;
  
  /** Display order for testimonials carousel  */
  order: number;
}

/**
 * Personality profile insights
 * AI-generated personality analysis and work style insights
  */
export interface PersonalityProfile {
  /** Primary working style description  */
  workingStyle: string;
  
  /** Key personal and professional strengths  */
  strengths: string[];
  
  /** Core motivating factors  */
  motivations: string[];
  
  /** Preferred communication methods and styles  */
  communicationPreferences: string[];
  
  /** Natural team role (e.g., "Leader", "Collaborator", "Specialist")  */
  teamRole: string;
  
  /** Leadership approach and style  */
  leadershipStyle?: string;
  
  /** Approach to problem-solving  */
  problemSolvingApproach: string;
  
  /** Adaptability to change description  */
  adaptability: string;
  
  /** Stress management approach  */
  stressManagement: string;
  
  /** Career goals and aspirations  */
  careerAspirations: string[];
  
  /** Core professional and personal values  */
  values: string[];
  
  /** Numerical scores for different personality traits  */
  traits: {
    leadership: number;
    communication: number;
    innovation: number;
    teamwork: number;
    problemSolving: number;
    attention_to_detail: number;
    adaptability: number;
    strategic_thinking: number;
    analytical?: number;
    creative?: number;
    decisive?: number;
    empathetic?: number;
    [key: string]: number | undefined;
  };
  
  /** Primary working style descriptions  */
  workStyle: string[];
  
  /** Team compatibility assessment  */
  teamCompatibility: string;
  
  /** Leadership potential score (0-1)  */
  leadershipPotential: number;
  
  /** Culture fit assessment for different environments  */
  cultureFit: {
    startup: number;
    corporate: number;
    consulting: number;
    nonprofit: number;
    agency: number;
  };
  
  /** Comprehensive personality summary  */
  summary: string;
  
  /** When this profile was generated  */
  generatedAt: Date;
}