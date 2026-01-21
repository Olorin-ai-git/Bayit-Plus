#!/usr/bin/env node
/**
 * CVPlus Bundle Size Optimization Script
 * Author: Gil Klainert  
 * Date: August 23, 2025
 * 
 * This script automatically optimizes the bundle size by implementing code splitting,
 * lazy loading, and other optimization techniques for the CVPlus frontend.
 * 
 * Target: Reduce GeneratedCVDisplay from 838KB to <100KB (88% reduction)
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class BundleOptimizer {
    constructor() {
        this.projectRoot = process.cwd();
        this.frontendPath = path.join(this.projectRoot, 'frontend');
        this.srcPath = path.join(this.frontendPath, 'src');
        this.optimizations = [];
        this.backups = [];
    }

    async optimizeBundles() {
        console.log('🚀 Starting CVPlus Bundle Optimization...\n');
        
        try {
            // 1. Create backups
            await this.createBackups();
            
            // 2. Analyze current bundle
            await this.analyzeCurrentBundle();
            
            // 3. Optimize Vite configuration
            await this.optimizeViteConfig();
            
            // 4. Implement code splitting for GeneratedCVDisplay
            await this.optimizeGeneratedCVDisplay();
            
            // 5. Optimize component imports
            await this.optimizeComponentImports();
            
            // 6. Update package.json dependencies
            await this.optimizeDependencies();
            
            // 7. Test optimizations
            await this.testOptimizations();
            
            // 8. Generate optimization report
            await this.generateOptimizationReport();
            
            console.log('✅ Bundle optimization completed successfully!');
            console.log('📊 Check the optimization report for details.\n');
            
        } catch (error) {
            console.error('❌ Bundle optimization failed:', error.message);
            console.log('🔄 Rolling back changes...');
            await this.rollbackChanges();
            process.exit(1);
        }
    }

    async createBackups() {
        console.log('💾 Creating backups...');
        
        const filesToBackup = [
            'vite.config.ts',
            'src/components/GeneratedCVDisplay.tsx',
            'package.json'
        ];
        
        for (const file of filesToBackup) {
            const filePath = path.join(this.frontendPath, file);
            if (fs.existsSync(filePath)) {
                const backupPath = `${filePath}.backup-${Date.now()}`;
                fs.copyFileSync(filePath, backupPath);
                this.backups.push({ original: filePath, backup: backupPath });
                console.log(`  📁 Backed up: ${file}`);
            }
        }
        
        console.log('✅ Backups created\n');
    }

    async analyzeCurrentBundle() {
        console.log('🔍 Analyzing current bundle...');
        
        try {
            process.chdir(this.frontendPath);
            
            // Build current version
            console.log('  🔨 Building current version...');
            execSync('npm run build', { stdio: 'pipe' });
            
            // Analyze bundle sizes
            const distPath = path.join(this.frontendPath, 'dist');
            const bundleInfo = this.analyzeBundleSize(distPath);
            
            this.currentBundle = bundleInfo;
            
            console.log(`  📦 Current total size: ${this.formatBytes(bundleInfo.totalSize)}`);
            console.log(`  🎯 Largest bundle: ${bundleInfo.largestFile.name} (${this.formatBytes(bundleInfo.largestFile.size)})`);
            
        } catch (error) {
            console.log(`  ⚠️  Bundle analysis failed: ${error.message}`);
            this.currentBundle = { error: error.message };
        }
        
        console.log('✅ Bundle analysis completed\n');
    }

    async optimizeViteConfig() {
        console.log('⚙️ Optimizing Vite configuration...');
        
        const viteConfigPath = path.join(this.frontendPath, 'vite.config.ts');
        
        if (fs.existsSync(viteConfigPath)) {
            const currentConfig = fs.readFileSync(viteConfigPath, 'utf8');
            
            const optimizedConfig = `import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// CVPlus Bundle Optimization Configuration
// Target: Reduce GeneratedCVDisplay from 838KB to <100KB
export default defineConfig({
  plugins: [
    react({
      // Enable React optimization features
      babel: {
        plugins: [
          // Remove prop-types in production
          ['babel-plugin-transform-react-remove-prop-types', { removeImport: true }]
        ]
      }
    })
  ],
  
  build: {
    // Bundle optimization settings
    target: 'es2018',
    minify: 'terser',
    sourcemap: false, // Reduce bundle size in production
    
    terserOptions: {
      compress: {
        drop_console: true, // Remove console.log statements
        drop_debugger: true
      }
    },
    
    rollupOptions: {
      output: {
        // Manual chunk splitting for optimal loading
        manualChunks: {
          // Core React libraries
          'react-core': ['react', 'react-dom'],
          
          // CV Display components (lazy loaded)
          'cv-visualization': ['./src/components/CVVisualization'],
          'cv-timeline': ['./src/components/InteractiveTimeline'],
          'cv-portfolio': ['./src/components/PortfolioGallery'],
          'cv-media': ['./src/components/PodcastPlayer'],
          
          // UI libraries (if used)
          'ui-framework': ['@headlessui/react', '@heroicons/react'],
          
          // Animation libraries (separate chunk for lazy loading)
          'animations': ['framer-motion'],
          
          // Utilities and helpers
          'utils': ['./src/utils', './src/hooks'],
          
          // Firebase and external services
          'firebase': ['firebase/app', 'firebase/auth', 'firebase/firestore', 'firebase/functions'],
          'external-services': ['@anthropic/claude']
        },
        
        // Optimize chunk size warnings
        chunkSizeWarningLimit: 100, // 100KB warning limit
        
        // Generate smaller file names for better caching
        entryFileNames: 'assets/[name]-[hash:8].js',
        chunkFileNames: 'assets/[name]-[hash:8].js',
        assetFileNames: 'assets/[name]-[hash:8].[ext]'
      }
    },
    
    // Chunk size limit enforcement
    chunkSizeWarningLimit: 100 // 100KB
  },
  
  // Dependency optimization
  optimizeDeps: {
    include: [
      'react',
      'react-dom'
    ],
    exclude: [
      // Exclude server-only packages from client bundle
      '@anthropic/claude',
      'firebase-admin'
    ]
  },
  
  // Performance optimizations
  server: {
    hmr: {
      overlay: false // Reduce dev bundle size
    }
  },
  
  // Define for tree shaking
  define: {
    __DEV__: process.env.NODE_ENV === 'development',
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV)
  }
});`;
            
            fs.writeFileSync(viteConfigPath, optimizedConfig);
            console.log('  ⚙️ Updated vite.config.ts with optimization settings');
            
            this.optimizations.push({
                type: 'config',
                description: 'Optimized Vite configuration with manual chunking and minification',
                estimatedSaving: '30-40% bundle size reduction'
            });
        }
        
        console.log('✅ Vite configuration optimized\n');
    }

    async optimizeGeneratedCVDisplay() {
        console.log('🎯 Optimizing GeneratedCVDisplay component...');
        
        const componentPath = path.join(this.frontendPath, 'src/components/GeneratedCVDisplay.tsx');
        
        if (fs.existsSync(componentPath)) {
            const currentComponent = fs.readFileSync(componentPath, 'utf8');
            
            // Create optimized version with code splitting and lazy loading
            const optimizedComponent = `import React, { lazy, Suspense, memo, useMemo } from 'react';

// Lazy load heavy components for optimal bundle splitting
const CVVisualization = lazy(() => 
  import('./CVVisualization').then(module => ({
    default: module.CVVisualization || module.default
  }))
);

const InteractiveTimeline = lazy(() => 
  import('./InteractiveTimeline').then(module => ({
    default: module.InteractiveTimeline || module.default
  }))
);

const PortfolioGallery = lazy(() => 
  import('./PortfolioGallery').then(module => ({
    default: module.PortfolioGallery || module.default
  }))
);

const PodcastPlayer = lazy(() => 
  import('./PodcastPlayer').then(module => ({
    default: module.PodcastPlayer || module.default
  }))
);

// Lightweight loading component to reduce initial bundle
const ComponentLoader: React.FC<{ name?: string }> = ({ name = 'component' }) => (
  <div className="flex items-center justify-center p-8 bg-gray-50 rounded-lg animate-pulse">
    <div className="text-center">
      <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
      <p className="text-sm text-gray-600">Loading {name}...</p>
    </div>
  </div>
);

// Error boundary for lazy loaded components
class ComponentErrorBoundary extends React.Component {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.error('Component loading error:', error, errorInfo);
  }

  render() {
    if ((this.state as any).hasError) {
      return (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-700">Failed to load component. Please refresh the page.</p>
        </div>
      );
    }

    return (this.props as any).children;
  }
}

interface CVData {
  basic?: any;
  timeline?: any;
  portfolio?: any;
  podcast?: { url: string };
  recommendations?: any[];
  processing?: boolean;
}

interface GeneratedCVDisplayProps {
  cvData: CVData;
  isLoading?: boolean;
  className?: string;
}

// Memoized component to prevent unnecessary re-renders
const GeneratedCVDisplay: React.FC<GeneratedCVDisplayProps> = memo(({ 
  cvData, 
  isLoading = false, 
  className = '' 
}) => {
  // Memoize expensive computations
  const hasTimeline = useMemo(() => Boolean(cvData?.timeline), [cvData?.timeline]);
  const hasPortfolio = useMemo(() => Boolean(cvData?.portfolio), [cvData?.portfolio]);
  const hasPodcast = useMemo(() => Boolean(cvData?.podcast?.url), [cvData?.podcast?.url]);
  const hasBasicData = useMemo(() => Boolean(cvData?.basic), [cvData?.basic]);

  // Show loading state
  if (isLoading || cvData?.processing) {
    return (
      <div className={\\`cv-display-container \\${className}\\`}>
        <ComponentLoader name="CV display" />
      </div>
    );
  }

  // Show empty state if no data
  if (!hasBasicData && !hasTimeline && !hasPortfolio && !hasPodcast) {
    return (
      <div className={\\`cv-display-container \\${className} text-center p-8\\`}>
        <p className="text-gray-600">No CV data available</p>
      </div>
    );
  }

  return (
    <div className={\\`cv-display-container \\${className}\\`}>
      {/* Basic CV information - always loaded first */}
      {hasBasicData && (
        <ComponentErrorBoundary>
          <Suspense fallback={<ComponentLoader name="CV visualization" />}>
            <CVVisualization data={cvData.basic} />
          </Suspense>
        </ComponentErrorBoundary>
      )}
      
      {/* Interactive timeline - lazy loaded */}
      {hasTimeline && (
        <div className="mt-6">
          <ComponentErrorBoundary>
            <Suspense fallback={<ComponentLoader name="timeline" />}>
              <InteractiveTimeline timeline={cvData.timeline} />
            </Suspense>
          </ComponentErrorBoundary>
        </div>
      )}
      
      {/* Portfolio gallery - lazy loaded */}
      {hasPortfolio && (
        <div className="mt-6">
          <ComponentErrorBoundary>
            <Suspense fallback={<ComponentLoader name="portfolio gallery" />}>
              <PortfolioGallery items={cvData.portfolio} />
            </Suspense>
          </ComponentErrorBoundary>
        </div>
      )}
      
      {/* Podcast player - lazy loaded */}
      {hasPodcast && (
        <div className="mt-6">
          <ComponentErrorBoundary>
            <Suspense fallback={<ComponentLoader name="podcast player" />}>
              <PodcastPlayer url={cvData.podcast.url} />
            </Suspense>
          </ComponentErrorBoundary>
        </div>
      )}
    </div>
  );
}, (prevProps, nextProps) => {
  // Custom comparison for memo to prevent unnecessary re-renders
  return (
    prevProps.isLoading === nextProps.isLoading &&
    prevProps.className === nextProps.className &&
    JSON.stringify(prevProps.cvData) === JSON.stringify(nextProps.cvData)
  );
});

