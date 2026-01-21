#!/usr/bin/env ts-node

/**
 * Advanced Dependency Scanner for CVPlus
 * Performs AST-based analysis of TypeScript modules to detect dependency violations
 * Author: Gil Klainert
 * Date: 2025-08-30
 */

import * as ts from 'typescript';
import * as fs from 'fs';
import * as path from 'path';
import { glob } from 'glob';

// Module layer definitions
export enum ModuleLayer {
  CORE = 0,
  FOUNDATION = 1,
  DOMAIN = 2,
  FEATURE = 3,
  APPLICATION = 4
}

// Module configuration with assigned layers
export const MODULE_LAYERS: Record<string, ModuleLayer> = {
  'core': ModuleLayer.CORE,
  'auth': ModuleLayer.FOUNDATION,
  'i18n': ModuleLayer.FOUNDATION,
  'multimedia': ModuleLayer.DOMAIN,
  'cv-processing': ModuleLayer.DOMAIN,
  'analytics': ModuleLayer.DOMAIN,
  'premium': ModuleLayer.FEATURE,
  'recommendations': ModuleLayer.FEATURE,
  'public-profiles': ModuleLayer.FEATURE,
  'payments': ModuleLayer.FEATURE,
  'admin': ModuleLayer.APPLICATION,
  'workflow': ModuleLayer.APPLICATION
};

export interface DependencyViolation {
  module: string;
  file: string;
  line: number;
  column: number;
  importPath: string;
  targetModule: string;
  violationType: 'layer' | 'circular' | 'forbidden' | 'peer';
  severity: 'critical' | 'major' | 'minor' | 'warning';
  message: string;
}

export interface ModuleDependencies {
  module: string;
  layer: ModuleLayer;
  dependencies: Set<string>;
  externalDependencies: Set<string>;
  violations: DependencyViolation[];
  fileCount: number;
  importCount: number;
}

export class DependencyScanner {
  private projectRoot: string;
  private moduleDependencies: Map<string, ModuleDependencies> = new Map();
  private program: ts.Program | null = null;

  constructor(projectRoot: string) {
    this.projectRoot = projectRoot;
  }

  /**
   * Scan all modules for dependencies
   */
  async scanAllModules(): Promise<Map<string, ModuleDependencies>> {
    console.log('🔍 Starting comprehensive dependency scan...\n');
    
    for (const [moduleName, layer] of Object.entries(MODULE_LAYERS)) {
      const modulePath = path.join(this.projectRoot, 'packages', moduleName);
      
      if (fs.existsSync(modulePath)) {
        console.log(`Scanning module: ${moduleName} (Layer ${layer})`);
        await this.scanModule(moduleName, modulePath);
      } else {
        console.log(`⚠️  Module path not found: ${modulePath}`);
      }
    }
    
    // Detect circular dependencies
    this.detectCircularDependencies();
    
    return this.moduleDependencies;
  }

  /**
   * Scan a single module for dependencies
   */
  private async scanModule(moduleName: string, modulePath: string): Promise<void> {
    const moduleData: ModuleDependencies = {
      module: moduleName,
      layer: MODULE_LAYERS[moduleName],
      dependencies: new Set(),
      externalDependencies: new Set(),
      violations: [],
      fileCount: 0,
      importCount: 0
    };

    // Find all TypeScript files
    const files = glob.sync('**/*.{ts,tsx}', {
      cwd: modulePath,
      ignore: ['node_modules/**', '**/*.d.ts', '**/*.test.ts', '**/*.spec.ts']
    });

    moduleData.fileCount = files.length;

    // Parse each file for imports
    for (const file of files) {
      const filePath = path.join(modulePath, file);
      await this.analyzeFile(filePath, moduleName, moduleData);
    }

    this.moduleDependencies.set(moduleName, moduleData);
  }

