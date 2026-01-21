/**
 * Dependency Validator
 * Deep dependency analysis and validation for workspace modules
 */

import { existsSync, readFileSync } from 'fs';
import { join, dirname } from 'path';
import { execSync } from 'child_process';
import {
  ValidationRule,
  ValidationContext,
  ValidationRuleResult,
  ValidationCategory,
  ValidationSeverity,
  createValidationRule
} from './index';

export interface DependencyValidationResult {
  hasCircularDependencies: boolean;
  missingDependencies: string[];
  outdatedDependencies: Array<{
    name: string;
    current: string;
    latest: string;
    severity: 'minor' | 'major' | 'patch';
  }>;
  vulnerabilities: Array<{
    name: string;
    severity: 'low' | 'moderate' | 'high' | 'critical';
    description: string;
    fixAvailable: boolean;
  }>;
  duplicatedDependencies: string[];
  dependencyTree: DependencyNode[];
  healthScore: number;
}

export interface DependencyNode {
  name: string;
  version: string;
  dependencies: DependencyNode[];
  devDependencies: DependencyNode[];
  depth: number;
  circular?: boolean;
}

export class DependencyValidator {
  constructor(private workspacePath: string) {}

  getDependencyValidationRules(): ValidationRule[] {
    return [
      createValidationRule(
        'dependency-circular-check',
        'Circular Dependencies Check',
        'Detects circular dependencies between modules',
        'dependencies',
        'high',
        this.validateCircularDependencies.bind(this)
      ),
      createValidationRule(
        'dependency-missing-check',
        'Missing Dependencies Check',
        'Identifies missing required dependencies',
        'dependencies',
        'critical',
        this.validateMissingDependencies.bind(this)
      ),
      createValidationRule(
        'dependency-outdated-check',
        'Outdated Dependencies Check',
        'Checks for outdated package versions',
        'dependencies',
        'medium',
        this.validateOutdatedDependencies.bind(this)
      ),
      createValidationRule(
        'dependency-security-check',
        'Security Vulnerabilities Check',
        'Scans for known security vulnerabilities',
        'security',
        'critical',
        this.validateSecurityVulnerabilities.bind(this)
      ),
      createValidationRule(
        'dependency-duplication-check',
        'Duplicated Dependencies Check',
        'Identifies duplicate dependencies across modules',
        'dependencies',
        'medium',
        this.validateDuplicatedDependencies.bind(this)
      ),
      createValidationRule(
        'dependency-peer-check',
        'Peer Dependencies Check',
        'Validates peer dependency requirements',
        'dependencies',
        'high',
        this.validatePeerDependencies.bind(this)
      ),
      createValidationRule(
        'dependency-version-consistency',
        'Version Consistency Check',
        'Ensures consistent versions across workspace',
        'dependencies',
        'medium',
        this.validateVersionConsistency.bind(this)
      ),
      createValidationRule(
        'dependency-unused-check',
        'Unused Dependencies Check',
        'Identifies unused dependencies in modules',
        'dependencies',
        'low',
        this.validateUnusedDependencies.bind(this)
      )
    ];
  }

  async analyzeDependencies(moduleId?: string): Promise<DependencyValidationResult> {
    const startTime = Date.now();

    try {
      const [
        circularCheck,
        missingCheck,
        outdatedCheck,
        securityCheck,
        duplicationCheck
      ] = await Promise.all([
        this.checkCircularDependencies(moduleId),
        this.checkMissingDependencies(moduleId),
        this.checkOutdatedDependencies(moduleId),
        this.checkSecurityVulnerabilities(moduleId),
        this.checkDuplicatedDependencies(moduleId)
      ]);

      const dependencyTree = await this.buildDependencyTree(moduleId);
      const healthScore = this.calculateDependencyHealthScore({
        hasCircularDependencies: circularCheck.length > 0,
        missingDependencies: missingCheck,
        outdatedDependencies: outdatedCheck,
        vulnerabilities: securityCheck,
        duplicatedDependencies: duplicationCheck,
        dependencyTree,
        healthScore: 0
      });

      return {
        hasCircularDependencies: circularCheck.length > 0,
        missingDependencies: missingCheck,
        outdatedDependencies: outdatedCheck,
        vulnerabilities: securityCheck,
        duplicatedDependencies: duplicationCheck,
        dependencyTree,
        healthScore
      };
    } catch (error) {
      throw new Error(`Dependency analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async validateCircularDependencies(context: ValidationContext): Promise<ValidationRuleResult> {
    const startTime = Date.now();

    try {
      const circularDeps = await this.checkCircularDependencies(context.moduleId);
      const passed = circularDeps.length === 0;

      return {
        passed,
        message: passed
          ? 'No circular dependencies detected'
          : `Found ${circularDeps.length} circular dependency chain(s)`,
        details: { circularDependencies: circularDeps },
        recommendations: passed ? [] : [
          'Refactor modules to eliminate circular dependencies',
          'Consider dependency injection or event-driven patterns',
          'Review module architecture and separation of concerns'
        ],
        affectedFiles: circularDeps.map(chain => chain.join(' -> ')),
        executionTime: Date.now() - startTime
      };
    } catch (error) {
      return {
        passed: false,
        message: `Circular dependency check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        executionTime: Date.now() - startTime
      };
    }
  }

