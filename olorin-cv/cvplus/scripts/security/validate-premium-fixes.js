#!/usr/bin/env node

/**
 * Premium Security Fixes Validation Script
 * 
 * Validates that all critical security fixes are properly implemented
 * 
 * @author Gil Klainert
 * @version 1.0.0
 * @security CRITICAL - Validates security fix implementations
 */

const fs = require('fs');
const path = require('path');

// Colors for terminal output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

// Log functions
const log = {
  success: (msg) => console.log(`${colors.green}✅ ${msg}${colors.reset}`),
  error: (msg) => console.log(`${colors.red}❌ ${msg}${colors.reset}`),
  warning: (msg) => console.log(`${colors.yellow}⚠️  ${msg}${colors.reset}`),
  info: (msg) => console.log(`${colors.blue}ℹ️  ${msg}${colors.reset}`),
  header: (msg) => console.log(`${colors.bold}${colors.blue}\n=== ${msg} ===${colors.reset}`)
};

// Project root path
const PROJECT_ROOT = path.resolve(__dirname, '../..');

// File paths to validate
const CRITICAL_FILES = {
  masterTypes: path.join(PROJECT_ROOT, 'packages/premium/src/types/premium-features.ts'),
  firestoreRules: path.join(PROJECT_ROOT, 'firestore.rules'),
  premiumProvider: path.join(PROJECT_ROOT, 'frontend/src/providers/PremiumProvider.tsx'),
  securityMonitor: path.join(PROJECT_ROOT, 'packages/premium/src/services/premium-security-monitor.ts'),
  checkFeatureAccess: path.join(PROJECT_ROOT, 'functions/src/functions/payments/checkFeatureAccess.ts')
};

// Validation results
let validationResults = {
  passed: 0,
  failed: 0,
  warnings: 0,
  issues: []
};

/**
 * Main validation function
 */
async function validateSecurityFixes() {
  log.header('Premium Security Fixes Validation');
  
  console.log(`${colors.bold}Validating critical security fixes for premium features...${colors.reset}\n`);
  
  // Run all validations
  await validateMasterTypeSystem();
  await validateFirebaseRulesHardening();
  await validateErrorStateHandling();
  await validateSecurityMonitoring();
  await validateTypeConsistency();
  
  // Print summary
  printValidationSummary();
  
  // Exit with appropriate code
  process.exit(validationResults.failed > 0 ? 1 : 0);
}

/**
 * Validate master premium feature type system
 */
async function validateMasterTypeSystem() {
  log.header('1. Master Premium Feature Type System');
  
  try {
    // Check if master types file exists
    if (!fs.existsSync(CRITICAL_FILES.masterTypes)) {
      recordFailure('Master premium features types file not found');
      return;
    }
    
    const masterTypesContent = fs.readFileSync(CRITICAL_FILES.masterTypes, 'utf8');
    
    // Check for required exports (flexible pattern matching)
    const requiredExports = [
      'PremiumFeature',
      'PREMIUM_FEATURE_SECURITY_CONFIG',
      'isValidPremiumFeature',
      'getFeatureSecurityConfig',
      'requiresSubscription',
      'getMinimumTier'
    ];
    
    const missingExports = requiredExports.filter(exp => 
      !masterTypesContent.includes(exp)
    );
    
    if (missingExports.length > 0) {
      recordFailure(`Missing required exports: ${missingExports.join(', ')}`);
    } else {
      recordSuccess('Master types exports are properly defined');
    }
    
    // Check for security configuration structure
    if (masterTypesContent.includes('PREMIUM_FEATURE_SECURITY_CONFIG') &&
        masterTypesContent.includes('requiresSubscription') &&
        masterTypesContent.includes('minimumTier') &&
        masterTypesContent.includes('riskLevel')) {
      recordSuccess('Security configuration structure is complete');
    } else {
      recordFailure('Security configuration structure is incomplete');
    }
    
    // Check for single source of truth comment
    if (masterTypesContent.includes('SINGLE SOURCE OF TRUTH')) {
      recordSuccess('Master types file marked as single source of truth');
    } else {
      recordWarning('Master types file should be clearly marked as single source of truth');
    }
    
  } catch (error) {
    recordFailure(`Failed to validate master type system: ${error.message}`);
  }
}

/**
 * Validate Firebase Rules hardening
 */