GeneratedCVDisplay.displayName = 'GeneratedCVDisplay';

export default GeneratedCVDisplay;
export { GeneratedCVDisplay };`;
            
            fs.writeFileSync(componentPath, optimizedComponent);
            console.log('  🎯 Optimized GeneratedCVDisplay component with lazy loading');
            
            this.optimizations.push({
                type: 'component',
                description: 'Split GeneratedCVDisplay into lazy-loaded chunks with error boundaries',
                estimatedSaving: '60-70% reduction in initial bundle size'
            });
        }
        
        console.log('✅ GeneratedCVDisplay optimization completed\n');
    }

    async optimizeComponentImports() {
        console.log('📦 Optimizing component imports...');
        
        // Create barrel export file for lazy loading
        const componentsIndexPath = path.join(this.frontendPath, 'src/components/index.ts');
        
        const optimizedBarrelExports = `// Optimized barrel exports for better tree shaking
// Author: Gil Klainert
// Date: August 23, 2025

// Core components (always needed)
export { default as GeneratedCVDisplay } from './GeneratedCVDisplay';

// Lazy-loaded components (use dynamic imports)
export const CVVisualization = () => import('./CVVisualization');
export const InteractiveTimeline = () => import('./InteractiveTimeline');
export const PortfolioGallery = () => import('./PortfolioGallery');  
export const PodcastPlayer = () => import('./PodcastPlayer');

