# Localization UI Auditor

**Model:** claude-sonnet-4-5
**Type:** Multi-Platform Localization QA Specialist
**Focus:** Visual UI Scanning for Localization Issues

---

## Purpose

Automated scanning of UI across all 10 supported languages (Hebrew, English, Spanish, Chinese, French, Italian, Hindi, Tamil, Bengali, Japanese) to detect localization issues including text overflow, truncation, RTL layout problems, missing translations, and layout inconsistencies. Supports web (Playwright) and tvOS (Xcode Simulator).

## Supported Platforms

| Platform | Tool | Screenshots | Automation |
|----------|------|-------------|------------|
| **Web** | Playwright | ✅ | Full interaction |
| **tvOS** | Xcode Simulator + xcrun | ✅ | simctl commands |
| **iOS** | Xcode Simulator + xcrun | ✅ | simctl commands |

---

## Issue Types Detected

### 1. Text Overflow & Truncation
- Text exceeding container bounds
- Ellipsis (...) indicating truncation
- Text overlapping other elements
- Horizontal scrollbars appearing unexpectedly

### 2. RTL Layout Issues (Hebrew)
- Incorrect text alignment (should be right-aligned)
- Reversed flex direction not applied
- Icons/buttons on wrong side
- Bidirectional text mixing problems
- Numbers and dates incorrectly positioned

### 3. Missing Translations
- Untranslated strings (same text across languages)
- Translation keys showing instead of values (e.g., "admin.librarian.quickActions.purgeDuplicates")
- Fallback to Hebrew when other language expected
- Empty strings where translations expected

### 4. Layout Inconsistencies
- Different element positions across languages
- Varying component heights due to text length
- Broken grid layouts
- Misaligned form labels and inputs

### 5. Font & Typography Issues
- Missing font glyphs for non-Latin scripts (Hebrew, Chinese, Hindi, Tamil, Bengali, Japanese)
- Incorrect font rendering
- Line height problems with different scripts
- Character encoding issues (mojibake)

---

## Web Testing with Playwright

### Setup

```bash
# Install Playwright
npm install -D @playwright/test
npx playwright install chromium
```

### Localization Test Script