  /**
   * Analyze a single file for imports using TypeScript AST
   */
  private async analyzeFile(filePath: string, moduleName: string, moduleData: ModuleDependencies): Promise<void> {
    const sourceCode = fs.readFileSync(filePath, 'utf-8');
    const sourceFile = ts.createSourceFile(
      filePath,
      sourceCode,
      ts.ScriptTarget.Latest,
      true
    );

    const visitNode = (node: ts.Node) => {
      if (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) {
        const moduleSpecifier = node.moduleSpecifier;
        
        if (moduleSpecifier && ts.isStringLiteral(moduleSpecifier)) {
          const importPath = moduleSpecifier.text;
          moduleData.importCount++;
          
          // Analyze the import
          this.analyzeImport(
            importPath,
            filePath,
            moduleName,
            moduleData,
            sourceFile.getLineAndCharacterOfPosition(moduleSpecifier.pos)
          );
        }
      }
      
      ts.forEachChild(node, visitNode);
    };

    visitNode(sourceFile);
  }

  /**
   * Analyze an import statement for violations
   */
  private analyzeImport(
    importPath: string,
    filePath: string,
    currentModule: string,
    moduleData: ModuleDependencies,
    position: ts.LineAndCharacter
  ): void {
    // Check if it's a CVPlus module import
    const cvplusMatch = importPath.match(/^@cvplus\/([^\/]+)/);
    
    if (cvplusMatch) {
      const targetModule = cvplusMatch[1];
      moduleData.dependencies.add(targetModule);
      
      // Check for layer violations
      this.checkLayerViolation(
        currentModule,
        targetModule,
        filePath,
        position,
        moduleData
      );
      
      // Check for forbidden imports
      this.checkForbiddenImport(
        currentModule,
        targetModule,
        filePath,
        position,
        moduleData
      );
    } else if (!importPath.startsWith('.') && !importPath.startsWith('/')) {
      // External dependency
      moduleData.externalDependencies.add(importPath.split('/')[0]);
    }
  }

  /**
   * Check for layer violations
   */
  private checkLayerViolation(
    sourceModule: string,
    targetModule: string,
    filePath: string,
    position: ts.LineAndCharacter,
    moduleData: ModuleDependencies
  ): void {
    const sourceLayer = MODULE_LAYERS[sourceModule];
    const targetLayer = MODULE_LAYERS[targetModule];
    
    // Rule: Can only import from lower layers
    if (targetLayer > sourceLayer) {
      moduleData.violations.push({
        module: sourceModule,
        file: path.relative(this.projectRoot, filePath),
        line: position.line + 1,
        column: position.character + 1,
        importPath: `@cvplus/${targetModule}`,
        targetModule,
        violationType: 'layer',
        severity: 'critical',
        message: `Layer violation: ${sourceModule} (layer ${sourceLayer}) cannot import from ${targetModule} (layer ${targetLayer})`
      });
    }
    
    // Rule: Same layer imports are forbidden (peer dependencies)
    if (targetLayer === sourceLayer && sourceModule !== targetModule) {
      moduleData.violations.push({
        module: sourceModule,
        file: path.relative(this.projectRoot, filePath),
        line: position.line + 1,
        column: position.character + 1,
        importPath: `@cvplus/${targetModule}`,
        targetModule,
        violationType: 'peer',
        severity: 'major',
        message: `Peer dependency violation: ${sourceModule} cannot import from ${targetModule} (same layer ${sourceLayer})`
      });
    }
  }

  /**
   * Check for forbidden imports (special rules)
   */
  private checkForbiddenImport(
    sourceModule: string,
    targetModule: string,
    filePath: string,
    position: ts.LineAndCharacter,
    moduleData: ModuleDependencies
  ): void {
    // Core module cannot import from ANY other CVPlus module
    if (sourceModule === 'core' && targetModule !== 'core') {
      moduleData.violations.push({
        module: sourceModule,
        file: path.relative(this.projectRoot, filePath),
        line: position.line + 1,
        column: position.character + 1,
        importPath: `@cvplus/${targetModule}`,
        targetModule,
        violationType: 'forbidden',
        severity: 'critical',
        message: `Forbidden import: Core module cannot import from any other CVPlus module`
      });
    }
  }

