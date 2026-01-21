/**
 * CVPlus Firebase Functions Migration Tracker
 * 
 * Comprehensive tracking system for migrating Firebase Functions to Git submodules
 * Author: Gil Klainert
 * Date: 2025-08-28
 * 
 * Features:
 * - Function inventory and migration status tracking
 * - Cross-module dependency analysis
 * - Risk assessment and management
 * - Rollback procedure coordination
 * - Migration validation and verification
 */

const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');

class MigrationTracker {
  constructor() {
    this.rootPath = '/Users/gklainert/Documents/cvplus';
    this.functionsPath = path.join(this.rootPath, 'functions/src');
    this.packagesPath = path.join(this.rootPath, 'packages');
    this.logsPath = path.join(this.rootPath, 'scripts/migration/logs');
    this.configPath = path.join(this.rootPath, 'scripts/migration/config');
    
    // Migration status constants
    this.STATUS = {
      PENDING: 'pending',
      ANALYZING: 'analyzing',
      IN_PROGRESS: 'in_progress',
      MIGRATED: 'migrated',
      VERIFIED: 'verified',
      FAILED: 'failed',
      ROLLBACK: 'rollback'
    };
    
    // Risk levels
    this.RISK_LEVELS = {
      LOW: 'low',
      MEDIUM: 'medium',
      HIGH: 'high',
      CRITICAL: 'critical'
    };
    
    // Submodule mapping
    this.SUBMODULE_MAP = {
      'admin': ['getBusinessMetrics', 'getCacheStats', 'getSystemHealth', 'getUserStats', 'initializeAdmin', 'manageUsers'],
      'analytics': ['getRevenueMetrics', 'getConversionMetrics', 'getExternalDataAnalytics', 'trackExternalDataUsage', 'trackExternalDataUsageInternal', 'video-analytics-dashboard'],
      'auth': ['testAuth', 'enhancedSessionManager'],
      'core': ['testConfiguration', 'corsTestFunction', 'cleanupTempFiles'],
      'multimedia': ['generateVideoIntroduction', 'generatePodcast', 'podcastStatus', 'podcastStatusPublic', 'mediaGeneration', 'runwayml-status-check', 'heygen-webhook'],
      'premium': ['checkFeatureAccess', 'predictChurn', 'advancedPredictions', 'dynamicPricing', 'enterpriseManagement'],
      'cv-processing': ['analyzeCV', 'enhancedAnalyzeCV', 'generateCV', 'generateCVPreview', 'processCV', 'initiateCVGeneration', 'updateCVData', 'atsOptimization', 'industryOptimization', 'regionalOptimization', 'achievementHighlighting', 'skillsVisualization', 'languageProficiency', 'personalityInsights', 'predictSuccess'],
      'public-profiles': ['publicProfile', 'generateWebPortal', 'cvPortalIntegration', 'portalChat', 'ragChat'],
      'recommendations': ['applyImprovements', 'role-profile.functions'],
      'i18n': [],
      'payments': []
    };
    
    this.inventory = new Map();
    this.migrationLog = [];
    this.dependencies = new Map();
  }

  /**
   * Initialize the migration tracking system
   */
  async initialize() {
    console.log('🚀 Initializing Migration Tracker...');
    
    try {
      // Create necessary directories
      await this.ensureDirectories();
      
      // Load existing data
      await this.loadExistingData();
      
      // Scan functions inventory
      await this.scanFunctionInventory();
      
      // Analyze dependencies
      await this.analyzeDependencies();
      
      // Generate initial report
      await this.generateStatusReport();
      
      console.log('✅ Migration Tracker initialized successfully');
      return true;
    } catch (error) {
      console.error('❌ Failed to initialize Migration Tracker:', error);
      throw error;
    }
  }

  /**
   * Ensure required directories exist
   */
  async ensureDirectories() {
    const dirs = [this.logsPath, this.configPath];
    
    for (const dir of dirs) {
      try {
        await fs.access(dir);
      } catch {
        await fs.mkdir(dir, { recursive: true });
        console.log(`📁 Created directory: ${dir}`);
      }
    }
  }

