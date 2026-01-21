#!/usr/bin/env node

/**
 * CVPlus Bundle Analysis Tool
 * Analyzes bundle composition and identifies optimization opportunities
 */

const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

class BundleAnalyzer {
  constructor(distPath = 'dist/assets') {
    this.distPath = distPath;
    this.results = {
      totalSize: 0,
      gzipSize: 0,
      chunks: [],
      optimization_opportunities: []
    };
  }

  async analyzeBundleSize() {
    console.log('🔍 Analyzing bundle composition...\n');

    try {
      const files = fs.readdirSync(this.distPath);
      const jsFiles = files.filter(file => file.endsWith('.js'));
      const cssFiles = files.filter(file => file.endsWith('.css'));

      let totalSize = 0;

      // Analyze JavaScript bundles
      for (const file of jsFiles) {
        const filePath = path.join(this.distPath, file);
        const stats = fs.statSync(filePath);
        const sizeKB = (stats.size / 1024).toFixed(2);
        totalSize += stats.size;

        this.results.chunks.push({
          file,
          size: sizeKB + ' KB',
          type: 'JavaScript'
        });

        console.log(`📦 ${file}: ${sizeKB} KB`);
      }

      // Analyze CSS bundles
      for (const file of cssFiles) {
        const filePath = path.join(this.distPath, file);
        const stats = fs.statSync(filePath);
        const sizeKB = (stats.size / 1024).toFixed(2);
        totalSize += stats.size;

        this.results.chunks.push({
          file,
          size: sizeKB + ' KB',
          type: 'CSS'
        });

        console.log(`🎨 ${file}: ${sizeKB} KB`);
      }

      this.results.totalSize = (totalSize / 1024).toFixed(2);
      console.log(`\n📊 Total Bundle Size: ${this.results.totalSize} KB`);
      
      return this.results;
    } catch (error) {
      console.error('❌ Error analyzing bundle:', error.message);
      throw error;
    }
  }

  async identifyOptimizationOpportunities() {
    console.log('\n🎯 Identifying Optimization Opportunities...\n');

    const opportunities = [];

    // Check for oversized main bundle (>500KB)
    const mainChunk = this.results.chunks.find(chunk => 
      chunk.file.includes('index') && parseFloat(chunk.size) > 500
    );

    if (mainChunk) {
      opportunities.push({
        type: 'Bundle Splitting',
        issue: `Main bundle is ${mainChunk.size} (>${mainChunk.size.split(' ')[0] > 1000 ? '1MB' : '500KB'})`,
        solution: 'Implement code splitting and lazy loading',
        impact: 'High',
        priority: 1
      });
    }

    // Check for large Firebase bundle
    const firebaseChunk = this.results.chunks.find(chunk => 
      chunk.file.includes('firebase') && parseFloat(chunk.size) > 400
    );

    if (firebaseChunk) {
      opportunities.push({
        type: 'Firebase Optimization',
        issue: `Firebase bundle is ${firebaseChunk.size}`,
        solution: 'Remove unused Firebase modules, implement tree shaking',
        impact: 'Medium',
        priority: 2
      });
    }

    // Check overall bundle size against target
    const totalSizeMB = parseFloat(this.results.totalSize) / 1024;
    if (totalSizeMB > 1) {
      opportunities.push({
        type: 'Overall Bundle Size',
        issue: `Total bundle exceeds 1MB (${totalSizeMB.toFixed(2)}MB)`,
        solution: 'Comprehensive dependency audit and optimization',
        impact: 'Critical',
        priority: 1
      });
    }

    this.results.optimization_opportunities = opportunities;

    opportunities.forEach((opp, index) => {
      console.log(`${index + 1}. ${opp.type} (${opp.impact} Impact)`);
      console.log(`   Issue: ${opp.issue}`);
      console.log(`   Solution: ${opp.solution}`);
      console.log('');
    });

    return opportunities;
  }

  generateOptimizationReport() {
    const report = {
      analysis_date: new Date().toISOString(),
      current_performance: {
        total_bundle_size_kb: this.results.totalSize,
        total_bundle_size_mb: (parseFloat(this.results.totalSize) / 1024).toFixed(2),
        performance_grade: this.calculatePerformanceGrade(),
        chunks_breakdown: this.results.chunks
      },
      optimization_targets: {
        target_bundle_size_kb: 1000, // 1MB target
        target_reduction_percentage: this.calculateReductionNeeded(),
        priority_optimizations: this.results.optimization_opportunities
          .sort((a, b) => a.priority - b.priority)
      },
      recommendations: this.generateRecommendations()
    };

    return report;
  }

  calculatePerformanceGrade() {
    const sizeMB = parseFloat(this.results.totalSize) / 1024;
    
    if (sizeMB <= 1) return 'A';
    if (sizeMB <= 1.5) return 'B';
    if (sizeMB <= 2) return 'C';
    if (sizeMB <= 3) return 'D';
    return 'F';
  }

  calculateReductionNeeded() {
    const currentSize = parseFloat(this.results.totalSize);
    const targetSize = 1000; // 1MB
    
    if (currentSize <= targetSize) return 0;
    
    const reduction = ((currentSize - targetSize) / currentSize * 100);
    return Math.ceil(reduction);
  }

  generateRecommendations() {
    const currentSizeMB = parseFloat(this.results.totalSize) / 1024;
    const recommendations = [];

    if (currentSizeMB > 2) {
      recommendations.push({
        action: 'Implement aggressive code splitting',
        expected_reduction: '40-60%',
        implementation: 'React.lazy, dynamic imports, route-based splitting'
      });
    }

    if (this.results.chunks.find(c => c.file.includes('firebase'))) {
      recommendations.push({
        action: 'Optimize Firebase imports',
        expected_reduction: '20-30%',
        implementation: 'Import only needed Firebase modules, tree shake unused code'
      });
    }

    recommendations.push({
      action: 'Dependency audit and replacement',
      expected_reduction: '15-25%',
      implementation: 'Replace heavy dependencies with lightweight alternatives'
    });

    recommendations.push({
      action: 'Enable advanced minification',
      expected_reduction: '10-15%',
      implementation: 'Configure Vite/Rollup for maximum compression'
    });

    return recommendations;
  }

  async saveReport(filename = 'bundle-analysis-report.json') {
    const report = this.generateOptimizationReport();
    const reportPath = path.join(process.cwd(), 'logs', filename);
    
    // Ensure logs directory exists
    const logsDir = path.join(process.cwd(), 'logs');
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true });
    }
    
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`📄 Bundle analysis report saved: ${reportPath}`);
    
    return report;
  }
}

// Main execution
async function main() {
  console.log('🚀 CVPlus Bundle Performance Analysis\n');
  
  const analyzer = new BundleAnalyzer();
  
  try {
    // Change to frontend directory for analysis
    process.chdir(path.join(__dirname, '../../frontend'));
    
    await analyzer.analyzeBundleSize();
    await analyzer.identifyOptimizationOpportunities();
    
    const report = await analyzer.saveReport(`bundle-analysis-${new Date().toISOString().split('T')[0]}.json`);
    
    console.log('🎯 Performance Analysis Complete!');
    console.log(`Current Grade: ${report.current_performance.performance_grade}`);
    console.log(`Target Reduction: ${report.optimization_targets.target_reduction_percentage}%`);
    console.log(`Priority Actions: ${report.optimization_targets.priority_optimizations.length}`);
    
  } catch (error) {
    console.error('❌ Analysis failed:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = BundleAnalyzer;