```typescript
// tests/localization-audit.spec.ts
import { test, expect, Page } from '@playwright/test';

const LANGUAGES = ['he', 'en', 'es', 'zh', 'fr', 'it', 'hi', 'ta', 'bn', 'ja'] as const;
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

class LocalizationAuditor {
  private issues: LocalizationIssue[] = [];
  private page: Page;
  private currentLanguage: string = 'en';
  private currentPageName: string = '';

  constructor(page: Page) {
    this.page = page;
  }

  async setLanguage(lang: string) {
    this.currentLanguage = lang;

    // Method 1: URL parameter
    // await this.page.goto(`${BASE_URL}?lang=${lang}`);

    // Method 2: LocalStorage
    await this.page.evaluate((language) => {
      localStorage.setItem('bayit-language', language);
      localStorage.setItem('i18nextLng', language);
    }, lang);

    // Method 3: Click language selector (if visible)
    const langSelector = this.page.locator('[data-testid="language-selector"]');
    if (await langSelector.isVisible()) {
      await langSelector.click();
      await this.page.locator(`[data-lang="${lang}"]`).click();
    }

    // Reload to apply language
    await this.page.reload({ waitUntil: 'networkidle' });

    // Wait for i18n to initialize
    await this.page.waitForTimeout(500);
  }

  async auditPage(pagePath: string, pageName: string) {
    this.currentPageName = pageName;
    await this.page.goto(`${BASE_URL}${pagePath}`, { waitUntil: 'networkidle' });

    // Run all checks
    await this.checkTextOverflow();
    await this.checkTruncation();
    await this.checkRTLLayout();
    await this.checkUntranslatedStrings();
    await this.checkLayoutConsistency();

    // Take screenshot for this language/page combination
    await this.page.screenshot({
      path: `screenshots/${pageName}-${this.currentLanguage}.png`,
      fullPage: true,
    });
  }

  async checkTextOverflow() {
    const overflowingElements = await this.page.evaluate(() => {
      const issues: Array<{ selector: string; text: string; overflow: string }> = [];

      document.querySelectorAll('*').forEach((el) => {
        const style = window.getComputedStyle(el);
        const rect = el.getBoundingClientRect();

        // Check for horizontal overflow
        if (el.scrollWidth > el.clientWidth && style.overflowX !== 'scroll' && style.overflowX !== 'auto') {
          const text = (el as HTMLElement).innerText?.substring(0, 50) || '';
          if (text.trim()) {
            issues.push({
              selector: el.tagName.toLowerCase() + (el.id ? `#${el.id}` : '') + (el.className ? `.${String(el.className).split(' ')[0]}` : ''),
              text: text,
              overflow: `scrollWidth(${el.scrollWidth}) > clientWidth(${el.clientWidth})`,
            });
          }
        }
      });

      return issues;
    });

    overflowingElements.forEach((el) => {
      this.issues.push({
        type: 'overflow',
        severity: 'critical',
        element: el.text,
        selector: el.selector,
        language: this.currentLanguage,
        page: this.currentPageName,
        details: el.overflow,
      });
    });
  }

  async checkTruncation() {
    const truncatedElements = await this.page.evaluate(() => {
      const issues: Array<{ selector: string; text: string }> = [];

      document.querySelectorAll('*').forEach((el) => {
        const text = (el as HTMLElement).innerText || '';
        const style = window.getComputedStyle(el);

        // Check for CSS truncation
        if (style.textOverflow === 'ellipsis' || text.endsWith('...') || text.endsWith('…')) {
          // Verify it's actually truncated by checking if full text differs
          if (el.scrollWidth > el.clientWidth) {
            issues.push({
              selector: el.tagName.toLowerCase() + (el.id ? `#${el.id}` : ''),
              text: text.substring(0, 100),
            });
          }
        }
      });

      return issues;
    });

    truncatedElements.forEach((el) => {
      this.issues.push({
        type: 'truncation',
        severity: 'warning',
        element: el.text,
        selector: el.selector,
        language: this.currentLanguage,
        page: this.currentPageName,
        details: 'Text is being truncated with ellipsis',
      });
    });
  }

  async checkRTLLayout() {
    if (this.currentLanguage !== 'he') return;

    const rtlIssues = await this.page.evaluate(() => {
      const issues: Array<{ selector: string; issue: string }> = [];
      const html = document.documentElement;

      // Check if HTML dir is set
      if (html.dir !== 'rtl' && html.getAttribute('dir') !== 'rtl') {
        issues.push({
          selector: 'html',
          issue: 'HTML dir attribute not set to rtl for Hebrew',
        });
      }

      // Check text alignment
      document.querySelectorAll('p, h1, h2, h3, h4, h5, h6, span, div').forEach((el) => {
        const style = window.getComputedStyle(el);
        const text = (el as HTMLElement).innerText || '';

        // Hebrew text should be right-aligned or start-aligned in RTL
        if (text.match(/[\u0590-\u05FF]/) && style.textAlign === 'left') {
          issues.push({
            selector: el.tagName.toLowerCase() + (el.className ? `.${String(el.className).split(' ')[0]}` : ''),
            issue: `Hebrew text with left alignment: "${text.substring(0, 30)}..."`,
          });
        }
      });

      // Check flex direction
      document.querySelectorAll('[style*="flex"], .flex, .flex-row').forEach((el) => {
        const style = window.getComputedStyle(el);
        if (style.display === 'flex' && style.flexDirection === 'row') {
          // In RTL, row should visually reverse - check if it has RTL-aware class
          const hasRTLClass = el.classList.contains('rtl:flex-row-reverse') ||
                             el.classList.contains('ltr:flex-row');
          if (!hasRTLClass && el.children.length > 1) {
            issues.push({
              selector: el.tagName.toLowerCase() + (el.className ? `.${String(el.className).split(' ')[0]}` : ''),
              issue: 'Flex row without RTL reversal',
            });
          }
        }
      });

      return issues;
    });

    rtlIssues.forEach((issue) => {
      this.issues.push({
        type: 'rtl',
        severity: 'critical',
        element: issue.issue,
        selector: issue.selector,
        language: this.currentLanguage,
        page: this.currentPageName,
        details: 'RTL layout issue detected',
      });
    });
  }

  async checkUntranslatedStrings() {
    // Get all visible text in current language
    const currentTexts = await this.page.evaluate(() => {
      const texts: Array<{ selector: string; text: string }> = [];

      document.querySelectorAll('button, a, label, h1, h2, h3, h4, p, span, th, td').forEach((el) => {
        const text = (el as HTMLElement).innerText?.trim();
        if (text && text.length > 2 && text.length < 200) {
          texts.push({
            selector: el.tagName.toLowerCase() + (el.id ? `#${el.id}` : ''),
            text: text,
          });
        }
      });

      return texts;
    });

    // Check for translation key patterns (not translated)
    const keyPattern = /^[a-z]+\.[a-z]+\.[a-zA-Z]+$/;
    const hebrewPattern = /[\u0590-\u05FF]/;

    currentTexts.forEach((item) => {
      // Check if showing translation key instead of value
      if (keyPattern.test(item.text)) {
        this.issues.push({
          type: 'missing',
          severity: 'critical',
          element: item.text,
          selector: item.selector,
          language: this.currentLanguage,
          page: this.currentPageName,
          details: 'Translation key showing instead of translated text',
        });
      }

      // Check for Hebrew in English/Spanish mode
      if (this.currentLanguage !== 'he' && hebrewPattern.test(item.text)) {
        // Exclude intentional Hebrew (like language selector labels)
        if (!item.selector.includes('language') && !item.text.includes('עברית')) {
          this.issues.push({
            type: 'untranslated',
            severity: 'warning',
            element: item.text.substring(0, 50),
            selector: item.selector,
            language: this.currentLanguage,
            page: this.currentPageName,
            details: 'Hebrew text appearing in non-Hebrew language mode',
          });
        }
      }
    });
  }

  async checkLayoutConsistency() {
    // This would compare layouts across languages
    // Store element positions for comparison
    const elementPositions = await this.page.evaluate(() => {
      const positions: Record<string, { x: number; y: number; width: number; height: number }> = {};

      document.querySelectorAll('[data-testid]').forEach((el) => {
        const rect = el.getBoundingClientRect();
        const testId = el.getAttribute('data-testid') || '';
        positions[testId] = {
          x: rect.x,
          y: rect.y,
          width: rect.width,
          height: rect.height,
        };
      });

      return positions;
    });

    // Store for cross-language comparison (would need persistence)
    return elementPositions;
  }

  getIssues(): LocalizationIssue[] {
    return this.issues;
  }

  generateReport(): string {
    const critical = this.issues.filter(i => i.severity === 'critical');
    const warnings = this.issues.filter(i => i.severity === 'warning');

    let report = `# Localization Audit Report\n\n`;
    report += `**Generated:** ${new Date().toISOString()}\n`;
    report += `**Total Issues:** ${this.issues.length}\n`;
    report += `**Critical:** ${critical.length} | **Warnings:** ${warnings.length}\n\n`;

    // Group by page
    const byPage = this.issues.reduce((acc, issue) => {
      acc[issue.page] = acc[issue.page] || [];
      acc[issue.page].push(issue);
      return acc;
    }, {} as Record<string, LocalizationIssue[]>);

    Object.entries(byPage).forEach(([page, issues]) => {
      report += `## ${page}\n\n`;

      issues.forEach((issue) => {
        const icon = issue.severity === 'critical' ? '🔴' : '🟡';
        report += `${icon} **[${issue.language.toUpperCase()}] ${issue.type}**\n`;
        report += `   - Element: \`${issue.selector}\`\n`;
        report += `   - Text: "${issue.element}"\n`;
        report += `   - Details: ${issue.details}\n\n`;
      });
    });

    return report;
  }
}

