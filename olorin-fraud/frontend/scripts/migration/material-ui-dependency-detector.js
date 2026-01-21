#!/usr/bin/env node

/**
 * Material-UI Dependency Detector
 *
 * Automated script to detect and analyze Material-UI dependencies
 * in the codebase during the migration process.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Material-UI packages to detect
const MUI_PACKAGES = [
  '@mui/material',
  '@mui/icons-material',
  '@mui/lab',
  '@mui/system',
  '@mui/styles',
  'styled-components',
  '@emotion/react',
  '@emotion/styled'
];

// Material-UI component patterns
const MUI_COMPONENT_PATTERNS = [
  // Common MUI components
  /\b(AppBar|Toolbar|Typography|Button|TextField|Paper|Container|Grid|Card|CardContent|CardActions|Box|Stack|Chip|Avatar|IconButton|Drawer|Dialog|DialogTitle|DialogContent|DialogActions|List|ListItem|ListItemText|Menu|MenuItem|Select|FormControl|InputLabel|Checkbox|Radio|Switch|Slider|Tabs|Tab|Table|TableHead|TableBody|TableRow|TableCell|CircularProgress|LinearProgress|Alert|Snackbar|Tooltip|Popover|Accordion|AccordionSummary|AccordionDetails|Stepper|Step|StepLabel|Breadcrumbs|Pagination|Rating|Autocomplete|DatePicker|TimePicker)\b/g,

  // MUI styling patterns
  /makeStyles|withStyles|createTheme|ThemeProvider|styled\(/g,

  // MUI icons patterns
  /\b[A-Z][a-zA-Z]*Icon\b/g,

  // Material-UI class names
  /Mui[A-Z][a-zA-Z]*/g,

  // Emotion styled components
  /styled\.[a-z]+`/g,
  /styled\([^)]+\)`/g
];

// Configuration
const CONFIG = {
  rootDir: process.cwd(),
  sourceDir: 'src/js',
  outputDir: 'docs/migration',
  excludeDirs: ['node_modules', 'build', 'dist', '.git'],
  extensions: ['.ts', '.tsx', '.js', '.jsx'],
  verbose: process.argv.includes('--verbose') || process.argv.includes('-v'),
  fix: process.argv.includes('--fix'),
  reportFormat: process.argv.includes('--json') ? 'json' : 'markdown'
};

class MaterialUIDependencyDetector {
  constructor() {
    this.results = {
      summary: {
        totalFiles: 0,
        filesWithDependencies: 0,
        totalDependencies: 0,
        packageDependencies: new Map(),
        componentUsage: new Map(),
        lastScan: new Date().toISOString()
      },
      files: [],
      packages: [],
      recommendations: []
    };
  }

  /**
   * Main detection process
   */
  async detect() {
    console.log('🔍 Starting Material-UI dependency detection...\n');

    try {
      // Step 1: Check package.json dependencies
      await this.checkPackageDependencies();

      // Step 2: Scan source files
      await this.scanSourceFiles();

      // Step 3: Generate report
      await this.generateReport();

      // Step 4: Apply fixes if requested
      if (CONFIG.fix) {
        await this.applyFixes();
      }

      console.log('\n✅ Material-UI dependency detection completed!');
    } catch (error) {
      console.error('❌ Error during detection:', error.message);
      process.exit(1);
    }
  }

  /**
   * Check package.json for Material-UI dependencies
   */
  async checkPackageDependencies() {
    console.log('📦 Checking package.json dependencies...');

    const packageJsonPath = path.join(CONFIG.rootDir, 'package.json');

    if (!fs.existsSync(packageJsonPath)) {
      console.warn('⚠️  package.json not found');
      return;
    }

    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    const allDeps = {
      ...packageJson.dependencies,
      ...packageJson.devDependencies
    };

    MUI_PACKAGES.forEach(pkg => {
      if (allDeps[pkg]) {
        this.results.packages.push({
          name: pkg,
          version: allDeps[pkg],
          type: packageJson.dependencies[pkg] ? 'dependency' : 'devDependency',
          shouldRemove: true
        });
        this.results.summary.packageDependencies.set(pkg, allDeps[pkg]);
      }
    });

    if (this.results.packages.length > 0) {
      console.log(`   Found ${this.results.packages.length} Material-UI packages:`);
      this.results.packages.forEach(pkg => {
        console.log(`   - ${pkg.name}@${pkg.version} (${pkg.type})`);
      });
    } else {
      console.log('   ✅ No Material-UI packages found in package.json');
    }
  }

