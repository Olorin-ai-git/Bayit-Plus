/**
 * Premium Module Recovery Script
 * Implements comprehensive recovery operations for the premium module
 */

import { existsSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';
import { ModuleRecoveryScript, RecoveryPhaseResult, RecoveryContext, ValidationResult } from '../models';

export class PremiumModuleRecovery implements ModuleRecoveryScript {
  public readonly moduleId = 'premium';
  public readonly supportedStrategies = ['repair', 'rebuild', 'reset'] as const;

  constructor(private workspacePath: string) {}

  async executeRecovery(strategy: 'repair' | 'rebuild' | 'reset', context: RecoveryContext): Promise<RecoveryPhaseResult[]> {
    const results: RecoveryPhaseResult[] = [];
    const premiumModulePath = join(this.workspacePath, 'packages', 'premium');

    try {
      switch (strategy) {
        case 'repair':
          results.push(await this.repairModule(premiumModulePath, context));
          break;
        case 'rebuild':
          results.push(...await this.rebuildModule(premiumModulePath, context));
          break;
        case 'reset':
          results.push(...await this.resetModule(premiumModulePath, context));
          break;
      }
      return results;
    } catch (error) {
      throw new Error(`Premium module recovery failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async validateModule(): Promise<ValidationResult> {
    const premiumModulePath = join(this.workspacePath, 'packages', 'premium');
    const issues: string[] = [];
    let healthScore = 100;

    if (!existsSync(premiumModulePath)) {
      issues.push('Premium module directory does not exist');
      healthScore -= 50;
    } else {
      const requiredFiles = [
        'package.json', 'tsconfig.json', 'src/index.ts',
        'src/services/SubscriptionService.ts', 'src/services/BillingService.ts',
        'src/models/Subscription.ts', 'src/backend/functions/createSubscription.ts'
      ];

      for (const file of requiredFiles) {
        if (!existsSync(join(premiumModulePath, file))) {
          issues.push(`Missing essential file: ${file}`);
          healthScore -= 8;
        }
      }
    }

    return {
      isValid: issues.length === 0,
      healthScore: Math.max(0, healthScore),
      issues,
      recommendations: issues.length > 0 ? ['Run module rebuild to restore missing files'] : []
    };
  }

  private async repairModule(modulePath: string, context: RecoveryContext): Promise<RecoveryPhaseResult> {
    const startTime = new Date().toISOString();
    try {
      this.createDefaultPackageJson(join(modulePath, 'package.json'));
      this.createDefaultTsConfig(join(modulePath, 'tsconfig.json'));
      this.createEssentialFiles(modulePath);

      return {
        phaseId: 1, phaseName: 'Premium Module Repair', status: 'completed',
        startTime, endTime: new Date().toISOString(),
        tasksExecuted: 3, tasksSuccessful: 3, tasksFailed: 0,
        healthImprovement: 25, errorsResolved: 0,
        artifacts: ['package.json', 'tsconfig.json', 'essential files'],
        logs: ['Repaired premium module configuration', 'Created essential files']
      };
    } catch (error) {
      return {
        phaseId: 1, phaseName: 'Premium Module Repair', status: 'failed',
        startTime, endTime: new Date().toISOString(),
        tasksExecuted: 3, tasksSuccessful: 0, tasksFailed: 3,
        healthImprovement: 0, errorsResolved: 0, artifacts: [],
        logs: [`Repair failed: ${error instanceof Error ? error.message : 'Unknown error'}`]
      };
    }
  }

  private async rebuildModule(modulePath: string, context: RecoveryContext): Promise<RecoveryPhaseResult[]> {
    return [
      await this.cleanBuildArtifacts(modulePath),
      await this.restoreStructure(modulePath),
      await this.rebuildDependencies(modulePath)
    ];
  }

  private async resetModule(modulePath: string, context: RecoveryContext): Promise<RecoveryPhaseResult[]> {
    return [
      await this.resetToDefault(modulePath),
      await this.rebuildDependencies(modulePath)
    ];
  }

  private async cleanBuildArtifacts(modulePath: string): Promise<RecoveryPhaseResult> {
    const startTime = new Date().toISOString();
    try {
      ['dist', 'build', 'node_modules/.cache'].forEach(artifact => {
        const path = join(modulePath, artifact);
        if (existsSync(path)) execSync(`rm -rf "${path}"`, { stdio: 'pipe' });
      });

      return {
        phaseId: 1, phaseName: 'Clean Build Artifacts', status: 'completed',
        startTime, endTime: new Date().toISOString(),
        tasksExecuted: 3, tasksSuccessful: 3, tasksFailed: 0,
        healthImprovement: 10, errorsResolved: 0,
        artifacts: ['dist', 'build', 'cache'], logs: ['Cleaned build artifacts']
      };
    } catch (error) {
      return {
        phaseId: 1, phaseName: 'Clean Build Artifacts', status: 'failed',
        startTime, endTime: new Date().toISOString(),
        tasksExecuted: 1, tasksSuccessful: 0, tasksFailed: 1,
        healthImprovement: 0, errorsResolved: 0, artifacts: [],
        logs: [`Clean failed: ${error instanceof Error ? error.message : 'Unknown error'}`]
      };
    }
  }

  private async restoreStructure(modulePath: string): Promise<RecoveryPhaseResult> {
    const startTime = new Date().toISOString();
    try {
      ['src', 'src/services', 'src/models', 'src/backend/functions', 'tests'].forEach(dir => {
        const dirPath = join(modulePath, dir);
        if (!existsSync(dirPath)) execSync(`mkdir -p "${dirPath}"`, { stdio: 'pipe' });
      });
      this.createEssentialFiles(modulePath);

      return {
        phaseId: 2, phaseName: 'Restore Structure', status: 'completed',
        startTime, endTime: new Date().toISOString(),
        tasksExecuted: 6, tasksSuccessful: 6, tasksFailed: 0,
        healthImprovement: 30, errorsResolved: 0,
        artifacts: ['directory structure', 'essential files'],
        logs: ['Restored premium module structure']
      };
    } catch (error) {
      return {
        phaseId: 2, phaseName: 'Restore Structure', status: 'failed',
        startTime, endTime: new Date().toISOString(),
        tasksExecuted: 1, tasksSuccessful: 0, tasksFailed: 1,
        healthImprovement: 0, errorsResolved: 0, artifacts: [],
        logs: [`Structure restoration failed: ${error instanceof Error ? error.message : 'Unknown error'}`]
      };
    }
  }

  private async rebuildDependencies(modulePath: string): Promise<RecoveryPhaseResult> {
    const startTime = new Date().toISOString();
    try {
      process.chdir(modulePath);
      execSync('npm install && npm run build', { stdio: 'pipe' });

      return {
        phaseId: 3, phaseName: 'Rebuild Dependencies', status: 'completed',
        startTime, endTime: new Date().toISOString(),
        tasksExecuted: 2, tasksSuccessful: 2, tasksFailed: 0,
        healthImprovement: 40, errorsResolved: 0,
        artifacts: ['node_modules', 'dist'], logs: ['Rebuilt dependencies and compiled']
      };
    } catch (error) {
      return {
        phaseId: 3, phaseName: 'Rebuild Dependencies', status: 'failed',
        startTime, endTime: new Date().toISOString(),
        tasksExecuted: 2, tasksSuccessful: 0, tasksFailed: 2,
        healthImprovement: 0, errorsResolved: 0, artifacts: [],
        logs: [`Rebuild failed: ${error instanceof Error ? error.message : 'Unknown error'}`]
      };
    }
  }

  private async resetToDefault(modulePath: string): Promise<RecoveryPhaseResult> {
    const startTime = new Date().toISOString();
    try {
      ['src', 'dist', 'node_modules'].forEach(item => {
        const path = join(modulePath, item);
        if (existsSync(path)) execSync(`rm -rf "${path}"`, { stdio: 'pipe' });
      });
      this.createDefaultPackageJson(join(modulePath, 'package.json'));
      this.createDefaultTsConfig(join(modulePath, 'tsconfig.json'));
      this.createEssentialFiles(modulePath);

      return {
        phaseId: 1, phaseName: 'Reset to Default', status: 'completed',
        startTime, endTime: new Date().toISOString(),
        tasksExecuted: 6, tasksSuccessful: 6, tasksFailed: 0,
        healthImprovement: 50, errorsResolved: 0,
        artifacts: ['package.json', 'tsconfig.json', 'src/'], logs: ['Reset premium module to default state']
      };
    } catch (error) {
      return {
        phaseId: 1, phaseName: 'Reset to Default', status: 'failed',
        startTime, endTime: new Date().toISOString(),
        tasksExecuted: 1, tasksSuccessful: 0, tasksFailed: 1,
        healthImprovement: 0, errorsResolved: 0, artifacts: [],
        logs: [`Reset failed: ${error instanceof Error ? error.message : 'Unknown error'}`]
      };
    }
  }

  private createDefaultPackageJson(path: string): void {
    const packageJson = {
      name: '@cvplus/premium',
      version: '1.0.0',
      description: 'CVPlus subscription and billing features',
      main: 'dist/index.js',
      types: 'dist/index.d.ts',
      scripts: { build: 'tsup', dev: 'tsup --watch', test: 'jest', 'type-check': 'tsc --noEmit' },
      dependencies: { 'stripe': '^14.0.0', '@stripe/stripe-js': '^2.0.0' },
      devDependencies: { '@types/node': '^20.0.0', 'typescript': '^5.0.0', 'tsup': '^8.0.0', 'jest': '^29.0.0', '@types/jest': '^29.0.0' }
    };
    writeFileSync(path, JSON.stringify(packageJson, null, 2));
  }

  private createDefaultTsConfig(path: string): void {
    const tsConfig = {
      extends: '../../tsconfig.base.json',
      compilerOptions: { outDir: './dist', rootDir: './src', declaration: true, declarationMap: true, sourceMap: true },
      include: ['src/**/*'], exclude: ['node_modules', 'dist', 'tests/**/*']
    };
    writeFileSync(path, JSON.stringify(tsConfig, null, 2));
  }

  private createEssentialFiles(modulePath: string): void {
    ['src', 'src/services', 'src/models', 'src/backend/functions'].forEach(dir => {
      const dirPath = join(modulePath, dir);
      if (!existsSync(dirPath)) execSync(`mkdir -p "${dirPath}"`, { stdio: 'pipe' });
    });

    writeFileSync(join(modulePath, 'src/index.ts'), `/**
 * CVPlus Premium Module
 * Main entry point for subscription and billing functionality
 */

export * from './services/SubscriptionService';
export * from './services/BillingService';
export * from './models/Subscription';

// Backend functions
export { createSubscription } from './backend/functions/createSubscription';
`);

    writeFileSync(join(modulePath, 'src/services/SubscriptionService.ts'), `/**
 * Subscription Service
 * Core subscription management functionality
 */

export class SubscriptionService {
  async createSubscription(userId: string, planId: string): Promise<any> {
    throw new Error('Subscription service not yet implemented');
  }
}
`);
  }
}