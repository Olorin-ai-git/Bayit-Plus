/**
 * Test script to verify the duplicate request blocking system
 * This can be used in browser console to test the blocking effectiveness
 */

import { CVAnalyzer } from '../services/cv/CVAnalyzer';
import { recommendationsDebugger } from './debugRecommendations';

export async function testDuplicateBlocking(jobId = 'test-job-123') {
  logger.warn('🧪 Starting duplicate request blocking test...');
  logger.warn('📝 This test will make multiple simultaneous calls to getRecommendations');
  
  // Clear any existing tracking
  CVAnalyzer.clearRequestTracking();
  recommendationsDebugger.clearHistory();
  
  // Create multiple simultaneous requests
  const promises = [];
  const numRequests = 5;
  
  logger.warn(`🚀 Making ${numRequests} simultaneous requests...`);
  
  for (let i = 0; i < numRequests; i++) {
    const promise = CVAnalyzer.getRecommendations(jobId, 'Software Engineer', ['JavaScript', 'React'])
      .then(result => ({
        requestIndex: i,
        success: true,
        result: result ? 'Got data' : 'No data',
        timestamp: Date.now()
      }))
      .catch(error => ({
        requestIndex: i,
        success: false,
        error: error.message,
        timestamp: Date.now()
      }));
    
    promises.push(promise);
  }
  
  // Wait for all requests to complete
  logger.warn('⏳ Waiting for all requests to complete...');
  const results = await Promise.all(promises);
  
  // Get statistics
  const stats = recommendationsDebugger.getStats(jobId);
  const debugInfo = CVAnalyzer.getRequestDebugInfo();
  
  logger.warn('📊 Test Results:');
  logger.warn('================');
  logger.warn(`Total calls made: ${stats.totalCalls}`);
  logger.warn(`Actual Firebase requests: ${stats.actualCalls}`);
  logger.warn(`Blocked requests: ${stats.blockedCalls}`);
  logger.warn(`Blocking effectiveness: ${stats.blockingEffectiveness.toFixed(1)}%`);
  logger.warn(`Expected result: Only 1 actual request, ${numRequests - 1} blocked`);
  
  logger.warn('\n🔍 Detailed Results:');
  results.forEach((result, index) => {
    const status = result.success ? '✅' : '❌';
    if (result.success && 'result' in result) {
      logger.warn(`${status} Request ${index + 1}: ${result.result}`);
    } else if (!result.success && 'error' in result) {
      logger.warn(`${status} Request ${index + 1}: ${result.error}`);
    }
  });
  
  logger.warn('\n🛠️ Debug Info:');
  logger.warn('Active requests:', debugInfo.activeRequests);
  logger.warn('Cached promises:', debugInfo.cachedPromises);
  logger.warn('Request counts:', debugInfo.requestCounts);
  
  logger.warn('\n📈 Statistics:');
  logger.warn(stats);
  
  // Verify the blocking worked
  const success = stats.actualCalls === 1 && stats.blockedCalls === numRequests - 1;
  
  if (success) {
    logger.warn('\n🎉 SUCCESS! Duplicate request blocking is working correctly!');
    logger.warn(`   ✅ Only ${stats.actualCalls} actual Firebase request made`);
    logger.warn(`   ✅ ${stats.blockedCalls} duplicate requests were blocked`);
  } else {
    logger.warn('\n❌ FAILURE! Duplicate request blocking is not working as expected!');
    logger.warn(`   Expected: 1 actual request, ${numRequests - 1} blocked`);
    logger.warn(`   Got: ${stats.actualCalls} actual requests, ${stats.blockedCalls} blocked`);
  }
  
  return {
    success,
    stats,
    results,
    debugInfo
  };
}

// Make test function available globally for browser console testing
if (typeof window !== 'undefined') {
  (window as any).testDuplicateBlocking = testDuplicateBlocking;
  
  // Console messages disabled to reduce noise
  // Uncomment to show test function availability
  /*
  logger.warn('🧪 Test function available: window.testDuplicateBlocking()');
  logger.warn('📝 Usage: testDuplicateBlocking("your-job-id")');
  */
}