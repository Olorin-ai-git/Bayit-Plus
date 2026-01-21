#!/usr/bin/env node

/**
 * CVPlus Refactoring Executor
 * Automated tool to help execute the refactoring plan
 */

const fs = require('fs');
const path = require('path');

class RefactorExecutor {
  constructor() {
    this.dryRun = process.argv.includes('--dry-run');
    this.verbose = process.argv.includes('--verbose');
    this.createBackups = !process.argv.includes('--no-backup');
  }

  /**
   * Execute CVPreview.tsx refactoring
   */
  async refactorCVPreview() {
    console.log('🔧 Starting CVPreview.tsx refactoring...\n');

    const sourceFile = 'frontend/src/components/CVPreview.tsx';
    const targetStructure = {
      'frontend/src/components/cv-preview/CVPreview.tsx': {
        description: 'Main orchestrator component',
        maxLines: 150,
        extractFrom: ['component definition', 'main props', 'basic state']
      },
      'frontend/src/components/cv-preview/CVPreviewContent.tsx': {
        description: 'HTML content generation',
        maxLines: 180,
        extractFrom: ['generatePreviewHTML', 'template rendering']
      },
      'frontend/src/components/cv-preview/CVPreviewToolbar.tsx': {
        description: 'Editing controls and toolbar',
        maxLines: 120,
        extractFrom: ['toolbar JSX', 'editing controls', 'action buttons']
      },
      'frontend/src/components/cv-preview/sections/EditableSection.tsx': {
        description: 'Individual section editing',
        maxLines: 150,
        extractFrom: ['section editing logic', 'handleSectionEdit']
      },
      'frontend/src/components/cv-preview/sections/FeaturePreview.tsx': {
        description: 'Feature preview generation',
        maxLines: 180,
        extractFrom: ['generateFeaturePreview', 'getMockFeatureData']
      },
      'frontend/src/components/cv-preview/sections/QRCodeSection.tsx': {
        description: 'QR code management',
        maxLines: 100,
        extractFrom: ['QR code state', 'handleQRCodeUpdate']
      },
      'frontend/src/hooks/useCVPreview.ts': {
        description: 'Main state management hook',
        maxLines: 150,
        extractFrom: ['useState hooks', 'useEffect hooks', 'main state logic']
      },
      'frontend/src/hooks/useAutoSave.ts': {
        description: 'Auto-save functionality',
        maxLines: 80,
        extractFrom: ['triggerAutoSave', 'auto-save timeout logic']
      },
      'frontend/src/hooks/useFeaturePreviews.ts': {
        description: 'Feature preview state management',
        maxLines: 120,
        extractFrom: ['feature preview state', 'feature toggle logic']
      },
      'frontend/src/hooks/useAchievementAnalysis.ts': {
        description: 'Achievement analysis logic',
        maxLines: 90,
        extractFrom: ['handleAchievementAnalysis', 'achievement state']
      },
      'frontend/src/utils/cvTemplateGenerator.ts': {
        description: 'CV template generation utilities',
        maxLines: 180,
        extractFrom: ['template generation', 'HTML generation helpers']
      },
      'frontend/src/utils/featureRenderer.ts': {
        description: 'Feature rendering utilities',
        maxLines: 150,
        extractFrom: ['feature rendering logic', 'mock data generation']
      }
    };

    await this.executeRefactoring(sourceFile, targetStructure);
  }