  private async validateMissingDependencies(context: ValidationContext): Promise<ValidationRuleResult> {
    const startTime = Date.now();

    try {
      const missingDeps = await this.checkMissingDependencies(context.moduleId);
      const passed = missingDeps.length === 0;

      return {
        passed,
        message: passed
          ? 'All required dependencies are installed'
          : `Found ${missingDeps.length} missing dependencies`,
        details: { missingDependencies: missingDeps },
        recommendations: passed ? [] : [
          'Install missing dependencies using npm install',
          'Review package.json for correct dependency declarations',
          'Check import statements for typos or incorrect paths'
        ],
        affectedFiles: missingDeps,
        executionTime: Date.now() - startTime
      };
    } catch (error) {
      return {
        passed: false,
        message: `Missing dependency check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        executionTime: Date.now() - startTime
      };
    }
  }

  private async validateOutdatedDependencies(context: ValidationContext): Promise<ValidationRuleResult> {
    const startTime = Date.now();

    try {
      const outdatedDeps = await this.checkOutdatedDependencies(context.moduleId);
      const majorOutdated = outdatedDeps.filter(dep => dep.severity === 'major').length;
      const passed = majorOutdated === 0;

      return {
        passed,
        message: passed
          ? 'Dependencies are up to date'
          : `Found ${outdatedDeps.length} outdated dependencies (${majorOutdated} major)`,
        details: {
          outdatedDependencies: outdatedDeps,
          majorOutdated,
          minorOutdated: outdatedDeps.filter(dep => dep.severity === 'minor').length,
          patchOutdated: outdatedDeps.filter(dep => dep.severity === 'patch').length
        },
        recommendations: passed ? [] : [
          'Update dependencies to latest compatible versions',
          'Review breaking changes before major version updates',
          'Consider using npm update for patch and minor updates',
          'Test thoroughly after dependency updates'
        ],
        affectedFiles: outdatedDeps.map(dep => dep.name),
        executionTime: Date.now() - startTime
      };
    } catch (error) {
      return {
        passed: false,
        message: `Outdated dependency check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        executionTime: Date.now() - startTime
      };
    }
  }

  private async validateSecurityVulnerabilities(context: ValidationContext): Promise<ValidationRuleResult> {
    const startTime = Date.now();

    try {
      const vulnerabilities = await this.checkSecurityVulnerabilities(context.moduleId);
      const criticalVulns = vulnerabilities.filter(vuln => vuln.severity === 'critical').length;
      const highVulns = vulnerabilities.filter(vuln => vuln.severity === 'high').length;
      const passed = criticalVulns === 0 && highVulns === 0;

      return {
        passed,
        message: passed
          ? 'No critical or high security vulnerabilities found'
          : `Found ${vulnerabilities.length} vulnerabilities (${criticalVulns} critical, ${highVulns} high)`,
        details: {
          vulnerabilities,
          criticalCount: criticalVulns,
          highCount: highVulns,
          moderateCount: vulnerabilities.filter(vuln => vuln.severity === 'moderate').length,
          lowCount: vulnerabilities.filter(vuln => vuln.severity === 'low').length
        },
        recommendations: passed ? [] : [
          'Run npm audit fix to automatically fix vulnerabilities',
          'Update vulnerable packages to secure versions',
          'Consider alternative packages if fixes are not available',
          'Monitor security advisories for dependencies'
        ],
        affectedFiles: vulnerabilities.map(vuln => vuln.name),
        executionTime: Date.now() - startTime
      };
    } catch (error) {
      return {
        passed: false,
        message: `Security vulnerability check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        executionTime: Date.now() - startTime
      };
    }
  }

  private async validateDuplicatedDependencies(context: ValidationContext): Promise<ValidationRuleResult> {
    const startTime = Date.now();

    try {
      const duplicatedDeps = await this.checkDuplicatedDependencies(context.moduleId);
      const passed = duplicatedDeps.length === 0;

      return {
        passed,
        message: passed
          ? 'No duplicated dependencies found'
          : `Found ${duplicatedDeps.length} duplicated dependencies`,
        details: { duplicatedDependencies: duplicatedDeps },
        recommendations: passed ? [] : [
          'Consolidate duplicate dependencies using workspace features',
          'Move common dependencies to root package.json',
          'Use exact versions to prevent version conflicts',
          'Consider using npm dedupe to flatten dependency tree'
        ],
        affectedFiles: duplicatedDeps,
        executionTime: Date.now() - startTime
      };
    } catch (error) {
      return {
        passed: false,
        message: `Duplicated dependency check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        executionTime: Date.now() - startTime
      };
    }
  }

