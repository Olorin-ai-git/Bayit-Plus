// @ts-ignore - Export conflicts/**
 * updatePlaceholderValue Firebase Function
 * 
 * Handles real-time placeholder value updates for inline editing in CV preview.
 * Updates the specific placeholder value in the CV data and maintains data integrity.
 */

import { onCall, HttpsError } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import { PlaceholderManager } from '../../services/placeholder-manager.service';
import { corsOptions } from '../../config/cors';

interface PlaceholderUpdateRequest {
  jobId: string;
  section: string;
  fieldPath: string;
  placeholderKey: string;
  value: string;
  type: 'text' | 'number' | 'percentage' | 'currency' | 'timeframe';
  metadata?: {
    timestamp: string;
    userAgent: string;
  };
}

interface PlaceholderUpdateResponse {
  success: boolean;
  data?: {
    updatedContent: string;
    progress?: {
      total: number;
      completed: number;
    };
  };
  error?: string;
}

export const updatePlaceholderValue = onCall<PlaceholderUpdateRequest, Promise<PlaceholderUpdateResponse>>(
  {
    ...corsOptions,
    timeoutSeconds: 60
  },
  async (request) => {
    try {
      const { data, auth } = request;
      
      // Validate authentication
      if (!auth || !auth.uid) {
        throw new HttpsError('unauthenticated', 'User must be authenticated');
      }

      // Validate required fields
      if (!data.jobId || !data.placeholderKey || data.value === undefined) {
        throw new HttpsError('invalid-argument', 'Missing required fields: jobId, placeholderKey, value');
      }

      const { jobId, section, fieldPath, placeholderKey, value, type } = data;
      const userId = auth.uid;

      console.log('Updating placeholder:', {
        jobId,
        section,
        fieldPath,
        placeholderKey,
        value,
        type,
        userId
      });

      // Get Firestore instance
      const db = admin.firestore();

      // Verify job belongs to user
      const jobRef = db.collection('jobs').doc(jobId);
      const jobDoc = await jobRef.get();
      
      if (!jobDoc.exists) {
        throw new HttpsError('not-found', 'Job not found');
      }

      const jobData = jobDoc.data();
      if (jobData?.userId !== userId) {
        throw new HttpsError('permission-denied', 'Access denied');
      }

      // Get current CV data
      const cvData = jobData.cvData || {};
      const enhancedData = cvData.enhanced || {};

      // Validate placeholder value using PlaceholderManager
      const placeholderInfo = PlaceholderManager.detectPlaceholders(placeholderKey)[0];
      if (placeholderInfo) {
        const validation = PlaceholderManager.validatePlaceholderValue(placeholderInfo, value);
        if (!validation.isValid) {
          throw new HttpsError('invalid-argument', validation.errors.join(', ') || 'Invalid placeholder value');
        }
      }

      // Find and update the specific content containing the placeholder
      let updatedContent = '';
      let contentFound = false;

      // Helper function to recursively search and update content
      const updateContentWithPlaceholder = (obj: any, path: string[] = []): boolean => {
        if (typeof obj === 'string') {
          if (obj.includes(placeholderKey)) {
            // PlaceholderManager.replacePlaceholders expects key without brackets for replacements
            const keyForReplacement = placeholderKey.startsWith('[') ? placeholderKey.slice(1, -1) : placeholderKey;
            const replacements = { [keyForReplacement]: value };
            const newContent = PlaceholderManager.replacePlaceholders(obj, replacements);
            
            // Update the content in the nested object
            let current = enhancedData;
            for (let i = 0; i < path.length - 1; i++) {
              if (!current[path[i]]) current[path[i]] = {};
              current = current[path[i]];
            }
            current[path[path.length - 1]] = newContent;
            
            updatedContent = newContent;
            return true;
          }
        } else if (Array.isArray(obj)) {
          for (let i = 0; i < obj.length; i++) {
            if (updateContentWithPlaceholder(obj[i], [...path, i.toString()])) {
              return true;
            }
          }
        } else if (obj && typeof obj === 'object') {
          for (const [key, value] of Object.entries(obj)) {
            if (updateContentWithPlaceholder(value, [...path, key])) {
              return true;
            }
          }
        }
        return false;
      };

      // If fieldPath is provided, try to update specific field first
      if (fieldPath && fieldPath !== 'unknown') {
        const pathParts = fieldPath.split('.');
        let current = enhancedData;
        
        // Navigate to the target field
        for (let i = 0; i < pathParts.length - 1; i++) {
          if (current[pathParts[i]]) {
            current = current[pathParts[i]];
          }
        }
        
        const finalKey = pathParts[pathParts.length - 1];
        if (current[finalKey] && typeof current[finalKey] === 'string' && current[finalKey].includes(placeholderKey)) {
          // PlaceholderManager.replacePlaceholders expects key without brackets for replacements
          const keyForReplacement = placeholderKey.startsWith('[') ? placeholderKey.slice(1, -1) : placeholderKey;
          const replacements = { [keyForReplacement]: value };
          current[finalKey] = PlaceholderManager.replacePlaceholders(current[finalKey], replacements);
          updatedContent = current[finalKey];
          contentFound = true;
        }
      }

      // If specific field update failed, search entire enhanced data
      if (!contentFound) {
        contentFound = updateContentWithPlaceholder(enhancedData);
      }

      if (!contentFound) {
        throw new HttpsError('not-found', `Placeholder ${placeholderKey} not found in CV data`);
      }

      // Update the job document with the new CV data
      const updatedCvData = {
        ...cvData,
        enhanced: enhancedData,
        lastModified: admin.firestore.FieldValue.serverTimestamp(),
        placeholders: {
          ...cvData.placeholders,
          [placeholderKey]: {
            value,
            type,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            section,
            fieldPath
          }
        }
      };

      await jobRef.update({
        cvData: updatedCvData,
        lastModified: admin.firestore.FieldValue.serverTimestamp()
      });

      // Calculate progress if needed
      const allPlaceholders = PlaceholderManager.detectPlaceholders(JSON.stringify(enhancedData));
      const filledPlaceholders = Object.keys(cvData.placeholders || {}).length + 1; // +1 for current update
      
      console.log('Placeholder updated successfully:', {
        jobId,
        placeholderKey,
        value,
        contentLength: updatedContent.length
      });

      return {
        success: true,
        data: {
          updatedContent,
          progress: {
            total: allPlaceholders.length,
            completed: Math.min(filledPlaceholders, allPlaceholders.length)
          }
        }
      };

    } catch (error) {
      
      if (error instanceof HttpsError) {
        throw error;
      }
      
      throw new HttpsError('internal', 'Failed to update placeholder value');
    }
  }
);