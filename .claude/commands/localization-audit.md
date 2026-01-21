# Localization Audit Command

Automatically scan the UI for localization issues across all 10 supported languages (Hebrew, English, Spanish, Chinese, French, Italian, Hindi, Tamil, Bengali, Japanese).

## Usage

```bash
/localization-audit [platform] [--page <page>] [--lang <lang>]
```

## Arguments

- **platform** - `web`, `tvos`, or `all` (default: `web`)
- **--page** - Specific page to audit (e.g., `librarian`, `home`, `vod`)
- **--lang** - Specific language (e.g., `he`, `en`, `es`, `zh`, `fr`, `it`, `hi`, `ta`, `bn`, `ja`)

## Examples

```bash
# Audit all web pages in all languages
/localization-audit web

# Audit only the librarian page
/localization-audit web --page librarian

# Audit only Hebrew RTL issues
/localization-audit web --lang he

# Audit Chinese localization
/localization-audit web --lang zh

# Audit Japanese localization
/localization-audit web --lang ja

# Audit tvOS app
/localization-audit tvos

# Full audit (web + tvOS)
/localization-audit all
```

## Workflow

When this command is invoked, execute the following steps:

### Step 1: Check Prerequisites

```bash
# For web audit - check if Playwright is installed
cd /Users/olorin/Documents/Bayit-Plus/web
if ! npm list @playwright/test >/dev/null 2>&1; then
  echo "Installing Playwright..."
  npm install -D @playwright/test
  npx playwright install chromium
fi
```

### Step 2: Start Dev Server (if not running)

```bash
# Check if dev server is running
if ! curl -s http://localhost:3000 >/dev/null 2>&1; then
  echo "Starting dev server..."
  cd /Users/olorin/Documents/Bayit-Plus/web
  npm start &
  sleep 10
fi
```

### Step 3: Run Web Audit

```bash
cd /Users/olorin/Documents/Bayit-Plus/web

# Run Playwright localization tests
npx playwright test tests/localization-audit.spec.ts --reporter=list

# If specific page requested
# npx playwright test tests/localization-audit.spec.ts --grep "Audit <page>"

# If specific language requested
# npx playwright test tests/localization-audit.spec.ts --grep "Language: <lang>"
```

### Step 4: Run tvOS Audit (if requested)

```bash
cd /Users/olorin/Documents/Bayit-Plus
./scripts/tvos-localization-audit.sh
```

### Step 5: Generate Report

After running the audits:

1. Read the generated `localization-report.md`
2. Read the generated `localization-issues.json`
3. Summarize findings to user
4. Show screenshots path
5. Suggest fixes for critical issues

## Issue Detection

The audit detects these localization problems:

| Issue Type | Severity | Description |
|------------|----------|-------------|
| `overflow` | 🔴 Critical | Text exceeds container bounds |
| `truncation` | 🟡 Warning | Text cut off with ellipsis |
| `rtl` | 🔴 Critical | Hebrew layout not reversed |
| `missing` | 🔴 Critical | Translation key showing instead of text |
| `untranslated` | 🟡 Warning | Hebrew text in English/Spanish mode |

## Output Files

| File | Location |
|------|----------|
| Screenshots | `web/screenshots/{page}-{lang}.png` |
| Report | `web/localization-report.md` |
| JSON | `web/localization-issues.json` |
| tvOS Screenshots | `screenshots/tvos/{page}-{lang}.png` |
| tvOS Comparison | `screenshots/tvos/comparison.html` |

## Auto-Fix Suggestions

For common issues, suggest fixes:

### Missing Translation
```typescript
// Add to shared/i18n/locales/en.json
"admin.librarian.quickActions.purgeDuplicates": "Purge Duplicates"
```

### RTL Layout Issue
```typescript
// Use useDirection hook
const { isRTL, flexDirection } = useDirection();

// Apply RTL-aware flex
<View style={{ flexDirection }}>
```

### Text Overflow
```typescript
// Add numberOfLines prop
<Text numberOfLines={1} ellipsizeMode="tail">
  {longText}
</Text>

// Or use flex shrink
<Text style={{ flexShrink: 1 }}>
```

## Related

- Agent: `localization-ui-auditor.md`
- Agent: `localization-specialist.md`
- Command: `/localize-content` - Translate database content