  /**
   * Scan source files for Material-UI usage
   */
  async scanSourceFiles() {
    console.log('\n📁 Scanning source files...');

    const sourceDir = path.join(CONFIG.rootDir, CONFIG.sourceDir);

    if (!fs.existsSync(sourceDir)) {
      console.warn(`⚠️  Source directory ${CONFIG.sourceDir} not found`);
      return;
    }

    const files = this.getAllFiles(sourceDir);
    this.results.summary.totalFiles = files.length;

    console.log(`   Scanning ${files.length} files...`);

    for (const filePath of files) {
      await this.scanFile(filePath);
    }

    console.log(`   ✅ Scanned ${files.length} files`);
    console.log(`   📊 Found dependencies in ${this.results.summary.filesWithDependencies} files`);
  }

  /**
   * Scan individual file for Material-UI usage
   */
  async scanFile(filePath) {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const relativePath = path.relative(CONFIG.rootDir, filePath);

      const fileResult = {
        path: relativePath,
        imports: [],
        components: [],
        patterns: [],
        lineCount: content.split('\n').length,
        severity: 'none'
      };

      // Check for Material-UI imports
      this.checkImports(content, fileResult);

      // Check for Material-UI component usage
      this.checkComponentUsage(content, fileResult);

      // Check for styling patterns
      this.checkStylingPatterns(content, fileResult);

      // Determine severity
      this.determineSeverity(fileResult);

      if (fileResult.severity !== 'none') {
        this.results.files.push(fileResult);
        this.results.summary.filesWithDependencies++;
        this.results.summary.totalDependencies +=
          fileResult.imports.length + fileResult.components.length + fileResult.patterns.length;
      }

      if (CONFIG.verbose && fileResult.severity !== 'none') {
        console.log(`   📄 ${relativePath}: ${fileResult.severity} (${fileResult.imports.length + fileResult.components.length + fileResult.patterns.length} issues)`);
      }
    } catch (error) {
      console.warn(`   ⚠️  Error scanning ${filePath}: ${error.message}`);
    }
  }

  /**
   * Check for Material-UI imports
   */
  checkImports(content, fileResult) {
    const importPatterns = [
      // ES6 imports
      /import\s+.*\s+from\s+['"](@mui\/[^'"]+|styled-components|@emotion\/[^'"]+)['"]/g,
      // Dynamic imports
      /import\(['"](@mui\/[^'"]+|styled-components|@emotion\/[^'"]+)['"]\)/g,
      // Require statements
      /require\(['"](@mui\/[^'"]+|styled-components|@emotion\/[^'"]+)['"]\)/g
    ];

    importPatterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        const importLine = match[0];
        const packageName = match[1];

        fileResult.imports.push({
          line: importLine.trim(),
          package: packageName,
          lineNumber: this.getLineNumber(content, match.index)
        });
      }
    });
  }

  /**
   * Check for Material-UI component usage
   */
  checkComponentUsage(content, fileResult) {
    MUI_COMPONENT_PATTERNS.forEach((pattern, index) => {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        const component = match[0];
        const lineNumber = this.getLineNumber(content, match.index);

        fileResult.components.push({
          component,
          lineNumber,
          pattern: index
        });

        // Update global component usage stats
        const count = this.results.summary.componentUsage.get(component) || 0;
        this.results.summary.componentUsage.set(component, count + 1);
      }
    });
  }

  /**
   * Check for Material-UI styling patterns
   */
  checkStylingPatterns(content, fileResult) {
    const stylingPatterns = [
      /makeStyles\([^)]*\)/g,
      /withStyles\([^)]*\)/g,
      /createTheme\([^)]*\)/g,
      /ThemeProvider/g,
      /styled\([^)]+\)/g,
      /\.classes\.[a-zA-Z]/g,
      /theme\.palette\./g,
      /theme\.spacing\(/g
    ];

    stylingPatterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        fileResult.patterns.push({
          pattern: match[0],
          lineNumber: this.getLineNumber(content, match.index),
          type: 'styling'
        });
      }
    });
  }

  /**
   * Determine severity level for file
   */
  determineSeverity(fileResult) {
    const totalIssues = fileResult.imports.length + fileResult.components.length + fileResult.patterns.length;

    if (totalIssues === 0) {
      fileResult.severity = 'none';
    } else if (totalIssues <= 5) {
      fileResult.severity = 'low';
    } else if (totalIssues <= 15) {
      fileResult.severity = 'medium';
    } else {
      fileResult.severity = 'high';
    }

    // Override severity for large files
    if (fileResult.lineCount > 500) {
      fileResult.severity = 'critical';
    }
  }

  /**
   * Generate recommendations
   */
  generateRecommendations() {
    // Package removal recommendations
    if (this.results.packages.length > 0) {
      this.results.recommendations.push({
        type: 'package-removal',
        priority: 'high',
        title: 'Remove Material-UI Packages',
        description: `Remove ${this.results.packages.length} Material-UI packages from package.json`,
        packages: this.results.packages.map(p => p.name),
        command: `npm uninstall ${this.results.packages.map(p => p.name).join(' ')}`
      });
    }

    // File migration recommendations
    const highSeverityFiles = this.results.files.filter(f => f.severity === 'high' || f.severity === 'critical');
    if (highSeverityFiles.length > 0) {
      this.results.recommendations.push({
        type: 'file-migration',
        priority: 'critical',
        title: 'Migrate High-Priority Files',
        description: `${highSeverityFiles.length} files require immediate attention`,
        files: highSeverityFiles.map(f => f.path)
      });
    }

    // Component usage recommendations
    const topComponents = Array.from(this.results.summary.componentUsage.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);

    if (topComponents.length > 0) {
      this.results.recommendations.push({
        type: 'component-migration',
        priority: 'medium',
        title: 'Most Used Components',
        description: 'Focus migration efforts on these commonly used components',
        components: topComponents.map(([component, count]) => ({ component, count }))
      });
    }
  }

  /**
   * Generate migration report
   */
  async generateReport() {
    console.log('\n📊 Generating migration report...');

    this.generateRecommendations();

    const outputDir = path.join(CONFIG.rootDir, CONFIG.outputDir);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    if (CONFIG.reportFormat === 'json') {
      await this.generateJSONReport(outputDir);
    } else {
      await this.generateMarkdownReport(outputDir);
    }

    console.log(`   ✅ Report generated in ${CONFIG.outputDir}/`);
  }

  /**
   * Generate JSON report
   */
  async generateJSONReport(outputDir) {
    const reportPath = path.join(outputDir, 'material-ui-dependencies.json');

    // Convert Maps to Objects for JSON serialization
    const jsonResults = {
      ...this.results,
      summary: {
        ...this.results.summary,
        packageDependencies: Object.fromEntries(this.results.summary.packageDependencies),
        componentUsage: Object.fromEntries(this.results.summary.componentUsage)
      }
    };

    fs.writeFileSync(reportPath, JSON.stringify(jsonResults, null, 2));
  }

  /**
   * Generate Markdown report
   */
  async generateMarkdownReport(outputDir) {
    const reportPath = path.join(outputDir, 'material-ui-dependency-report.md');

    let markdown = `# Material-UI Dependency Detection Report

**Generated:** ${this.results.summary.lastScan}
**Total Files Scanned:** ${this.results.summary.totalFiles}
**Files with Dependencies:** ${this.results.summary.filesWithDependencies}
**Total Dependencies Found:** ${this.results.summary.totalDependencies}

## Summary

`;

    // Package dependencies section
    if (this.results.packages.length > 0) {
      markdown += `### 📦 Package Dependencies

| Package | Version | Type | Action Required |
|---------|---------|------|-----------------|
`;
      this.results.packages.forEach(pkg => {
        markdown += `| ${pkg.name} | ${pkg.version} | ${pkg.type} | ❌ Remove |\n`;
      });
      markdown += '\n';
    }

    // High priority files section
    const criticalFiles = this.results.files.filter(f => f.severity === 'critical' || f.severity === 'high');
    if (criticalFiles.length > 0) {
      markdown += `### 🚨 High Priority Files

| File | Severity | Imports | Components | Patterns | Lines |
|------|----------|---------|------------|----------|-------|
`;
      criticalFiles.forEach(file => {
        markdown += `| ${file.path} | ${file.severity.toUpperCase()} | ${file.imports.length} | ${file.components.length} | ${file.patterns.length} | ${file.lineCount} |\n`;
      });
      markdown += '\n';
    }

    // Component usage statistics
    if (this.results.summary.componentUsage.size > 0) {
      markdown += `### 📊 Most Used Components

| Component | Usage Count |
|-----------|-------------|
`;
      const topComponents = Array.from(this.results.summary.componentUsage.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 15);

      topComponents.forEach(([component, count]) => {
        markdown += `| ${component} | ${count} |\n`;
      });
      markdown += '\n';
    }

    // Recommendations section
    if (this.results.recommendations.length > 0) {
      markdown += `## 🎯 Recommendations

`;
      this.results.recommendations.forEach((rec, index) => {
        markdown += `### ${index + 1}. ${rec.title} (${rec.priority.toUpperCase()} Priority)

${rec.description}

`;
        if (rec.command) {
          markdown += `**Command:**
\`\`\`bash
${rec.command}
\`\`\`

`;
        }

        if (rec.files) {
          markdown += `**Files to migrate:**
${rec.files.map(f => `- ${f}`).join('\n')}

`;
        }

        if (rec.packages) {
          markdown += `**Packages to remove:**
${rec.packages.map(p => `- ${p}`).join('\n')}

`;
        }

        if (rec.components) {
          markdown += `**Components by usage:**
${rec.components.map(c => `- ${c.component} (${c.count} uses)`).join('\n')}

`;
        }
      });
    }

    // Detailed file analysis
    if (this.results.files.length > 0) {
      markdown += `## 📁 Detailed File Analysis

`;
      this.results.files
        .sort((a, b) => {
          const severityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
          return severityOrder[b.severity] - severityOrder[a.severity];
        })
        .forEach(file => {
          markdown += `### ${file.path}

**Severity:** ${file.severity.toUpperCase()}
**Lines:** ${file.lineCount}
**Issues:** ${file.imports.length + file.components.length + file.patterns.length}

`;
          if (file.imports.length > 0) {
            markdown += `**Imports:**
${file.imports.map(imp => `- Line ${imp.lineNumber}: \`${imp.line}\``).join('\n')}

`;
          }

          if (file.components.length > 0) {
            markdown += `**Components:**
${file.components.slice(0, 10).map(comp => `- Line ${comp.lineNumber}: \`${comp.component}\``).join('\n')}
${file.components.length > 10 ? `... and ${file.components.length - 10} more\n` : ''}

`;
          }
        });
    }

    fs.writeFileSync(reportPath, markdown);
  }

  /**
   * Apply automated fixes
   */
  async applyFixes() {
    console.log('\n🔧 Applying automated fixes...');

    // This is a placeholder for automated fixes
    // In a real implementation, this would:
    // 1. Create backup of files
    // 2. Apply simple replacements
    // 3. Update imports
    // 4. Run formatters

    console.log('   ⚠️  Automated fixes not implemented yet');
    console.log('   💡 Use the generated report to manually apply fixes');
  }

  /**
   * Utility: Get all files in directory recursively
   */
  getAllFiles(dir) {
    const files = [];

    const scan = (currentDir) => {
      const items = fs.readdirSync(currentDir);

      for (const item of items) {
        const fullPath = path.join(currentDir, item);
        const stat = fs.statSync(fullPath);

        if (stat.isDirectory()) {
          if (!CONFIG.excludeDirs.includes(item)) {
            scan(fullPath);
          }
        } else if (stat.isFile()) {
          const ext = path.extname(fullPath);
          if (CONFIG.extensions.includes(ext)) {
            files.push(fullPath);
          }
        }
      }
    };

    scan(dir);
    return files;
  }

  /**
   * Utility: Get line number from text offset
   */
  getLineNumber(content, offset) {
    return content.substring(0, offset).split('\n').length;
  }
}

// CLI execution
if (require.main === module) {
  const detector = new MaterialUIDependencyDetector();
  detector.detect().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

module.exports = MaterialUIDependencyDetector;