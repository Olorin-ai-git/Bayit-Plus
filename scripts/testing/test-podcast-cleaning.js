#!/usr/bin/env node

/**
 * Test script for podcast text cleaning functionality
 * Verifies that stage directions and emotional cues are properly removed
 */

// Test cases for text cleaning
const testCases = [
  {
    name: "Parentheses stage directions",
    input: "That's amazing! (laughs) I can't believe how impressive that is.",
    expected: "That's amazing! I can't believe how impressive that is."
  },
  {
    name: "Square bracket stage directions",
    input: "Well, [chuckles] that's quite the career journey you've had there.",
    expected: "Well, that's quite the career journey you've had there."
  },
  {
    name: "Asterisk stage directions",
    input: "Wow! *gasps* That's absolutely incredible work.",
    expected: "Wow! That's absolutely incredible work."
  },
  {
    name: "Standalone emotion words",
    input: "That's fascinating laughs and really impressive giggles work.",
    expected: "That's fascinating and really impressive work."
  },
  {
    name: "Multiple stage directions",
    input: "So (pause) you started your career [thoughtfully] and then *chuckles* moved into tech?",
    expected: "So you started your career and then moved into tech?"
  },
  {
    name: "Clean text with no stage directions",
    input: "That's absolutely incredible! I'm genuinely impressed by that achievement.",
    expected: "That's absolutely incredible! I'm genuinely impressed by that achievement."
  },
  {
    name: "Complex mixed stage directions",
    input: "Well, [excited] that's just *laughs* amazing! (pause) Tell us more about that.",
    expected: "Well, that's just amazing! Tell us more about that."
  }
];

// Text cleaning function (copied from the service)
function cleanScriptText(text) {
  // Remove common stage directions and emotional cues
  let cleanText = text
    // Remove content in parentheses (laughs), (chuckles), (pause), etc.
    .replace(/\([^)]*\)/g, '')
    // Remove content in square brackets [laughs], [chuckle], [pause], etc.
    .replace(/\[[^\]]*\]/g, '')
    // Remove content in asterisks *laughs*, *chuckles*, *pauses*, etc.
    .replace(/\*[^*]*\*/g, '')
    // Remove common stage direction words when they appear as standalone elements
    .replace(/\b(laughs?|chuckles?|giggles?|pauses?|sighs?|gasps?)\b/gi, '')
    // Remove multiple spaces and clean up
    .replace(/\s+/g, ' ')
    .trim();
  
  // Remove leading/trailing punctuation that might be left over
  cleanText = cleanText.replace(/^[,\s]+|[,\s]+$/g, '');
  
  return cleanText;
}

// Run tests
console.log('🎙️  Testing Podcast Text Cleaning Functionality\n');

let passedTests = 0;
let totalTests = testCases.length;

testCases.forEach((testCase, index) => {
  const result = cleanScriptText(testCase.input);
  const passed = result === testCase.expected;
  
  console.log(`Test ${index + 1}: ${testCase.name}`);
  console.log(`Input:    "${testCase.input}"`);
  console.log(`Expected: "${testCase.expected}"`);
  console.log(`Result:   "${result}"`);
  console.log(`Status:   ${passed ? '✅ PASS' : '❌ FAIL'}\n`);
  
  if (passed) {
    passedTests++;
  }
});

console.log(`\n📊 Test Results: ${passedTests}/${totalTests} tests passed`);

if (passedTests === totalTests) {
  console.log('🎉 All tests passed! Podcast text cleaning is working correctly.');
} else {
  console.log('⚠️  Some tests failed. Please review the cleaning logic.');
  process.exit(1);
}