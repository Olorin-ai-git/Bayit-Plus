// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflictsimport { onCall } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { corsOptions } from '../config/cors';
// import { languageProficiencyService } from '../services/language-proficiency.service'; // Module not found

// Temporary placeholder
const languageProficiencyService = {
  processLanguageProficiency: async (data: any) => ({ languages: [], proficiencyLevels: [] })
};
// htmlFragmentGenerator import removed - using React SPA architecture

export const generateLanguageVisualization = onCall(
  {
    timeoutSeconds: 60,
    secrets: ['OPENAI_API_KEY'],
    ...corsOptions
  },
  async (request) => {
    if (!request.auth) {
      throw new Error('User must be authenticated');
    }

    const { jobId } = request.data;

    try {
      // Get the job data with parsed CV
      const jobDoc = await admin.firestore()
        .collection('jobs')
        .doc(jobId)
        .get();
      
      if (!jobDoc.exists) {
        throw new Error('Job not found');
      }
      
      const jobData = jobDoc.data();
      if (!jobData?.parsedData) {
        throw new Error('CV data not found. Please ensure CV is parsed first.');
      }

      // Update status to processing
      await admin.firestore()
        .collection('jobs')
        .doc(jobId)
        .update({
          'enhancedFeatures.languageProficiency.status': 'processing',
          'enhancedFeatures.languageProficiency.progress': 25,
          'enhancedFeatures.languageProficiency.currentStep': 'Analyzing language skills...',
          'enhancedFeatures.languageProficiency.startedAt': FieldValue.serverTimestamp()
        });

      // Generate language visualization
      const visualization = await languageProficiencyService.generateLanguageVisualization(
        jobData.parsedData,
        jobId
      );

      // Update progress
      await admin.firestore()
        .collection('jobs')
        .doc(jobId)
        .update({
          'enhancedFeatures.languageProficiency.progress': 75,
          'enhancedFeatures.languageProficiency.currentStep': 'Creating proficiency visualization...'
        });

      // Generate HTML fragment for progressive enhancement
      // HTML generation removed - React SPA handles UI rendering;

      // Update with final results
      await admin.firestore()
        .collection('jobs')
        .doc(jobId)
        .update({
          'enhancedFeatures.languageProficiency.status': 'completed',
          'enhancedFeatures.languageProficiency.progress': 100,
          'enhancedFeatures.languageProficiency.data': visualization,
          'enhancedFeatures.languageProficiency.htmlFragment': null, // HTML fragment removed with React SPA migration
          'enhancedFeatures.languageProficiency.processedAt': FieldValue.serverTimestamp()
        });

      return {
        success: true,
        visualization,
        data: visualization
      };

    } catch (error: any) {
      
      // Update status to failed
      await admin.firestore()
        .collection('jobs')
        .doc(jobId)
        .update({
          'enhancedFeatures.languageProficiency.status': 'failed',
          'enhancedFeatures.languageProficiency.error': error.message,
          'enhancedFeatures.languageProficiency.processedAt': FieldValue.serverTimestamp()
        });
      
      throw new Error(`Failed to generate language visualization: ${error.message}`);
    }
  });

export const updateLanguageProficiency = onCall(
  {
    ...corsOptions
  },
  async (request) => {
    if (!request.auth) {
      throw new Error('User must be authenticated');
    }

    const { jobId, languageId, updates } = request.data;

    try {
      // Verify job ownership
      const jobDoc = await admin.firestore()
        .collection('jobs')
        .doc(jobId)
        .get();
      
      if (!jobDoc.exists) {
        throw new Error('Job not found');
      }
      
      const jobData = jobDoc.data();
      if (jobData?.userId !== request.auth.uid) {
        throw new Error('Unauthorized access');
      }

      // Update language proficiency
      const updatedProficiency = await languageProficiencyService.updateLanguageProficiency(
        jobId,
        languageId,
        updates
      );

      return {
        success: true,
        proficiency: updatedProficiency
      };

    } catch (error: any) {
      throw new Error(`Failed to update language proficiency: ${error.message}`);
    }
  });

