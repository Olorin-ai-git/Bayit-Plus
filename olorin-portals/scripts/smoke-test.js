#!/usr/bin/env node

/**
 * Smoke Test Script for Olorin Portals
 *
 * Validates that deployed portals are accessible and functional via HTTP health checks.
 * Tests critical pages, response times, and content validation.
 *
 * Usage:
 *   node smoke-test.js <base-url> [portal-name]
 *
 * Example:
 *   node smoke-test.js http://localhost:3000 portal-station
 *   node smoke-test.js https://marketing.station.olorin.ai portal-station
 */

const http = require('http');
const https = require('https');

// Configuration
const BASE_URL = process.argv[2] || 'http://localhost:3000';
const PORTAL_NAME = process.argv[3] || 'unknown';
const TIMEOUT_MS = 10000;
const MAX_RESPONSE_TIME_MS = 3000;

// Test results
const results = {
  passed: 0,
  failed: 0,
  warnings: 0,
  tests: []
};

// Color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m'
};

/**
 * Make HTTP request with timeout
 */
function makeRequest(url) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;
    const startTime = Date.now();

    const req = protocol.get(url, { timeout: TIMEOUT_MS }, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        const responseTime = Date.now() - startTime;
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: data,
          responseTime
        });
      });
    });

    req.on('error', (err) => {
      reject(err);
    });

    req.on('timeout', () => {
      req.destroy();
      reject(new Error(`Request timeout after ${TIMEOUT_MS}ms`));
    });
  });
}

/**
 * Run a single test
 */
async function runTest(testName, testFn) {
  process.stdout.write(`${colors.cyan}Testing: ${testName}...${colors.reset} `);

  try {
    const result = await testFn();

    if (result.passed) {
      console.log(`${colors.green}✓ PASS${colors.reset}${result.message ? ' - ' + result.message : ''}`);
      results.passed++;
      results.tests.push({ name: testName, status: 'PASS', message: result.message });
    } else if (result.warning) {
      console.log(`${colors.yellow}⚠ WARNING${colors.reset} - ${result.message}`);
      results.warnings++;
      results.tests.push({ name: testName, status: 'WARNING', message: result.message });
    } else {
      console.log(`${colors.red}✗ FAIL${colors.reset} - ${result.message}`);
      results.failed++;
      results.tests.push({ name: testName, status: 'FAIL', message: result.message });
    }
  } catch (error) {
    console.log(`${colors.red}✗ ERROR${colors.reset} - ${error.message}`);
    results.failed++;
    results.tests.push({ name: testName, status: 'ERROR', message: error.message });
  }
}

/**
 * Test: Homepage is accessible
 */
async function testHomepage() {
  const response = await makeRequest(BASE_URL);

  if (response.statusCode !== 200) {
    return { passed: false, message: `Expected status 200, got ${response.statusCode}` };
  }

  if (!response.body.includes('<div') || !response.body.includes('</div>')) {
    return { passed: false, message: 'Response does not contain valid HTML' };
  }

  return { passed: true, message: `${response.responseTime}ms` };
}

/**
 * Test: Pricing page is accessible
 */
async function testPricingPage() {
  const url = `${BASE_URL}/pricing`;
  const response = await makeRequest(url);

  if (response.statusCode !== 200) {
    return { passed: false, message: `Expected status 200, got ${response.statusCode}` };
  }

  return { passed: true, message: `${response.responseTime}ms` };
}

/**
 * Test: Contact page is accessible
 */
async function testContactPage() {
  const url = `${BASE_URL}/contact`;
  const response = await makeRequest(url);

  if (response.statusCode !== 200) {
    return { passed: false, message: `Expected status 200, got ${response.statusCode}` };
  }

  return { passed: true, message: `${response.responseTime}ms` };
}

/**
 * Test: Static assets load correctly
 */
async function testStaticAssets() {
  const response = await makeRequest(BASE_URL);
  const body = response.body;

  // Check for JavaScript bundle
  const jsMatch = body.match(/src="([^"]*\.js)"/);
  if (!jsMatch) {
    return { passed: false, message: 'No JavaScript bundle found in HTML' };
  }

  // Check for CSS
  const cssMatch = body.match(/href="([^"]*\.css)"/);
  if (!cssMatch) {
    return { passed: false, message: 'No CSS file found in HTML' };
  }

  return { passed: true, message: 'JS and CSS references found' };
}

