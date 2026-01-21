/**
 * Cache Performance Testing Script
 * Demonstrates the caching solution and validates performance improvements
 */

import { logger } from 'firebase-functions';
import { subscriptionCache } from '../services/subscription-cache.service';
import { cachedSubscriptionService, UserSubscriptionData } from '../services/cached-subscription.service';
import { cacheMonitor } from '../services/cache-monitor.service';

export async function runCachePerformanceTest(): Promise<void> {
  logger.info('Starting cache performance test...');

  // Mock subscription data for testing
  const testUsers = [
    'user1', 'user2', 'user3', 'user4', 'user5',
    'user6', 'user7', 'user8', 'user9', 'user10'
  ];

  const mockSubscriptionData: UserSubscriptionData = {
    subscriptionStatus: 'premium_lifetime',
    lifetimeAccess: true,
    features: {
      webPortal: true,
      aiChat: true,
      podcast: true,
      advancedAnalytics: true,
      videoIntroduction: true,
      roleDetection: true,
      externalData: true
    },
    purchasedAt: new Date(),
    metadata: {
      paymentAmount: 99.99,
      currency: 'USD',
      activatedAt: new Date(),
      activationType: 'lifetime'
    }
  };

  // Test 1: Cache Miss Performance (simulating first-time access)
  logger.info('Test 1: Cache Miss Scenario');
  const startTime1 = Date.now();
  
  for (const userId of testUsers) {
    const result = subscriptionCache.get(userId);
    if (!result) {
      subscriptionCache.set(userId, mockSubscriptionData);
    }
  }
  
  const missTime = Date.now() - startTime1;
  logger.info(`Cache miss operations took: ${missTime}ms`);

  // Test 2: Cache Hit Performance (accessing cached data)
  logger.info('Test 2: Cache Hit Scenario');
  const startTime2 = Date.now();
  
  for (const userId of testUsers) {
    const result = subscriptionCache.get(userId);
    // Simulate multiple accesses like in premiumGuard
    subscriptionCache.get(userId);
    subscriptionCache.get(userId);
  }
  
  const hitTime = Date.now() - startTime2;
  logger.info(`Cache hit operations took: ${hitTime}ms`);

  // Test 3: Performance Comparison
  const performanceImprovement = missTime > 0 ? (missTime / hitTime) : 1;
  logger.info(`Cache performance improvement: ${performanceImprovement.toFixed(2)}x faster`);

  // Test 4: Cache Statistics
  const stats = subscriptionCache.getStats();
  logger.info('Cache Statistics:', {
    hits: stats.hits,
    misses: stats.misses,
    size: stats.size,
    hitRate: stats.hits / (stats.hits + stats.misses) * 100
  });

  // Test 5: Cache Health Report
  const healthReport = cacheMonitor.generateHealthReport();
  logger.info('Cache Health Report:', {
    efficiency: healthReport.performance.efficiency,
    hitRate: `${healthReport.performance.hitRate}%`,
    recommendations: healthReport.recommendations
  });

  // Test 6: Memory Management Test
  logger.info('Test 6: Memory Management');
  
  // Add many entries to test eviction
  for (let i = 0; i < 50; i++) {
    subscriptionCache.set(`bulk_user_${i}`, mockSubscriptionData);
  }
  
  const finalStats = subscriptionCache.getStats();
  logger.info(`Cache size after bulk insert: ${finalStats.size}`);

  // Test 7: TTL and Expiration Test
  logger.info('Test 7: TTL and Expiration Test');
  
  // Add entry with short TTL
  subscriptionCache.set('temp_user', mockSubscriptionData, 1000); // 1 second TTL
  
  let tempData = subscriptionCache.get('temp_user');
  logger.info(`Temp data available immediately: ${!!tempData}`);
  
  // Wait for expiration
  await new Promise(resolve => setTimeout(resolve, 1200));
  
  tempData = subscriptionCache.get('temp_user');
  logger.info(`Temp data available after expiration: ${!!tempData}`);

  // Test 8: Error Handling
  logger.info('Test 8: Error Handling');
  
  try {
    // Test with invalid data
    subscriptionCache.set('error_test', null as any);
    const errorResult = subscriptionCache.get('error_test');
    logger.info(`Error handling test completed: ${errorResult === null}`);
  } catch (error) {
    logger.info('Error handling test - graceful failure:', error);
  }

  // Cleanup
  subscriptionCache.clearAll();
  logger.info('Cache performance test completed and cache cleared');
}

/**
 * Simulate production load scenario
 */
export async function simulateProductionLoad(): Promise<void> {
  logger.info('Starting production load simulation...');

  const users = Array.from({ length: 100 }, (_, i) => `prod_user_${i}`);
  const mockData: UserSubscriptionData = {
    subscriptionStatus: 'premium_lifetime',
    lifetimeAccess: true,
    features: {
      webPortal: true,
      aiChat: true,
      podcast: true,
      advancedAnalytics: true
    }
  };

  // Simulate multiple premium guard checks per user (realistic scenario)
  const startTime = Date.now();
  
  for (const userId of users) {
    // First access (cache miss)
    let data = subscriptionCache.get(userId);
    if (!data) {
      subscriptionCache.set(userId, mockData);
      data = subscriptionCache.get(userId);
    }
    
    // Subsequent accesses (cache hits) - simulating multiple feature checks
    subscriptionCache.get(userId); // Premium feature 1
    subscriptionCache.get(userId); // Premium feature 2
    subscriptionCache.get(userId); // Premium feature 3
  }
  
  const endTime = Date.now();
  const totalTime = endTime - startTime;
  
  const stats = subscriptionCache.getStats();
  const hitRate = (stats.hits / (stats.hits + stats.misses)) * 100;
  
  logger.info('Production Load Simulation Results:', {
    totalUsers: users.length,
    totalOperations: stats.hits + stats.misses,
    executionTime: `${totalTime}ms`,
    averageTimePerUser: `${(totalTime / users.length).toFixed(2)}ms`,
    hitRate: `${hitRate.toFixed(2)}%`,
    cacheEfficiency: stats.hits > stats.misses ? 'Excellent' : 'Needs Improvement'
  });

  subscriptionCache.clearAll();
  logger.info('Production load simulation completed');
}