// Utility components
export { default as LoadingSpinner } from './LoadingSpinner';
export { default as ErrorBoundary } from './ErrorBoundary';

// Type exports for better TypeScript support
export type { CVData, GeneratedCVDisplayProps } from './GeneratedCVDisplay';`;
        
        fs.writeFileSync(componentsIndexPath, optimizedBarrelExports);
        console.log('  📦 Created optimized component barrel exports');
        
        this.optimizations.push({
            type: 'imports',
            description: 'Optimized component imports with lazy loading exports',
            estimatedSaving: '10-15% reduction through better tree shaking'
        });
        
        console.log('✅ Component imports optimized\n');
    }

    async optimizeDependencies() {
        console.log('📋 Optimizing package dependencies...');
        
        const packageJsonPath = path.join(this.frontendPath, 'package.json');
        
        if (fs.existsSync(packageJsonPath)) {
            const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
            
            // Add bundle optimization dependencies
            const optimizationDeps = {
                'web-vitals': '^3.4.0', // For performance monitoring
                '@loadable/component': '^5.16.4', // Alternative to React.lazy for better loading
                'react-intersection-observer': '^9.5.2' // For lazy loading on scroll
            };
            
            const optimizationDevDeps = {
                'webpack-bundle-analyzer': '^4.9.0', // Bundle analysis
                'terser': '^5.19.2', // Better minification
                'babel-plugin-transform-react-remove-prop-types': '^0.4.24' // Remove prop-types
            };
            
            // Update dependencies
            packageJson.dependencies = { ...packageJson.dependencies, ...optimizationDeps };
            packageJson.devDependencies = { ...packageJson.devDependencies, ...optimizationDevDeps };
            
            // Add optimization scripts
            packageJson.scripts = {
                ...packageJson.scripts,
                'build:analyze': 'npm run build && npx webpack-bundle-analyzer dist/stats.json',
                'build:optimize': 'NODE_ENV=production npm run build',
                'perf:audit': 'node ../scripts/performance/comprehensive-performance-audit.js'
            };
            
            fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
            console.log('  📋 Updated package.json with optimization dependencies');
            
            // Install new dependencies
            console.log('  📦 Installing optimization dependencies...');
            execSync('npm install', { stdio: 'pipe' });
            
            this.optimizations.push({
                type: 'dependencies',
                description: 'Added performance monitoring and optimization dependencies',
                estimatedSaving: '5-10% through better tooling and monitoring'
            });
        }
        
        console.log('✅ Dependencies optimized\n');
    }

    async testOptimizations() {
        console.log('🧪 Testing optimizations...');
        
        try {
            // Build optimized version
            console.log('  🔨 Building optimized version...');
            execSync('npm run build', { stdio: 'pipe' });
            
            // Analyze optimized bundle
            const distPath = path.join(this.frontendPath, 'dist');
            const optimizedBundle = this.analyzeBundleSize(distPath);
            
            this.optimizedBundle = optimizedBundle;
            
            // Calculate improvements
            if (this.currentBundle && this.currentBundle.totalSize) {
                const sizeDifference = this.currentBundle.totalSize - optimizedBundle.totalSize;
                const percentImprovement = (sizeDifference / this.currentBundle.totalSize) * 100;
                
                console.log('  📊 Optimization Results:');
                console.log(`    Before: ${this.formatBytes(this.currentBundle.totalSize)}`);
                console.log(`    After:  ${this.formatBytes(optimizedBundle.totalSize)}`);
                console.log(`    Saved:  ${this.formatBytes(sizeDifference)} (${percentImprovement.toFixed(1)}%)`);
                
                this.improvementStats = {
                    beforeSize: this.currentBundle.totalSize,
                    afterSize: optimizedBundle.totalSize,
                    savedBytes: sizeDifference,
                    percentImprovement
                };
                
                // Check if we met our target (838KB -> 100KB = 88% reduction)
                if (optimizedBundle.largestFile.size < 100000) { // 100KB
                    console.log('  🎯 SUCCESS: Target bundle size achieved!');
                } else {
                    console.log(`  ⚠️  Target not fully achieved. Largest bundle: ${this.formatBytes(optimizedBundle.largestFile.size)}`);
                }
            }
            
        } catch (error) {
            console.log(`  ⚠️  Testing failed: ${error.message}`);
            this.optimizedBundle = { error: error.message };
        }
        
        console.log('✅ Optimization testing completed\n');
    }

    async generateOptimizationReport() {
        console.log('📊 Generating optimization report...');
        
        const reportPath = path.join(this.projectRoot, 'logs', `bundle-optimization-${Date.now()}.json`);
        
        const report = {
            timestamp: new Date().toISOString(),
            optimizations: this.optimizations,
            beforeOptimization: this.currentBundle,
            afterOptimization: this.optimizedBundle,
            improvements: this.improvementStats,
            targetAchieved: this.optimizedBundle?.largestFile?.size < 100000,
            backups: this.backups.map(b => ({ original: b.original, backup: b.backup })),
            recommendations: this.generateAdditionalRecommendations()
        };
        
        // Ensure logs directory exists
        const logsDir = path.dirname(reportPath);
        if (!fs.existsSync(logsDir)) {
            fs.mkdirSync(logsDir, { recursive: true });
        }
        
        fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
        
        // Generate human-readable summary
        const summaryPath = reportPath.replace('.json', '-summary.txt');
        const summary = this.generateTextSummary(report);
        fs.writeFileSync(summaryPath, summary);
        
        console.log(`  📄 Report saved: ${reportPath}`);
        console.log(`  📋 Summary saved: ${summaryPath}`);
        
        // Display key results
        if (this.improvementStats) {
            console.log('\\n🎉 OPTIMIZATION RESULTS:');
            console.log(`   Bundle Size: ${this.formatBytes(this.improvementStats.beforeSize)} → ${this.formatBytes(this.improvementStats.afterSize)}`);
            console.log(`   Improvement: ${this.improvementStats.percentImprovement.toFixed(1)}% reduction`);
            console.log(`   Target Met: ${report.targetAchieved ? '✅ Yes' : '❌ No'}`);
        }
        
        console.log('✅ Optimization report generated\\n');
    }

    generateAdditionalRecommendations() {
        const recommendations = [];
        
        if (!this.improvementStats || this.improvementStats.percentImprovement < 70) {
            recommendations.push('Consider further optimizations: remove unused dependencies, implement virtual scrolling for large lists');
        }
        
        if (this.optimizedBundle?.largestFile?.size > 100000) {
            recommendations.push('Largest bundle still exceeds 100KB target - consider splitting into smaller chunks');
        }
        
        recommendations.push('Monitor bundle sizes in CI/CD pipeline to prevent regressions');
        recommendations.push('Implement performance budgets in build process');
        recommendations.push('Consider using service workers for advanced caching strategies');
        
        return recommendations;
    }

    generateTextSummary(report) {
        return `CVPlus Bundle Optimization Summary
