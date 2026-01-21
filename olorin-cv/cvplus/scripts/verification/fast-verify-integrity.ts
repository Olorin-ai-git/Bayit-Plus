#!/usr/bin/env node

/**
 * Fast Automated Integrity Verification System
 *
 * Optimized for performance with:
 * - Parallel processing
 * - Cached results
 * - Incremental updates
 * - Timeout prevention
 * - Progress tracking
 */

import { promises as fs } from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import * as yaml from 'js-yaml';

interface VerificationConfig {
  projectRoot: string;
  specsDir: string;
  specifyDir: string;
  cacheDir: string;
  timeout: number;
  maxParallel: number;
  enableCache: boolean;
}

interface SpecInfo {
  name: string;
  path: string;
  files: {
    required: string[];
    optional: string[];
    contracts: string[];
  };
  lastModified: number;
}

interface VerificationResult {
  specName: string;
  status: 'complete' | 'partial' | 'missing' | 'error';
  compliance: number; // 0-100
  issues: string[];
  evidence: {
    apis: { endpoint: string; implemented: boolean; files: string[] }[];
    entities: { name: string; defined: boolean; files: string[] }[];
    tasks: { id: string; description: string; implemented: boolean }[];
  };
  performance: {
    duration: number;
    filesScanned: number;
    cacheHits: number;
  };
}

interface CacheEntry {
  hash: string;
  result: VerificationResult;
  timestamp: number;
}

class FastIntegrityVerifier {
  private config: VerificationConfig;
  private cache: Map<string, CacheEntry> = new Map();
  private progressCallback?: (progress: number, message: string) => void;

  constructor(config: VerificationConfig) {
    this.config = config;
    this.loadCache();
  }

  /**
   * Main verification entry point with parallel processing
   */
  async verifyAll(progressCallback?: (progress: number, message: string) => void): Promise<VerificationResult[]> {
    this.progressCallback = progressCallback;
    const startTime = Date.now();

    this.progress(0, 'Initializing verification system...');

    // Discover all specifications
    const specs = await this.discoverSpecs();
    this.progress(10, `Found ${specs.length} specifications`);

    // Process specifications in batches to avoid timeouts
    const batchSize = Math.min(this.config.maxParallel, specs.length);
    const results: VerificationResult[] = [];

    for (let i = 0; i < specs.length; i += batchSize) {
      const batch = specs.slice(i, i + batchSize);
      const batchPromises = batch.map(spec => this.verifySpec(spec));

      this.progress(
        10 + (i / specs.length) * 80,
        `Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(specs.length / batchSize)}`
      );

      const batchResults = await Promise.allSettled(batchPromises);

      for (const result of batchResults) {
        if (result.status === 'fulfilled') {
          results.push(result.value);
        } else {
          console.error('Batch processing error:', result.reason);
        }
      }
    }

    // Save cache and generate report
    await this.saveCache();
    this.progress(95, 'Generating report...');

    const duration = Date.now() - startTime;
    this.progress(100, `Verification complete in ${duration}ms`);

    return results;
  }

