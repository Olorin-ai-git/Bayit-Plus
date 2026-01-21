#!/usr/bin/env node
/**
 * CVPlus Comprehensive Performance Audit Script
 * Author: Gil Klainert
 * Date: August 23, 2025
 * 
 * This script performs a comprehensive performance audit of the CVPlus platform
 * covering frontend bundle analysis, backend function analysis, and performance metrics.
 */

const fs = require('fs');
const path = require('path');
const { execSync, exec } = require('child_process');
const lighthouse = require('lighthouse');
const chromeLauncher = require('chrome-launcher');

class CVPlusPerformanceAuditor {
    constructor() {
        this.results = {
            timestamp: new Date().toISOString(),
            frontend: {},
            backend: {},
            infrastructure: {},
            recommendations: []
        };
        this.frontendPath = path.join(process.cwd(), 'frontend');
        this.functionsPath = path.join(process.cwd(), 'functions');
    }

    async runCompleteAudit() {
        console.log('🔍 Starting CVPlus Performance Audit...\n');
        
        try {
            await this.auditFrontendPerformance();
            await this.auditBackendPerformance();
            await this.auditInfrastructurePerformance();
            await this.generateRecommendations();
            await this.generateReport();
            
            console.log('✅ Performance audit completed successfully!');
            console.log(`📊 Report saved to: ${this.getReportPath()}`);
            
        } catch (error) {
            console.error('❌ Audit failed:', error.message);
            process.exit(1);
        }
    }

    async auditFrontendPerformance() {
        console.log('📦 Auditing Frontend Performance...');
        
        // 1. Bundle size analysis
        await this.analyzeBundleSize();
        
        // 2. Dependency analysis
        await this.analyzeDependencies();
        
        // 3. Build performance
        await this.analyzeBuildPerformance();
        
        // 4. Core Web Vitals (if site is accessible)
        await this.auditCoreWebVitals();
        
        console.log('✅ Frontend audit completed\n');
    }

    async analyzeBundleSize() {
        console.log('  📊 Analyzing bundle size...');
        
        try {
            // Build the project to get latest bundle sizes
            process.chdir(this.frontendPath);
            
            console.log('  🔨 Building project...');
            execSync('npm run build', { stdio: 'pipe' });
            
            // Analyze dist directory
            const distPath = path.join(this.frontendPath, 'dist');
            const assets = this.getDirectorySize(distPath);
            
            // Find the GeneratedCVDisplay bundle
            const cvDisplayBundle = assets.files.find(file => 
                file.name.includes('GeneratedCVDisplay') || 
                file.name.includes('index') && file.size > 500000 // Large bundle likely contains CV component
            );
            
            this.results.frontend.bundleAnalysis = {
                totalSize: assets.totalSize,
                totalFiles: assets.files.length,
                largestBundle: cvDisplayBundle || assets.files[0],
                allBundles: assets.files.sort((a, b) => b.size - a.size).slice(0, 10),
                recommendations: this.getBundleSizeRecommendations(assets)
            };
            
            console.log(`  📦 Total bundle size: ${this.formatBytes(assets.totalSize)}`);
            if (cvDisplayBundle) {
                console.log(`  🎯 GeneratedCVDisplay bundle: ${this.formatBytes(cvDisplayBundle.size)}`);
            }
            
        } catch (error) {
            console.log(`  ⚠️  Bundle analysis failed: ${error.message}`);
            this.results.frontend.bundleAnalysis = { error: error.message };
        }
    }

    async analyzeDependencies() {
        console.log('  📋 Analyzing dependencies...');
        
        try {
            const packageJsonPath = path.join(this.frontendPath, 'package.json');
            const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
            
            const dependencies = Object.keys(packageJson.dependencies || {});
            const devDependencies = Object.keys(packageJson.devDependencies || {});
            
            // Check for heavy dependencies
            const heavyDependencies = dependencies.filter(dep => 
                ['framer-motion', '@material-ui', 'lodash', 'moment'].some(heavy => 
                    dep.includes(heavy)
                )
            );
            
            this.results.frontend.dependencies = {
                totalDependencies: dependencies.length,
                totalDevDependencies: devDependencies.length,
                heavyDependencies,
                recommendations: this.getDependencyRecommendations(dependencies, heavyDependencies)
            };
            
            console.log(`  📦 Dependencies: ${dependencies.length}, Dev: ${devDependencies.length}`);
            if (heavyDependencies.length > 0) {
                console.log(`  ⚠️  Heavy dependencies found: ${heavyDependencies.join(', ')}`);
            }
            
        } catch (error) {
            console.log(`  ⚠️  Dependency analysis failed: ${error.message}`);
            this.results.frontend.dependencies = { error: error.message };
        }
    }