  /**
   * Load existing migration data
   */
  async loadExistingData() {
    const dataFile = path.join(this.configPath, 'migration-state.json');
    
    try {
      const data = await fs.readFile(dataFile, 'utf8');
      const state = JSON.parse(data);
      
      // Restore inventory
      if (state.inventory) {
        this.inventory = new Map(state.inventory);
      }
      
      // Restore migration log
      if (state.migrationLog) {
        this.migrationLog = state.migrationLog;
      }
      
      // Restore dependencies
      if (state.dependencies) {
        this.dependencies = new Map(state.dependencies);
      }
      
      console.log('📊 Loaded existing migration state');
    } catch (error) {
      console.log('🆕 No existing migration state found, starting fresh');
    }
  }

  /**
   * Save migration state to disk
   */
  async saveState() {
    const dataFile = path.join(this.configPath, 'migration-state.json');
    
    const state = {
      inventory: Array.from(this.inventory.entries()),
      migrationLog: this.migrationLog,
      dependencies: Array.from(this.dependencies.entries()),
      lastUpdated: new Date().toISOString()
    };
    
    await fs.writeFile(dataFile, JSON.stringify(state, null, 2));
    console.log('💾 Migration state saved');
  }

  /**
   * Scan and inventory all Firebase Functions
   */
  async scanFunctionInventory() {
    console.log('🔍 Scanning Firebase Functions inventory...');
    
    const functionsDir = path.join(this.functionsPath, 'functions');
    
    try {
      const entries = await fs.readdir(functionsDir, { withFileTypes: true });
      
      for (const entry of entries) {
        if (entry.isFile() && entry.name.endsWith('.ts')) {
          await this.inventoryFunction(entry.name, functionsDir);
        } else if (entry.isDirectory()) {
          // Scan subdirectories (admin, analytics, ml, payments, etc.)
          await this.scanSubdirectory(path.join(functionsDir, entry.name), entry.name);
        }
      }
      
      console.log(`📋 Inventoried ${this.inventory.size} functions`);
    } catch (error) {
      console.error('❌ Error scanning functions inventory:', error);
      throw error;
    }
  }

