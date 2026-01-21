#!/usr/bin/env ts-node

/**
 * Dependency Rule Engine for CVPlus
 * Enforces architectural rules and calculates compliance scores
 * Author: Gil Klainert
 * Date: 2025-08-30
 */

import { ModuleLayer, DependencyViolation, ModuleDependencies } from './scanner';

export interface DependencyRule {
  id: string;
  name: string;
  description: string;
  severity: 'critical' | 'major' | 'minor' | 'warning';
  weight: number;
  validator: (source: string, target: string, sourceLayer: ModuleLayer, targetLayer: ModuleLayer) => boolean;
}

export interface ComplianceScore {
  overall: number;
  byModule: Map<string, number>;
  bySeverity: {
    critical: number;
    major: number;
    minor: number;
    warning: number;
  };
  details: {
    totalRules: number;
    passedRules: number;
    failedRules: number;
    violations: DependencyViolation[];
  };
}

export class DependencyRuleEngine {
  private rules: DependencyRule[] = [];
  
  constructor() {
    this.initializeRules();
  }

  /**
   * Initialize all dependency rules
   */
  private initializeRules(): void {
    // Rule 1: Core module isolation
    this.rules.push({
      id: 'CORE_ISOLATION',
      name: 'Core Module Isolation',
      description: 'Core module must not depend on any other CVPlus modules',
      severity: 'critical',
      weight: 10,
      validator: (source, target, sourceLayer) => {
        if (source === 'core' && target !== 'core') {
          return false; // Violation
        }
        return true;
      }
    });

    // Rule 2: Layer hierarchy
    this.rules.push({
      id: 'LAYER_HIERARCHY',
      name: 'Layer Hierarchy',
      description: 'Modules can only depend on lower layers',
      severity: 'critical',
      weight: 8,
      validator: (source, target, sourceLayer, targetLayer) => {
        return targetLayer <= sourceLayer;
      }
    });

    // Rule 3: No peer dependencies
    this.rules.push({
      id: 'NO_PEER_DEPS',
      name: 'No Peer Dependencies',
      description: 'Modules in the same layer cannot depend on each other',
      severity: 'major',
      weight: 6,
      validator: (source, target, sourceLayer, targetLayer) => {
        if (sourceLayer === targetLayer && source !== target) {
          return false;
        }
        return true;
      }
    });

    // Rule 4: Foundation layer restrictions
    this.rules.push({
      id: 'FOUNDATION_RESTRICTIONS',
      name: 'Foundation Layer Restrictions',
      description: 'Foundation modules (auth, i18n) can only depend on core',
      severity: 'major',
      weight: 7,
      validator: (source, target, sourceLayer, targetLayer) => {
        if (sourceLayer === ModuleLayer.FOUNDATION && targetLayer > ModuleLayer.CORE) {
          return false;
        }
        return true;
      }
    });

    // Rule 5: Domain layer boundaries
    this.rules.push({
      id: 'DOMAIN_BOUNDARIES',
      name: 'Domain Layer Boundaries',
      description: 'Domain modules should minimize cross-domain dependencies',
      severity: 'minor',
      weight: 4,
      validator: (source, target, sourceLayer, targetLayer) => {
        // Domain modules can depend on foundation and core
        if (sourceLayer === ModuleLayer.DOMAIN && targetLayer > ModuleLayer.FOUNDATION) {
          // Allow domain to domain with warning
          if (targetLayer === ModuleLayer.DOMAIN) {
            return true; // Will generate warning but not fail
          }
          return false;
        }
        return true;
      }
    });

    // Rule 6: Feature layer independence
    this.rules.push({
      id: 'FEATURE_INDEPENDENCE',
      name: 'Feature Layer Independence',
      description: 'Feature modules should be independent of each other',
      severity: 'major',
      weight: 5,
      validator: (source, target, sourceLayer, targetLayer) => {
        // Feature modules cannot depend on other feature modules
        if (sourceLayer === ModuleLayer.FEATURE && targetLayer === ModuleLayer.FEATURE && source !== target) {
          return false;
        }
        return true;
      }
    });

    // Rule 7: Application layer orchestration
    this.rules.push({
      id: 'APP_ORCHESTRATION',
      name: 'Application Layer Orchestration',
      description: 'Application layer can orchestrate all lower layers',
      severity: 'minor',
      weight: 3,
      validator: (source, target, sourceLayer, targetLayer) => {
        // Application layer can depend on anything except other app modules
        if (sourceLayer === ModuleLayer.APPLICATION && targetLayer === ModuleLayer.APPLICATION && source !== target) {
          return false;
        }
        return true;
      }
    });

    // Rule 8: No circular dependencies
    this.rules.push({
      id: 'NO_CIRCULAR',
      name: 'No Circular Dependencies',
      description: 'Modules must not have circular dependencies',
      severity: 'critical',
      weight: 10,
      validator: () => true // Handled separately in scanner
    });

    // Rule 9: Barrel exports required
    this.rules.push({
      id: 'BARREL_EXPORTS',
      name: 'Barrel Exports Required',
      description: 'All modules must export through index.ts',
      severity: 'minor',
      weight: 2,
      validator: () => true // Checked separately
    });

    // Rule 10: External dependency management
    this.rules.push({
      id: 'EXTERNAL_DEPS',
      name: 'External Dependency Management',
      description: 'External dependencies should be minimized in core layers',
      severity: 'warning',
      weight: 1,
      validator: (source, target, sourceLayer) => {
        // Core should have minimal external dependencies
        if (sourceLayer === ModuleLayer.CORE) {
          // This is checked separately for external deps
          return true;
        }
        return true;
      }
    });
  }

