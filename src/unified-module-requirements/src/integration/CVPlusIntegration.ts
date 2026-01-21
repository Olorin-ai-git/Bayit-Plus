/**
 * CVPlus Integration Layer
 * Provides seamless integration with the main CVPlus monorepo
 */

import { promises as fs } from 'fs';
import * as path from 'path';
import { glob } from 'glob';
import { getUnifiedModuleRequirementsService } from '../lib/index';
import type {
  ModuleValidationRequest,
  ValidationReport,
  QuickValidationRequest,
  CompleteAnalysisRequest,
  CVPlusModule,
  CVPlusModuleInfo
} from '../models/types';

export class CVPlusIntegration {
  private service = getUnifiedModuleRequirementsService();
  private cvplusRoot: string;

  constructor(cvplusRoot?: string) {
    // Auto-detect CVPlus root or use provided path
    this.cvplusRoot = cvplusRoot || this.detectCVPlusRoot();
  }

  /**
   * Auto-detect the CVPlus root directory
   */
  private detectCVPlusRoot(): string {
    // Start from current directory and walk up to find CVPlus root
    let currentDir = process.cwd();
    const maxDepth = 10;
    let depth = 0;

    while (depth < maxDepth) {
      const packageJsonPath = path.join(currentDir, 'package.json');

      try {
        const packageJson = require(packageJsonPath);
        if (packageJson.name === 'cvplus' || packageJson.workspaces) {
          return currentDir;
        }
      } catch {
        // Continue searching
      }

      const parent = path.dirname(currentDir);
      if (parent === currentDir) {
        break; // Reached filesystem root
      }
      currentDir = parent;
      depth++;
    }

    // Fallback to a reasonable default
    return process.env.CVPLUS_ROOT || '/Users/gklainert/Documents/cvplus';
  }

  /**
   * Discover all CVPlus modules
   */
  async discoverModules(): Promise<CVPlusModuleInfo[]> {
    const packagesDir = path.join(this.cvplusRoot, 'packages');
    const modules: CVPlusModuleInfo[] = [];

    try {
      const moduleDirectories = await fs.readdir(packagesDir, { withFileTypes: true });

      for (const dir of moduleDirectories) {
        if (dir.isDirectory()) {
          const modulePath = path.join(packagesDir, dir.name);
          const packageJsonPath = path.join(modulePath, 'package.json');

          try {
            const packageJsonContent = await fs.readFile(packageJsonPath, 'utf-8');
            const packageJson = JSON.parse(packageJsonContent);

            const moduleInfo: CVPlusModuleInfo = {
              name: dir.name,
              displayName: packageJson.name || dir.name,
              version: packageJson.version || '0.0.0',
              description: packageJson.description || '',
              path: modulePath,
              packageJson: packageJson,
              hasTypeScript: await this.hasTypeScript(modulePath),
              hasBuildScript: !!packageJson.scripts?.build,
              hasTestScript: !!packageJson.scripts?.test,
              hasDistFolder: await this.hasDistFolder(modulePath),
              dependencies: Object.keys(packageJson.dependencies || {}),
              devDependencies: Object.keys(packageJson.devDependencies || {})
            };

            modules.push(moduleInfo);
          } catch (error) {
            console.warn(`Failed to process module ${dir.name}:`, error);
          }
        }
      }
    } catch (error) {
      throw new Error(`Failed to discover CVPlus modules: ${error}`);
    }

    return modules.sort((a, b) => a.name.localeCompare(b.name));
  }

