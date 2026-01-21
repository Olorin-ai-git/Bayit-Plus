#!/usr/bin/env node

/**
 * Bundle Analysis Script
 * Analyzes webpack bundles for size optimization opportunities
 * Generates detailed reports on bundle composition and optimization recommendations
 */

const webpack = require('webpack');
const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin;
const fs = require('fs');
const path = require('path');
const gzipSize = require('gzip-size');

// Configuration
const config = {
  outputDir: './test-results/bundle-analysis',
  buildDir: './build/static',
  thresholds: {
    totalSize: 2000000,        // 2MB
    gzippedSize: 800000,       // 800KB
    chunkSize: 1000000,        // 1MB per chunk
    moduleSize: 500000,        // 500KB per module
    duplicateModules: 5        // Max 5 duplicate modules
  },
  optimization: {
    checkUnusedCode: true,
    checkDuplicateModules: true,
    checkLargeModules: true,
    checkTreeShaking: true
  }
};

/**
 * Parse webpack stats for analysis
 */
function parseWebpackStats(statsPath) {
  if (!fs.existsSync(statsPath)) {
    throw new Error(`Stats file not found: ${statsPath}`);
  }

  const statsData = JSON.parse(fs.readFileSync(statsPath, 'utf8'));

  return {
    assets: statsData.assets || [],
    chunks: statsData.chunks || [],
    modules: statsData.modules || [],
    entrypoints: statsData.entrypoints || {},
    namedChunkGroups: statsData.namedChunkGroups || {},
    outputPath: statsData.outputPath,
    publicPath: statsData.publicPath,
    hash: statsData.hash,
    time: statsData.time
  };
}

/**
 * Analyze bundle sizes
 */
async function analyzeBundleSizes(buildPath) {
  const analysis = {
    totalSize: 0,
    gzippedSize: 0,
    chunks: [],
    assets: [],
    recommendations: []
  };

  if (!fs.existsSync(buildPath)) {
    throw new Error(`Build directory not found: ${buildPath}`);
  }

  // Analyze JavaScript files
  const jsFiles = fs.readdirSync(buildPath)
    .filter(file => file.endsWith('.js'))
    .map(file => path.join(buildPath, file));

  for (const filePath of jsFiles) {
    const stats = fs.statSync(filePath);
    const content = fs.readFileSync(filePath);
    const gzipped = await gzipSize(content);

    const fileInfo = {
      name: path.basename(filePath),
      size: stats.size,
      gzippedSize: gzipped,
      compressionRatio: gzipped / stats.size,
      type: determineChunkType(path.basename(filePath))
    };

    analysis.chunks.push(fileInfo);
    analysis.totalSize += stats.size;
    analysis.gzippedSize += gzipped;

    // Check against thresholds
    if (stats.size > config.thresholds.chunkSize) {
      analysis.recommendations.push({
        type: 'large-chunk',
        file: fileInfo.name,
        size: stats.size,
        recommendation: `Consider code splitting - chunk size ${Math.round(stats.size / 1024)}KB exceeds ${Math.round(config.thresholds.chunkSize / 1024)}KB threshold`
      });
    }

    if (fileInfo.compressionRatio > 0.7) {
      analysis.recommendations.push({
        type: 'poor-compression',
        file: fileInfo.name,
        ratio: fileInfo.compressionRatio,
        recommendation: 'Poor gzip compression ratio - check for already compressed content or binary data'
      });
    }
  }

  // Analyze CSS files
  const cssFiles = fs.readdirSync(buildPath)
    .filter(file => file.endsWith('.css'))
    .map(file => path.join(buildPath, file));

  for (const filePath of cssFiles) {
    const stats = fs.statSync(filePath);
    const content = fs.readFileSync(filePath);
    const gzipped = await gzipSize(content);

    analysis.assets.push({
      name: path.basename(filePath),
      size: stats.size,
      gzippedSize: gzipped,
      type: 'css'
    });

    analysis.totalSize += stats.size;
    analysis.gzippedSize += gzipped;
  }

  // Sort chunks by size
  analysis.chunks.sort((a, b) => b.size - a.size);

  // Overall threshold checks
  if (analysis.totalSize > config.thresholds.totalSize) {
    analysis.recommendations.push({
      type: 'large-bundle',
      size: analysis.totalSize,
      recommendation: `Total bundle size ${Math.round(analysis.totalSize / 1024)}KB exceeds ${Math.round(config.thresholds.totalSize / 1024)}KB threshold - implement code splitting and lazy loading`
    });
  }

  if (analysis.gzippedSize > config.thresholds.gzippedSize) {
    analysis.recommendations.push({
      type: 'large-gzipped',
      size: analysis.gzippedSize,
      recommendation: `Gzipped bundle size ${Math.round(analysis.gzippedSize / 1024)}KB exceeds ${Math.round(config.thresholds.gzippedSize / 1024)}KB threshold`
    });
  }

  return analysis;
}

