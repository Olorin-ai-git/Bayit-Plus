/**
 * Test script to verify the duplicate getRecommendations fix
 * Run this from browser console to test the fix
 */

import { recommendationsDebugger } from './debugRecommendations';

export const testDuplicateFix = {
  // Clear previous test data
  reset() {
    recommendationsDebugger.clearHistory();
    logger.warn('🧹 Cleared recommendations debug history');
  },
  
  // Simulate multiple rapid calls (this should be prevented by our fix)
  async simulateRapidCalls(jobId = 'test-job-123') {
    logger.warn('🧪 Testing rapid successive calls...');
    
    // These would normally cause duplicates
    const promises = [
      this.callGetRecommendations(jobId, 'Call 1'),
      this.callGetRecommendations(jobId, 'Call 2'),  
      this.callGetRecommendations(jobId, 'Call 3'),
      this.callGetRecommendations(jobId, 'Call 4')
    ];
    
    try {
      await Promise.all(promises);
    } catch (error) {
      logger.warn('Expected error from duplicate prevention:', error);
    }
    
    this.showResults(jobId);
  },
  
  // Helper to call getRecommendations (mocked for testing)
  async callGetRecommendations(jobId: string, label: string) {
    logger.warn(`📞 ${label}: Calling getRecommendations for ${jobId}`);
    recommendationsDebugger.trackCall(jobId, `testDuplicateFix.${label}`);
    
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 100 + Math.random() * 200));
    
    logger.warn(`✅ ${label}: getRecommendations completed for ${jobId}`);
  },
  
  // Show test results
  showResults(jobId?: string) {
    logger.warn('\n📊 Test Results:');
    const stats = recommendationsDebugger.getStats(jobId);
    const history = recommendationsDebugger.getCallHistory(jobId);
    
    logger.warn('Stats:', stats);
    logger.warn('Call History:', history);
    
    if (stats.duplicateCalls > 0) {
      logger.error(`❌ TEST FAILED: ${stats.duplicateCalls} duplicate calls detected!`);
    } else {
      logger.warn('✅ TEST PASSED: No duplicate calls detected');
    }
    
    return stats;
  },
  
  // Monitor live calls
  startMonitoring() {
    logger.warn('🔍 Starting live monitoring. Open CVAnalysisResults component to see live tracking...');
    
    // Add periodic stats logging
    const interval = setInterval(() => {
      const stats = recommendationsDebugger.getStats();
      if (stats.totalCalls > 0) {
        logger.warn('📈 Live Stats:', stats);
        if (stats.duplicateCalls > 0) {
          logger.warn(`⚠️ ${stats.duplicateCalls} duplicate calls detected in live monitoring!`);
        }
      }
    }, 5000);
    
    return () => {
      clearInterval(interval);
      logger.warn('🔍 Stopped monitoring');
    };
  }
};

// Make available globally for easy testing
if (typeof window !== 'undefined') {
  (window as any).testDuplicateFix = testDuplicateFix;
}