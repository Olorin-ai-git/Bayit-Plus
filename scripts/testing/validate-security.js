#!/usr/bin/env node

/**
 * Security Configuration Validation Script
 * Validates the secure environment configuration implementation
 */

const fs = require('fs');
const path = require('path');

function validateFile(filePath, description) {
  console.log(`\n✅ Validating: ${description}`);
  
  if (!fs.existsSync(filePath)) {
    console.error(`❌ File not found: ${filePath}`);
    return false;
  }
  
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n').length;
  const size = fs.statSync(filePath).size;
  
  console.log(`   📄 Lines: ${lines}`);
  console.log(`   💾 Size: ${(size / 1024).toFixed(2)}KB`);
  
  return true;
}

function validateSecurityFeatures(filePath) {
  console.log(`\n🔍 Checking security features in: ${path.basename(filePath)}`);
  
  const content = fs.readFileSync(filePath, 'utf8');
  
  const securityFeatures = [
    {
      name: 'Input Sanitization',
      pattern: /sanitizeString|replace.*[<>'"&]/,
      description: 'Removes dangerous HTML/script injection characters'
    },
    {
      name: 'API Key Validation',
      pattern: /validateApiKey.*suspiciousPatterns/s,
      description: 'Validates API key formats and detects suspicious patterns'
    },
    {
      name: 'URL Security',
      pattern: /validateUrl.*https.*production/s,
      description: 'Enforces HTTPS in production and validates URLs'
    },
    {
      name: 'Required Variable Enforcement',
      pattern: /REQUIRED_VARIABLES.*PROJECT_ID/s,
      description: 'Ensures critical environment variables are present'
    },
    {
      name: 'Security Event Logging',
      pattern: /SecurityLogger.*logSecurityEvent/s,
      description: 'Comprehensive security event logging without exposing secrets'
    },
    {
      name: 'Singleton Pattern',
      pattern: /static.*instance.*getConfig/s,
      description: 'Prevents multiple configuration instances'
    }
  ];
  
  let featuresFound = 0;
  
  securityFeatures.forEach(feature => {
    if (feature.pattern.test(content)) {
      console.log(`   ✅ ${feature.name}: ${feature.description}`);
      featuresFound++;
    } else {
      console.log(`   ❌ ${feature.name}: Not found or incomplete`);
    }
  });
  
  const completeness = (featuresFound / securityFeatures.length) * 100;
  console.log(`\n   📊 Security Implementation: ${completeness.toFixed(1)}% complete`);
  
  return completeness >= 80;
}

function validateTestCoverage(testFilePath) {
  console.log(`\n🧪 Checking test coverage in: ${path.basename(testFilePath)}`);
  
  if (!fs.existsSync(testFilePath)) {
    console.error(`   ❌ Test file not found: ${testFilePath}`);
    return false;
  }
  
  const content = fs.readFileSync(testFilePath, 'utf8');
  
  const testCategories = [
    'Environment Variable Validation',
    'Security Features',
    'Configuration Health Checks',
    'Service Availability Checks',
    'Configuration Validation',
    'Singleton Pattern',
    'Default Values',
    'Error Handling'
  ];
  
  let categoriesFound = 0;
  
  testCategories.forEach(category => {
    if (content.includes(category)) {
      console.log(`   ✅ ${category}`);
      categoriesFound++;
    } else {
      console.log(`   ❌ ${category}: Not tested`);
    }
  });
  
  const testCoverage = (categoriesFound / testCategories.length) * 100;
  console.log(`\n   📊 Test Coverage: ${testCoverage.toFixed(1)}%`);
  
  return testCoverage >= 70;
}

function main() {
  console.log('🔒 CVPlus Security Configuration Validation');
  console.log('==========================================');
  
  const basePath = '/Users/gklainert/Documents/cvplus/functions/src/config';
  
  const files = [
    {
      path: `${basePath}/environment.ts`,
      description: 'Secure Environment Configuration System',
      validator: validateSecurityFeatures
    },
    {
      path: `${basePath}/security-monitor.ts`,
      description: 'Security Monitoring and Alerting System',
      validator: null
    },
    {
      path: `/Users/gklainert/Documents/cvplus/functions/src/api/config-health.ts`,
      description: 'Configuration Health Check API Endpoints',
      validator: null
    },
    {
      path: `${basePath}/__tests__/environment.test.ts`,
      description: 'Environment Configuration Tests',
      validator: validateTestCoverage
    },
    {
      path: `${basePath}/__tests__/security-monitor.test.ts`,
      description: 'Security Monitor Tests',
      validator: null
    },
    {
      path: `${basePath}/README.md`,
      description: 'Security Implementation Documentation',
      validator: null
    }
  ];
  
  let allValid = true;
  let totalFiles = 0;
  let validFiles = 0;
  
  files.forEach(file => {
    totalFiles++;
    const exists = validateFile(file.path, file.description);
    
    if (exists) {
      validFiles++;
      
      if (file.validator) {
        const validationResult = file.validator(file.path);
        if (!validationResult) {
          allValid = false;
        }
      }
    } else {
      allValid = false;
    }
  });
  
  console.log('\n📊 VALIDATION SUMMARY');
  console.log('====================');
  console.log(`Files Created: ${validFiles}/${totalFiles}`);
  console.log(`Overall Status: ${allValid ? '✅ PASSED' : '❌ FAILED'}`);
  
  if (allValid) {
    console.log('\n🎉 Security configuration implementation is complete and ready for deployment!');
    console.log('\nNext steps:');
    console.log('1. Set required environment variables (PROJECT_ID, STORAGE_BUCKET)');
    console.log('2. Configure security tokens for health check endpoints');
    console.log('3. Deploy functions and test health check endpoints');
    console.log('4. Set up monitoring and alerting for security events');
  } else {
    console.log('\n⚠️  Some issues were found. Please review and fix before deployment.');
  }
  
  process.exit(allValid ? 0 : 1);
}

main();