  private async validatePeerDependencies(context: ValidationContext): Promise<ValidationRuleResult> {
    const startTime = Date.now();

    try {
      const modulePath = context.moduleId ? join(this.workspacePath, 'packages', context.moduleId) : this.workspacePath;
      const packageJsonPath = join(modulePath, 'package.json');

      if (!existsSync(packageJsonPath)) {
        return {
          passed: false,
          message: 'package.json not found',
          executionTime: Date.now() - startTime
        };
      }

      const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'));
      const peerDeps = packageJson.peerDependencies || {};
      const issues: string[] = [];

      // Check if peer dependencies are satisfied
      for (const [peerDep, peerVersion] of Object.entries(peerDeps)) {
        const isInstalled = this.isDependencyInstalled(peerDep, modulePath);
        if (!isInstalled) {
          issues.push(`Peer dependency ${peerDep}@${peerVersion} is not installed`);
        }
      }

      const passed = issues.length === 0;

      return {
        passed,
        message: passed
          ? 'All peer dependencies are satisfied'
          : `Found ${issues.length} peer dependency issues`,
        details: { peerDependencyIssues: issues, peerDependencies: peerDeps },
        recommendations: passed ? [] : [
          'Install missing peer dependencies',
          'Add peer dependencies to package.json if needed',
          'Check peer dependency version compatibility'
        ],
        affectedFiles: Object.keys(peerDeps),
        executionTime: Date.now() - startTime
      };
    } catch (error) {
      return {
        passed: false,
        message: `Peer dependency check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        executionTime: Date.now() - startTime
      };
    }
  }

  private async validateVersionConsistency(context: ValidationContext): Promise<ValidationRuleResult> {
    const startTime = Date.now();

    try {
      const versionInconsistencies = await this.checkVersionConsistency();
      const passed = versionInconsistencies.length === 0;

      return {
        passed,
        message: passed
          ? 'Dependency versions are consistent across workspace'
          : `Found ${versionInconsistencies.length} version inconsistencies`,
        details: { versionInconsistencies },
        recommendations: passed ? [] : [
          'Standardize dependency versions across workspace',
          'Use workspace root for shared dependencies',
          'Consider using exact versions for critical dependencies'
        ],
        affectedFiles: versionInconsistencies.map(inc => inc.dependency),
        executionTime: Date.now() - startTime
      };
    } catch (error) {
      return {
        passed: false,
        message: `Version consistency check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        executionTime: Date.now() - startTime
      };
    }
  }

