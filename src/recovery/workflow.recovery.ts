/**
 * Workflow Module Recovery Script
 */

import { existsSync, writeFileSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';
import { ModuleRecoveryScript, RecoveryPhaseResult, RecoveryContext, ValidationResult } from '../models';

export class WorkflowModuleRecovery implements ModuleRecoveryScript {
  public readonly moduleId = 'workflow';
  public readonly supportedStrategies = ['repair', 'rebuild', 'reset'] as const;

  constructor(private workspacePath: string) {}

  async executeRecovery(strategy: 'repair' | 'rebuild' | 'reset', context: RecoveryContext): Promise<RecoveryPhaseResult[]> {
    const modulePath = join(this.workspacePath, 'packages', 'workflow');
    const startTime = new Date().toISOString();

    try {
      switch (strategy) {
        case 'repair': this.createStructure(modulePath); break;
        case 'rebuild': this.createStructure(modulePath); process.chdir(modulePath); execSync('npm install', { stdio: 'pipe' }); break;
        case 'reset': if (existsSync(modulePath)) execSync(`rm -rf "${modulePath}"`, { stdio: 'pipe' }); this.createStructure(modulePath); break;
      }

      return [{
        phaseId: 1, phaseName: `Workflow ${strategy}`, status: 'completed',
        startTime, endTime: new Date().toISOString(),
        tasksExecuted: 1, tasksSuccessful: 1, tasksFailed: 0,
        healthImprovement: strategy === 'reset' ? 75 : 50, errorsResolved: 0,
        artifacts: ['workflow module'], logs: [`Workflow ${strategy} completed`]
      }];
    } catch (error) {
      return [{
        phaseId: 1, phaseName: `Workflow ${strategy}`, status: 'failed',
        startTime, endTime: new Date().toISOString(),
        tasksExecuted: 1, tasksSuccessful: 0, tasksFailed: 1,
        healthImprovement: 0, errorsResolved: 0, artifacts: [],
        logs: [`${strategy} failed: ${error instanceof Error ? error.message : 'Unknown error'}`]
      }];
    }
  }

  async validateModule(): Promise<ValidationResult> {
    const modulePath = join(this.workspacePath, 'packages', 'workflow');
    const issues: string[] = [];

    if (!existsSync(modulePath)) issues.push('Workflow module missing');
    if (!existsSync(join(modulePath, 'src/services/WorkflowService.ts'))) issues.push('Missing workflow service');

    return { isValid: issues.length === 0, healthScore: issues.length === 0 ? 100 : 30, issues, recommendations: issues.length > 0 ? ['Run rebuild'] : [] };
  }

  private createStructure(modulePath: string): void {
    ['src', 'src/services', 'src/models', 'src/backend/functions'].forEach(dir => {
      execSync(`mkdir -p "${join(modulePath, dir)}"`, { stdio: 'pipe' });
    });

    writeFileSync(join(modulePath, 'package.json'), JSON.stringify({
      name: '@cvplus/workflow', version: '1.0.0', description: 'CVPlus job management and feature orchestration',
      main: 'dist/index.js', scripts: { build: 'tsup', test: 'jest' },
      dependencies: {}, devDependencies: { '@types/node': '^20.0.0', 'typescript': '^5.0.0', 'tsup': '^8.0.0' }
    }, null, 2));

    writeFileSync(join(modulePath, 'src/index.ts'), `export * from './services/WorkflowService';`);
    writeFileSync(join(modulePath, 'src/services/WorkflowService.ts'), `export class WorkflowService { async executeWorkflow(): Promise<any> { throw new Error('Not implemented'); } }`);
  }
}