async function validateFirebaseRulesHardening() {
  log.header('2. Firebase Rules Security Hardening');
  
  try {
    if (!fs.existsSync(CRITICAL_FILES.firestoreRules)) {
      recordFailure('Firebase rules file not found');
      return;
    }
    
    const rulesContent = fs.readFileSync(CRITICAL_FILES.firestoreRules, 'utf8');
    
    // Check for secure isPremiumUser function
    if (rulesContent.includes('function isPremiumUser()') &&
        rulesContent.includes('exists(/databases/$(database)/documents/userSubscriptions/$(request.auth.uid))') &&
        rulesContent.includes('premium_active') &&
        rulesContent.includes('lifetimeAccess == true')) {
      recordSuccess('isPremiumUser function properly validates subscriptions');
    } else {
      recordFailure('isPremiumUser function does not properly validate subscriptions');
    }
    
    // Check for subscription integrity validation
    if (rulesContent.includes('hasValidPremiumSubscription()') &&
        rulesContent.includes('subscription.userId == request.auth.uid')) {
      recordSuccess('Subscription integrity validation is implemented');
    } else {
      recordFailure('Missing subscription integrity validation');
    }
    
    // Check for feature-specific access validation
    if (rulesContent.includes('hasFeatureAccess(feature)') &&
        rulesContent.includes('validUntil')) {
      recordSuccess('Feature-specific access validation is implemented');
    } else {
      recordWarning('Feature-specific access validation may be incomplete');
    }
    
    // Check for security audit logging rules
    if (rulesContent.includes('premiumAccessAudit') &&
        rulesContent.includes('suspiciousActivity') &&
        rulesContent.includes('premiumViolations')) {
      recordSuccess('Security audit logging rules are implemented');
    } else {
      recordWarning('Security audit logging rules may be incomplete');
    }
    
    // Check that the old broken logic is not present
    if (rulesContent.includes('return isAuthenticated();') && 
        rulesContent.includes('function isPremiumUser()')) {
      recordFailure('CRITICAL: Old broken premium validation logic still present');
    } else {
      recordSuccess('Old broken premium validation logic has been removed');
    }
    
  } catch (error) {
    recordFailure(`Failed to validate Firebase rules: ${error.message}`);
  }
}

/**
 * Validate error state handling security
 */
async function validateErrorStateHandling() {
  log.header('3. Error State Handling Security');
  
  try {
    if (!fs.existsSync(CRITICAL_FILES.premiumProvider)) {
      recordFailure('Premium provider file not found');
      return;
    }
    
    const providerContent = fs.readFileSync(CRITICAL_FILES.premiumProvider, 'utf8');
    
    // Check for secure error state handling
    if (providerContent.includes('subscriptionError && !subscriptionStatus.isPremium') &&
        providerContent.includes('hasAccess: false') &&
        providerContent.includes('denialReason: \'subscription_check_failed\'')) {
      recordSuccess('Secure error state handling is implemented');
    } else {
      recordFailure('Secure error state handling is not properly implemented');
    }
    
    // Check for secure loading state handling
    if (providerContent.includes('isLoadingSubscription') &&
        providerContent.includes('deny access to premium features as secure default')) {
      recordSuccess('Secure loading state handling is implemented');
    } else {
      recordWarning('Secure loading state handling may be incomplete');
    }
    
    // Check for secure error context
    if (providerContent.includes('secureErrorContext') &&
        providerContent.includes('acc[key as PremiumFeature] = false')) {
      recordSuccess('Secure error context denies all premium features');
    } else {
      recordFailure('Secure error context is not properly implemented');
    }
    
    // Check for proper error UI messaging
    if (providerContent.includes('temporarily unavailable for security reasons')) {
      recordSuccess('Error UI properly communicates security concerns');
    } else {
      recordWarning('Error UI should communicate security concerns');
    }
    
  } catch (error) {
    recordFailure(`Failed to validate error state handling: ${error.message}`);
  }
}

/**
 * Validate security monitoring implementation
 */
async function validateSecurityMonitoring() {
  log.header('4. Security Monitoring Implementation');
  
  try {
    if (!fs.existsSync(CRITICAL_FILES.securityMonitor)) {
      recordFailure('Security monitoring service not found');
      return;
    }
    
    const monitorContent = fs.readFileSync(CRITICAL_FILES.securityMonitor, 'utf8');
    
    // Check for core monitoring functions
    const requiredFunctions = [
      'logAccessAttempt',
      'checkSuspiciousActivity',
      'logSuspiciousActivity',
      'createSecurityViolation',
      'checkRateLimit'
    ];
    
    const missingFunctions = requiredFunctions.filter(func => 
      !monitorContent.includes(func)
    );
    
    if (missingFunctions.length === 0) {
      recordSuccess('All required security monitoring functions are implemented');
    } else {
      recordFailure(`Missing security monitoring functions: ${missingFunctions.join(', ')}`);
    }
    
    // Check for security event types
    if (monitorContent.includes('PremiumAccessAttempt') &&
        monitorContent.includes('SuspiciousActivity') &&
        monitorContent.includes('PremiumSecurityViolation')) {
      recordSuccess('Security event types are properly defined');
    } else {
      recordFailure('Security event types are not properly defined');
    }
    
    // Check for rate limiting
    if (monitorContent.includes('RateLimitStatus') &&
        monitorContent.includes('maxUsagePerHour') &&
        monitorContent.includes('maxUsagePerDay')) {
      recordSuccess('Rate limiting functionality is implemented');
    } else {
      recordWarning('Rate limiting functionality may be incomplete');
    }
    
  } catch (error) {
    recordFailure(`Failed to validate security monitoring: ${error.message}`);
  }
}