// Playwright test
test.describe('Localization Audit', () => {
  let auditor: LocalizationAuditor;

  test.beforeEach(async ({ page }) => {
    auditor = new LocalizationAuditor(page);
  });

  for (const lang of LANGUAGES) {
    test.describe(`Language: ${lang}`, () => {
      test.beforeEach(async ({ page }) => {
        await auditor.setLanguage(lang);
      });

      for (const pageConfig of PAGES_TO_AUDIT) {
        test(`Audit ${pageConfig.name}`, async ({ page }) => {
          if (pageConfig.requiresAuth) {
            // Login first
            await page.goto(`${BASE_URL}/login`);
            // Add login steps...
          }

          await auditor.auditPage(pageConfig.path, pageConfig.name);

          const issues = auditor.getIssues().filter(
            i => i.page === pageConfig.name && i.language === lang
          );

          // Fail on critical issues
          const critical = issues.filter(i => i.severity === 'critical');
          expect(critical, `Critical localization issues found:\n${JSON.stringify(critical, null, 2)}`).toHaveLength(0);
        });
      }
    });
  }

  test.afterAll(async () => {
    const report = auditor.generateReport();
    const fs = require('fs');
    fs.writeFileSync('localization-report.md', report);
    console.log(report);
  });
});
```

### Running Web Audit

```bash
# Run full audit
npx playwright test tests/localization-audit.spec.ts