  /**
   * Scan a subdirectory for functions
   */
  async scanSubdirectory(dirPath, category) {
    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true });
      
      for (const entry of entries) {
        if (entry.isFile() && entry.name.endsWith('.ts')) {
          await this.inventoryFunction(entry.name, dirPath, category);
        }
      }
    } catch (error) {
      console.error(`❌ Error scanning subdirectory ${category}:`, error);
    }
  }

  /**
   * Add a function to the inventory
   */
  async inventoryFunction(fileName, filePath, category = null) {
    const functionName = fileName.replace('.ts', '');
    const fullPath = path.join(filePath, fileName);
    
    try {
      const stats = await fs.stat(fullPath);
      const content = await fs.readFile(fullPath, 'utf8');
      const hash = crypto.createHash('md5').update(content).digest('hex');
      
      // Determine target submodule
      const targetSubmodule = this.determineTargetSubmodule(functionName, category);
      
      // Assess risk level
      const riskLevel = this.assessRiskLevel(functionName, content);
      
      const functionInfo = {
        name: functionName,
        fileName: fileName,
        category: category,
        fullPath: fullPath,
        relativePath: path.relative(this.rootPath, fullPath),
        size: stats.size,
        lastModified: stats.mtime,
        hash: hash,
        targetSubmodule: targetSubmodule,
        status: this.inventory.has(functionName) ? this.inventory.get(functionName).status : this.STATUS.PENDING,
        riskLevel: riskLevel,
        dependencies: [],
        exports: this.extractExports(content),
        imports: this.extractImports(content),
        migrationNotes: [],
        rollbackPlan: null,
        verificationTests: [],
        lastAnalyzed: new Date().toISOString()
      };
      
      this.inventory.set(functionName, functionInfo);
      
      // Log the discovery
      this.addMigrationLogEntry('INVENTORY', `Inventoried function: ${functionName}`, {
        function: functionName,
        targetSubmodule: targetSubmodule,
        riskLevel: riskLevel
      });
      
    } catch (error) {
      console.error(`❌ Error inventorying function ${functionName}:`, error);
    }
  }

  /**
   * Determine target submodule for a function
   */
  determineTargetSubmodule(functionName, category) {
    // Check explicit category mapping first
    if (category) {
      // Direct category to submodule mapping
      const categoryMap = {
        'admin': 'admin',
        'analytics': 'analytics',
        'ml': 'premium',
        'payments': 'premium'
      };
      
      if (categoryMap[category]) {
        return categoryMap[category];
      }
    }
    
    // Check function name mapping
    for (const [submodule, functions] of Object.entries(this.SUBMODULE_MAP)) {
      if (functions.includes(functionName)) {
        return submodule;
      }
    }
    
    // Default logic based on function name patterns
    if (functionName.includes('admin') || functionName.includes('manage')) {
      return 'admin';
    }
    
    if (functionName.includes('analytics') || functionName.includes('track') || functionName.includes('metrics')) {
      return 'analytics';
    }
    
    if (functionName.includes('auth') || functionName.includes('session')) {
      return 'auth';
    }
    
    if (functionName.includes('video') || functionName.includes('podcast') || functionName.includes('media')) {
      return 'multimedia';
    }
    
    if (functionName.includes('premium') || functionName.includes('subscription') || functionName.includes('billing')) {
      return 'premium';
    }
    
    if (functionName.includes('profile') || functionName.includes('portal')) {
      return 'public-profiles';
    }
    
    if (functionName.includes('recommendation') || functionName.includes('improve')) {
      return 'recommendations';
    }
    
    // Default to cv-processing for CV-related functions
    return 'cv-processing';
  }

  /**
   * Assess risk level for a function
   */
  assessRiskLevel(functionName, content) {
    let riskScore = 0;
    
    // High-risk patterns
    const criticalPatterns = [
      'admin.firestore',
      'firestore().collection().doc().delete()',
      'auth().deleteUser',
      'billing',
      'payment',
      'subscription'
    ];
    
    const highRiskPatterns = [
      'firestore().batch()',
      'functions.auth.user().onDelete',
      'storage().bucket().file().delete()',
      'sendEmail',
      'webhook'
    ];
    
    const mediumRiskPatterns = [
      'firestore().collection().add(',
      'storage().bucket().upload(',
      'functions.https.onCall',
      'external API',
      'third-party'
    ];
    
    // Check for critical patterns
    for (const pattern of criticalPatterns) {
      if (content.includes(pattern)) {
        riskScore += 10;
      }
    }
    
    // Check for high-risk patterns
    for (const pattern of highRiskPatterns) {
      if (content.includes(pattern)) {
        riskScore += 5;
      }
    }
    
    // Check for medium-risk patterns
    for (const pattern of mediumRiskPatterns) {
      if (content.includes(pattern)) {
        riskScore += 2;
      }
    }
    
    // Check function complexity (line count)
    const lineCount = content.split('\n').length;
    if (lineCount > 200) {
      riskScore += 3;
    } else if (lineCount > 100) {
      riskScore += 1;
    }
    
    // Determine risk level
    if (riskScore >= 15) {
      return this.RISK_LEVELS.CRITICAL;
    } else if (riskScore >= 8) {
      return this.RISK_LEVELS.HIGH;
    } else if (riskScore >= 3) {
      return this.RISK_LEVELS.MEDIUM;
    } else {
      return this.RISK_LEVELS.LOW;
    }
  }

  /**
   * Extract exports from function content
   */
  extractExports(content) {
    const exports = [];
    
    // Match export patterns
    const exportPatterns = [
      /export\s+(?:const|function|class)\s+(\w+)/g,
      /exports\.(\w+)\s*=/g,
      /module\.exports\.(\w+)\s*=/g
    ];
    
    for (const pattern of exportPatterns) {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        exports.push(match[1]);
      }
    }
    
    return [...new Set(exports)]; // Remove duplicates
  }

  /**
   * Extract imports from function content
   */
  extractImports(content) {
    const imports = [];
    
    // Match import patterns
    const importPatterns = [
      /import.*from\s+['"]([^'"]+)['"]/g,
      /require\(['"]([^'"]+)['"]\)/g
    ];
    
    for (const pattern of importPatterns) {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        imports.push(match[1]);
      }
    }
    
    return [...new Set(imports)]; // Remove duplicates
  }

  /**
   * Analyze cross-function dependencies
   */
  async analyzeDependencies() {
    console.log('🔗 Analyzing function dependencies...');
    
    for (const [functionName, functionInfo] of this.inventory) {
      const deps = await this.findFunctionDependencies(functionName, functionInfo);
      this.dependencies.set(functionName, deps);
      functionInfo.dependencies = deps;
    }
    
    console.log('📊 Dependency analysis complete');
  }

  /**
   * Find dependencies for a specific function
   */
  async findFunctionDependencies(functionName, functionInfo) {
    const deps = {
      internalFunctions: [],
      externalServices: [],
      sharedModules: [],
      crossSubmodule: []
    };
    
    try {
      const content = await fs.readFile(functionInfo.fullPath, 'utf8');
      
      // Find internal function calls
      for (const [otherFunctionName] of this.inventory) {
        if (otherFunctionName !== functionName && content.includes(otherFunctionName)) {
          deps.internalFunctions.push(otherFunctionName);
          
          // Check if it's a cross-submodule dependency
          const otherFunction = this.inventory.get(otherFunctionName);
          if (otherFunction.targetSubmodule !== functionInfo.targetSubmodule) {
            deps.crossSubmodule.push({
              function: otherFunctionName,
              targetSubmodule: otherFunction.targetSubmodule
            });
          }
        }
      }
      
      // Find external service dependencies
      const externalServices = [
        'firebase-admin',
        'firebase-functions',
        '@anthropic-ai/sdk',
        'stripe',
        'calendly',
        'google-auth-library',
        'nodemailer'
      ];
      
      for (const service of externalServices) {
        if (content.includes(service)) {
          deps.externalServices.push(service);
        }
      }
      
      // Find shared module dependencies
      const sharedModules = [
        '../services/',
        '../middleware/',
        '../utils/',
        '../types/',
        '../config/'
      ];
      
      for (const module of sharedModules) {
        if (content.includes(module)) {
          deps.sharedModules.push(module);
        }
      }
      
    } catch (error) {
      console.error(`❌ Error analyzing dependencies for ${functionName}:`, error);
    }
    
    return deps;
  }

  /**
   * Update migration status for a function
   */
  async updateMigrationStatus(functionName, status, notes = null) {
    if (!this.inventory.has(functionName)) {
      throw new Error(`Function ${functionName} not found in inventory`);
    }
    
    const functionInfo = this.inventory.get(functionName);
    const previousStatus = functionInfo.status;
    
    functionInfo.status = status;
    functionInfo.lastUpdated = new Date().toISOString();
    
    if (notes) {
      functionInfo.migrationNotes.push({
        timestamp: new Date().toISOString(),
        status: status,
        notes: notes
      });
    }
    
    // Log the status change
    this.addMigrationLogEntry('STATUS_CHANGE', `${functionName}: ${previousStatus} → ${status}`, {
      function: functionName,
      previousStatus: previousStatus,
      newStatus: status,
      notes: notes
    });
    
    // Save state
    await this.saveState();
    
    console.log(`📝 Updated ${functionName} status: ${previousStatus} → ${status}`);
  }

  /**
   * Add migration log entry
   */
  addMigrationLogEntry(type, message, metadata = {}) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      type: type,
      message: message,
      metadata: metadata
    };
    
    this.migrationLog.push(logEntry);
    
    // Keep log size manageable (last 1000 entries)
    if (this.migrationLog.length > 1000) {
      this.migrationLog = this.migrationLog.slice(-1000);
    }
  }

  /**
   * Generate comprehensive status report
   */
  async generateStatusReport() {
    const report = {
      summary: this.generateSummary(),
      bySubmodule: this.generateSubmoduleBreakdown(),
      byStatus: this.generateStatusBreakdown(),
      byRiskLevel: this.generateRiskBreakdown(),
      dependencies: this.generateDependencyReport(),
      recommendations: this.generateRecommendations(),
      generatedAt: new Date().toISOString()
    };
    
    // Save detailed report
    const reportFile = path.join(this.logsPath, `migration-status-${Date.now()}.json`);
    await fs.writeFile(reportFile, JSON.stringify(report, null, 2));
    
    // Save latest report
    const latestReportFile = path.join(this.logsPath, 'latest-status-report.json');
    await fs.writeFile(latestReportFile, JSON.stringify(report, null, 2));
    
    console.log('📊 Migration status report generated');
    return report;
  }

  /**
   * Generate summary statistics
   */
  generateSummary() {
    const total = this.inventory.size;
    const statusCounts = {};
    const riskCounts = {};
    const submoduleCounts = {};
    
    for (const status of Object.values(this.STATUS)) {
      statusCounts[status] = 0;
    }
    
    for (const risk of Object.values(this.RISK_LEVELS)) {
      riskCounts[risk] = 0;
    }
    
    for (const [functionName, functionInfo] of this.inventory) {
      statusCounts[functionInfo.status]++;
      riskCounts[functionInfo.riskLevel]++;
      
      if (!submoduleCounts[functionInfo.targetSubmodule]) {
        submoduleCounts[functionInfo.targetSubmodule] = 0;
      }
      submoduleCounts[functionInfo.targetSubmodule]++;
    }
    
    return {
      totalFunctions: total,
      statusBreakdown: statusCounts,
      riskBreakdown: riskCounts,
      submoduleBreakdown: submoduleCounts,
      completionPercentage: Math.round(((statusCounts.verified || 0) / total) * 100),
      migrationProgress: Math.round((((statusCounts.migrated || 0) + (statusCounts.verified || 0)) / total) * 100)
    };
  }

  /**
   * Generate submodule breakdown
   */
  generateSubmoduleBreakdown() {
    const breakdown = {};
    
    for (const [functionName, functionInfo] of this.inventory) {
      if (!breakdown[functionInfo.targetSubmodule]) {
        breakdown[functionInfo.targetSubmodule] = {
          functions: [],
          statusCounts: {},
          riskCounts: {},
          totalFunctions: 0
        };
        
        for (const status of Object.values(this.STATUS)) {
          breakdown[functionInfo.targetSubmodule].statusCounts[status] = 0;
        }
        
        for (const risk of Object.values(this.RISK_LEVELS)) {
          breakdown[functionInfo.targetSubmodule].riskCounts[risk] = 0;
        }
      }
      
      const submoduleInfo = breakdown[functionInfo.targetSubmodule];
      submoduleInfo.functions.push({
        name: functionName,
        status: functionInfo.status,
        riskLevel: functionInfo.riskLevel,
        size: functionInfo.size,
        lastModified: functionInfo.lastModified
      });
      
      submoduleInfo.statusCounts[functionInfo.status]++;
      submoduleInfo.riskCounts[functionInfo.riskLevel]++;
      submoduleInfo.totalFunctions++;
    }
    
    return breakdown;
  }

  /**
   * Generate status breakdown
   */
  generateStatusBreakdown() {
    const breakdown = {};
    
    for (const status of Object.values(this.STATUS)) {
      breakdown[status] = [];
    }
    
    for (const [functionName, functionInfo] of this.inventory) {
      breakdown[functionInfo.status].push({
        name: functionName,
        targetSubmodule: functionInfo.targetSubmodule,
        riskLevel: functionInfo.riskLevel,
        size: functionInfo.size,
        lastModified: functionInfo.lastModified
      });
    }
    
    return breakdown;
  }

  /**
   * Generate risk breakdown
   */
  generateRiskBreakdown() {
    const breakdown = {};
    
    for (const risk of Object.values(this.RISK_LEVELS)) {
      breakdown[risk] = [];
    }
    
    for (const [functionName, functionInfo] of this.inventory) {
      breakdown[functionInfo.riskLevel].push({
        name: functionName,
        targetSubmodule: functionInfo.targetSubmodule,
        status: functionInfo.status,
        size: functionInfo.size,
        dependencies: functionInfo.dependencies
      });
    }
    
    return breakdown;
  }

  /**
   * Generate dependency report
   */
  generateDependencyReport() {
    const report = {
      crossSubmoduleDependencies: [],
      circularDependencies: [],
      sharedModuleUsage: {},
      externalServiceUsage: {}
    };
    
    // Analyze cross-submodule dependencies
    for (const [functionName, deps] of this.dependencies) {
      if (deps.crossSubmodule && deps.crossSubmodule.length > 0) {
        const functionInfo = this.inventory.get(functionName);
        report.crossSubmoduleDependencies.push({
          function: functionName,
          sourceSubmodule: functionInfo.targetSubmodule,
          dependencies: deps.crossSubmodule
        });
      }
      
      // Track shared module usage
      for (const module of deps.sharedModules || []) {
        if (!report.sharedModuleUsage[module]) {
          report.sharedModuleUsage[module] = [];
        }
        report.sharedModuleUsage[module].push(functionName);
      }
      
      // Track external service usage
      for (const service of deps.externalServices || []) {
        if (!report.externalServiceUsage[service]) {
          report.externalServiceUsage[service] = [];
        }
        report.externalServiceUsage[service].push(functionName);
      }
    }
    
    return report;
  }

  /**
   * Generate migration recommendations
   */
  generateRecommendations() {
    const recommendations = [];
    
    // Analyze migration readiness
    const riskBreakdown = this.generateRiskBreakdown();
    const summary = this.generateSummary();
    
    // Recommend starting with low-risk functions
    if (riskBreakdown.low.length > 0) {
      const readyFunctions = riskBreakdown.low.filter(f => f.status === this.STATUS.PENDING);
      if (readyFunctions.length > 0) {
        recommendations.push({
          type: 'MIGRATION_ORDER',
          priority: 'HIGH',
          title: 'Start with Low-Risk Functions',
          description: `${readyFunctions.length} low-risk functions are ready for migration`,
          functions: readyFunctions.map(f => f.name),
          action: 'Begin migration with these low-risk functions to establish process and gain confidence'
        });
      }
    }
    
    // Recommend addressing critical risk functions
    if (riskBreakdown.critical.length > 0) {
      recommendations.push({
        type: 'RISK_MITIGATION',
        priority: 'CRITICAL',
        title: 'Address Critical Risk Functions',
        description: `${riskBreakdown.critical.length} functions have critical risk levels`,
        functions: riskBreakdown.critical.map(f => f.name),
        action: 'Create detailed migration plans and extensive testing for these functions'
      });
    }
    
    // Recommend dependency resolution
    const depReport = this.generateDependencyReport();
    if (depReport.crossSubmoduleDependencies.length > 0) {
      recommendations.push({
        type: 'DEPENDENCY_RESOLUTION',
        priority: 'HIGH',
        title: 'Resolve Cross-Submodule Dependencies',
        description: `${depReport.crossSubmoduleDependencies.length} functions have cross-submodule dependencies`,
        action: 'Plan migration order to minimize breaking changes'
      });
    }
    
    return recommendations;
  }

  /**
   * Get migration readiness score for a function
   */
  getMigrationReadiness(functionName) {
    if (!this.inventory.has(functionName)) {
      return null;
    }
    
    const functionInfo = this.inventory.get(functionName);
    const deps = this.dependencies.get(functionName) || {};
    
    let score = 100;
    
    // Risk level impact
    switch (functionInfo.riskLevel) {
      case this.RISK_LEVELS.CRITICAL:
        score -= 40;
        break;
      case this.RISK_LEVELS.HIGH:
        score -= 25;
        break;
      case this.RISK_LEVELS.MEDIUM:
        score -= 15;
        break;
      case this.RISK_LEVELS.LOW:
        score -= 5;
        break;
    }
    
    // Cross-submodule dependencies impact
    if (deps.crossSubmodule && deps.crossSubmodule.length > 0) {
      score -= deps.crossSubmodule.length * 10;
    }
    
    // External service dependencies (moderate impact)
    if (deps.externalServices && deps.externalServices.length > 0) {
      score -= deps.externalServices.length * 5;
    }
    
    // Function size impact
    if (functionInfo.size > 10000) { // Large file
      score -= 15;
    } else if (functionInfo.size > 5000) { // Medium file
      score -= 10;
    }
    
    return Math.max(0, score);
  }

  /**
   * Get functions ready for migration
   */
  getFunctionsReadyForMigration(minReadinessScore = 70) {
    const ready = [];
    
    for (const [functionName, functionInfo] of this.inventory) {
      if (functionInfo.status === this.STATUS.PENDING) {
        const readiness = this.getMigrationReadiness(functionName);
        if (readiness >= minReadinessScore) {
          ready.push({
            name: functionName,
            readinessScore: readiness,
            targetSubmodule: functionInfo.targetSubmodule,
            riskLevel: functionInfo.riskLevel,
            size: functionInfo.size
          });
        }
      }
    }
    
    // Sort by readiness score (highest first)
    return ready.sort((a, b) => b.readinessScore - a.readinessScore);
  }
}

