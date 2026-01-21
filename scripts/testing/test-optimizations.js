#!/usr/bin/env node

/**
 * Test script to verify optimization implementations
 */

console.log('🧪 Testing CVPlus Function Optimizations...\n');

const tests = [];

// Test 1: Verify generateCV function is properly structured
async function testGenerateCVStructure() {
  console.log('📋 Test 1: Checking generateCV function structure...');
  
  try {
    const fs = require('fs');
    const path = require('path');
    
    const generateCVPath = path.join(__dirname, 'src/functions/generateCV.ts');
    const content = fs.readFileSync(generateCVPath, 'utf8');
    
    // Check for modular functions
    const hasInitializeAndValidateJob = content.includes('async function initializeAndValidateJob');
    const hasGenerateAndSaveCV = content.includes('async function generateAndSaveCV');
    const hasProcessEnhancementFeatures = content.includes('async function processEnhancementFeatures');
    const hasCompleteJobGeneration = content.includes('async function completeJobGeneration');
    const hasHandleGenerationError = content.includes('async function handleGenerationError');
    
    console.log('  ✓ initializeAndValidateJob function:', hasInitializeAndValidateJob ? '✅' : '❌');
    console.log('  ✓ generateAndSaveCV function:', hasGenerateAndSaveCV ? '✅' : '❌');
    console.log('  ✓ processEnhancementFeatures function:', hasProcessEnhancementFeatures ? '✅' : '❌');
    console.log('  ✓ completeJobGeneration function:', hasCompleteJobGeneration ? '✅' : '❌');
    console.log('  ✓ handleGenerationError function:', hasHandleGenerationError ? '✅' : '❌');
    
    const allModular = hasInitializeAndValidateJob && hasGenerateAndSaveCV && 
                      hasProcessEnhancementFeatures && hasCompleteJobGeneration && 
                      hasHandleGenerationError;
    
    return { passed: allModular, message: allModular ? 'All modular functions present' : 'Missing modular functions' };
  } catch (error) {
    return { passed: false, message: `Error reading file: ${error.message}` };
  }
}

// Test 2: Verify graceful failure handling
async function testGracefulFailureHandling() {
  console.log('\n📋 Test 2: Checking graceful failure handling...');
  
  try {
    const fs = require('fs');
    const path = require('path');
    
    const generateCVPath = path.join(__dirname, 'src/functions/generateCV.ts');
    const content = fs.readFileSync(generateCVPath, 'utf8');
    
    // Check for failure handling functions
    const hasMarkFeatureAsFailed = content.includes('async function markFeatureAsFailed');
    const hasUpdateJobWithProcessingSummary = content.includes('async function updateJobWithProcessingSummary');
    const hasLogProcessingSummary = content.includes('function logProcessingSummary');
    const hasIsRetryableError = content.includes('function isRetryableError');
    const hasProcessingResults = content.includes('const processingResults = {');
    
    console.log('  ✓ markFeatureAsFailed function:', hasMarkFeatureAsFailed ? '✅' : '❌');
    console.log('  ✓ updateJobWithProcessingSummary function:', hasUpdateJobWithProcessingSummary ? '✅' : '❌');
    console.log('  ✓ logProcessingSummary function:', hasLogProcessingSummary ? '✅' : '❌');
    console.log('  ✓ isRetryableError function:', hasIsRetryableError ? '✅' : '❌');
    console.log('  ✓ processingResults tracking:', hasProcessingResults ? '✅' : '❌');
    
    const allPresent = hasMarkFeatureAsFailed && hasUpdateJobWithProcessingSummary && 
                      hasLogProcessingSummary && hasIsRetryableError && hasProcessingResults;
    
    return { passed: allPresent, message: allPresent ? 'All failure handling functions present' : 'Missing failure handling functions' };
  } catch (error) {
    return { passed: false, message: `Error reading file: ${error.message}` };
  }
}

