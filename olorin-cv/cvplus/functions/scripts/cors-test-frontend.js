#!/usr/bin/env node

/**
 * Frontend CORS Testing Script
 * 
 * This script tests CORS functionality from a frontend perspective by making
 * requests to Firebase Functions and validating the responses.
 * 
 * Usage: node scripts/cors-test-frontend.js
 * 
 * @author Gil Klainert
 * @created 2025-08-22
 */

const axios = require('axios');

// Configuration
const FIREBASE_FUNCTIONS_BASE = process.env.FIREBASE_FUNCTIONS_BASE || 'http://127.0.0.1:5001/getmycv-ai/us-central1';
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || 'http://localhost:3000';

console.log('🧪 CVPlus CORS Testing Script');
console.log('=============================');
console.log(`Functions Base URL: ${FIREBASE_FUNCTIONS_BASE}`);
console.log(`Testing from Origin: ${FRONTEND_ORIGIN}`);
console.log('');

/**
 * Test function with HTTP request simulation
 */
async function testCorsHTTP() {
  console.log('📡 Testing HTTP (onRequest) CORS...');
  
  try {
    const response = await axios({
      method: 'GET',
      url: `${FIREBASE_FUNCTIONS_BASE}/testCorsHTTP`,
      headers: {
        'Origin': FRONTEND_ORIGIN,
        'Content-Type': 'application/json',
        'User-Agent': 'CORS-Test-Script/1.0'
      },
      timeout: 10000
    });
    
    console.log('✅ HTTP CORS Test - SUCCESS');
    console.log('Response Status:', response.status);
    console.log('CORS Headers:');
    console.log('  - Access-Control-Allow-Origin:', response.headers['access-control-allow-origin']);
    console.log('  - Access-Control-Allow-Methods:', response.headers['access-control-allow-methods']);
    console.log('  - Access-Control-Allow-Headers:', response.headers['access-control-allow-headers']);
    console.log('Response Data:', JSON.stringify(response.data, null, 2));
    console.log('');
    
    return true;
  } catch (error) {
    console.log('❌ HTTP CORS Test - FAILED');
    console.log('Error:', error.message);
    if (error.response) {
      console.log('Response Status:', error.response.status);
      console.log('Response Headers:', error.response.headers);
      console.log('Response Data:', error.response.data);
    }
    console.log('');
    return false;
  }
}

/**
 * Test CORS validation endpoint
 */
async function testCorsValidation() {
  console.log('🔍 Testing CORS Validation...');
  
  try {
    const response = await axios({
      method: 'POST',
      url: `${FIREBASE_FUNCTIONS_BASE}/validateCorsConfiguration`,
      headers: {
        'Origin': FRONTEND_ORIGIN,
        'Content-Type': 'application/json',
        'User-Agent': 'CORS-Test-Script/1.0'
      },
      data: {
        test: 'validation'
      },
      timeout: 10000
    });
    
    console.log('✅ CORS Validation Test - SUCCESS');
    console.log('Response Status:', response.status);
    console.log('Validation Results:', JSON.stringify(response.data, null, 2));
    console.log('');
    
    return response.data;
  } catch (error) {
    console.log('❌ CORS Validation Test - FAILED');
    console.log('Error:', error.message);
    if (error.response) {
      console.log('Response Status:', error.response.status);
      console.log('Response Data:', error.response.data);
    }
    console.log('');
    return null;
  }
}

/**
 * Test preflight request
 */
async function testPreflightRequest() {
  console.log('🚁 Testing Preflight (OPTIONS) Request...');
  
  try {
    const response = await axios({
      method: 'OPTIONS',
      url: `${FIREBASE_FUNCTIONS_BASE}/testCorsHTTP`,
      headers: {
        'Origin': FRONTEND_ORIGIN,
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'Content-Type, Authorization'
      },
      timeout: 10000
    });
    
    console.log('✅ Preflight Request - SUCCESS');
    console.log('Response Status:', response.status);
    console.log('Preflight CORS Headers:');
    console.log('  - Access-Control-Allow-Origin:', response.headers['access-control-allow-origin']);
    console.log('  - Access-Control-Allow-Methods:', response.headers['access-control-allow-methods']);
    console.log('  - Access-Control-Allow-Headers:', response.headers['access-control-allow-headers']);
    console.log('  - Access-Control-Max-Age:', response.headers['access-control-max-age']);
    console.log('');
    
    return true;
  } catch (error) {
    console.log('❌ Preflight Request - FAILED');
    console.log('Error:', error.message);
    if (error.response) {
      console.log('Response Status:', error.response.status);
      console.log('Response Headers:', error.response.headers);
    }
    console.log('');
    return false;
  }
}

/**
 * Test generateCertificationBadges function (the original failing function)
 */
async function testCertificationBadges() {
  console.log('🏆 Testing generateCertificationBadges CORS...');
  
  try {
    // First test if the function exists and responds to OPTIONS
    const preflightResponse = await axios({
      method: 'OPTIONS',
      url: `${FIREBASE_FUNCTIONS_BASE}/generateCertificationBadges`,
      headers: {
        'Origin': FRONTEND_ORIGIN,
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'Content-Type, Authorization'
      },
      timeout: 10000
    });
    
    console.log('✅ generateCertificationBadges Preflight - SUCCESS');
    console.log('Preflight Status:', preflightResponse.status);
    console.log('CORS Headers:', {
      origin: preflightResponse.headers['access-control-allow-origin'],
      methods: preflightResponse.headers['access-control-allow-methods'],
      headers: preflightResponse.headers['access-control-allow-headers']
    });
    console.log('');
    
    return true;
  } catch (error) {
    console.log('❌ generateCertificationBadges CORS - FAILED');
    console.log('Error:', error.message);
    if (error.response) {
      console.log('Response Status:', error.response.status);
      console.log('Response Headers:', error.response.headers);
    }
    console.log('');
    return false;
  }
}

/**
 * Run all CORS tests
 */
async function runAllTests() {
  console.log('🚀 Starting CORS Tests...\n');
  
  const results = {
    httpCors: await testCorsHTTP(),
    corsValidation: await testCorsValidation(),
    preflight: await testPreflightRequest(),
    certificationBadges: await testCertificationBadges()
  };
  
  console.log('📊 Test Results Summary');
  console.log('======================');
  console.log('HTTP CORS Test:', results.httpCors ? '✅ PASS' : '❌ FAIL');
  console.log('CORS Validation:', results.corsValidation ? '✅ PASS' : '❌ FAIL');
  console.log('Preflight Request:', results.preflight ? '✅ PASS' : '❌ FAIL');
  console.log('Certification Badges CORS:', results.certificationBadges ? '✅ PASS' : '❌ FAIL');
  console.log('');
  
  const passed = Object.values(results).filter(Boolean).length;
  const total = Object.keys(results).length;
  
  console.log(`Overall: ${passed}/${total} tests passed`);
  
  if (passed === total) {
    console.log('🎉 All CORS tests passed! Your functions should work properly from the frontend.');
  } else {
    console.log('⚠️ Some CORS tests failed. Check the configuration and function deployments.');
  }
  
  return results;
}

// Run tests if script is executed directly
if (require.main === module) {
  runAllTests()
    .then(results => {
      const passed = Object.values(results).filter(Boolean).length;
      const total = Object.keys(results).length;
      process.exit(passed === total ? 0 : 1);
    })
    .catch(error => {
      console.error('❌ Test execution failed:', error);
      process.exit(1);
    });
}

module.exports = {
  runAllTests,
  testCorsHTTP,
  testCorsValidation,
  testPreflightRequest,
  testCertificationBadges
};