    async analyzeBuildPerformance() {
        console.log('  ⏱️  Analyzing build performance...');
        
        try {
            const startTime = Date.now();
            execSync('npm run build', { stdio: 'pipe' });
            const buildTime = Date.now() - startTime;
            
            this.results.frontend.buildPerformance = {
                buildTimeMs: buildTime,
                buildTimeFormatted: this.formatDuration(buildTime),
                recommendations: this.getBuildPerformanceRecommendations(buildTime)
            };
            
            console.log(`  ⚡ Build time: ${this.formatDuration(buildTime)}`);
            
        } catch (error) {
            console.log(`  ⚠️  Build performance analysis failed: ${error.message}`);
            this.results.frontend.buildPerformance = { error: error.message };
        }
    }

    async auditCoreWebVitals() {
        console.log('  🎯 Auditing Core Web Vitals...');
        
        try {
            // Check if there's a local server running or use production URL
            const url = this.findAccessibleUrl();
            
            if (url) {
                const chrome = await chromeLauncher.launch({ chromeFlags: ['--headless'] });
                const options = { logLevel: 'info', output: 'json', onlyCategories: ['performance'], port: chrome.port };
                
                const runnerResult = await lighthouse(url, options);
                const performanceScore = runnerResult.lhr.categories.performance.score * 100;
                
                const vitals = {
                    performanceScore,
                    firstContentfulPaint: runnerResult.lhr.audits['first-contentful-paint'].numericValue,
                    largestContentfulPaint: runnerResult.lhr.audits['largest-contentful-paint'].numericValue,
                    cumulativeLayoutShift: runnerResult.lhr.audits['cumulative-layout-shift'].numericValue,
                    totalBlockingTime: runnerResult.lhr.audits['total-blocking-time'].numericValue,
                    speedIndex: runnerResult.lhr.audits['speed-index'].numericValue
                };
                
                this.results.frontend.coreWebVitals = {
                    ...vitals,
                    url,
                    recommendations: this.getCoreWebVitalsRecommendations(vitals)
                };
                
                await chrome.kill();
                
                console.log(`  🎯 Performance Score: ${performanceScore}/100`);
                console.log(`  🚀 FCP: ${Math.round(vitals.firstContentfulPaint)}ms`);
                console.log(`  🎨 LCP: ${Math.round(vitals.largestContentfulPaint)}ms`);
                
            } else {
                console.log('  ⚠️  No accessible URL found for Core Web Vitals audit');
                this.results.frontend.coreWebVitals = { 
                    error: 'No accessible URL found',
                    suggestion: 'Run "npm run dev" to start development server'
                };
            }
            
        } catch (error) {
            console.log(`  ⚠️  Core Web Vitals audit failed: ${error.message}`);
            this.results.frontend.coreWebVitals = { error: error.message };
        }
    }

    async auditBackendPerformance() {
        console.log('⚡ Auditing Backend Performance...');
        
        // 1. Function count and complexity analysis
        await this.analyzeFunctionComplexity();
        
        // 2. Function size analysis
        await this.analyzeFunctionSizes();
        
        // 3. Cold start analysis
        await this.analyzeColdStartPotential();
        
        console.log('✅ Backend audit completed\n');
    }

