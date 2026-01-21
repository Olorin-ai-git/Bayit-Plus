#!/usr/bin/env ts-node

/**
 * Frontend Components Submodule Boundary Audit Script
 *
 * Analyzes frontend components to identify alignment with submodule boundaries
 * Part of CVPlus migration Phase 3.6 (T045)
 *
 * This script examines:
 * 1. Component naming patterns that indicate domain alignment
 * 2. Import dependencies that cross submodule boundaries
 * 3. Components that should be moved to align with submodule patterns
 * 4. Type dependencies that need updating after migration
 */

import * as fs from 'fs';
import * as path from 'path';

// Simple logger for this script
class MigrationLogger {
  log(level: 'INFO' | 'WARN' | 'ERROR', message: string, context?: any) {
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] ${level}: ${message}`;
    console.log(logEntry);
    if (context) {
      console.log(JSON.stringify(context, null, 2));
    }
  }
}

interface ComponentAuditResult {
  componentPath: string;
  componentName: string;
  suggestedSubmodule: string | null;
  domainIndicators: string[];
  crossBoundaryImports: string[];
  typeImports: string[];
  needsMigration: boolean;
  migrationPriority: 'high' | 'medium' | 'low';
}

interface SubmoduleBoundary {
  name: string;
  patterns: RegExp[];
  keywords: string[];
  typePatterns: RegExp[];
}

class FrontendComponentAuditor {
  private logger: MigrationLogger;
  private componentsDir: string;
  private auditResults: ComponentAuditResult[] = [];

  // Define submodule boundaries for component classification
  private submoduleBoundaries: SubmoduleBoundary[] = [
    {
      name: 'cv-processing',
      patterns: [/CV.*Analysis/i, /CV.*Results/i, /CV.*Preview/i, /CV.*Display/i, /CV.*Upload/i],
      keywords: ['cv', 'analysis', 'processing', 'ats', 'enhancement', 'preview', 'generation'],
      typePatterns: [/CVData/i, /CVAnalysis/i, /ProcessedCV/i, /CVJob/i]
    },
    {
      name: 'multimedia',
      patterns: [/Video/i, /Audio/i, /Podcast/i, /Media/i, /Gallery/i, /QR/i],
      keywords: ['video', 'audio', 'podcast', 'media', 'multimedia', 'gallery', 'qr'],
      typePatterns: [/VideoGeneration/i, /AudioContent/i, /MediaAsset/i]
    },
    {
      name: 'public-profiles',
      patterns: [/Public.*Profile/i, /Profile.*Public/i, /Social/i, /Portfolio/i],
      keywords: ['public', 'profile', 'social', 'portfolio', 'sharing', 'contact'],
      typePatterns: [/PublicProfile/i, /SocialLink/i, /PortfolioItem/i]
    },
    {
      name: 'analytics',
      patterns: [/Analytics/i, /Dashboard/i, /Metrics/i, /Stats/i, /Chart/i],
      keywords: ['analytics', 'dashboard', 'metrics', 'stats', 'reporting', 'insights'],
      typePatterns: [/AnalyticsData/i, /MetricsReport/i, /DashboardConfig/i]
    }
  ];

  constructor() {
    this.logger = new MigrationLogger();
    this.componentsDir = path.join(process.cwd(), 'frontend/src/components');
  }

  async auditComponents(): Promise<void> {
    this.logger.log('INFO', 'Starting frontend components submodule boundary audit...');

    try {
      await this.scanComponentsDirectory();
      await this.analyzeComponents();
      this.generateReport();
    } catch (error) {
      this.logger.log('ERROR', 'Frontend component audit failed', error);
      throw error;
    }
  }

  private async scanComponentsDirectory(): Promise<void> {
    const files = await this.getAllTsxFiles(this.componentsDir);

    for (const filePath of files) {
      const componentName = path.basename(filePath, '.tsx');
      const result = await this.auditComponent(filePath, componentName);
      this.auditResults.push(result);
    }

    this.logger.log('INFO', `Scanned ${this.auditResults.length} components`);
  }

  private async getAllTsxFiles(dir: string): Promise<string[]> {
    const files: string[] = [];

    if (!fs.existsSync(dir)) {
      this.logger.log('WARN', `Directory does not exist: ${dir}`);
      return files;
    }

    const items = fs.readdirSync(dir);

    for (const item of items) {
      const fullPath = path.join(dir, item);
      const stat = fs.statSync(fullPath);

      if (stat.isDirectory()) {
        files.push(...await this.getAllTsxFiles(fullPath));
      } else if (item.endsWith('.tsx') && !item.endsWith('.test.tsx')) {
        files.push(fullPath);
      }
    }

    return files;
  }

  private async auditComponent(filePath: string, componentName: string): Promise<ComponentAuditResult> {
    const content = fs.readFileSync(filePath, 'utf-8');
    const relativePath = path.relative(process.cwd(), filePath);

    // Analyze component content
    const domainIndicators = this.findDomainIndicators(componentName, content);
    const suggestedSubmodule = this.suggestSubmodule(componentName, content);
    const crossBoundaryImports = this.findCrossBoundaryImports(content);
    const typeImports = this.findTypeImports(content);

    const needsMigration = suggestedSubmodule !== null || crossBoundaryImports.length > 0;
    const migrationPriority = this.assessMigrationPriority(componentName, domainIndicators.length, crossBoundaryImports.length);

    return {
      componentPath: relativePath,
      componentName,
      suggestedSubmodule,
      domainIndicators,
      crossBoundaryImports,
      typeImports,
      needsMigration,
      migrationPriority
    };
  }

  private findDomainIndicators(componentName: string, content: string): string[] {
    const indicators: string[] = [];

    for (const boundary of this.submoduleBoundaries) {
      // Check component name patterns
      for (const pattern of boundary.patterns) {
        if (pattern.test(componentName)) {
          indicators.push(`${boundary.name}:pattern:${pattern.source}`);
        }
      }

      // Check keywords in content
      for (const keyword of boundary.keywords) {
        const regex = new RegExp(keyword, 'gi');
        const matches = content.match(regex);
        if (matches && matches.length > 3) { // Threshold for significance
          indicators.push(`${boundary.name}:keyword:${keyword}:${matches.length}`);
        }
      }

      // Check type usage
      for (const typePattern of boundary.typePatterns) {
        if (typePattern.test(content)) {
          indicators.push(`${boundary.name}:type:${typePattern.source}`);
        }
      }
    }

    return indicators;
  }

  private suggestSubmodule(componentName: string, content: string): string | null {
    const domainScores: { [key: string]: number } = {};

    for (const boundary of this.submoduleBoundaries) {
      let score = 0;

      // Component name matching (high weight)
      for (const pattern of boundary.patterns) {
        if (pattern.test(componentName)) {
          score += 10;
        }
      }

      // Keyword frequency (medium weight)
      for (const keyword of boundary.keywords) {
        const matches = content.match(new RegExp(keyword, 'gi'));
        score += (matches?.length || 0) * 0.5;
      }

      // Type usage (high weight)
      for (const typePattern of boundary.typePatterns) {
        if (typePattern.test(content)) {
          score += 8;
        }
      }

      if (score > 0) {
        domainScores[boundary.name] = score;
      }
    }

    // Return highest scoring domain if above threshold
    const entries = Object.entries(domainScores);
    if (entries.length > 0) {
      const [topDomain, topScore] = entries.reduce((a, b) => a[1] > b[1] ? a : b);
      return topScore >= 5 ? topDomain : null;
    }

    return null;
  }

  private findCrossBoundaryImports(content: string): string[] {
    const imports: string[] = [];
    const importRegex = /import\s+.*?\s+from\s+['"]([^'"]+)['"]/g;
    let match;

    while ((match = importRegex.exec(content)) !== null) {
      const importPath = match[1];

      // Look for imports that suggest submodule dependencies
      if (importPath.includes('../') &&
          (importPath.includes('services') ||
           importPath.includes('types') ||
           importPath.includes('utils'))) {
        imports.push(importPath);
      }
    }

    return imports;
  }

  private findTypeImports(content: string): string[] {
    const types: string[] = [];
    const typeImportRegex = /import\s+(?:type\s+)?{([^}]+)}\s+from/g;
    let match;

    while ((match = typeImportRegex.exec(content)) !== null) {
      const importedItems = match[1].split(',').map(item => item.trim());
      types.push(...importedItems);
    }

    return types;
  }

  private assessMigrationPriority(componentName: string, domainIndicators: number, crossBoundaryImports: number): 'high' | 'medium' | 'low' {
    if (domainIndicators >= 3 && crossBoundaryImports >= 2) return 'high';
    if (domainIndicators >= 2 || crossBoundaryImports >= 3) return 'medium';
    return 'low';
  }

  private analyzeComponents(): void {
    const totalComponents = this.auditResults.length;
    const needsMigration = this.auditResults.filter(r => r.needsMigration).length;
    const highPriority = this.auditResults.filter(r => r.migrationPriority === 'high').length;

    this.logger.log('INFO', `Analysis complete: ${needsMigration}/${totalComponents} components need alignment, ${highPriority} high priority`);
  }

  private generateReport(): void {
    const reportPath = path.join(process.cwd(), 'scripts/migration/frontend_component_audit_report.json');

    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        totalComponents: this.auditResults.length,
        needsMigration: this.auditResults.filter(r => r.needsMigration).length,
        bySubmodule: this.getComponentsBySubmodule(),
        byPriority: this.getComponentsByPriority()
      },
      components: this.auditResults.sort((a, b) => {
        const priorityOrder = { high: 3, medium: 2, low: 1 };
        return priorityOrder[b.migrationPriority] - priorityOrder[a.migrationPriority];
      })
    };

    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

    this.logger.log('INFO', `Audit report generated: ${reportPath}`);
    this.printSummary(report);
  }

  private getComponentsBySubmodule(): { [key: string]: number } {
    const counts: { [key: string]: number } = {};

    for (const result of this.auditResults) {
      if (result.suggestedSubmodule) {
        counts[result.suggestedSubmodule] = (counts[result.suggestedSubmodule] || 0) + 1;
      }
    }

    return counts;
  }

  private getComponentsByPriority(): { [key: string]: number } {
    const counts = { high: 0, medium: 0, low: 0 };

    for (const result of this.auditResults) {
      counts[result.migrationPriority]++;
    }

    return counts;
  }

  private printSummary(report: any): void {
    console.log('\n=== Frontend Components Submodule Alignment Audit ===');
    console.log(`Total Components: ${report.summary.totalComponents}`);
    console.log(`Need Migration: ${report.summary.needsMigration}`);
    console.log('\nBy Submodule:');

    Object.entries(report.summary.bySubmodule).forEach(([submodule, count]) => {
      console.log(`  ${submodule}: ${count} components`);
    });

    console.log('\nBy Priority:');
    Object.entries(report.summary.byPriority).forEach(([priority, count]) => {
      console.log(`  ${priority}: ${count} components`);
    });

    console.log('\nHigh Priority Components:');
    const highPriorityComponents = this.auditResults.filter(r => r.migrationPriority === 'high');
    highPriorityComponents.forEach(component => {
      console.log(`  - ${component.componentName} → ${component.suggestedSubmodule}`);
    });
  }
}

// Execute audit if script is run directly
if (require.main === module) {
  const auditor = new FrontendComponentAuditor();
  auditor.auditComponents()
    .then(() => {
      console.log('\n✅ Frontend components audit completed successfully');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n❌ Frontend components audit failed:', error);
      process.exit(1);
    });
}

export { FrontendComponentAuditor, ComponentAuditResult };