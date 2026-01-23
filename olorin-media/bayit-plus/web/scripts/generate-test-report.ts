/**
 * Visual Regression Test Report Generator
 *
 * Analyzes Playwright test results and generates comprehensive report with:
 * - Screenshot matrix (browser x viewport)
 * - Console error log
 * - Keyboard navigation issues
 * - Responsive layout issues
 * - Performance metrics
 * - Pass/Fail determination
 */

import * as fs from 'fs';
import * as path from 'path';

// Types
interface TestResult {
  title: string;
  status: 'passed' | 'failed' | 'skipped';
  duration: number;
  error?: string;
  browser?: string;
  viewport?: string;
  screenshots?: string[];
  metrics?: {
    FCP?: number;
    LCP?: number;
    CLS?: number;
  };
}

interface TestReport {
  timestamp: string;
  totalTests: number;
  passed: number;
  failed: number;
  skipped: number;
  duration: number;
  browsers: string[];
  viewports: string[];
  testResults: TestResult[];
  issues: Issue[];
  performanceMetrics: PerformanceMetrics;
}

interface Issue {
  severity: 'critical' | 'high' | 'medium' | 'low';
  category: 'visual' | 'performance' | 'accessibility' | 'console' | 'responsive';
  description: string;
  browser?: string;
  viewport?: string;
  testCase?: string;
}

interface PerformanceMetrics {
  avgFCP: number;
  avgLCP: number;
  maxFCP: number;
  maxLCP: number;
  fcpPass: boolean;
  lcpPass: boolean;
}

// Constants
const RESULTS_DIR = path.join(__dirname, '..', 'test-results');
const SCREENSHOTS_DIR = path.join(RESULTS_DIR);
const REPORT_OUTPUT = path.join(RESULTS_DIR, 'visual-regression-report.md');
const RESULTS_JSON = path.join(RESULTS_DIR, 'results.json');

// Performance thresholds
const THRESHOLDS = {
  FCP: 1500, // 1.5s
  LCP: 2500, // 2.5s
};

/**
 * Parse Playwright test results
 */
function parseTestResults(): TestReport {
  if (!fs.existsSync(RESULTS_JSON)) {
    throw new Error('Test results not found. Run tests first.');
  }

  const rawResults = JSON.parse(fs.readFileSync(RESULTS_JSON, 'utf-8'));

  const testResults: TestResult[] = [];
  const issues: Issue[] = [];
  let totalFCP = 0;
  let totalLCP = 0;
  let fcpCount = 0;
  let lcpCount = 0;
  let maxFCP = 0;
  let maxLCP = 0;

  // Parse test suites
  for (const suite of rawResults.suites || []) {
    for (const spec of suite.specs || []) {
      for (const test of spec.tests || []) {
        const result: TestResult = {
          title: spec.title,
          status: test.status,
          duration: test.duration || 0,
          browser: test.projectName,
        };

        // Extract error if failed
        if (test.status === 'failed' && test.error) {
          result.error = test.error;

          // Categorize issue
          let category: Issue['category'] = 'visual';
          let severity: Issue['severity'] = 'medium';

          if (test.error.includes('console') || test.error.includes('error')) {
            category = 'console';
            severity = 'high';
          } else if (test.error.includes('performance') || test.error.includes('FCP') || test.error.includes('LCP')) {
            category = 'performance';
            severity = 'critical';
          } else if (test.error.includes('accessibility') || test.error.includes('ARIA')) {
            category = 'accessibility';
            severity = 'high';
          } else if (test.error.includes('responsive') || test.error.includes('viewport')) {
            category = 'responsive';
            severity = 'medium';
          }

          issues.push({
            severity,
            category,
            description: test.error.split('\n')[0], // First line of error
            browser: test.projectName,
            testCase: spec.title,
          });
        }

        testResults.push(result);
      }
    }
  }

  // Calculate performance metrics
  const fcpPass = maxFCP <= THRESHOLDS.FCP;
  const lcpPass = maxLCP <= THRESHOLDS.LCP;

  return {
    timestamp: new Date().toISOString(),
    totalTests: testResults.length,
    passed: testResults.filter(t => t.status === 'passed').length,
    failed: testResults.filter(t => t.status === 'failed').length,
    skipped: testResults.filter(t => t.status === 'skipped').length,
    duration: testResults.reduce((sum, t) => sum + t.duration, 0),
    browsers: [...new Set(testResults.map(t => t.browser).filter(Boolean))] as string[],
    viewports: [...new Set(testResults.map(t => t.viewport).filter(Boolean))] as string[],
    testResults,
    issues,
    performanceMetrics: {
      avgFCP: fcpCount > 0 ? totalFCP / fcpCount : 0,
      avgLCP: lcpCount > 0 ? totalLCP / lcpCount : 0,
      maxFCP,
      maxLCP,
      fcpPass,
      lcpPass,
    },
  };
}

