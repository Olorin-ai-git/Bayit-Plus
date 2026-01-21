/**
 * Accessibility Testing Engine
 * Comprehensive accessibility testing framework with WCAG 2.1 compliance
 * Includes axe-core integration, screen reader simulation, and keyboard navigation testing
 */

import { Page, Locator } from '@playwright/test';
import { AxeResults, Result as AxeResult } from 'axe-core';

export interface AccessibilityConfig {
  wcagLevel: 'A' | 'AA' | 'AAA';
  tags: string[];
  rules: Record<string, { enabled: boolean }>;
  context: {
    include?: string[];
    exclude?: string[];
  };
  options: {
    runOnly?: string[];
    reporter?: 'v1' | 'v2';
  };
}

export interface AccessibilityViolation {
  id: string;
  impact: 'minor' | 'moderate' | 'serious' | 'critical';
  tags: string[];
  description: string;
  help: string;
  helpUrl: string;
  nodes: Array<{
    target: string[];
    html: string;
    failureSummary: string;
    element: string;
  }>;
}

export interface KeyboardNavigationResult {
  focusableElements: number;
  focusTraps: string[];
  skipLinks: string[];
  tabOrder: Array<{
    element: string;
    tabIndex: number;
    visible: boolean;
    accessible: boolean;
  }>;
  violations: string[];
}

export interface ScreenReaderResult {
  landmarks: Array<{
    role: string;
    label: string;
    element: string;
  }>;
  headings: Array<{
    level: number;
    text: string;
    element: string;
  }>;
  ariaLabels: Array<{
    element: string;
    label: string;
    type: 'aria-label' | 'aria-labelledby' | 'aria-describedby';
  }>;
  violations: string[];
}

export interface ColorContrastResult {
  violations: Array<{
    element: string;
    foreground: string;
    background: string;
    ratio: number;
    minimumRatio: number;
    level: 'AA' | 'AAA';
    size: 'normal' | 'large';
  }>;
  passed: number;
  failed: number;
}

export interface AccessibilityTestResult {
  serviceName: string;
  url: string;
  timestamp: string;
  wcagLevel: 'A' | 'AA' | 'AAA';

  // axe-core results
  axeResults: AxeResults;
  violations: AccessibilityViolation[];

  // Detailed testing results
  keyboardNavigation: KeyboardNavigationResult;
  screenReader: ScreenReaderResult;
  colorContrast: ColorContrastResult;

  // Summary metrics
  totalIssues: number;
  criticalIssues: number;
  complianceScore: number;

  // Recommendations
  recommendations: Array<{
    priority: 'high' | 'medium' | 'low';
    category: string;
    description: string;
    elements?: string[];
  }>;
}

export class AccessibilityTestEngine {
  private page: Page;
  private config: AccessibilityConfig;

  constructor(page: Page, config: Partial<AccessibilityConfig> = {}) {
    this.page = page;
    this.config = {
      wcagLevel: 'AA',
      tags: ['wcag2a', 'wcag2aa', 'wcag21aa'],
      rules: {},
      context: {},
      options: {
        reporter: 'v2'
      },
      ...config
    };
  }

  async runAccessibilityAudit(serviceName: string, url: string): Promise<AccessibilityTestResult> {
    console.log(`🔍 Running accessibility audit for ${serviceName}...`);

    await this.page.goto(url);
    await this.page.waitForLoadState('networkidle');

    // Wait for service-specific content to load
    await this.waitForServiceReady(serviceName);

    // Run axe-core analysis
    const axeResults = await this.runAxeCoreAnalysis();

    // Run detailed accessibility tests
    const keyboardNavigation = await this.testKeyboardNavigation();
    const screenReader = await this.testScreenReaderAccessibility();
    const colorContrast = await this.testColorContrast();

    // Process violations
    const violations = this.processAxeViolations(axeResults.violations || []);

    // Calculate metrics
    const totalIssues = violations.length + keyboardNavigation.violations.length +
                       screenReader.violations.length + colorContrast.failed;
    const criticalIssues = violations.filter(v => v.impact === 'critical' || v.impact === 'serious').length;
    const complianceScore = this.calculateComplianceScore(axeResults, totalIssues);

    // Generate recommendations
    const recommendations = this.generateRecommendations(violations, keyboardNavigation, screenReader, colorContrast);

    return {
      serviceName,
      url,
      timestamp: new Date().toISOString(),
      wcagLevel: this.config.wcagLevel,
      axeResults,
      violations,
      keyboardNavigation,
      screenReader,
      colorContrast,
      totalIssues,
      criticalIssues,
      complianceScore,
      recommendations
    };
  }

