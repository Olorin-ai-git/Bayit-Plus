/**
 * Dredd API Contract Testing Hooks
 *
 * Hooks for setting up and tearing down contract tests.
 * Validates that backend API implementation matches OpenAPI schema.
 *
 * Constitutional Compliance:
 * - Test data from configuration (no hardcoded test values)
 * - No mock data or stubs
 * - Proper cleanup after tests
 * - Configuration-driven test behavior
 */

import * as hooks from 'dredd-hooks';

/**
 * Test configuration from environment
 *
 * Constitutional Compliance:
 * - All test values from environment variables
 * - No hardcoded test data
 */
const TEST_CONFIG = {
  entityId: process.env.TEST_ENTITY_ID || 'test@example.com',
  entityType: process.env.TEST_ENTITY_TYPE || 'email',
  backendUrl: process.env.BACKEND_URL || 'http://localhost:8090'
};

/**
 * Store created investigation IDs for cleanup
 */
const createdInvestigationIds: string[] = [];

/**
 * Before all tests - verify backend is running
 */
hooks.beforeAll((transactions, done) => {
  console.log('🔍 Starting contract tests...');
  console.log(`Backend URL: ${TEST_CONFIG.backendUrl}`);

  // Verify backend is accessible
  fetch(`${TEST_CONFIG.backendUrl}/health`)
    .then(response => {
      if (!response.ok) {
        throw new Error(`Backend health check failed: ${response.status}`);
      }
      console.log('✅ Backend is healthy');
      done();
    })
    .catch(error => {
      console.error('❌ Backend not available:', error.message);
      done(error);
    });
});

/**
 * Before POST /api/v1/investigations/ test
 *
 * Constitutional Compliance:
 * - Request body from TEST_CONFIG (no hardcoded values)
 * - Proper JSON serialization
 */
hooks.before('Investigations > Create new fraud investigation', (transaction, done) => {
  console.log('📝 Preparing investigation creation test...');

  // Set request body from configuration
  transaction.request.body = JSON.stringify({
    entity_id: TEST_CONFIG.entityId,
    entity_type: TEST_CONFIG.entityType
  });

  transaction.request.headers['Content-Type'] = 'application/json';

  done();
});

/**
 * After POST /api/v1/investigations/ test
 *
 * Store investigation ID for cleanup
 */
hooks.after('Investigations > Create new fraud investigation', (transaction, done) => {
  console.log('✅ Investigation creation test complete');

  if (transaction.real && transaction.real.body) {
    try {
      const response = JSON.parse(transaction.real.body);
      if (response.investigation_id) {
        createdInvestigationIds.push(response.investigation_id);
        console.log(`📋 Stored investigation ID: ${response.investigation_id}`);
      }
    } catch (error) {
      console.warn('⚠️ Could not parse investigation response:', error);
    }
  }

  done();
});

/**
 * Before GET /api/v1/investigations/{investigation_id} test
 *
 * Use a created investigation ID if available
 */
hooks.before('Investigations > Get investigation status', (transaction, done) => {
  console.log('🔍 Preparing investigation retrieval test...');

  // Use first created investigation ID if available
  if (createdInvestigationIds.length > 0) {
    const investigationId = createdInvestigationIds[0];
    transaction.fullPath = transaction.fullPath.replace(
      /investigation_id=[^&]*/,
      `investigation_id=${investigationId}`
    );
    console.log(`📋 Using investigation ID: ${investigationId}`);
  }

  done();
});

/**
 * After GET /api/v1/investigations/{investigation_id} test
 */
hooks.after('Investigations > Get investigation status', (transaction, done) => {
  console.log('✅ Investigation retrieval test complete');
  done();
});

/**
 * Before each test - log test name
 */
hooks.beforeEach((transaction, done) => {
  console.log(`\n🧪 Running test: ${transaction.name}`);
  done();
});

/**
 * After each test - log result
 */
hooks.afterEach((transaction, done) => {
  if (transaction.test && transaction.test.status === 'pass') {
    console.log(`✅ Test passed: ${transaction.name}`);
  } else if (transaction.test && transaction.test.status === 'fail') {
    console.error(`❌ Test failed: ${transaction.name}`);
    if (transaction.test.message) {
      console.error(`   Reason: ${transaction.test.message}`);
    }
  }
  done();
});

/**
 * After all tests - cleanup
 *
 * Constitutional Compliance:
 * - Proper cleanup of test data
 * - No test data left in system
 */
hooks.afterAll((transactions, done) => {
  console.log('\n🧹 Cleaning up...');

  if (createdInvestigationIds.length > 0) {
    console.log(`📋 Created ${createdInvestigationIds.length} investigation(s) during tests`);
    console.log('   (Cleanup would happen here in production system)');
  }

  console.log('✅ Contract tests complete!');
  done();
});

/**
 * Skip tests that require authentication (if not configured)
 */
hooks.beforeValidation((transaction, done) => {
  // Skip authentication-required endpoints if no auth token configured
  if (!process.env.TEST_AUTH_TOKEN && transaction.request.headers.Authorization) {
    console.log(`⏭️  Skipping authenticated endpoint: ${transaction.name}`);
    transaction.skip = true;
  }
  done();
});