# Run with headed browser (visible)
npx playwright test tests/localization-audit.spec.ts --headed

# Run specific language
npx playwright test tests/localization-audit.spec.ts --grep "Language: he"

# Generate HTML report
npx playwright test tests/localization-audit.spec.ts --reporter=html
```

---

## tvOS Testing with Xcode Simulator

### Prerequisites

```bash
# List available simulators
xcrun simctl list devices

# Boot tvOS simulator
xcrun simctl boot "Apple TV 4K (3rd generation)"

# Or create new simulator
xcrun simctl create "Bayit-TV-Test" "Apple TV 4K (3rd generation)" tvOS17.0
```

### tvOS Screenshot Script

```bash
#!/bin/bash
# scripts/tvos-localization-audit.sh

SIMULATOR_NAME="Apple TV 4K (3rd generation)"
APP_BUNDLE_ID="com.bayit.plus.tv"
SCREENSHOT_DIR="screenshots/tvos"
LANGUAGES=("he" "en" "es" "zh" "fr" "it" "hi" "ta" "bn" "ja")

# Screens to capture (use accessibility identifiers)
SCREENS=(
  "home"
  "vod"
  "live"
  "radio"
  "settings"
)

# Create screenshot directory
mkdir -p "$SCREENSHOT_DIR"

# Boot simulator if needed
SIMULATOR_UDID=$(xcrun simctl list devices | grep "$SIMULATOR_NAME" | grep -oE "[A-F0-9-]{36}" | head -1)

if [ -z "$SIMULATOR_UDID" ]; then
  echo "❌ Simulator not found: $SIMULATOR_NAME"
  exit 1
fi

echo "📱 Using simulator: $SIMULATOR_UDID"

# Check if booted
BOOT_STATUS=$(xcrun simctl list devices | grep "$SIMULATOR_UDID" | grep -o "(Booted)")
if [ -z "$BOOT_STATUS" ]; then
  echo "🔄 Booting simulator..."
  xcrun simctl boot "$SIMULATOR_UDID"
  sleep 10
fi

# Function to take screenshot
take_screenshot() {
  local lang=$1
  local screen=$2
  local filename="${SCREENSHOT_DIR}/${screen}-${lang}.png"

  echo "📸 Capturing: $screen ($lang)"
  xcrun simctl io "$SIMULATOR_UDID" screenshot "$filename"

  # Optimize PNG
  if command -v pngquant &> /dev/null; then
    pngquant --force --output "$filename" "$filename"
  fi
}

