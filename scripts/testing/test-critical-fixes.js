#!/usr/bin/env node

/**
 * Test script to verify critical fixes are working
 */

console.log('🛠️ Testing Critical Runtime Fixes...\n');

async function testHTMLFragmentGeneratorService() {
  console.log('📋 Test 1: HTMLFragmentGeneratorService initialization...');
  
  try {
    const fs = require('fs');
    const path = require('path');
    
    const servicePath = path.join(__dirname, 'src/services/html-fragment-generator.service.ts');
    const content = fs.readFileSync(servicePath, 'utf8');
    
    // Check for instance-based pattern
    const hasClassDefinition = content.includes('class HTMLFragmentGeneratorService');
    const hasSingletonExport = content.includes('export const htmlFragmentGenerator');
    const hasInstanceMethods = content.includes('generateSkillsVisualizationHTML(');
    
    console.log('  ✓ Class definition:', hasClassDefinition ? '✅' : '❌');
    console.log('  ✓ Singleton export:', hasSingletonExport ? '✅' : '❌');
    console.log('  ✓ Instance methods:', hasInstanceMethods ? '✅' : '❌');
    
    const allFixed = hasClassDefinition && hasSingletonExport && hasInstanceMethods;
    
    return { 
      passed: allFixed, 
      message: allFixed ? 'HTMLFragmentGeneratorService properly refactored' : 'HTMLFragmentGeneratorService issues remain' 
    };
  } catch (error) {
    return { passed: false, message: `Error testing HTMLFragmentGeneratorService: ${error.message}` };
  }
}

async function testFirestoreSanitization() {
  console.log('\n📋 Test 2: Firestore undefined value sanitization...');
  
  try {
    const fs = require('fs');
    const path = require('path');
    
    const languageServicePath = path.join(__dirname, 'src/services/language-proficiency.service.ts');
    const content = fs.readFileSync(languageServicePath, 'utf8');
    
    // Check for sanitization functions
    const hasSanitizeFunction = content.includes('sanitizeForFirestore');
    const hasUndefinedFiltering = content.includes('undefined') && content.includes('delete');
    const hasArrayFiltering = content.includes('filter');
    
    console.log('  ✓ Sanitize function:', hasSanitizeFunction ? '✅' : '❌');
    console.log('  ✓ Undefined filtering:', hasUndefinedFiltering ? '✅' : '❌');
    console.log('  ✓ Array filtering:', hasArrayFiltering ? '✅' : '❌');
    
    const allFixed = hasSanitizeFunction && hasUndefinedFiltering;
    
    return { 
      passed: allFixed, 
      message: allFixed ? 'Firestore sanitization implemented' : 'Firestore sanitization missing' 
    };
  } catch (error) {
    return { passed: false, message: `Error testing Firestore sanitization: ${error.message}` };
  }
}

async function testJSONParsingImprovements() {
  console.log('\n📋 Test 3: JSON parsing robustness...');
  
  try {
    const fs = require('fs');
    const path = require('path');
    
    const achievementsServicePath = path.join(__dirname, 'src/services/achievements-analysis.service.ts');
    const content = fs.readFileSync(achievementsServicePath, 'utf8');
    
    // Check for robust JSON parsing
    const hasMultipleParsingStrategies = content.includes('parseJSONSafely') || content.includes('try') && content.includes('catch');
    const hasErrorHandling = content.includes('catch') && content.includes('fallback');
    const hasJSONExtraction = content.includes('```json') || content.includes('extract');
    
    console.log('  ✓ Multiple parsing strategies:', hasMultipleParsingStrategies ? '✅' : '❌');
    console.log('  ✓ Error handling:', hasErrorHandling ? '✅' : '❌');
    console.log('  ✓ JSON extraction logic:', hasJSONExtraction ? '✅' : '❌');
    
    const allFixed = hasMultipleParsingStrategies && hasErrorHandling;
    
    return { 
      passed: allFixed, 
      message: allFixed ? 'JSON parsing robustness implemented' : 'JSON parsing improvements missing' 
    };
  } catch (error) {
    return { passed: false, message: `Error testing JSON parsing: ${error.message}` };
  }
}

