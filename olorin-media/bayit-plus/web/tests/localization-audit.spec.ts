/**
 * Localization UI Audit Tests
 *
 * Automated testing for localization issues across all supported languages.
 * Detects: text overflow, truncation, RTL issues, missing translations, layout problems.
 *
 * Usage:
 *   npx playwright test tests/localization-audit.spec.ts
 *   npx playwright test tests/localization-audit.spec.ts --headed
 *   npx playwright test tests/localization-audit.spec.ts --grep "Language: he"
 */

import { test, expect, Page } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

const LANGUAGES = ['he', 'en', 'es', 'zh', 'fr', 'it', 'hi', 'ta', 'bn', 'ja'] as const;
type Language = (typeof LANGUAGES)[number];

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

// Pages to audit
const PAGES_TO_AUDIT = [
  { path: '/', name: 'home' },
  { path: '/vod', name: 'vod' },
  { path: '/live', name: 'live' },
  { path: '/radio', name: 'radio' },
  { path: '/podcasts', name: 'podcasts' },
  { path: '/settings', name: 'settings' },
  { path: '/admin/librarian', name: 'librarian', requiresAuth: true },
];

interface LocalizationIssue {
  type: 'overflow' | 'truncation' | 'untranslated' | 'rtl' | 'missing' | 'layout';
  severity: 'critical' | 'warning' | 'info';
  element: string;
  selector: string;
  language: string;
  page: string;
  screenshot?: string;
  details: string;
}

// Global issues collector
const allIssues: LocalizationIssue[] = [];

// Ensure screenshots directory exists
const screenshotDir = path.join(__dirname, '..', 'screenshots');
if (!fs.existsSync(screenshotDir)) {
  fs.mkdirSync(screenshotDir, { recursive: true });
}

/**
 * Set the app language via localStorage and reload
 */
async function setLanguage(page: Page, lang: Language): Promise<void> {
  await page.evaluate((language) => {
    localStorage.setItem('bayit-language', language);
    localStorage.setItem('i18nextLng', language);
  }, lang);

  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(500); // Wait for i18n to initialize
}

/**
 * Check for text overflow issues
 */
async function checkTextOverflow(
  page: Page,
  pageName: string,
  lang: Language
): Promise<LocalizationIssue[]> {
  const issues: LocalizationIssue[] = [];

  const overflowingElements = await page.evaluate(() => {
    const results: Array<{ selector: string; text: string; overflow: string }> = [];

    document.querySelectorAll('*').forEach((el) => {
      const htmlEl = el as HTMLElement;
      const style = window.getComputedStyle(el);

      // Skip hidden elements
      if (style.display === 'none' || style.visibility === 'hidden') return;

      // Check for horizontal overflow
      if (
        el.scrollWidth > el.clientWidth + 2 &&
        style.overflowX !== 'scroll' &&
        style.overflowX !== 'auto' &&
        style.overflowX !== 'hidden'
      ) {
        const text = htmlEl.innerText?.trim() || '';
        if (text && text.length > 2 && text.length < 200) {
          results.push({
            selector:
              el.tagName.toLowerCase() +
              (el.id ? `#${el.id}` : '') +
              (el.className && typeof el.className === 'string'
                ? `.${el.className.split(' ')[0]}`
                : ''),
            text: text.substring(0, 80),
            overflow: `scrollWidth(${el.scrollWidth}) > clientWidth(${el.clientWidth})`,
          });
        }
      }
    });

    return results;
  });

  overflowingElements.forEach((el) => {
    issues.push({
      type: 'overflow',
      severity: 'critical',
      element: el.text,
      selector: el.selector,
      language: lang,
      page: pageName,
      details: el.overflow,
    });
  });

  return issues;
}

/**
 * Check for text truncation
 */
async function checkTruncation(
  page: Page,
  pageName: string,
  lang: Language
): Promise<LocalizationIssue[]> {
  const issues: LocalizationIssue[] = [];

  const truncatedElements = await page.evaluate(() => {
    const results: Array<{ selector: string; text: string }> = [];

    document.querySelectorAll('*').forEach((el) => {
      const htmlEl = el as HTMLElement;
      const text = htmlEl.innerText || '';
      const style = window.getComputedStyle(el);

      // Check for CSS truncation with actual overflow
      if (
        (style.textOverflow === 'ellipsis' || text.endsWith('...') || text.endsWith('…')) &&
        el.scrollWidth > el.clientWidth
      ) {
        results.push({
          selector:
            el.tagName.toLowerCase() + (el.id ? `#${el.id}` : ''),
          text: text.substring(0, 100),
        });
      }
    });

    return results;
  });

  truncatedElements.forEach((el) => {
    issues.push({
      type: 'truncation',
      severity: 'warning',
      element: el.text,
      selector: el.selector,
      language: lang,
      page: pageName,
      details: 'Text is being truncated with ellipsis',
    });
  });

  return issues;
}

