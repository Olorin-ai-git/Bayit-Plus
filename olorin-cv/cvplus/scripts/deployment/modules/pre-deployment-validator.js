#!/usr/bin/env node

/**
 * Pre-Deployment Validation System
 * Comprehensive validation before deployment starts
 */

const fs = require('fs').promises;
const path = require('path');
const { execSync } = require('child_process');

class PreDeploymentValidator {
  constructor(projectRoot, configDir) {
    this.projectRoot = projectRoot;
    this.configDir = configDir;
    this.errors = [];
    this.warnings = [];
    this.info = [];
    this.config = null;
    this.productionConfig = null;
    
    // Production validation mode
    this.validationMode = process.env.VALIDATION_MODE || 'development';
    this.targetEnvironment = process.env.TARGET_ENVIRONMENT || 'development';
    this.strictMode = process.env.STRICT_MODE === 'true';
    this.requireSecurityScan = process.env.REQUIRE_SECURITY_SCAN === 'true';
    this.requirePerformanceBaseline = process.env.REQUIRE_PERFORMANCE_BASELINE === 'true';
  }

  async validate() {
    console.log(`🔍 Starting ${this.validationMode} pre-deployment validation...`);
    console.log(`🎯 Target Environment: ${this.targetEnvironment}`);
    
    if (this.validationMode === 'production') {
      console.log('⚠️  PRODUCTION VALIDATION MODE - Enhanced checks enabled');
    }
    
    try {
      await this.loadConfig();
      await this.validateEnvironment();
      await this.validateAuthentication();
      await this.validateCodeQuality();
      await this.validateDependencies();
      await this.validateFirebaseConfig();
      await this.validateQuotaUsage();
      await this.validateSecurityRules();
      await this.validateEnvironmentVariables();
      
      // Production-specific validations
      if (this.validationMode === 'production' || this.targetEnvironment === 'production') {
        console.log('🔒 Running production-specific validations...');
        await this.validateProductionReadiness();
        await this.validateSecurityCompliance();
        await this.validatePerformanceBaselines();
        await this.validateBackupAndRecovery();
        await this.validateMonitoringSetup();
      }
      
      return this.generateReport();
    } catch (error) {
      this.errors.push(`Validation failed: ${error.message}`);
      return this.generateReport();
    }
  }

  async loadConfig() {
    try {
      // Load base deployment configuration
      const configPath = path.join(this.configDir, 'deployment-config.json');
      const configData = await fs.readFile(configPath, 'utf8');
      this.config = JSON.parse(configData);
      
      // Load production-specific configuration for production validation
      if (this.validationMode === 'production' || this.targetEnvironment === 'production') {
        try {
          const prodConfigPath = path.join(this.configDir, 'production-config.json');
          const prodConfigData = await fs.readFile(prodConfigPath, 'utf8');
          this.productionConfig = JSON.parse(prodConfigData);
          console.log('✅ Production configuration loaded');
        } catch (error) {
          this.warnings.push('Production configuration not found, using defaults');
          this.productionConfig = { production: { validation: {} } };
        }
      }
    } catch (error) {
      // Use default configuration if config file is not found
      this.config = { validation: { skipTypeCheck: false } };
      this.productionConfig = { production: { validation: {} } };
    }
  }

  async validateEnvironment() {
    console.log('  ✓ Validating environment...');
    
    // Check Node.js version
    try {
      const nodeVersion = execSync('node --version', { encoding: 'utf8' }).trim();
      const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);
      
      if (majorVersion < 18) {
        this.errors.push(`Node.js version ${nodeVersion} is not supported. Minimum: v18.0.0`);
      } else {
        this.info.push(`Node.js version: ${nodeVersion} ✓`);
      }
    } catch (error) {
      this.errors.push('Node.js not found in PATH');
    }

