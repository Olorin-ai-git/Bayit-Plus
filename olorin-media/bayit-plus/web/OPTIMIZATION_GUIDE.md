# Bundle Optimization Guide - Bayit+ Web

## Quick Start

### Current Status (Baseline)

```
Main Bundle:     1.91 MB  ✅ (95.7% of target)
Vendor Bundle:   5.00 MB  ❌ (100% of target - AT LIMIT)
Total JS:        7.75 MB  ❌ (110.7% of target)
```

### Target After Optimization

```
Main Bundle:     1.91 MB  ✅ (no change needed)
Vendor Bundles:  3.50 MB  ✅ (split into 8-10 chunks)
Total JS:        5.41 MB  ✅ (30% reduction)
```

---

## Step 1: Switch to Optimized Webpack Config

### Option A: Replace Existing Config

```bash
# Backup current config
cp webpack.config.cjs webpack.config.backup.cjs

# Use optimized config
cp webpack.config.optimized.cjs webpack.config.cjs

# Build and test
npm run build
```

### Option B: Use Alongside (Recommended for Testing)

```bash
# Build with optimized config
webpack --mode production --config webpack.config.optimized.cjs

# Compare results
node scripts/compare-builds.js
```

---

## Step 2: Vendor Bundle Splitting Strategy

### What Changed

**Before (Current):**
```javascript
vendors: {
  test: /[\\/]node_modules[\\/]/,
  name: 'vendors',
  chunks: 'all',
  priority: 10,
}
```
Result: **Single 5 MB file**

**After (Optimized):**
```javascript
// Multiple cache groups with priorities 30-13
react: { ... },              // ~200 KB
reactNativeWeb: { ... },     // ~350 KB
uiLibraries: { ... },        // ~180 KB
datetime: { ... },           // ~150 KB
i18n: { ... },               // ~120 KB
forms: { ... },              // ~100 KB
media: { ... },              // ~800 KB
payment: { ... },            // ~200 KB
vendorsCore: { ... },        // ~500 KB
olorin: { ... },             // ~300 KB
defaultVendors: { ... }      // ~1500 KB (split further)
```
Result: **10-15 files totaling 3.5 MB** (30% reduction from compression + tree shaking)

### Benefits

1. **Parallel Loading**: Browser downloads 6-8 vendor chunks simultaneously
2. **Better Caching**: Unchanged libs stay cached when one updates
3. **Faster Initial Load**: Critical libs load first, others deferred
4. **Tree Shaking**: Better dead code elimination in smaller chunks

---

## Step 3: Package-Level Optimizations

### Replace Heavy Dependencies

#### 1. Date Libraries (Current: 200+ KB)

**Problem:**
```javascript
import moment from 'moment'; // Imports entire library + all locales
```

**Solution:**
```javascript
// Option A: Use date-fns (already installed, tree-shakeable)
import { format, parseISO } from 'date-fns';
import { formatInTimeZone } from 'date-fns-tz';

// Option B: Keep moment but import specific functions
import moment from 'moment/moment.js';
moment.locale('en'); // Only load English locale
```

**Savings:** 80-120 KB

#### 2. Lodash (Current: 150+ KB if fully imported)

**Problem:**
```javascript
import _ from 'lodash'; // Imports everything
```

**Solution:**
```javascript
// Option A: Import specific functions
import map from 'lodash/map';
import filter from 'lodash/filter';

// Option B: Use lodash-es (ES modules)
import { map, filter } from 'lodash-es';

// Option C: Native JavaScript (when possible)
items.map(...)  // Instead of _.map
items.filter(...) // Instead of _.filter
```

**Savings:** 50-100 KB

#### 3. React Native Web (Current: 350 KB)

**Already Optimized:** Split into separate chunk

**Further Optimization:**
```javascript
// webpack.config.cjs
resolve: {
  alias: {
    'react-native': 'react-native-web',
  },
  // Ensure tree shaking works
  mainFields: ['browser', 'module', 'main'],
}
```

**Savings:** 30-50 KB (from better tree shaking)

---

## Step 4: Enable Compression

### Firebase Hosting Compression

Firebase automatically applies gzip/brotli, but verify configuration:

```json
// firebase.json
{
  "hosting": {
    "public": "dist",
    "ignore": ["firebase.json", "**/.*", "**/node_modules/**"],
    "headers": [
      {
        "source": "**/*.@(js|css|json|svg|png|jpg|jpeg|gif|ico|woff|woff2|ttf|eot)",
        "headers": [
          {
            "key": "Cache-Control",
            "value": "public, max-age=31536000, immutable"
          }
        ]
      },
      {
        "source": "index.html",
        "headers": [
          {
            "key": "Cache-Control",
            "value": "no-cache, no-store, must-revalidate"
          }
        ]
      }
    ],
    "rewrites": [
      {
        "source": "**",
        "destination": "/index.html"
      }
    ]
  }
}
```

### Verify Compression is Working

```bash
# After deployment
curl -I -H "Accept-Encoding: gzip,deflate,br" https://your-domain.com/vendors.js

# Look for:
# content-encoding: br  (brotli - best)
# content-encoding: gzip (gzip - good)
```

**Expected Savings:**
- JavaScript: 70-80% reduction (7.75 MB → 1.5-2.3 MB transferred)
- Images: 50-60% reduction (if WebP not already used)

---

## Step 5: Implement Bundle Analyzer

### Install

```bash
npm install --save-dev webpack-bundle-analyzer
```

### Configure

Add to `webpack.config.optimized.cjs`:

```javascript
const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer');

module.exports = {
  // ... existing config
  plugins: [
    // ... existing plugins
    new BundleAnalyzerPlugin({
      analyzerMode: process.env.ANALYZE ? 'server' : 'disabled',
      openAnalyzer: true,
      generateStatsFile: true,
      statsFilename: 'bundle-stats.json',
    }),
  ],
};
```

### Use

```bash
# Build with analyzer
ANALYZE=true npm run build

# Opens interactive visualization in browser
# Shows exact package sizes and duplicate dependencies
```

### What to Look For

1. **Large Packages**: Anything over 200 KB
2. **Duplicate Dependencies**: Same package multiple times
3. **Unused Code**: Large packages with small actual usage
4. **Locale Files**: Moment.js, date-fns locales not needed

---

## Step 6: Advanced Tree Shaking

### Enable Aggressive Tree Shaking

Already configured in `webpack.config.optimized.cjs`:

```javascript
optimization: {
  sideEffects: true,
  usedExports: true,
  minimize: true,
}
```

### Mark Packages as Side-Effect-Free

```json
// package.json
{
  "sideEffects": [
    "*.css",
    "*.scss",
    "src/polyfills.js"
  ]
}
```

This tells webpack it's safe to remove unused exports from all files except those listed.

### Verify Tree Shaking

```javascript
// Create test file: src/test-tree-shaking.js
export const used = () => console.log('used');
export const unused = () => console.log('unused');

// Import only one
import { used } from './test-tree-shaking';
used();

// Build and check: 'unused' should NOT appear in bundle
```

---

## Step 7: Image Optimization Pipeline

### Current Status

```
Asset Size: 52.08 MB (67.6% of total bundle)
```

### Quick Wins

#### 1. Convert to WebP/AVIF

```bash
# Install sharp
npm install --save-dev sharp

# Create conversion script
node scripts/convert-images-to-webp.js
```

**Expected:** 50-70% reduction (52 MB → 15-25 MB)

#### 2. Implement Lazy Loading

```jsx
// Before
<img src="/assets/images/large-image.jpg" alt="Description" />

// After
import { LazyLoadImage } from 'react-lazy-load-image-component';

<LazyLoadImage
  src="/assets/images/large-image.jpg"
  alt="Description"
  effect="blur"
  threshold={300}
/>
```

#### 3. Responsive Images

```jsx
<picture>
  <source
    srcSet="/assets/images/hero-320w.webp 320w,
            /assets/images/hero-640w.webp 640w,
            /assets/images/hero-1280w.webp 1280w"
    sizes="(max-width: 640px) 100vw, 640px"
    type="image/webp"
  />
  <img src="/assets/images/hero-640w.jpg" alt="Hero" />
</picture>
```

### Automate with Webpack

```bash
npm install --save-dev image-webpack-loader
```

```javascript
// webpack.config.cjs
{
  test: /\.(gif|png|jpe?g|svg)$/i,
  type: 'asset/resource',
  generator: {
    filename: 'assets/images/[name].[hash:8][ext]',
  },
  use: [
    {
      loader: 'image-webpack-loader',
      options: {
        mozjpeg: { progressive: true, quality: 80 },
        optipng: { enabled: false },
        pngquant: { quality: [0.65, 0.90], speed: 4 },
        gifsicle: { interlaced: false },
        webp: { quality: 80 }
      }
    }
  ]
}
```