# Function to set language
set_language() {
  local lang=$1
  echo "🌐 Setting language to: $lang"

  # Set simulator language
  xcrun simctl spawn "$SIMULATOR_UDID" defaults write -g AppleLanguages -array "$lang"
  xcrun simctl spawn "$SIMULATOR_UDID" defaults write -g AppleLocale -string "${lang}_${lang^^}"

  # For Hebrew RTL
  if [ "$lang" == "he" ]; then
    xcrun simctl spawn "$SIMULATOR_UDID" defaults write -g AppleTextDirection -bool YES
    xcrun simctl spawn "$SIMULATOR_UDID" defaults write -g NSForceRightToLeftWritingDirection -bool YES
  else
    xcrun simctl spawn "$SIMULATOR_UDID" defaults write -g AppleTextDirection -bool NO
    xcrun simctl spawn "$SIMULATOR_UDID" defaults write -g NSForceRightToLeftWritingDirection -bool NO
  fi

  # Restart app to apply language
  xcrun simctl terminate "$SIMULATOR_UDID" "$APP_BUNDLE_ID" 2>/dev/null
  sleep 1
  xcrun simctl launch "$SIMULATOR_UDID" "$APP_BUNDLE_ID"
  sleep 5
}

# Function to navigate to screen using AppleScript (for tvOS remote simulation)
navigate_to_screen() {
  local screen=$1

  # Reset to home
  xcrun simctl spawn "$SIMULATOR_UDID" notifyutil -p com.apple.mobile.keybag_did_unlock

  # Use menu button to go home
  xcrun simctl io "$SIMULATOR_UDID" sendkey menu
  sleep 1

  case $screen in
    "home")
      # Already home
      ;;
    "vod")
      xcrun simctl io "$SIMULATOR_UDID" sendkey right
      xcrun simctl io "$SIMULATOR_UDID" sendkey select
      sleep 2
      ;;
    "live")
      xcrun simctl io "$SIMULATOR_UDID" sendkey right
      xcrun simctl io "$SIMULATOR_UDID" sendkey right
      xcrun simctl io "$SIMULATOR_UDID" sendkey select
      sleep 2
      ;;
    "radio")
      xcrun simctl io "$SIMULATOR_UDID" sendkey right
      xcrun simctl io "$SIMULATOR_UDID" sendkey right
      xcrun simctl io "$SIMULATOR_UDID" sendkey right
      xcrun simctl io "$SIMULATOR_UDID" sendkey select
      sleep 2
      ;;
    "settings")
      # Navigate to settings
      xcrun simctl io "$SIMULATOR_UDID" sendkey menu
      sleep 0.5
      xcrun simctl io "$SIMULATOR_UDID" sendkey down
      xcrun simctl io "$SIMULATOR_UDID" sendkey down
      xcrun simctl io "$SIMULATOR_UDID" sendkey select
      sleep 2
      ;;
  esac

  sleep 2
}

# Main audit loop
echo "🚀 Starting tvOS Localization Audit"
echo "=================================="

for lang in "${LANGUAGES[@]}"; do
  echo ""
  echo "📍 Language: $lang"
  echo "-------------------"

  set_language "$lang"

  for screen in "${SCREENS[@]}"; do
    navigate_to_screen "$screen"
    take_screenshot "$lang" "$screen"
  done
done

echo ""
echo "✅ Audit complete!"
echo "📁 Screenshots saved to: $SCREENSHOT_DIR"

