/**
 * Performance Monitoring and Optimization for Olorin Frontend
 * Monitors build performance, bundle size, and runtime metrics
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class PerformanceMonitor {
  constructor() {
    this.rootDir = path.resolve(__dirname, '..');
    this.buildDir = path.join(this.rootDir, 'build');
    this.metricsFile = path.join(this.buildDir, 'performance-metrics.json');
  }

  /**
   * Analyze bundle composition and size
   */
  analyzeBundleSize() {
    const staticDir = path.join(this.buildDir, 'static');
    const analysis = {
      js: this.analyzeFiles(path.join(staticDir, 'js'), '.js'),
      css: this.analyzeFiles(path.join(staticDir, 'css'), '.css'),
      media: this.analyzeFiles(path.join(staticDir, 'media'), ''),
      timestamp: new Date().toISOString()
    };

    const totalSize = analysis.js.totalSize + analysis.css.totalSize + analysis.media.totalSize;
    analysis.summary = {
      totalSize,
      totalSizeKB: (totalSize / 1024).toFixed(2),
      jsPercentage: ((analysis.js.totalSize / totalSize) * 100).toFixed(1),
      cssPercentage: ((analysis.css.totalSize / totalSize) * 100).toFixed(1),
      mediaPercentage: ((analysis.media.totalSize / totalSize) * 100).toFixed(1)
    };

    return analysis;
  }

  /**
   * Analyze files in a directory
   */
  analyzeFiles(dir, extension) {
    if (!fs.existsSync(dir)) {
      return { files: [], totalSize: 0, count: 0 };
    }

    const files = fs.readdirSync(dir)
      .filter(file => !file.includes('.map') && (extension === '' || file.endsWith(extension)))
      .map(file => {
        const filePath = path.join(dir, file);
        const stats = fs.statSync(filePath);
        return {
          name: file,
          size: stats.size,
          sizeKB: (stats.size / 1024).toFixed(2)
        };
      })
      .sort((a, b) => b.size - a.size);

    const totalSize = files.reduce((sum, file) => sum + file.size, 0);

    return {
      files,
      totalSize,
      count: files.length
    };
  }

  /**
   * Generate performance report
   */
  generatePerformanceReport() {
    console.log('📊 Generating Performance Report...');

    const bundleAnalysis = this.analyzeBundleSize();
    const buildMetadata = this.loadBuildMetadata();

    const report = {
      timestamp: new Date().toISOString(),
      buildInfo: buildMetadata,
      bundleAnalysis,
      recommendations: this.generateRecommendations(bundleAnalysis),
      thresholds: {
        maxBundleSize: 512000, // 500KB
        maxJsSize: 300000,     // 300KB
        maxCssSize: 100000     // 100KB
      }
    };

    // Check thresholds
    report.alerts = this.checkThresholds(bundleAnalysis, report.thresholds);

    // Save report
    fs.writeFileSync(this.metricsFile, JSON.stringify(report, null, 2));
    console.log('📄 Performance report saved:', this.metricsFile);

    return report;
  }

  /**
   * Load build metadata
   */
  loadBuildMetadata() {
    const metadataFile = path.join(this.buildDir, 'build-metadata.json');
    if (fs.existsSync(metadataFile)) {
      return JSON.parse(fs.readFileSync(metadataFile, 'utf8'));
    }
    return null;
  }

  /**
   * Generate optimization recommendations
   */
  generateRecommendations(analysis) {
    const recommendations = [];

    // Bundle size recommendations
    if (analysis.summary.totalSize > 512000) {
      recommendations.push({
        type: 'bundle-size',
        priority: 'high',
        message: `Bundle size (${analysis.summary.totalSizeKB} KB) exceeds 500KB limit`,
        suggestions: [
          'Enable code splitting for larger components',
          'Implement lazy loading for non-critical routes',
          'Optimize and compress images',
          'Remove unused dependencies'
        ]
      });
    }

    // Large JavaScript files
    const largeJsFiles = analysis.js.files.filter(file => file.size > 100000);
    if (largeJsFiles.length > 0) {
      recommendations.push({
        type: 'javascript',
        priority: 'medium',
        message: `Found ${largeJsFiles.length} large JavaScript files (>100KB)`,
        files: largeJsFiles.map(f => `${f.name} (${f.sizeKB} KB)`),
        suggestions: [
          'Split large components into smaller chunks',
          'Use dynamic imports for heavy libraries',
          'Enable tree shaking for unused code'
        ]
      });
    }

    // CSS optimization
    if (analysis.css.totalSize > 100000) {
      recommendations.push({
        type: 'css',
        priority: 'low',
        message: `CSS bundle size (${(analysis.css.totalSize/1024).toFixed(2)} KB) is large`,
        suggestions: [
          'Remove unused CSS rules',
          'Use CSS modules for component-specific styles',
          'Enable CSS minification'
        ]
      });
    }

    return recommendations;
  }

  /**
   * Check performance thresholds
   */
  checkThresholds(analysis, thresholds) {
    const alerts = [];

    if (analysis.summary.totalSize > thresholds.maxBundleSize) {
      alerts.push({
        level: 'error',
        metric: 'Total Bundle Size',
        actual: `${analysis.summary.totalSizeKB} KB`,
        threshold: `${(thresholds.maxBundleSize/1024).toFixed(2)} KB`,
        impact: 'Page load performance'
      });
    }

    if (analysis.js.totalSize > thresholds.maxJsSize) {
      alerts.push({
        level: 'warning',
        metric: 'JavaScript Bundle Size',
        actual: `${(analysis.js.totalSize/1024).toFixed(2)} KB`,
        threshold: `${(thresholds.maxJsSize/1024).toFixed(2)} KB`,
        impact: 'Script execution time'
      });
    }

    if (analysis.css.totalSize > thresholds.maxCssSize) {
      alerts.push({
        level: 'info',
        metric: 'CSS Bundle Size',
        actual: `${(analysis.css.totalSize/1024).toFixed(2)} KB`,
        threshold: `${(thresholds.maxCssSize/1024).toFixed(2)} KB`,
        impact: 'Render blocking time'
      });
    }

    return alerts;
  }

  /**
   * Display performance summary
   */
  displaySummary() {
    const report = this.generatePerformanceReport();

    console.log('🎨 === PERFORMANCE SUMMARY === 🎨');
    console.log(`Total Bundle Size: ${report.bundleAnalysis.summary.totalSizeKB} KB`);
    console.log(`JavaScript: ${(report.bundleAnalysis.js.totalSize/1024).toFixed(2)} KB (${report.bundleAnalysis.summary.jsPercentage}%)`);
    console.log(`CSS: ${(report.bundleAnalysis.css.totalSize/1024).toFixed(2)} KB (${report.bundleAnalysis.summary.cssPercentage}%)`);
    console.log(`Media: ${(report.bundleAnalysis.media.totalSize/1024).toFixed(2)} KB (${report.bundleAnalysis.summary.mediaPercentage}%)`);

    if (report.alerts.length > 0) {
      console.log('
⚠️  PERFORMANCE ALERTS:');
      report.alerts.forEach(alert => {
        const icon = alert.level === 'error' ? '❌' : alert.level === 'warning' ? '⚠️' : 'ℹ️';
        console.log(`${icon} ${alert.metric}: ${alert.actual} (threshold: ${alert.threshold})`);
      });
    }

    if (report.recommendations.length > 0) {
      console.log('
💡 OPTIMIZATION RECOMMENDATIONS:');
      report.recommendations.forEach((rec, index) => {
        console.log(`${index + 1}. [${rec.priority.toUpperCase()}] ${rec.message}`);
        rec.suggestions.forEach(suggestion => {
          console.log(`   - ${suggestion}`);
        });
      });
    } else {
      console.log('
✅ No performance issues detected!');
    }

    return report;
  }

  /**
   * Run lighthouse audit
   */
  runLighthouseAudit() {
    try {
      console.log('🌅 Running Lighthouse audit...');
      const result = execSync('npx lighthouse http://localhost:3000 --output json', {
        cwd: this.rootDir,
        encoding: 'utf8'
      });
      
      const lighthouse = JSON.parse(result);
      const scores = {
        performance: Math.round(lighthouse.lhr.categories.performance.score * 100),
        accessibility: Math.round(lighthouse.lhr.categories.accessibility.score * 100),
        bestPractices: Math.round(lighthouse.lhr.categories['best-practices'].score * 100),
        seo: Math.round(lighthouse.lhr.categories.seo.score * 100)
      };

      console.log('📈 Lighthouse Scores:');
      console.log(`Performance: ${scores.performance}/100`);
      console.log(`Accessibility: ${scores.accessibility}/100`);
      console.log(`Best Practices: ${scores.bestPractices}/100`);
      console.log(`SEO: ${scores.seo}/100`);

      return scores;
    } catch (error) {
      console.warn('⚠️  Lighthouse audit failed:', error.message);
      return null;
    }
  }
}

module.exports = PerformanceMonitor;

// CLI usage
if (require.main === module) {
  const monitor = new PerformanceMonitor();
  
  const command = process.argv[2];
  
  switch (command) {
    case 'analyze':
      monitor.displaySummary();
      break;
    case 'report':
      monitor.generatePerformanceReport();
      break;
    case 'lighthouse':
      monitor.runLighthouseAudit();
      break;
    default:
      console.log('Usage: node performance-monitor.js [analyze|report|lighthouse]');
      process.exit(1);
  }
}