  /**
   * Verify individual specification with caching
   */
  private async verifySpec(spec: SpecInfo): Promise<VerificationResult> {
    const specHash = await this.calculateSpecHash(spec);

    // Check cache first
    if (this.config.enableCache && this.cache.has(spec.name)) {
      const cached = this.cache.get(spec.name)!;
      if (cached.hash === specHash && Date.now() - cached.timestamp < 300000) { // 5 min cache
        cached.result.performance.cacheHits++;
        return cached.result;
      }
    }

    const startTime = Date.now();
    let filesScanned = 0;

    try {
      const result: VerificationResult = {
        specName: spec.name,
        status: 'complete',
        compliance: 0,
        issues: [],
        evidence: { apis: [], entities: [], tasks: [] },
        performance: { duration: 0, filesScanned: 0, cacheHits: 0 }
      };

      // Verify file inventory
      await this.verifyFileInventory(spec, result);

      // Verify API contracts (parallel)
      const contractsPromise = this.verifyApiContracts(spec, result);

      // Verify data models (parallel)
      const entitiesPromise = this.verifyDataModels(spec, result);

      // Verify task implementation (parallel)
      const tasksPromise = this.verifyTaskImplementation(spec, result);

      await Promise.all([contractsPromise, entitiesPromise, tasksPromise]);

      // Enhanced logging verification for comprehensive-logging spec
      if (spec.name === '003-a-comprehensive-logging') {
        await this.verifyLoggingImplementation(spec, result);
      }

      // Calculate compliance score
      result.compliance = this.calculateCompliance(result);
      result.performance.duration = Date.now() - startTime;
      result.performance.filesScanned = filesScanned;

      // Cache result
      if (this.config.enableCache) {
        this.cache.set(spec.name, {
          hash: specHash,
          result,
          timestamp: Date.now()
        });
      }

      return result;

    } catch (error) {
      return {
        specName: spec.name,
        status: 'error',
        compliance: 0,
        issues: [`Verification error: ${error instanceof Error ? error.message : String(error)}`],
        evidence: { apis: [], entities: [], tasks: [] },
        performance: { duration: Date.now() - startTime, filesScanned, cacheHits: 0 }
      };
    }
  }

  /**
   * Fast file discovery with filtering
   */
  private async discoverSpecs(): Promise<SpecInfo[]> {
    const specsPath = this.config.specsDir;
    const entries = await fs.readdir(specsPath, { withFileTypes: true });

    const specs: SpecInfo[] = [];

    for (const entry of entries) {
      if (entry.isDirectory() && !entry.name.includes('node_modules')) {
        const specPath = path.join(specsPath, entry.name);
        const stat = await fs.stat(specPath);

        // Fast file enumeration
        const files = await this.enumerateSpecFiles(specPath);

        specs.push({
          name: entry.name,
          path: specPath,
          files,
          lastModified: stat.mtime.getTime()
        });
      }
    }

    return specs.sort((a, b) => a.name.localeCompare(b.name));
  }

  /**
   * Optimized file enumeration
   */
  private async enumerateSpecFiles(specPath: string): Promise<SpecInfo['files']> {
    const files = {
      required: [] as string[],
      optional: [] as string[],
      contracts: [] as string[]
    };

    try {
      const entries = await fs.readdir(specPath);
      const requiredFiles = ['spec.md', 'plan.md'];
      const optionalFiles = ['tasks.md', 'data-model.md', 'quickstart.md', 'research.md'];

      for (const entry of entries) {
        if (requiredFiles.includes(entry)) {
          files.required.push(entry);
        } else if (optionalFiles.includes(entry)) {
          files.optional.push(entry);
        }
      }

      // Check for contracts directory
      const contractsPath = path.join(specPath, 'contracts');
      try {
        const contractFiles = await fs.readdir(contractsPath);
        files.contracts = contractFiles.filter(f => f.endsWith('.yaml') || f.endsWith('.yml'));
      } catch {
        // No contracts directory
      }
    } catch (error) {
      console.warn(`Error enumerating files for ${specPath}:`, error instanceof Error ? error.message : String(error));
    }

    return files;
  }

