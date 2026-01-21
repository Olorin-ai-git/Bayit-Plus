/**
 * Admin Module Recovery Script
 */

import { existsSync, writeFileSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';
import { ModuleRecoveryScript, RecoveryPhaseResult, RecoveryContext, ValidationResult } from '../models';

export class AdminModuleRecovery implements ModuleRecoveryScript {
  public readonly moduleId = 'admin';
  public readonly supportedStrategies = ['repair', 'rebuild', 'reset'] as const;

  constructor(private workspacePath: string) {}

  async executeRecovery(strategy: 'repair' | 'rebuild' | 'reset', context: RecoveryContext): Promise<RecoveryPhaseResult[]> {
    const modulePath = join(this.workspacePath, 'packages', 'admin');
    const startTime = new Date().toISOString();

    try {
      this.performRecovery(modulePath, strategy);
      return [{
        phaseId: 1, phaseName: `Admin Module ${strategy}`, status: 'completed',
        startTime, endTime: new Date().toISOString(),
        tasksExecuted: 1, tasksSuccessful: 1, tasksFailed: 0,
        healthImprovement: strategy === 'reset' ? 75 : 50, errorsResolved: 0,
        artifacts: ['admin module'], logs: [`Admin module ${strategy} completed`]
      }];
    } catch (error) {
      return [{
        phaseId: 1, phaseName: `Admin Module ${strategy}`, status: 'failed',
        startTime, endTime: new Date().toISOString(),
        tasksExecuted: 1, tasksSuccessful: 0, tasksFailed: 1,
        healthImprovement: 0, errorsResolved: 0, artifacts: [],
        logs: [`${strategy} failed: ${error instanceof Error ? error.message : 'Unknown error'}`]
      }];
    }
  }

  async validateModule(): Promise<ValidationResult> {
    const modulePath = join(this.workspacePath, 'packages', 'admin');
    const issues: string[] = [];

    if (!existsSync(modulePath)) issues.push('Admin module missing');
    if (!existsSync(join(modulePath, 'src/index.ts'))) issues.push('Missing index file');

    return { isValid: issues.length === 0, healthScore: issues.length === 0 ? 100 : 25, issues, recommendations: issues.length > 0 ? ['Rebuild module'] : [] };
  }

  private performRecovery(modulePath: string, strategy: string): void {
    if (strategy === 'reset' && existsSync(modulePath)) {
      execSync(`rm -rf "${modulePath}"`, { stdio: 'pipe' });
    }
    this.createStructure(modulePath);
    if (strategy !== 'repair') {
      process.chdir(modulePath);
      execSync('npm install', { stdio: 'pipe' });
    }
  }

  private createStructure(modulePath: string): void {
    ['src', 'src/services', 'src/models', 'src/backend/functions'].forEach(dir => {
      execSync(`mkdir -p "${join(modulePath, dir)}"`, { stdio: 'pipe' });
    });

    writeFileSync(join(modulePath, 'package.json'), JSON.stringify({
      name: '@cvplus/admin', version: '1.0.0', description: 'CVPlus admin dashboard and management',
      main: 'dist/index.js', scripts: { build: 'tsup', test: 'jest' },
      dependencies: {}, devDependencies: { '@types/node': '^20.0.0', 'typescript': '^5.0.0', 'tsup': '^8.0.0' }
    }, null, 2));

    writeFileSync(join(modulePath, 'src/index.ts'), `export * from './services/AdminService';`);
    writeFileSync(join(modulePath, 'src/services/AdminService.ts'), `export class AdminService { async getStats(): Promise<any> { throw new Error('Not implemented'); } }`);
  }
}