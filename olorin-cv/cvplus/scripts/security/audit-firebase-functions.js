#!/usr/bin/env node

/**
 * Firebase Functions Authentication Audit Script
 * Author: Gil Klainert
 * Date: 2025-08-22
 * 
 * This script audits all Firebase Functions to ensure proper authentication
 */

const fs = require('fs');
const path = require('path');
const glob = require('glob');

// ANSI color codes
const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
};

// Function categories
const FUNCTION_CATEGORIES = {
  PUBLIC: [
    'healthCheck',
    'getPublicProfile',
    'getPublicCV',
    'submitContactForm'
  ],
  AUTHENTICATED: [
    'processCV',
    'generateCV',
    'generateTimeline',
    'getRecommendations',
    'applyImprovements',
    'generatePodcast',
    'generateVideo',
    'updateProfile',
    'deleteCV',
    'exportCV'
  ],
  PREMIUM: [
    'generatePortal',
    'generateAdvancedVideo',
    'generateCustomPodcast',
    'getAnalytics'
  ],
  ADMIN: [
    'adminGetUsers',
    'adminUpdateFeatures',
    'adminGetMetrics'
  ]
};

class FunctionAuditor {
  constructor() {
    this.results = {
      total: 0,
      authenticated: 0,
      unauthenticated: 0,
      missing: [],
      issues: [],
      recommendations: []
    };
  }

  /**
   * Scan all function files
   */
  async scanFunctions() {
    console.log(`${colors.blue}🔍 Scanning Firebase Functions...${colors.reset}\n`);
    
    const functionsDir = path.join(__dirname, '../../functions/src/functions');
    const pattern = path.join(functionsDir, '**/*.ts');
    
    return new Promise((resolve, reject) => {
      glob(pattern, (err, files) => {
        if (err) return reject(err);
        
        console.log(`Found ${files.length} function files\n`);
        resolve(files);
      });
    });
  }

  /**
   * Analyze a single function file
   */
  analyzeFunction(filePath) {
    const content = fs.readFileSync(filePath, 'utf8');
    const fileName = path.basename(filePath, '.ts');
    
    this.results.total++;
    
    // Check for auth middleware usage
    const hasAuthGuard = content.includes('authGuard') || content.includes('requireAuth');
    const hasPremiumGuard = content.includes('premiumGuard') || content.includes('requirePremium');
    const hasAdminGuard = content.includes('adminGuard') || content.includes('requireAdmin');
    
    // Check for direct auth verification
    const hasDirectAuth = content.includes('context.auth') || content.includes('verifyIdToken');
    
    // Check for exports.functions declaration
    const hasExport = content.includes('exports.') || content.includes('export const');
    
    if (!hasExport) {
      return; // Skip non-exported files
    }
    
    // Determine authentication status
    let authStatus = 'NONE';
    let authMethod = '';
    
    if (hasAuthGuard) {
      authStatus = 'AUTHENTICATED';
      authMethod = 'authGuard middleware';
      this.results.authenticated++;
    } else if (hasPremiumGuard) {
      authStatus = 'PREMIUM';
      authMethod = 'premiumGuard middleware';
      this.results.authenticated++;
    } else if (hasAdminGuard) {
      authStatus = 'ADMIN';
      authMethod = 'adminGuard middleware';
      this.results.authenticated++;
    } else if (hasDirectAuth) {
      authStatus = 'DIRECT';
      authMethod = 'Direct auth verification';
      this.results.authenticated++;
    } else {
      authStatus = 'NONE';
      this.results.unauthenticated++;
      
      // Check if this function should be authenticated
      const shouldBeAuth = this.shouldBeAuthenticated(fileName);
      if (shouldBeAuth) {
        this.results.missing.push({
          file: fileName,
          path: filePath,
          category: shouldBeAuth
        });
      }
    }
    
    // Analyze for security issues
    this.checkSecurityIssues(fileName, content);
    
    return {
      file: fileName,
      path: filePath,
      authStatus,
      authMethod
    };
  }