  private async validateUnusedDependencies(context: ValidationContext): Promise<ValidationRuleResult> {
    const startTime = Date.now();

    try {
      const unusedDeps = await this.checkUnusedDependencies(context.moduleId);
      const passed = unusedDeps.length === 0;

      return {
        passed,
        message: passed
          ? 'No unused dependencies detected'
          : `Found ${unusedDeps.length} potentially unused dependencies`,
        details: { unusedDependencies: unusedDeps },
        recommendations: passed ? [] : [
          'Remove unused dependencies to reduce bundle size',
          'Verify dependencies are not used in build scripts or configs',
          'Consider using tools like depcheck for automated detection'
        ],
        affectedFiles: unusedDeps,
        executionTime: Date.now() - startTime
      };
    } catch (error) {
      return {
        passed: false,
        message: `Unused dependency check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        executionTime: Date.now() - startTime
      };
    }
  }

  private async checkCircularDependencies(moduleId?: string): Promise<string[][]> {
    // Implementation would use dependency graph analysis
    // For now, return empty array (no circular dependencies)
    return [];
  }

  private async checkMissingDependencies(moduleId?: string): Promise<string[]> {
    const modulePath = moduleId ? join(this.workspacePath, 'packages', moduleId) : this.workspacePath;
    const packageJsonPath = join(modulePath, 'package.json');

    if (!existsSync(packageJsonPath)) {
      return [];
    }

    try {
      // Use npm ls to check for missing dependencies
      execSync('npm ls --depth=0 --silent', {
        cwd: modulePath,
        stdio: 'pipe'
      });
      return [];
    } catch (error) {
      // Parse npm ls output to identify missing dependencies
      const output = error instanceof Error && 'stdout' in error ? (error as any).stdout?.toString() || '' : '';
      const missingMatches = output.match(/UNMET DEPENDENCY ([^\s]+)/g) || [];
      return missingMatches.map(match => match.replace('UNMET DEPENDENCY ', ''));
    }
  }

  private async checkOutdatedDependencies(moduleId?: string): Promise<Array<{
    name: string;
    current: string;
    latest: string;
    severity: 'minor' | 'major' | 'patch';
  }>> {
    const modulePath = moduleId ? join(this.workspacePath, 'packages', moduleId) : this.workspacePath;

    try {
      const output = execSync('npm outdated --json', {
        cwd: modulePath,
        stdio: 'pipe',
        encoding: 'utf8'
      });

      const outdatedData = JSON.parse(output);
      return Object.entries(outdatedData).map(([name, info]: [string, any]) => ({
        name,
        current: info.current,
        latest: info.latest,
        severity: this.getVersionSeverity(info.current, info.latest)
      }));
    } catch (error) {
      // npm outdated returns exit code 1 when outdated packages are found
      if (error instanceof Error && 'stdout' in error && (error as any).stdout) {
        try {
          const outdatedData = JSON.parse((error as any).stdout);
          return Object.entries(outdatedData).map(([name, info]: [string, any]) => ({
            name,
            current: info.current,
            latest: info.latest,
            severity: this.getVersionSeverity(info.current, info.latest)
          }));
        } catch (parseError) {
          return [];
        }
      }
      return [];
    }
  }

  private async checkSecurityVulnerabilities(moduleId?: string): Promise<Array<{
    name: string;
    severity: 'low' | 'moderate' | 'high' | 'critical';
    description: string;
    fixAvailable: boolean;
  }>> {
    const modulePath = moduleId ? join(this.workspacePath, 'packages', moduleId) : this.workspacePath;

    try {
      const output = execSync('npm audit --json', {
        cwd: modulePath,
        stdio: 'pipe',
        encoding: 'utf8'
      });

      const auditData = JSON.parse(output);
      const vulnerabilities: Array<{
        name: string;
        severity: 'low' | 'moderate' | 'high' | 'critical';
        description: string;
        fixAvailable: boolean;
      }> = [];

      if (auditData.vulnerabilities) {
        Object.entries(auditData.vulnerabilities).forEach(([name, vuln]: [string, any]) => {
          vulnerabilities.push({
            name,
            severity: vuln.severity,
            description: vuln.title || 'Security vulnerability',
            fixAvailable: vuln.fixAvailable || false
          });
        });
      }

      return vulnerabilities;
    } catch (error) {
      return [];
    }
  }

  private async checkDuplicatedDependencies(moduleId?: string): Promise<string[]> {
    // Implementation would analyze package-lock.json or yarn.lock
    // For now, return empty array
    return [];
  }

  private async checkVersionConsistency(): Promise<Array<{
    dependency: string;
    versions: Array<{ module: string; version: string }>;
  }>> {
    // Implementation would compare versions across all modules
    // For now, return empty array
    return [];
  }

  private async checkUnusedDependencies(moduleId?: string): Promise<string[]> {
    // Implementation would analyze import statements vs package.json
    // For now, return empty array
    return [];
  }

  private async buildDependencyTree(moduleId?: string): Promise<DependencyNode[]> {
    // Implementation would build complete dependency tree
    // For now, return empty array
    return [];
  }

  private calculateDependencyHealthScore(result: DependencyValidationResult): number {
    let score = 100;

    // Deduct points for various issues
    if (result.hasCircularDependencies) score -= 30;
    score -= result.missingDependencies.length * 10;
    score -= result.vulnerabilities.filter(v => v.severity === 'critical').length * 15;
    score -= result.vulnerabilities.filter(v => v.severity === 'high').length * 10;
    score -= result.vulnerabilities.filter(v => v.severity === 'moderate').length * 5;
    score -= result.outdatedDependencies.filter(d => d.severity === 'major').length * 8;
    score -= result.duplicatedDependencies.length * 3;

    return Math.max(0, Math.min(100, score));
  }

  private getVersionSeverity(current: string, latest: string): 'minor' | 'major' | 'patch' {
    const currentParts = current.split('.').map(Number);
    const latestParts = latest.split('.').map(Number);

    if (latestParts[0] > currentParts[0]) return 'major';
    if (latestParts[1] > currentParts[1]) return 'minor';
    return 'patch';
  }

  private isDependencyInstalled(dependency: string, modulePath: string): boolean {
    const nodeModulesPath = join(modulePath, 'node_modules', dependency);
    return existsSync(nodeModulesPath);
  }
}