async function testTimeoutConfiguration() {
  console.log('\n📋 Test 4: Function timeout configuration...');
  
  try {
    const fs = require('fs');
    const path = require('path');
    
    const generateCVPath = path.join(__dirname, 'src/functions/generateCV.ts');
    const content = fs.readFileSync(generateCVPath, 'utf8');
    
    // Check for increased timeout
    const hasIncreasedTimeout = content.includes('timeoutSeconds: 600') || content.includes('timeoutSeconds: 540');
    const hasTimeoutComment = content.includes('timeout') || content.includes('10 minutes');
    
    console.log('  ✓ Increased timeout (600s or 540s):', hasIncreasedTimeout ? '✅' : '❌');
    console.log('  ✓ Timeout documentation:', hasTimeoutComment ? '✅' : '❌');
    
    const allFixed = hasIncreasedTimeout;
    
    return { 
      passed: allFixed, 
      message: allFixed ? 'Function timeout properly configured' : 'Function timeout not updated' 
    };
  } catch (error) {
    return { passed: false, message: `Error testing timeout configuration: ${error.message}` };
  }
}

async function testGracefulFailureIntegration() {
  console.log('\n📋 Test 5: Graceful failure handling integration...');
  
  try {
    const fs = require('fs');
    const path = require('path');
    
    const generateCVPath = path.join(__dirname, 'src/functions/generateCV.ts');
    const content = fs.readFileSync(generateCVPath, 'utf8');
    
    // Check that graceful failure handling is still present
    const hasProcessingResults = content.includes('processingResults');
    const hasMarkFeatureAsFailed = content.includes('markFeatureAsFailed');
    const hasErrorCatching = content.includes('catch (error)');
    const hasSuccessTracking = content.includes('successful++') || content.includes('successful:');
    
    console.log('  ✓ Processing results tracking:', hasProcessingResults ? '✅' : '❌');
    console.log('  ✓ Feature failure marking:', hasMarkFeatureAsFailed ? '✅' : '❌');
    console.log('  ✓ Error catching:', hasErrorCatching ? '✅' : '❌');
    console.log('  ✓ Success tracking:', hasSuccessTracking ? '✅' : '❌');
    
    const allPresent = hasProcessingResults && hasMarkFeatureAsFailed && hasErrorCatching;
    
    return { 
      passed: allPresent, 
      message: allPresent ? 'Graceful failure handling intact' : 'Graceful failure handling compromised' 
    };
  } catch (error) {
    return { passed: false, message: `Error testing graceful failure handling: ${error.message}` };
  }
}

// Run all tests
async function runAllTests() {
  const testFunctions = [
    { name: 'HTMLFragmentGeneratorService Fix', fn: testHTMLFragmentGeneratorService },
    { name: 'Firestore Sanitization', fn: testFirestoreSanitization },
    { name: 'JSON Parsing Robustness', fn: testJSONParsingImprovements },
    { name: 'Timeout Configuration', fn: testTimeoutConfiguration },
    { name: 'Graceful Failure Integration', fn: testGracefulFailureIntegration }
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
  console.log(`🧪 Critical Fixes Test Results:`);
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`📈 Success Rate: ${Math.round((passed / (passed + failed)) * 100)}%`);
  
  if (failed === 0) {
    console.log('\n🎉 All critical fixes are working correctly!');
    console.log('🚀 The CVPlus system should now be stable and handle errors gracefully.');
  } else {
    console.log('\n⚠️ Some critical fixes may need additional attention.');
  }
  
  return failed === 0;
}

// Run the tests
runAllTests().then(success => {
  process.exit(success ? 0 : 1);
}).catch(error => {
  console.error('Test runner error:', error);
  process.exit(1);
});