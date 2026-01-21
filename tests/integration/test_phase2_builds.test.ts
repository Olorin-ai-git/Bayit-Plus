/**
 * Integration test: Phase 2 build infrastructure recovery
 * CVPlus Level 2 Recovery System - T027
 *
 * This test validates the build infrastructure recovery phase
 * Following TDD approach - test must FAIL before implementation
 */

import { expect } from 'chai';
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

describe('Integration Test: Phase 2 Build Infrastructure Recovery', () => {
  const testWorkspace = '/tmp/cvplus-test-workspace';
  const moduleIds = [
    'auth', 'i18n', 'processing', 'multimedia', 'analytics',
    'premium', 'public-profiles', 'recommendations', 'admin', 'workflow', 'payments'
  ];

  beforeEach(() => {
    // Set up test workspace
    if (fs.existsSync(testWorkspace)) {
      execSync(`rm -rf ${testWorkspace}`);
    }
    fs.mkdirSync(testWorkspace, { recursive: true });
  });

  afterEach(() => {
    // Clean up test workspace
    if (fs.existsSync(testWorkspace)) {
      execSync(`rm -rf ${testWorkspace}`);
    }
  });

  describe('Build Configuration Standardization', () => {
    it('should standardize TypeScript configuration across all modules', async () => {
      // Mock existing modules with different TypeScript configs
      moduleIds.forEach(moduleId => {
        const modulePath = path.join(testWorkspace, 'packages', moduleId);
        fs.mkdirSync(modulePath, { recursive: true });

        // Create inconsistent tsconfig.json
        const tsconfigContent = {
          compilerOptions: {
            target: moduleId === 'auth' ? 'ES5' : 'ES2020', // Inconsistent targets
            module: 'CommonJS',
            strict: moduleId === 'premium' ? false : true // Inconsistent strictness
          }
        };

        fs.writeFileSync(
          path.join(modulePath, 'tsconfig.json'),
          JSON.stringify(tsconfigContent, null, 2)
        );
      });

      // Execute build infrastructure recovery
      const { PhaseOrchestrationService } = await import('../../functions/src/recovery/services/PhaseOrchestrationService');
      const orchestrator = new PhaseOrchestrationService(testWorkspace);

      const results = await orchestrator.executePhase('build-infrastructure', {
        tasks: ['standardize-build-configs']
      });

      // Verify standardization
      expect(results.success).to.be.true;
      expect(results.tasksExecuted).to.be.at.least(1);

      // Check that all modules now have consistent TypeScript configuration
      moduleIds.forEach(moduleId => {
        const tsconfigPath = path.join(testWorkspace, 'packages', moduleId, 'tsconfig.json');
        expect(fs.existsSync(tsconfigPath)).to.be.true;

        const tsconfig = JSON.parse(fs.readFileSync(tsconfigPath, 'utf8'));
        expect(tsconfig.compilerOptions.target).to.equal('ES2020');
        expect(tsconfig.compilerOptions.strict).to.be.true;
        expect(tsconfig.compilerOptions.moduleResolution).to.equal('node');
      });
    });

    it('should standardize build scripts across all modules', async () => {
      // Mock existing modules with different build scripts
      moduleIds.forEach(moduleId => {
        const modulePath = path.join(testWorkspace, 'packages', moduleId);
        fs.mkdirSync(modulePath, { recursive: true });

        // Create inconsistent package.json with different build scripts
        const packageContent = {
          name: `@cvplus/${moduleId}`,
          version: '1.0.0',
          scripts: {
            build: moduleId === 'multimedia' ? 'webpack' : 'tsc', // Inconsistent build tools
            test: moduleId === 'analytics' ? 'vitest' : 'jest' // Inconsistent test runners
          }
        };

        fs.writeFileSync(
          path.join(modulePath, 'package.json'),
          JSON.stringify(packageContent, null, 2)
        );
      });

      // Execute build script standardization
      const { PhaseOrchestrationService } = await import('../../functions/src/recovery/services/PhaseOrchestrationService');
      const orchestrator = new PhaseOrchestrationService(testWorkspace);

      const results = await orchestrator.executePhase('build-infrastructure', {
        tasks: ['standardize-build-scripts']
      });

      // Verify standardization
      expect(results.success).to.be.true;

      // Check that all modules now have consistent build scripts
      moduleIds.forEach(moduleId => {
        const packagePath = path.join(testWorkspace, 'packages', moduleId, 'package.json');
        expect(fs.existsSync(packagePath)).to.be.true;

        const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
        expect(packageJson.scripts.build).to.equal('tsup');
        expect(packageJson.scripts.test).to.equal('vitest');
        expect(packageJson.scripts['type-check']).to.equal('tsc --noEmit');
      });
    });

    it('should install missing build dependencies', async () => {
      // Mock modules with missing dependencies
      const modulesWithMissingDeps = ['premium', 'multimedia', 'workflow'];

      modulesWithMissingDeps.forEach(moduleId => {
        const modulePath = path.join(testWorkspace, 'packages', moduleId);
        fs.mkdirSync(modulePath, { recursive: true });

        // Create package.json missing build dependencies
        const packageContent = {
          name: `@cvplus/${moduleId}`,
          version: '1.0.0',
          dependencies: {},
          devDependencies: {} // Missing tsup, typescript, etc.
        };

        fs.writeFileSync(
          path.join(modulePath, 'package.json'),
          JSON.stringify(packageContent, null, 2)
        );
      });

      // Execute dependency installation
      const { PhaseOrchestrationService } = await import('../../functions/src/recovery/services/PhaseOrchestrationService');
      const orchestrator = new PhaseOrchestrationService(testWorkspace);

      const results = await orchestrator.executePhase('build-infrastructure', {
        tasks: ['install-build-dependencies']
      });

      // Verify dependency installation
      expect(results.success).to.be.true;

      // Check that required build dependencies are now installed
      const requiredDevDeps = ['typescript', 'tsup', 'vitest', '@types/node'];

      modulesWithMissingDeps.forEach(moduleId => {
        const packagePath = path.join(testWorkspace, 'packages', moduleId, 'package.json');
        const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));

        requiredDevDeps.forEach(dep => {
          expect(packageJson.devDependencies).to.have.property(dep);
        });
      });
    });
  });

  describe('Build System Validation', () => {
    it('should validate build system integrity after standardization', async () => {
      // Set up modules with standardized build configuration
      moduleIds.forEach(moduleId => {
        const modulePath = path.join(testWorkspace, 'packages', moduleId);
        fs.mkdirSync(modulePath, { recursive: true });

        // Create standardized configuration
        const standardTsconfig = {
          compilerOptions: {
            target: 'ES2020',
            module: 'ESNext',
            moduleResolution: 'node',
            strict: true,
            esModuleInterop: true,
            skipLibCheck: true,
            forceConsistentCasingInFileNames: true
          }
        };

        const standardPackage = {
          name: `@cvplus/${moduleId}`,
          version: '1.0.0',
          scripts: {
            build: 'tsup',
            test: 'vitest',
            'type-check': 'tsc --noEmit'
          },
          devDependencies: {
            typescript: '^5.0.0',
            tsup: '^8.0.0',
            vitest: '^1.0.0'
          }
        };

        fs.writeFileSync(
          path.join(modulePath, 'tsconfig.json'),
          JSON.stringify(standardTsconfig, null, 2)
        );

        fs.writeFileSync(
          path.join(modulePath, 'package.json'),
          JSON.stringify(standardPackage, null, 2)
        );

        // Create basic source file
        const srcPath = path.join(modulePath, 'src');
        fs.mkdirSync(srcPath, { recursive: true });
        fs.writeFileSync(
          path.join(srcPath, 'index.ts'),
          `export const ${moduleId}Version = '1.0.0';`
        );
      });

      // Validate build system
      const { ValidationService } = await import('../../functions/src/recovery/services/ValidationService');
      const validator = new ValidationService(testWorkspace);

      const validationResults = await validator.validateGate('build-success', {
        modules: moduleIds
      });

      // Verify validation results
      expect(validationResults.status).to.equal('passed');
      expect(validationResults.score).to.be.at.least(90);

      // Check module-specific validation results
      moduleIds.forEach(moduleId => {
        expect(validationResults.details.moduleResults).to.have.property(moduleId);
        expect(validationResults.details.moduleResults[moduleId].status).to.equal('passed');
      });
    });

    it('should detect and report build configuration conflicts', async () => {
      // Set up modules with conflicting configurations
      const conflictingModules = ['auth', 'premium'];

      conflictingModules.forEach(moduleId => {
        const modulePath = path.join(testWorkspace, 'packages', moduleId);
        fs.mkdirSync(modulePath, { recursive: true });

        // Create conflicting TypeScript configuration
        const conflictingTsconfig = {
          compilerOptions: {
            target: 'ES5', // Conflicts with standard ES2020
            module: 'CommonJS', // Conflicts with standard ESNext
            strict: false // Conflicts with standard strict: true
          }
        };

        fs.writeFileSync(
          path.join(modulePath, 'tsconfig.json'),
          JSON.stringify(conflictingTsconfig, null, 2)
        );
      });

      // Validate build system with conflicts
      const { ValidationService } = await import('../../functions/src/recovery/services/ValidationService');
      const validator = new ValidationService(testWorkspace);

      const validationResults = await validator.validateGate('build-success', {
        strict: true
      });

      // Verify conflict detection
      expect(validationResults.status).to.equal('failed');
      expect(validationResults.details.errors).to.have.length.at.least(1);

      // Check that conflicts are properly reported
      const configConflictError = validationResults.details.errors.find(
        error => error.code === 'BUILD_CONFIG_CONFLICTS'
      );
      expect(configConflictError).to.exist;
      expect(configConflictError.details).to.include.members(conflictingModules);
    });
  });

  describe('Build Performance Optimization', () => {
    it('should optimize build performance for large modules', async () => {
      // Set up large modules with many files
      const largeModules = ['multimedia', 'premium'];

      largeModules.forEach(moduleId => {
        const modulePath = path.join(testWorkspace, 'packages', moduleId);
        const srcPath = path.join(modulePath, 'src');
        fs.mkdirSync(srcPath, { recursive: true });

        // Create many TypeScript files to simulate large module
        for (let i = 0; i < 50; i++) {
          fs.writeFileSync(
            path.join(srcPath, `component${i}.ts`),
            `export class Component${i} { public readonly id = ${i}; }`
          );
        }

        // Create optimized tsconfig for large modules
        const optimizedTsconfig = {
          compilerOptions: {
            target: 'ES2020',
            module: 'ESNext',
            incremental: true,
            tsBuildInfoFile: '.tsbuildinfo'
          },
          include: ['src/**/*'],
          exclude: ['node_modules', 'dist']
        };

        fs.writeFileSync(
          path.join(modulePath, 'tsconfig.json'),
          JSON.stringify(optimizedTsconfig, null, 2)
        );
      });

      // Execute build performance optimization
      const { PhaseOrchestrationService } = await import('../../functions/src/recovery/services/PhaseOrchestrationService');
      const orchestrator = new PhaseOrchestrationService(testWorkspace);

      const results = await orchestrator.executePhase('build-infrastructure', {
        tasks: ['optimize-build-performance']
      });

      // Verify optimization
      expect(results.success).to.be.true;

      // Check that optimization settings are applied
      largeModules.forEach(moduleId => {
        const tsconfigPath = path.join(testWorkspace, 'packages', moduleId, 'tsconfig.json');
        const tsconfig = JSON.parse(fs.readFileSync(tsconfigPath, 'utf8'));

        expect(tsconfig.compilerOptions.incremental).to.be.true;
        expect(tsconfig.compilerOptions.tsBuildInfoFile).to.exist;
        expect(tsconfig.exclude).to.include('node_modules');
      });
    });

    it('should set up parallel build execution', async () => {
      // Mock all modules
      moduleIds.forEach(moduleId => {
        const modulePath = path.join(testWorkspace, 'packages', moduleId);
        fs.mkdirSync(modulePath, { recursive: true });

        const packageContent = {
          name: `@cvplus/${moduleId}`,
          scripts: {
            build: 'tsup'
          }
        };

        fs.writeFileSync(
          path.join(modulePath, 'package.json'),
          JSON.stringify(packageContent, null, 2)
        );
      });

      // Create root package.json with parallel build script
      const rootPackage = {
        name: 'cvplus',
        workspaces: moduleIds.map(id => `packages/${id}`),
        scripts: {
          'build:all': 'npm run build --workspaces --if-present',
          'build:parallel': 'concurrently \"npm:build:*\"'
        },
        devDependencies: {
          concurrently: '^8.0.0'
        }
      };

      fs.writeFileSync(
        path.join(testWorkspace, 'package.json'),
        JSON.stringify(rootPackage, null, 2)
      );

      // Execute parallel build setup
      const { PhaseOrchestrationService } = await import('../../functions/src/recovery/services/PhaseOrchestrationService');
      const orchestrator = new PhaseOrchestrationService(testWorkspace);

      const results = await orchestrator.executePhase('build-infrastructure', {
        tasks: ['setup-parallel-builds']
      });

      // Verify parallel build setup
      expect(results.success).to.be.true;

      const rootPackageJson = JSON.parse(
        fs.readFileSync(path.join(testWorkspace, 'package.json'), 'utf8')
      );

      expect(rootPackageJson.scripts).to.have.property('build:parallel');
      expect(rootPackageJson.devDependencies).to.have.property('concurrently');
    });
  });

  describe('Build Infrastructure Recovery Metrics', () => {
    it('should track build standardization progress', async () => {
      // Execute full build infrastructure recovery
      const { PhaseOrchestrationService } = await import('../../functions/src/recovery/services/PhaseOrchestrationService');
      const orchestrator = new PhaseOrchestrationService(testWorkspace);

      const results = await orchestrator.executePhase('build-infrastructure');

      // Verify comprehensive metrics
      expect(results).to.have.property('metrics');
      expect(results.metrics).to.have.property('standardizationRate').that.is.a('number');
      expect(results.metrics).to.have.property('modulesProcessed').that.equals(moduleIds.length);
      expect(results.metrics).to.have.property('conflictsResolved').that.is.a('number');
      expect(results.metrics).to.have.property('performanceGain').that.is.a('number');

      // Verify timing metrics
      expect(results).to.have.property('duration').that.is.a('number');
      expect(results.duration).to.be.lessThan(300000); // Should complete in under 5 minutes
    });

    it('should generate build infrastructure health report', async () => {
      // Execute build infrastructure phase with reporting
      const { PhaseOrchestrationService } = await import('../../functions/src/recovery/services/PhaseOrchestrationService');
      const orchestrator = new PhaseOrchestrationService(testWorkspace);

      const results = await orchestrator.executePhase('build-infrastructure', {
        generateReport: true
      });

      // Verify health report generation
      expect(results).to.have.property('healthReport');
      expect(results.healthReport).to.have.property('overallHealth').that.is.a('number').within(0, 100);
      expect(results.healthReport).to.have.property('moduleHealth').that.is.an('object');

      // Verify module-specific health scores
      moduleIds.forEach(moduleId => {
        expect(results.healthReport.moduleHealth).to.have.property(moduleId);
        expect(results.healthReport.moduleHealth[moduleId]).to.be.a('number').within(0, 100);
      });
    });
  });
});

/**
 * Phase 2 Build Infrastructure Recovery Requirements:
 *
 * 1. Build Configuration Standardization:
 *    - Standardize TypeScript configurations across all modules
 *    - Standardize build scripts (tsup, vitest, type-check)
 *    - Install missing build dependencies
 *
 * 2. Build System Validation:
 *    - Validate build system integrity
 *    - Detect and resolve configuration conflicts
 *    - Ensure consistent tooling across modules
 *
 * 3. Build Performance Optimization:
 *    - Optimize TypeScript compilation for large modules
 *    - Set up parallel build execution
 *    - Implement incremental builds
 *
 * 4. Metrics and Reporting:
 *    - Track standardization progress
 *    - Generate build infrastructure health reports
 *    - Measure performance improvements
 *
 * Success Criteria:
 * - All modules have consistent build configuration
 * - Build success rate > 95%
 * - Build performance improvement > 20%
 * - Zero configuration conflicts
 */