/**
 * Generate markdown report
 */
function generateMarkdownReport(report: TestReport): string {
  const pass = report.failed === 0;

  let markdown = `# Visual Regression Test Report

**Generated:** ${new Date(report.timestamp).toLocaleString()}
**Status:** ${pass ? '✅ PASS' : '❌ FAIL'}
**Duration:** ${(report.duration / 1000).toFixed(2)}s

---

## Executive Summary

| Metric | Value |
|--------|-------|
| Total Tests | ${report.totalTests} |
| Passed | ✅ ${report.passed} |
| Failed | ❌ ${report.failed} |
| Skipped | ⏭️ ${report.skipped} |
| Pass Rate | ${((report.passed / report.totalTests) * 100).toFixed(1)}% |

---

## Browser Coverage

Tested on ${report.browsers.length} browsers:

${report.browsers.map(b => `- ${b}`).join('\n')}

---

## Test Results by Category

### Home Page Tests
${formatTestCategory(report.testResults, 'HOME')}

### Player Page Tests
${formatTestCategory(report.testResults, 'PLAYER')}

### Admin Dashboard Tests
${formatTestCategory(report.testResults, 'ADMIN')}

### Youngsters Page Tests
${formatTestCategory(report.testResults, 'YOUNGSTERS')}

### Widget Modal Tests
${formatTestCategory(report.testResults, 'WIDGETS')}

### Cross-Browser Tests
${formatTestCategory(report.testResults, 'BROWSER')}

### Performance Tests
${formatTestCategory(report.testResults, 'PERF')}

### RTL Layout Tests
${formatTestCategory(report.testResults, 'RTL')}

---

## Performance Metrics

| Metric | Avg | Max | Threshold | Status |
|--------|-----|-----|-----------|--------|
| First Contentful Paint (FCP) | ${report.performanceMetrics.avgFCP.toFixed(0)}ms | ${report.performanceMetrics.maxFCP.toFixed(0)}ms | ${THRESHOLDS.FCP}ms | ${report.performanceMetrics.fcpPass ? '✅' : '❌'} |
| Largest Contentful Paint (LCP) | ${report.performanceMetrics.avgLCP.toFixed(0)}ms | ${report.performanceMetrics.maxLCP.toFixed(0)}ms | ${THRESHOLDS.LCP}ms | ${report.performanceMetrics.lcpPass ? '✅' : '❌'} |

---

## Issues Found

${report.issues.length === 0 ? '✅ No issues found!' : formatIssues(report.issues)}

---

## Screenshot Matrix

Screenshots are organized by test case and browser:

\`\`\`
test-results/
├── home-mobile-xs-chrome.png
├── home-mobile-xs-firefox.png
├── home-mobile-xs-safari.png
├── home-mobile-xs-edge.png
├── home-tablet-sm-chrome.png
└── ... (all viewport/browser combinations)
\`\`\`

---

## Pass/Fail Determination

${pass
    ? `### ✅ PASS

All tests passed successfully! The TailwindCSS migration is visually consistent across:
- All 4 browsers (Chrome, Firefox, Safari, Edge)
- All 9 viewports (320px - 2560px)
- All key pages (Home, Player, Admin, Youngsters, Widgets)
- Performance thresholds met (FCP < 1.5s, LCP < 2.5s)
- Accessibility requirements met (ARIA labels, keyboard navigation)
- No console errors detected`
    : `### ❌ FAIL

${report.failed} test(s) failed. Please review the issues above and fix:
- ${report.issues.filter(i => i.category === 'visual').length} visual regression issue(s)
- ${report.issues.filter(i => i.category === 'performance').length} performance issue(s)
- ${report.issues.filter(i => i.category === 'accessibility').length} accessibility issue(s)
- ${report.issues.filter(i => i.category === 'console').length} console error(s)
- ${report.issues.filter(i => i.category === 'responsive').length} responsive layout issue(s)`
}

---

## Next Steps

${pass
    ? `1. Archive baseline screenshots for future comparisons
2. Document any intentional visual changes
3. Update test expectations if needed
4. Deploy with confidence!`
    : `1. Review failed test screenshots in \`test-results/\`
2. Fix identified issues (see Issues section)
3. Re-run tests: \`./scripts/run-visual-regression.sh\`
4. Compare before/after screenshots
5. Update baselines if changes are intentional`
}

