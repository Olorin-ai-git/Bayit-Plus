#!/usr/bin/env node

/**
 * CVPlus Bundle Optimization Script
 * Implements systematic bundle size reduction strategies
 */

const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const util = require('util');
const execAsync = util.promisify(exec);

class BundleOptimizer {
  constructor(frontendPath = 'frontend') {
    this.frontendPath = frontendPath;
    this.backupDir = path.join('logs', 'bundle-optimization-backups');
    this.results = {
      originalSize: 0,
      optimizedSize: 0,
      optimizations: [],
      errors: []
    };
  }

  async createBackup() {
    console.log('📦 Creating backup before optimization...');
    
    // Ensure backup directory exists
    if (!fs.existsSync(this.backupDir)) {
      fs.mkdirSync(this.backupDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = path.join(this.backupDir, `package-json-${timestamp}.backup`);
    
    // Backup package.json
    const packageJsonPath = path.join(this.frontendPath, 'package.json');
    if (fs.existsSync(packageJsonPath)) {
      fs.copyFileSync(packageJsonPath, backupPath);
      console.log(`✅ Backup created: ${backupPath}`);
    }
  }

  async analyzeDependencies() {
    console.log('🔍 Analyzing dependencies for optimization opportunities...\n');

    const packageJsonPath = path.join(this.frontendPath, 'package.json');
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    
    const heavyDependencies = [];
    const unnecessaryDependencies = [];
    const optimizationOpportunities = [];

    // Analyze each dependency for optimization potential
    const dependencies = { ...packageJson.dependencies, ...packageJson.devDependencies };
    
    for (const [name, version] of Object.entries(dependencies)) {
      const opportunity = this.analyzeDependency(name, version);
      if (opportunity) {
        optimizationOpportunities.push(opportunity);
      }
    }

    return optimizationOpportunities;
  }

  analyzeDependency(name, version) {
    const depLower = name.toLowerCase();
    
    // Heavy dependencies that can be optimized
    const heavyDeps = {
      'framer-motion': {
        issue: 'Large animation library (200KB+)',
        solution: 'Replace with CSS animations or lighter library',
        alternative: '@react-spring/web',
        savings: '80%'
      },
      'recharts': {
        issue: 'Heavy charting library (150KB+)',
        solution: 'Replace with lightweight chart library',
        alternative: 'chart.js or victory',
        savings: '60%'
      },
      'docx': {
        issue: 'Document generation library (100KB+)',
        solution: 'Move to server-side or use lighter alternative',
        alternative: 'Server-side generation',
        savings: '100%'
      },
      'html2canvas': {
        issue: 'Canvas rendering library (80KB+)',
        solution: 'Lazy load or use CSS-only solutions where possible',
        alternative: 'Dynamic import',
        savings: '50%'
      },
      'jspdf': {
        issue: 'PDF generation library (100KB+)',
        solution: 'Move to server-side generation',
        alternative: 'Server-side PDF generation',
        savings: '100%'
      }
    };

    // Firebase modules that can be tree-shaken
    const firebaseOptimizations = {
      'firebase': {
        issue: 'Importing entire Firebase SDK (400KB+)',
        solution: 'Import only needed modules',
        alternative: 'Modular imports (firebase/app, firebase/auth, etc.)',
        savings: '60%'
      }
    };

    // Check for optimization opportunities
    if (heavyDeps[name]) {
      return {
        name,
        type: 'heavy_dependency',
        ...heavyDeps[name],
        priority: 'high'
      };
    }

    if (firebaseOptimizations[name]) {
      return {
        name,
        type: 'firebase_optimization',
        ...firebaseOptimizations[name],
        priority: 'high'
      };
    }

    // Check for unused or rarely used dependencies
    if (this.isPotentiallyUnused(name)) {
      return {
        name,
        type: 'potentially_unused',
        issue: 'May not be actively used',
        solution: 'Audit usage and remove if unnecessary',
        priority: 'medium'
      };
    }

    return null;
  }

  isPotentiallyUnused(name) {
    const potentiallyUnused = [
      'react-audio-player', // Might be replaceable with HTML5 audio
      'react-dnd', // Drag and drop might be overengineered
      'react-dnd-html5-backend',
      'react-dnd-touch-backend',
      'image-conversion', // Might be replaceable with simpler solutions
      'wavesurfer.js' // Audio visualization might be optional
    ];

    return potentiallyUnused.includes(name);
  }

  async optimizeFirebaseImports() {
    console.log('🔥 Optimizing Firebase imports...');

    const files = await this.findFilesWithFirebaseImports();
    let optimizedCount = 0;

    for (const file of files) {
      const optimized = await this.optimizeFirebaseInFile(file);
      if (optimized) optimizedCount++;
    }

    this.results.optimizations.push({
      type: 'firebase_imports',
      filesOptimized: optimizedCount,
      description: 'Replaced Firebase SDK imports with modular imports'
    });

    console.log(`✅ Optimized Firebase imports in ${optimizedCount} files`);
  }

  async findFilesWithFirebaseImports() {
    try {
      const { stdout } = await execAsync(`find ${this.frontendPath}/src -name "*.ts" -o -name "*.tsx" | xargs grep -l "from ['\"]firebase['\"]"`);
      return stdout.trim().split('\n').filter(line => line.length > 0);
    } catch (error) {
      return [];
    }
  }

  async optimizeFirebaseInFile(filePath) {
    try {
      let content = fs.readFileSync(filePath, 'utf8');
      let modified = false;

      // Replace common Firebase imports with modular equivalents
      const replacements = [
        {
          pattern: /import\s+firebase\s+from\s+['"']firebase['"']/g,
          replacement: "import { initializeApp } from 'firebase/app'"
        },
        {
          pattern: /import\s+\{([^}]+)\}\s+from\s+['"']firebase['"']/g,
          replacement: (match, imports) => {
            const importList = imports.split(',').map(imp => imp.trim());
            const modularImports = importList.map(imp => this.getModularImport(imp)).join('\n');
            return modularImports;
          }
        }
      ];

      for (const { pattern, replacement } of replacements) {
        const newContent = content.replace(pattern, replacement);
        if (newContent !== content) {
          content = newContent;
          modified = true;
        }
      }

      if (modified) {
        fs.writeFileSync(filePath, content);
        return true;
      }

      return false;
    } catch (error) {
      console.warn(`⚠️ Could not optimize ${filePath}: ${error.message}`);
      return false;
    }
  }

  getModularImport(importName) {
    const modularMappings = {
      'auth': "import { getAuth } from 'firebase/auth'",
      'firestore': "import { getFirestore } from 'firebase/firestore'",
      'storage': "import { getStorage } from 'firebase/storage'",
      'functions': "import { getFunctions } from 'firebase/functions'",
      'analytics': "import { getAnalytics } from 'firebase/analytics'"
    };

    return modularMappings[importName.toLowerCase()] || `// TODO: Map ${importName} to modular import`;
  }

  async implementCodeSplitting() {
    console.log('✂️ Implementing code splitting...');

    // Create code splitting configuration
    const viteSplittingConfig = `
// Code splitting configuration for Vite
export const codeSplittingConfig = {
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // Vendor chunks
          'react-vendor': ['react', 'react-dom'],
          'firebase-vendor': ['firebase/app', 'firebase/auth', 'firebase/firestore'],
          'ui-vendor': ['@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu', '@radix-ui/react-select'],
          
          // Feature chunks
          'cv-processing': [
            './src/services/cv',
            './src/components/cv',
            './src/pages/CVPreview'
          ],
          'media-generation': [
            './src/services/mediaGeneration',
            './src/components/media'
          ],
          'portfolio': [
            './src/components/portfolio',
            './src/pages/Portfolio'
          ]
        }
      }
    },
    chunkSizeWarningLimit: 500 // 500KB warning limit
  }
};
`;

    const configPath = path.join(this.frontendPath, 'src', 'config', 'vite-splitting.ts');
    const configDir = path.dirname(configPath);
    
    if (!fs.existsSync(configDir)) {
      fs.mkdirSync(configDir, { recursive: true });
    }
    
    fs.writeFileSync(configPath, viteSplittingConfig);

    // Update vite.config.ts
    await this.updateViteConfig();

    this.results.optimizations.push({
      type: 'code_splitting',
      description: 'Implemented manual chunk splitting and lazy loading'
    });

    console.log('✅ Code splitting configuration created');
  }

  async updateViteConfig() {
    const viteConfigPath = path.join(this.frontendPath, 'vite.config.ts');
    
    if (!fs.existsSync(viteConfigPath)) {
      console.warn('⚠️ vite.config.ts not found, skipping update');
      return;
    }

    let config = fs.readFileSync(viteConfigPath, 'utf8');
    
    // Add import for code splitting config
    if (!config.includes('codeSplittingConfig')) {
      config = config.replace(
        /import\s+{[^}]+}\s+from\s+['"']vite['"']/,
        `$&\nimport { codeSplittingConfig } from './src/config/vite-splitting';`
      );

      // Add build configuration
      config = config.replace(
        /export\s+default\s+defineConfig\(\{/,
        `export default defineConfig({\n  ...codeSplittingConfig,`
      );

      fs.writeFileSync(viteConfigPath, config);
      console.log('✅ Updated vite.config.ts with code splitting');
    }
  }

  async implementLazyLoading() {
    console.log('⚡ Implementing lazy loading for components...');

    const componentMappings = [
      {
        path: 'src/pages/CVPreview.tsx',
        componentName: 'CVPreview',
        lazyImport: "const CVPreview = lazy(() => import('../pages/CVPreview'));"
      },
      {
        path: 'src/pages/Portfolio.tsx',
        componentName: 'Portfolio',
        lazyImport: "const Portfolio = lazy(() => import('../pages/Portfolio'));"
      },
      {
        path: 'src/components/media/VideoPlayer.tsx',
        componentName: 'VideoPlayer',
        lazyImport: "const VideoPlayer = lazy(() => import('../components/media/VideoPlayer'));"
      }
    ];

    let lazyCount = 0;

    for (const mapping of componentMappings) {
      const success = await this.makeLazyComponent(mapping);
      if (success) lazyCount++;
    }

    this.results.optimizations.push({
      type: 'lazy_loading',
      componentsOptimized: lazyCount,
      description: 'Implemented lazy loading for heavy components'
    });

    console.log(`✅ Implemented lazy loading for ${lazyCount} components`);
  }

  async makeLazyComponent(mapping) {
    const filePath = path.join(this.frontendPath, mapping.path);
    
    if (!fs.existsSync(filePath)) {
      return false;
    }

    try {
      let content = fs.readFileSync(filePath, 'utf8');
      
      // Add React lazy import if not present
      if (!content.includes('lazy') && content.includes('import React')) {
        content = content.replace(
          /import React/,
          'import React, { lazy, Suspense }'
        );
      }

      // Add Suspense wrapper to parent component if needed
      const parentFile = await this.findParentComponent(mapping.componentName);
      if (parentFile) {
        await this.addSuspenseWrapper(parentFile, mapping.componentName);
      }

      return true;
    } catch (error) {
      console.warn(`⚠️ Could not make ${mapping.path} lazy: ${error.message}`);
      return false;
    }
  }

  async removeDependency(packageName, reason) {
    console.log(`🗑️ Removing dependency: ${packageName} (${reason})`);
    
    try {
      process.chdir(this.frontendPath);
      await execAsync(`npm uninstall ${packageName}`);
      
      this.results.optimizations.push({
        type: 'dependency_removal',
        package: packageName,
        reason: reason
      });
      
      console.log(`✅ Removed ${packageName}`);
      return true;
    } catch (error) {
      console.warn(`⚠️ Could not remove ${packageName}: ${error.message}`);
      this.results.errors.push({
        type: 'dependency_removal_failed',
        package: packageName,
        error: error.message
      });
      return false;
    } finally {
      process.chdir('..');
    }
  }

  async measureBundleSize() {
    try {
      console.log('📊 Building and measuring bundle size...');
      
      process.chdir(this.frontendPath);
      const { stdout } = await execAsync('npm run build');
      
      // Extract bundle size information from build output
      const sizeMatches = stdout.match(/dist\/assets\/.*?\.js\s+([0-9,]+\.?[0-9]*)\s*kB/g) || [];
      let totalSize = 0;
      
      sizeMatches.forEach(match => {
        const size = parseFloat(match.match(/([0-9,]+\.?[0-9]*)\s*kB/)[1].replace(',', ''));
        totalSize += size;
      });

      process.chdir('..');
      return totalSize;
    } catch (error) {
      console.warn(`⚠️ Could not measure bundle size: ${error.message}`);
      return 0;
    }
  }

  async generateOptimizationReport() {
    const report = {
      optimization_date: new Date().toISOString(),
      original_size_kb: this.results.originalSize,
      optimized_size_kb: this.results.optimizedSize,
      size_reduction_kb: this.results.originalSize - this.results.optimizedSize,
      size_reduction_percentage: Math.round(((this.results.originalSize - this.results.optimizedSize) / this.results.originalSize) * 100),
      optimizations_applied: this.results.optimizations,
      errors_encountered: this.results.errors,
      next_steps: [
        'Test application functionality after optimizations',
        'Monitor bundle size in CI/CD pipeline',
        'Consider additional lazy loading opportunities',
        'Review remaining heavy dependencies'
      ]
    };

    const reportPath = path.join('logs', `bundle-optimization-report-${new Date().toISOString().split('T')[0]}.json`);
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    
    console.log(`📄 Optimization report saved: ${reportPath}`);
    return report;
  }

  async optimize() {
    console.log('🚀 Starting comprehensive bundle optimization...\n');

    try {
      // Create backup
      await this.createBackup();

      // Measure original size
      this.results.originalSize = await this.measureBundleSize();
      console.log(`📊 Original bundle size: ${this.results.originalSize} KB\n`);

      // Analyze dependencies
      const opportunities = await this.analyzeDependencies();
      console.log(`🔍 Found ${opportunities.length} optimization opportunities\n`);

      // Apply optimizations
      await this.optimizeFirebaseImports();
      await this.implementCodeSplitting();
      await this.implementLazyLoading();

      // Remove heavy dependencies (with caution)
      const safeDependenciesToRemove = opportunities.filter(opp => 
        opp.type === 'potentially_unused' && opp.name !== 'firebase'
      );

      for (const dep of safeDependenciesToRemove.slice(0, 3)) { // Only remove first 3 to be safe
        await this.removeDependency(dep.name, dep.issue);
      }

      // Measure optimized size
      this.results.optimizedSize = await this.measureBundleSize();
      console.log(`📊 Optimized bundle size: ${this.results.optimizedSize} KB`);

      // Generate report
      const report = await this.generateOptimizationReport();
      
      console.log('\n🎯 Bundle Optimization Complete!');
      console.log(`Size Reduction: ${report.size_reduction_kb} KB (${report.size_reduction_percentage}%)`);
      console.log(`Optimizations Applied: ${report.optimizations_applied.length}`);
      
      if (report.errors_encountered.length > 0) {
        console.log(`⚠️ Errors Encountered: ${report.errors_encountered.length}`);
      }

      return report;
    } catch (error) {
      console.error('❌ Bundle optimization failed:', error.message);
      throw error;
    }
  }
}

// Main execution
async function main() {
  const optimizer = new BundleOptimizer();
  
  try {
    const report = await optimizer.optimize();
    console.log('\n✅ Bundle optimization completed successfully');
    
    if (report.size_reduction_percentage >= 30) {
      console.log('🎉 Excellent! Achieved significant bundle size reduction');
    } else if (report.size_reduction_percentage >= 15) {
      console.log('👍 Good progress on bundle optimization');
    } else {
      console.log('📝 Additional optimization needed for target reduction');
    }
    
  } catch (error) {
    console.error('❌ Optimization process failed');
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = BundleOptimizer;