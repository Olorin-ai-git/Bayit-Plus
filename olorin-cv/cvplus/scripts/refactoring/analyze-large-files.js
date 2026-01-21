#!/usr/bin/env node

/**
 * CVPlus Large File Analysis Tool
 * Analyzes files exceeding the 200-line limit and provides refactoring suggestions
 */

const fs = require('fs');
const path = require('path');

class FileAnalyzer {
  constructor() {
    this.results = [];
    this.threshold = 200;
    this.sourcePatterns = [
      'frontend/src/**/*.{ts,tsx}',
      'functions/src/**/*.{ts,js}'
    ];
  }

  /**
   * Analyze a single file for refactoring opportunities
   */
  analyzeFile(filePath) {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const lines = content.split('\n');
      const lineCount = lines.length;

      if (lineCount <= this.threshold) {
        return null;
      }

      // Analyze file structure
      const analysis = {
        filePath: filePath.replace(process.cwd() + '/', ''),
        lineCount,
        priority: this.calculatePriority(filePath, lineCount),
        suggestions: this.generateSuggestions(content, filePath),
        complexity: this.calculateComplexity(content),
        fileType: this.getFileType(filePath)
      };

      return analysis;
    } catch (error) {
      console.error(`Error analyzing ${filePath}:`, error.message);
      return null;
    }
  }

  /**
   * Calculate refactoring priority based on file characteristics
   */
  calculatePriority(filePath, lineCount) {
    let priority = 1;

    // Critical production files get highest priority
    if (filePath.includes('CVPreview.tsx')) priority = 10;
    if (filePath.includes('cvGenerator.ts')) priority = 10;
    if (filePath.includes('ResultsPage.tsx')) priority = 9;
    if (filePath.includes('ml-pipeline.service.ts')) priority = 9;
    if (filePath.includes('ats-optimization.service.ts')) priority = 8;

    // Page components are high priority
    if (filePath.includes('/pages/') && filePath.endsWith('.tsx')) priority = Math.max(priority, 7);
    
    // Main components are medium-high priority  
    if (filePath.includes('/components/') && !filePath.includes('/features/')) priority = Math.max(priority, 6);
    
    // Services are medium priority
    if (filePath.includes('/services/')) priority = Math.max(priority, 5);
    
    // Feature components are medium priority
    if (filePath.includes('/features/')) priority = Math.max(priority, 4);
    
    // Test files are lower priority
    if (filePath.includes('.test.') || filePath.includes('/test/')) priority = Math.max(priority, 2);

    // Adjust for line count (more lines = higher priority)
    if (lineCount > 1000) priority += 2;
    else if (lineCount > 500) priority += 1;

    return Math.min(priority, 10);
  }

  /**
   * Generate specific refactoring suggestions
   */
  generateSuggestions(content, filePath) {
    const suggestions = [];
    const lines = content.split('\n');

    // Check for large React components
    if (filePath.endsWith('.tsx')) {
      const componentMatches = content.match(/export\s+(?:const|function)\s+\w+/g);
      if (componentMatches && componentMatches.length === 1) {
        suggestions.push({
          type: 'component-decomposition',
          description: 'Extract sub-components and custom hooks',
          estimatedFiles: Math.ceil(lines.length / 200),
          priority: 'high'
        });
      }

      // Check for useState hooks (might indicate complex state)
      const stateHooks = (content.match(/useState\(/g) || []).length;
      if (stateHooks > 5) {
        suggestions.push({
          type: 'state-management',
          description: 'Extract state logic into custom hooks',
          estimatedFiles: Math.ceil(stateHooks / 3),
          priority: 'medium'
        });
      }

      // Check for long JSX returns
      const jsxMatch = content.match(/return\s*\(([\s\S]*?)\);?\s*}$/m);
      if (jsxMatch && jsxMatch[1].split('\n').length > 100) {
        suggestions.push({
          type: 'jsx-extraction',
          description: 'Extract JSX into smaller components',
          estimatedFiles: 3,
          priority: 'high'
        });
      }
    }

    // Check for large service classes
    if (filePath.endsWith('.ts') && content.includes('class ')) {
      const methods = (content.match(/(?:async\s+)?(?:public\s+|private\s+|protected\s+)?\w+\s*\(/g) || []).length;
      if (methods > 10) {
        suggestions.push({
          type: 'service-decomposition',
          description: 'Split service into smaller, focused services',
          estimatedFiles: Math.ceil(methods / 5),
          priority: 'high'
        });
      }
    }

    // Check for multiple exports (might indicate multiple responsibilities)
    const exports = (content.match(/export\s+(?:const|function|class|interface)\s+\w+/g) || []).length;
    if (exports > 5) {
      suggestions.push({
        type: 'module-splitting',
        description: 'Split into multiple focused modules',
        estimatedFiles: Math.ceil(exports / 3),
        priority: 'medium'
      });
    }

    // Check for long functions
    const functionBodies = content.match(/{\s*[\s\S]*?^}/gm) || [];
    const longFunctions = functionBodies.filter(body => body.split('\n').length > 50);
    if (longFunctions.length > 0) {
      suggestions.push({
        type: 'function-extraction',
        description: `Extract ${longFunctions.length} long functions into utilities`,
        estimatedFiles: Math.ceil(longFunctions.length / 3),
        priority: 'medium'
      });
    }

    return suggestions;
  }

  /**
   * Calculate approximate complexity score
   */
  calculateComplexity(content) {
    let complexity = 0;
    
    // Count control structures
    complexity += (content.match(/\b(if|else|while|for|switch|catch)\b/g) || []).length;
    
    // Count ternary operators
    complexity += (content.match(/\?.*?:/g) || []).length;
    
    // Count logical operators
    complexity += (content.match(/&&|\|\|/g) || []).length;
    
    return complexity;
  }

  /**
   * Determine file type for appropriate refactoring strategy
   */
  getFileType(filePath) {
    if (filePath.includes('/pages/')) return 'page';
    if (filePath.includes('/components/')) return 'component';
    if (filePath.includes('/services/')) return 'service';
    if (filePath.includes('/hooks/')) return 'hook';
    if (filePath.includes('/utils/')) return 'utility';
    if (filePath.includes('.test.')) return 'test';
    return 'other';
  }

  /**
   * Recursively find all source files
   */
  findSourceFiles(dir, extensions = ['.ts', '.tsx', '.js', '.jsx']) {
    const files = [];
    
    const scanDirectory = (currentDir) => {
      if (currentDir.includes('node_modules') || currentDir.includes('.git')) return;
      
      try {
        const items = fs.readdirSync(currentDir);
        
        for (const item of items) {
          const fullPath = path.join(currentDir, item);
          const stat = fs.statSync(fullPath);
          
          if (stat.isDirectory()) {
            scanDirectory(fullPath);
          } else if (extensions.some(ext => item.endsWith(ext))) {
            files.push(fullPath);
          }
        }
      } catch (error) {
        // Skip directories we can't read
      }
    };

    scanDirectory(dir);
    return files;
  }

  /**
   * Generate refactoring report
   */
  generateReport() {
    const sourceFiles = this.findSourceFiles(process.cwd());
    console.log(`\n📊 Analyzing ${sourceFiles.length} source files...\n`);

    for (const file of sourceFiles) {
      // Only analyze frontend/src and functions/src files
      if (!file.includes('frontend/src') && !file.includes('functions/src')) continue;
      
      const analysis = this.analyzeFile(file);
      if (analysis) {
        this.results.push(analysis);
      }
    }

    // Sort by priority and line count
    this.results.sort((a, b) => {
      if (a.priority !== b.priority) return b.priority - a.priority;
      return b.lineCount - a.lineCount;
    });

    this.printReport();
    this.generateRefactoringPlan();
  }

  /**
   * Print analysis report
   */
  printReport() {
    console.log('🔍 CVPlus Large File Analysis Report');
    console.log('=====================================\n');

    console.log(`📈 Summary:`);
    console.log(`   Files over ${this.threshold} lines: ${this.results.length}`);
    console.log(`   Total lines to refactor: ${this.results.reduce((sum, r) => sum + r.lineCount, 0)}`);
    console.log(`   Average file size: ${Math.round(this.results.reduce((sum, r) => sum + r.lineCount, 0) / this.results.length)} lines\n`);

    console.log('🎯 Top Priority Files:\n');
    
    this.results.slice(0, 10).forEach((result, index) => {
      console.log(`${index + 1}. ${result.filePath}`);
      console.log(`   Lines: ${result.lineCount} | Priority: ${result.priority}/10 | Type: ${result.fileType}`);
      console.log(`   Complexity: ${result.complexity} | Suggestions: ${result.suggestions.length}`);
      
      if (result.suggestions.length > 0) {
        result.suggestions.forEach(suggestion => {
          console.log(`   → ${suggestion.description} (${suggestion.estimatedFiles} files)`);
        });
      }
      console.log();
    });
  }

  /**
   * Generate actionable refactoring plan
   */
  generateRefactoringPlan() {
    console.log('📋 Refactoring Action Plan');
    console.log('==========================\n');

    const phases = {
      'Phase 1 - Critical Components': this.results.filter(r => r.priority >= 8),
      'Phase 2 - Core Services': this.results.filter(r => r.priority >= 6 && r.priority < 8),
      'Phase 3 - Feature Components': this.results.filter(r => r.priority >= 4 && r.priority < 6),
      'Phase 4 - Support Files': this.results.filter(r => r.priority < 4)
    };

    Object.entries(phases).forEach(([phase, files]) => {
      if (files.length === 0) return;

      console.log(`\n${phase} (${files.length} files):`);
      console.log('─'.repeat(phase.length + 15));

      files.slice(0, 5).forEach(file => {
        const totalEstimatedFiles = file.suggestions.reduce((sum, s) => sum + s.estimatedFiles, 0);
        console.log(`• ${file.filePath.split('/').pop()} (${file.lineCount} lines → ~${totalEstimatedFiles || Math.ceil(file.lineCount / 200)} files)`);
      });

      if (files.length > 5) {
        console.log(`  ... and ${files.length - 5} more files`);
      }
    });

    console.log('\n🎯 Immediate Actions:');
    console.log('1. Start with CVPreview.tsx decomposition');
    console.log('2. Extract reusable hooks and utilities');
    console.log('3. Create component library structure');
    console.log('4. Implement automated line count checking\n');
  }
}

// Run the analysis
if (require.main === module) {
  const analyzer = new FileAnalyzer();
  analyzer.generateReport();
}

module.exports = FileAnalyzer;