  /**
   * Execute ML Pipeline service refactoring
   */
  async refactorMLPipeline() {
    console.log('🔧 Starting ML Pipeline service refactoring...\n');

    const sourceFile = 'functions/src/services/ml-pipeline.service.ts';
    const targetStructure = {
      'functions/src/services/ml-pipeline/MLPipelineOrchestrator.ts': {
        description: 'Main pipeline coordinator',
        maxLines: 150,
        extractFrom: ['main class definition', 'orchestration logic']
      },
      'functions/src/services/ml-pipeline/algorithms/ScoreCalculator.ts': {
        description: 'Scoring algorithms',
        maxLines: 180,
        extractFrom: ['scoring methods', 'calculation logic']
      },
      'functions/src/services/ml-pipeline/algorithms/RecommendationEngine.ts': {
        description: 'ML recommendation engine',
        maxLines: 200,
        extractFrom: ['recommendation logic', 'ML model integration']
      },
      'functions/src/services/ml-pipeline/algorithms/PredictionModel.ts': {
        description: 'Prediction model logic',
        maxLines: 180,
        extractFrom: ['prediction methods', 'model training']
      },
      'functions/src/services/ml-pipeline/processors/DataPreprocessor.ts': {
        description: 'Data preprocessing',
        maxLines: 150,
        extractFrom: ['data cleaning', 'preprocessing logic']
      },
      'functions/src/services/ml-pipeline/processors/FeatureExtractor.ts': {
        description: 'Feature extraction',
        maxLines: 180,
        extractFrom: ['feature extraction', 'data transformation']
      },
      'functions/src/services/ml-pipeline/processors/ModelTrainer.ts': {
        description: 'Model training logic',
        maxLines: 165,
        extractFrom: ['training methods', 'model validation']
      },
      'functions/src/services/ml-pipeline/utils/MLUtils.ts': {
        description: 'ML utility functions',
        maxLines: 100,
        extractFrom: ['utility methods', 'helper functions']
      }
    };

    await this.executeRefactoring(sourceFile, targetStructure);
  }

  /**
   * Execute service generator refactoring
   */
  async refactorCVGenerator() {
    console.log('🔧 Starting CV Generator service refactoring...\n');

    const sourceFile = 'functions/src/services/cvGenerator.ts';
    const targetStructure = {
      'functions/src/services/cv-generation/CVGeneratorOrchestrator.ts': {
        description: 'Main generation coordinator',
        maxLines: 150,
        extractFrom: ['main orchestration', 'service coordination']
      },
      'functions/src/services/cv-generation/templates/TemplateEngine.ts': {
        description: 'Template processing engine',
        maxLines: 180,
        extractFrom: ['template processing', 'template selection']
      },
      'functions/src/services/cv-generation/templates/ClassicTemplate.ts': {
        description: 'Classic template implementation',
        maxLines: 150,
        extractFrom: ['classic template logic']
      },
      'functions/src/services/cv-generation/templates/ModernTemplate.ts': {
        description: 'Modern template implementation',
        maxLines: 150,
        extractFrom: ['modern template logic']
      },
      'functions/src/services/cv-generation/templates/CreativeTemplate.ts': {
        description: 'Creative template implementation',
        maxLines: 150,
        extractFrom: ['creative template logic']
      },
      'functions/src/services/cv-generation/formats/HTMLGenerator.ts': {
        description: 'HTML format generation',
        maxLines: 200,
        extractFrom: ['HTML generation logic']
      },
      'functions/src/services/cv-generation/formats/PDFGenerator.ts': {
        description: 'PDF format generation',
        maxLines: 200,
        extractFrom: ['PDF generation logic']
      },
      'functions/src/services/cv-generation/formats/DOCXGenerator.ts': {
        description: 'DOCX format generation',
        maxLines: 200,
        extractFrom: ['DOCX generation logic']
      },
      'functions/src/services/cv-generation/formats/FormatFactory.ts': {
        description: 'Format factory pattern',
        maxLines: 100,
        extractFrom: ['format selection', 'factory methods']
      }
    };

    await this.executeRefactoring(sourceFile, targetStructure);
  }

  /**
   * Execute refactoring for a specific file
   */
  async executeRefactoring(sourceFile, targetStructure) {
    const fullSourcePath = path.join(process.cwd(), sourceFile);
    
    if (!fs.existsSync(fullSourcePath)) {
      console.error(`❌ Source file not found: ${sourceFile}`);
      return;
    }

    // Create backup if needed
    if (this.createBackups && !this.dryRun) {
      const backupPath = `${fullSourcePath}.backup.${Date.now()}`;
      fs.copyFileSync(fullSourcePath, backupPath);
      console.log(`📋 Backup created: ${backupPath}`);
    }

    // Analyze source file
    const sourceContent = fs.readFileSync(fullSourcePath, 'utf8');
    console.log(`📊 Source file: ${sourceFile} (${sourceContent.split('\\n').length} lines)\n`);

    // Create target directory structure
    for (const [targetPath, config] of Object.entries(targetStructure)) {
      const fullTargetPath = path.join(process.cwd(), targetPath);
      const targetDir = path.dirname(fullTargetPath);

      if (!this.dryRun) {
        // Create directory if it doesn't exist
        if (!fs.existsSync(targetDir)) {
          fs.mkdirSync(targetDir, { recursive: true });
          console.log(`📁 Created directory: ${targetDir}`);
        }

        // Create placeholder file with basic structure
        const placeholderContent = this.generatePlaceholderContent(config, targetPath);
        fs.writeFileSync(fullTargetPath, placeholderContent);
        console.log(`✅ Created: ${targetPath} (${config.description})`);
      } else {
        console.log(`[DRY RUN] Would create: ${targetPath} (${config.description})`);
      }

      if (this.verbose) {
        console.log(`   Max lines: ${config.maxLines}`);
        console.log(`   Extract: ${config.extractFrom.join(', ')}`);
        console.log();
      }
    }

    console.log(`\n✨ Refactoring plan for ${sourceFile} complete!\n`);
    this.printNextSteps(sourceFile, targetStructure);
  }

