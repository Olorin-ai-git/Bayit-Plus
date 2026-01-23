#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Performance budgets
const BUDGETS = {
  main: 2 * 1024 * 1024,        // 2 MB
  react: 200 * 1024,            // 200 KB
  vendorChunk: 500 * 1024,      // 500 KB per individual vendor chunk
  totalVendor: 4 * 1024 * 1024, // 4 MB all vendors combined
  totalJS: 6 * 1024 * 1024,     // 6 MB total JavaScript
};

function formatSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
  return (bytes / 1024 / 1024).toFixed(2) + ' MB';
}

function checkBundleSize() {
  const distPath = path.join(__dirname, '../dist');

  if (!fs.existsSync(distPath)) {
    console.error('❌ Error: dist/ directory not found. Run `npm run build` first.');
    process.exit(1);
  }

  const files = fs.readdirSync(distPath);

  const sizes = {
    main: 0,
    react: 0,
    vendors: [],
    totalVendor: 0,
    totalJS: 0,
    largestChunk: { name: '', size: 0 },
  };

  files.forEach(file => {
    const filePath = path.join(distPath, file);
    const stat = fs.statSync(filePath);

    if (stat.isFile() && file.endsWith('.js')) {
      const size = stat.size;
      sizes.totalJS += size;

      if (file.startsWith('main.')) {
        sizes.main += size;
      } else if (file.startsWith('react.')) {
        sizes.react += size;
      } else if (file.includes('vendor') || file.includes('vendors')) {
        sizes.vendors.push({ name: file, size });
        sizes.totalVendor += size;
      }

      // Track largest chunk
      if (size > sizes.largestChunk.size) {
        sizes.largestChunk = { name: file, size };
      }
    }
  });

  // Sort vendors by size
  sizes.vendors.sort((a, b) => b.size - a.size);

  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║         BUNDLE SIZE CHECK REPORT                          ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  const failures = [];
  const warnings = [];

  // Check main bundle
  const mainStatus = sizes.main <= BUDGETS.main ? '✅ PASS' : '❌ FAIL';
  const mainPercent = ((sizes.main / BUDGETS.main) * 100).toFixed(1);
  console.log(`Main Bundle:     ${formatSize(sizes.main).padEnd(12)} / ${formatSize(BUDGETS.main).padEnd(12)} ${mainStatus} (${mainPercent}%)`);
  if (sizes.main > BUDGETS.main) {
    failures.push(`Main bundle: ${formatSize(sizes.main)} > ${formatSize(BUDGETS.main)}`);
  }

  // Check React bundle
  const reactStatus = sizes.react <= BUDGETS.react ? '✅ PASS' : '❌ FAIL';
  const reactPercent = ((sizes.react / BUDGETS.react) * 100).toFixed(1);
  console.log(`React Bundle:    ${formatSize(sizes.react).padEnd(12)} / ${formatSize(BUDGETS.react).padEnd(12)} ${reactStatus} (${reactPercent}%)`);
  if (sizes.react > BUDGETS.react) {
    failures.push(`React bundle: ${formatSize(sizes.react)} > ${formatSize(BUDGETS.react)}`);
  }

  // Check total vendors
  const vendorStatus = sizes.totalVendor <= BUDGETS.totalVendor ? '✅ PASS' : '❌ FAIL';
  const vendorPercent = ((sizes.totalVendor / BUDGETS.totalVendor) * 100).toFixed(1);
  console.log(`Total Vendors:   ${formatSize(sizes.totalVendor).padEnd(12)} / ${formatSize(BUDGETS.totalVendor).padEnd(12)} ${vendorStatus} (${vendorPercent}%)`);
  if (sizes.totalVendor > BUDGETS.totalVendor) {
    failures.push(`Total vendors: ${formatSize(sizes.totalVendor)} > ${formatSize(BUDGETS.totalVendor)}`);
  }

  // Check total JS
  const totalStatus = sizes.totalJS <= BUDGETS.totalJS ? '✅ PASS' : '❌ FAIL';
  const totalPercent = ((sizes.totalJS / BUDGETS.totalJS) * 100).toFixed(1);
  console.log(`Total JS:        ${formatSize(sizes.totalJS).padEnd(12)} / ${formatSize(BUDGETS.totalJS).padEnd(12)} ${totalStatus} (${totalPercent}%)`);
  if (sizes.totalJS > BUDGETS.totalJS) {
    failures.push(`Total JS: ${formatSize(sizes.totalJS)} > ${formatSize(BUDGETS.totalJS)}`);
  }

  console.log('\n───────────────────────────────────────────────────────────');

  // Show largest chunks
  if (sizes.vendors.length > 0) {
    console.log('\n📦 Top 5 Vendor Chunks:\n');
    sizes.vendors.slice(0, 5).forEach((vendor, i) => {
      const chunkStatus = vendor.size <= BUDGETS.vendorChunk ? '✅' : '⚠️';
      console.log(`  ${i + 1}. ${vendor.name.substring(0, 40).padEnd(40)} ${formatSize(vendor.size).padEnd(10)} ${chunkStatus}`);
      if (vendor.size > BUDGETS.vendorChunk) {
        warnings.push(`Large vendor chunk: ${vendor.name} (${formatSize(vendor.size)})`);
      }
    });
  }

  console.log(`\n🔍 Largest Chunk: ${sizes.largestChunk.name} (${formatSize(sizes.largestChunk.size)})`);

  // Final result
  console.log('\n' + '═'.repeat(60) + '\n');

  if (failures.length === 0 && warnings.length === 0) {
    console.log('✅ ✅ ✅ ALL CHECKS PASSED ✅ ✅ ✅\n');
    console.log('Bundle sizes are within performance budgets.');
    return 0;
  } else if (failures.length === 0) {
    console.log('⚠️  PASSED WITH WARNINGS\n');
    console.log('Bundle sizes within budgets, but some optimizations recommended:\n');
    warnings.forEach(w => console.log(`  - ${w}`));
    return 0;
  } else {
    console.log('❌ ❌ ❌ BUNDLE SIZE CHECK FAILED ❌ ❌ ❌\n');
    console.log('The following bundles exceed performance budgets:\n');
    failures.forEach(f => console.log(`  - ${f}`));
    console.log('\nActions:');
    console.log('  1. Review OPTIMIZATION_GUIDE.md');
    console.log('  2. Run: ANALYZE=true npm run build');
    console.log('  3. Consider using webpack.config.optimized.cjs');
    return 1;
  }
}

const exitCode = checkBundleSize();
process.exit(exitCode);