  /**
   * Enhanced logging implementation verification
   * Detects logging components, APIs, package integrations, and specialized loggers
   */
  private async verifyLoggingImplementation(spec: SpecInfo, result: VerificationResult): Promise<void> {
    // Package-specific loggers verification (T027-T038)
    const packageLoggers = [
      'AuthLogger', 'I18nLogger', 'ProcessingLogger', 'MultimediaLogger',
      'AnalyticsLogger', 'PremiumLogger', 'RecommendationsLogger',
      'ProfilesLogger', 'AdminLogger', 'WorkflowLogger', 'PaymentsLogger'
    ];

    for (const logger of packageLoggers) {
      const evidence = await this.findLoggingComponentEvidence(logger);
      result.evidence.entities.push({
        name: `${logger} (Package Integration)`,
        defined: evidence.length > 0,
        files: evidence
      });
    }

    // Core logging infrastructure verification
    const coreComponents = [
      'LoggerFactory', 'CorrelationService', 'PiiRedaction', 'LogFormatter',
      'FirebaseTransport', 'LogStream', 'AlertRule', 'AuditTrail'
    ];

    for (const component of coreComponents) {
      const evidence = await this.findLoggingComponentEvidence(component);
      result.evidence.entities.push({
        name: `${component} (Core Infrastructure)`,
        defined: evidence.length > 0,
        files: evidence
      });
    }

    // Specialized loggers verification
    const specializedLoggers = [
      'SecurityLogger', 'FunctionLogger', 'PaymentLogger'
    ];

    for (const logger of specializedLoggers) {
      const evidence = await this.findLoggingComponentEvidence(logger);
      result.evidence.entities.push({
        name: `${logger} (Specialized)`,
        defined: evidence.length > 0,
        files: evidence
      });
    }

    // Logging API endpoints verification
    const loggingEndpoints = [
      '/api/logs/search', '/api/logs/stream', '/api/logs/export',
      '/api/logs/query', '/api/logs/batch', '/api/alerts/configure'
    ];

    for (const endpoint of loggingEndpoints) {
      const evidence = await this.findApiEvidence(endpoint);
      result.evidence.apis.push({
        endpoint: endpoint,
        implemented: evidence.length > 0,
        files: evidence
      });
    }

    // Frontend logging integration verification
    const frontendComponents = [
      'LogDashboard', 'LogsViewerDashboard', 'LogMetricsCards',
      'LogShippingService', 'ErrorBoundary.*logging'
    ];

    for (const component of frontendComponents) {
      const evidence = await this.findLoggingComponentEvidence(component);
      result.evidence.entities.push({
        name: `${component} (Frontend Integration)`,
        defined: evidence.length > 0,
        files: evidence
      });
    }

    // LogEntry model verification (critical missing component)
    const logEntryEvidence = await this.findLoggingComponentEvidence('LogEntry');
    result.evidence.entities.push({
      name: 'LogEntry (Core Model)',
      defined: logEntryEvidence.length > 0,
      files: logEntryEvidence
    });
  }

  /**
   * Find evidence for logging components with specialized patterns
   */
  private async findLoggingComponentEvidence(componentName: string): Promise<string[]> {
    const patterns = [
      `class ${componentName}`,
      `interface ${componentName}`,
      `export.*${componentName}`,
      `${componentName}\\.ts`,
      `import.*${componentName}`,
      `const.*${componentName}`,
      `function ${componentName}`
    ];

    const results: string[] = [];

    for (const pattern of patterns) {
      try {
        const command = this.isRipgrepAvailable()
          ? `rg -l "${pattern}" --type ts --type js ${this.config.projectRoot}`
          : `find ${this.config.projectRoot} -type f \\( -name "*.ts" -o -name "*.js" \\) -not -path "*/node_modules/*" -exec grep -l "${pattern}" {} \\;`;

        const output = execSync(command, {
          encoding: 'utf-8',
          timeout: 3000,
          cwd: this.config.projectRoot
        }).trim();

        if (output) {
          results.push(...output.split('\n').map(f => path.relative(this.config.projectRoot, f)));
        }
      } catch {
        // Pattern not found - continue with next pattern
      }
    }

    return [...new Set(results)]; // Remove duplicates
  }