export const addLanguageProficiency = onCall(
  {
    ...corsOptions
  },
  async (request) => {
    if (!request.auth) {
      throw new Error('User must be authenticated');
    }

    const { jobId, language } = request.data;

    try {
      // Verify job ownership
      const jobDoc = await admin.firestore()
        .collection('jobs')
        .doc(jobId)
        .get();
      
      if (!jobDoc.exists) {
        throw new Error('Job not found');
      }
      
      const jobData = jobDoc.data();
      if (jobData?.userId !== request.auth.uid) {
        throw new Error('Unauthorized access');
      }

      // Get current visualization
      const visualization = jobData?.enhancedFeatures?.languageProficiency?.data;
      if (!visualization) {
        throw new Error('Language visualization not found. Generate it first.');
      }

      // Add new language
      visualization.proficiencies.push({
        language: language.language,
        level: language.level || 'Basic',
        score: language.score || 30,
        certifications: language.certifications || [],
        contexts: language.contexts || [],
        flag: language.flag || '🌐'
      });

      // Resort by proficiency
      visualization.proficiencies.sort((a: any, b: any) => b.score - a.score);

      // Regenerate visualizations
      const service = languageProficiencyService as any;
      visualization.visualizations = service.generateVisualizations(visualization.proficiencies);
      visualization.insights = service.generateInsights(visualization.proficiencies);

      // Save
      await admin.firestore()
        .collection('jobs')
        .doc(jobId)
        .update({
          'enhancedFeatures.languageProficiency.data': visualization,
          'enhancedFeatures.languageProficiency.lastModified': FieldValue.serverTimestamp()
        });

      return {
        success: true,
        visualization
      };

    } catch (error: any) {
      throw new Error(`Failed to add language proficiency: ${error.message}`);
    }
  });

export const removeLanguageProficiency = onCall(
  {
    ...corsOptions
  },
  async (request) => {
    if (!request.auth) {
      throw new Error('User must be authenticated');
    }

    const { jobId, languageId } = request.data;

    try {
      // Verify job ownership
      const jobDoc = await admin.firestore()
        .collection('jobs')
        .doc(jobId)
        .get();
      
      if (!jobDoc.exists) {
        throw new Error('Job not found');
      }
      
      const jobData = jobDoc.data();
      if (jobData?.userId !== request.auth.uid) {
        throw new Error('Unauthorized access');
      }

      // Get current visualization
      const visualization = jobData?.enhancedFeatures?.languageProficiency?.data;
      if (!visualization) {
        throw new Error('Language visualization not found');
      }

      // Remove language
      visualization.proficiencies = visualization.proficiencies.filter(
        (p: any) => p.language !== languageId
      );

      // Regenerate visualizations
      const service = languageProficiencyService as any;
      visualization.visualizations = service.generateVisualizations(visualization.proficiencies);
      visualization.insights = service.generateInsights(visualization.proficiencies);

      // Save
      await admin.firestore()
        .collection('jobs')
        .doc(jobId)
        .update({
          'enhancedFeatures.languageProficiency.data': visualization,
          'enhancedFeatures.languageProficiency.lastModified': FieldValue.serverTimestamp()
        });

      return {
        success: true,
        visualization
      };

    } catch (error: any) {
      throw new Error(`Failed to remove language proficiency: ${error.message}`);
    }
  });

export const generateLanguageCertificate = onCall(
  {
    ...corsOptions
  },
  async (request) => {
    if (!request.auth) {
      throw new Error('User must be authenticated');
    }

    const { jobId, languageId } = request.data;

    try {
      // Get job and language data
      const jobDoc = await admin.firestore()
        .collection('jobs')
        .doc(jobId)
        .get();
      
      const jobData = jobDoc.data();
      const visualization = jobData?.enhancedFeatures?.languageProficiency?.data;
      
      if (!visualization) {
        throw new Error('Language visualization not found');
      }

      const language = visualization.proficiencies.find(
        (p: any) => p.language === languageId
      );

      if (!language) {
        throw new Error('Language not found');
      }

      // Generate a simple certificate data structure
      const certificate = {
        id: `cert-${Date.now()}`,
        language: language.language,
        level: language.level,
        score: language.score,
        cefr: language.level === 'Native' ? 'C2+' :
              language.level === 'Fluent' ? 'C2' :
              language.level === 'Professional' ? 'C1' :
              language.level === 'Conversational' ? 'B2' : 'A2-B1',
        issuedDate: new Date().toISOString(),
        validUntil: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
        verificationCode: `CVLANG-${jobId.substring(0, 8)}-${Date.now().toString(36)}`.toUpperCase()
      };

      return {
        success: true,
        certificate
      };

    } catch (error: any) {
      throw new Error(`Failed to generate certificate: ${error.message}`);
    }
  });