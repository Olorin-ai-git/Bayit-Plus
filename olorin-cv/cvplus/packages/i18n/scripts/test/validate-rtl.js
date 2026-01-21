#!/usr/bin/env node

/**
 * RTL Validation Script
 * 
 * Validates RTL (Right-to-Left) language support by:
 * - Checking RTL-specific translations
 * - Validating CSS classes for RTL layouts
 * - Testing component adaptation for RTL languages
 * - Generating RTL validation report
 */

const fs = require('fs');
const path = require('path');

const RTL_LANGUAGES = ['ar', 'he', 'fa', 'ur'];
const LOCALES_DIR = path.join(__dirname, '../../locales');
const SRC_DIR = path.join(__dirname, '../../src');
const COMPONENTS_DIR = path.join(SRC_DIR, 'components');

async function validateRTL() {
  console.log('🔍 Validating RTL language support...');

  const results = {
    rtlLanguages: RTL_LANGUAGES,
    validationTime: new Date().toISOString(),
    translations: {},
    components: {},
    issues: [],
    summary: {
      totalIssues: 0,
      criticalIssues: 0,
      rtlReady: false
    }
  };

  // Validate RTL translations
  console.log('📝 Checking RTL translations...');
  for (const locale of RTL_LANGUAGES) {
    const localeResults = await validateRTLTranslations(locale);
    results.translations[locale] = localeResults;
    
    if (localeResults.issues.length > 0) {
      results.issues.push(...localeResults.issues);
    }
  }

  // Validate RTL components
  console.log('🔧 Checking RTL component support...');
  const componentResults = await validateRTLComponents();
  results.components = componentResults;
  
  if (componentResults.issues.length > 0) {
    results.issues.push(...componentResults.issues);
  }

  // Calculate summary
  results.summary.totalIssues = results.issues.length;
  results.summary.criticalIssues = results.issues.filter(issue => issue.severity === 'critical').length;
  results.summary.rtlReady = results.summary.criticalIssues === 0;

  // Generate report
  const reportPath = path.join(__dirname, '../../docs/rtl-validation-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(results, null, 2));

  // Console output
  console.log('\n📊 RTL Validation Results:');
  console.log(`✅ RTL Languages: ${RTL_LANGUAGES.join(', ')}`);
  console.log(`⚠️  Total Issues: ${results.summary.totalIssues}`);
  console.log(`❌ Critical Issues: ${results.summary.criticalIssues}`);
  console.log(`🎯 RTL Ready: ${results.summary.rtlReady ? 'YES' : 'NO'}`);

  if (results.issues.length > 0) {
    console.log('\n🚨 Issues found:');
    results.issues.forEach((issue, index) => {
      console.log(`${index + 1}. [${issue.severity.toUpperCase()}] ${issue.message}`);
      console.log(`   Location: ${issue.location}`);
      if (issue.suggestion) {
        console.log(`   Suggestion: ${issue.suggestion}`);
      }
      console.log('');
    });
  }

  console.log(`📄 Full report: ${reportPath}`);
  return results.summary.rtlReady;
}

async function validateRTLTranslations(locale) {
  const results = {
    locale,
    exists: false,
    complete: false,
    rtlSpecificKeys: [],
    issues: []
  };

  const localePath = path.join(LOCALES_DIR, locale);
  
  if (!fs.existsSync(localePath)) {
    results.issues.push({
      severity: 'critical',
      message: `RTL locale directory missing: ${locale}`,
      location: localePath,
      suggestion: `Create locale directory and translation files for ${locale}`
    });
    return results;
  }

  results.exists = true;

  // Check for RTL-specific translation keys
  const rtlKeys = [
    'rtl.direction',
    'rtl.alignment',
    'common.readMore',
    'forms.required'
  ];

  const translationFiles = fs.readdirSync(localePath)
    .filter(file => file.endsWith('.json'));

  let foundKeys = 0;
  for (const file of translationFiles) {
    const filePath = path.join(localePath, file);
    const translations = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    
    for (const key of rtlKeys) {
      if (hasNestedKey(translations, key)) {
        results.rtlSpecificKeys.push(key);
        foundKeys++;
      }
    }
  }

  results.complete = foundKeys >= rtlKeys.length * 0.8; // 80% threshold

  if (!results.complete) {
    results.issues.push({
      severity: 'warning',
      message: `Incomplete RTL translations for ${locale}`,
      location: localePath,
      suggestion: 'Add missing RTL-specific translation keys'
    });
  }

  return results;
}

async function validateRTLComponents() {
  const results = {
    rtlSupportFound: false,
    rtlComponents: [],
    issues: []
  };

  if (!fs.existsSync(COMPONENTS_DIR)) {
    results.issues.push({
      severity: 'critical',
      message: 'Components directory not found',
      location: COMPONENTS_DIR,
      suggestion: 'Ensure components directory exists'
    });
    return results;
  }

  const componentFiles = fs.readdirSync(COMPONENTS_DIR, { recursive: true })
    .filter(file => file.endsWith('.tsx') || file.endsWith('.ts'));

  for (const file of componentFiles) {
    const filePath = path.join(COMPONENTS_DIR, file);
    const content = fs.readFileSync(filePath, 'utf8');

    // Check for RTL support patterns
    const rtlPatterns = [
      /rtl/i,
      /direction.*rtl/i,
      /text-align.*right/i,
      /margin-right/i,
      /padding-right/i,
      /dir=.*rtl/i
    ];

    const hasRTLSupport = rtlPatterns.some(pattern => pattern.test(content));
    
    if (hasRTLSupport) {
      results.rtlComponents.push(file);
      results.rtlSupportFound = true;
    }
  }

  if (!results.rtlSupportFound) {
    results.issues.push({
      severity: 'warning',
      message: 'No RTL support found in components',
      location: COMPONENTS_DIR,
      suggestion: 'Add RTL support to React components using direction-aware styles'
    });
  }

  return results;
}

function hasNestedKey(obj, key) {
  const keys = key.split('.');
  let current = obj;
  
  for (const k of keys) {
    if (current && typeof current === 'object' && k in current) {
      current = current[k];
    } else {
      return false;
    }
  }
  
  return true;
}

// Run if called directly
if (require.main === module) {
  validateRTL()
    .then(isRTLReady => {
      if (!isRTLReady) {
        console.error('❌ RTL validation failed');
        process.exit(1);
      }
      console.log('✅ RTL validation passed');
    })
    .catch(error => {
      console.error('❌ RTL validation error:', error);
      process.exit(1);
    });
}

module.exports = { validateRTL };