/**
 * Analyze module dependencies
 */
function analyzeModuleDependencies(statsData) {
  const analysis = {
    totalModules: statsData.modules.length,
    nodeModules: [],
    sourceModules: [],
    duplicateModules: [],
    largestModules: [],
    unusedModules: [],
    recommendations: []
  };

  // Categorize modules
  statsData.modules.forEach(module => {
    if (module.name.includes('node_modules')) {
      analysis.nodeModules.push({
        name: extractModuleName(module.name),
        size: module.size,
        chunks: module.chunks
      });
    } else {
      analysis.sourceModules.push({
        name: module.name,
        size: module.size,
        chunks: module.chunks
      });
    }

    // Check for large modules
    if (module.size > config.thresholds.moduleSize) {
      analysis.largestModules.push({
        name: module.name,
        size: module.size,
        recommendation: 'Consider splitting this large module'
      });
    }
  });

  // Find duplicate modules
  const moduleNames = new Map();
  analysis.nodeModules.forEach(module => {
    const baseName = module.name.split('@')[0];
    if (moduleNames.has(baseName)) {
      moduleNames.get(baseName).push(module);
    } else {
      moduleNames.set(baseName, [module]);
    }
  });

  moduleNames.forEach((modules, name) => {
    if (modules.length > 1) {
      analysis.duplicateModules.push({
        name,
        count: modules.length,
        totalSize: modules.reduce((sum, m) => sum + m.size, 0),
        modules
      });
    }
  });

  // Sort by size
  analysis.nodeModules.sort((a, b) => b.size - a.size);
  analysis.largestModules.sort((a, b) => b.size - a.size);

  // Generate recommendations
  if (analysis.duplicateModules.length > config.thresholds.duplicateModules) {
    analysis.recommendations.push({
      type: 'duplicate-modules',
      count: analysis.duplicateModules.length,
      recommendation: 'Multiple duplicate modules detected - check webpack configuration and dependencies'
    });
  }

  analysis.duplicateModules.forEach(dup => {
    if (dup.totalSize > 100000) { // 100KB
      analysis.recommendations.push({
        type: 'large-duplicate',
        module: dup.name,
        size: dup.totalSize,
        recommendation: `Large duplicate module "${dup.name}" - ${Math.round(dup.totalSize / 1024)}KB wasted`
      });
    }
  });

  const topLargeModules = analysis.nodeModules.slice(0, 10);
  topLargeModules.forEach(module => {
    if (module.size > 200000) { // 200KB
      analysis.recommendations.push({
        type: 'large-dependency',
        module: module.name,
        size: module.size,
        recommendation: `Consider alternatives to large dependency "${module.name}" (${Math.round(module.size / 1024)}KB)`
      });
    }
  });

  return analysis;
}

/**
 * Analyze tree shaking effectiveness
 */
function analyzeTreeShaking(statsData) {
  const analysis = {
    totalModules: statsData.modules.length,
    providedExports: 0,
    usedExports: 0,
    unusedExports: 0,
    effectiveness: 0,
    recommendations: []
  };

  let modulesWithExports = 0;

  statsData.modules.forEach(module => {
    if (module.providedExports && Array.isArray(module.providedExports)) {
      modulesWithExports++;
      analysis.providedExports += module.providedExports.length;

      if (module.usedExports && Array.isArray(module.usedExports)) {
        analysis.usedExports += module.usedExports.length;
      }
    }
  });

  analysis.unusedExports = analysis.providedExports - analysis.usedExports;
  analysis.effectiveness = analysis.providedExports > 0 ?
    (analysis.usedExports / analysis.providedExports) * 100 : 0;

  if (analysis.effectiveness < 70) {
    analysis.recommendations.push({
      type: 'poor-tree-shaking',
      effectiveness: analysis.effectiveness,
      recommendation: 'Tree shaking effectiveness is low - ensure ES6 modules and proper side-effects configuration'
    });
  }

  if (analysis.unusedExports > 100) {
    analysis.recommendations.push({
      type: 'unused-exports',
      count: analysis.unusedExports,
      recommendation: `${analysis.unusedExports} unused exports detected - review import statements and remove unused code`
    });
  }

  return analysis;
}