/**
 * Test: Response times are acceptable
 */
async function testResponseTimes() {
  const urls = [
    BASE_URL,
    `${BASE_URL}/pricing`,
    `${BASE_URL}/contact`
  ];

  let slowestUrl = null;
  let slowestTime = 0;

  for (const url of urls) {
    const response = await makeRequest(url);
    if (response.responseTime > slowestTime) {
      slowestTime = response.responseTime;
      slowestUrl = url;
    }
  }

  if (slowestTime > MAX_RESPONSE_TIME_MS) {
    return {
      warning: true,
      message: `Slowest page (${slowestUrl}) took ${slowestTime}ms (> ${MAX_RESPONSE_TIME_MS}ms threshold)`
    };
  }

  return { passed: true, message: `All pages < ${MAX_RESPONSE_TIME_MS}ms (slowest: ${slowestTime}ms)` };
}

/**
 * Test: No obvious errors in HTML
 */
async function testNoErrors() {
  const response = await makeRequest(BASE_URL);
  const body = response.body.toLowerCase();

  // Check for common error indicators
  const errorIndicators = [
    'error loading',
    'failed to load',
    'something went wrong',
    'page not found',
    '404',
    '500',
    'internal server error'
  ];

  for (const indicator of errorIndicators) {
    if (body.includes(indicator)) {
      return { passed: false, message: `Found error indicator: "${indicator}"` };
    }
  }

  return { passed: true, message: 'No error indicators found' };
}

/**
 * Test: Security headers present
 */
async function testSecurityHeaders() {
  const response = await makeRequest(BASE_URL);
  const headers = response.headers;

  const missingHeaders = [];

  // Check for important security headers
  if (!headers['content-security-policy'] && !headers['x-content-security-policy']) {
    missingHeaders.push('Content-Security-Policy');
  }

  if (!headers['x-frame-options']) {
    missingHeaders.push('X-Frame-Options');
  }

  if (!headers['x-content-type-options']) {
    missingHeaders.push('X-Content-Type-Options');
  }

  if (missingHeaders.length > 0) {
    return {
      warning: true,
      message: `Missing security headers: ${missingHeaders.join(', ')}`
    };
  }

  return { passed: true, message: 'Key security headers present' };
}

/**
 * Main test runner
 */
async function main() {
  console.log('\n' + '='.repeat(60));
  console.log(`${colors.cyan}SMOKE TESTS: ${PORTAL_NAME}${colors.reset}`);
  console.log(`${colors.cyan}Target URL: ${BASE_URL}${colors.reset}`);
  console.log('='.repeat(60) + '\n');

  // Run all tests
  await runTest('Homepage Accessible', testHomepage);
  await runTest('Pricing Page Accessible', testPricingPage);
  await runTest('Contact Page Accessible', testContactPage);
  await runTest('Static Assets Load', testStaticAssets);
  await runTest('Response Times', testResponseTimes);
  await runTest('No Error Messages', testNoErrors);
  await runTest('Security Headers', testSecurityHeaders);

  // Print summary
  console.log('\n' + '='.repeat(60));
  console.log(`${colors.cyan}TEST SUMMARY${colors.reset}`);
  console.log('='.repeat(60));
  console.log(`${colors.green}Passed:${colors.reset}   ${results.passed}`);
  console.log(`${colors.yellow}Warnings:${colors.reset} ${results.warnings}`);
  console.log(`${colors.red}Failed:${colors.reset}   ${results.failed}`);
  console.log('='.repeat(60) + '\n');

  // Exit with appropriate code
  if (results.failed > 0) {
    console.error(`${colors.red}Smoke tests FAILED${colors.reset}\n`);
    process.exit(1);
  } else if (results.warnings > 0) {
    console.log(`${colors.yellow}Smoke tests PASSED with warnings${colors.reset}\n`);
    process.exit(0);
  } else {
    console.log(`${colors.green}All smoke tests PASSED${colors.reset}\n`);
    process.exit(0);
  }
}

// Run tests
main().catch((error) => {
  console.error(`${colors.red}Fatal error:${colors.reset}`, error.message);
  process.exit(1);
});