  /**
   * Generate placeholder content for new files
   */
  generatePlaceholderContent(config, targetPath) {
    const fileName = path.basename(targetPath, path.extname(targetPath));
    const isTypeScript = targetPath.endsWith('.ts') || targetPath.endsWith('.tsx');
    const isReactComponent = targetPath.endsWith('.tsx');

    let content = '';

    // Add file header
    content += `/**\n`;
    content += ` * ${fileName}\n`;
    content += ` * ${config.description}\n`;
    content += ` * \n`;
    content += ` * TODO: Extract from original file:\n`;
    config.extractFrom.forEach(item => {
      content += ` * - ${item}\n`;
    });
    content += ` * \n`;
    content += ` * Max lines: ${config.maxLines}\n`;
    content += ` */\n\n`;

    // Add appropriate imports
    if (isReactComponent) {
      content += `import React from 'react';\n\n`;
    } else if (isTypeScript && targetPath.includes('hooks/')) {
      content += `import { useState, useEffect } from 'react';\n\n`;
    }

    // Add basic structure
    if (isReactComponent) {
      // React component
      content += `interface ${fileName}Props {\n`;
      content += `  // TODO: Define props\n`;
      content += `}\n\n`;
      content += `export const ${fileName}: React.FC<${fileName}Props> = (props) => {\n`;
      content += `  // TODO: Implement component logic\n`;
      content += `  return (\n`;
      content += `    <div>\n`;
      content += `      {/* TODO: Implement component JSX */}\n`;
      content += `    </div>\n`;
      content += `  );\n`;
      content += `};\n`;
    } else if (targetPath.includes('hooks/')) {
      // React hook
      content += `export const ${fileName.replace(/([A-Z])/g, (match, letter, index) => index === 0 ? letter.toLowerCase() : letter)} = () => {\n`;
      content += `  // TODO: Implement hook logic\n`;
      content += `  return {\n`;
      content += `    // TODO: Return hook values\n`;
      content += `  };\n`;
      content += `};\n`;
    } else if (targetPath.includes('utils/')) {
      // Utility module
      content += `export class ${fileName} {\n`;
      content += `  // TODO: Implement utility methods\n`;
      content += `}\n`;
    } else {
      // Service class
      content += `export class ${fileName} {\n`;
      content += `  // TODO: Implement service methods\n`;
      content += `}\n\n`;
      content += `export const ${fileName.charAt(0).toLowerCase() + fileName.slice(1)} = new ${fileName}();\n`;
    }

    return content;
  }

  /**
   * Print next steps for manual implementation
   */
  printNextSteps(sourceFile, targetStructure) {
    console.log('📋 Next Steps for Manual Implementation:\n');
    console.log('1. Review the generated placeholder files');
    console.log('2. Extract the specified logic from the original file');
    console.log('3. Update imports and dependencies');
    console.log('4. Run tests to ensure functionality is maintained');
    console.log('5. Update the original file to use the new modules');
    console.log('6. Remove the original large file once refactoring is complete\n');

    console.log('🔍 Key Areas to Extract:\n');
    Object.entries(targetStructure).forEach(([path, config]) => {
      console.log(`${path}:`);
      config.extractFrom.forEach(item => {
        console.log(`  • ${item}`);
      });
      console.log();
    });
  }