/**
 * Generate optimization recommendations
 */
function generateOptimizationRecommendations(bundleAnalysis, moduleAnalysis, treeShakingAnalysis) {
  const recommendations = [
    ...bundleAnalysis.recommendations,
    ...moduleAnalysis.recommendations,
    ...treeShakingAnalysis.recommendations
  ];

  // Prioritize recommendations
  const prioritized = recommendations.map(rec => ({
    ...rec,
    priority: calculatePriority(rec)
  })).sort((a, b) => b.priority - a.priority);

  // Add general recommendations based on analysis
  const general = [];

  if (bundleAnalysis.chunks.length < 3) {
    general.push({
      type: 'code-splitting',
      priority: 8,
      recommendation: 'Implement code splitting to create multiple chunks and improve loading performance'
    });
  }

  if (moduleAnalysis.nodeModules.length > 50) {
    general.push({
      type: 'dependency-audit',
      priority: 6,
      recommendation: 'High number of dependencies - audit and remove unused packages'
    });
  }

  const vendorChunk = bundleAnalysis.chunks.find(chunk => chunk.name.includes('vendor'));
  if (vendorChunk && vendorChunk.size > 800000) {
    general.push({
      type: 'vendor-splitting',
      priority: 7,
      recommendation: 'Large vendor chunk detected - split vendor dependencies into multiple chunks'
    });
  }

  return [...prioritized, ...general];
}

/**
 * Calculate recommendation priority
 */
function calculatePriority(recommendation) {
  const priorities = {
    'large-bundle': 10,
    'large-chunk': 9,
    'large-duplicate': 8,
    'large-dependency': 7,
    'duplicate-modules': 6,
    'poor-tree-shaking': 5,
    'unused-exports': 4,
    'poor-compression': 3
  };

  return priorities[recommendation.type] || 1;
}

/**
 * Determine chunk type from filename
 */
function determineChunkType(filename) {
  if (filename.includes('vendor') || filename.includes('node_modules')) return 'vendor';
  if (filename.includes('runtime')) return 'runtime';
  if (filename.includes('main')) return 'main';
  if (/\d+\./.test(filename)) return 'dynamic';
  return 'unknown';
}

/**
 * Extract module name from webpack module path
 */
function extractModuleName(modulePath) {
  const match = modulePath.match(/node_modules[\/\\]([^\/\\]+)/);
  return match ? match[1] : modulePath;
}

/**
 * Generate HTML report
 */
