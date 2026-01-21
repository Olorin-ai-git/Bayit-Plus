// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflictsimport { onCall } from 'firebase-functions/v2/https';
import { CVAnalysisRequest, CVAnalysisResponse } from '../../types';

export const analyzeCV = onCall(
  {
    timeoutSeconds: 120,
    memory: '512MiB',
    cors: true,
    secrets: ['ANTHROPIC_API_KEY']
  },
  async (request) => {
    if (!request.auth) {
      throw new Error('User must be authenticated');
    }

    const { parsedCV, targetRole } = request.data;

    try {
      const apiKey = process.env.ANTHROPIC_API_KEY;
      if (!apiKey) {
        throw new Error('Anthropic API key not configured');
      }

      const Anthropic = (await import('@anthropic-ai/sdk')).default;
      const anthropic = new Anthropic({ apiKey });

      const prompt = `Analyze this CV and provide recommendations for improvement${targetRole ? ` for a ${targetRole} position` : ''}.

IMPORTANT INSTRUCTIONS:
1. Base your analysis ONLY on the information provided in the CV below
2. DO NOT make up or assume any skills, experiences, or qualifications not explicitly stated
3. If information is missing, suggest adding it but don't assume what it might be
4. Highlight and reference the actual skills and experiences present in the CV

CV Data:
${JSON.stringify(parsedCV, null, 2)}

Please provide:
1. Overall CV strength score (1-10)
2. Key strengths
3. Areas for improvement
4. Specific recommendations for each section
5. Keywords to add for ATS optimization
6. Suggested additional sections or information`;

      const response = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2000,
        temperature: 0.7,
        system: 'You are a professional career counselor and CV expert who provides accurate, fact-based recommendations. You MUST base all your analysis only on the information explicitly provided in the CV. Never make up, assume, or add information that is not present. If something is missing, suggest it as an area for improvement but do not assume what the content might be.',
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ]
      });

      const content = response.content?.[0];
      if (content && content.type === 'text' && 'text' in content) {
        return {
          success: true,
          analysis: content.text
        };
      }

      throw new Error('Failed to get analysis from Claude');
    } catch (error: any) {
      throw new Error(`Failed to analyze CV: ${error.message}`);
    }
  });

/**
 * Type definitions for this function
 */
export type { CVAnalysisRequest, CVAnalysisResponse };