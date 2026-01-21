import * as admin from 'firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { corsOptions } from '../../config/cors';
import { CVGenerator } from '../../services/cvGenerator';

/**
 * Cloud Function to inject completed feature HTML fragments into the generated CV
 * This function is called after features complete processing to update the CV with their content
  */
export const injectCompletedFeatures = onCall(
  {
    timeoutSeconds: 120,
    memory: '1GiB',
    ...corsOptions
  },
  async (request) => {
    
    if (!request.auth) {
      throw new Error('User must be authenticated');
    }

    const { jobId } = request.data;
    const userId = request.auth.uid;
    

    try {
      // Step 1: Get job data and validate ownership
      const jobDoc = await admin.firestore()
        .collection('jobs')
        .doc(jobId)
        .get();
      
      if (!jobDoc.exists) {
        throw new Error('Job not found');
      }

      const jobData = jobDoc.data();
      
      // Verify user ownership
      if (jobData?.userId !== userId) {
        throw new Error('Unauthorized access to job');
      }

      // Check if there's a generated CV
      if (!jobData?.generatedCV?.html) {
        throw new Error('No generated CV found to inject features into');
      }

      // Step 2: Get completed features with HTML fragments
      const completedFeatures = await getCompletedFeaturesWithFragments(jobData);
      
      if (completedFeatures.length === 0) {
        return {
          success: true,
          message: 'No features to inject',
          featuresInjected: 0
        };
      }

      // Step 3: Inject feature HTML fragments into the CV
      const updatedHTML = await injectFeatureFragments(
        jobData.generatedCV.html,
        completedFeatures
      );

      // Step 4: Save updated HTML to storage and update job
      const generator = new CVGenerator();
      const { htmlUrl } = await generator.saveGeneratedFiles(
        jobId,
        userId,
        updatedHTML
      );

      // Update job with new HTML and injection status
      await admin.firestore()
        .collection('jobs')
        .doc(jobId)
        .update({
          'generatedCV.html': updatedHTML,
          'generatedCV.htmlUrl': htmlUrl,
          'featureInjectionStatus': 'completed',
          'lastFeatureInjection': FieldValue.serverTimestamp(),
          'injectedFeatures': completedFeatures.map(f => f.featureName),
          updatedAt: FieldValue.serverTimestamp()
        });


      return {
        success: true,
        featuresInjected: completedFeatures.length,
        injectedFeatures: completedFeatures.map(f => f.featureName),
        htmlUrl
      };

    } catch (error: any) {
      
      // Update job with error status
      await admin.firestore()
        .collection('jobs')
        .doc(jobId)
        .update({
          'featureInjectionStatus': 'failed',
          'featureInjectionError': error.message,
          updatedAt: FieldValue.serverTimestamp()
        });
      
      throw new Error(`Failed to inject completed features: ${error.message}`);
    }
  });

/**
 * Get completed features that have HTML fragments ready for injection
  */
async function getCompletedFeaturesWithFragments(jobData: any): Promise<Array<{
  featureName: string;
  // HTML fragment removed with React SPA migration
  featureType: string;
}>> {
  const completedFeatures: Array<{
    featureName: string;
    // HTML fragment removed with React SPA migration
    featureType: string;
  }> = [];

  if (!jobData.enhancedFeatures) {
    return completedFeatures;
  }

  for (const [featureName, featureData] of Object.entries(jobData.enhancedFeatures)) {
    const feature = featureData as any;
    
    // With React SPA migration, we no longer check for HTML fragments
    if (feature.status === 'completed') {
      completedFeatures.push({
        featureName,
        // HTML fragment removed with React SPA migration
        featureType: featureName
      });
    } else {
    }
  }

  return completedFeatures;
}

/**
 * Inject feature HTML fragments into the CV HTML at appropriate locations
  */
async function injectFeatureFragments(
  originalHTML: string,
  features: Array<{ featureName: string; featureType: string; }> // HTML fragment removed with React SPA migration
): Promise<string> {
  let updatedHTML = originalHTML;
  
  
  for (const feature of features) {
    
    try {
      // Inject the feature HTML fragment at the end of the interactive features section
      // Look for the interactive features section in the template
      const interactiveFeaturesPattern = /<\/section>\s*<div class="download-section"/;
      
      if (interactiveFeaturesPattern.test(updatedHTML)) {
        // Inject before the download section
        updatedHTML = updatedHTML.replace(
          interactiveFeaturesPattern,
          `</section>\n        <!-- ${feature.featureName} Feature -->\n        <section class="section">\n            <!-- Feature rendered by React SPA -->\n        </section>\n        <div class="download-section"`
        );
      } else {
        // Fallback: inject before the closing container div
        const containerEndPattern = /<\/div>\s*<\/body>/;
        if (containerEndPattern.test(updatedHTML)) {
          updatedHTML = updatedHTML.replace(
            containerEndPattern,
            `        <!-- ${feature.featureName} Feature -->\n        <section class="section">\n            <!-- Feature rendered by React SPA -->\n        </section>\n    </div>\n</body>`
          );
        } else {
        }
      }
    } catch (error) {
      // Continue with other features even if one fails
    }
  }
  
  return updatedHTML;
}