#!/usr/bin/env node

/**
 * Bundle Size Analysis Script
 *
 * Analyzes bundle sizes and identifies opportunities for optimization:
 * - Large dependencies that can be replaced with lighter alternatives
 * - Unused exports that can be tree-shaken
 * - Code-splitting opportunities
 *
 * Usage:
 *   node scripts/analyze-bundle.js
 */

const fs = require('fs');
const path = require('path');

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

function analyzeDirectory(dir, extensions = ['.tsx', '.ts', '.jsx', '.js']) {
  let totalSize = 0;
  const files = [];

  function traverse(currentPath) {
    const items = fs.readdirSync(currentPath);

    items.forEach((item) => {
      const fullPath = path.join(currentPath, item);
      const stat = fs.statSync(fullPath);

      if (stat.isDirectory()) {
        // Skip node_modules, build, dist folders
        if (!['node_modules', 'build', 'dist', '.git', '__tests__'].includes(item)) {
          traverse(fullPath);
        }
      } else if (stat.isFile()) {
        const ext = path.extname(fullPath);
        if (extensions.includes(ext)) {
          totalSize += stat.size;
          files.push({
            path: fullPath.replace(dir + '/', ''),
            size: stat.size,
          });
        }
      }
    });
  }

  traverse(dir);
  return { totalSize, files };
}

function findLargeFiles(files, threshold = 10240) {
  // Files larger than threshold (default: 10KB)
  return files
    .filter((f) => f.size > threshold)
    .sort((a, b) => b.size - a.size);
}

function analyzeImports(rootDir) {
  const importCounts = {};

  function analyzeFile(filePath) {
    const content = fs.readFileSync(filePath, 'utf-8');
    const importRegex = /import\s+.*?\s+from\s+['"](.+?)['"]/g;

    let match;
    while ((match = importRegex.exec(content)) !== null) {
      const importPath = match[1];
      // Count external dependencies (not relative imports)
      if (!importPath.startsWith('.') && !importPath.startsWith('@/')) {
        importCounts[importPath] = (importCounts[importPath] || 0) + 1;
      }
    }
  }

  function traverse(currentPath) {
    const items = fs.readdirSync(currentPath);

    items.forEach((item) => {
      const fullPath = path.join(currentPath, item);
      const stat = fs.statSync(fullPath);

      if (stat.isDirectory()) {
        if (!['node_modules', 'build', 'dist', '.git', '__tests__'].includes(item)) {
          traverse(fullPath);
        }
      } else if (stat.isFile() && /\.(tsx?|jsx?)$/.test(fullPath)) {
        analyzeFile(fullPath);
      }
    });
  }

  traverse(rootDir);
  return importCounts;
}

function main() {
  log('\n📦 Bundle Size Analysis\n', 'bold');

  const rootDir = process.cwd();
  const sharedDir = path.join(rootDir);

  // Analyze source code
  log('Analyzing source code...', 'cyan');
  const { totalSize, files } = analyzeDirectory(sharedDir);

  log(`\n📊 Total source code size: ${formatBytes(totalSize)}`, 'green');

  // Find large files
  const largeFiles = findLargeFiles(files, 5120); // 5KB threshold
  if (largeFiles.length > 0) {
    log('\n⚠️  Large files (>5KB):', 'yellow');
    largeFiles.slice(0, 10).forEach((file) => {
      log(`  ${file.path}: ${formatBytes(file.size)}`, 'yellow');
    });

    if (largeFiles.length > 10) {
      log(`  ... and ${largeFiles.length - 10} more files`, 'yellow');
    }
  }

  // Analyze imports
  log('\n🔍 Analyzing dependencies...', 'cyan');
  const importCounts = analyzeImports(sharedDir);
  const sortedImports = Object.entries(importCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15);

  log('\n📚 Most imported dependencies:', 'green');
  sortedImports.forEach(([dep, count]) => {
    log(`  ${dep}: ${count} imports`, 'green');
  });

  // Recommendations
  log('\n💡 Optimization Recommendations:\n', 'bold');

  const recommendations = [];

  // Check for large files
  if (largeFiles.length > 0) {
    recommendations.push({
      type: 'warning',
      message: `Found ${largeFiles.length} files >5KB. Consider splitting large components.`,
    });
  }

  // Check for common heavy dependencies
  const heavyDeps = ['moment', 'lodash', 'rxjs'];
  heavyDeps.forEach((dep) => {
    if (importCounts[dep]) {
      recommendations.push({
        type: 'warning',
        message: `Replace '${dep}' with lighter alternatives (date-fns, native methods, etc.)`,
      });
    }
  });

  // Check for potential code-splitting
  const componentFiles = files.filter((f) => f.path.includes('screens/') || f.path.includes('components/'));
  if (componentFiles.length > 50) {
    recommendations.push({
      type: 'info',
      message: `${componentFiles.length} components found. Use React.lazy() for code-splitting.`,
    });
  }

  // Display recommendations
  recommendations.forEach((rec) => {
    const icon = rec.type === 'warning' ? '⚠️' : 'ℹ️';
    const color = rec.type === 'warning' ? 'yellow' : 'cyan';
    log(`${icon}  ${rec.message}`, color);
  });

  // Bundle size targets
  log('\n🎯 Bundle Size Targets:', 'bold');
  log('  Web: <5MB (gzipped)', 'green');
  log('  tvOS: <20MB (native bundle)', 'green');

  if (totalSize > 5 * 1024 * 1024) {
    log(`\n  ❌ Source exceeds 5MB target. Current: ${formatBytes(totalSize)}`, 'red');
  } else {
    log(`\n  ✅ Source within target. Current: ${formatBytes(totalSize)}`, 'green');
  }

  log('\n✨ Analysis complete!\n', 'bold');
}

main();
