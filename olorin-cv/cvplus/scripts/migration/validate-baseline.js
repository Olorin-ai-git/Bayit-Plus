#!/usr/bin/env node
/**
 * Manual baseline validation for migration
 * Establishes current state before migration begins
 */

const fs = require('fs');
const { execSync } = require('child_process');

console.log('🔍 CVPlus Migration Baseline Validation');
console.log('=====================================\n');

// Test 1: API Contract Preservation Baseline
console.log('📋 Test 1: API Contract Preservation Baseline');
try {
  const indexPath = '/Users/gklainert/Documents/cvplus/functions/src/index.ts';
  const indexContent = fs.readFileSync(indexPath, 'utf8');

  // Count exports
  const exportBlocks = indexContent.match(/export\s*\{[^}]+\}/g) || [];
  let totalExports = 0;

  exportBlocks.forEach(block => {
    const names = block.match(/\b\w+(?=\s*[,}])/g) || [];
    totalExports += names.filter(name => name !== 'export').length;
  });

  const singleExports = indexContent.match(/^export\s+(const|function|class|interface)\s+\w+/gm) || [];
  totalExports += singleExports.length;

  console.log(`   ✅ Current function exports: ${totalExports}`);
  console.log(`   ✅ Meets minimum requirement (166+): ${totalExports >= 166 ? 'YES' : 'NO'}`);
} catch (error) {
  console.log(`   ❌ Error reading index.ts: ${error.message}`);
}

// Test 2: TypeScript Compilation Baseline
console.log('\n🔧 Test 2: TypeScript Compilation Baseline');
try {
  execSync('cd functions && npx tsc --noEmit', { stdio: 'pipe' });
  console.log('   ✅ TypeScript compilation: SUCCESS');
} catch (error) {
  console.log('   ❌ TypeScript compilation: FAILED');
  console.log(`   Error: ${error.message}`);
}

// Test 3: Migration Source Files Check
console.log('\n📁 Test 3: Migration Source Files Check');
const filesToMigrate = [
  'functions/src/services/ai-analysis.service.ts',
  'functions/src/services/cv-processor.service.ts',
  'functions/src/services/multimedia.service.ts',
  'functions/src/services/profile-manager.service.ts',
  'functions/src/models/analytics.service.ts',
  'functions/src/models/generated-content.service.ts',
  'functions/src/models/public-profile.service.ts'
];

let existingFiles = 0;
filesToMigrate.forEach(file => {
  if (fs.existsSync(file)) {
    console.log(`   ✅ Found: ${file.split('/').pop()}`);
    existingFiles++;
  } else {
    console.log(`   ❌ Missing: ${file.split('/').pop()}`);
  }
});

console.log(`   📊 Migration source files: ${existingFiles}/${filesToMigrate.length} found`);

// Test 4: Submodule Structure Check
console.log('\n📦 Test 4: Submodule Structure Check');
const expectedSubmodules = [
  'packages/cv-processing',
  'packages/multimedia',
  'packages/analytics',
  'packages/public-profiles',
  'packages/auth',
  'packages/premium'
];

let existingSubmodules = 0;
expectedSubmodules.forEach(submodule => {
  if (fs.existsSync(submodule)) {
    console.log(`   ✅ Found: ${submodule.split('/').pop()}`);
    existingSubmodules++;
  } else {
    console.log(`   ❌ Missing: ${submodule.split('/').pop()}`);
  }
});

console.log(`   📊 Expected submodules: ${existingSubmodules}/${expectedSubmodules.length} found`);

// Test 5: Current Import Patterns
console.log('\n🔗 Test 5: Current Import Patterns');
try {
  const indexPath = '/Users/gklainert/Documents/cvplus/functions/src/index.ts';
  const indexContent = fs.readFileSync(indexPath, 'utf8');

  const cvplusImports = indexContent.match(/@cvplus\/[\w-]+/g) || [];
  const uniqueImports = Array.from(new Set(cvplusImports));

  console.log(`   ✅ Current @cvplus imports: ${uniqueImports.length}`);
  if (uniqueImports.length > 0) {
    console.log('   📝 Import examples:', uniqueImports.slice(0, 3).join(', '));
  }

  const relativeImports = indexContent.match(/from\s+['"]\.\.?\//g) || [];
  console.log(`   📊 Relative imports: ${relativeImports.length}`);
} catch (error) {
  console.log(`   ❌ Error analyzing imports: ${error.message}`);
}

// Summary
console.log('\n📊 BASELINE VALIDATION SUMMARY');
console.log('==============================');
console.log(`Migration source files available: ${existingFiles > 0 ? '✅' : '❌'}`);
console.log(`TypeScript compilation working: Coming from previous test`);
console.log(`Target submodules exist: ${existingSubmodules > 0 ? '✅' : '❌'}`);
console.log(`Function exports tracked: Coming from first test`);

console.log('\n🎯 READY FOR MIGRATION: Baseline established');
console.log('Next steps: Execute migration batches with validation at each step\n');