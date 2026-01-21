#!/usr/bin/env ts-node

/**
 * Dependency Violation Reporter for CVPlus
 * Generates comprehensive reports with visualizations
 * Author: Gil Klainert
 * Date: 2025-08-30
 */

import * as fs from 'fs';
import * as path from 'path';
import { DependencyViolation, ModuleDependencies } from './scanner';
import { ComplianceScore } from './rule-engine';

export interface ReportOptions {
  format: 'json' | 'markdown' | 'html' | 'console';
  outputPath?: string;
  includeGraphs?: boolean;
  includeSuggestions?: boolean;
  verbose?: boolean;
}

export class ViolationReporter {
  private projectRoot: string;

  constructor(projectRoot: string) {
    this.projectRoot = projectRoot;
  }

  /**
   * Generate comprehensive report
   */
  generateReport(
    moduleDependencies: Map<string, ModuleDependencies>,
    complianceScore: ComplianceScore,
    options: ReportOptions
  ): void {
    switch (options.format) {
      case 'json':
        this.generateJSONReport(moduleDependencies, complianceScore, options);
        break;
      case 'markdown':
        this.generateMarkdownReport(moduleDependencies, complianceScore, options);
        break;
      case 'html':
        this.generateHTMLReport(moduleDependencies, complianceScore, options);
        break;
      case 'console':
      default:
        this.generateConsoleReport(moduleDependencies, complianceScore, options);
        break;
    }
  }

  /**
   * Generate JSON report
   */
  private generateJSONReport(
    moduleDependencies: Map<string, ModuleDependencies>,
    complianceScore: ComplianceScore,
    options: ReportOptions
  ): void {
    const report = {
      timestamp: new Date().toISOString(),
      projectRoot: this.projectRoot,
      compliance: {
        overall: complianceScore.overall,
        bySeverity: complianceScore.bySeverity,
        byModule: Object.fromEntries(complianceScore.byModule),
        statistics: complianceScore.details
      },
      modules: Array.from(moduleDependencies.entries()).map(([name, data]) => ({
        name,
        layer: data.layer,
        metrics: {
          fileCount: data.fileCount,
          importCount: data.importCount,
          dependencyCount: data.dependencies.size,
          externalDependencyCount: data.externalDependencies.size,
          violationCount: data.violations.length
        },
        dependencies: Array.from(data.dependencies),
        externalDependencies: Array.from(data.externalDependencies),
        violations: data.violations
      })),
      summary: {
        totalModules: moduleDependencies.size,
        totalViolations: complianceScore.details.failedRules,
        criticalViolations: complianceScore.details.violations.filter(v => v.severity === 'critical').length,
        majorViolations: complianceScore.details.violations.filter(v => v.severity === 'major').length,
        minorViolations: complianceScore.details.violations.filter(v => v.severity === 'minor').length
      }
    };

    const output = JSON.stringify(report, null, 2);
    
    if (options.outputPath) {
      fs.writeFileSync(options.outputPath, output);
      console.log(`📄 JSON report saved to: ${options.outputPath}`);
    } else {
      console.log(output);
    }
  }