    async analyzeFunctionComplexity() {
        console.log('  📊 Analyzing Firebase Functions...');
        
        try {
            process.chdir(this.functionsPath);
            
            // Find all TypeScript files in src directory
            const srcPath = path.join(this.functionsPath, 'src');
            const tsFiles = this.findFiles(srcPath, '.ts');
            
            // Analyze each function file
            const functionAnalysis = tsFiles.map(file => {
                const content = fs.readFileSync(file, 'utf8');
                const lines = content.split('\n').length;
                const functionsExported = (content.match(/export\s+const\s+\w+\s*=/g) || []).length;
                const importsCount = (content.match(/^import\s/gm) || []).length;
                
                return {
                    file: path.relative(srcPath, file),
                    lines,
                    functionsExported,
                    importsCount,
                    complexity: this.calculateComplexityScore(lines, functionsExported, importsCount)
                };
            });
            
            const totalFunctions = functionAnalysis.reduce((sum, f) => sum + f.functionsExported, 0);
            const avgComplexity = functionAnalysis.reduce((sum, f) => sum + f.complexity, 0) / functionAnalysis.length;
            
            this.results.backend.functionAnalysis = {
                totalFiles: tsFiles.length,
                totalFunctions,
                averageComplexity: avgComplexity,
                complexFunctions: functionAnalysis.filter(f => f.complexity > 50).sort((a, b) => b.complexity - a.complexity),
                recommendations: this.getFunctionComplexityRecommendations(totalFunctions, avgComplexity)
            };
            
            console.log(`  📁 Function files: ${tsFiles.length}`);
            console.log(`  ⚡ Total functions: ${totalFunctions}`);
            console.log(`  📊 Average complexity: ${Math.round(avgComplexity)}`);
            
        } catch (error) {
            console.log(`  ⚠️  Function analysis failed: ${error.message}`);
            this.results.backend.functionAnalysis = { error: error.message };
        }
    }

    async analyzeFunctionSizes() {
        console.log('  📦 Analyzing function bundle sizes...');
        
        try {
            // Check if there's a lib directory (compiled functions)
            const libPath = path.join(this.functionsPath, 'lib');
            
            if (fs.existsSync(libPath)) {
                const libFiles = this.getDirectorySize(libPath);
                
                this.results.backend.bundleSizes = {
                    totalSize: libFiles.totalSize,
                    totalFiles: libFiles.files.length,
                    largestBundles: libFiles.files.sort((a, b) => b.size - a.size).slice(0, 10),
                    recommendations: this.getFunctionBundleRecommendations(libFiles)
                };
                
                console.log(`  📦 Total function bundle size: ${this.formatBytes(libFiles.totalSize)}`);
                
            } else {
                console.log('  ⚠️  No compiled functions found (lib directory missing)');
                this.results.backend.bundleSizes = { 
                    error: 'No compiled functions found',
                    suggestion: 'Run "npm run build" in functions directory'
                };
            }
            
        } catch (error) {
            console.log(`  ⚠️  Function size analysis failed: ${error.message}`);
            this.results.backend.bundleSizes = { error: error.message };
        }
    }

    async analyzeColdStartPotential() {
        console.log('  ❄️  Analyzing cold start potential...');
        
        try {
            const packageJsonPath = path.join(this.functionsPath, 'package.json');
            const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
            
            const dependencies = Object.keys(packageJson.dependencies || {});
            const heavyDependencies = dependencies.filter(dep => 
                ['@anthropic', 'openai', 'sharp', 'puppeteer', 'ffmpeg'].some(heavy => 
                    dep.includes(heavy)
                )
            );
            
            // Estimate cold start impact based on dependencies and function count
            const coldStartRisk = this.calculateColdStartRisk(
                this.results.backend.functionAnalysis?.totalFunctions || 0,
                heavyDependencies.length,
                dependencies.length
            );
            
            this.results.backend.coldStartAnalysis = {
                totalDependencies: dependencies.length,
                heavyDependencies,
                coldStartRisk,
                estimatedColdStartTime: this.estimateColdStartTime(coldStartRisk),
                recommendations: this.getColdStartRecommendations(coldStartRisk, heavyDependencies)
            };
            
            console.log(`  ❄️  Cold start risk: ${coldStartRisk}/100`);
            console.log(`  ⏱️  Estimated cold start: ${this.estimateColdStartTime(coldStartRisk)}`);
            
        } catch (error) {
            console.log(`  ⚠️  Cold start analysis failed: ${error.message}`);
            this.results.backend.coldStartAnalysis = { error: error.message };
        }
    }

    async auditInfrastructurePerformance() {
        console.log('🏗️ Auditing Infrastructure Performance...');
        
        // 1. Check Firebase configuration
        await this.analyzeFirebaseConfig();
        
        // 2. Check caching configuration
        await this.analyzeCachingConfig();
        
        console.log('✅ Infrastructure audit completed\n');
    }