module.exports = MigrationTracker;

// CLI support
if (require.main === module) {
  const tracker = new MigrationTracker();
  
  const command = process.argv[2];
  
  switch (command) {
    case 'init':
      tracker.initialize().then(() => {
        console.log('✅ Migration tracker initialized successfully');
      }).catch(error => {
        console.error('❌ Initialization failed:', error);
        process.exit(1);
      });
      break;
      
    case 'status':
      tracker.initialize().then(() => {
        return tracker.generateStatusReport();
      }).then(report => {
        console.log('\n📊 MIGRATION STATUS REPORT\n');
        console.log(`Total Functions: ${report.summary.totalFunctions}`);
        console.log(`Migration Progress: ${report.summary.migrationProgress}%`);
        console.log(`Completion Rate: ${report.summary.completionPercentage}%`);
        console.log('\nStatus Breakdown:');
        for (const [status, count] of Object.entries(report.summary.statusBreakdown)) {
          console.log(`  ${status}: ${count}`);
        }
        console.log('\nRisk Breakdown:');
        for (const [risk, count] of Object.entries(report.summary.riskBreakdown)) {
          console.log(`  ${risk}: ${count}`);
        }
        
        if (report.recommendations.length > 0) {
          console.log('\n💡 RECOMMENDATIONS:');
          report.recommendations.forEach((rec, index) => {
            console.log(`${index + 1}. [${rec.priority}] ${rec.title}`);
            console.log(`   ${rec.description}`);
            console.log(`   Action: ${rec.action}\n`);
          });
        }
      }).catch(error => {
        console.error('❌ Status report failed:', error);
        process.exit(1);
      });
      break;
      
    case 'ready':
      const minScore = parseInt(process.argv[3]) || 70;
      tracker.initialize().then(() => {
        const ready = tracker.getFunctionsReadyForMigration(minScore);
        console.log(`\n🚀 FUNCTIONS READY FOR MIGRATION (min score: ${minScore})\n`);
        
        if (ready.length === 0) {
          console.log('No functions meet the readiness criteria.');
        } else {
          ready.forEach((func, index) => {
            console.log(`${index + 1}. ${func.name} (Score: ${func.readinessScore})`);
            console.log(`   Target: ${func.targetSubmodule} | Risk: ${func.riskLevel} | Size: ${func.size} bytes`);
          });
        }
      }).catch(error => {
        console.error('❌ Ready analysis failed:', error);
        process.exit(1);
      });
      break;
      
    default:
      console.log(`
CVPlus Migration Tracker

Usage:
  node migration-tracker.js init     - Initialize tracking system
  node migration-tracker.js status   - Generate status report
  node migration-tracker.js ready [score] - List functions ready for migration

Examples:
  node migration-tracker.js init
  node migration-tracker.js status
  node migration-tracker.js ready 80
      `);
  }
}