  /**
   * Check if a function should be authenticated based on its name
   */
  shouldBeAuthenticated(functionName) {
    // Check if it's in authenticated category
    if (FUNCTION_CATEGORIES.AUTHENTICATED.some(fn => 
      functionName.toLowerCase().includes(fn.toLowerCase()))) {
      return 'AUTHENTICATED';
    }
    
    // Check if it's in premium category
    if (FUNCTION_CATEGORIES.PREMIUM.some(fn => 
      functionName.toLowerCase().includes(fn.toLowerCase()))) {
      return 'PREMIUM';
    }
    
    // Check if it's in admin category
    if (FUNCTION_CATEGORIES.ADMIN.some(fn => 
      functionName.toLowerCase().includes(fn.toLowerCase()))) {
      return 'ADMIN';
    }
    
    // Check for common patterns that suggest authentication needed
    const authPatterns = ['update', 'delete', 'create', 'modify', 'save', 'remove'];
    if (authPatterns.some(pattern => functionName.toLowerCase().includes(pattern))) {
      return 'AUTHENTICATED';
    }
    
    return null;
  }

  /**
   * Check for common security issues
   */
  checkSecurityIssues(fileName, content) {
    const issues = [];
    
    // Check for hardcoded secrets
    if (content.match(/['"]sk_[a-zA-Z0-9]{24,}['"]/)) {
      issues.push('Possible hardcoded Stripe secret key');
    }
    
    if (content.match(/['"]AIza[a-zA-Z0-9]{35}['"]/)) {
      issues.push('Possible hardcoded API key');
    }
    
    // Check for SQL injection vulnerabilities
    if (content.includes('query(') && !content.includes('parameterized')) {
      issues.push('Potential SQL injection vulnerability');
    }
    
    // Check for missing input validation
    if (content.includes('request.body') && !content.includes('validate')) {
      issues.push('Missing input validation');
    }
    
    // Check for missing rate limiting
    if (!content.includes('rateLimit') && !content.includes('throttle')) {
      this.results.recommendations.push({
        file: fileName,
        recommendation: 'Consider adding rate limiting'
      });
    }
    
    if (issues.length > 0) {
      this.results.issues.push({
        file: fileName,
        issues
      });
    }
  }

  /**
   * Generate audit report
   */
  generateReport() {
    const reportPath = path.join(__dirname, '../../docs/security/functions-auth-audit-report.md');
    const timestamp = new Date().toISOString();
    
    let report = `# Firebase Functions Authentication Audit Report

**Date:** ${timestamp}
**Author:** Gil Klainert
**Project:** CVPlus

## Executive Summary

- **Total Functions Scanned:** ${this.results.total}
- **Authenticated Functions:** ${this.results.authenticated}
- **Unauthenticated Functions:** ${this.results.unauthenticated}
- **Functions Missing Auth:** ${this.results.missing.length}
- **Security Issues Found:** ${this.results.issues.length}

## Authentication Coverage

\`\`\`
Coverage: ${((this.results.authenticated / this.results.total) * 100).toFixed(1)}%
[${this.createProgressBar(this.results.authenticated, this.results.total)}]
\`\`\`

## Functions Missing Authentication

${this.results.missing.length === 0 ? '✅ No functions missing authentication!' : ''}
`;

    if (this.results.missing.length > 0) {
      report += `
### Critical - Requires Immediate Action

| Function | Category | Action Required |
|----------|----------|-----------------|
`;
      this.results.missing.forEach(item => {
        report += `| ${item.file} | ${item.category} | Add ${this.getGuardType(item.category)} |\n`;
      });
    }

    if (this.results.issues.length > 0) {
      report += `
## Security Issues

### Issues Found

`;
      this.results.issues.forEach(item => {
        report += `#### ${item.file}\n`;
        item.issues.forEach(issue => {
          report += `- ⚠️ ${issue}\n`;
        });
        report += '\n';
      });
    }

    if (this.results.recommendations.length > 0) {
      report += `
## Recommendations

`;
      this.results.recommendations.forEach(rec => {
        report += `- **${rec.file}:** ${rec.recommendation}\n`;
      });
    }

    report += `
## Function Categories

### Public Functions (No Auth Required)
${FUNCTION_CATEGORIES.PUBLIC.map(fn => `- ${fn}`).join('\n')}

### Authenticated Functions
${FUNCTION_CATEGORIES.AUTHENTICATED.map(fn => `- ${fn}`).join('\n')}

### Premium Functions
${FUNCTION_CATEGORIES.PREMIUM.map(fn => `- ${fn}`).join('\n')}

### Admin Functions
${FUNCTION_CATEGORIES.ADMIN.map(fn => `- ${fn}`).join('\n')}

## Remediation Steps

1. **Immediate Actions:**
   - Apply authGuard middleware to all functions in "Missing Authentication" list
   - Review and fix security issues identified
   - Implement input validation for all endpoints

2. **Short-term Actions:**
   - Add rate limiting to prevent abuse
   - Implement comprehensive logging
   - Set up monitoring alerts for auth failures

3. **Long-term Actions:**
   - Regular security audits (monthly)
   - Automated security testing in CI/CD
   - Security training for development team

## Compliance Status

- [${this.results.missing.length === 0 ? 'x' : ' '}] All protected functions use authentication
- [${this.results.issues.length === 0 ? 'x' : ' '}] No security vulnerabilities detected
- [ ] Rate limiting implemented
- [ ] Input validation on all endpoints
- [ ] Comprehensive error handling
- [ ] Security monitoring enabled

## Next Steps

1. Run \`npm run fix:auth\` to automatically add authGuard to missing functions
2. Review and test changes in development environment
3. Deploy to staging for security testing
4. Perform penetration testing
5. Deploy to production

---
*This report was generated automatically by the Firebase Functions Authentication Audit tool*
`;

    // Create security directory if it doesn't exist
    const securityDir = path.dirname(reportPath);
    if (!fs.existsSync(securityDir)) {
      fs.mkdirSync(securityDir, { recursive: true });
    }

    // Write report
    fs.writeFileSync(reportPath, report);
    
    return reportPath;
  }

  /**
   * Get the appropriate guard type for a category
   */
  getGuardType(category) {
    switch (category) {
      case 'PREMIUM':
        return 'premiumGuard';
      case 'ADMIN':
        return 'adminGuard';
      default:
        return 'authGuard';
    }
  }

  /**
   * Create a visual progress bar
   */
  createProgressBar(current, total) {
    const percentage = (current / total) * 100;
    const filled = Math.round(percentage / 5);
    const empty = 20 - filled;
    return '█'.repeat(filled) + '░'.repeat(empty);
  }

  /**
   * Run the audit
   */
  async run() {
    try {
      console.log(`${colors.blue}╔════════════════════════════════════════╗${colors.reset}`);
      console.log(`${colors.blue}║  Firebase Functions Authentication Audit  ║${colors.reset}`);
      console.log(`${colors.blue}╚════════════════════════════════════════╝${colors.reset}\n`);

      const files = await this.scanFunctions();
      const results = [];

      console.log('Analyzing functions...\n');
      
      for (const file of files) {
        const result = this.analyzeFunction(file);
        if (result) {
          results.push(result);
          
          // Print status
          const statusColor = result.authStatus === 'NONE' ? colors.red : colors.green;
          const statusIcon = result.authStatus === 'NONE' ? '❌' : '✅';
          console.log(`${statusIcon} ${result.file}: ${statusColor}${result.authStatus}${colors.reset}`);
        }
      }

      console.log('\n' + '─'.repeat(50) + '\n');
      
      // Print summary
      console.log(`${colors.blue}📊 Summary:${colors.reset}`);
      console.log(`   Total Functions: ${this.results.total}`);
      console.log(`   ${colors.green}Authenticated: ${this.results.authenticated}${colors.reset}`);
      console.log(`   ${colors.red}Unauthenticated: ${this.results.unauthenticated}${colors.reset}`);
      
      if (this.results.missing.length > 0) {
        console.log(`\n${colors.red}⚠️  Functions Missing Authentication:${colors.reset}`);
        this.results.missing.forEach(item => {
          console.log(`   - ${item.file} (needs ${item.category})`);
        });
      }

      if (this.results.issues.length > 0) {
        console.log(`\n${colors.yellow}⚠️  Security Issues Found:${colors.reset}`);
        this.results.issues.forEach(item => {
          console.log(`   ${item.file}:`);
          item.issues.forEach(issue => {
            console.log(`     - ${issue}`);
          });
        });
      }

      // Generate report
      const reportPath = this.generateReport();
      console.log(`\n${colors.green}✅ Audit complete! Report saved to:${colors.reset}`);
      console.log(`   ${reportPath}`);
      
      // Exit with error if issues found
      if (this.results.missing.length > 0 || this.results.issues.length > 0) {
        console.log(`\n${colors.red}❌ Audit failed: Security issues detected${colors.reset}`);
        process.exit(1);
      } else {
        console.log(`\n${colors.green}✅ All functions properly secured!${colors.reset}`);
      }

    } catch (error) {
      console.error(`${colors.red}Error during audit: ${error.message}${colors.reset}`);
      process.exit(1);
    }
  }
}

// Run audit if executed directly
if (require.main === module) {
  const auditor = new FunctionAuditor();
  auditor.run();
}

module.exports = FunctionAuditor;