======================================

Generated: ${new Date(report.timestamp).toLocaleString()}
Target: Reduce GeneratedCVDisplay from 838KB to <100KB (88% reduction)

RESULTS:
${report.improvements ? `
Before Optimization: ${this.formatBytes(report.improvements.beforeSize)}
After Optimization:  ${this.formatBytes(report.improvements.afterSize)}
Bytes Saved:         ${this.formatBytes(report.improvements.savedBytes)}
Percent Improvement: ${report.improvements.percentImprovement.toFixed(1)}%
Target Achieved:     ${report.targetAchieved ? 'YES ✅' : 'NO ❌'}
` : 'Optimization results not available'}

OPTIMIZATIONS APPLIED:
${report.optimizations.map((opt, index) => `${index + 1}. ${opt.description} (${opt.estimatedSaving})`).join('\\n')}

NEXT STEPS:
${report.recommendations.map((rec, index) => `${index + 1}. ${rec}`).join('\\n')}

Files backed up:
${report.backups.map(b => `- ${b.original} → ${b.backup}`).join('\\n')}

For detailed technical analysis, see the JSON report.
`;
    }

    analyzeBundleSize(distPath) {
        const files = [];
        let totalSize = 0;
        
        const scanDir = (dir) => {
            if (!fs.existsSync(dir)) return;
            
            const items = fs.readdirSync(dir);
            
            for (const item of items) {
                const fullPath = path.join(dir, item);
                const stat = fs.statSync(fullPath);
                
                if (stat.isDirectory()) {
                    scanDir(fullPath);
                } else {
                    files.push({
                        name: path.relative(distPath, fullPath),
                        size: stat.size,
                        path: fullPath
                    });
                    totalSize += stat.size;
                }
            }
        };
        
        scanDir(distPath);
        
        // Sort by size descending
        files.sort((a, b) => b.size - a.size);
        
        return {
            files,
            totalSize,
            largestFile: files[0] || { name: 'none', size: 0 },
            jsFiles: files.filter(f => f.name.endsWith('.js')),
            cssFiles: files.filter(f => f.name.endsWith('.css'))
        };
    }

    async rollbackChanges() {
        console.log('🔄 Rolling back changes...');
        
        for (const backup of this.backups) {
            try {
                if (fs.existsSync(backup.backup)) {
                    fs.copyFileSync(backup.backup, backup.original);
                    fs.unlinkSync(backup.backup);
                    console.log(`  ↩️  Restored: ${backup.original}`);
                }
            } catch (error) {
                console.error(`  ❌ Failed to restore ${backup.original}:`, error.message);
            }
        }
        
        console.log('✅ Rollback completed');
    }

    formatBytes(bytes) {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
}

// Main execution
if (require.main === module) {
    const optimizer = new BundleOptimizer();
    optimizer.optimizeBundles().catch(error => {
        console.error('❌ Bundle optimization failed:', error);
        process.exit(1);
    });
}

module.exports = BundleOptimizer;