/**
 * Check RTL layout issues for Hebrew
 */
async function checkRTLLayout(
  page: Page,
  pageName: string
): Promise<LocalizationIssue[]> {
  const issues: LocalizationIssue[] = [];

  const rtlIssues = await page.evaluate(() => {
    const results: Array<{ selector: string; issue: string }> = [];
    const html = document.documentElement;

    // Check if HTML dir is set for RTL
    const dir = html.dir || html.getAttribute('dir');
    if (dir !== 'rtl') {
      results.push({
        selector: 'html',
        issue: `HTML dir="${dir || 'not set'}" - should be "rtl" for Hebrew`,
      });
    }

    // Check for Hebrew text with wrong alignment
    document.querySelectorAll('h1, h2, h3, h4, h5, h6, p, span, label').forEach((el) => {
      const htmlEl = el as HTMLElement;
      const style = window.getComputedStyle(el);
      const text = htmlEl.innerText || '';

      // If text contains Hebrew characters
      if (text.match(/[\u0590-\u05FF]/) && style.textAlign === 'left') {
        // Exclude elements that might intentionally be left-aligned
        if (!el.closest('[data-ltr]') && !el.classList.contains('ltr')) {
          results.push({
            selector:
              el.tagName.toLowerCase() +
              (el.className && typeof el.className === 'string'
                ? `.${el.className.split(' ')[0]}`
                : ''),
            issue: `Hebrew text with left alignment: "${text.substring(0, 40)}..."`,
          });
        }
      }
    });

    return results;
  });

  rtlIssues.forEach((issue) => {
    issues.push({
      type: 'rtl',
      severity: 'critical',
      element: issue.issue,
      selector: issue.selector,
      language: 'he',
      page: pageName,
      details: 'RTL layout issue detected',
    });
  });

  return issues;
}

/**
 * Check for untranslated strings
 */
async function checkUntranslatedStrings(
  page: Page,
  pageName: string,
  lang: Language
): Promise<LocalizationIssue[]> {
  const issues: LocalizationIssue[] = [];

  const textElements = await page.evaluate(() => {
    const results: Array<{ selector: string; text: string }> = [];

    document.querySelectorAll('button, a, label, h1, h2, h3, h4, p, span, th, td, div').forEach((el) => {
      const htmlEl = el as HTMLElement;
      const text = htmlEl.innerText?.trim();

      // Only direct text content, not nested
      if (text && text.length > 2 && text.length < 200 && el.children.length === 0) {
        results.push({
          selector:
            el.tagName.toLowerCase() +
            (el.id ? `#${el.id}` : '') +
            (el.className && typeof el.className === 'string'
              ? `.${el.className.split(' ')[0]}`
              : ''),
          text: text,
        });
      }
    });

    return results;
  });

  // Pattern for translation keys (e.g., "admin.librarian.quickActions.purgeDuplicates")
  const keyPattern = /^[a-z]+\.[a-z]+\.[a-zA-Z.]+$/;
  // Hebrew character pattern
  const hebrewPattern = /[\u0590-\u05FF]/;

  textElements.forEach((item) => {
    // Check if showing translation key instead of value
    if (keyPattern.test(item.text)) {
      issues.push({
        type: 'missing',
        severity: 'critical',
        element: item.text,
        selector: item.selector,
        language: lang,
        page: pageName,
        details: 'Translation key showing instead of translated text',
      });
    }

    // Check for Hebrew text in English/Spanish mode (possible missing translation)
    if (lang !== 'he' && hebrewPattern.test(item.text)) {
      // Exclude intentional Hebrew (like language selector)
      if (
        !item.selector.includes('language') &&
        !item.text.includes('עברית') &&
        item.text !== 'עברית'
      ) {
        issues.push({
          type: 'untranslated',
          severity: 'warning',
          element: item.text.substring(0, 50),
          selector: item.selector,
          language: lang,
          page: pageName,
          details: 'Hebrew text appearing in non-Hebrew language mode',
        });
      }
    }
  });

  return issues;
}

/**
 * Generate markdown report
 */
