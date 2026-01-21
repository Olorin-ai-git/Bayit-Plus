/**
 * Migration utilities for CVPlus submodule migration
 * Task: T003 - Set up migration logging and progress tracking utilities
 */

export interface MigrationUnit {
  id: string;
  sourceLocation: string;
  targetSubmodule: string;
  fileType: 'service' | 'model' | 'component' | 'test' | 'utility';
  dependencies: string[];
  dependents: string[];
  migrationStatus: 'pending' | 'in_progress' | 'completed' | 'failed';
  domainClassification: string;
}

export interface MigrationBatch {
  batchId: string;
  name: string;
  migrationUnits: MigrationUnit[];
  executionOrder: number;
  prerequisites: string[];
  validationCriteria: string[];
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  affectedAPIs: string[];
}

export class MigrationLogger {
  private logFile: string;

  constructor(logFile: string = 'migration.log') {
    this.logFile = logFile;
  }

  log(level: 'INFO' | 'WARN' | 'ERROR', message: string, context?: any) {
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] ${level}: ${message}`;

    if (context) {
      console.log(`${logEntry} - Context:`, JSON.stringify(context, null, 2));
    } else {
      console.log(logEntry);
    }
  }

  logMigrationStart(batchId: string, units: MigrationUnit[]) {
    this.log('INFO', `Starting migration batch: ${batchId}`, {
      batchId,
      unitCount: units.length,
      units: units.map(u => u.id)
    });
  }

  logMigrationComplete(batchId: string, result: ValidationResult) {
    this.log('INFO', `Migration batch completed: ${batchId}`, result);
  }

  logMigrationError(batchId: string, error: string, unit?: string) {
    this.log('ERROR', `Migration batch failed: ${batchId}`, {
      batchId,
      error,
      failedUnit: unit
    });
  }

  logValidationResult(validationType: string, result: ValidationResult) {
    const level = result.isValid ? 'INFO' : 'ERROR';
    this.log(level, `Validation ${validationType}: ${result.isValid ? 'PASSED' : 'FAILED'}`, result);
  }
}

export class MigrationTracker {
  private batches: Map<string, MigrationBatch> = new Map();
  private logger: MigrationLogger;

  constructor(logger?: MigrationLogger) {
    this.logger = logger || new MigrationLogger();
  }

  addBatch(batch: MigrationBatch) {
    this.batches.set(batch.batchId, batch);
    this.logger.log('INFO', `Added migration batch: ${batch.batchId}`, {
      name: batch.name,
      unitCount: batch.migrationUnits.length,
      order: batch.executionOrder
    });
  }

  updateUnitStatus(batchId: string, unitId: string, status: MigrationUnit['migrationStatus']) {
    const batch = this.batches.get(batchId);
    if (batch) {
      const unit = batch.migrationUnits.find(u => u.id === unitId);
      if (unit) {
        unit.migrationStatus = status;
        this.logger.log('INFO', `Updated unit status: ${unitId} -> ${status}`, {
          batchId,
          unitId,
          status
        });
      }
    }
  }

  getBatchProgress(batchId: string) {
    const batch = this.batches.get(batchId);
    if (!batch) return null;

    const total = batch.migrationUnits.length;
    const completed = batch.migrationUnits.filter(u => u.migrationStatus === 'completed').length;
    const failed = batch.migrationUnits.filter(u => u.migrationStatus === 'failed').length;
    const inProgress = batch.migrationUnits.filter(u => u.migrationStatus === 'in_progress').length;

    return {
      batchId,
      total,
      completed,
      failed,
      inProgress,
      progress: (completed / total) * 100
    };
  }

  getAllProgress() {
    const progress = Array.from(this.batches.keys()).map(batchId =>
      this.getBatchProgress(batchId)
    ).filter(p => p !== null);

    return progress;
  }
}

// Migration validation utilities
export async function validateTypeScriptCompilation(): Promise<ValidationResult> {
  try {
    const { execSync } = require('child_process');
    execSync('cd functions && npx tsc --noEmit', { stdio: 'pipe' });
    return {
      isValid: true,
      errors: [],
      warnings: [],
      affectedAPIs: []
    };
  } catch (error: any) {
    return {
      isValid: false,
      errors: [error.message || 'TypeScript compilation failed'],
      warnings: [],
      affectedAPIs: []
    };
  }
}

export async function validateFunctionExports(): Promise<ValidationResult> {
  try {
    const fs = require('fs');
    const path = require('path');

    const indexPath = '/Users/gklainert/Documents/cvplus/functions/src/index.ts';
    if (!fs.existsSync(indexPath)) {
      return {
        isValid: false,
        errors: ['functions/src/index.ts not found'],
        warnings: [],
        affectedAPIs: []
      };
    }

    const content = fs.readFileSync(indexPath, 'utf8');
    const exportMatches = content.match(/export\s*\{[^}]+\}/g) || [];
    const totalExports = exportMatches.reduce((count, match) => {
      const exports = match.match(/\b\w+\b/g) || [];
      return count + exports.length - 1; // Subtract 1 for 'export' keyword
    }, 0);

    const singleExports = (content.match(/^export\s+\{[^}]*\}/gm) || []).length;
    const namedExports = content.match(/export\s+\{([^}]+)\}/g) || [];

    let exportCount = singleExports;
    namedExports.forEach(exp => {
      const names = exp.match(/\b\w+(?=\s*[,}])/g) || [];
      exportCount += names.length;
    });

    return {
      isValid: exportCount >= 166,
      errors: exportCount < 166 ? [`Expected 166+ exports, found ${exportCount}`] : [],
      warnings: [],
      affectedAPIs: [`Total exports: ${exportCount}`]
    };
  } catch (error: any) {
    return {
      isValid: false,
      errors: [error.message || 'Failed to validate function exports'],
      warnings: [],
      affectedAPIs: []
    };
  }
}

export async function validateSubmoduleImports(): Promise<ValidationResult> {
  try {
    const fs = require('fs');

    const indexPath = '/Users/gklainert/Documents/cvplus/functions/src/index.ts';
    const content = fs.readFileSync(indexPath, 'utf8');

    const cvplusImports = content.match(/@cvplus\/[\w-]+/g) || [];
    const uniqueImports = Array.from(new Set(cvplusImports));

    const errors: string[] = [];
    const warnings: string[] = [];

    // Check for essential submodule imports
    const requiredSubmodules = [
      '@cvplus/cv-processing',
      '@cvplus/multimedia',
      '@cvplus/analytics',
      '@cvplus/public-profiles',
      '@cvplus/auth',
      '@cvplus/premium'
    ];

    requiredSubmodules.forEach(submodule => {
      if (!uniqueImports.some(imp => imp.startsWith(submodule))) {
        warnings.push(`Missing import from ${submodule}`);
      }
    });

    return {
      isValid: true,
      errors,
      warnings,
      affectedAPIs: uniqueImports
    };
  } catch (error: any) {
    return {
      isValid: false,
      errors: [error.message || 'Failed to validate submodule imports'],
      warnings: [],
      affectedAPIs: []
    };
  }
}

// Export singleton instances
export const migrationLogger = new MigrationLogger();
export const migrationTracker = new MigrationTracker(migrationLogger);