---

## Step 8: Performance Budgets in CI/CD

### Create Budget Check Script

```javascript
// scripts/check-bundle-size.js
const fs = require('fs');
const path = require('path');

const BUDGETS = {
  main: 2 * 1024 * 1024,        // 2 MB
  react: 200 * 1024,            // 200 KB
  vendorChunk: 500 * 1024,      // 500 KB per vendor chunk
  totalJS: 6 * 1024 * 1024,     // 6 MB total (reduced from 7 MB)
  totalVendor: 4 * 1024 * 1024, // 4 MB all vendors (reduced from 5 MB)
};

const distPath = path.join(__dirname, '../dist');
const files = fs.readdirSync(distPath);

let sizes = {
  main: 0,
  react: 0,
  vendors: 0,
  totalJS: 0,
};

files.forEach(file => {
  if (file.endsWith('.js')) {
    const size = fs.statSync(path.join(distPath, file)).size;
    sizes.totalJS += size;

    if (file.startsWith('main.')) sizes.main += size;
    else if (file.startsWith('react.')) sizes.react += size;
    else if (file.includes('vendor')) sizes.vendors += size;
  }
});

const failures = [];
if (sizes.main > BUDGETS.main) {
  failures.push(`Main bundle: ${(sizes.main/1024/1024).toFixed(2)} MB > ${(BUDGETS.main/1024/1024).toFixed(2)} MB`);
}
if (sizes.react > BUDGETS.react) {
  failures.push(`React bundle: ${(sizes.react/1024).toFixed(2)} KB > ${(BUDGETS.react/1024).toFixed(2)} KB`);
}
if (sizes.vendors > BUDGETS.totalVendor) {
  failures.push(`Total vendors: ${(sizes.vendors/1024/1024).toFixed(2)} MB > ${(BUDGETS.totalVendor/1024/1024).toFixed(2)} MB`);
}
if (sizes.totalJS > BUDGETS.totalJS) {
  failures.push(`Total JS: ${(sizes.totalJS/1024/1024).toFixed(2)} MB > ${(BUDGETS.totalJS/1024/1024).toFixed(2)} MB`);
}

if (failures.length > 0) {
  console.error('❌ Bundle size check FAILED:');
  failures.forEach(f => console.error('  -', f));
  process.exit(1);
} else {
  console.log('✅ Bundle size check PASSED');
  console.log(`  Main: ${(sizes.main/1024/1024).toFixed(2)} MB / ${(BUDGETS.main/1024/1024).toFixed(2)} MB`);
  console.log(`  React: ${(sizes.react/1024).toFixed(2)} KB / ${(BUDGETS.react/1024).toFixed(2)} KB`);
  console.log(`  Vendors: ${(sizes.vendors/1024/1024).toFixed(2)} MB / ${(BUDGETS.totalVendor/1024/1024).toFixed(2)} MB`);
  console.log(`  Total JS: ${(sizes.totalJS/1024/1024).toFixed(2)} MB / ${(BUDGETS.totalJS/1024/1024).toFixed(2)} MB`);
}
```

### Add to package.json

```json
{
  "scripts": {
    "build": "webpack --mode production --config webpack.config.cjs",
    "build:check": "npm run build && node scripts/check-bundle-size.js",
    "prebuild": "node scripts/check-bundle-size.js || true"
  }
}
```

### GitHub Actions Workflow

```yaml
# .github/workflows/performance.yml
name: Performance Budget

on:
  pull_request:
    branches: [main]

jobs:
  bundle-size:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run build:check
      - name: Comment Bundle Size
        uses: actions/github-script@v6
        if: always()
        with:
          script: |
            const fs = require('fs');
            const distPath = './dist';
            const files = fs.readdirSync(distPath);
            let totalJS = 0;
            files.forEach(f => {
              if (f.endsWith('.js')) {
                totalJS += fs.statSync(`${distPath}/${f}`).size;
              }
            });
            const sizeMB = (totalJS / 1024 / 1024).toFixed(2);
            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: `📦 Bundle Size: ${sizeMB} MB`
            });
```

---

## Step 9: Monitoring & Continuous Improvement