  private async runAxeCoreAnalysis(): Promise<AxeResults> {
    // Inject axe-core into the page
    await this.page.addScriptTag({
      url: 'https://cdnjs.cloudflare.com/ajax/libs/axe-core/4.8.2/axe.min.js'
    });

    // Wait for axe to load
    await this.page.waitForFunction(() => typeof window.axe !== 'undefined');

    // Run axe analysis
    const results = await this.page.evaluate((config) => {
      return window.axe.run(document, {
        tags: config.tags,
        rules: config.rules,
        ...config.options
      });
    }, this.config);

    return results;
  }

  private async testKeyboardNavigation(): Promise<KeyboardNavigationResult> {
    const result: KeyboardNavigationResult = {
      focusableElements: 0,
      focusTraps: [],
      skipLinks: [],
      tabOrder: [],
      violations: []
    };

    // Get all focusable elements
    const focusableElements = await this.page.$$eval(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      elements => elements.map((el, index) => ({
        tagName: el.tagName.toLowerCase(),
        tabIndex: el.tabIndex,
        visible: !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length),
        accessible: !el.hasAttribute('disabled') && el.getAttribute('aria-hidden') !== 'true',
        selector: el.tagName.toLowerCase() + (el.id ? '#' + el.id : '') +
                 (el.className ? '.' + el.className.split(' ').join('.') : ''),
        text: el.textContent?.trim().substring(0, 50) || '',
        ariaLabel: el.getAttribute('aria-label') || el.getAttribute('aria-labelledby') || ''
      }))
    );

    result.focusableElements = focusableElements.filter(el => el.visible && el.accessible).length;
    result.tabOrder = focusableElements.map((el, index) => ({
      element: el.selector,
      tabIndex: el.tabIndex,
      visible: el.visible,
      accessible: el.accessible
    }));

    // Test keyboard navigation
    await this.page.keyboard.press('Tab');

    let currentFocusIndex = 0;
    const maxTabs = Math.min(focusableElements.length, 20); // Limit to prevent infinite loops

    for (let i = 0; i < maxTabs; i++) {
      const focusedElement = await this.page.evaluate(() => {
        const el = document.activeElement;
        return el ? {
          tagName: el.tagName.toLowerCase(),
          id: el.id,
          className: el.className,
          visible: !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length)
        } : null;
      });

      if (!focusedElement?.visible) {
        result.violations.push(`Tab stop ${i + 1}: Focus landed on invisible element`);
      }

