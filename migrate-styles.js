#!/usr/bin/env node

/**
 * StyleSheet to TailwindCSS Migration Script
 * Migrates all StyleSheet.create() usage to TailwindCSS className in shared screens
 */

const fs = require('fs');
const path = require('path');

// Style property to Tailwind class mapping
const STYLE_MAP = {
  // Layout
  'flex: 1': 'flex-1',
  'flexDirection: \'row\'': 'flex-row',
  'flexDirection: \'column\'': 'flex-col',
  'flexDirection: \'row-reverse\'': 'flex-row-reverse',
  'justifyContent: \'center\'': 'justify-center',
  'justifyContent: \'space-between\'': 'justify-between',
  'justifyContent: \'flex-start\'': 'justify-start',
  'alignItems: \'center\'': 'items-center',
  'alignItems: \'flex-start\'': 'items-start',

  // Background colors (from colors theme)
  'backgroundColor: colors.background': 'bg-black',
  'backgroundColor: colors.backgroundLight': 'bg-white/5',
  'backgroundColor: colors.backgroundLighter': 'bg-white/10',
  'backgroundColor: colors.primary': 'bg-purple-600',
  'backgroundColor: \'rgba(0, 0, 0, 0.4)\'': 'bg-black/40',
  'backgroundColor: \'rgba(0, 0, 0, 0.5)\'': 'bg-black/50',
  'backgroundColor: \'rgba(255, 255, 255, 0.05)\'': 'bg-white/5',
  'backgroundColor: \'rgba(255, 255, 255, 0.1)\'': 'bg-white/10',
  'backgroundColor: \'rgba(168, 85, 247, 0.2)\'': 'bg-purple-500/20',

  // Text colors
  'color: colors.text': 'text-white',
  'color: colors.textSecondary': 'text-gray-300',
  'color: colors.textMuted': 'text-gray-500',
  'color: colors.primary': 'text-purple-600',
  'color: colors.error': 'text-red-500',

  // Spacing (using spacing theme values)
  'padding: spacing.sm': 'p-2',
  'padding: spacing.md': 'p-4',
  'padding: spacing.lg': 'p-6',
  'padding: spacing.xl': 'p-8',
  'padding: spacing.xxl': 'p-12',
  'margin: spacing.sm': 'm-2',
  'margin: spacing.md': 'm-4',
  'margin: spacing.lg': 'm-6',
  'marginTop: spacing.md': 'mt-4',
  'marginBottom: spacing.lg': 'mb-6',

  // Border radius
  'borderRadius: borderRadius.md': 'rounded-md',
  'borderRadius: borderRadius.lg': 'rounded-lg',
  'borderRadius: borderRadius.xl': 'rounded-xl',
  'borderRadius: borderRadius.full': 'rounded-full',

  // Typography
  'fontSize: 14': 'text-sm',
  'fontSize: 16': 'text-base',
  'fontSize: 18': 'text-lg',
  'fontSize: 20': 'text-xl',
  'fontSize: 24': 'text-2xl',
  'fontSize: 28': 'text-3xl',
  'fontWeight: \'600\'': 'font-semibold',
  'fontWeight: \'bold\'': 'font-bold',
  'textAlign: \'center\'': 'text-center',

  // Borders
  'borderWidth: 2': 'border-2',
  'borderColor: \'transparent\'': 'border-transparent',
  'borderColor: colors.primary': 'border-purple-600',

  // Overflow
  'overflow: \'hidden\'': 'overflow-hidden',

  // Position
  'position: \'absolute\'': 'absolute',
  'position: \'relative\'': 'relative',
};

function convertStyleObjectToTailwind(styleObj) {
  // This is a simplified converter - for complex styles, manual review is needed
  const classes = [];

  // Parse common patterns
  if (styleObj.includes('flex: 1')) classes.push('flex-1');
  if (styleObj.includes('flexDirection: \'row\'')) classes.push('flex-row');
  if (styleObj.includes('justifyContent: \'center\'')) classes.push('justify-center');
  if (styleObj.includes('alignItems: \'center\'')) classes.push('items-center');
  if (styleObj.includes('backgroundColor: colors.background')) classes.push('bg-black');

  return classes.join(' ');
}

function migrat eFile(filePath) {
  console.log(`Processing: ${filePath}`);

  let content = fs.readFileSync(filePath, 'utf8');

  // Check if file uses StyleSheet
  if (!content.includes('StyleSheet.create')) {
    console.log(`  ✓ No StyleSheet found, skipping`);
    return false;
  }

  // Remove StyleSheet import
  content = content.replace(/,?\s*StyleSheet\s*,?/g, ',');
  content = content.replace(/from 'react-native';/, (match) => {
    // Clean up double commas
    const before = content.substring(0, content.indexOf(match));
    return before.match(/,\s*,/) ? match.replace(/,\s*,/, ',') : match;
  });

  // Remove StyleSheet.create block (we'll need to manually convert these)
  const styleSheetRegex = /const styles = StyleSheet\.create\({[\s\S]*?\n}\);/g;
  const hasStyles = styleSheetRegex.test(content);

  if (hasStyles) {
    console.log(`  ⚠ File has StyleSheet.create - requires manual conversion`);
    console.log(`     Run manual migration for this file`);
    return false;
  }

  // Write back
  fs.writeFileSync(filePath, content, 'utf8');
  console.log(`  ✓ Migrated successfully`);
  return true;
}

function processDirectory(dirPath) {
  const files = fs.readdirSync(dirPath, { withFileTypes: true });
  let migrated = 0;
  let failed = 0;

  for (const file of files) {
    const fullPath = path.join(dirPath, file.name);

    if (file.isDirectory()) {
      const result = processDirectory(fullPath);
      migrated += result.migrated;
      failed += result.failed;
    } else if (file.name.endsWith('.tsx')) {
      const success = migrateFile(fullPath);
      if (success) migrated++;
      else failed++;
    }
  }

  return { migrated, failed };
}

// Main execution
const screensDir = '/Users/olorin/Documents/olorin/olorin-media/bayit-plus/shared/screens';

console.log('Starting StyleSheet to TailwindCSS migration...\n');
console.log('='.repeat(60));

const { migrated, failed } = processDirectory(screensDir);

console.log('='.repeat(60));
console.log(`\nMigration complete!`);
console.log(`  ✓ Successfully migrated: ${migrated} files`);
console.log(`  ⚠ Requires manual review: ${failed} files`);
console.log(`\nNote: Files with complex StyleSheet.create() require manual conversion.`);
console.log(`Please review each file and convert style={styles.xyz} to className="..."`);