  /**
   * Generate line count compliance report
   */
  generateComplianceReport() {
    console.log('📊 Generating compliance report...\n');

    const sourceFiles = this.findAllSourceFiles();
    const report = {
      total: sourceFiles.length,
      compliant: 0,
      nonCompliant: 0,
      largestFiles: []
    };

    sourceFiles.forEach(file => {
      try {
        const content = fs.readFileSync(file, 'utf8');
        const lineCount = content.split('\n').length;

        if (lineCount <= 200) {
          report.compliant++;
        } else {
          report.nonCompliant++;
          report.largestFiles.push({
            path: file.replace(process.cwd() + '/', ''),
            lines: lineCount
          });
        }
      } catch (error) {
        console.error(`Error reading ${file}:`, error.message);
      }
    });

    // Sort largest files
    report.largestFiles.sort((a, b) => b.lines - a.lines);

    // Print report
    console.log('📈 Line Count Compliance Report');
    console.log('================================\n');
    console.log(`Total files: ${report.total}`);
    console.log(`Compliant (≤200 lines): ${report.compliant} (${Math.round(report.compliant / report.total * 100)}%)`);
    console.log(`Non-compliant (>200 lines): ${report.nonCompliant} (${Math.round(report.nonCompliant / report.total * 100)}%)\n`);

    if (report.largestFiles.length > 0) {
      console.log('🎯 Files requiring refactoring:\n');
      report.largestFiles.slice(0, 15).forEach((file, index) => {
        console.log(`${index + 1}. ${file.path} (${file.lines} lines)`);
      });

      if (report.largestFiles.length > 15) {
        console.log(`... and ${report.largestFiles.length - 15} more files\n`);
      }
    }

    return report;
  }

  /**
   * Find all source files in the project
   */
  findAllSourceFiles() {
    const files = [];
    const extensions = ['.ts', '.tsx', '.js', '.jsx'];
    
    const scanDir = (dir) => {
      const dirName = path.basename(dir);
      // Skip common non-source directories
      if (dirName === 'node_modules' || dirName === '.git' || dirName === 'dist' || 
          dirName === 'build' || dirName === 'lib' || dirName === '.next') return;
      
      try {
        const items = fs.readdirSync(dir);
        for (const item of items) {
          const fullPath = path.join(dir, item);
          const stat = fs.statSync(fullPath);
          
          if (stat.isDirectory()) {
            scanDir(fullPath);
          } else if (extensions.some(ext => item.endsWith(ext))) {
            // Only include our source files, not dependencies or build artifacts
            const relativePath = path.relative(process.cwd(), fullPath);
            if (relativePath.startsWith('frontend/src') || relativePath.startsWith('functions/src')) {
              files.push(fullPath);
            }
          }
        }
      } catch (error) {
        // Skip inaccessible directories
        console.log(`Skipping directory ${dir}: ${error.message}`);
      }
    };

    scanDir(process.cwd());
    return files;
  }
}

// CLI interface
async function main() {
  const executor = new RefactorExecutor();
  const command = process.argv[2];

  switch (command) {
    case 'cv-preview':
      await executor.refactorCVPreview();
      break;
    case 'ml-pipeline':
      await executor.refactorMLPipeline();
      break;
    case 'cv-generator':
      await executor.refactorCVGenerator();
      break;
    case 'compliance':
      executor.generateComplianceReport();
      break;
    case 'all':
      await executor.refactorCVPreview();
      await executor.refactorMLPipeline();
      await executor.refactorCVGenerator();
      break;
    default:
      console.log('CVPlus Refactoring Executor');
      console.log('===========================\n');
      console.log('Usage: node refactor-executor.js <command> [options]\n');
      console.log('Commands:');
      console.log('  cv-preview     Refactor CVPreview.tsx component');
      console.log('  ml-pipeline    Refactor ML Pipeline service');
      console.log('  cv-generator   Refactor CV Generator service');
      console.log('  compliance     Generate compliance report');
      console.log('  all           Run all refactoring commands\n');
      console.log('Options:');
      console.log('  --dry-run      Show what would be done without making changes');
      console.log('  --verbose      Show detailed information');
      console.log('  --no-backup    Skip creating backup files\n');
      break;
  }
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = RefactorExecutor;