      await this.page.keyboard.press('Tab');
    }

    // Test for skip links
    await this.page.keyboard.press('Home');
    const skipLinks = await this.page.$$eval(
      'a[href^="#"], a[class*="skip"]',
      elements => elements.map(el => el.textContent?.trim() || '').filter(text => text.length > 0)
    );
    result.skipLinks = skipLinks;

    // Check for focus traps in modals/dialogs
    const modals = await this.page.$$('[role="dialog"], [role="alertdialog"], .modal');
    for (const modal of modals) {
      const isVisible = await modal.isVisible();
      if (isVisible) {
        const modalFocusable = await modal.$$eval(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
          elements => elements.length
        );
        if (modalFocusable > 0) {
          result.focusTraps.push(await modal.getAttribute('class') || 'modal');
        }
      }
    }

    // Validate tab order logic
    const tabIndexValues = result.tabOrder.filter(el => el.visible && el.accessible)
                                         .map(el => el.tabIndex);
    const hasLogicalTabOrder = tabIndexValues.every((val, i, arr) =>
      i === 0 || val === 0 || val >= arr[i - 1]
    );

    if (!hasLogicalTabOrder) {
      result.violations.push('Tab order is not logical - custom tabindex values disrupt natural flow');
    }

    return result;
  }

  private async testScreenReaderAccessibility(): Promise<ScreenReaderResult> {
    const result: ScreenReaderResult = {
      landmarks: [],
      headings: [],
      ariaLabels: [],
      violations: []
    };

    // Test landmarks
    const landmarks = await this.page.$$eval(
      '[role="banner"], [role="navigation"], [role="main"], [role="complementary"], [role="contentinfo"], header, nav, main, aside, footer',
      elements => elements.map(el => ({
        role: el.getAttribute('role') || el.tagName.toLowerCase(),
        label: el.getAttribute('aria-label') || el.getAttribute('aria-labelledby') || '',
        element: el.tagName.toLowerCase() + (el.id ? '#' + el.id : '')
      }))
    );
    result.landmarks = landmarks;

    // Validate landmark structure
    const hasMain = landmarks.some(l => l.role === 'main');
    if (!hasMain) {
      result.violations.push('Missing main landmark - page should have exactly one main content area');
    }

    const mainCount = landmarks.filter(l => l.role === 'main').length;
    if (mainCount > 1) {
      result.violations.push(`Multiple main landmarks found (${mainCount}) - should have exactly one`);
    }

    // Test heading structure
    const headings = await this.page.$$eval(
      'h1, h2, h3, h4, h5, h6, [role="heading"]',
      elements => elements.map(el => ({
        level: el.tagName.startsWith('H') ? parseInt(el.tagName.slice(1)) :
               parseInt(el.getAttribute('aria-level') || '1'),
        text: el.textContent?.trim().substring(0, 100) || '',
        element: el.tagName.toLowerCase() + (el.id ? '#' + el.id : '')
      }))
    );
    result.headings = headings.sort((a, b) => a.level - b.level);

    // Validate heading hierarchy
    if (headings.length === 0) {
      result.violations.push('No headings found - page should have a clear heading structure');
    } else {
      const h1Count = headings.filter(h => h.level === 1).length;
      if (h1Count === 0) {
        result.violations.push('Missing h1 element - page should start with exactly one h1');
      } else if (h1Count > 1) {
        result.violations.push(`Multiple h1 elements found (${h1Count}) - should have exactly one`);
      }

      // Check for skipped heading levels
      for (let i = 1; i < headings.length; i++) {
        const current = headings[i];
        const previous = headings[i - 1];
        if (current.level > previous.level + 1) {
          result.violations.push(
            `Heading level skipped from h${previous.level} to h${current.level} - should be sequential`
          );
        }
      }
    }

    // Test ARIA labels
    const ariaLabels = await this.page.$$eval(
      '[aria-label], [aria-labelledby], [aria-describedby]',
      elements => elements.map(el => {
        const label = el.getAttribute('aria-label');
        const labelledby = el.getAttribute('aria-labelledby');
        const describedby = el.getAttribute('aria-describedby');

        return {
          element: el.tagName.toLowerCase() + (el.id ? '#' + el.id : ''),
          label: label || labelledby || describedby || '',
          type: label ? 'aria-label' : labelledby ? 'aria-labelledby' : 'aria-describedby'
        };
      }).filter(item => item.label.length > 0)
    );
    result.ariaLabels = ariaLabels;

    // Test for images without alt text
    const imagesWithoutAlt = await this.page.$$eval(
      'img:not([alt]), img[alt=""]',
      elements => elements.length
    );
    if (imagesWithoutAlt > 0) {
      result.violations.push(`${imagesWithoutAlt} images without alt text - all images need descriptive alt attributes`);
    }

    // Test for form controls without labels
    const unlabeledInputs = await this.page.$$eval(
      'input:not([type="hidden"]):not([aria-label]):not([aria-labelledby]), select:not([aria-label]):not([aria-labelledby]), textarea:not([aria-label]):not([aria-labelledby])',
      elements => elements.filter(el => {
        // Check if there's an associated label
        const id = el.getAttribute('id');
        if (id) {
          const label = document.querySelector(`label[for="${id}"]`);
          return !label;
        }
        return true;
      }).length
    );
    if (unlabeledInputs > 0) {
      result.violations.push(`${unlabeledInputs} form controls without labels - all inputs need accessible labels`);
    }

    return result;
  }

  private async testColorContrast(): Promise<ColorContrastResult> {
    const result: ColorContrastResult = {
      violations: [],
      passed: 0,
      failed: 0
    };

    // Get all text elements for color contrast testing
    const textElements = await this.page.$$eval(
      'p, span, div, h1, h2, h3, h4, h5, h6, a, button, label, li, td, th',
      elements => elements.map(el => {
        const styles = window.getComputedStyle(el);
        const rect = el.getBoundingClientRect();

        return {
          text: el.textContent?.trim().substring(0, 50) || '',
          color: styles.color,
          backgroundColor: styles.backgroundColor,
          fontSize: parseFloat(styles.fontSize),
          fontWeight: styles.fontWeight,
          visible: rect.width > 0 && rect.height > 0,
          selector: el.tagName.toLowerCase() + (el.id ? '#' + el.id : '') +
                   (el.className ? '.' + el.className.split(' ').slice(0, 2).join('.') : '')
        };
      }).filter(el => el.visible && el.text.length > 0)
    );

    for (const element of textElements) {
      // Skip if no contrast can be calculated (transparent backgrounds, etc.)
      if (element.backgroundColor === 'rgba(0, 0, 0, 0)' ||
          element.backgroundColor === 'transparent' ||
          element.color === element.backgroundColor) {
        continue;
      }

      const contrastRatio = this.calculateContrastRatio(element.color, element.backgroundColor);
      const isLargeText = element.fontSize >= 18 ||
                         (element.fontSize >= 14 && (element.fontWeight === 'bold' || parseInt(element.fontWeight) >= 700));

      // WCAG AA requirements
      const requiredRatio = isLargeText ? 3 : 4.5;
      const level = 'AA';

      if (contrastRatio < requiredRatio) {
        result.violations.push({
          element: element.selector,
          foreground: element.color,
          background: element.backgroundColor,
          ratio: contrastRatio,
          minimumRatio: requiredRatio,
          level,
          size: isLargeText ? 'large' : 'normal'
        });
        result.failed++;
      } else {
        result.passed++;
      }
    }

    return result;
  }

  private calculateContrastRatio(foreground: string, background: string): number {
    // Simplified contrast ratio calculation
    // In a real implementation, you would use a proper color parsing library
    const parseColor = (color: string) => {
      if (color.startsWith('rgb')) {
        const match = color.match(/\d+/g);
        return match ? match.map(Number) : [0, 0, 0];
      }
      return [0, 0, 0]; // Fallback
    };

    const getLuminance = (rgb: number[]) => {
      const [r, g, b] = rgb.map(c => {
        const sRGB = c / 255;
        return sRGB <= 0.03928 ? sRGB / 12.92 : Math.pow((sRGB + 0.055) / 1.055, 2.4);
      });
      return 0.2126 * r + 0.7152 * g + 0.0722 * b;
    };

    const fgLuminance = getLuminance(parseColor(foreground));
    const bgLuminance = getLuminance(parseColor(background));

    const lighter = Math.max(fgLuminance, bgLuminance);
    const darker = Math.min(fgLuminance, bgLuminance);

    return (lighter + 0.05) / (darker + 0.05);
  }

  private processAxeViolations(violations: AxeResult[]): AccessibilityViolation[] {
    return violations.map(violation => ({
      id: violation.id,
      impact: violation.impact as 'minor' | 'moderate' | 'serious' | 'critical',
      tags: violation.tags,
      description: violation.description,
      help: violation.help,
      helpUrl: violation.helpUrl,
      nodes: violation.nodes.map(node => ({
        target: node.target,
        html: node.html,
        failureSummary: node.failureSummary || '',
        element: node.target.join(' ')
      }))
    }));
  }

  private calculateComplianceScore(axeResults: AxeResults, totalIssues: number): number {
    const totalTests = (axeResults.passes?.length || 0) + (axeResults.violations?.length || 0);
    const passedTests = axeResults.passes?.length || 0;

    if (totalTests === 0) return 0;

    // Base score from axe-core results
    const axeScore = (passedTests / totalTests) * 100;

    // Reduce score based on additional issues found
    const issueDeduction = Math.min(totalIssues * 2, 30); // Max 30 point deduction

    return Math.max(0, Math.round(axeScore - issueDeduction));
  }

  private generateRecommendations(
    violations: AccessibilityViolation[],
    keyboardNav: KeyboardNavigationResult,
    screenReader: ScreenReaderResult,
    colorContrast: ColorContrastResult
  ): Array<{ priority: 'high' | 'medium' | 'low'; category: string; description: string; elements?: string[] }> {
    const recommendations: Array<{ priority: 'high' | 'medium' | 'low'; category: string; description: string; elements?: string[] }> = [];

    // Critical and serious axe violations
    const criticalViolations = violations.filter(v => v.impact === 'critical' || v.impact === 'serious');
    if (criticalViolations.length > 0) {
      recommendations.push({
        priority: 'high',
        category: 'WCAG Compliance',
        description: `Fix ${criticalViolations.length} critical accessibility violations`,
        elements: criticalViolations.map(v => v.id)
      });
    }

    // Keyboard navigation issues
    if (keyboardNav.violations.length > 0) {
      recommendations.push({
        priority: 'high',
        category: 'Keyboard Navigation',
        description: 'Ensure all interactive elements are keyboard accessible',
        elements: keyboardNav.violations
      });
    }

    // Missing skip links
    if (keyboardNav.skipLinks.length === 0) {
      recommendations.push({
        priority: 'medium',
        category: 'Keyboard Navigation',
        description: 'Add skip links for keyboard users to bypass navigation'
      });
    }

    // Screen reader issues
    if (screenReader.violations.length > 0) {
      recommendations.push({
        priority: 'high',
        category: 'Screen Reader',
        description: 'Fix heading structure and landmark issues for screen readers',
        elements: screenReader.violations
      });
    }

    // Color contrast issues
    if (colorContrast.failed > 0) {
      recommendations.push({
        priority: 'medium',
        category: 'Color Contrast',
        description: `Improve color contrast for ${colorContrast.failed} text elements`,
        elements: colorContrast.violations.map(v => v.element)
      });
    }

    // Moderate violations
    const moderateViolations = violations.filter(v => v.impact === 'moderate');
    if (moderateViolations.length > 0) {
      recommendations.push({
        priority: 'medium',
        category: 'WCAG Compliance',
        description: `Address ${moderateViolations.length} moderate accessibility issues`,
        elements: moderateViolations.map(v => v.id)
      });
    }

    // Minor violations
    const minorViolations = violations.filter(v => v.impact === 'minor');
    if (minorViolations.length > 0) {
      recommendations.push({
        priority: 'low',
        category: 'WCAG Compliance',
        description: `Polish ${minorViolations.length} minor accessibility improvements`,
        elements: minorViolations.map(v => v.id)
      });
    }

    return recommendations.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
  }

  private async waitForServiceReady(serviceName: string): Promise<void> {
    try {
      switch (serviceName) {
        case 'autonomous-investigation':
        case 'manual-investigation':
          await this.page.waitForSelector('[data-testid="entity-input"]', { timeout: 5000 });
          break;
        case 'agent-analytics':
          await this.page.waitForSelector('[data-testid*="chart"], [data-testid*="analytics"]', { timeout: 5000 });
          break;
        case 'visualization':
          await this.page.waitForSelector('canvas, svg, [data-testid*="chart"]', { timeout: 5000 });
          break;
        case 'reporting':
          await this.page.waitForSelector('[data-testid*="report"]', { timeout: 5000 });
          break;
        default:
          await this.page.waitForSelector('main, [role="main"]', { timeout: 5000 });
      }
    } catch (error) {
      console.warn(`Service readiness check failed for ${serviceName}:`, error);
    }
  }

  async testWithScreenReaderSimulation(serviceName: string, url: string): Promise<string[]> {
    await this.page.goto(url);
    await this.page.waitForLoadState('networkidle');

    const screenReaderContent: string[] = [];

    // Simulate screen reader navigation
    const landmarks = await this.page.$$eval(
      '[role="banner"], [role="navigation"], [role="main"], [role="complementary"], [role="contentinfo"]',
      elements => elements.map(el => ({
        role: el.getAttribute('role'),
        label: el.getAttribute('aria-label') || 'unlabeled ' + el.getAttribute('role'),
        text: el.textContent?.trim().substring(0, 100) || ''
      }))
    );

    screenReaderContent.push('=== LANDMARKS ===');
    landmarks.forEach(landmark => {
      screenReaderContent.push(`${landmark.role}: ${landmark.label}`);
    });

    // Get heading structure
    const headings = await this.page.$$eval(
      'h1, h2, h3, h4, h5, h6',
      elements => elements.map(el => ({
        level: parseInt(el.tagName.slice(1)),
        text: el.textContent?.trim() || ''
      }))
    );

    screenReaderContent.push('\n=== HEADINGS ===');
    headings.forEach(heading => {
      screenReaderContent.push(`H${heading.level}: ${heading.text}`);
    });

    return screenReaderContent;
  }

  generateAccessibilityReport(results: AccessibilityTestResult[]): string {
    const timestamp = new Date().toISOString();
    const totalServices = results.length;
    const avgComplianceScore = results.reduce((sum, r) => sum + r.complianceScore, 0) / totalServices;
    const totalViolations = results.reduce((sum, r) => sum + r.totalIssues, 0);
    const criticalViolations = results.reduce((sum, r) => sum + r.criticalIssues, 0);

    const reportHtml = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Accessibility Test Report</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; background: #f5f5f5; }
          .container { max-width: 1200px; margin: 0 auto; background: white; padding: 20px; border-radius: 8px; }
          .header { text-align: center; margin-bottom: 30px; }
          .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin: 20px 0; }
          .summary-card { background: #f9f9f9; border: 1px solid #ddd; padding: 15px; border-radius: 8px; text-align: center; }
          .score { font-size: 2em; font-weight: bold; }
          .score.excellent { color: #059669; }
          .score.good { color: #0891b2; }
          .score.fair { color: #d97706; }
          .score.poor { color: #dc2626; }
          .service-results { margin: 30px 0; }
          .service-card { background: #f9f9f9; border: 1px solid #ddd; padding: 20px; margin: 10px 0; border-radius: 8px; }
          .violations { background: #fef2f2; border: 1px solid #fecaca; padding: 15px; border-radius: 4px; margin: 10px 0; }
          .violation-item { margin: 10px 0; padding: 10px; background: white; border-radius: 4px; }
          .critical { border-left: 4px solid #dc2626; }
          .serious { border-left: 4px solid #ea580c; }
          .moderate { border-left: 4px solid #d97706; }
          .minor { border-left: 4px solid #0891b2; }
          .recommendations { background: #f0f9ff; border: 1px solid #bae6fd; padding: 15px; border-radius: 4px; margin: 15px 0; }
          .high-priority { background: #fef2f2; border-color: #fecaca; }
          .medium-priority { background: #fffbeb; border-color: #fed7aa; }
          .low-priority { background: #f0fdf4; border-color: #bbf7d0; }
          table { width: 100%; border-collapse: collapse; margin: 15px 0; }
          th, td { padding: 8px; text-align: left; border-bottom: 1px solid #ddd; }
          th { background-color: #f2f2f2; }
          .chart { width: 100%; height: 400px; margin: 20px 0; }
        </style>
        <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>♿ Accessibility Test Report</h1>
            <p>Generated: ${timestamp}</p>
            <p>WCAG 2.1 AA Compliance Testing</p>
          </div>

          <div class="summary">
            <div class="summary-card">
              <div class="score ${avgComplianceScore >= 90 ? 'excellent' : avgComplianceScore >= 75 ? 'good' : avgComplianceScore >= 60 ? 'fair' : 'poor'}">${Math.round(avgComplianceScore)}%</div>
              <div>Average Compliance</div>
            </div>
            <div class="summary-card">
              <div class="score">${totalServices}</div>
              <div>Services Tested</div>
            </div>
            <div class="summary-card">
              <div class="score ${criticalViolations === 0 ? 'excellent' : criticalViolations <= 5 ? 'good' : 'poor'}">${criticalViolations}</div>
              <div>Critical Issues</div>
            </div>
            <div class="summary-card">
              <div class="score">${totalViolations}</div>
              <div>Total Issues</div>
            </div>
          </div>

          <div class="service-results">
            <h2>Service Accessibility Results</h2>
            ${results.map(result => `
              <div class="service-card">
                <h3>${result.serviceName}</h3>
                <div class="score ${result.complianceScore >= 90 ? 'excellent' : result.complianceScore >= 75 ? 'good' : result.complianceScore >= 60 ? 'fair' : 'poor'}">
                  Compliance Score: ${result.complianceScore}%
                </div>
                <p>Total Issues: ${result.totalIssues} | Critical: ${result.criticalIssues}</p>

                ${result.violations.length > 0 ? `
                <div class="violations">
                  <h4>WCAG Violations</h4>
                  ${result.violations.slice(0, 10).map(violation => `
                    <div class="violation-item ${violation.impact}">
                      <strong>${violation.id}</strong> (${violation.impact})<br>
                      ${violation.description}<br>
                      <small>Affects ${violation.nodes.length} element(s)</small>
                    </div>
                  `).join('')}
                  ${result.violations.length > 10 ? `<p>... and ${result.violations.length - 10} more violations</p>` : ''}
                </div>
                ` : ''}

                <h4>Accessibility Metrics</h4>
                <table>
                  <tr><th>Category</th><th>Result</th><th>Status</th></tr>
                  <tr><td>Focusable Elements</td><td>${result.keyboardNavigation.focusableElements}</td><td>${result.keyboardNavigation.focusableElements > 0 ? '✅' : '❌'}</td></tr>
                  <tr><td>Skip Links</td><td>${result.keyboardNavigation.skipLinks.length}</td><td>${result.keyboardNavigation.skipLinks.length > 0 ? '✅' : '⚠️'}</td></tr>
                  <tr><td>Landmarks</td><td>${result.screenReader.landmarks.length}</td><td>${result.screenReader.landmarks.length > 0 ? '✅' : '❌'}</td></tr>
                  <tr><td>Heading Structure</td><td>${result.screenReader.headings.length} headings</td><td>${result.screenReader.headings.length > 0 ? '✅' : '❌'}</td></tr>
                  <tr><td>Color Contrast</td><td>${result.colorContrast.passed} passed, ${result.colorContrast.failed} failed</td><td>${result.colorContrast.failed === 0 ? '✅' : '❌'}</td></tr>
                </table>

                ${result.recommendations.length > 0 ? `
                <h4>Recommendations</h4>
                ${result.recommendations.slice(0, 5).map(rec => `
                  <div class="recommendations ${rec.priority}-priority">
                    <strong>${rec.priority.toUpperCase()} PRIORITY - ${rec.category}</strong><br>
                    ${rec.description}
                  </div>
                `).join('')}
                ` : ''}
              </div>
            `).join('')}
          </div>

          <div class="chart">
            <canvas id="complianceChart"></canvas>
          </div>
        </div>

        <script>
          const ctx = document.getElementById('complianceChart').getContext('2d');
          new Chart(ctx, {
            type: 'bar',
            data: {
              labels: ${JSON.stringify(results.map(r => r.serviceName))},
              datasets: [{
                label: 'Compliance Score (%)',
                data: ${JSON.stringify(results.map(r => r.complianceScore))},
                backgroundColor: ${JSON.stringify(results.map(r =>
                  r.complianceScore >= 90 ? '#059669' :
                  r.complianceScore >= 75 ? '#0891b2' :
                  r.complianceScore >= 60 ? '#d97706' : '#dc2626'
                ))},
                borderWidth: 1
              }]
            },
            options: {
              responsive: true,
              scales: {
                y: {
                  beginAtZero: true,
                  max: 100
                }
              },
              plugins: {
                title: {
                  display: true,
                  text: 'WCAG 2.1 AA Compliance Scores by Service'
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
}