  /**
   * Validate a dependency against all rules
   */
  validateDependency(
    source: string,
    target: string,
    sourceLayer: ModuleLayer,
    targetLayer: ModuleLayer
  ): { passed: DependencyRule[], failed: DependencyRule[] } {
    const passed: DependencyRule[] = [];
    const failed: DependencyRule[] = [];

    for (const rule of this.rules) {
      if (rule.validator(source, target, sourceLayer, targetLayer)) {
        passed.push(rule);
      } else {
        failed.push(rule);
      }
    }

    return { passed, failed };
  }

  /**
   * Calculate compliance score for all modules
   */
  calculateComplianceScore(moduleDependencies: Map<string, ModuleDependencies>): ComplianceScore {
    const moduleScores = new Map<string, number>();
    const allViolations: DependencyViolation[] = [];
    
    let totalWeight = 0;
    let achievedWeight = 0;
    
    const severityCounts = {
      critical: 0,
      major: 0,
      minor: 0,
      warning: 0
    };

    // Calculate per-module scores
    for (const [moduleName, moduleData] of moduleDependencies) {
      const violations = moduleData.violations;
      allViolations.push(...violations);
      
      // Count violations by severity
      for (const violation of violations) {
        severityCounts[violation.severity]++;
      }
      
      // Calculate module score
      const moduleWeight = this.rules.reduce((sum, rule) => sum + rule.weight, 0);
      totalWeight += moduleWeight;
      
      // Deduct points for violations
      let moduleAchieved = moduleWeight;
      for (const violation of violations) {
        const rule = this.rules.find(r => 
          r.severity === violation.severity && 
          this.matchesRuleType(r.id, violation.violationType)
        );
        if (rule) {
          moduleAchieved -= rule.weight;
        }
      }
      
      achievedWeight += Math.max(0, moduleAchieved);
      const moduleScore = moduleWeight > 0 ? (moduleAchieved / moduleWeight) * 100 : 100;
      moduleScores.set(moduleName, Math.max(0, moduleScore));
    }

    // Calculate overall score
    const overallScore = totalWeight > 0 ? (achievedWeight / totalWeight) * 100 : 100;

    // Calculate severity scores
    const bySeverity = {
      critical: severityCounts.critical === 0 ? 100 : 0,
      major: severityCounts.major === 0 ? 100 : Math.max(0, 100 - (severityCounts.major * 20)),
      minor: severityCounts.minor === 0 ? 100 : Math.max(0, 100 - (severityCounts.minor * 10)),
      warning: severityCounts.warning === 0 ? 100 : Math.max(0, 100 - (severityCounts.warning * 5))
    };

    return {
      overall: Math.round(overallScore * 100) / 100,
      byModule: moduleScores,
      bySeverity,
      details: {
        totalRules: this.rules.length * moduleDependencies.size,
        passedRules: Math.round((achievedWeight / totalWeight) * this.rules.length * moduleDependencies.size),
        failedRules: allViolations.length,
        violations: allViolations
      }
    };
  }

  /**
   * Match rule ID to violation type
   */
  private matchesRuleType(ruleId: string, violationType: string): boolean {
    const mapping: Record<string, string[]> = {
      'CORE_ISOLATION': ['forbidden'],
      'LAYER_HIERARCHY': ['layer'],
      'NO_PEER_DEPS': ['peer'],
      'NO_CIRCULAR': ['circular'],
      'FOUNDATION_RESTRICTIONS': ['layer'],
      'DOMAIN_BOUNDARIES': ['layer'],
      'FEATURE_INDEPENDENCE': ['peer'],
      'APP_ORCHESTRATION': ['peer']
    };

    return mapping[ruleId]?.includes(violationType) || false;
  }

