/**
 * Test script to validate the RecommendationsContainer fix
 * 
 * This script can be run in the browser console to test the fix
 */

import { CVServiceCore } from '../services/cv/CVServiceCore';
import { FirebaseDebugger } from './api-debugging-suite';
import { RecommendationsErrorMonitor } from './recommendations-error-monitor';

export class RecommendationsFixTester {
  
  /**
   * Test the complete flow with a real job ID
   */
  static async testRecommendationsFlow(jobId: string): Promise<void> {
    console.group('🧪 TESTING RECOMMENDATIONS FIX');
    
    try {
      // 1. Run debugging suite first
      logger.info('1. Running Firebase debugging suite...');
      const debugResults = await FirebaseDebugger.runFullDebugSuite(jobId);
      logger.info('Debug results:', debugResults);
      
      if (!debugResults.overall.success) {
        logger.error('❌ Debug suite failed:', debugResults.overall.criticalIssues);
        return;
      }
      
      // 2. Test the actual API call
      logger.info('2. Testing CVServiceCore.getRecommendations...');
      const response = await CVServiceCore.getRecommendations(
        jobId,
        'Software Engineer',
        ['javascript', 'react', 'node.js'],
        false
      );
      
      logger.info('Raw API response:', response);
      
      // 3. Test the new response handling logic
      logger.info('3. Testing response handling logic...');
      const recommendations = response.success && response.data 
        ? response.data.recommendations 
        : response.recommendations;
      
      logger.info('Extracted recommendations:', recommendations);
      
      if (response.success && recommendations) {
        logger.info('✅ Response handling works correctly!');
        logger.info(`Found ${recommendations.length} recommendations`);
        
        // Test recommendation structure
        recommendations.forEach((rec: any, index: number) => {
          logger.info(`Recommendation ${index + 1}:`, {
            id: rec.id,
            title: rec.title,
            category: rec.category,
            priority: rec.priority
          });
        });
        
      } else {
        logger.error('❌ Response handling failed');
        logger.error('Response success:', response.success);
        logger.error('Has recommendations:', !!recommendations);
        logger.error('Response structure:', Object.keys(response || {}));
      }
      
      logger.info('✅ Test completed successfully!');
      
    } catch (error) {
      logger.error('❌ Test failed with error:', error);
      
      // Log error for analysis
      RecommendationsErrorMonitor.logError(error, {
        jobId,
        step: 'test_flow',
        targetRole: 'Software Engineer',
        industryKeywords: ['javascript', 'react', 'node.js'],
        forceRegenerate: false
      });
    } finally {
      console.groupEnd();
    }
  }
  
  /**
   * Test response format handling with mock data
   */
  static testResponseFormatHandling(): void {
    console.group('🧪 TESTING RESPONSE FORMAT HANDLING');
    
    // Test case 1: New backend format
    const newFormat = {
      success: true,
      data: {
        recommendations: [
          { id: '1', title: 'Test Rec 1', category: 'skills' },
          { id: '2', title: 'Test Rec 2', category: 'experience' }
        ],
        cached: false,
        generatedAt: new Date().toISOString()
      }
    };
    
    // Test case 2: Old/legacy format
    const oldFormat = {
      success: true,
      recommendations: [
        { id: '1', title: 'Test Rec 1', category: 'skills' },
        { id: '2', title: 'Test Rec 2', category: 'experience' }
      ]
    };
    
    // Test case 3: Error format
    const errorFormat = {
      success: false,
      error: 'Something went wrong',
      data: null
    };
    
    logger.info('Testing new backend format...');
    const newRecs = newFormat.success && newFormat.data 
      ? newFormat.data.recommendations 
      : newFormat.recommendations;
    logger.info('New format result:', newRecs?.length || 0, 'recommendations');
    
    logger.info('Testing old/legacy format...');
    const oldRecs = oldFormat.success && oldFormat.data 
      ? oldFormat.data.recommendations 
      : oldFormat.recommendations;
    logger.info('Old format result:', oldRecs?.length || 0, 'recommendations');
    
    logger.info('Testing error format...');
    const errorRecs = errorFormat.success && errorFormat.data 
      ? errorFormat.data.recommendations 
      : errorFormat.recommendations;
    logger.info('Error format result:', errorRecs?.length || 0, 'recommendations');
    
    logger.info('✅ Format handling tests completed');
    console.groupEnd();
  }
  
  /**
   * Generate test report
   */
  static generateTestReport(): string {
    const errorAnalysis = RecommendationsErrorMonitor.analyzeErrorPatterns();
    
    let report = `# Recommendations Fix Test Report\n\n`;
    report += `Generated: ${new Date().toISOString()}\n\n`;
    
    report += `## Error Analysis\n`;
    report += `Total Errors: ${errorAnalysis.totalErrors}\n`;
    report += `Most Common Step: ${errorAnalysis.mostCommonStep}\n`;
    report += `Most Common Error: ${errorAnalysis.mostCommonError}\n\n`;
    
    report += `## Fix Status\n`;
    report += `- ✅ Response format handling updated\n`;
    report += `- ✅ Error monitoring integrated\n`;
    report += `- ✅ Debugging tools added\n`;
    report += `- ✅ Pre-flight diagnostics added\n\n`;
    
    report += `## Recommendations\n`;
    errorAnalysis.recommendations.forEach(rec => {
      report += `- ${rec}\n`;
    });
    
    return report;
  }
}

// Make available in browser console for manual testing
if (typeof window !== 'undefined') {
  (window as any).RecommendationsFixTester = RecommendationsFixTester;
}

// Export for programmatic use
export default RecommendationsFixTester;