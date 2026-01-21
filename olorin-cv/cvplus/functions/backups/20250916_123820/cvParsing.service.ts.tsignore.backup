// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflictsimport * as admin from 'firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';

export interface ParsedCV {
  personalInfo: {
    name?: string;
    email?: string;
    phone?: string;
    address?: string;
    summary?: string;
    linkedin?: string;
    github?: string;
    website?: string;
    location?: string;
  };
  experience: Array<{
    company: string;
    position: string;
    duration: string;
    startDate: string;
    endDate?: string;
    description?: string;
    achievements?: string[];
    technologies?: string[];
    current?: boolean;
    location?: string;
  }>;
  education: Array<{
    institution: string;
    degree: string;
    field: string;
    graduationDate: string;
    gpa?: string;
    honors?: string[];
    startDate?: string;
    endDate?: string;
    location?: string;
    achievements?: string[];
  }>;
  skills: {
    technical: string[];
    soft: string[];
    languages: string[];
  };
  certifications: Array<{
    name: string;
    issuer: string;
    date: string;
    credentialId?: string;
    expiryDate?: string;
    url?: string;
  }>;
  projects?: Array<{
    name: string;
    description: string;
    technologies: string[];
    url?: string;
    github?: string;
    duration?: string;
    role?: string;
  }>;
  summary?: string;
}

export class CVParsingService {
  private db = admin.firestore();

  async getParsedCV(jobId: string): Promise<ParsedCV | null> {
    try {
      const jobDoc = await this.db.collection('jobs').doc(jobId).get();
      
      if (!jobDoc.exists) {
        return null;
      }

      const jobData = jobDoc.data();
      if (!jobData?.parsedData) {
        return null;
      }

      return jobData.parsedData as ParsedCV;
    } catch (error) {
      return null;
    }
  }

  async updateParsedCV(jobId: string, parsedData: ParsedCV): Promise<void> {
    try {
      await this.db.collection('jobs').doc(jobId).update({
        parsedData,
        updatedAt: FieldValue.serverTimestamp()
      });
    } catch (error) {
      throw error;
    }
  }

  async validateParsedCV(parsedData: any): Promise<boolean> {
    try {
      // Basic validation
      if (!parsedData || typeof parsedData !== 'object') {
        return false;
      }

      // Check for required fields
      if (!parsedData.personalInfo || !parsedData.experience || !parsedData.skills) {
        return false;
      }

      return true;
    } catch (error) {
      return false;
    }
  }
}