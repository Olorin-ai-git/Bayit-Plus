#!/usr/bin/env node

/**
 * @fileoverview Translation key extraction script
 * Extracts translation keys from source code for maintenance and validation
 */

const fs = require('fs');
const path = require('path');
const glob = require('glob');

// Configuration
const CONFIG = {
  sourcePatterns: [
    'src/**/*.{ts,tsx,js,jsx}',
    '../frontend/src/**/*.{ts,tsx,js,jsx}',
    '../**/*.{ts,tsx,js,jsx}',
  ],
  ignorePatterns: [
    '**/node_modules/**',
    '**/dist/**',
    '**/build/**',
    '**/*.test.*',
    '**/*.spec.*',
  ],
  extractionPatterns: [
    // React i18n patterns
    /t\(['"`]([^'"`]+)['"`]/g,
    /useTranslation\(\)\s*\.\s*t\(['"`]([^'"`]+)['"`]/g,
    
    // Translation service patterns
    /translationService\.translate\(['"`]([^'"`]+)['"`]/g,
    /translationService\.t\(['"`]([^'"`]+)['"`]/g,
    
    // Component patterns
    /<TranslatedText\s+i18nKey=['"`]([^'"`]+)['"`]/g,
    /<PluralTranslation\s+i18nKey=['"`]([^'"`]+)['"`]/g,
    /<GenderAwareTranslation\s+i18nKey=['"`]([^'"`]+)['"`]/g,
    /<ProfessionalTranslation\s+i18nKey=['"`]([^'"`]+)['"`]/g,
    
    // Direct function calls
    /translateError\(['"`]([^'"`]+)['"`]/g,
    /translateRole\(['"`]([^'"`]+)['"`]/g,
    /translateSkill\(['"`]([^'"`]+)['"`]/g,
    /translateCVSection\(['"`]([^'"`]+)['"`]/g,
    /translateForm\(['"`]([^'"`]+)['"`]/g,
  ],
  outputFile: 'extracted-keys.json',
};

/**
 * Extract translation keys from source files
 */
async function extractKeys() {
  console.log('🔍 Extracting translation keys...\n');
  
  const extractedKeys = new Map();
  let totalFiles = 0;
  let filesWithKeys = 0;
  
  try {
    // Get all source files
    const files = [];
    for (const pattern of CONFIG.sourcePatterns) {
      const matched = glob.sync(pattern, { ignore: CONFIG.ignorePatterns });
      files.push(...matched);
    }
    
    // Remove duplicates and sort
    const uniqueFiles = [...new Set(files)].sort();
    totalFiles = uniqueFiles.length;
    
    console.log(`📁 Scanning ${totalFiles} files...\n`);
    
    // Process each file
    for (const filePath of uniqueFiles) {
      const keys = await extractKeysFromFile(filePath);
      
      if (keys.length > 0) {
        filesWithKeys++;
        console.log(`📄 ${filePath}: ${keys.length} keys`);
        
        keys.forEach(keyInfo => {
          if (!extractedKeys.has(keyInfo.key)) {
            extractedKeys.set(keyInfo.key, []);
          }
          extractedKeys.get(keyInfo.key).push({
            file: filePath,
            line: keyInfo.line,
            context: keyInfo.context,
            pattern: keyInfo.pattern,
          });
        });
      }
    }
    
    // Sort keys
    const sortedKeys = new Map([...extractedKeys.entries()].sort());
    
    // Generate report
    const report = {
      summary: {
        totalFiles,
        filesWithKeys,
        totalKeys: sortedKeys.size,
        extractedAt: new Date().toISOString(),
      },
      keys: Object.fromEntries(
        [...sortedKeys.entries()].map(([key, usages]) => [
          key,
          {
            usageCount: usages.length,
            usages: usages.map(usage => ({
              file: usage.file,
              line: usage.line,
              context: usage.context,
              pattern: usage.pattern,
            })),
            namespace: inferNamespace(key),
            category: inferCategory(key),
            deprecated: isDeprecatedKey(key),
            missing: await checkMissingTranslations(key),
          },
        ])
      ),
      namespaces: generateNamespaceReport(sortedKeys),
      categories: generateCategoryReport(sortedKeys),
      warnings: generateWarnings(sortedKeys),
    };
    
    // Write report
    await writeReport(report);
    
    // Print summary
    console.log('\n📊 Extraction Summary:');
    console.log(`   Files scanned: ${totalFiles}`);
    console.log(`   Files with keys: ${filesWithKeys}`);
    console.log(`   Unique keys: ${sortedKeys.size}`);
    console.log(`   Total usages: ${[...sortedKeys.values()].reduce((sum, usages) => sum + usages.length, 0)}`);
    
    if (report.warnings.length > 0) {
      console.log(`\n⚠️  ${report.warnings.length} warnings found:`);
      report.warnings.forEach(warning => {
        console.log(`   ${warning.type}: ${warning.message}`);
      });
    }
    
    console.log(`\n✅ Report saved to ${CONFIG.outputFile}`);
    
  } catch (error) {
    console.error('❌ Extraction failed:', error);
    process.exit(1);
  }
}

/**
 * Extract keys from a single file
 */
async function extractKeysFromFile(filePath) {
  const keys = [];
  
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');
    
    for (const pattern of CONFIG.extractionPatterns) {
      let match;
      const globalPattern = new RegExp(pattern.source, pattern.flags);
      
      while ((match = globalPattern.exec(content)) !== null) {
        const key = match[1];
        const beforeMatch = content.substring(0, match.index);
        const lineNumber = beforeMatch.split('\n').length;
        const line = lines[lineNumber - 1];
        
        keys.push({
          key,
          line: lineNumber,
          context: line.trim(),
          pattern: pattern.source,
        });
      }
    }
  } catch (error) {
    console.warn(`⚠️  Failed to read ${filePath}: ${error.message}`);
  }
  
  return keys;
}

/**
 * Infer namespace from key
 */
function inferNamespace(key) {
  const parts = key.split('.');
  if (parts.length > 1) {
    const firstPart = parts[0];
    
    // Common namespace patterns
    const namespaceMap = {
      'common': 'common',
      'cv': 'cv',
      'forms': 'forms',
      'errors': 'errors',
      'success': 'success',
      'features': 'features',
      'premium': 'premium',
      'auth': 'auth',
      'navigation': 'navigation',
      'validation': 'validation',
    };
    
    return namespaceMap[firstPart] || 'unknown';
  }
  
  return 'root';
}

/**
 * Infer category from key
 */
function inferCategory(key) {
  const lowerKey = key.toLowerCase();
  
  if (lowerKey.includes('error')) return 'error';
  if (lowerKey.includes('success')) return 'success';
  if (lowerKey.includes('warning')) return 'warning';
  if (lowerKey.includes('button')) return 'action';
  if (lowerKey.includes('label')) return 'form';
  if (lowerKey.includes('placeholder')) return 'form';
  if (lowerKey.includes('validation')) return 'validation';
  if (lowerKey.includes('nav')) return 'navigation';
  if (lowerKey.includes('menu')) return 'navigation';
  if (lowerKey.includes('title')) return 'content';
  if (lowerKey.includes('description')) return 'content';
  
  return 'general';
}

/**
 * Check if key is deprecated
 */
function isDeprecatedKey(key) {
  const deprecatedPatterns = [
    /^old\./,
    /^deprecated\./,
    /^legacy\./,
    /\.old$/,
    /\.deprecated$/,
    /\.legacy$/,
  ];
  
  return deprecatedPatterns.some(pattern => pattern.test(key));
}

/**
 * Check missing translations for key
 */
async function checkMissingTranslations(key) {
  const missing = [];
  const localesDir = path.join(__dirname, '..', 'locales');
  
  if (!fs.existsSync(localesDir)) {
    return ['all'];
  }
  
  const languages = fs.readdirSync(localesDir, { withFileTypes: true })
    .filter(dirent => dirent.isDirectory())
    .map(dirent => dirent.name);
  
  for (const lang of languages) {
    const hasTranslation = await checkTranslationExists(key, lang);
    if (!hasTranslation) {
      missing.push(lang);
    }
  }
  
  return missing;
}

/**
 * Check if translation exists for key in language
 */
async function checkTranslationExists(key, language) {
  try {
    const namespace = inferNamespace(key);
    const localeFile = path.join(__dirname, '..', 'locales', language, `${namespace}.json`);
    
    if (!fs.existsSync(localeFile)) {
      return false;
    }
    
    const translations = JSON.parse(fs.readFileSync(localeFile, 'utf-8'));
    
    // Navigate nested object structure
    const keyParts = key.split('.');
    let current = translations;
    
    for (const part of keyParts) {
      if (current && typeof current === 'object' && part in current) {
        current = current[part];
      } else {
        return false;
      }
    }
    
    return typeof current === 'string' && current.length > 0;
  } catch (error) {
    return false;
  }
}

/**
 * Generate namespace report
 */
function generateNamespaceReport(keys) {
  const namespaces = {};
  
  for (const [key, usages] of keys) {
    const namespace = inferNamespace(key);
    if (!namespaces[namespace]) {
      namespaces[namespace] = { count: 0, keys: [] };
    }
    namespaces[namespace].count++;
    namespaces[namespace].keys.push(key);
  }
  
  return namespaces;
}

/**
 * Generate category report
 */
function generateCategoryReport(keys) {
  const categories = {};
  
  for (const [key, usages] of keys) {
    const category = inferCategory(key);
    if (!categories[category]) {
      categories[category] = { count: 0, keys: [] };
    }
    categories[category].count++;
    categories[category].keys.push(key);
  }
  
  return categories;
}

/**
 * Generate warnings
 */
function generateWarnings(keys) {
  const warnings = [];
  
  for (const [key, usages] of keys) {
    // Check for potential issues
    if (key.includes('..')) {
      warnings.push({
        type: 'malformed_key',
        message: `Key "${key}" contains consecutive dots`,
        key,
      });
    }
    
    if (key.length > 100) {
      warnings.push({
        type: 'long_key',
        message: `Key "${key}" is very long (${key.length} characters)`,
        key,
      });
    }
    
    if (usages.length === 1) {
      warnings.push({
        type: 'single_usage',
        message: `Key "${key}" is only used once - consider if it's necessary`,
        key,
      });
    }
    
    if (isDeprecatedKey(key)) {
      warnings.push({
        type: 'deprecated',
        message: `Key "${key}" appears to be deprecated`,
        key,
      });
    }
  }
  
  return warnings;
}

/**
 * Write report to file
 */
async function writeReport(report) {
  const outputPath = path.join(__dirname, CONFIG.outputFile);
  fs.writeFileSync(outputPath, JSON.stringify(report, null, 2), 'utf-8');
}

// Run extraction if called directly
if (require.main === module) {
  extractKeys().catch(error => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  });
}

module.exports = { extractKeys };