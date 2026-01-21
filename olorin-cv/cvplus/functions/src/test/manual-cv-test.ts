#!/usr/bin/env ts-node

/**
 * Manual CV Processing Test
 * Direct test execution without Jest for quick validation
  */

import * as dotenv from 'dotenv';
import * as path from 'path';
import { CVProcessingTestRunner } from './test-runner';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

async function runManualTest() {
  console.log('🔧 CVPlus Manual CV Processing Test');
  console.log('==================================\n');

  // Check environment
  const anthropicApiKey = process.env.ANTHROPIC_API_KEY;
  const openaiApiKey = process.env.OPENAI_API_KEY;

  console.log('Environment Check:');
  console.log(`Anthropic API Key: ${anthropicApiKey ? '✅ Set' : '❌ Missing'}`);
  console.log(`OpenAI API Key: ${openaiApiKey ? '✅ Set' : '⚠️ Missing (fallback will be used)'}`);
  console.log();

  if (!anthropicApiKey) {
    console.error('❌ ANTHROPIC_API_KEY is required for CV parsing');
    console.log('Please set the ANTHROPIC_API_KEY environment variable and try again.');
    process.exit(1);
  }

  try {
    const runner = new CVProcessingTestRunner(anthropicApiKey);
    const results = await runner.runAllTests();

    // Exit with appropriate code
    const failedCount = results.filter(r => r.status === 'FAIL').length;
    process.exit(failedCount > 0 ? 1 : 0);
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : '';
    console.error('💥 Test execution failed:', errorMessage);
    console.error(errorStack);
    process.exit(1);
  }
}

// Execute the test
runManualTest().catch(error => {
  console.error('💥 Unexpected error:', error);
  process.exit(1);
});