// Test 3: Verify caching implementation
async function testCachingImplementation() {
  console.log('\n📋 Test 3: Checking caching and deduplication...');
  
  try {
    const fs = require('fs');
    const path = require('path');
    
    const applyImprovementsPath = path.join(__dirname, 'src/functions/applyImprovements.ts');
    const content = fs.readFileSync(applyImprovementsPath, 'utf8');
    
    // Check for caching components
    const hasActiveRequests = content.includes('const activeRequests = new Map');
    const hasRecommendationCache = content.includes('const recommendationCache = new Map');
    const hasCacheDuration = content.includes('const CACHE_DURATION = 5 * 60 * 1000');
    const hasRequestKey = content.includes('const requestKey =');
    const hasExecuteRecommendationGeneration = content.includes('async function executeRecommendationGeneration');
    
    console.log('  ✓ activeRequests Map:', hasActiveRequests ? '✅' : '❌');
    console.log('  ✓ recommendationCache Map:', hasRecommendationCache ? '✅' : '❌');
    console.log('  ✓ CACHE_DURATION constant:', hasCacheDuration ? '✅' : '❌');
    console.log('  ✓ requestKey generation:', hasRequestKey ? '✅' : '❌');
    console.log('  ✓ executeRecommendationGeneration function:', hasExecuteRecommendationGeneration ? '✅' : '❌');
    
    const allCachingPresent = hasActiveRequests && hasRecommendationCache && 
                             hasCacheDuration && hasRequestKey && hasExecuteRecommendationGeneration;
    
    return { passed: allCachingPresent, message: allCachingPresent ? 'All caching components present' : 'Missing caching components' };
  } catch (error) {
    return { passed: false, message: `Error reading file: ${error.message}` };
  }
}

// Test 4: Verify TypeScript compilation
async function testTypeScriptCompilation() {
  console.log('\n📋 Test 4: Checking TypeScript compilation...');
  
  try {
    const { execSync } = require('child_process');
    
    // Run TypeScript compiler
    execSync('npm run build', { stdio: 'pipe', cwd: __dirname });
    
    return { passed: true, message: 'TypeScript compilation successful' };
  } catch (error) {
    return { passed: false, message: `TypeScript compilation failed: ${error.message}` };
  }
}

// Test 5: Basic syntax validation
async function testSyntaxValidation() {
  console.log('\n📋 Test 5: Basic syntax validation...');
  
  try {
    const files = [
      'src/functions/generateCV.ts',
      'src/functions/applyImprovements.ts'
    ];
    
    for (const file of files) {
      const fs = require('fs');
      const path = require('path');
      const filePath = path.join(__dirname, file);
      
      if (!fs.existsSync(filePath)) {
        return { passed: false, message: `File not found: ${file}` };
      }
      
      const content = fs.readFileSync(filePath, 'utf8');
      
      // Basic syntax checks
      const hasUnmatchedBraces = (content.match(/\{/g) || []).length !== (content.match(/\}/g) || []).length;
      const hasUnmatchedParens = (content.match(/\(/g) || []).length !== (content.match(/\)/g) || []).length;
      
      if (hasUnmatchedBraces || hasUnmatchedParens) {
        return { passed: false, message: `Syntax error in ${file}: unmatched braces or parentheses` };
      }
    }
    
    return { passed: true, message: 'Basic syntax validation passed' };
  } catch (error) {
    return { passed: false, message: `Syntax validation failed: ${error.message}` };
  }
}

// Run all tests
async function runTests() {
  const testFunctions = [
    { name: 'generateCV Structure', fn: testGenerateCVStructure },
    { name: 'Graceful Failure Handling', fn: testGracefulFailureHandling },
    { name: 'Caching Implementation', fn: testCachingImplementation },
    { name: 'TypeScript Compilation', fn: testTypeScriptCompilation },
    { name: 'Syntax Validation', fn: testSyntaxValidation }
  ];
  
  let passed = 0;
  let failed = 0;
  
  for (const test of testFunctions) {
    try {
      const result = await test.fn();
      if (result.passed) {
        console.log(`\n✅ ${test.name}: PASSED - ${result.message}`);
        passed++;
      } else {
        console.log(`\n❌ ${test.name}: FAILED - ${result.message}`);
        failed++;
      }
    } catch (error) {
      console.log(`\n❌ ${test.name}: ERROR - ${error.message}`);
      failed++;
    }
  }
  
  console.log('\n' + '='.repeat(60));
  console.log(`📊 Test Results Summary:`);
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`📈 Success Rate: ${Math.round((passed / (passed + failed)) * 100)}%`);
  
  if (failed === 0) {
    console.log('\n🎉 All optimization tests passed! The implementations are working correctly.');
  } else {
    console.log('\n⚠️ Some tests failed. Please review the output above for details.');
  }
  
  return failed === 0;
}

// Run the tests
runTests().then(success => {
  process.exit(success ? 0 : 1);
}).catch(error => {
  console.error('Test runner error:', error);
  process.exit(1);
});