  /**
   * Generate Markdown report
   */
  private generateMarkdownReport(
    moduleDependencies: Map<string, ModuleDependencies>,
    complianceScore: ComplianceScore,
    options: ReportOptions
  ): void {
    const lines: string[] = [];
    
    // Header
    lines.push('# CVPlus Dependency Analysis Report');
    lines.push(`\n*Generated: ${new Date().toISOString()}*\n`);
    
    // Executive Summary
    lines.push('## Executive Summary\n');
    lines.push(`- **Overall Compliance**: ${complianceScore.overall.toFixed(2)}% ${this.getScoreEmoji(complianceScore.overall)}`);
    lines.push(`- **Total Modules**: ${moduleDependencies.size}`);
    lines.push(`- **Total Violations**: ${complianceScore.details.failedRules}`);
    lines.push(`- **Critical Issues**: ${complianceScore.details.violations.filter(v => v.severity === 'critical').length}`);
    lines.push('');
    
    // Compliance by Severity
    lines.push('## Compliance by Severity\n');
    lines.push('| Severity | Score | Status |');
    lines.push('|----------|-------|--------|');
    lines.push(`| Critical | ${complianceScore.bySeverity.critical}% | ${complianceScore.bySeverity.critical === 100 ? '✅ Pass' : '❌ Fail'} |`);
    lines.push(`| Major | ${complianceScore.bySeverity.major}% | ${complianceScore.bySeverity.major === 100 ? '✅ Pass' : '⚠️ Warning'} |`);
    lines.push(`| Minor | ${complianceScore.bySeverity.minor}% | ${complianceScore.bySeverity.minor >= 80 ? '✅ Pass' : '⚠️ Warning'} |`);
    lines.push(`| Warning | ${complianceScore.bySeverity.warning}% | ℹ️ Info |`);
    lines.push('');
    
    // Module Analysis
    lines.push('## Module Analysis\n');
    lines.push('| Module | Layer | Files | Imports | Dependencies | Violations | Score |');
    lines.push('|--------|-------|-------|---------|--------------|------------|-------|');
    
    for (const [name, data] of moduleDependencies) {
      const score = complianceScore.byModule.get(name) || 0;
      lines.push(
        `| ${name} | ${data.layer} | ${data.fileCount} | ${data.importCount} | ` +
        `${data.dependencies.size} | ${data.violations.length} | ${score.toFixed(1)}% ${this.getScoreEmoji(score)} |`
      );
    }
    lines.push('');
    
    // Violations by Module
    lines.push('## Violations by Module\n');
    
    for (const [name, data] of moduleDependencies) {
      if (data.violations.length > 0) {
        lines.push(`### ${name} (${data.violations.length} violations)\n`);
        
        // Group violations by type
        const byType = this.groupViolationsByType(data.violations);
        
        for (const [type, violations] of byType) {
          lines.push(`#### ${this.formatViolationType(type)} Violations\n`);
          
          for (const violation of violations) {
            lines.push(`- **${violation.severity.toUpperCase()}**: ${violation.message}`);
            lines.push(`  - File: \`${violation.file}\``);
            lines.push(`  - Location: Line ${violation.line}, Column ${violation.column}`);
            lines.push(`  - Import: \`${violation.importPath}\``);
            lines.push('');
          }
        }
      }
    }
    
    // Dependency Graph (if requested)
    if (options.includeGraphs) {
      lines.push('## Dependency Graph\n');
      lines.push('```mermaid');
      lines.push('graph TD');
      
      for (const [name, data] of moduleDependencies) {
        for (const dep of data.dependencies) {
          const hasViolation = data.violations.some(v => v.targetModule === dep);
          const style = hasViolation ? '-.->|violation|' : '-->';
          lines.push(`    ${name}${style}${dep}`);
        }
      }
      
      lines.push('```\n');
    }
    
    // Recommendations
    lines.push('## Recommendations\n');
    
    if (complianceScore.bySeverity.critical < 100) {
      lines.push('### 🚨 Critical Actions Required\n');
      lines.push('1. Fix all critical violations immediately');
      lines.push('2. Review and refactor forbidden dependencies');
      lines.push('3. Eliminate circular dependencies\n');
    }
    
    if (complianceScore.bySeverity.major < 100) {
      lines.push('### ⚠️ Major Improvements Needed\n');
      lines.push('1. Address layer violation issues');
      lines.push('2. Refactor peer dependencies');
      lines.push('3. Improve module boundaries\n');
    }
    
    if (complianceScore.overall >= 99) {
      lines.push('### 🎉 Excellent Compliance Achieved!\n');
      lines.push('The codebase has achieved the target 99% compliance rate.');
      lines.push('Continue monitoring to maintain this high standard.\n');
    }
    
    const output = lines.join('\n');
    
    if (options.outputPath) {
      fs.writeFileSync(options.outputPath, output);
      console.log(`📄 Markdown report saved to: ${options.outputPath}`);
    } else {
      console.log(output);
    }
  }

