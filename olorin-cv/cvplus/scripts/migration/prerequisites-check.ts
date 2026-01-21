#!/usr/bin/env ts-node
/**
 * Migration prerequisites check
 * Task: T001 - Initialize migration validation environment and prerequisites check
 */

import { execSync } from 'child_process';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { migrationLogger } from './migration-utils';

interface PrerequisiteCheck {
  name: string;
  check: () => boolean;
  fix?: () => void;
  critical: boolean;
}

class PrerequisiteValidator {
  private checks: PrerequisiteCheck[] = [];
  private logger = migrationLogger;

  constructor() {
    this.initializeChecks();
  }

  private initializeChecks() {
    this.checks = [
      {
        name: 'Node.js version >= 20',
        check: () => {
          try {
            const version = process.version;
            const major = parseInt(version.slice(1).split('.')[0]);
            return major >= 20;
          } catch {
            return false;
          }
        },
        critical: true
      },
      {
        name: 'TypeScript compiler available',
        check: () => {
          try {
            execSync('npx tsc --version', { stdio: 'pipe' });
            return true;
          } catch {
            return false;
          }
        },
        fix: () => {
          try {
            execSync('npm install -g typescript', { stdio: 'inherit' });
          } catch (error) {
            this.logger.log('ERROR', 'Failed to install TypeScript');
          }
        },
        critical: true
      },
      {
        name: 'Firebase CLI available',
        check: () => {
          try {
            execSync('firebase --version', { stdio: 'pipe' });
            return true;
          } catch {
            return false;
          }
        },
        fix: () => {
          try {
            execSync('npm install -g firebase-tools', { stdio: 'inherit' });
          } catch (error) {
            this.logger.log('ERROR', 'Failed to install Firebase CLI');
          }
        },
        critical: true
      },
      {
        name: 'Git repository is valid',
        check: () => {
          try {
            execSync('git rev-parse --git-dir', { stdio: 'pipe' });
            return true;
          } catch {
            return false;
          }
        },
        critical: true
      },
      {
        name: 'Current branch is migration branch',
        check: () => {
          try {
            const branch = execSync('git branch --show-current', { encoding: 'utf8' }).trim();
            return branch === '005-migration-plan-migrate';
          } catch {
            return false;
          }
        },
        critical: false
      },
      {
        name: 'Functions directory exists',
        check: () => existsSync('/Users/gklainert/Documents/cvplus/functions'),
        critical: true
      },
      {
        name: 'Functions src/index.ts exists',
        check: () => existsSync('/Users/gklainert/Documents/cvplus/functions/src/index.ts'),
        critical: true
      },
      {
        name: 'Packages directory exists (submodules)',
        check: () => existsSync('/Users/gklainert/Documents/cvplus/packages'),
        critical: true
      },
      {
        name: 'Submodules initialized',
        check: () => {
          try {
            const status = execSync('git submodule status', { encoding: 'utf8', stdio: 'pipe' });
            const lines = status.trim().split('\n').filter(line => line.trim());
            return lines.length >= 18; // Expect 18+ submodules
          } catch {
            return false;
          }
        },
        fix: () => {
          try {
            execSync('git submodule update --init --recursive', { stdio: 'inherit' });
          } catch (error) {
            this.logger.log('ERROR', 'Failed to initialize submodules');
          }
        },
        critical: true
      },
      {
        name: 'Functions dependencies installed',
        check: () => existsSync('/Users/gklainert/Documents/cvplus/functions/node_modules'),
        fix: () => {
          try {
            execSync('cd /Users/gklainert/Documents/cvplus/functions && npm install', { stdio: 'inherit' });
          } catch (error) {
            this.logger.log('ERROR', 'Failed to install functions dependencies');
          }
        },
        critical: true
      },
      {
        name: 'Frontend dependencies installed',
        check: () => existsSync('/Users/gklainert/Documents/cvplus/frontend/node_modules'),
        fix: () => {
          try {
            execSync('cd /Users/gklainert/Documents/cvplus/frontend && npm install', { stdio: 'inherit' });
          } catch (error) {
            this.logger.log('ERROR', 'Failed to install frontend dependencies');
          }
        },
        critical: false
      },
      {
        name: 'Migration files to be migrated exist',
        check: () => {
          const filesToCheck = [
            '/Users/gklainert/Documents/cvplus/functions/src/services/ai-analysis.service.ts',
            '/Users/gklainert/Documents/cvplus/functions/src/services/cv-processor.service.ts',
            '/Users/gklainert/Documents/cvplus/functions/src/services/multimedia.service.ts',
            '/Users/gklainert/Documents/cvplus/functions/src/services/profile-manager.service.ts',
            '/Users/gklainert/Documents/cvplus/functions/src/models/analytics.service.ts',
            '/Users/gklainert/Documents/cvplus/functions/src/models/generated-content.service.ts',
            '/Users/gklainert/Documents/cvplus/functions/src/models/public-profile.service.ts'
          ];

          const existingFiles = filesToCheck.filter(file => existsSync(file));
          this.logger.log('INFO', `Found ${existingFiles.length} of ${filesToCheck.length} expected migration files`, {
            existing: existingFiles,
            missing: filesToCheck.filter(file => !existsSync(file))
          });

          return existingFiles.length > 0; // At least some files should exist
        },
        critical: false
      }
    ];
  }

  async runAllChecks(autoFix: boolean = false): Promise<boolean> {
    this.logger.log('INFO', 'Starting prerequisites check for CVPlus migration');

    let criticalFailures = 0;
    let warningCount = 0;

    for (const check of this.checks) {
      const passed = check.check();

      if (passed) {
        this.logger.log('INFO', `✅ ${check.name}`);
      } else {
        const level = check.critical ? 'ERROR' : 'WARN';
        this.logger.log(level, `❌ ${check.name}`);

        if (check.critical) {
          criticalFailures++;
        } else {
          warningCount++;
        }

        if (autoFix && check.fix) {
          this.logger.log('INFO', `Attempting to fix: ${check.name}`);
          check.fix();

          // Re-check after fix attempt
          const fixedCheck = check.check();
          if (fixedCheck) {
            this.logger.log('INFO', `✅ Fixed: ${check.name}`);
            if (check.critical) criticalFailures--;
            else warningCount--;
          } else {
            this.logger.log('ERROR', `❌ Fix failed: ${check.name}`);
          }
        }
      }
    }

    const success = criticalFailures === 0;

    this.logger.log('INFO', 'Prerequisites check completed', {
      success,
      criticalFailures,
      warnings: warningCount,
      totalChecks: this.checks.length
    });

    if (!success) {
      this.logger.log('ERROR', 'Migration cannot proceed due to critical prerequisite failures');
    } else if (warningCount > 0) {
      this.logger.log('WARN', 'Migration can proceed but some warnings should be addressed');
    } else {
      this.logger.log('INFO', 'All prerequisites passed - ready for migration');
    }

    return success;
  }

  getCheckResults() {
    return this.checks.map(check => ({
      name: check.name,
      passed: check.check(),
      critical: check.critical
    }));
  }
}

// CLI interface
if (require.main === module) {
  const validator = new PrerequisiteValidator();
  const autoFix = process.argv.includes('--fix');

  validator.runAllChecks(autoFix).then(success => {
    process.exit(success ? 0 : 1);
  }).catch(error => {
    migrationLogger.log('ERROR', 'Prerequisites check failed with error', error);
    process.exit(1);
  });
}

export { PrerequisiteValidator };