  /**
   * Fast API contract verification with optimized search
   */
  private async verifyApiContracts(spec: SpecInfo, result: VerificationResult): Promise<void> {
    if (spec.files.contracts.length === 0) return;

    for (const contractFile of spec.files.contracts) {
      const contractPath = path.join(spec.path, 'contracts', contractFile);

      try {
        const contractContent = await fs.readFile(contractPath, 'utf-8');
        const contract = yaml.load(contractContent) as any;

        if (contract.paths) {
          for (const endpoint of Object.keys(contract.paths)) {
            const evidence = await this.findApiEvidence(endpoint);
            result.evidence.apis.push({
              endpoint,
              implemented: evidence.length > 0,
              files: evidence
            });
          }
        }
      } catch (error) {
        result.issues.push(`Contract parsing error in ${contractFile}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  }

  /**
   * Optimized API evidence search with ripgrep
   */
  private async findApiEvidence(endpoint: string): Promise<string[]> {
    const escapedEndpoint = endpoint.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    try {
      // Use ripgrep for fast search (fallback to grep if not available)
      const command = this.isRipgrepAvailable()
        ? `rg -l "${escapedEndpoint}" --type ts --type js --type json ${this.config.projectRoot}`
        : `find ${this.config.projectRoot} -type f \\( -name "*.ts" -o -name "*.js" -o -name "*.json" \\) -not -path "*/node_modules/*" -exec grep -l "${escapedEndpoint}" {} \\;`;

      const output = execSync(command, {
        encoding: 'utf-8',
        timeout: 5000,
        cwd: this.config.projectRoot
      }).trim();

      return output ? output.split('\n').map(f => path.relative(this.config.projectRoot, f)) : [];
    } catch {
      return [];
    }
  }

  /**
   * Fast data model verification
   */
  private async verifyDataModels(spec: SpecInfo, result: VerificationResult): Promise<void> {
    const dataModelPath = path.join(spec.path, 'data-model.md');

    try {
      await fs.access(dataModelPath);
      const content = await fs.readFile(dataModelPath, 'utf-8');

      // Extract entity names using regex
      const entityMatches = content.match(/^##\s+([A-Z][a-zA-Z]+(?:\s+Entity|\s+Model)?)/gm) || [];

      for (const match of entityMatches) {
        const entityName = match.replace(/^##\s+/, '').replace(/\s+(Entity|Model)$/, '');
        const evidence = await this.findEntityEvidence(entityName);

        result.evidence.entities.push({
          name: entityName,
          defined: evidence.length > 0,
          files: evidence
        });
      }
    } catch {
      // No data model file
    }
  }

  /**
   * Fast entity evidence search
   */
  private async findEntityEvidence(entityName: string): Promise<string[]> {
    const patterns = [
      `interface ${entityName}`,
      `type ${entityName}`,
      `class ${entityName}`
    ];

    const results: string[] = [];

    for (const pattern of patterns) {
      try {
        const command = this.isRipgrepAvailable()
          ? `rg -l "${pattern}" --type ts ${this.config.projectRoot}`
          : `find ${this.config.projectRoot} -name "*.ts" -not -path "*/node_modules/*" -exec grep -l "${pattern}" {} \\;`;

        const output = execSync(command, {
          encoding: 'utf-8',
          timeout: 3000,
          cwd: this.config.projectRoot
        }).trim();

        if (output) {
          results.push(...output.split('\n').map(f => path.relative(this.config.projectRoot, f)));
        }
      } catch {
        // Pattern not found
      }
    }

    return [...new Set(results)]; // Remove duplicates
  }

  /**
   * Fast task verification
   */
  private async verifyTaskImplementation(spec: SpecInfo, result: VerificationResult): Promise<void> {
    const tasksPath = path.join(spec.path, 'tasks.md');

    try {
      await fs.access(tasksPath);
      const content = await fs.readFile(tasksPath, 'utf-8');

      // Extract numbered tasks
      const taskMatches = content.match(/^(\d+)\.\s+(.+)$/gm) || [];

      for (const match of taskMatches.slice(0, 10)) { // Limit to first 10 tasks for performance
        const [, id, description] = match.match(/^(\d+)\.\s+(.+)$/) || [];

        // Extract key terms for searching
        const keyTerms = description.match(/[A-Z][a-zA-Z]{2,}|[a-z]+[A-Z][a-zA-Z]+/g) || [];
        const hasEvidence = keyTerms.length > 0 && await this.hasTaskEvidence(keyTerms.slice(0, 3));

        result.evidence.tasks.push({
          id,
          description: description.substring(0, 100), // Truncate for performance
          implemented: hasEvidence
        });
      }
    } catch {
      // No tasks file
    }
  }

  /**
   * Quick task evidence check
   */
  private async hasTaskEvidence(keyTerms: string[]): Promise<boolean> {
    if (keyTerms.length === 0) return false;

    try {
      const pattern = keyTerms.join('|');
      const command = this.isRipgrepAvailable()
        ? `rg -q "${pattern}" --type ts --type js ${this.config.projectRoot}`
        : `find ${this.config.projectRoot} -type f \\( -name "*.ts" -o -name "*.js" \\) -not -path "*/node_modules/*" -exec grep -q -E "${pattern}" {} \\; -print -quit`;

      execSync(command, {
        timeout: 2000,
        cwd: this.config.projectRoot,
        stdio: 'ignore'
      });

      return true;
    } catch {
      return false;
    }
  }

  /**
   * File inventory verification
   */
  private async verifyFileInventory(spec: SpecInfo, result: VerificationResult): Promise<void> {
    const requiredFiles = ['spec.md', 'plan.md'];
    const missingRequired = requiredFiles.filter(f => !spec.files.required.includes(f));

    if (missingRequired.length > 0) {
      result.issues.push(`Missing required files: ${missingRequired.join(', ')}`);
      result.status = 'partial';
    }

    if (spec.files.contracts.length === 0 && spec.files.required.length === 0) {
      result.status = 'missing';
    }
  }

  /**
   * Calculate compliance score
   */
  private calculateCompliance(result: VerificationResult): number {
    let score = 0;
    let total = 0;

    // File inventory (30%)
    if (result.issues.filter(i => i.includes('Missing required')).length === 0) {
      score += 30;
    }
    total += 30;

    // API implementation (40%)
    if (result.evidence.apis.length > 0) {
      const implementedApis = result.evidence.apis.filter(api => api.implemented).length;
      score += (implementedApis / result.evidence.apis.length) * 40;
    }
    total += 40;

    // Entity definitions (20%)
    if (result.evidence.entities.length > 0) {
      const definedEntities = result.evidence.entities.filter(entity => entity.defined).length;
      score += (definedEntities / result.evidence.entities.length) * 20;
    }
    total += 20;

    // Task implementation (10%)
    if (result.evidence.tasks.length > 0) {
      const implementedTasks = result.evidence.tasks.filter(task => task.implemented).length;
      score += (implementedTasks / result.evidence.tasks.length) * 10;
    }
    total += 10;

    return total > 0 ? Math.round((score / total) * 100) : 0;
  }

  /**
   * Cache management
   */
  private async calculateSpecHash(spec: SpecInfo): Promise<string> {
    const crypto = require('crypto');
    const hashData = `${spec.name}:${spec.lastModified}:${JSON.stringify(spec.files)}`;
    return crypto.createHash('md5').update(hashData).digest('hex');
  }

  private async loadCache(): Promise<void> {
    if (!this.config.enableCache) return;

    try {
      const cacheFile = path.join(this.config.cacheDir, 'integrity-verification.json');
      const content = await fs.readFile(cacheFile, 'utf-8');
      const data = JSON.parse(content);

      for (const [key, value] of Object.entries(data)) {
        this.cache.set(key, value as CacheEntry);
      }
    } catch {
      // No cache file or invalid cache
    }
  }

  private async saveCache(): Promise<void> {
    if (!this.config.enableCache) return;

    try {
      await fs.mkdir(this.config.cacheDir, { recursive: true });
      const cacheFile = path.join(this.config.cacheDir, 'integrity-verification.json');
      const data = Object.fromEntries(this.cache);
      await fs.writeFile(cacheFile, JSON.stringify(data, null, 2));
    } catch (error) {
      console.warn('Failed to save cache:', error instanceof Error ? error.message : String(error));
    }
  }

  private isRipgrepAvailable(): boolean {
    try {
      execSync('which rg', { stdio: 'ignore' });
      return true;
    } catch {
      return false;
    }
  }

  private progress(percent: number, message: string): void {
    if (this.progressCallback) {
      this.progressCallback(percent, message);
    }
  }
}

/**
 * CLI Interface
 */
async function main() {
  const projectRoot = process.cwd();

  const config: VerificationConfig = {
    projectRoot,
    specsDir: path.join(projectRoot, 'specs'),
    specifyDir: path.join(projectRoot, '.specify'),
    cacheDir: path.join(projectRoot, '.cache', 'verification'),
    timeout: 30000, // 30 seconds per spec
    maxParallel: 4,
    enableCache: true
  };

  console.log('🚀 Starting Fast Integrity Verification...\n');

  const verifier = new FastIntegrityVerifier(config);

  const progressBar = (percent: number, message: string) => {
    const width = 40;
    const filled = Math.round((percent / 100) * width);
    const bar = '█'.repeat(filled) + '░'.repeat(width - filled);
    process.stdout.write(`\r${bar} ${percent.toFixed(1)}% ${message}`);
    if (percent === 100) console.log(); // New line when complete
  };

  try {
    const startTime = Date.now();
    const results = await verifier.verifyAll(progressBar);
    const duration = Date.now() - startTime;

    console.log('\n📊 Verification Results Summary:\n');

    let totalCompliance = 0;
    let totalSpecs = results.length;

    for (const result of results) {
      const statusIcon = result.status === 'complete' ? '✅' :
                        result.status === 'partial' ? '⚠️' :
                        result.status === 'error' ? '❌' : '⚪';

      console.log(`${statusIcon} ${result.specName}: ${result.compliance}% compliant (${result.performance.duration}ms)`);

      if (result.issues.length > 0) {
        result.issues.forEach(issue => console.log(`   ⚠️ ${issue}`));
      }

      totalCompliance += result.compliance;
    }

    const averageCompliance = totalSpecs > 0 ? totalCompliance / totalSpecs : 0;

    console.log(`\n🎯 Overall Compliance: ${averageCompliance.toFixed(1)}%`);
    console.log(`⏱️ Total Duration: ${duration}ms`);
    console.log(`📁 Specifications Verified: ${totalSpecs}`);

    // Generate detailed report
    await generateDetailedReport(results, config, duration);
    console.log(`\n📄 Detailed report generated: integrity-verification-automated.md`);

  } catch (error) {
    console.error('\n❌ Verification failed:', error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

async function generateDetailedReport(
  results: VerificationResult[],
  config: VerificationConfig,
  duration: number
): Promise<void> {
  const reportPath = path.join(config.projectRoot, 'integrity-verification-automated.md');

  const report = [
    '# CVPlus Automated Integrity Verification Report',
    '',
    `**Generated**: ${new Date().toISOString()}`,
    `**Duration**: ${duration}ms`,
    `**Specifications**: ${results.length}`,
    `**Cache Enabled**: ${config.enableCache}`,
    '',
    '## Executive Summary',
    '',
    `Total specifications analyzed: ${results.length}`,
    `Average compliance: ${results.reduce((sum, r) => sum + r.compliance, 0) / results.length}%`,
    '',
    '## Detailed Results',
    ''
  ];

  for (const result of results) {
    report.push(`### ${result.specName}`);
    report.push('');
    report.push(`**Status**: ${result.status} | **Compliance**: ${result.compliance}%`);
    report.push(`**Duration**: ${result.performance.duration}ms | **Files Scanned**: ${result.performance.filesScanned} | **Cache Hits**: ${result.performance.cacheHits}`);
    report.push('');

    if (result.issues.length > 0) {
      report.push('**Issues**:');
      result.issues.forEach(issue => report.push(`- ${issue}`));
      report.push('');
    }

    if (result.evidence.apis.length > 0) {
      report.push('**API Endpoints**:');
      result.evidence.apis.forEach(api => {
        report.push(`- ${api.endpoint} ${api.implemented ? '✅' : '❌'}`);
      });
      report.push('');
    }

    if (result.evidence.entities.length > 0) {
      report.push('**Data Models**:');
      result.evidence.entities.forEach(entity => {
        report.push(`- ${entity.name} ${entity.defined ? '✅' : '❌'}`);
      });
      report.push('');
    }

    if (result.evidence.tasks.length > 0) {
      report.push('**Tasks**:');
      result.evidence.tasks.forEach(task => {
        report.push(`- Task ${task.id}: ${task.implemented ? '✅' : '❌'} ${task.description}`);
      });
      report.push('');
    }

    report.push('---');
    report.push('');
  }

  await fs.writeFile(reportPath, report.join('\n'));
}

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}

export { FastIntegrityVerifier, VerificationConfig, VerificationResult };