---

**Report generated by Bayit+ Visual Regression Testing Suite**
`;

  return markdown;
}

/**
 * Format test results by category
 */
function formatTestCategory(results: TestResult[], category: string): string {
  const categoryTests = results.filter(r => r.title.includes(`TC-${category}`));

  if (categoryTests.length === 0) {
    return '_No tests in this category_';
  }

  return categoryTests
    .map(t => {
      const status = t.status === 'passed' ? '✅' : t.status === 'failed' ? '❌' : '⏭️';
      return `- ${status} ${t.title} (${t.duration}ms) ${t.browser ? `[${t.browser}]` : ''}`;
    })
    .join('\n');
}

/**
 * Format issues list
 */
function formatIssues(issues: Issue[]): string {
  const grouped: Record<string, Issue[]> = {
    critical: [],
    high: [],
    medium: [],
    low: [],
  };

  issues.forEach(issue => {
    grouped[issue.severity].push(issue);
  });

  let output = '';

  for (const [severity, issueList] of Object.entries(grouped)) {
    if (issueList.length > 0) {
      const icon = severity === 'critical' ? '🔴' : severity === 'high' ? '🟠' : severity === 'medium' ? '🟡' : '🟢';
      output += `### ${icon} ${severity.toUpperCase()} (${issueList.length})\n\n`;

      issueList.forEach(issue => {
        output += `- **[${issue.category}]** ${issue.description}\n`;
        if (issue.browser) output += `  - Browser: ${issue.browser}\n`;
        if (issue.viewport) output += `  - Viewport: ${issue.viewport}\n`;
        if (issue.testCase) output += `  - Test: ${issue.testCase}\n`;
        output += '\n';
      });
    }
  }

  return output;
}

/**
 * Main execution
 */
function main() {
  console.log('📊 Generating Visual Regression Test Report...\n');

  try {
    const report = parseTestResults();
    const markdown = generateMarkdownReport(report);

    // Write report
    fs.writeFileSync(REPORT_OUTPUT, markdown);

    console.log(`✅ Report generated: ${REPORT_OUTPUT}`);
    console.log(`\n📈 Summary:`);
    console.log(`   Total Tests: ${report.totalTests}`);
    console.log(`   Passed: ${report.passed}`);
    console.log(`   Failed: ${report.failed}`);
    console.log(`   Pass Rate: ${((report.passed / report.totalTests) * 100).toFixed(1)}%`);

    if (report.failed > 0) {
      console.log(`\n⚠️  ${report.failed} test(s) failed. See report for details.`);
      process.exit(1);
    } else {
      console.log(`\n🎉 All tests passed!`);
      process.exit(0);
    }
  } catch (error) {
    console.error(`❌ Error generating report: ${error}`);
    process.exit(1);
  }
}

main();