  /**
   * Detect circular dependencies using DFS
   */
  private detectCircularDependencies(): void {
    const visited = new Set<string>();
    const recursionStack = new Set<string>();
    
    const hasCycle = (module: string, path: string[] = []): string[] | null => {
      visited.add(module);
      recursionStack.add(module);
      path.push(module);
      
      const moduleData = this.moduleDependencies.get(module);
      if (moduleData) {
        for (const dep of moduleData.dependencies) {
          if (!visited.has(dep)) {
            const cyclePath = hasCycle(dep, [...path]);
            if (cyclePath) return cyclePath;
          } else if (recursionStack.has(dep)) {
            // Found a cycle
            const cycleStart = path.indexOf(dep);
            return path.slice(cycleStart);
          }
        }
      }
      
      recursionStack.delete(module);
      return null;
    };
    
    // Check each module for cycles
    for (const module of this.moduleDependencies.keys()) {
      if (!visited.has(module)) {
        const cyclePath = hasCycle(module);
        if (cyclePath) {
          // Add circular dependency violations
          for (let i = 0; i < cyclePath.length; i++) {
            const currentModule = cyclePath[i];
            const nextModule = cyclePath[(i + 1) % cyclePath.length];
            const moduleData = this.moduleDependencies.get(currentModule);
            
            if (moduleData) {
              moduleData.violations.push({
                module: currentModule,
                file: 'N/A',
                line: 0,
                column: 0,
                importPath: `@cvplus/${nextModule}`,
                targetModule: nextModule,
                violationType: 'circular',
                severity: 'critical',
                message: `Circular dependency detected: ${cyclePath.join(' → ')} → ${cyclePath[0]}`
              });
            }
          }
        }
      }
    }
  }

  /**
   * Generate summary report
   */
  generateSummary(): void {
    console.log('\n' + '='.repeat(80));
    console.log('DEPENDENCY SCAN SUMMARY');
    console.log('='.repeat(80) + '\n');
    
    let totalViolations = 0;
    let criticalCount = 0;
    let majorCount = 0;
    let minorCount = 0;
    
    for (const [moduleName, data] of this.moduleDependencies) {
      const violations = data.violations.length;
      totalViolations += violations;
      
      criticalCount += data.violations.filter(v => v.severity === 'critical').length;
      majorCount += data.violations.filter(v => v.severity === 'major').length;
      minorCount += data.violations.filter(v => v.severity === 'minor').length;
      
      const status = violations === 0 ? '✅' : '❌';
      console.log(`${status} ${moduleName.padEnd(20)} Layer: ${data.layer} | Files: ${data.fileCount} | Imports: ${data.importCount} | Violations: ${violations}`);
    }
    
    console.log('\n' + '-'.repeat(80));
    console.log(`Total Violations: ${totalViolations}`);
    console.log(`  Critical: ${criticalCount}`);
    console.log(`  Major: ${majorCount}`);
    console.log(`  Minor: ${minorCount}`);
    console.log('-'.repeat(80) + '\n');
  }

  /**
   * Export results to JSON
   */
  exportToJSON(outputPath: string): void {
    const results = {
      timestamp: new Date().toISOString(),
      modules: Array.from(this.moduleDependencies.entries()).map(([name, data]) => ({
        name,
        layer: data.layer,
        dependencies: Array.from(data.dependencies),
        externalDependencies: Array.from(data.externalDependencies),
        violations: data.violations,
        metrics: {
          fileCount: data.fileCount,
          importCount: data.importCount,
          violationCount: data.violations.length
        }
      })),
      summary: {
        totalModules: this.moduleDependencies.size,
        totalViolations: Array.from(this.moduleDependencies.values())
          .reduce((sum, m) => sum + m.violations.length, 0),
        criticalViolations: Array.from(this.moduleDependencies.values())
          .reduce((sum, m) => sum + m.violations.filter(v => v.severity === 'critical').length, 0)
      }
    };
    
    fs.writeFileSync(outputPath, JSON.stringify(results, null, 2));
    console.log(`📄 Results exported to: ${outputPath}`);
  }
}

// Main execution
if (require.main === module) {
  const projectRoot = path.resolve(__dirname, '../..');
  const scanner = new DependencyScanner(projectRoot);
  
  scanner.scanAllModules().then(() => {
    scanner.generateSummary();
    scanner.exportToJSON(path.join(projectRoot, 'dependency-scan-results.json'));
    
    // Exit with error code if critical violations found
    const hasViolations = Array.from(scanner['moduleDependencies'].values())
      .some(m => m.violations.some(v => v.severity === 'critical'));
    
    process.exit(hasViolations ? 1 : 0);
  });
}

export default DependencyScanner;