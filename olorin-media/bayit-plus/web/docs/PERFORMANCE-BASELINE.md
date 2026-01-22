# Performance Baseline

## Overview

This document captures the performance baseline BEFORE StyleSheet → TailwindCSS migration.
All metrics will be compared post-migration to ensure no regressions.

**Baseline Capture Date**: [TO BE FILLED]
**Environment**: Production build on local machine
**Browser**: Chrome (latest)

---

## Bundle Size Metrics

### Current Baseline (Pre-Migration)

**Total Bundle Size**:
- Uncompressed: [TO BE FILLED] MB
- Gzipped: [TO BE FILLED] MB

**JavaScript Bundles**:
```
[TO BE FILLED - Run: ./scripts/analyze-bundle.sh]
```

**CSS Bundles**:
```
[TO BE FILLED]
```

**Largest Chunks**:
1. main.[hash].js: [TO BE FILLED] KB
2. vendor.[hash].js: [TO BE FILLED] KB
3. runtime.[hash].js: [TO BE FILLED] KB

### Thresholds for Migration

- ✅ **Total (gzipped)**: < 200MB baseline + 10% = [TO BE CALCULATED]
- ✅ **Individual chunk**: < 100KB per chunk
- ✅ **Footer chunk**: < 20KB (new, post-migration)

---

## Core Web Vitals

### Current Baseline (Pre-Migration)

**Homepage** (`/`):
- FCP (First Contentful Paint): [TO BE FILLED] ms (Target: < 1500ms)
- LCP (Largest Contentful Paint): [TO BE FILLED] ms (Target: < 2500ms)
- CLS (Cumulative Layout Shift): [TO BE FILLED] (Target: < 0.1)
- FID (First Input Delay): [TO BE FILLED] ms (Target: < 100ms)
- INP (Interaction to Next Paint): [TO BE FILLED] ms (Target: < 200ms)
- TTFB (Time to First Byte): [TO BE FILLED] ms (Target: < 600ms)

**VOD Page** (`/vod`):
- FCP: [TO BE FILLED] ms
- LCP: [TO BE FILLED] ms
- CLS: [TO BE FILLED]
- FID: [TO BE FILLED] ms
- INP: [TO BE FILLED] ms

**Profile Page** (`/profile`):
- FCP: [TO BE FILLED] ms
- LCP: [TO BE FILLED] ms
- CLS: [TO BE FILLED]
- FID: [TO BE FILLED] ms
- INP: [TO BE FILLED] ms

### Lighthouse Scores (Pre-Migration)

**Homepage**:
- Performance: [TO BE FILLED] / 100 (Target: ≥ 90)
- Accessibility: [TO BE FILLED] / 100 (Target: ≥ 95)
- Best Practices: [TO BE FILLED] / 100 (Target: ≥ 95)
- SEO: [TO BE FILLED] / 100 (Target: ≥ 90)

**VOD Page**:
- Performance: [TO BE FILLED] / 100
- Accessibility: [TO BE FILLED] / 100
- Best Practices: [TO BE FILLED] / 100
- SEO: [TO BE FILLED] / 100

---

## Runtime Performance

### Frame Rate

**Scroll Performance**:
- Average FPS: [TO BE FILLED] (Target: 60fps)
- Minimum FPS: [TO BE FILLED] (Must stay above 55fps)
- Frame drops: [TO BE FILLED]

**Animation Performance**:
- Footer expand/collapse: [TO BE FILLED] fps
- Modal open/close: [TO BE FILLED] fps
- Hover transitions: [TO BE FILLED] fps

### Memory Usage

**Initial Load**:
- JavaScript Heap: [TO BE FILLED] MB
- DOM Nodes: [TO BE FILLED]
- Event Listeners: [TO BE FILLED]

**After 5 Minutes**:
- JavaScript Heap: [TO BE FILLED] MB
- Memory Growth: [TO BE FILLED] MB (should be < 20MB)

---

## Network Metrics

### Resource Loading

**Total Requests**: [TO BE FILLED]

**Request Breakdown**:
- JavaScript: [TO BE FILLED] requests, [TO BE FILLED] KB
- CSS: [TO BE FILLED] requests, [TO BE FILLED] KB
- Images: [TO BE FILLED] requests, [TO BE FILLED] KB
- Fonts: [TO BE FILLED] requests, [TO BE FILLED] KB
- Other: [TO BE FILLED] requests, [TO BE FILLED] KB