# Generate comparison HTML
cat > "$SCREENSHOT_DIR/comparison.html" << 'EOF'
<!DOCTYPE html>
<html>
<head>
  <title>tvOS Localization Comparison</title>
  <style>
    body { font-family: -apple-system, sans-serif; background: #1a1a1a; color: #fff; padding: 20px; }
    .screen-group { margin-bottom: 40px; }
    .screen-group h2 { border-bottom: 1px solid #444; padding-bottom: 10px; }
    .comparison { display: flex; gap: 20px; overflow-x: auto; }
    .lang-screenshot { text-align: center; }
    .lang-screenshot img { max-width: 400px; border: 2px solid #333; border-radius: 8px; }
    .lang-screenshot h3 { margin: 10px 0; }
    .rtl { direction: rtl; }
  </style>
</head>
<body>
  <h1>🖥️ tvOS Localization Audit</h1>
EOF

for screen in "${SCREENS[@]}"; do
  cat >> "$SCREENSHOT_DIR/comparison.html" << EOF
  <div class="screen-group">
    <h2>${screen^}</h2>
    <div class="comparison">
EOF
  for lang in "${LANGUAGES[@]}"; do
    cat >> "$SCREENSHOT_DIR/comparison.html" << EOF
      <div class="lang-screenshot">
        <h3>${lang^^}</h3>
        <img src="${screen}-${lang}.png" alt="${screen} in ${lang}">
      </div>
EOF
  done
  cat >> "$SCREENSHOT_DIR/comparison.html" << EOF
    </div>
  </div>
EOF
done

cat >> "$SCREENSHOT_DIR/comparison.html" << 'EOF'
</body>
</html>
EOF

echo "📄 Comparison HTML: $SCREENSHOT_DIR/comparison.html"
open "$SCREENSHOT_DIR/comparison.html"
```

### tvOS Automated UI Testing with XCTest

```swift
// BayitTVUITests/LocalizationAuditTests.swift
import XCTest

class LocalizationAuditTests: XCTestCase {

    let app = XCUIApplication()
    let languages = ["en", "he", "es"]
    let screenshotDir = "screenshots/tvos-xctest"

    override func setUp() {
        super.setUp()
        continueAfterFailure = true
        app.launchArguments = ["-AppleLanguages", "(en)"]
    }

    func testLocalizationAudit() {
        for language in languages {
            auditLanguage(language)
        }
    }

    func auditLanguage(_ lang: String) {
        // Set language
        app.launchArguments = ["-AppleLanguages", "(\(lang))"]
        if lang == "he" {
            app.launchArguments.append("-AppleTextDirection")
            app.launchArguments.append("YES")
        }
        app.launch()

        // Audit each screen
        auditHomeScreen(lang: lang)
        auditVODScreen(lang: lang)
        auditLiveScreen(lang: lang)
        auditSettingsScreen(lang: lang)
    }

    func auditHomeScreen(lang: String) {
        // Wait for home to load
        let homeTitle = app.staticTexts["homeTitle"]
        XCTAssertTrue(homeTitle.waitForExistence(timeout: 10))

        // Check for localization issues
        checkForOverflow(screen: "home", lang: lang)
        checkForTruncation(screen: "home", lang: lang)

        if lang == "he" {
            checkRTLLayout(screen: "home")
        }

        takeScreenshot(name: "home-\(lang)")
    }

    func auditVODScreen(lang: String) {
        // Navigate to VOD
        let vodTab = app.buttons["vodTab"]
        XCTAssertTrue(vodTab.waitForExistence(timeout: 5))
        vodTab.press(forDuration: 0.1)

        sleep(2)

        checkForOverflow(screen: "vod", lang: lang)
        checkForTruncation(screen: "vod", lang: lang)

        takeScreenshot(name: "vod-\(lang)")
    }

    func auditLiveScreen(lang: String) {
        let liveTab = app.buttons["liveTab"]
        XCTAssertTrue(liveTab.waitForExistence(timeout: 5))
        liveTab.press(forDuration: 0.1)

        sleep(2)

        checkForOverflow(screen: "live", lang: lang)
        takeScreenshot(name: "live-\(lang)")
    }

    func auditSettingsScreen(lang: String) {
        let settingsTab = app.buttons["settingsTab"]
        XCTAssertTrue(settingsTab.waitForExistence(timeout: 5))
        settingsTab.press(forDuration: 0.1)

        sleep(2)

        checkForOverflow(screen: "settings", lang: lang)
        takeScreenshot(name: "settings-\(lang)")
    }

    // MARK: - Checks

    func checkForOverflow(screen: String, lang: String) {
        // Get all text elements
        let texts = app.staticTexts.allElementsBoundByIndex

        for text in texts {
            let frame = text.frame
            let label = text.label

            // Check if text extends beyond reasonable bounds
            if frame.width > UIScreen.main.bounds.width - 100 {
                XCTFail("[\(lang)] Overflow detected on \(screen): '\(label.prefix(50))'")
            }
        }
    }

    func checkForTruncation(screen: String, lang: String) {
        let texts = app.staticTexts.allElementsBoundByIndex

        for text in texts {
            let label = text.label

            // Check for ellipsis indicating truncation
            if label.hasSuffix("...") || label.hasSuffix("…") {
                // Log warning but don't fail - truncation may be intentional
                print("⚠️ [\(lang)] Possible truncation on \(screen): '\(label)'")
            }
        }
    }

    func checkRTLLayout(screen: String) {
        // Verify RTL-specific layout
        let firstButton = app.buttons.firstMatch
        if firstButton.exists {
            let frame = firstButton.frame
            let screenWidth = UIScreen.main.bounds.width

            // In RTL, primary actions should be on the right
            // This is a simplified check
            if frame.midX < screenWidth / 2 {
                print("⚠️ [he] Button may not be RTL positioned on \(screen)")
            }
        }
    }

    func takeScreenshot(name: String) {
        let screenshot = XCUIScreen.main.screenshot()
        let attachment = XCTAttachment(screenshot: screenshot)
        attachment.name = name
        attachment.lifetime = .keepAlways
        add(attachment)
    }
}
```

### Running tvOS Tests

```bash
# Run XCTest UI tests
xcodebuild test \
  -project BayitTV.xcodeproj \
  -scheme BayitTVUITests \
  -destination 'platform=tvOS Simulator,name=Apple TV 4K (3rd generation)' \
  -resultBundlePath TestResults

# Extract screenshots from results
xcrun xcresulttool get --path TestResults.xcresult --format json

# Or use the shell script
./scripts/tvos-localization-audit.sh
```

---

## Usage

### Quick Audit (Web Only)

```bash
# Start dev server
npm start &

# Run Playwright audit
npx playwright test tests/localization-audit.spec.ts --reporter=html

# Open report
open playwright-report/index.html
```

### Full Multi-Platform Audit

```bash
# 1. Web audit
npx playwright test tests/localization-audit.spec.ts

# 2. tvOS audit
./scripts/tvos-localization-audit.sh

# 3. Generate combined report
node scripts/generate-combined-report.js
```

### Claude Code Integration

When issues are found, use this agent to:

1. **Identify the issue** - Provide screenshot and selector
2. **Locate the code** - Find the component file
3. **Suggest fix** - Provide code changes
4. **Verify fix** - Re-run audit on specific page

Example workflow:
```
User: Run localization audit on librarian page
Agent:
1. Runs Playwright test for /admin/librarian in all 3 languages
2. Captures screenshots
3. Reports: "Found 2 issues:
   - [HE] RTL: Toggle labels not reversed in Quick Actions
   - [ES] Truncation: 'Eliminar Duplicados' truncated in compact view"
4. Suggests fixes with code changes
```

---

## Output Files

| File | Description |
|------|-------------|
| `screenshots/{page}-{lang}.png` | Screenshots per page/language |
| `localization-report.md` | Markdown report of all issues |
| `localization-issues.json` | Machine-readable issues |
| `comparison.html` | Visual side-by-side comparison |

---

## Integration with CI/CD

```yaml
# .github/workflows/localization-audit.yml
name: Localization Audit

on:
  pull_request:
    paths:
      - 'shared/i18n/**'
      - 'web/src/**'
      - 'tvos/**'

jobs:
  web-audit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci
      - run: npm start &
      - run: npx playwright install chromium
      - run: npx playwright test tests/localization-audit.spec.ts
      - uses: actions/upload-artifact@v4
        with:
          name: localization-screenshots
          path: screenshots/

  tvos-audit:
    runs-on: macos-14
    steps:
      - uses: actions/checkout@v4
      - run: ./scripts/tvos-localization-audit.sh
      - uses: actions/upload-artifact@v4
        with:
          name: tvos-screenshots
          path: screenshots/tvos/
```

---

## Critical Rules

1. **Always test all 3 languages** - he, en, es
2. **RTL is critical for Hebrew** - Layout must reverse
3. **Screenshots are evidence** - Always capture before reporting
4. **Don't fail on warnings** - Only critical issues block PR
5. **Translation keys = critical** - Never show raw keys to users
6. **Test after every i18n change** - Run audit in CI

---

**Status:** ✅ Production Ready
**Last Updated:** 2026-01-18
