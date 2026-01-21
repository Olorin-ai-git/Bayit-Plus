import { RuleCategory, RuleSeverity, ModuleType } from './types';

export interface ComplianceRule {
  id: string;
  category: RuleCategory;
  severity: RuleSeverity;
  description: string;
  checkFunction: string;
  remediation: string;
  applicableTypes: ModuleType[];
  enabled: boolean;
  version: string;
  tags: string[];
  metadata: {
    autoFixable: boolean;
    estimatedFixTime: number; // minutes
    relatedRules: string[];
    documentation: string;
  };
}

export interface RuleExecutionContext {
  modulePath: string;
  moduleType: ModuleType;
  environment: 'development' | 'production' | 'test';
  configuration: Record<string, any>;
}

export interface RuleExecutionResult {
  ruleId: string;
  passed: boolean;
  severity: RuleSeverity;
  message: string;
  details: {
    file?: string;
    line?: number;
    column?: number;
    evidence?: string;
    suggestion?: string;
  };
  metadata: {
    executionTime: number;
    autoFixApplied: boolean;
    confidence: number; // 0-1
  };
}

export class ComplianceRuleEngine {
  private rules: Map<string, ComplianceRule> = new Map();
  private ruleCheckers: Map<string, (context: RuleExecutionContext) => Promise<RuleExecutionResult>> = new Map();

  constructor() {
    this.initializeDefaultRules();
  }

  private initializeDefaultRules(): void {
    const defaultRules: ComplianceRule[] = [
      {
        id: 'README_REQUIRED',
        category: RuleCategory.DOCUMENTATION,
        severity: RuleSeverity.ERROR,
        description: 'Module must have a README.md file',
        checkFunction: 'checkReadmeExists',
        remediation: 'Create a README.md file with module description, installation, and usage instructions',
        applicableTypes: Object.values(ModuleType),
        enabled: true,
        version: '1.0.0',
        tags: ['documentation', 'required'],
        metadata: {
          autoFixable: true,
          estimatedFixTime: 10,
          relatedRules: ['README_STRUCTURE'],
          documentation: 'https://docs.cvplus.dev/module-standards#readme'
        }
      },
      {
        id: 'PACKAGE_JSON_REQUIRED',
        category: RuleCategory.CONFIGURATION,
        severity: RuleSeverity.CRITICAL,
        description: 'Module must have a package.json file',
        checkFunction: 'checkPackageJsonExists',
        remediation: 'Create a package.json file with proper name, version, and dependencies',
        applicableTypes: Object.values(ModuleType),
        enabled: true,
        version: '1.0.0',
        tags: ['configuration', 'required'],
        metadata: {
          autoFixable: true,
          estimatedFixTime: 5,
          relatedRules: ['PACKAGE_JSON_VALID'],
          documentation: 'https://docs.cvplus.dev/module-standards#package-json'
        }
      },
      {
        id: 'DIST_FOLDER_REQUIRED',
        category: RuleCategory.ARCHITECTURE,
        severity: RuleSeverity.ERROR,
        description: 'Module must have a dist/ folder with built assets',
        checkFunction: 'checkDistFolderExists',
        remediation: 'Run build process to generate dist/ folder with compiled code',
        applicableTypes: Object.values(ModuleType),
        enabled: true,
        version: '1.0.0',
        tags: ['architecture', 'distribution'],
        metadata: {
          autoFixable: false,
          estimatedFixTime: 2,
          relatedRules: ['BUILD_SUCCESSFUL'],
          documentation: 'https://docs.cvplus.dev/module-standards#distribution'
        }
      },
      {
        id: 'NO_MOCK_IMPLEMENTATIONS',
        category: RuleCategory.ARCHITECTURE,
        severity: RuleSeverity.CRITICAL,
        description: 'Module must not contain mock implementations, stubs, or placeholders',
        checkFunction: 'checkNoMockImplementations',
        remediation: 'Replace all mock implementations with real, functional code',
        applicableTypes: Object.values(ModuleType),
        enabled: true,
        version: '1.0.0',
        tags: ['architecture', 'implementation', 'critical'],
        metadata: {
          autoFixable: false,
          estimatedFixTime: 60,
          relatedRules: ['NO_TODO_COMMENTS'],
          documentation: 'https://docs.cvplus.dev/module-standards#real-implementation'
        }
      },
      {
        id: 'TESTS_DIRECTORY',
        category: RuleCategory.TESTING,
        severity: RuleSeverity.ERROR,
        description: 'Module must have a tests/ directory',
        checkFunction: 'checkTestsDirectory',
        remediation: 'Create a tests/ directory with appropriate test files',
        applicableTypes: Object.values(ModuleType),
        enabled: true,
        version: '1.0.0',
        tags: ['testing', 'structure'],
        metadata: {
          autoFixable: true,
          estimatedFixTime: 5,
          relatedRules: ['TEST_COVERAGE'],
          documentation: 'https://docs.cvplus.dev/module-standards#testing'
        }
      },
      {
        id: 'BUILD_SUCCESSFUL',
        category: RuleCategory.ARCHITECTURE,
        severity: RuleSeverity.ERROR,
        description: 'Module must build without errors or warnings',
        checkFunction: 'checkBuildSuccessful',
        remediation: 'Fix all TypeScript errors and warnings, ensure clean build',
        applicableTypes: Object.values(ModuleType),
        enabled: true,
        version: '1.0.0',
        tags: ['architecture', 'build'],
        metadata: {
          autoFixable: false,
          estimatedFixTime: 30,
          relatedRules: ['TYPESCRIPT_STRICT'],
          documentation: 'https://docs.cvplus.dev/module-standards#build-requirements'
        }
      },
      {
        id: 'NO_CIRCULAR_DEPENDENCIES',
        category: RuleCategory.ARCHITECTURE,
        severity: RuleSeverity.ERROR,
        description: 'Module must not have circular dependencies',
        checkFunction: 'checkNoCircularDependencies',
        remediation: 'Refactor code to eliminate circular dependencies',
        applicableTypes: Object.values(ModuleType),
        enabled: true,
        version: '1.0.0',
        tags: ['architecture', 'dependencies'],
        metadata: {
          autoFixable: false,
          estimatedFixTime: 45,
          relatedRules: ['PROPER_LAYERING'],
          documentation: 'https://docs.cvplus.dev/module-standards#dependencies'
        }
      }
    ];

    defaultRules.forEach(rule => this.addRule(rule));
  }