  /**
   * Check if module has TypeScript configuration
   */
  private async hasTypeScript(modulePath: string): Promise<boolean> {
    const tsConfigPath = path.join(modulePath, 'tsconfig.json');
    try {
      await fs.access(tsConfigPath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Check if module has dist folder
   */
  private async hasDistFolder(modulePath: string): Promise<boolean> {
    const distPath = path.join(modulePath, 'dist');
    try {
      const stat = await fs.stat(distPath);
      return stat.isDirectory();
    } catch {
      return false;
    }
  }

  /**
   * Validate all CVPlus modules
   */
  async validateAllModules(): Promise<{
    modules: CVPlusModuleInfo[];
    validationResults: ValidationReport[];
    summary: {
      totalModules: number;
      validModules: number;
      invalidModules: number;
      criticalViolations: number;
      warnings: number;
    };
  }> {
    const modules = await this.discoverModules();
    const validationResults: ValidationReport[] = [];

    // Validate each module
    for (const module of modules) {
      try {
        const request: ModuleValidationRequest = {
          modulePath: module.path,
          enableStrictMode: false,
          includeFileTypes: ['ts', 'tsx', 'js', 'jsx'],
          excludePatterns: ['node_modules', 'dist', 'build', '.git']
        };

        const result = await this.service.moduleValidator.validateModule(request);
        validationResults.push(result);
      } catch (error) {
        console.error(`Failed to validate module ${module.name}:`, error);
      }
    }

    // Calculate summary
    const validModules = validationResults.filter(r => r.isValid).length;
    const invalidModules = validationResults.length - validModules;
    const criticalViolations = validationResults.reduce((sum, r) =>
      sum + r.violations.filter(v => v.severity === 'CRITICAL').length, 0
    );
    const warnings = validationResults.reduce((sum, r) =>
      sum + r.violations.filter(v => v.severity === 'WARNING').length, 0
    );

    return {
      modules,
      validationResults,
      summary: {
        totalModules: modules.length,
        validModules,
        invalidModules,
        criticalViolations,
        warnings
      }
    };
  }

  /**
   * Perform quick validation on specific modules
   */
  async quickValidateModules(moduleNames: string[]): Promise<any> {
    const modules = await this.discoverModules();
    const targetModules = modules.filter(m => moduleNames.includes(m.name));

    if (targetModules.length === 0) {
      throw new Error(`No modules found matching: ${moduleNames.join(', ')}`);
    }

    const modulePaths = targetModules.map(m => m.path);

    const request: QuickValidationRequest = {
      modulePaths,
      enableBuildCheck: true,
      enableMockDetection: true
    };

    return await this.service.performQuickValidation(request);
  }

  /**
   * Generate comprehensive architectural analysis for CVPlus
   */
  async generateArchitecturalAnalysis(): Promise<any> {
    const modules = await this.discoverModules();
    const modulePaths = modules.map(m => m.path);

    const request: CompleteAnalysisRequest = {
      modulePaths,
      includeCodeSegregation: true,
      includeDistributionValidation: true,
      includeMockDetection: true,
      includeBuildValidation: true,
      includeDependencyAnalysis: true,
      generateReport: true,
      reportFormat: 'html'
    };

    return await this.service.performCompleteAnalysis(request);
  }

  /**
   * Check architectural compliance for specific requirements
   */
  async checkArchitecturalCompliance(requirements: string[] = [
    'code-segregation',
    'distribution-architecture',
    'real-implementation',
    'build-test-standards',
    'dependency-integrity'
  ]): Promise<{
    overallCompliance: boolean;
    compliancePercentage: number;
    requirementResults: Array<{
      requirement: string;
      compliant: boolean;
      violations: number;
      criticalViolations: number;
    }>;
    modules: CVPlusModuleInfo[];
    recommendations: string[];
  }> {
    const modules = await this.discoverModules();
    const modulePaths = modules.map(m => m.path);

    // Perform complete analysis
    const analysis = await this.service.performCompleteAnalysis({
      modulePaths,
      includeCodeSegregation: requirements.includes('code-segregation'),
      includeDistributionValidation: requirements.includes('distribution-architecture'),
      includeMockDetection: requirements.includes('real-implementation'),
      includeBuildValidation: requirements.includes('build-test-standards'),
      includeDependencyAnalysis: requirements.includes('dependency-integrity'),
      generateReport: false,
      reportFormat: 'json'
    });

    // Analyze compliance for each requirement
    const requirementResults = requirements.map(requirement => {
      let compliant = true;
      let violations = 0;
      let criticalViolations = 0;

      switch (requirement) {
        case 'code-segregation':
          if (analysis.codeSegregation) {
            violations = analysis.codeSegregation.reduce((sum: number, r: any) => sum + r.violations.length, 0);
            criticalViolations = analysis.codeSegregation.reduce((sum: number, r: any) =>
              sum + r.violations.filter((v: any) => v.severity === 'CRITICAL').length, 0);
            compliant = criticalViolations === 0;
          }
          break;

        case 'distribution-architecture':
          if (analysis.distribution) {
            violations = analysis.distribution.reduce((sum: number, r: any) => sum + r.violations.length, 0);
            criticalViolations = analysis.distribution.reduce((sum: number, r: any) =>
              sum + r.violations.filter((v: any) => v.severity === 'CRITICAL').length, 0);
            compliant = criticalViolations === 0;
          }
          break;

        case 'real-implementation':
          if (analysis.mockDetection) {
            violations = analysis.mockDetection.mockFiles.length;
            criticalViolations = analysis.mockDetection.mockFiles.filter((f: any) => f.severity === 'CRITICAL').length;
            compliant = criticalViolations === 0;
          }
          break;

        case 'build-test-standards':
          if (analysis.build) {
            violations = analysis.build.results.filter((r: any) => !r.buildSuccess).length;
            criticalViolations = violations; // All build failures are critical
            compliant = violations === 0;
          }
          break;

        case 'dependency-integrity':
          if (analysis.dependencies) {
            violations = analysis.dependencies.circularDependencies.length;
            criticalViolations = violations; // All circular dependencies are critical
            compliant = violations === 0;
          }
          break;
      }

      return {
        requirement,
        compliant,
        violations,
        criticalViolations
      };
    });

    // Calculate overall compliance
    const compliantRequirements = requirementResults.filter(r => r.compliant).length;
    const compliancePercentage = Math.round((compliantRequirements / requirements.length) * 100);
    const overallCompliance = compliancePercentage === 100;

    // Generate recommendations
    const recommendations: string[] = [];
    requirementResults.forEach(result => {
      if (!result.compliant) {
        switch (result.requirement) {
          case 'code-segregation':
            recommendations.push(`Address ${result.criticalViolations} critical code segregation violations`);
            break;
          case 'distribution-architecture':
            recommendations.push(`Fix ${result.criticalViolations} distribution architecture issues`);
            break;
          case 'real-implementation':
            recommendations.push(`Remove ${result.criticalViolations} mock implementations`);
            break;
          case 'build-test-standards':
            recommendations.push(`Fix ${result.violations} build failures`);
            break;
          case 'dependency-integrity':
            recommendations.push(`Resolve ${result.violations} circular dependencies`);
            break;
        }
      }
    });

    if (overallCompliance) {
      recommendations.push('✅ All architectural requirements are satisfied');
    }

    return {
      overallCompliance,
      compliancePercentage,
      requirementResults,
      modules,
      recommendations
    };
  }

  /**
   * Get CVPlus root directory
   */
  getCVPlusRoot(): string {
    return this.cvplusRoot;
  }

  /**
   * Set CVPlus root directory
   */
  setCVPlusRoot(rootPath: string): void {
    this.cvplusRoot = rootPath;
  }
}