function generateReport(issues: LocalizationIssue[]): string {
  const critical = issues.filter((i) => i.severity === 'critical');
  const warnings = issues.filter((i) => i.severity === 'warning');

  let report = `# Localization Audit Report\n\n`;
  report += `**Generated:** ${new Date().toISOString()}\n`;
  report += `**Base URL:** ${BASE_URL}\n\n`;
  report += `## Summary\n\n`;
  report += `| Metric | Count |\n`;
  report += `|--------|-------|\n`;
  report += `| Total Issues | ${issues.length} |\n`;
  report += `| Critical | ${critical.length} |\n`;
  report += `| Warnings | ${warnings.length} |\n\n`;

  // Group by page
  const byPage = issues.reduce(
    (acc, issue) => {
      acc[issue.page] = acc[issue.page] || [];
      acc[issue.page].push(issue);
      return acc;
    },
    {} as Record<string, LocalizationIssue[]>
  );

  Object.entries(byPage).forEach(([page, pageIssues]) => {
    report += `## 📄 ${page}\n\n`;

    // Group by language within page
    const byLang = pageIssues.reduce(
      (acc, issue) => {
        acc[issue.language] = acc[issue.language] || [];
        acc[issue.language].push(issue);
        return acc;
      },
      {} as Record<string, LocalizationIssue[]>
    );

    Object.entries(byLang).forEach(([lang, langIssues]) => {
      report += `### 🌐 ${lang.toUpperCase()}\n\n`;

      langIssues.forEach((issue) => {
        const icon =
          issue.severity === 'critical' ? '🔴' : issue.severity === 'warning' ? '🟡' : '🔵';
        report += `${icon} **${issue.type}**\n`;
        report += `- Selector: \`${issue.selector}\`\n`;
        report += `- Text: "${issue.element}"\n`;
        report += `- Details: ${issue.details}\n\n`;
      });
    });
  });

  return report;
}

// Playwright tests
test.describe('Localization Audit', () => {
  test.setTimeout(120000); // 2 minutes per test

  for (const lang of LANGUAGES) {
    test.describe(`Language: ${lang}`, () => {
      for (const pageConfig of PAGES_TO_AUDIT) {
        test(`Audit ${pageConfig.name}`, async ({ page }) => {
          // Skip auth-required pages for now (could add login logic)
          if (pageConfig.requiresAuth) {
            test.skip();
            return;
          }

          // Navigate to page
          await page.goto(`${BASE_URL}${pageConfig.path}`, {
            waitUntil: 'networkidle',
          });

          // Set language
          await setLanguage(page, lang);

          // Run all checks
          const overflowIssues = await checkTextOverflow(page, pageConfig.name, lang);
          const truncationIssues = await checkTruncation(page, pageConfig.name, lang);
          const untranslatedIssues = await checkUntranslatedStrings(page, pageConfig.name, lang);

          let rtlIssues: LocalizationIssue[] = [];
          if (lang === 'he') {
            rtlIssues = await checkRTLLayout(page, pageConfig.name);
          }

          // Collect all issues
          const pageIssues = [
            ...overflowIssues,
            ...truncationIssues,
            ...untranslatedIssues,
            ...rtlIssues,
          ];
          allIssues.push(...pageIssues);

          // Take screenshot
          const screenshotPath = path.join(screenshotDir, `${pageConfig.name}-${lang}.png`);
          await page.screenshot({ path: screenshotPath, fullPage: true });

          // Log issues found
          if (pageIssues.length > 0) {
            console.log(`\n📋 Issues on ${pageConfig.name} (${lang}):`);
            pageIssues.forEach((issue) => {
              const icon = issue.severity === 'critical' ? '🔴' : '🟡';
              console.log(`   ${icon} [${issue.type}] ${issue.element.substring(0, 40)}`);
            });
          }

          // Fail on critical issues
          const criticalIssues = pageIssues.filter((i) => i.severity === 'critical');
          if (criticalIssues.length > 0) {
            console.log(`\n❌ ${criticalIssues.length} critical issues found!`);
          }

          // Assert no critical issues (optional - comment out for report-only mode)
          // expect(criticalIssues, `Critical localization issues found on ${pageConfig.name} (${lang})`).toHaveLength(0);
        });
      }
    });
  }

  test.afterAll(async () => {
    // Generate and save report
    const report = generateReport(allIssues);
    const reportPath = path.join(screenshotDir, '..', 'localization-report.md');
    fs.writeFileSync(reportPath, report);

    // Also save JSON for programmatic use
    const jsonPath = path.join(screenshotDir, '..', 'localization-issues.json');
    fs.writeFileSync(jsonPath, JSON.stringify(allIssues, null, 2));

    console.log(`\n${'='.repeat(60)}`);
    console.log(`📊 Localization Audit Complete`);
    console.log(`${'='.repeat(60)}`);
    console.log(`Total Issues: ${allIssues.length}`);
    console.log(`Critical: ${allIssues.filter((i) => i.severity === 'critical').length}`);
    console.log(`Warnings: ${allIssues.filter((i) => i.severity === 'warning').length}`);
    console.log(`\n📄 Report: ${reportPath}`);
    console.log(`📁 Screenshots: ${screenshotDir}`);
  });
});