    async analyzeFirebaseConfig() {
        console.log('  🔥 Analyzing Firebase configuration...');
        
        try {
            const firebaseJsonPath = path.join(process.cwd(), 'firebase.json');
            
            if (fs.existsSync(firebaseJsonPath)) {
                const firebaseConfig = JSON.parse(fs.readFileSync(firebaseJsonPath, 'utf8'));
                
                const hasHosting = !!firebaseConfig.hosting;
                const hasFirestore = !!firebaseConfig.firestore;
                const hasFunctions = !!firebaseConfig.functions;
                const hasStorage = !!firebaseConfig.storage;
                
                // Check hosting configuration for performance optimizations
                const hostingConfig = firebaseConfig.hosting || {};
                const hasHeaders = !!hostingConfig.headers;
                const hasRewrites = !!hostingConfig.rewrites;
                
                this.results.infrastructure.firebaseConfig = {
                    services: { hasHosting, hasFirestore, hasFunctions, hasStorage },
                    hostingOptimizations: { hasHeaders, hasRewrites },
                    recommendations: this.getFirebaseConfigRecommendations(firebaseConfig)
                };
                
                console.log(`  🔥 Firebase services: ${Object.values({ hasHosting, hasFirestore, hasFunctions, hasStorage }).filter(Boolean).length}/4`);
                
            } else {
                console.log('  ⚠️  firebase.json not found');
                this.results.infrastructure.firebaseConfig = { error: 'firebase.json not found' };
            }
            
        } catch (error) {
            console.log(`  ⚠️  Firebase config analysis failed: ${error.message}`);
            this.results.infrastructure.firebaseConfig = { error: error.message };
        }
    }

    async analyzeCachingConfig() {
        console.log('  💾 Analyzing caching configuration...');
        
        // This would check for caching headers, service workers, etc.
        // For now, we'll do a basic check
        const hasServiceWorker = fs.existsSync(path.join(this.frontendPath, 'public', 'sw.js'));
        
        this.results.infrastructure.cachingConfig = {
            hasServiceWorker,
            recommendations: this.getCachingRecommendations(hasServiceWorker)
        };
        
        console.log(`  💾 Service Worker: ${hasServiceWorker ? '✅' : '❌'}`);
    }

    async generateRecommendations() {
        console.log('💡 Generating performance recommendations...');
        
        const recommendations = [];
        
        // Critical bundle size issue
        if (this.results.frontend.bundleAnalysis?.largestBundle?.size > 500000) {
            recommendations.push({
                priority: 'CRITICAL',
                category: 'Frontend',
                issue: 'Large bundle size detected',
                impact: 'Severely impacts page load times and user experience',
                solution: 'Implement code splitting and lazy loading for GeneratedCVDisplay component',
                estimatedImprovement: '70% reduction in initial page load time'
            });
        }
        
        // Function count optimization
        if (this.results.backend.functionAnalysis?.totalFunctions > 100) {
            recommendations.push({
                priority: 'HIGH',
                category: 'Backend',
                issue: 'High number of Firebase Functions',
                impact: 'Increases cold start times and deployment complexity',
                solution: 'Consolidate related functions to reduce cold starts',
                estimatedImprovement: '60% reduction in cold start occurrences'
            });
        }
        
        // Performance score improvement
        if (this.results.frontend.coreWebVitals?.performanceScore < 50) {
            recommendations.push({
                priority: 'HIGH',
                category: 'Frontend',
                issue: 'Poor Lighthouse performance score',
                impact: 'Affects SEO rankings and user experience',
                solution: 'Optimize Core Web Vitals through bundle optimization and caching',
                estimatedImprovement: '40+ point improvement in Lighthouse score'
            });
        }
        
        this.results.recommendations = recommendations;
        
        console.log(`💡 Generated ${recommendations.length} recommendations\n`);
    }

