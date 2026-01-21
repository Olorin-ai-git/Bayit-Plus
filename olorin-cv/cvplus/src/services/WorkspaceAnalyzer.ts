/**
 * WorkspaceAnalyzer Service
 * Core service for analyzing workspace health and generating recovery assessments
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import {
  WorkspaceHealth,
  ModuleState,
  createWorkspaceHealth,
  createModuleState,
  calculateHealthScore,
  getModuleStatus,
  getRecoveryPriority,
  getRecoveryStrategy,
  MODULE_CATEGORIES
} from '../models';

export interface AnalysisOptions {
  includeHealthMetrics?: boolean;
  includeDependencyGraph?: boolean;
  includeErrorDetails?: boolean;
  includePerformanceMetrics?: boolean;
  moduleFilter?: string[];
  analysisDepth?: 'basic' | 'detailed' | 'comprehensive';
}

export interface AnalysisResult {
  workspaceHealth: WorkspaceHealth;
  analysisMetadata: AnalysisMetadata;
  recommendations: Recommendation[];
  criticalIssues: CriticalIssue[];
}

export interface AnalysisMetadata {
  analysisId: string;
  timestamp: string;
  analysisDuration: number; // Duration in milliseconds
  modulesAnalyzed: number;
  issuesFound: number;
  analysisVersion: string;
}

export interface Recommendation {
  recommendationId: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  category: 'build' | 'test' | 'dependency' | 'configuration' | 'performance';
  title: string;
  description: string;
  impact: string;
  effort: 'low' | 'medium' | 'high';
  estimatedTime: number; // Time in seconds
  affectedModules: string[];
  implementation: string;
  autoFixable: boolean;
}

export interface CriticalIssue {
  issueId: string;
  severity: 'high' | 'critical';
  category: 'build_failure' | 'dependency_missing' | 'configuration_error' | 'test_failure';
  title: string;
  description: string;
  affectedModules: string[];
  blocksRecovery: boolean;
  resolutionRequired: boolean;
  estimatedFixTime: number; // Time in seconds
}

export class WorkspaceAnalyzer {
  private workspacePath: string;
  private analysisCache: Map<string, AnalysisResult> = new Map();
  private readonly validModuleIds = [
    'auth', 'i18n', 'cv-processing', 'multimedia', 'analytics',
    'premium', 'public-profiles', 'recommendations', 'admin',
    'workflow', 'payments'
  ];

  constructor(workspacePath: string) {
    this.workspacePath = workspacePath;
  }

  /**
   * Analyze workspace health and generate comprehensive assessment
   */
  async analyzeWorkspace(options: AnalysisOptions = {}): Promise<AnalysisResult> {
    const startTime = Date.now();
    const analysisId = `analysis-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    try {
      // Step 1: Discover and validate modules
      const moduleStates = await this.analyzeAllModules(options);

      // Step 2: Create workspace health assessment
      const workspaceHealth = createWorkspaceHealth(this.workspacePath, moduleStates);

      // Step 3: Enhanced analysis based on options
      if (options.includeDependencyGraph) {
        await this.enhanceWithDependencyAnalysis(workspaceHealth);
      }

      if (options.includePerformanceMetrics) {
        await this.enhanceWithPerformanceAnalysis(workspaceHealth);
      }

      // Step 4: Generate recommendations and identify critical issues
      const recommendations = await this.generateRecommendations(workspaceHealth);
      const criticalIssues = await this.identifyCriticalIssues(workspaceHealth);

      // Step 5: Create analysis result
      const analysisResult: AnalysisResult = {
        workspaceHealth,
        analysisMetadata: {
          analysisId,
          timestamp: new Date().toISOString(),
          analysisDuration: Date.now() - startTime,
          modulesAnalyzed: Object.keys(moduleStates).length,
          issuesFound: criticalIssues.length + recommendations.length,
          analysisVersion: '1.0.0'
        },
        recommendations,
        criticalIssues
      };

      // Cache the result
      this.analysisCache.set(analysisId, analysisResult);

      return analysisResult;
    } catch (error) {
      throw new Error(`Workspace analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Analyze individual module health and state
   */
  async analyzeModule(moduleId: string): Promise<ModuleState> {
    if (!this.validModuleIds.includes(moduleId)) {
      throw new Error(`Invalid module ID: ${moduleId}`);
    }

    const moduleCategory = this.getModuleCategory(moduleId);
    const moduleState = createModuleState(moduleId, moduleCategory);
    const modulePath = path.join(this.workspacePath, 'packages', moduleId);

    try {
      // Check if module directory exists
      const moduleExists = await this.checkModuleExists(modulePath);
      if (!moduleExists) {
        moduleState.status = 'failed';
        moduleState.healthScore = 0;
        moduleState.criticalErrors.push({
          errorId: `missing-module-${moduleId}`,
          errorType: 'dependency_missing',
          severity: 'critical',
          message: `Module directory not found: ${modulePath}`,
          impact: 'blocks_functionality',
          firstOccurred: new Date().toISOString(),
          lastOccurred: new Date().toISOString(),
          occurrenceCount: 1,
          resolved: false
        });
        return moduleState;
      }

      // Analyze package.json
      await this.analyzePackageJson(modulePath, moduleState);

      // Analyze TypeScript configuration
      await this.analyzeTsConfig(modulePath, moduleState);

      // Analyze build configuration
      await this.analyzeBuildConfig(modulePath, moduleState);

      // Analyze dependencies
      await this.analyzeDependencies(modulePath, moduleState);

      // Analyze source code structure
      await this.analyzeSourceStructure(modulePath, moduleState);

      // Check for common issues
      await this.detectCommonIssues(modulePath, moduleState);

      // Calculate final health score
      moduleState.healthScore = calculateHealthScore(moduleState);
      moduleState.status = getModuleStatus(moduleState.healthScore);
      moduleState.recoveryState.recoveryPriority = getRecoveryPriority(moduleState);
      moduleState.recoveryState.recoveryStrategy = getRecoveryStrategy(moduleState);
      moduleState.recoveryState.recoveryNeeded = moduleState.healthScore < 85;

      moduleState.lastAssessment = new Date().toISOString();
      moduleState.lastModified = new Date().toISOString();

      return moduleState;
    } catch (error) {
      moduleState.status = 'unknown';
      moduleState.healthScore = 0;
      moduleState.criticalErrors.push({
        errorId: `analysis-error-${moduleId}`,
        errorType: 'configuration_invalid',
        severity: 'critical',
        message: `Module analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        impact: 'blocks_build',
        firstOccurred: new Date().toISOString(),
        lastOccurred: new Date().toISOString(),
        occurrenceCount: 1,
        resolved: false
      });
      return moduleState;
    }
  }

  /**
   * Validate workspace configuration and structure
   */
  async validateConfiguration(): Promise<{
    valid: boolean;
    errors: string[];
    warnings: string[];
    recommendations: string[];
  }> {
    const errors: string[] = [];
    const warnings: string[] = [];
    const recommendations: string[] = [];

    try {
      // Check root package.json
      const rootPackageJsonPath = path.join(this.workspacePath, 'package.json');
      const rootPackageExists = await this.fileExists(rootPackageJsonPath);

      if (!rootPackageExists) {
        errors.push('Root package.json not found');
      } else {
        try {
          const rootPackage = JSON.parse(await fs.readFile(rootPackageJsonPath, 'utf8'));

          // Check workspaces configuration
          if (!rootPackage.workspaces || !Array.isArray(rootPackage.workspaces)) {
            errors.push('Workspaces configuration missing or invalid in root package.json');
          } else if (!rootPackage.workspaces.includes('packages/*')) {
            warnings.push('packages/* not found in workspaces configuration');
          }

          // Check required scripts
          const requiredScripts = ['build', 'test', 'lint', 'type-check'];
          requiredScripts.forEach(script => {
            if (!rootPackage.scripts || !rootPackage.scripts[script]) {
              warnings.push(`Missing recommended script: ${script}`);
            }
          });
        } catch (error) {
          errors.push(`Invalid JSON in root package.json: ${error instanceof Error ? error.message : 'Parse error'}`);
        }
      }

      // Check root tsconfig.json
      const rootTsConfigPath = path.join(this.workspacePath, 'tsconfig.json');
      const rootTsConfigExists = await this.fileExists(rootTsConfigPath);

      if (!rootTsConfigExists) {
        warnings.push('Root tsconfig.json not found');
      } else {
        try {
          const tsConfig = JSON.parse(await fs.readFile(rootTsConfigPath, 'utf8'));

          // Check references
          if (!tsConfig.references || !Array.isArray(tsConfig.references)) {
            warnings.push('TypeScript project references not configured');
          }

          // Check path mappings
          if (!tsConfig.compilerOptions?.paths) {
            warnings.push('TypeScript path mappings not configured');
          }
        } catch (error) {
          errors.push(`Invalid JSON in root tsconfig.json: ${error instanceof Error ? error.message : 'Parse error'}`);
        }
      }

      // Check packages directory
      const packagesDir = path.join(this.workspacePath, 'packages');
      const packagesDirExists = await this.directoryExists(packagesDir);

      if (!packagesDirExists) {
        errors.push('packages/ directory not found');
      } else {
        // Check each expected module
        for (const moduleId of this.validModuleIds) {
          const modulePath = path.join(packagesDir, moduleId);
          const moduleExists = await this.directoryExists(modulePath);

          if (!moduleExists) {
            warnings.push(`Module directory missing: packages/${moduleId}`);
          }
        }
      }

      // Generate recommendations
      if (warnings.length > 0) {
        recommendations.push('Consider addressing configuration warnings to improve development experience');
      }

      if (errors.length === 0 && warnings.length === 0) {
        recommendations.push('Workspace configuration is optimal');
      }

      return {
        valid: errors.length === 0,
        errors,
        warnings,
        recommendations
      };
    } catch (error) {
      errors.push(`Configuration validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return {
        valid: false,
        errors,
        warnings,
        recommendations
      };
    }
  }

  /**
   * Create backup of workspace state
   */
  async createBackup(backupPath: string): Promise<{
    backupId: string;
    success: boolean;
    backupPath: string;
    timestamp: string;
    size: number;
    files: number;
  }> {
    const backupId = `backup-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const timestamp = new Date().toISOString();

    try {
      // Ensure backup directory exists
      await fs.mkdir(backupPath, { recursive: true });

      const backupDir = path.join(backupPath, backupId);
      await fs.mkdir(backupDir, { recursive: true });

      let totalFiles = 0;
      let totalSize = 0;

      // Backup key configuration files
      const filesToBackup = [
        'package.json',
        'tsconfig.json',
        'package-lock.json',
        'yarn.lock',
        'recovery-state.json'
      ];

      for (const file of filesToBackup) {
        const sourcePath = path.join(this.workspacePath, file);
        const targetPath = path.join(backupDir, file);

        if (await this.fileExists(sourcePath)) {
          await fs.copyFile(sourcePath, targetPath);
          const stats = await fs.stat(sourcePath);
          totalSize += stats.size;
          totalFiles++;
        }
      }

      // Backup packages directory structure (metadata only)
      const packagesDir = path.join(this.workspacePath, 'packages');
      if (await this.directoryExists(packagesDir)) {
        const packagesBackupDir = path.join(backupDir, 'packages');
        await fs.mkdir(packagesBackupDir, { recursive: true });

        for (const moduleId of this.validModuleIds) {
          const moduleDir = path.join(packagesDir, moduleId);
          if (await this.directoryExists(moduleDir)) {
            const moduleBackupDir = path.join(packagesBackupDir, moduleId);
            await fs.mkdir(moduleBackupDir, { recursive: true });

            // Backup package.json and tsconfig.json from each module
            const moduleFiles = ['package.json', 'tsconfig.json', 'tsup.config.ts'];
            for (const file of moduleFiles) {
              const sourcePath = path.join(moduleDir, file);
              const targetPath = path.join(moduleBackupDir, file);

              if (await this.fileExists(sourcePath)) {
                await fs.copyFile(sourcePath, targetPath);
                const stats = await fs.stat(sourcePath);
                totalSize += stats.size;
                totalFiles++;
              }
            }
          }
        }
      }

      // Create backup manifest
      const manifest = {
        backupId,
        timestamp,
        workspacePath: this.workspacePath,
        backupType: 'configuration',
        files: totalFiles,
        size: totalSize,
        version: '1.0.0'
      };

      await fs.writeFile(
        path.join(backupDir, 'backup-manifest.json'),
        JSON.stringify(manifest, null, 2)
      );

      return {
        backupId,
        success: true,
        backupPath: backupDir,
        timestamp,
        size: totalSize,
        files: totalFiles
      };
    } catch (error) {
      return {
        backupId,
        success: false,
        backupPath: '',
        timestamp,
        size: 0,
        files: 0
      };
    }
  }

  // Private helper methods

  private async analyzeAllModules(options: AnalysisOptions): Promise<Record<string, ModuleState>> {
    const moduleStates: Record<string, ModuleState> = {};
    const modulesToAnalyze = options.moduleFilter || this.validModuleIds;

    for (const moduleId of modulesToAnalyze) {
      try {
        moduleStates[moduleId] = await this.analyzeModule(moduleId);
      } catch (error) {
        // Create a failed state for modules that can't be analyzed
        const moduleState = createModuleState(moduleId, this.getModuleCategory(moduleId));
        moduleState.status = 'failed';
        moduleState.healthScore = 0;
        moduleState.criticalErrors.push({
          errorId: `analysis-failed-${moduleId}`,
          errorType: 'configuration_invalid',
          severity: 'critical',
          message: `Failed to analyze module: ${error instanceof Error ? error.message : 'Unknown error'}`,
          impact: 'blocks_functionality',
          firstOccurred: new Date().toISOString(),
          lastOccurred: new Date().toISOString(),
          occurrenceCount: 1,
          resolved: false
        });
        moduleStates[moduleId] = moduleState;
      }
    }

    return moduleStates;
  }

  private getModuleCategory(moduleId: string) {
    const categoryMap: Record<string, any> = {
      'core': 'core',
      'shell': 'core',
      'logging': 'core',
      'auth': 'foundation',
      'i18n': 'foundation'
    };
    return categoryMap[moduleId] || 'business';
  }

  private async checkModuleExists(modulePath: string): Promise<boolean> {
    return await this.directoryExists(modulePath);
  }

  private async analyzePackageJson(modulePath: string, moduleState: ModuleState): Promise<void> {
    const packageJsonPath = path.join(modulePath, 'package.json');

    if (!(await this.fileExists(packageJsonPath))) {
      moduleState.packageJsonValid = false;
      moduleState.configurationErrors.push({
        configFile: 'package.json',
        errorType: 'missing_field',
        message: 'package.json file not found',
        autoFixable: false
      });
      return;
    }

    try {
      const packageContent = await fs.readFile(packageJsonPath, 'utf8');
      const packageJson = JSON.parse(packageContent);

      // Validate required fields
      const requiredFields = ['name', 'version'];
      requiredFields.forEach(field => {
        if (!packageJson[field]) {
          moduleState.configurationErrors.push({
            configFile: 'package.json',
            errorType: 'missing_field',
            field,
            message: `Missing required field: ${field}`,
            autoFixable: true,
            fixSuggestion: `Add "${field}" field to package.json`
          });
        }
      });

      // Validate scripts
      if (packageJson.scripts) {
        if (packageJson.scripts.build) moduleState.buildConfigValid = true;
        if (packageJson.scripts.test) moduleState.testStatus = 'not_started';
      }

      // Extract dependencies
      const deps = packageJson.dependencies || {};
      const devDeps = packageJson.devDependencies || {};
      const peerDeps = packageJson.peerDependencies || {};

      [...Object.entries(deps), ...Object.entries(devDeps), ...Object.entries(peerDeps)].forEach(([name, version]) => {
        moduleState.dependencies.push({
          dependencyName: name,
          dependencyType: deps[name] ? 'production' : devDeps[name] ? 'development' : 'peer',
          requiredVersion: version as string,
          satisfied: true, // Will be validated separately
          source: 'npm',
          issues: []
        });
      });

      moduleState.packageJsonValid = moduleState.configurationErrors.length === 0;
    } catch (error) {
      moduleState.packageJsonValid = false;
      moduleState.configurationErrors.push({
        configFile: 'package.json',
        errorType: 'syntax',
        message: `JSON parse error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        autoFixable: false
      });
    }
  }

  private async analyzeTsConfig(modulePath: string, moduleState: ModuleState): Promise<void> {
    const tsconfigPath = path.join(modulePath, 'tsconfig.json');

    if (!(await this.fileExists(tsconfigPath))) {
      moduleState.tsconfigValid = false;
      moduleState.configurationErrors.push({
        configFile: 'tsconfig.json',
        errorType: 'missing_field',
        message: 'tsconfig.json file not found',
        autoFixable: true,
        fixSuggestion: 'Create tsconfig.json with basic TypeScript configuration'
      });
      return;
    }

    try {
      const tsconfigContent = await fs.readFile(tsconfigPath, 'utf8');
      const tsconfig = JSON.parse(tsconfigContent);

      // Validate basic structure
      if (!tsconfig.compilerOptions) {
        moduleState.configurationErrors.push({
          configFile: 'tsconfig.json',
          errorType: 'missing_field',
          field: 'compilerOptions',
          message: 'Missing compilerOptions section',
          autoFixable: true,
          fixSuggestion: 'Add compilerOptions section to tsconfig.json'
        });
      }

      moduleState.tsconfigValid = moduleState.configurationErrors.filter(e => e.configFile === 'tsconfig.json').length === 0;
    } catch (error) {
      moduleState.tsconfigValid = false;
      moduleState.configurationErrors.push({
        configFile: 'tsconfig.json',
        errorType: 'syntax',
        message: `JSON parse error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        autoFixable: false
      });
    }
  }

  private async analyzeBuildConfig(modulePath: string, moduleState: ModuleState): Promise<void> {
    // Check for various build configuration files
    const buildConfigFiles = ['tsup.config.ts', 'rollup.config.js', 'webpack.config.js', 'vite.config.ts'];

    for (const configFile of buildConfigFiles) {
      const configPath = path.join(modulePath, configFile);
      if (await this.fileExists(configPath)) {
        moduleState.buildConfigValid = true;
        break;
      }
    }

    if (!moduleState.buildConfigValid) {
      moduleState.buildWarnings.push({
        warningId: `no-build-config-${moduleState.moduleId}`,
        warningType: 'configuration',
        message: 'No build configuration file found',
        file: modulePath,
        timestamp: new Date().toISOString(),
        acknowledged: false
      });
    }
  }

  private async analyzeDependencies(modulePath: string, moduleState: ModuleState): Promise<void> {
    // Check if node_modules exists
    const nodeModulesPath = path.join(modulePath, 'node_modules');
    const hasNodeModules = await this.directoryExists(nodeModulesPath);

    if (!hasNodeModules && moduleState.dependencies.length > 0) {
      moduleState.dependencyHealth = 'missing';
      moduleState.criticalErrors.push({
        errorId: `missing-dependencies-${moduleState.moduleId}`,
        errorType: 'dependency_missing',
        severity: 'critical',
        message: 'node_modules directory not found - dependencies not installed',
        impact: 'blocks_build',
        firstOccurred: new Date().toISOString(),
        lastOccurred: new Date().toISOString(),
        occurrenceCount: 1,
        resolved: false
      });
    }

    // Additional dependency analysis would be implemented here
    // For now, set basic dependency health
    if (moduleState.dependencyHealth !== 'missing') {
      moduleState.dependencyHealth = 'resolved';
    }
  }

  private async analyzeSourceStructure(modulePath: string, moduleState: ModuleState): Promise<void> {
    const srcPath = path.join(modulePath, 'src');
    const hasSrcDirectory = await this.directoryExists(srcPath);

    if (!hasSrcDirectory) {
      moduleState.warnings.push({
        warningId: `no-src-directory-${moduleState.moduleId}`,
        warningType: 'best_practice',
        severity: 'low',
        message: 'No src/ directory found - consider organizing source code in src/ directory',
        recommendation: 'Create src/ directory and move source files there',
        file: modulePath,
        autoFixable: false,
        timestamp: new Date().toISOString(),
        acknowledged: false
      });
    }

    // Check for index file
    const indexFiles = ['src/index.ts', 'src/index.js', 'index.ts', 'index.js'];
    let hasIndexFile = false;

    for (const indexFile of indexFiles) {
      const indexPath = path.join(modulePath, indexFile);
      if (await this.fileExists(indexPath)) {
        hasIndexFile = true;
        break;
      }
    }

    if (!hasIndexFile) {
      moduleState.warnings.push({
        warningId: `no-index-file-${moduleState.moduleId}`,
        warningType: 'best_practice',
        severity: 'low',
        message: 'No index file found - module may not be properly exported',
        recommendation: 'Create src/index.ts or index.ts file',
        file: modulePath,
        autoFixable: false,
        timestamp: new Date().toISOString(),
        acknowledged: false
      });
    }
  }

  private async detectCommonIssues(modulePath: string, moduleState: ModuleState): Promise<void> {
    // This would implement detection of common patterns that indicate issues
    // For now, we'll add some basic checks

    // Check for empty directories
    try {
      const entries = await fs.readdir(modulePath);
      if (entries.length === 0) {
        moduleState.criticalErrors.push({
          errorId: `empty-module-${moduleState.moduleId}`,
          errorType: 'configuration_invalid',
          severity: 'critical',
          message: 'Module directory is empty',
          impact: 'blocks_functionality',
          firstOccurred: new Date().toISOString(),
          lastOccurred: new Date().toISOString(),
          occurrenceCount: 1,
          resolved: false
        });
      }
    } catch (error) {
      // Directory might not be readable
      moduleState.criticalErrors.push({
        errorId: `unreadable-module-${moduleState.moduleId}`,
        errorType: 'configuration_invalid',
        severity: 'critical',
        message: `Cannot read module directory: ${error instanceof Error ? error.message : 'Unknown error'}`,
        impact: 'blocks_functionality',
        firstOccurred: new Date().toISOString(),
        lastOccurred: new Date().toISOString(),
        occurrenceCount: 1,
        resolved: false
      });
    }

    // Update error and warning counts
    moduleState.errorCount = moduleState.criticalErrors.length + moduleState.nonCriticalErrors.length;
    moduleState.warningCount = moduleState.warnings.length + moduleState.buildWarnings.length;
  }

  private async enhanceWithDependencyAnalysis(workspaceHealth: WorkspaceHealth): Promise<void> {
    // Implementation for dependency graph analysis
    // This would analyze cross-module dependencies, circular dependencies, etc.
  }

  private async enhanceWithPerformanceAnalysis(workspaceHealth: WorkspaceHealth): Promise<void> {
    // Implementation for performance metrics analysis
    // This would analyze build times, bundle sizes, test execution times, etc.
  }

  private async generateRecommendations(workspaceHealth: WorkspaceHealth): Promise<Recommendation[]> {
    const recommendations: Recommendation[] = [];

    // Generate recommendations based on workspace health
    Object.values(workspaceHealth.moduleStates).forEach(moduleState => {
      if (moduleState.healthScore < 50) {
        recommendations.push({
          recommendationId: `critical-recovery-${moduleState.moduleId}`,
          priority: 'critical',
          category: 'build',
          title: `Critical Recovery Required for ${moduleState.moduleId}`,
          description: `Module ${moduleState.moduleId} has critical issues that require immediate attention`,
          impact: 'Module is non-functional and blocks workspace health',
          effort: 'high',
          estimatedTime: 3600, // 1 hour
          affectedModules: [moduleState.moduleId],
          implementation: `Execute comprehensive recovery strategy: ${moduleState.recoveryState.recoveryStrategy}`,
          autoFixable: moduleState.recoveryState.recoveryStrategy === 'repair'
        });
      }

      if (!moduleState.packageJsonValid) {
        recommendations.push({
          recommendationId: `fix-package-json-${moduleState.moduleId}`,
          priority: 'high',
          category: 'configuration',
          title: `Fix package.json for ${moduleState.moduleId}`,
          description: 'Package.json has configuration errors that need to be resolved',
          impact: 'Prevents proper dependency management and builds',
          effort: 'low',
          estimatedTime: 300, // 5 minutes
          affectedModules: [moduleState.moduleId],
          implementation: 'Review and fix package.json configuration errors',
          autoFixable: true
        });
      }

      if (moduleState.dependencyHealth !== 'resolved') {
        recommendations.push({
          recommendationId: `fix-dependencies-${moduleState.moduleId}`,
          priority: 'high',
          category: 'dependency',
          title: `Resolve Dependencies for ${moduleState.moduleId}`,
          description: `Module has dependency issues: ${moduleState.dependencyHealth}`,
          impact: 'Prevents builds and proper functionality',
          effort: 'medium',
          estimatedTime: 900, // 15 minutes
          affectedModules: [moduleState.moduleId],
          implementation: 'Run npm install and resolve dependency conflicts',
          autoFixable: moduleState.dependencyHealth === 'missing'
        });
      }
    });

    return recommendations;
  }

  private async identifyCriticalIssues(workspaceHealth: WorkspaceHealth): Promise<CriticalIssue[]> {
    const criticalIssues: CriticalIssue[] = [];

    Object.values(workspaceHealth.moduleStates).forEach(moduleState => {
      moduleState.criticalErrors.forEach(error => {
        criticalIssues.push({
          issueId: error.errorId,
          severity: 'critical',
          category: error.errorType === 'build_failure' ? 'build_failure' :
                   error.errorType === 'dependency_missing' ? 'dependency_missing' :
                   error.errorType === 'test_failure' ? 'test_failure' : 'configuration_error',
          title: `Critical Error in ${moduleState.moduleId}`,
          description: error.message,
          affectedModules: [moduleState.moduleId],
          blocksRecovery: error.impact === 'blocks_functionality' || error.impact === 'blocks_build',
          resolutionRequired: true,
          estimatedFixTime: 1800 // 30 minutes default
        });
      });
    });

    return criticalIssues;
  }

  // File system utility methods
  private async fileExists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  private async directoryExists(dirPath: string): Promise<boolean> {
    try {
      const stats = await fs.stat(dirPath);
      return stats.isDirectory();
    } catch {
      return false;
    }
  }
}

export default WorkspaceAnalyzer;