/**
 * Integration test: Phase 4 architecture compliance recovery
 * CVPlus Level 2 Recovery System - T029
 *
 * This test validates the architecture compliance recovery phase
 * Following TDD approach - test must FAIL before implementation
 */

import { expect } from 'chai';
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

describe('Integration Test: Phase 4 Architecture Compliance Recovery', () => {
  const testWorkspace = '/tmp/cvplus-test-workspace-phase4';
  const moduleIds = [
    'auth', 'i18n', 'processing', 'multimedia', 'analytics',
    'premium', 'public-profiles', 'recommendations', 'admin', 'workflow', 'payments'
  ];

  beforeEach(() => {
    if (fs.existsSync(testWorkspace)) {
      execSync(`rm -rf ${testWorkspace}`);
    }
    fs.mkdirSync(testWorkspace, { recursive: true });
  });

  afterEach(() => {
    if (fs.existsSync(testWorkspace)) {
      execSync(`rm -rf ${testWorkspace}`);
    }
  });

  describe('Module Architecture Validation', () => {
    it('should validate proper module separation and boundaries', async () => {
      // Set up modules with architecture violations
      const violatingModules = ['premium', 'multimedia'];

      violatingModules.forEach(moduleId => {
        const modulePath = path.join(testWorkspace, 'packages', moduleId);
        const srcPath = path.join(modulePath, 'src');
        fs.mkdirSync(srcPath, { recursive: true });

        // Create architecture violation: direct file system access in business logic
        fs.writeFileSync(
          path.join(srcPath, 'service.ts'),
          `
import * as fs from 'fs'; // Violation: direct fs access in business logic
import * as path from 'path';

export class ${moduleId.charAt(0).toUpperCase() + moduleId.slice(1)}Service {
  public processFile(filePath: string): any {
    // Violation: direct file operations in service layer
    const data = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(data);
  }

  public saveConfig(config: any): void {
    // Violation: hardcoded path and direct fs access
    const configPath = '/tmp/config.json';
    fs.writeFileSync(configPath, JSON.stringify(config));
  }
}
          `
        );

        // Create circular dependency violation
        fs.writeFileSync(
          path.join(srcPath, 'moduleA.ts'),
          `
import { ModuleB } from './moduleB';

export class ModuleA {
  private moduleB = new ModuleB();
}
          `
        );

        fs.writeFileSync(
          path.join(srcPath, 'moduleB.ts'),
          `
import { ModuleA } from './moduleA'; // Circular dependency

export class ModuleB {
  private moduleA = new ModuleA();
}
          `
        );
      });

      // Execute architecture compliance validation
      const { ValidationService } = await import('../../functions/src/recovery/services/ValidationService');
      const validator = new ValidationService(testWorkspace);

      const validationResults = await validator.validateGate('architecture-compliance', {
        modules: violatingModules,
        strict: true
      });

      // Verify violation detection
      expect(validationResults.status).to.equal('failed');
      expect(validationResults.details.errors).to.have.length.at.least(1);

      // Check specific violation types
      const architectureViolations = validationResults.details.errors.filter(
        error => error.code === 'ARCHITECTURE_VIOLATION'
      );
      expect(architectureViolations).to.have.length.at.least(1);

      const circularDependencies = validationResults.details.errors.filter(
        error => error.code === 'CIRCULAR_DEPENDENCY'
      );
      expect(circularDependencies).to.have.length.at.least(1);
    });

    it('should enforce proper dependency direction and layer separation', async () => {
      // Set up modules with layer violation
      const modulePath = path.join(testWorkspace, 'packages', 'auth');
      const srcPath = path.join(modulePath, 'src');
      fs.mkdirSync(srcPath, { recursive: true });

      // Create proper layered structure but with violations
      fs.mkdirSync(path.join(srcPath, 'domain'));
      fs.mkdirSync(path.join(srcPath, 'infrastructure'));
      fs.mkdirSync(path.join(srcPath, 'application'));

      // Domain layer (should not depend on infrastructure)
      fs.writeFileSync(
        path.join(srcPath, 'domain', 'User.ts'),
        `
import { DatabaseService } from '../infrastructure/DatabaseService'; // VIOLATION

export class User {
  constructor(private db: DatabaseService) {} // VIOLATION: domain depends on infrastructure
}
        `
      );

      // Infrastructure layer
      fs.writeFileSync(
        path.join(srcPath, 'infrastructure', 'DatabaseService.ts'),
        `
export class DatabaseService {
  public save(data: any): void {
    // Implementation
  }
}
        `
      );

      // Application layer
      fs.writeFileSync(
        path.join(srcPath, 'application', 'UserService.ts'),
        `
import { User } from '../domain/User';
import { DatabaseService } from '../infrastructure/DatabaseService';

export class UserService {
  constructor(private db: DatabaseService) {}
}
        `
      );

      // Execute dependency direction validation
      const { ValidationService } = await import('../../functions/src/recovery/services/ValidationService');
      const validator = new ValidationService(testWorkspace);

      const validationResults = await validator.validateGate('architecture-compliance', {
        modules: ['auth'],
        checkLayers: true
      });

      // Verify layer violation detection
      expect(validationResults.status).to.equal('failed');

      const layerViolations = validationResults.details.errors.filter(
        error => error.code === 'LAYER_VIOLATION'
      );
      expect(layerViolations).to.have.length.at.least(1);
      expect(layerViolations[0].details).to.include('domain');
      expect(layerViolations[0].details).to.include('infrastructure');
    });
  });

  describe('Code Quality Standards Enforcement', () => {
    it('should enforce TypeScript strict mode compliance', async () => {
      // Set up modules with TypeScript violations
      const nonCompliantModules = ['analytics', 'workflow'];

      nonCompliantModules.forEach(moduleId => {
        const modulePath = path.join(testWorkspace, 'packages', moduleId);
        const srcPath = path.join(modulePath, 'src');
        fs.mkdirSync(srcPath, { recursive: true });

        // Create TypeScript strict mode violations
        fs.writeFileSync(
          path.join(srcPath, 'loosely-typed.ts'),
          `
// Violation: any types
export function processData(data: any): any {
  return data.whatever.property; // Unsafe access
}

// Violation: implicit any parameters
export function calculate(a, b) {
  return a + b;
}

// Violation: non-null assertion without proper checking
export function unsafeAccess(obj: { prop?: string }): string {
  return obj.prop!.toUpperCase(); // Unsafe
}

// Violation: unused variables
export function wasteful(): void {
  const unused = 'this variable is never used';
  const alsoUnused = { data: 'test' };
}
          `
        );

        // Create tsconfig with loose settings
        fs.writeFileSync(
          path.join(modulePath, 'tsconfig.json'),
          JSON.stringify({
            compilerOptions: {
              strict: false, // Violation
              noUnusedLocals: false, // Violation
              noImplicitAny: false // Violation
            }
          }, null, 2)
        );
      });

      // Execute TypeScript compliance validation
      const { ValidationService } = await import('../../functions/src/recovery/services/ValidationService');
      const validator = new ValidationService(testWorkspace);

      const validationResults = await validator.validateGate('architecture-compliance', {
        modules: nonCompliantModules,
        checkTypeScript: true
      });

      // Verify TypeScript violations
      expect(validationResults.status).to.equal('failed');

      const typeScriptViolations = validationResults.details.errors.filter(
        error => error.code === 'TYPESCRIPT_VIOLATION'
      );
      expect(typeScriptViolations).to.have.length.at.least(1);
    });

    it('should enforce naming conventions and code style', async () => {
      // Set up module with naming violations
      const modulePath = path.join(testWorkspace, 'packages', 'public-profiles');
      const srcPath = path.join(modulePath, 'src');
      fs.mkdirSync(srcPath, { recursive: true });

      // Create naming convention violations
      fs.writeFileSync(
        path.join(srcPath, 'bad-naming.ts'),
        `
// Violation: PascalCase for interface
interface user_profile {
  user_name: string; // Violation: snake_case in TypeScript
  UserAge: number;   // Violation: PascalCase for property
}

// Violation: camelCase for class
export class profile_service {
  // Violation: snake_case for method
  public get_user_data(): user_profile | null {
    return null;
  }

  // Violation: PascalCase for variable
  public ProcessProfile(Profile: user_profile): void {
    const CONSTANT_VALUE = 'test'; // This is actually correct
    const another_variable = 'violation'; // snake_case violation
  }
}

// Violation: lowercase for enum
enum status_codes {
  success = 'SUCCESS',
  error = 'ERROR'
}
        `
      );

      // Execute naming convention validation
      const { ValidationService } = await import('../../functions/src/recovery/services/ValidationService');
      const validator = new ValidationService(testWorkspace);

      const validationResults = await validator.validateGate('architecture-compliance', {
        modules: ['public-profiles'],
        checkNaming: true
      });

      // Verify naming violations
      expect(validationResults.status).to.equal('failed');

      const namingViolations = validationResults.details.errors.filter(
        error => error.code === 'NAMING_CONVENTION_VIOLATION'
      );
      expect(namingViolations).to.have.length.at.least(3);
    });
  });

  describe('Security Compliance Validation', () => {
    it('should detect security vulnerabilities and unsafe practices', async () => {
      // Set up module with security violations
      const modulePath = path.join(testWorkspace, 'packages', 'premium');
      const srcPath = path.join(modulePath, 'src');
      fs.mkdirSync(srcPath, { recursive: true });

      // Create security violations
      fs.writeFileSync(
        path.join(srcPath, 'insecure.ts'),
        `
// Violation: Hardcoded secrets
const API_KEY = 'sk-1234567890abcdef'; // Hardcoded API key
const DATABASE_PASSWORD = 'admin123'; // Hardcoded password

export class InsecureService {
  // Violation: SQL injection vulnerability
  public getUserById(id: string): any {
    const query = \`SELECT * FROM users WHERE id = '\${id}'\`; // SQL injection
    return this.executeQuery(query);
  }

  // Violation: Command injection vulnerability
  public processFile(filename: string): void {
    const command = \`cat \${filename}\`; // Command injection
    require('child_process').exec(command);
  }

  // Violation: Unsafe eval usage
  public dynamicExecution(code: string): any {
    return eval(code); // Extremely dangerous
  }

  private executeQuery(query: string): any {
    // Mock implementation
    return null;
  }
}

// Violation: Exposed sensitive information in logging
export function logUserData(user: any): void {
  console.log('User details:', user.password, user.creditCard); // Logging sensitive data
}
        `
      );

      // Execute security compliance validation
      const { ValidationService } = await import('../../functions/src/recovery/services/ValidationService');
      const validator = new ValidationService(testWorkspace);

      const validationResults = await validator.validateGate('security-audit', {
        modules: ['premium']
      });

      // Verify security violations
      expect(validationResults.status).to.equal('failed');

      const securityViolations = validationResults.details.errors.filter(
        error => error.severity === 'error' && error.code.includes('SECURITY')
      );
      expect(securityViolations).to.have.length.at.least(3);

      // Check for specific security issues
      const hardcodedSecrets = validationResults.details.errors.filter(
        error => error.code === 'HARDCODED_SECRET'
      );
      expect(hardcodedSecrets).to.have.length.at.least(1);

      const injectionVulns = validationResults.details.errors.filter(
        error => error.code === 'INJECTION_VULNERABILITY'
      );
      expect(injectionVulns).to.have.length.at.least(1);
    });

    it('should validate proper error handling and logging practices', async () => {
      // Set up module with poor error handling
      const modulePath = path.join(testWorkspace, 'packages', 'recommendations');
      const srcPath = path.join(modulePath, 'src');
      fs.mkdirSync(srcPath, { recursive: true });

      // Create error handling violations
      fs.writeFileSync(
        path.join(srcPath, 'poor-error-handling.ts'),
        `
export class RecommendationService {
  // Violation: Swallowing exceptions
  public getRecommendations(userId: string): any[] {
    try {
      return this.fetchFromAPI(userId);
    } catch (error) {
      // Violation: Silent failure
      return [];
    }
  }

  // Violation: Throwing generic errors
  public validateUser(user: any): void {
    if (!user) {
      throw new Error('Invalid'); // Too generic
    }
    if (!user.id) {
      throw 'User ID missing'; // Throwing string instead of Error
    }
  }

  // Violation: No error handling
  public async processData(data: any): Promise<any> {
    const result = await this.externalApiCall(data); // No try-catch
    return result.data.items[0]; // Unsafe access
  }

  private fetchFromAPI(userId: string): any[] {
    // Mock implementation
    if (Math.random() > 0.5) {
      throw new Error('API Error');
    }
    return [];
  }

  private async externalApiCall(data: any): Promise<any> {
    // Mock implementation
    return Promise.resolve({ data: { items: [] } });
  }
}
        `
      );

      // Execute error handling validation
      const { ValidationService } = await import('../../functions/src/recovery/services/ValidationService');
      const validator = new ValidationService(testWorkspace);

      const validationResults = await validator.validateGate('architecture-compliance', {
        modules: ['recommendations'],
        checkErrorHandling: true
      });

      // Verify error handling violations
      expect(validationResults.status).to.be.oneOf(['failed', 'warning']);

      const errorHandlingIssues = validationResults.details.errors.filter(
        error => error.code === 'POOR_ERROR_HANDLING'
      );
      expect(errorHandlingIssues).to.have.length.at.least(1);
    });
  });

  describe('Architecture Compliance Recovery', () => {
    it('should fix architecture violations automatically', async () => {
      // Set up module with fixable violations
      const modulePath = path.join(testWorkspace, 'packages', 'admin');
      const srcPath = path.join(modulePath, 'src');
      fs.mkdirSync(srcPath, { recursive: true });

      // Create fixable violations
      fs.writeFileSync(
        path.join(srcPath, 'fixable.ts'),
        `
// Fixable: loose TypeScript
export function process(data: any): any {
  return data;
}

// Fixable: unused imports
import * as fs from 'fs';
import { unused } from './nonexistent';

export class AdminService {
  // Fixable: inconsistent naming
  public get_admin_data(): void {
    // Implementation
  }
}
        `
      );

      // Create loose tsconfig
      fs.writeFileSync(
        path.join(modulePath, 'tsconfig.json'),
        JSON.stringify({
          compilerOptions: {
            strict: false
          }
        }, null, 2)
      );

      // Execute architecture compliance recovery
      const { PhaseOrchestrationService } = await import('../../functions/src/recovery/services/PhaseOrchestrationService');
      const orchestrator = new PhaseOrchestrationService(testWorkspace);

      const results = await orchestrator.executePhase('architecture-compliance', {
        tasks: ['fix-architecture-violations'],
        autoFix: true
      });

      // Verify automatic fixes
      expect(results.success).to.be.true;
      expect(results.metrics.violationsFixed).to.be.at.least(1);

      // Check that tsconfig was fixed
      const tsconfigPath = path.join(modulePath, 'tsconfig.json');
      const tsconfig = JSON.parse(fs.readFileSync(tsconfigPath, 'utf8'));
      expect(tsconfig.compilerOptions.strict).to.be.true;

      // Check that code was improved
      const fixedCodePath = path.join(srcPath, 'fixable.ts');
      const fixedCode = fs.readFileSync(fixedCodePath, 'utf8');
      expect(fixedCode).to.include('getAdminData'); // Fixed naming
    });

    it('should generate architecture compliance report', async () => {
      // Execute architecture compliance with reporting
      const { PhaseOrchestrationService } = await import('../../functions/src/recovery/services/PhaseOrchestrationService');
      const orchestrator = new PhaseOrchestrationService(testWorkspace);

      const results = await orchestrator.executePhase('architecture-compliance', {
        generateReport: true
      });

      // Verify compliance report
      expect(results).to.have.property('complianceReport');
      expect(results.complianceReport).to.have.property('overallCompliance').that.is.a('number').within(0, 100);
      expect(results.complianceReport).to.have.property('moduleCompliance').that.is.an('object');
      expect(results.complianceReport).to.have.property('violationsByCategory').that.is.an('object');
      expect(results.complianceReport).to.have.property('securityScore').that.is.a('number').within(0, 100);

      // Verify detailed metrics
      expect(results.complianceReport).to.have.property('metrics');
      expect(results.complianceReport.metrics).to.have.property('totalViolations').that.is.a('number');
      expect(results.complianceReport.metrics).to.have.property('criticalViolations').that.is.a('number');
      expect(results.complianceReport.metrics).to.have.property('fixedViolations').that.is.a('number');
    });
  });

  describe('Final Architecture Validation', () => {
    it('should validate complete system architecture compliance', async () => {
      // Execute comprehensive architecture validation
      const { ValidationService } = await import('../../functions/src/recovery/services/ValidationService');
      const validator = new ValidationService(testWorkspace);

      const validationResults = await validator.validateGate('architecture-compliance', {
        modules: moduleIds,
        comprehensive: true
      });

      // Verify final validation
      expect(validationResults).to.have.property('status');
      expect(validationResults).to.have.property('score').that.is.a('number');
      expect(validationResults).to.have.property('details');

      // Check that critical violations are resolved
      if (validationResults.details.errors) {
        const criticalErrors = validationResults.details.errors.filter(
          error => error.severity === 'error'
        );
        expect(criticalErrors).to.have.length.at.most(2); // Allow minimal critical issues
      }
    });

    it('should achieve target architecture compliance score', async () => {
      // Execute full architecture compliance phase
      const { PhaseOrchestrationService } = await import('../../functions/src/recovery/services/PhaseOrchestrationService');
      const orchestrator = new PhaseOrchestrationService(testWorkspace);

      const results = await orchestrator.executePhase('architecture-compliance');

      // Verify compliance achievement
      expect(results.success).to.be.true;
      expect(results.metrics.complianceScore).to.be.at.least(85); // Target 85% compliance

      // Verify timing
      expect(results.duration).to.be.lessThan(900000); // Under 15 minutes
    });
  });
});

/**
 * Phase 4 Architecture Compliance Recovery Requirements:
 *
 * 1. Module Architecture Validation:
 *    - Validate proper module separation
 *    - Enforce dependency direction
 *    - Check layer boundaries
 *
 * 2. Code Quality Standards:
 *    - TypeScript strict mode compliance
 *    - Naming convention enforcement
 *    - Code style consistency
 *
 * 3. Security Compliance:
 *    - Detect security vulnerabilities
 *    - Validate error handling
 *    - Check logging practices
 *
 * 4. Architecture Compliance Recovery:
 *    - Fix violations automatically
 *    - Generate compliance reports
 *    - Validate final compliance
 *
 * Success Criteria:
 * - Architecture compliance score > 85%
 * - Zero critical security violations
 * - All modules follow layer architecture
 * - TypeScript strict mode enabled
 */