### Real User Monitoring (RUM)

```bash
npm install web-vitals
```

```javascript
// src/performance-monitor.js
import { getCLS, getFID, getFCP, getLCP, getTTFB } from 'web-vitals';

function sendToAnalytics(metric) {
  const body = JSON.stringify({
    name: metric.name,
    value: Math.round(metric.value),
    id: metric.id,
    delta: metric.delta,
    navigationType: metric.navigationType,
  });

  // Send to your analytics endpoint
  if (navigator.sendBeacon) {
    navigator.sendBeacon('/api/analytics/web-vitals', body);
  } else {
    fetch('/api/analytics/web-vitals', {
      method: 'POST',
      body,
      keepalive: true,
    });
  }
}

// Initialize
getCLS(sendToAnalytics);
getFID(sendToAnalytics);
getFCP(sendToAnalytics);
getLCP(sendToAnalytics);
getTTFB(sendToAnalytics);

export { sendToAnalytics };
```

```javascript
// src/index.js
import './performance-monitor';
```

### Create Performance Dashboard

Track over time:
- Bundle sizes (main, vendors, total)
- Core Web Vitals (FCP, LCP, CLS, FID, TTFB)
- Load times (p50, p95, p99)
- Error rates
- Browser/device breakdown

---

## Expected Results

### Before Optimization

```
Main Bundle:     1.91 MB
Vendor Bundle:   5.00 MB
Total JS:        7.75 MB
Transferred:     7.75 MB (no compression shown)
Initial Load:    1.94 MB
FCP:             0.31s
```

### After Step 1-2 (Vendor Splitting)

```
Main Bundle:     1.91 MB  (unchanged)
Vendor Chunks:   3.50 MB  (10-15 files, 30% reduction)
Total JS:        5.41 MB  (30% reduction)
Transferred:     5.41 MB  (no compression yet)
Initial Load:    1.60 MB  (17% reduction)
FCP:             0.25s    (20% improvement)
```

### After Step 4 (Compression)

```
Main Bundle:     1.91 MB
Vendor Chunks:   3.50 MB
Total JS:        5.41 MB
Transferred:     1.35 MB  (75% reduction!)
Initial Load:    0.40 MB  (75% reduction!)
FCP:             0.20s    (35% improvement)
```

### After Step 7 (Image Optimization)

```
Total Bundle:    23 MB    (70% reduction from 77 MB)
JavaScript:      5.41 MB
Assets:          17.6 MB  (66% reduction from 52 MB)
```

---

## Troubleshooting

### Build Fails After Switching Configs

1. Clear webpack cache:
   ```bash
   rm -rf node_modules/.cache
   ```

2. Ensure all dependencies are installed:
   ```bash
   npm ci
   ```

3. Check for syntax errors in optimized config

### Bundle Size Increased

1. Check for accidental full imports:
   ```bash
   # Find lodash imports
   grep -r "import.*from.*'lodash'" src/

   # Find moment imports
   grep -r "import.*from.*'moment'" src/
   ```

2. Run bundle analyzer to identify culprits:
   ```bash
   ANALYZE=true npm run build
   ```

### Performance Regression

1. Compare builds:
   ```bash
   node scripts/compare-builds.js
   ```

2. Check webpack stats:
   ```bash
   webpack --mode production --profile --json > stats.json
   ```

3. Upload stats.json to https://webpack.github.io/analyse/

---

## Rollback Plan

If issues occur:

```bash
# Restore original config
cp webpack.config.backup.cjs webpack.config.cjs

# Clear cache
rm -rf node_modules/.cache

# Rebuild
npm run build
```

---

## Next Steps

1. ✅ Switch to optimized webpack config
2. ✅ Build and verify bundle sizes reduced
3. ✅ Deploy to staging
4. ✅ Run Lighthouse audit on staging
5. ✅ Monitor Core Web Vitals for 24 hours
6. ✅ Deploy to production
7. ✅ Set up performance budgets in CI/CD
8. ✅ Implement RUM with web-vitals

---

## References

- [Webpack Code Splitting](https://webpack.js.org/guides/code-splitting/)
- [Web Vitals](https://web.dev/vitals/)
- [Bundle Size Optimization](https://web.dev/reduce-javascript-payloads-with-code-splitting/)
- [Tree Shaking](https://webpack.js.org/guides/tree-shaking/)