**Cache Hit Rate**: [TO BE FILLED] %

---

## Mobile Performance (iOS/Android)

### iOS Simulator (iPhone 15)

**Launch Time**: [TO BE FILLED] ms
**Time to Interactive**: [TO BE FILLED] ms
**JavaScript Execution Time**: [TO BE FILLED] ms
**Layout Duration**: [TO BE FILLED] ms

### Android Emulator (Pixel 7)

**Launch Time**: [TO BE FILLED] ms
**Time to Interactive**: [TO BE FILLED] ms
**JavaScript Execution Time**: [TO BE FILLED] ms
**Layout Duration**: [TO BE FILLED] ms

---

## Component-Specific Metrics

### Footer Component (Pre-Migration)

**File Size**: 785 lines
**Render Time**: [TO BE FILLED] ms
**Re-render Time**: [TO BE FILLED] ms
**Memory Footprint**: [TO BE FILLED] KB

### HierarchicalContentTable Component (Pre-Migration)

**File Size**: 696 lines
**Render Time**: [TO BE FILLED] ms
**Re-render Time**: [TO BE FILLED] ms
**Memory Footprint**: [TO BE FILLED] KB

### YoungstersPage Component (Pre-Migration)

**File Size**: 790 lines
**Render Time**: [TO BE FILLED] ms
**Re-render Time**: [TO BE FILLED] ms
**Memory Footprint**: [TO BE FILLED] KB

---

## Capture Commands

### Bundle Size
```bash
npm run build
./scripts/analyze-bundle.sh
SAVE_BASELINE=true ./scripts/analyze-bundle.sh
```

### Lighthouse
```bash
npm install -g @lhci/cli
lhci autorun --url=http://localhost:3000/
```

### Chrome DevTools Performance
1. Open Chrome DevTools (F12)
2. Go to Performance tab
3. Click Record
4. Perform interactions (scroll, click, hover)
5. Stop recording
6. Analyze FPS, scripting time, rendering time

### React DevTools Profiler
1. Open React DevTools
2. Go to Profiler tab
3. Click Record
4. Perform interactions
5. Stop recording
6. Analyze render times, re-render counts

---

## Post-Migration Comparison

### Expected Improvements
- ✅ Bundle size reduction: 5-10% (StyleSheet overhead removed)
- ✅ Faster CSS parsing: TailwindCSS is more optimized
- ✅ Better tree-shaking: Unused Tailwind utilities removed

### Acceptable Regressions
- ⚠️ Initial bundle may increase up to 10% (Tailwind CSS included)
- ⚠️ First paint may increase by <100ms (JIT compilation)

### Unacceptable Regressions
- ❌ Total bundle increase >10%
- ❌ FCP increase >200ms
- ❌ LCP increase >300ms
- ❌ Frame rate drop below 55fps
- ❌ Memory usage increase >20%

---

## Rollback Triggers

If post-migration metrics show:
- Bundle size >10% increase
- FCP >1700ms (baseline + 200ms)
- LCP >2800ms (baseline + 300ms)
- CLS >0.15
- Performance score drop >5 points
- Frame rate consistently <55fps

**Action**: Flip feature flag to OFF, revert changes

---

## Baseline Sign-Off

**Captured by**: _________________
**Date**: _________________
**Review**: _________________

**Notes**:
```
[Any notes about baseline conditions, anomalies, or special circumstances]
```

---

## Appendix: How to Capture Baseline

### 1. Build Project
```bash
npm run build
```

### 2. Run Bundle Analysis
```bash
SAVE_BASELINE=true ./scripts/analyze-bundle.sh
```

### 3. Start Production Server
```bash
npx serve -s build -l 3000
```

### 4. Run Lighthouse (6 times, average results)
```bash
lhci autorun --url=http://localhost:3000/ --collect.numberOfRuns=6
```

### 5. Capture Chrome DevTools Performance
1. Open http://localhost:3000/
2. Open DevTools → Performance
3. Record 10 seconds of interaction
4. Save trace as `baseline-homepage.json`

### 6. Capture React DevTools Profiler
1. Enable Profiler recording
2. Navigate through key pages
3. Export profiler data as `baseline-react-profiler.json`

### 7. Document Findings
Fill in all [TO BE FILLED] sections in this document.