  /**
   * Generate HTML report
   */
  private generateHTMLReport(
    moduleDependencies: Map<string, ModuleDependencies>,
    complianceScore: ComplianceScore,
    options: ReportOptions
  ): void {
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>CVPlus Dependency Analysis Report</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 40px; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; background: white; padding: 40px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        h1 { color: #333; border-bottom: 3px solid #007bff; padding-bottom: 10px; }
        h2 { color: #555; margin-top: 30px; }
        .score-badge { display: inline-block; padding: 5px 15px; border-radius: 20px; font-weight: bold; }
        .score-excellent { background: #28a745; color: white; }
        .score-good { background: #ffc107; color: #333; }
        .score-poor { background: #dc3545; color: white; }
        table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        th { background: #007bff; color: white; padding: 12px; text-align: left; }
        td { padding: 10px; border-bottom: 1px solid #ddd; }
        tr:hover { background: #f8f9fa; }
        .violation { background: #fff3cd; padding: 10px; margin: 10px 0; border-left: 4px solid #ffc107; }
        .critical { border-left-color: #dc3545; background: #f8d7da; }
        .success { background: #d4edda; border-left-color: #28a745; }
    </style>
</head>
<body>
    <div class="container">
        <h1>CVPlus Dependency Analysis Report</h1>
        <p><em>Generated: ${new Date().toISOString()}</em></p>
        
        <h2>Executive Summary</h2>
        <div class="score-badge ${complianceScore.overall >= 99 ? 'score-excellent' : complianceScore.overall >= 80 ? 'score-good' : 'score-poor'}">
            Overall Compliance: ${complianceScore.overall.toFixed(2)}%
        </div>
        
        <h2>Module Compliance</h2>
        <table>
            <thead>
                <tr>
                    <th>Module</th>
                    <th>Layer</th>
                    <th>Files</th>
                    <th>Dependencies</th>
                    <th>Violations</th>
                    <th>Score</th>
                </tr>
            </thead>
            <tbody>
                ${Array.from(moduleDependencies.entries()).map(([name, data]) => `
                <tr>
                    <td>${name}</td>
                    <td>${data.layer}</td>
                    <td>${data.fileCount}</td>
                    <td>${data.dependencies.size}</td>
                    <td>${data.violations.length}</td>
                    <td>${(complianceScore.byModule.get(name) || 0).toFixed(1)}%</td>
                </tr>
                `).join('')}
            </tbody>
        </table>
        
        <h2>Violations</h2>
        ${Array.from(moduleDependencies.entries())
          .filter(([_, data]) => data.violations.length > 0)
          .map(([name, data]) => `
            <h3>${name}</h3>
            ${data.violations.map(v => `
                <div class="violation ${v.severity === 'critical' ? 'critical' : ''}">
                    <strong>${v.severity.toUpperCase()}</strong>: ${v.message}<br>
                    <small>File: ${v.file} (Line ${v.line})</small>
                </div>
            `).join('')}
          `).join('')}
    </div>
</body>
</html>`;

    if (options.outputPath) {
      fs.writeFileSync(options.outputPath, html);
      console.log(`📄 HTML report saved to: ${options.outputPath}`);
    } else {
      console.log(html);
    }
  }

  /**
   * Generate console report
   */
  private generateConsoleReport(
    moduleDependencies: Map<string, ModuleDependencies>,
    complianceScore: ComplianceScore,
    options: ReportOptions
  ): void {
    console.log('\n' + '='.repeat(80));
    console.log('DEPENDENCY ANALYSIS REPORT');
    console.log('='.repeat(80) + '\n');
    
    // Score summary with color
    const scoreColor = complianceScore.overall >= 99 ? '\x1b[32m' : // Green
                      complianceScore.overall >= 80 ? '\x1b[33m' : // Yellow
                      '\x1b[31m'; // Red
    const resetColor = '\x1b[0m';
    
    console.log(`${scoreColor}Overall Compliance: ${complianceScore.overall.toFixed(2)}%${resetColor}\n`);
    
    // Severity breakdown
    console.log('Compliance by Severity:');
    console.log(`  Critical: ${complianceScore.bySeverity.critical}% ${complianceScore.bySeverity.critical === 100 ? '✅' : '❌'}`);
    console.log(`  Major: ${complianceScore.bySeverity.major}% ${complianceScore.bySeverity.major === 100 ? '✅' : '⚠️'}`);
    console.log(`  Minor: ${complianceScore.bySeverity.minor}% ${complianceScore.bySeverity.minor >= 80 ? '✅' : '⚠️'}`);
    console.log(`  Warning: ${complianceScore.bySeverity.warning}%\n`);
    
    // Module summary
    console.log('Module Summary:');
    console.log('-'.repeat(80));
    
    for (const [name, data] of moduleDependencies) {
      const score = complianceScore.byModule.get(name) || 0;
      const status = data.violations.length === 0 ? '✅' : 
                    data.violations.some(v => v.severity === 'critical') ? '❌' : '⚠️';
      
      console.log(
        `${status} ${name.padEnd(20)} ` +
        `Layer: ${data.layer} | ` +
        `Files: ${data.fileCount.toString().padEnd(3)} | ` +
        `Violations: ${data.violations.length.toString().padEnd(2)} | ` +
        `Score: ${score.toFixed(1)}%`
      );
    }
    
    console.log('-'.repeat(80) + '\n');
    
    // Violations detail (if verbose)
    if (options.verbose) {
      const violationsByModule = Array.from(moduleDependencies.entries())
        .filter(([_, data]) => data.violations.length > 0);
      
      if (violationsByModule.length > 0) {
        console.log('Violation Details:');
        console.log('-'.repeat(80));
        
        for (const [name, data] of violationsByModule) {
          console.log(`\n${name} (${data.violations.length} violations):`);
          
          for (const violation of data.violations) {
            console.log(`  ${violation.severity.toUpperCase()}: ${violation.message}`);
            console.log(`    File: ${violation.file}:${violation.line}:${violation.column}`);
          }
        }
        
        console.log('-'.repeat(80) + '\n');
      }
    }
    
    // Recommendations
    if (complianceScore.overall < 99) {
      console.log('📋 Recommendations:');
      
      if (complianceScore.bySeverity.critical < 100) {
        console.log('  🚨 Fix all critical violations immediately');
      }
      if (complianceScore.bySeverity.major < 100) {
        console.log('  ⚠️  Address major violations to improve architecture');
      }
      console.log('  📈 Target: Achieve 99% compliance for production readiness\n');
    } else {
      console.log('🎉 Excellent! Compliance target of 99% achieved!\n');
    }
  }

  /**
   * Group violations by type
   */
  private groupViolationsByType(violations: DependencyViolation[]): Map<string, DependencyViolation[]> {
    const grouped = new Map<string, DependencyViolation[]>();
    
    for (const violation of violations) {
      if (!grouped.has(violation.violationType)) {
        grouped.set(violation.violationType, []);
      }
      grouped.get(violation.violationType)!.push(violation);
    }
    
    return grouped;
  }

  /**
   * Format violation type for display
   */
  private formatViolationType(type: string): string {
    const formats: Record<string, string> = {
      'layer': 'Layer Hierarchy',
      'circular': 'Circular Dependency',
      'forbidden': 'Forbidden Import',
      'peer': 'Peer Dependency'
    };
    return formats[type] || type;
  }

  /**
   * Get emoji for score
   */
  private getScoreEmoji(score: number): string {
    if (score >= 99) return '🏆';
    if (score >= 95) return '✅';
    if (score >= 80) return '⚠️';
    return '❌';
  }
}

// Export for use in other scripts
export default ViolationReporter;