/**
 * Validate type consistency across modules
 */
async function validateTypeConsistency() {
  log.header('5. Type Consistency Across Modules');
  
  try {
    // Check that functions file uses master types
    if (fs.existsSync(CRITICAL_FILES.checkFeatureAccess)) {
      const functionsContent = fs.readFileSync(CRITICAL_FILES.checkFeatureAccess, 'utf8');
      
      if (functionsContent.includes('@cvplus/premium/types/premium-features') &&
          functionsContent.includes('isValidPremiumFeature')) {
        recordSuccess('Backend functions use master premium types');
      } else {
        recordWarning('Backend functions may not be using master premium types');
      }
    }
    
    // Check frontend types
    const frontendTypesFile = path.join(PROJECT_ROOT, 'frontend/src/types/premium.ts');
    if (fs.existsSync(frontendTypesFile)) {
      const frontendTypesContent = fs.readFileSync(frontendTypesFile, 'utf8');
      
      if (frontendTypesContent.includes('@cvplus/premium/types/premium-features') ||
          frontendTypesContent.includes('IMPORTED FROM MASTER DEFINITION')) {
        recordSuccess('Frontend types reference master definition');
      } else {
        recordWarning('Frontend types should reference master definition');
      }
    }
    
    // Check package index file
    const packageIndexFile = path.join(PROJECT_ROOT, 'packages/premium/src/types/index.ts');
    if (fs.existsSync(packageIndexFile)) {
      const packageIndexContent = fs.readFileSync(packageIndexFile, 'utf8');
      
      if (packageIndexContent.includes('./premium-features') &&
          packageIndexContent.includes('export type { PremiumFeature }')) {
        recordSuccess('Package index properly exports master types');
      } else {
        recordWarning('Package index should properly export master types');
      }
    }
    
  } catch (error) {
    recordFailure(`Failed to validate type consistency: ${error.message}`);
  }
}

/**
 * Record a validation success
 */
function recordSuccess(message) {
  log.success(message);
  validationResults.passed++;
}

/**
 * Record a validation failure
 */
function recordFailure(message) {
  log.error(message);
  validationResults.failed++;
  validationResults.issues.push(message);
}

/**
 * Record a validation warning
 */
function recordWarning(message) {
  log.warning(message);
  validationResults.warnings++;
}

/**
 * Print validation summary
 */
function printValidationSummary() {
  log.header('Validation Summary');
  
  console.log(`${colors.green}✅ Passed: ${validationResults.passed}${colors.reset}`);
  console.log(`${colors.red}❌ Failed: ${validationResults.failed}${colors.reset}`);
  console.log(`${colors.yellow}⚠️  Warnings: ${validationResults.warnings}${colors.reset}\n`);
  
  if (validationResults.failed > 0) {
    console.log(`${colors.red}${colors.bold}CRITICAL ISSUES TO FIX:${colors.reset}`);
    validationResults.issues.forEach(issue => {
      console.log(`${colors.red}  • ${issue}${colors.reset}`);
    });
    console.log();
  }
  
  if (validationResults.failed === 0) {
    console.log(`${colors.green}${colors.bold}🎉 ALL CRITICAL SECURITY FIXES VALIDATED SUCCESSFULLY!${colors.reset}\n`);
    console.log(`${colors.green}The premium module security vulnerabilities have been properly addressed.${colors.reset}\n`);
  } else {
    console.log(`${colors.red}${colors.bold}🚨 SECURITY VALIDATION FAILED!${colors.reset}\n`);
    console.log(`${colors.red}Critical security issues must be fixed before deployment.${colors.reset}\n`);
  }
}

// Run validation if called directly
if (require.main === module) {
  validateSecurityFixes().catch(error => {
    console.error(`${colors.red}Validation script failed: ${error.message}${colors.reset}`);
    process.exit(1);
  });
}

module.exports = {
  validateSecurityFixes,
  validationResults
};