  /**
   * Generate compliance report
   */
  generateComplianceReport(score: ComplianceScore): string {
    const report: string[] = [];
    
    report.push('=' .repeat(80));
    report.push('DEPENDENCY COMPLIANCE REPORT');
    report.push('=' .repeat(80));
    report.push('');
    
    // Overall score with emoji
    const emoji = score.overall >= 99 ? '🏆' : 
                  score.overall >= 95 ? '✅' :
                  score.overall >= 80 ? '⚠️' : '❌';
    
    report.push(`${emoji} Overall Compliance Score: ${score.overall.toFixed(2)}%`);
    report.push('');
    
    // Severity breakdown
    report.push('Compliance by Severity:');
    report.push(`  Critical: ${score.bySeverity.critical}% ${score.bySeverity.critical === 100 ? '✅' : '❌'}`);
    report.push(`  Major: ${score.bySeverity.major}% ${score.bySeverity.major === 100 ? '✅' : '⚠️'}`);
    report.push(`  Minor: ${score.bySeverity.minor}% ${score.bySeverity.minor >= 80 ? '✅' : '⚠️'}`);
    report.push(`  Warning: ${score.bySeverity.warning}%`);
    report.push('');
    
    // Module scores
    report.push('Module Compliance Scores:');
    const sortedModules = Array.from(score.byModule.entries())
      .sort((a, b) => b[1] - a[1]);
    
    for (const [module, moduleScore] of sortedModules) {
      const moduleEmoji = moduleScore === 100 ? '✅' : 
                          moduleScore >= 80 ? '⚠️' : '❌';
      report.push(`  ${moduleEmoji} ${module.padEnd(20)} ${moduleScore.toFixed(1)}%`);
    }
    report.push('');
    
    // Rule statistics
    report.push('Rule Statistics:');
    report.push(`  Total Rules Checked: ${score.details.totalRules}`);
    report.push(`  Rules Passed: ${score.details.passedRules}`);
    report.push(`  Violations Found: ${score.details.failedRules}`);
    report.push('');
    
    // Recommendations
    report.push('Recommendations:');
    if (score.bySeverity.critical < 100) {
      report.push('  🚨 CRITICAL: Fix all critical violations immediately');
    }
    if (score.bySeverity.major < 100) {
      report.push('  ⚠️  MAJOR: Address major violations to improve architecture');
    }
    if (score.overall < 99) {
      report.push('  📈 Target: Achieve 99% compliance for production readiness');
    } else {
      report.push('  🎉 Excellent! Compliance target achieved');
    }
    report.push('');
    
    report.push('-'.repeat(80));
    report.push(`Generated: ${new Date().toISOString()}`);
    report.push('-'.repeat(80));
    
    return report.join('\n');
  }

  /**
   * Get remediation suggestions for violations
   */
  getRemediationSuggestions(violations: DependencyViolation[]): Map<string, string[]> {
    const suggestions = new Map<string, string[]>();
    
    for (const violation of violations) {
      const key = `${violation.module}:${violation.violationType}`;
      
      if (!suggestions.has(key)) {
        suggestions.set(key, []);
      }
      
      const moduleSuggestions = suggestions.get(key)!;
      
      switch (violation.violationType) {
        case 'forbidden':
          if (violation.module === 'core') {
            moduleSuggestions.push(
              '• Move shared types/interfaces to core module',
              '• Use dependency inversion with interfaces',
              '• Consider event-based communication pattern'
            );
          }
          break;
          
        case 'layer':
          moduleSuggestions.push(
            `• Refactor ${violation.targetModule} dependency to a lower layer`,
            '• Consider moving functionality to a shared lower layer',
            '• Use facade pattern to abstract the dependency'
          );
          break;
          
        case 'peer':
          moduleSuggestions.push(
            '• Extract shared functionality to a lower layer',
            '• Use mediator pattern for peer communication',
            '• Consider merging modules if highly coupled'
          );
          break;
          
        case 'circular':
          moduleSuggestions.push(
            '• Break circular dependency using dependency inversion',
            '• Extract shared functionality to a new module',
            '• Use event-based decoupling'
          );
          break;
      }
    }
    
    return suggestions;
  }
}

// Export for use in other scripts
export default DependencyRuleEngine;