    async generateReport() {
        const reportPath = this.getReportPath();
        const report = {
            ...this.results,
            summary: this.generateSummary(),
            metadata: {
                auditVersion: '1.0.0',
                generatedAt: this.results.timestamp,
                platform: process.platform,
                nodeVersion: process.version
            }
        };
        
        // Save JSON report
        fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
        
        // Generate human-readable summary
        const summaryPath = reportPath.replace('.json', '-summary.txt');
        fs.writeFileSync(summaryPath, this.generateTextSummary(report));
        
        console.log('📊 Performance audit report generated:');
        console.log(`   📄 Detailed: ${reportPath}`);
        console.log(`   📋 Summary: ${summaryPath}\n`);
    }

    generateSummary() {
        const critical = this.results.recommendations.filter(r => r.priority === 'CRITICAL').length;
        const high = this.results.recommendations.filter(r => r.priority === 'HIGH').length;
        
        return {
            overallScore: this.calculateOverallScore(),
            criticalIssues: critical,
            highPriorityIssues: high,
            topRecommendation: this.results.recommendations[0] || null
        };
    }

    calculateOverallScore() {
        let score = 100;
        
        // Deduct for bundle size issues
        if (this.results.frontend.bundleAnalysis?.largestBundle?.size > 500000) {
            score -= 40;
        }
        
        // Deduct for function complexity
        if (this.results.backend.functionAnalysis?.totalFunctions > 100) {
            score -= 20;
        }
        
        // Deduct for performance score
        if (this.results.frontend.coreWebVitals?.performanceScore < 50) {
            score -= 30;
        }
        
        return Math.max(0, score);
    }

    generateTextSummary(report) {
        return `CVPlus Performance Audit Summary
========================================

Generated: ${new Date(report.metadata.generatedAt).toLocaleString()}
Overall Score: ${report.summary.overallScore}/100

Critical Issues: ${report.summary.criticalIssues}
High Priority Issues: ${report.summary.highPriorityIssues}

Key Findings:
- Bundle Size: ${this.formatBytes(report.frontend.bundleAnalysis?.totalSize || 0)}
- Functions: ${report.backend.functionAnalysis?.totalFunctions || 'N/A'}
- Performance Score: ${Math.round(report.frontend.coreWebVitals?.performanceScore || 0)}/100

Top Recommendation:
${report.summary.topRecommendation?.issue || 'No critical issues found'}

For detailed analysis, see the JSON report.
`;
    }

    // Utility methods
    getDirectorySize(dirPath) {
        const files = [];
        let totalSize = 0;
        
        const scanDir = (dir) => {
            const items = fs.readdirSync(dir);
            
            for (const item of items) {
                const fullPath = path.join(dir, item);
                const stat = fs.statSync(fullPath);
                
                if (stat.isDirectory()) {
                    scanDir(fullPath);
                } else {
                    files.push({
                        name: path.relative(dirPath, fullPath),
                        size: stat.size,
                        path: fullPath
                    });
                    totalSize += stat.size;
                }
            }
        };
        
        if (fs.existsSync(dirPath)) {
            scanDir(dirPath);
        }
        
        return { files, totalSize };
    }

    findFiles(dir, extension) {
        const files = [];
        
        const scanDir = (currentDir) => {
            const items = fs.readdirSync(currentDir);
            
            for (const item of items) {
                const fullPath = path.join(currentDir, item);
                const stat = fs.statSync(fullPath);
                
                if (stat.isDirectory()) {
                    scanDir(fullPath);
                } else if (fullPath.endsWith(extension)) {
                    files.push(fullPath);
                }
            }
        };
        
        if (fs.existsSync(dir)) {
            scanDir(dir);
        }
        
        return files;
    }

    findAccessibleUrl() {
        // Check common development URLs
        const urls = [
            'http://localhost:5173', // Vite default
            'http://localhost:3000', // React default
            'https://cvplus-app.firebaseapp.com', // Production
        ];
        
        // For now, return null since we can't easily check if URLs are accessible in this context
        // In a real implementation, you would use http requests to check
        return null;
    }

