// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflictsimport { onCall } from 'firebase-functions/v2/https';
import { getFirestore } from 'firebase-admin/firestore';
import { corsOptions } from '../config/cors';
import { EnhancedATSAnalysisService } from '../services/enhanced-ats-analysis.service';
import { EnhancedAnalysisRequest, EnhancedAnalysisResponse } from '../../types';

export const enhancedAnalyzeCV = onCall(
  {
    timeoutSeconds: 180,
    memory: '1GiB',
    ...corsOptions,
  },
  async (request) => {
    if (!request.auth) {
      throw new Error('User must be authenticated');
    }

    const { parsedCV, targetRole, jobDescription, industryKeywords, jobId } = request.data;

    if (!parsedCV) {
      throw new Error('Parsed CV data is required');
    }

    const db = getFirestore();

    try {

      // Initialize enhanced analysis service
      const analysisService = new EnhancedATSAnalysisService();

      // Perform comprehensive ATS analysis
      const analysisResult = await analysisService.analyzeCV(
        parsedCV,
        targetRole,
        industryKeywords
      );

      // Store analysis results if jobId is provided
      if (jobId) {
        try {
          await db.collection('jobs').doc(jobId).update({
            atsAnalysis: analysisResult,
            cvRecommendations: analysisResult.suggestions,
            lastAnalysis: new Date().toISOString(),
            analysisMetadata: {
              targetRole,
              hasJobDescription: !!jobDescription,
              industryKeywordsCount: industryKeywords?.length || 0,
              recommendationsCount: analysisResult.suggestions.length
            }
          });
        } catch (storeError) {
          // Don't fail the entire request if storage fails
        }
      }

      // Return both new structured data and legacy text analysis
      const legacyAnalysisText = formatLegacyAnalysis(analysisResult);

      return {
        success: true,
        // Legacy format for backward compatibility
        analysis: legacyAnalysisText,
        // New enhanced format
        enhancedAnalysis: {
          atsScore: {
            current: analysisResult.currentScore,
            predicted: analysisResult.predictedScore,
            improvement: analysisResult.predictedScore - analysisResult.currentScore
          },
          issues: analysisResult.issues,
          recommendations: analysisResult.suggestions,
          keywords: analysisResult.keywords,
          formatAnalysis: analysisResult.formatAnalysis,
          summary: {
            totalRecommendations: analysisResult.suggestions.length,
            highPriorityRecommendations: analysisResult.suggestions.filter((r: any) => r.impact === 'high').length,
            estimatedScoreIncrease: analysisResult.predictedScore - analysisResult.currentScore,
            primaryFocusAreas: getPrimaryFocusAreas(analysisResult.suggestions)
          }
        }
      };

    } catch (error: any) {
      
      // Update job status if jobId provided
      if (jobId) {
        try {
          await db.collection('jobs').doc(jobId).update({
            analysisError: error.message,
            lastAnalysisError: new Date().toISOString()
          });
        } catch (updateError) {
        }
      }

      throw new Error(`Failed to analyze CV: ${error.message}`);
    }
  }
);

function formatLegacyAnalysis(analysisResult: any): string {
  return `## CV Analysis Results

**ATS Compatibility Score: ${analysisResult.currentScore}/100**
**Predicted Score (after improvements): ${analysisResult.predictedScore}/100**

### Key Issues Found:
${analysisResult.issues.map((issue: any) => `• ${issue.message} (${issue.severity})`).join('\n')}

### Recommendations for Improvement:
${analysisResult.suggestions.slice(0, 5).map((rec: any, index: number) => 
  `${index + 1}. **${rec.title}**
   ${rec.description}
   Impact: ${rec.impact} (+${rec.estimatedScoreImprovement} points)`
).join('\n\n')}

### Keywords Analysis:
**Missing Keywords:** ${analysisResult.keywords.missing.slice(0, 10).join(', ')}
**Present Keywords:** ${analysisResult.keywords.present.slice(0, 10).join(', ')}

### Format Analysis:
**ATS Friendly:** ${analysisResult.formatAnalysis.isATSFriendly ? 'Yes' : 'No'}
${analysisResult.formatAnalysis.issues.length > 0 ? 
  `**Format Issues:** ${analysisResult.formatAnalysis.issues.join(', ')}` : ''}

### Summary:
Your CV has ${analysisResult.suggestions.length} areas for improvement. Implementing the top ${Math.min(5, analysisResult.suggestions.length)} recommendations could increase your ATS score by up to ${analysisResult.predictedScore - analysisResult.currentScore} points.`;
}

function getPrimaryFocusAreas(suggestions: any[]): string[] {
  const categoryCount: Record<string, number> = {};
  
  suggestions.forEach(suggestion => {
    categoryCount[suggestion.category] = (categoryCount[suggestion.category] || 0) + 1;
  });

  return Object.entries(categoryCount)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 3)
    .map(([category]) => category);
}

/**
 * Type definitions for this function
 */
export type { EnhancedAnalysisRequest, EnhancedAnalysisResponse };