function generateReport(bundleAnalysis, moduleAnalysis, treeShakingAnalysis, recommendations) {
  const reportHtml = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Bundle Analysis Report</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 20px; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; background: white; padding: 20px; border-radius: 8px; }
        .header { text-align: center; margin-bottom: 30px; }
        .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin: 20px 0; }
        .summary-card { background: #f9f9f9; border: 1px solid #ddd; padding: 15px; border-radius: 8px; text-align: center; }
        .value { font-size: 2em; font-weight: bold; color: #2563eb; }
        .section { margin: 30px 0; }
        .chart { width: 100%; height: 400px; margin: 20px 0; }
        .recommendations { background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 4px; margin: 15px 0; }
        .high-priority { background: #f8d7da; border: 1px solid #f5c6cb; }
        .medium-priority { background: #fff3cd; border: 1px solid #ffeaa7; }
        .low-priority { background: #d1ecf1; border: 1px solid #bee5eb; }
        table { width: 100%; border-collapse: collapse; margin: 15px 0; }
        th, td { padding: 8px; text-align: left; border-bottom: 1px solid #ddd; }
        th { background-color: #f2f2f2; }
        .progress-bar { width: 100%; height: 20px; background: #f0f0f0; border-radius: 10px; overflow: hidden; }
        .progress-fill { height: 100%; background: linear-gradient(90deg, #059669, #34d399); }
      </style>
      <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>📦 Bundle Analysis Report</h1>
          <p>Generated: ${new Date().toISOString()}</p>
        </div>

        <div class="summary">
          <div class="summary-card">
            <div class="value">${Math.round(bundleAnalysis.totalSize / 1024)}KB</div>
            <div>Total Bundle Size</div>
          </div>
          <div class="summary-card">
            <div class="value">${Math.round(bundleAnalysis.gzippedSize / 1024)}KB</div>
            <div>Gzipped Size</div>
          </div>
          <div class="summary-card">
            <div class="value">${bundleAnalysis.chunks.length}</div>
            <div>JavaScript Chunks</div>
          </div>
          <div class="summary-card">
            <div class="value">${moduleAnalysis.totalModules}</div>
            <div>Total Modules</div>
          </div>
          <div class="summary-card">
            <div class="value">${Math.round(treeShakingAnalysis.effectiveness)}%</div>
            <div>Tree Shaking Effectiveness</div>
          </div>
        </div>

        <div class="section">
          <h2>Bundle Size Analysis</h2>
          <div class="progress-bar">
            <div class="progress-fill" style="width: ${Math.min((bundleAnalysis.gzippedSize / config.thresholds.gzippedSize) * 100, 100)}%"></div>
          </div>
          <p>Gzipped size: ${Math.round(bundleAnalysis.gzippedSize / 1024)}KB / ${Math.round(config.thresholds.gzippedSize / 1024)}KB threshold</p>

          <h3>Chunk Breakdown</h3>
          <table>
            <thead>
              <tr><th>Chunk</th><th>Size</th><th>Gzipped</th><th>Compression</th><th>Type</th></tr>
            </thead>
            <tbody>
              ${bundleAnalysis.chunks.map(chunk => `
                <tr>
                  <td>${chunk.name}</td>
                  <td>${Math.round(chunk.size / 1024)}KB</td>
                  <td>${Math.round(chunk.gzippedSize / 1024)}KB</td>
                  <td>${Math.round(chunk.compressionRatio * 100)}%</td>
                  <td>${chunk.type}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>

        <div class="section">
          <h2>Module Analysis</h2>
          <p>Total modules: ${moduleAnalysis.totalModules} (${moduleAnalysis.nodeModules.length} from node_modules, ${moduleAnalysis.sourceModules.length} source files)</p>

          <h3>Largest Dependencies</h3>
          <table>
            <thead>
              <tr><th>Module</th><th>Size</th><th>Chunks</th></tr>
            </thead>
            <tbody>
              ${moduleAnalysis.nodeModules.slice(0, 15).map(module => `
                <tr>
                  <td>${module.name}</td>
                  <td>${Math.round(module.size / 1024)}KB</td>
                  <td>${module.chunks.length}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          ${moduleAnalysis.duplicateModules.length > 0 ? `
          <h3>Duplicate Modules</h3>
          <table>
            <thead>
              <tr><th>Module</th><th>Count</th><th>Total Size</th></tr>
            </thead>
            <tbody>
              ${moduleAnalysis.duplicateModules.map(dup => `
                <tr>
                  <td>${dup.name}</td>
                  <td>${dup.count}</td>
                  <td>${Math.round(dup.totalSize / 1024)}KB</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          ` : ''}
        </div>

        <div class="section">
          <h2>Tree Shaking Analysis</h2>
          <div class="progress-bar">
            <div class="progress-fill" style="width: ${treeShakingAnalysis.effectiveness}%"></div>
          </div>
          <p>Effectiveness: ${Math.round(treeShakingAnalysis.effectiveness)}% (${treeShakingAnalysis.usedExports}/${treeShakingAnalysis.providedExports} exports used)</p>

          ${treeShakingAnalysis.unusedExports > 0 ? `
            <p>Unused exports: ${treeShakingAnalysis.unusedExports}</p>
          ` : ''}
        </div>

        <div class="section">
          <h2>Optimization Recommendations</h2>
          ${recommendations.map(rec => `
            <div class="recommendations ${rec.priority >= 8 ? 'high-priority' : rec.priority >= 5 ? 'medium-priority' : 'low-priority'}">
              <h4>${rec.type.replace(/-/g, ' ').toUpperCase()} (Priority: ${rec.priority})</h4>
              <p>${rec.recommendation}</p>
              ${rec.size ? `<p><strong>Impact:</strong> ${Math.round(rec.size / 1024)}KB</p>` : ''}
            </div>
          `).join('')}
        </div>

        <div class="chart">
          <canvas id="bundleChart"></canvas>
        </div>
      </div>

      <script>
        const ctx = document.getElementById('bundleChart').getContext('2d');
        const chunks = ${JSON.stringify(bundleAnalysis.chunks)};

        new Chart(ctx, {
          type: 'doughnut',
          data: {
            labels: chunks.map(chunk => chunk.name),
            datasets: [{
              data: chunks.map(chunk => chunk.size),
              backgroundColor: chunks.map((_, index) => \`hsl(\${index * 137.5 % 360}, 70%, 50%)\`)
            }]
          },
          options: {
            responsive: true,
            plugins: {
              title: {
                display: true,
                text: 'Bundle Size Distribution'
              },
              legend: {
                position: 'right'
              }
            }
          }
        });
      </script>
    </body>
    </html>
  `;

  return reportHtml;
}

/**
 * Run bundle analysis
 */
async function runBundleAnalysis() {
  console.log('📦 Starting bundle analysis...');

  // Ensure output directory exists
  if (!fs.existsSync(config.outputDir)) {
    fs.mkdirSync(config.outputDir, { recursive: true });
  }

  // Check if build directory exists
  const buildPath = path.join(config.buildDir, 'js');
  if (!fs.existsSync(buildPath)) {
    throw new Error(`Build directory not found: ${buildPath}. Run 'npm run build' first.`);
  }

  // Analyze bundle sizes
  const bundleAnalysis = await analyzeBundleSizes(buildPath);

  // Try to load webpack stats if available
  let moduleAnalysis = { totalModules: 0, nodeModules: [], duplicateModules: [], recommendations: [] };
  let treeShakingAnalysis = { effectiveness: 0, recommendations: [] };

  const statsPath = path.join(config.buildDir, '../webpack-stats.json');
  if (fs.existsSync(statsPath)) {
    console.log('📊 Found webpack stats, analyzing modules...');
    const statsData = parseWebpackStats(statsPath);
    moduleAnalysis = analyzeModuleDependencies(statsData);
    treeShakingAnalysis = analyzeTreeShaking(statsData);
  } else {
    console.log('⚠️ Webpack stats not found, skipping module analysis');
    console.log('💡 Add webpack-bundle-analyzer plugin to generate detailed stats');
  }

  // Generate recommendations
  const recommendations = generateOptimizationRecommendations(
    bundleAnalysis,
    moduleAnalysis,
    treeShakingAnalysis
  );

  // Generate report
  const reportHtml = generateReport(
    bundleAnalysis,
    moduleAnalysis,
    treeShakingAnalysis,
    recommendations
  );

  const reportPath = path.join(config.outputDir, 'bundle-analysis-report.html');
  fs.writeFileSync(reportPath, reportHtml);

  // Save raw data
  const dataPath = path.join(config.outputDir, 'bundle-analysis-data.json');
  fs.writeFileSync(dataPath, JSON.stringify({
    bundleAnalysis,
    moduleAnalysis,
    treeShakingAnalysis,
    recommendations
  }, null, 2));

  // Print summary
  console.log('\n📊 Bundle Analysis Summary:');
  console.log(`📦 Total bundle size: ${Math.round(bundleAnalysis.totalSize / 1024)}KB`);
  console.log(`🗜️  Gzipped size: ${Math.round(bundleAnalysis.gzippedSize / 1024)}KB`);
  console.log(`📂 Chunks: ${bundleAnalysis.chunks.length}`);
  console.log(`📋 Modules: ${moduleAnalysis.totalModules}`);
  console.log(`🌳 Tree shaking: ${Math.round(treeShakingAnalysis.effectiveness)}%`);
  console.log(`💡 Recommendations: ${recommendations.length}`);

  if (recommendations.length > 0) {
    console.log('\n🎯 Top Recommendations:');
    recommendations.slice(0, 5).forEach(rec => {
      console.log(`  • ${rec.recommendation}`);
    });
  }

  console.log(`\n📄 Report saved: ${reportPath}`);

  // Check thresholds
  const violations = [];
  if (bundleAnalysis.totalSize > config.thresholds.totalSize) {
    violations.push(`Total size exceeds threshold`);
  }
  if (bundleAnalysis.gzippedSize > config.thresholds.gzippedSize) {
    violations.push(`Gzipped size exceeds threshold`);
  }

  if (violations.length > 0) {
    console.log('\n⚠️ Threshold violations:');
    violations.forEach(v => console.log(`  • ${v}`));
    return false;
  }

  console.log('\n✅ Bundle analysis completed successfully!');
  return true;
}

/**
 * Main execution function
 */
async function main() {
  try {
    const success = await runBundleAnalysis();
    process.exit(success ? 0 : 1);
  } catch (error) {
    console.error('💥 Bundle analysis failed:', error.message);
    process.exit(1);
  }
}

// Handle process termination
process.on('SIGINT', () => {
  console.log('\n⚠️ Process interrupted by user');
  process.exit(0);
});

// Run main function
if (require.main === module) {
  main();
}

module.exports = {
  runBundleAnalysis,
  analyzeBundleSizes,
  analyzeModuleDependencies,
  analyzeTreeShaking,
  generateOptimizationRecommendations
};