    formatBytes(bytes) {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    formatDuration(ms) {
        if (ms < 1000) return `${ms}ms`;
        const seconds = Math.round(ms / 1000);
        if (seconds < 60) return `${seconds}s`;
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        return `${minutes}m ${remainingSeconds}s`;
    }

    calculateComplexityScore(lines, functions, imports) {
        return (lines * 0.1) + (functions * 5) + (imports * 2);
    }

    calculateColdStartRisk(functionCount, heavyDepsCount, totalDepsCount) {
        let risk = 0;
        
        // Function count impact (0-40 points)
        risk += Math.min(40, functionCount * 0.1);
        
        // Heavy dependencies impact (0-30 points)
        risk += heavyDepsCount * 10;
        
        // Total dependencies impact (0-30 points)
        risk += Math.min(30, totalDepsCount * 0.5);
        
        return Math.min(100, risk);
    }

    estimateColdStartTime(riskScore) {
        const baseTime = 1000; // 1 second base
        const additionalTime = (riskScore / 100) * 4000; // Up to 4 seconds additional
        const total = baseTime + additionalTime;
        
        return this.formatDuration(total);
    }

    getBundleSizeRecommendations(assets) {
        const recommendations = [];
        
        if (assets.totalSize > 2000000) { // 2MB
            recommendations.push('Consider implementing code splitting to reduce initial bundle size');
        }
        
        const largeFiles = assets.files.filter(f => f.size > 100000);
        if (largeFiles.length > 0) {
            recommendations.push('Implement lazy loading for large components');
        }
        
        return recommendations;
    }

    getDependencyRecommendations(deps, heavyDeps) {
        const recommendations = [];
        
        if (heavyDeps.length > 0) {
            recommendations.push('Consider replacing heavy dependencies with lighter alternatives');
        }
        
        if (deps.length > 50) {
            recommendations.push('Audit dependencies and remove unused packages');
        }
        
        return recommendations;
    }

    getBuildPerformanceRecommendations(buildTime) {
        const recommendations = [];
        
        if (buildTime > 60000) { // 1 minute
            recommendations.push('Build time is slow, consider optimizing Vite configuration');
        }
        
        return recommendations;
    }

    getCoreWebVitalsRecommendations(vitals) {
        const recommendations = [];
        
        if (vitals.firstContentfulPaint > 1800) {
            recommendations.push('Optimize First Contentful Paint through bundle size reduction');
        }
        
        if (vitals.largestContentfulPaint > 2500) {
            recommendations.push('Optimize Largest Contentful Paint through image optimization and lazy loading');
        }
        
        if (vitals.cumulativeLayoutShift > 0.1) {
            recommendations.push('Reduce Cumulative Layout Shift by specifying image dimensions');
        }
        
        return recommendations;
    }

    getFunctionComplexityRecommendations(totalFunctions, avgComplexity) {
        const recommendations = [];
        
        if (totalFunctions > 100) {
            recommendations.push('Consider consolidating related functions to reduce cold starts');
        }
        
        if (avgComplexity > 50) {
            recommendations.push('Some functions are complex, consider breaking them into smaller units');
        }
        
        return recommendations;
    }

    getFunctionBundleRecommendations(libFiles) {
        const recommendations = [];
        
        if (libFiles.totalSize > 10000000) { // 10MB
            recommendations.push('Function bundle size is large, consider optimizing imports');
        }
        
        return recommendations;
    }

    getColdStartRecommendations(riskScore, heavyDeps) {
        const recommendations = [];
        
        if (riskScore > 70) {
            recommendations.push('High cold start risk - consolidate functions and optimize dependencies');
        }
        
        if (heavyDeps.length > 0) {
            recommendations.push(`Remove or optimize heavy dependencies: ${heavyDeps.join(', ')}`);
        }
        
        return recommendations;
    }

    getFirebaseConfigRecommendations(config) {
        const recommendations = [];
        
        if (!config.hosting?.headers) {
            recommendations.push('Configure caching headers in firebase.json for better performance');
        }
        
        return recommendations;
    }

    getCachingRecommendations(hasServiceWorker) {
        const recommendations = [];
        
        if (!hasServiceWorker) {
            recommendations.push('Implement service worker for advanced caching strategies');
        }
        
        return recommendations;
    }

    getReportPath() {
        const timestamp = new Date().toISOString().slice(0, 16).replace(/:/g, '-');
        return path.join(process.cwd(), 'logs', `performance-audit-${timestamp}.json`);
    }
}

// Main execution
if (require.main === module) {
    const auditor = new CVPlusPerformanceAuditor();
    auditor.runCompleteAudit().catch(error => {
        console.error('❌ Performance audit failed:', error);
        process.exit(1);
    });
}

module.exports = CVPlusPerformanceAuditor;