    // Check Firebase CLI
    try {
      const firebaseVersion = execSync('firebase --version', { encoding: 'utf8' }).trim();
      this.info.push(`Firebase CLI: ${firebaseVersion} ✓`);
    } catch (error) {
      this.errors.push('Firebase CLI not found. Run: npm install -g firebase-tools');
    }

    // Check Git
    try {
      const gitVersion = execSync('git --version', { encoding: 'utf8' }).trim();
      this.info.push(`${gitVersion} ✓`);
    } catch (error) {
      this.warnings.push('Git not found in PATH');
    }

    // Check available disk space
    try {
      const df = execSync('df -h .', { encoding: 'utf8' });
      const lines = df.split('\n');
      const diskInfo = lines[1].split(/\s+/);
      const availableSpace = diskInfo[3];
      
      this.info.push(`Available disk space: ${availableSpace}`);
      
      // Warn if less than 1GB available
      const availableBytes = this.parseSize(availableSpace);
      if (availableBytes < 1073741824) { // 1GB
        this.warnings.push(`Low disk space: ${availableSpace}. Consider freeing up space.`);
      }
    } catch (error) {
      this.warnings.push('Could not check disk space');
    }
  }

  async validateAuthentication() {
    console.log('  ✓ Validating authentication...');
    
    try {
      // Check Firebase authentication
      const loginList = execSync('firebase login:list', { encoding: 'utf8' }).trim();
      if (loginList.includes('No accounts')) {
        this.errors.push('Not logged into Firebase. Run: firebase login');
      } else {
        // Extract the email from the login list output
        const emailMatch = loginList.match(/Logged in as (.+)/);
        const user = emailMatch ? emailMatch[1] : 'authenticated user';
        this.info.push(`Firebase user: ${user} ✓`);
      }

      // Check current project
      const project = execSync('firebase use', { 
        encoding: 'utf8',
        cwd: this.projectRoot 
      }).trim();
      
      if (project.includes('No active project')) {
        this.errors.push('No active Firebase project. Run: firebase use <project-id>');
      } else {
        this.info.push(`Active project: ${project} ✓`);
      }
    } catch (error) {
      this.errors.push(`Firebase authentication check failed: ${error.message}`);
    }
  }

  async validateCodeQuality() {
    console.log('  ✓ Validating code quality...');
    
    // Check TypeScript compilation for frontend
    try {
      const frontendPath = path.join(this.projectRoot, 'frontend');
      execSync('npm run build', { 
        cwd: frontendPath, 
        stdio: 'pipe' 
      });
      this.info.push('Frontend TypeScript compilation: ✓');
    } catch (error) {
      this.errors.push('Frontend TypeScript compilation failed. Fix errors before deployment.');
    }

    // Check TypeScript compilation for functions
    if (this.config?.validation?.skipTypeCheck) {
      this.warnings.push('Functions TypeScript compilation: Skipped (skipTypeCheck enabled)');
    } else {
      try {
        const functionsPath = path.join(this.projectRoot, 'functions');
        execSync('npm run build', { 
          cwd: functionsPath, 
          stdio: 'pipe' 
        });
        this.info.push('Functions TypeScript compilation: ✓');
      } catch (error) {
        this.errors.push('Functions TypeScript compilation failed. Fix errors before deployment.');
      }
    }

    // Check for common issues
    await this.checkCommonIssues();
  }

  async checkCommonIssues() {
    const functionsPath = path.join(this.projectRoot, 'functions', 'src');
    
    try {
      const files = await this.getAllTsFiles(functionsPath);
      
      for (const file of files) {
        const content = await fs.readFile(file, 'utf8');
        
        // Check for hardcoded secrets
        if (this.containsHardcodedSecrets(content)) {
          this.warnings.push(`Potential hardcoded secrets in ${path.relative(this.projectRoot, file)}`);
        }
        
        // Check for console.log statements
        if (content.includes('console.log(') && !file.includes('test')) {
          this.warnings.push(`Console.log statements found in ${path.relative(this.projectRoot, file)}`);
        }
        
        // Check file length
        const lines = content.split('\n').length;
        if (lines > 200) {
          this.warnings.push(`File ${path.relative(this.projectRoot, file)} has ${lines} lines (limit: 200)`);
        }
      }
    } catch (error) {
      this.warnings.push(`Code quality check partially failed: ${error.message}`);
    }
  }

  async validateDependencies() {
    console.log('  ✓ Validating dependencies...');
    
    // Check frontend dependencies
    await this.checkDependencies(path.join(this.projectRoot, 'frontend'));
    
    // Check functions dependencies
    await this.checkDependencies(path.join(this.projectRoot, 'functions'));
  }

  async checkDependencies(projectPath) {
    try {
      const packagePath = path.join(projectPath, 'package.json');
      const lockPath = path.join(projectPath, 'package-lock.json');
      
      const packageExists = await fs.access(packagePath).then(() => true).catch(() => false);
      const lockExists = await fs.access(lockPath).then(() => true).catch(() => false);
      
      if (!packageExists) {
        this.errors.push(`package.json not found in ${path.relative(this.projectRoot, projectPath)}`);
        return;
      }
      
      if (!lockExists) {
        this.warnings.push(`package-lock.json not found in ${path.relative(this.projectRoot, projectPath)}`);
      }
      
      // Check for vulnerabilities
      try {
        execSync('npm audit --audit-level moderate', { 
          cwd: projectPath, 
          stdio: 'pipe' 
        });
        this.info.push(`Dependencies in ${path.relative(this.projectRoot, projectPath)}: No security issues ✓`);
      } catch (error) {
        this.warnings.push(`Security vulnerabilities found in ${path.relative(this.projectRoot, projectPath)}`);
      }
      
    } catch (error) {
      this.errors.push(`Dependency check failed for ${path.relative(this.projectRoot, projectPath)}: ${error.message}`);
    }
  }

  async validateFirebaseConfig() {
    console.log('  ✓ Validating Firebase configuration...');
    
    const firebaseJson = path.join(this.projectRoot, 'firebase.json');
    
    try {
      const config = JSON.parse(await fs.readFile(firebaseJson, 'utf8'));
      
      // Validate configuration structure
      const requiredSections = ['hosting', 'functions', 'firestore', 'storage'];
      const missingSections = requiredSections.filter(section => !config[section]);
      
      if (missingSections.length > 0) {
        this.warnings.push(`Missing Firebase config sections: ${missingSections.join(', ')}`);
      }
      
      // Validate specific configurations
      if (config.functions && config.functions.runtime !== 'nodejs20') {
        this.warnings.push(`Functions runtime: ${config.functions.runtime} (recommended: nodejs20)`);
      }
      
      if (config.hosting && config.hosting.public !== 'frontend/dist') {
        this.warnings.push(`Hosting public directory: ${config.hosting.public} (expected: frontend/dist)`);
      }
      
      this.info.push('Firebase configuration: ✓');
    } catch (error) {
      this.errors.push(`Firebase configuration validation failed: ${error.message}`);
    }
  }

  async validateQuotaUsage() {
    console.log('  ✓ Validating quota usage...');
    
    try {
      // This would typically check Firebase quotas via API
      // For now, we'll do basic checks
      
      const functionsDir = path.join(this.projectRoot, 'functions', 'src');
      const functionFiles = await this.getAllTsFiles(functionsDir);
      
      const functionCount = functionFiles.filter(file => 
        file.includes('/functions/') && !file.includes('test')
      ).length;
      
      if (functionCount > 50) {
        this.warnings.push(`Large number of functions (${functionCount}). Consider batching deployment.`);
      }
      
      this.info.push(`Estimated functions to deploy: ${functionCount}`);
    } catch (error) {
      this.warnings.push(`Quota validation failed: ${error.message}`);
    }
  }

  async validateSecurityRules() {
    console.log('  ✓ Validating security rules...');
    
    const firestoreRules = path.join(this.projectRoot, 'firestore.rules');
    const storageRules = path.join(this.projectRoot, 'storage.rules');
    
    // Validate Firestore rules
    try {
      await fs.access(firestoreRules);
      const rulesContent = await fs.readFile(firestoreRules, 'utf8');
      
      if (rulesContent.includes('allow read, write: if true;')) {
        this.warnings.push('Firestore rules allow unrestricted access. Review security rules.');
      }
      
      this.info.push('Firestore rules: ✓');
    } catch (error) {
      this.errors.push('Firestore rules file not found');
    }
    
    // Validate Storage rules
    try {
      await fs.access(storageRules);
      const rulesContent = await fs.readFile(storageRules, 'utf8');
      
      if (rulesContent.includes('allow read, write: if true;')) {
        this.warnings.push('Storage rules allow unrestricted access. Review security rules.');
      }
      
      this.info.push('Storage rules: ✓');
    } catch (error) {
      this.errors.push('Storage rules file not found');
    }
  }

  async validateEnvironmentVariables() {
    console.log('  ✓ Validating environment variables...');
    
    const requiredVars = [
      'ANTHROPIC_API_KEY',
      'OPENAI_API_KEY', 
      'ELEVENLABS_API_KEY',
      'MILVUS_TOKEN'
    ];

    // Check local .env file first
    const localEnvResults = await this.checkLocalEnvironmentVariables(requiredVars);
    
    // Check Firebase Secret Manager
    const firebaseSecretsResults = await this.checkFirebaseSecrets(requiredVars);
    
    // Combine results and generate final assessment
    this.generateEnvironmentVariablesReport(localEnvResults, firebaseSecretsResults, requiredVars);
  }

  async checkLocalEnvironmentVariables(requiredVars) {
    const envFile = path.join(this.projectRoot, 'functions', '.env');
    
    try {
      await fs.access(envFile);
      const envContent = await fs.readFile(envFile, 'utf8');
      
      const results = {
        fileExists: true,
        variables: {}
      };
      
      for (const varName of requiredVars) {
        const match = envContent.match(new RegExp(`${varName}=(.*)$`, 'm'));
        if (match) {
          const value = match[1].trim();
          results.variables[varName] = {
            exists: true,
            isEmpty: !value || value === '""' || value === "''"
          };
        } else {
          results.variables[varName] = {
            exists: false,
            isEmpty: true
          };
        }
      }
      
      return results;
    } catch (error) {
      return {
        fileExists: false,
        error: error.message,
        variables: {}
      };
    }
  }

  async checkFirebaseSecrets(requiredVars) {
    try {
      // Check if Firebase Secrets are configured
      const secretsResult = execSync('firebase functions:secrets:access --help', { 
        encoding: 'utf8',
        stdio: 'pipe',
        cwd: this.projectRoot
      });
      
      const secretsAvailable = !secretsResult.includes('command not found');
      
      if (!secretsAvailable) {
        return {
          available: false,
          reason: 'Firebase CLI secrets command not available'
        };
      }

      // Try to list existing secrets
      try {
        const secretsList = execSync('firebase functions:secrets:access', { 
          encoding: 'utf8',
          stdio: 'pipe',
          cwd: this.projectRoot,
          timeout: 10000
        });
        
        const results = {
          available: true,
          secrets: {}
        };
        
        // Parse the secrets list to check for our required variables
        for (const varName of requiredVars) {
          const secretExists = secretsList.includes(varName) || 
                             secretsList.toLowerCase().includes(varName.toLowerCase());
          
          results.secrets[varName] = {
            exists: secretExists,
            source: 'firebase-secrets'
          };
        }
        
        return results;
      } catch (listError) {
        // If listing fails, try individual secret checks
        const results = {
          available: true,
          secrets: {},
          listError: listError.message
        };
        
        for (const varName of requiredVars) {
          try {
            // Try to access individual secret (this will fail silently if not exists)
            execSync(`firebase functions:secrets:access ${varName}`, { 
              encoding: 'utf8',
              stdio: 'pipe',
              cwd: this.projectRoot,
              timeout: 5000
            });
            
            results.secrets[varName] = {
              exists: true,
              source: 'firebase-secrets'
            };
          } catch (secretError) {
            results.secrets[varName] = {
              exists: false,
              error: 'Secret not found or not accessible'
            };
          }
        }
        
        return results;
      }
    } catch (error) {
      return {
        available: false,
        error: error.message,
        reason: 'Firebase secrets check failed'
      };
    }
  }

  generateEnvironmentVariablesReport(localEnvResults, firebaseSecretsResults, requiredVars) {
    const report = {
      fullyConfigured: [],
      partiallyConfigured: [],
      missing: [],
      warnings: []
    };

    for (const varName of requiredVars) {
      const localVar = localEnvResults.variables[varName];
      const firebaseSecret = firebaseSecretsResults.secrets?.[varName];
      
      // Check if variable is available in either location
      const inLocalEnv = localVar?.exists && !localVar?.isEmpty;
      const inFirebaseSecrets = firebaseSecret?.exists;
      
      if (inLocalEnv || inFirebaseSecrets) {
        const sources = [];
        if (inLocalEnv) sources.push('local .env');
        if (inFirebaseSecrets) sources.push('Firebase Secrets');
        
        report.fullyConfigured.push({
          name: varName,
          sources: sources
        });
      } else if (localVar?.exists && localVar?.isEmpty) {
        report.partiallyConfigured.push({
          name: varName,
          issue: 'Empty value in local .env',
          suggestion: 'Set value in local .env or Firebase Secrets'
        });
      } else {
        report.missing.push({
          name: varName,
          localChecked: localEnvResults.fileExists,
          firebaseChecked: firebaseSecretsResults.available
        });
      }
    }

    // Generate validation messages
    if (report.fullyConfigured.length === requiredVars.length) {
      this.info.push(`Environment variables: ✓ (${report.fullyConfigured.length} configured)`);
      
      // Show sources for configured variables
      report.fullyConfigured.forEach(config => {
        this.info.push(`   ${config.name}: Available in ${config.sources.join(', ')}`);
      });
    }

    if (report.partiallyConfigured.length > 0) {
      this.warnings.push(`Environment variables with empty values: ${report.partiallyConfigured.map(p => p.name).join(', ')}`);
      report.partiallyConfigured.forEach(partial => {
        this.warnings.push(`   ${partial.name}: ${partial.issue} - ${partial.suggestion}`);
      });
    }

    if (report.missing.length > 0) {
      const missingVars = report.missing.map(m => m.name).join(', ');
      
      if (!localEnvResults.fileExists && !firebaseSecretsResults.available) {
        this.errors.push(`Missing environment configuration: ${missingVars}`);
        this.errors.push('No local .env file and Firebase Secrets not accessible');
        this.errors.push('Create functions/.env file or configure Firebase Secret Manager');
      } else if (!localEnvResults.fileExists) {
        this.warnings.push(`Environment variables not in local .env: ${missingVars}`);
        this.info.push('Checking Firebase Secrets for production deployment');
        
        if (!firebaseSecretsResults.available) {
          this.warnings.push('Firebase Secrets not accessible - may cause deployment issues');
        }
      } else {
        this.warnings.push(`Missing environment variables: ${missingVars}`);
        this.info.push('Variables may be available in Firebase Secrets for production');
      }
    }

    // Add informational messages about configuration strategy
    if (localEnvResults.fileExists && firebaseSecretsResults.available) {
      this.info.push('Environment strategy: Local .env for development, Firebase Secrets for production');
    } else if (localEnvResults.fileExists) {
      this.info.push('Environment strategy: Local .env file (Firebase Secrets not checked)');
    } else if (firebaseSecretsResults.available) {
      this.info.push('Environment strategy: Firebase Secrets only');
    }

    // Add Firebase Secrets status information
    if (firebaseSecretsResults.available) {
      this.info.push('Firebase Secret Manager: ✓ Available');
    } else if (firebaseSecretsResults.reason) {
      this.warnings.push(`Firebase Secret Manager: ${firebaseSecretsResults.reason}`);
    }
  }

  generateReport() {
    const hasErrors = this.errors.length > 0;
    const hasWarnings = this.warnings.length > 0;
    
    console.log('\n📋 Pre-deployment Validation Report:');
    console.log('═══════════════════════════════════════\n');
    
    if (this.info.length > 0) {
      console.log('✅ Information:');
      this.info.forEach(item => console.log(`   ${item}`));
      console.log();
    }
    
    if (hasWarnings) {
      console.log('⚠️  Warnings:');
      this.warnings.forEach(warning => console.log(`   ${warning}`));
      console.log();
    }
    
    if (hasErrors) {
      console.log('❌ Errors:');
      this.errors.forEach(error => console.log(`   ${error}`));
      console.log();
    }
    
    if (hasErrors) {
      console.log('🚫 VALIDATION FAILED - Please fix errors before deployment');
      process.exit(1);
    } else if (hasWarnings) {
      console.log('⚠️  VALIDATION PASSED WITH WARNINGS - Review warnings before deployment');
      process.exit(0);
    } else {
      console.log('✅ VALIDATION PASSED - Ready for deployment');
      process.exit(0);
    }
  }

  // Helper methods
  async getAllTsFiles(dir) {
    const files = [];
    
    try {
      const items = await fs.readdir(dir);
      
      for (const item of items) {
        const fullPath = path.join(dir, item);
        const stat = await fs.stat(fullPath);
        
        if (stat.isDirectory() && !item.startsWith('.') && item !== 'node_modules') {
          files.push(...await this.getAllTsFiles(fullPath));
        } else if (item.endsWith('.ts') && !item.endsWith('.d.ts')) {
          files.push(fullPath);
        }
      }
    } catch (error) {
      // Directory doesn't exist or can't be read
    }
    
    return files;
  }

  containsHardcodedSecrets(content) {
    const secretPatterns = [
      /sk-[a-zA-Z0-9]{20,}/,  // OpenAI API key pattern
      /sk_[a-zA-Z0-9]{32,}/,  // ElevenLabs API key pattern
      /"[A-Z0-9]{32,}"/,      // Generic API key pattern
      /password\s*[:=]\s*["'][^"']+["']/i,
      /secret\s*[:=]\s*["'][^"']+["']/i,
    ];
    
    return secretPatterns.some(pattern => pattern.test(content));
  }

  async validateProductionReadiness() {
    console.log('🔒 Validating production readiness...');
    
    const prodConfig = this.productionConfig?.production?.validation || {};
    
    // Check required environment variables for production
    const requiredEnvVars = prodConfig.environmentVariableChecks || [
      'ANTHROPIC_API_KEY',
      'OPENAI_API_KEY',
      'ELEVENLABS_API_KEY',
      'STRIPE_SECRET_KEY'
    ];
    
    const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);
    if (missingEnvVars.length > 0) {
      this.errors.push(`Missing required production environment variables: ${missingEnvVars.join(', ')}`);
    } else {
      this.info.push(`✅ All required production environment variables are set`);
    }
    
    // Check test coverage if required
    if (prodConfig.requiredTests?.unitTestCoverage) {
      try {
        const testResultsPath = path.join(this.projectRoot, 'coverage', 'coverage-summary.json');
        const testResults = JSON.parse(await fs.readFile(testResultsPath, 'utf8'));
        const totalCoverage = testResults.total.lines.pct;
        
        if (totalCoverage < prodConfig.requiredTests.unitTestCoverage) {
          if (this.strictMode) {
            this.errors.push(`Test coverage ${totalCoverage}% below required ${prodConfig.requiredTests.unitTestCoverage}%`);
          } else {
            this.warnings.push(`Test coverage ${totalCoverage}% below recommended ${prodConfig.requiredTests.unitTestCoverage}%`);
          }
        } else {
          this.info.push(`✅ Test coverage ${totalCoverage}% meets requirements`);
        }
      } catch (error) {
        if (this.strictMode) {
          this.errors.push('Test coverage report not found - run tests before production deployment');
        } else {
          this.warnings.push('Test coverage report not available');
        }
      }
    }
    
    // Validate production build configuration
    try {
      const packageJsonPath = path.join(this.projectRoot, 'frontend', 'package.json');
      const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf8'));
      
      if (!packageJson.scripts?.build) {
        this.errors.push('No production build script found in frontend/package.json');
      } else {
        this.info.push('✅ Production build script configured');
      }
    } catch (error) {
      this.warnings.push('Could not validate frontend package.json configuration');
    }
  }

  async validateSecurityCompliance() {
    console.log('🔐 Validating security compliance...');
    
    const prodConfig = this.productionConfig?.production?.security || {};
    
    // Check HTTPS enforcement
    if (prodConfig.httpsOnly) {
      try {
        const firebaseJsonPath = path.join(this.projectRoot, 'firebase.json');
        const firebaseJson = JSON.parse(await fs.readFile(firebaseJsonPath, 'utf8'));
        
        const hostingConfig = firebaseJson.hosting;
        if (!hostingConfig?.rewrites?.some(r => r.function)) {
          this.warnings.push('No function rewrites found - ensure HTTPS enforcement is configured');
        } else {
          this.info.push('✅ Function rewrites configured for HTTPS enforcement');
        }
      } catch (error) {
        this.warnings.push('Could not validate HTTPS configuration in firebase.json');
      }
    }
    
    // Security vulnerability scan
    if (this.requireSecurityScan || prodConfig.vulnerabilityScanning) {
      try {
        // Run npm audit for security vulnerabilities
        execSync('npm audit --audit-level=moderate', { 
          cwd: this.projectRoot,
          stdio: 'pipe'
        });
        this.info.push('✅ No moderate or high security vulnerabilities found');
      } catch (error) {
        if (prodConfig.failOnSecurityVulnerabilities) {
          this.errors.push('Security vulnerabilities detected - run npm audit for details');
        } else {
          this.warnings.push('Security vulnerabilities detected - consider running npm audit');
        }
      }
    }
    
    // Check for hardcoded secrets in production code
    const productionFiles = await this.getFilesRecursive(path.join(this.projectRoot, 'functions', 'src'));
    let secretsFound = 0;
    
    for (const file of productionFiles) {
      if (file.endsWith('.js') || file.endsWith('.ts')) {
        try {
          const content = await fs.readFile(file, 'utf8');
          if (this.containsHardcodedSecrets(content)) {
            secretsFound++;
            this.warnings.push(`Potential hardcoded secrets found in ${path.relative(this.projectRoot, file)}`);
          }
        } catch (error) {
          // Skip files that can't be read
        }
      }
    }
    
    if (secretsFound === 0) {
      this.info.push('✅ No hardcoded secrets detected in source code');
    } else if (this.strictMode) {
      this.errors.push(`Hardcoded secrets found in ${secretsFound} files - use environment variables instead`);
    }
  }

  async validatePerformanceBaselines() {
    console.log('⚡ Validating performance baselines...');
    
    const prodConfig = this.productionConfig?.production || {};
    
    if (!this.requirePerformanceBaseline) {
      this.info.push('Performance baseline validation skipped');
      return;
    }
    
    // Check bundle size for frontend
    try {
      const frontendDistPath = path.join(this.projectRoot, 'frontend', 'dist');
      if (await this.directoryExists(frontendDistPath)) {
        const files = await this.getFilesRecursive(frontendDistPath);
        const jsFiles = files.filter(f => f.endsWith('.js'));
        
        let totalSize = 0;
        for (const file of jsFiles) {
          const stats = await fs.stat(file);
          totalSize += stats.size;
        }
        
        const sizeMB = totalSize / (1024 * 1024);
        const sizeLimit = 10; // 10MB limit for frontend bundle
        
        if (sizeMB > sizeLimit) {
          this.warnings.push(`Frontend bundle size ${sizeMB.toFixed(2)}MB exceeds recommended ${sizeLimit}MB`);
        } else {
          this.info.push(`✅ Frontend bundle size ${sizeMB.toFixed(2)}MB within limits`);
        }
      }
    } catch (error) {
      this.warnings.push('Could not analyze frontend bundle size');
    }
    
    // Validate function count for batching strategy
    try {
      const functionsPath = path.join(this.projectRoot, 'functions', 'src');
      const functionFiles = await this.getFilesRecursive(functionsPath);
      const exportedFunctions = functionFiles.filter(f => f.includes('exports.'));
      
      if (exportedFunctions.length > 100) {
        this.info.push(`Large number of functions (${exportedFunctions.length}) - intelligent batching will be used`);
      } else {
        this.info.push(`✅ Function count ${exportedFunctions.length} suitable for standard deployment`);
      }
    } catch (error) {
      this.warnings.push('Could not analyze function count');
    }
  }

  async validateBackupAndRecovery() {
    console.log('💾 Validating backup and recovery procedures...');
    
    // Check if rollback configuration exists
    const rollbackConfig = this.productionConfig?.production?.rollback;
    if (rollbackConfig?.automaticRollbackEnabled) {
      this.info.push('✅ Automatic rollback configured');
    } else {
      this.warnings.push('Automatic rollback not enabled - consider enabling for production safety');
    }
    
    // Check for deployment history tracking
    const deploymentsDir = path.join(this.projectRoot, 'deployments');
    if (await this.directoryExists(deploymentsDir)) {
      this.info.push('✅ Deployment history directory exists');
    } else {
      this.info.push('Creating deployment history directory for tracking');
      await fs.mkdir(deploymentsDir, { recursive: true });
    }
  }

  async validateMonitoringSetup() {
    console.log('📊 Validating monitoring and alerting setup...');
    
    const monitoringConfig = this.productionConfig?.production?.monitoring;
    
    if (monitoringConfig?.alertingEnabled) {
      this.info.push('✅ Production alerting enabled');
    } else {
      this.warnings.push('Production alerting not configured - consider enabling for production monitoring');
    }
    
    if (monitoringConfig?.performanceBaselines) {
      this.info.push('✅ Performance baselines configured');
    } else {
      this.warnings.push('Performance baselines not configured - consider setting up for production monitoring');
    }
    
    // Validate health check endpoints
    const healthCheckModule = path.join(path.dirname(__filename), 'health-checker.js');
    if (await this.fileExists(healthCheckModule)) {
      this.info.push('✅ Health checking module available');
    } else {
      this.warnings.push('Health checking module not found - post-deployment validation may be limited');
    }
  }

  parseSize(sizeStr) {
    const units = { K: 1024, M: 1024**2, G: 1024**3, T: 1024**4 };
    const match = sizeStr.match(/^(\d+(?:\.\d+)?)([KMGT]?)/);
    if (!match) return 0;
    
    const [, size, unit] = match;
    return parseFloat(size) * (units[unit] || 1);
  }
}

// Main execution
if (require.main === module) {
  const [,, projectRoot, configDir] = process.argv;
  
  if (!projectRoot) {
    console.error('Usage: node pre-deployment-validator.js <project-root> [config-dir]');
    process.exit(1);
  }
  
  const validator = new PreDeploymentValidator(
    projectRoot, 
    configDir || path.join(projectRoot, 'scripts', 'deployment', 'config')
  );
  
  validator.validate().catch(error => {
    console.error('Validation failed with error:', error);
    process.exit(1);
  });
}

module.exports = PreDeploymentValidator;