  addRule(rule: ComplianceRule): void {
    if (this.validateRule(rule)) {
      this.rules.set(rule.id, rule);
    } else {
      throw new Error(`Invalid rule: ${rule.id}`);
    }
  }

  removeRule(ruleId: string): boolean {
    return this.rules.delete(ruleId);
  }

  getRule(ruleId: string): ComplianceRule | undefined {
    return this.rules.get(ruleId);
  }

  getAllRules(): ComplianceRule[] {
    return Array.from(this.rules.values());
  }

  getRulesByCategory(category: RuleCategory): ComplianceRule[] {
    return this.getAllRules().filter(rule => rule.category === category);
  }

  getRulesBySeverity(severity: RuleSeverity): ComplianceRule[] {
    return this.getAllRules().filter(rule => rule.severity === severity);
  }

  getApplicableRules(moduleType: ModuleType): ComplianceRule[] {
    return this.getAllRules().filter(rule =>
      rule.enabled && rule.applicableTypes.includes(moduleType)
    );
  }

  validateRule(rule: ComplianceRule): boolean {
    // Validate rule ID format
    if (!/^[A-Z][A-Z0-9_]*$/.test(rule.id)) {
      return false;
    }

    // Validate required fields
    if (!rule.description || !rule.checkFunction || !rule.remediation) {
      return false;
    }

    // Validate version format
    const semverRegex = /^\d+\.\d+\.\d+$/;
    if (!semverRegex.test(rule.version)) {
      return false;
    }

    // Validate applicable types
    if (!rule.applicableTypes || rule.applicableTypes.length === 0) {
      return false;
    }

    return true;
  }

  async executeRule(ruleId: string, context: RuleExecutionContext): Promise<RuleExecutionResult> {
    const rule = this.getRule(ruleId);
    if (!rule) {
      throw new Error(`Rule not found: ${ruleId}`);
    }

    if (!rule.enabled) {
      throw new Error(`Rule is disabled: ${ruleId}`);
    }

    if (!rule.applicableTypes.includes(context.moduleType)) {
      throw new Error(`Rule ${ruleId} not applicable to module type ${context.moduleType}`);
    }

    const checker = this.ruleCheckers.get(rule.checkFunction);
    if (!checker) {
      throw new Error(`Rule checker function not found: ${rule.checkFunction}`);
    }

    const startTime = Date.now();
    try {
      const result = await checker(context);
      const executionTime = Date.now() - startTime;

      return {
        ...result,
        metadata: {
          ...result.metadata,
          executionTime
        }
      };
    } catch (error) {
      return {
        ruleId,
        passed: false,
        severity: rule.severity,
        message: `Rule execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        details: {},
        metadata: {
          executionTime: Date.now() - startTime,
          autoFixApplied: false,
          confidence: 0
        }
      };
    }
  }

  registerRuleChecker(
    functionName: string,
    checker: (context: RuleExecutionContext) => Promise<RuleExecutionResult>
  ): void {
    this.ruleCheckers.set(functionName, checker);
  }

  async executeRules(ruleIds: string[], context: RuleExecutionContext): Promise<RuleExecutionResult[]> {
    const results: RuleExecutionResult[] = [];

    for (const ruleId of ruleIds) {
      try {
        const result = await this.executeRule(ruleId, context);
        results.push(result);
      } catch (error) {
        results.push({
          ruleId,
          passed: false,
          severity: RuleSeverity.ERROR,
          message: error instanceof Error ? error.message : 'Unknown error',
          details: {},
          metadata: {
            executionTime: 0,
            autoFixApplied: false,
            confidence: 0
          }
        });
      }
    }

    return results;
  }

  getAutoFixableRules(): ComplianceRule[] {
    return this.getAllRules().filter(rule => rule.metadata.autoFixable);
  }

  updateRule(ruleId: string, updates: Partial<ComplianceRule>): boolean {
    const existingRule = this.getRule(ruleId);
    if (!existingRule) {
      return false;
    }

    const updatedRule = { ...existingRule, ...updates };
    if (this.validateRule(updatedRule)) {
      this.rules.set(ruleId, updatedRule);
      return true;
    }

    return false;
  }

  exportRules(): string {
    return JSON.stringify(Array.from(this.rules.values()), null, 2);
  }

  importRules(rulesJson: string): { imported: number; errors: string[] } {
    const errors: string[] = [];
    let imported = 0;

    try {
      const rules = JSON.parse(rulesJson) as ComplianceRule[];

      for (const rule of rules) {
        try {
          this.addRule(rule);
          imported++;
        } catch (error) {
          errors.push(`Failed to import rule ${rule.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }
    } catch (error) {
      errors.push(`Failed to parse rules JSON: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    return { imported, errors };
  }
}