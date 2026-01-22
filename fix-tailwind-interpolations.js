#!/usr/bin/env node
/**
 * Fix Tailwind className template literal interpolations
 *
 * Converts:
 *   className={`text-${size}`}
 * To:
 *   className={size === 'base' ? "text-base" : "text-lg"}
 *
 * This allows Tailwind's JIT to properly scan and generate CSS.
 */

const fs = require('fs');
const path = require('path');
const glob = require('glob');

// Common dynamic patterns to fix
const patterns = [
  // text-${value} patterns
  {
    regex: /className=\{`text-\$\{([^}]+)\s+\?\s+'([^']+)'\s+:\s+'([^']+)'\}/g,
    replacement: (match, condition, val1, val2) =>
      `className={${condition} ? "text-${val1}" : "text-${val2}"}`
  },
  // mb-${value}, mt-${value}, etc.
  {
    regex: /className=\{`([a-z-]+)-\$\{([^}]+)\s+\?\s+'([^']+)'\s+:\s+'([^']+)'\}/g,
    replacement: (match, prefix, condition, val1, val2) =>
      `className={${condition} ? "${prefix}-${val1}" : "${prefix}-${val2}"}`
  },
  // Complex template literals with multiple interpolations
  {
    regex: /className=\{`([^`]*)\$\{([^}]+)\s+\?\s+'([^']+)'\s+:\s+'([^']+)'\}([^`]*)`\}/g,
    replacement: (match, before, condition, val1, val2, after) => {
      const beforeClean = before.trim();
      const afterClean = after.trim();
      const class1 = [beforeClean, val1, afterClean].filter(Boolean).join(' ');
      const class2 = [beforeClean, val2, afterClean].filter(Boolean).join(' ');
      return `className={${condition} ? "${class1}" : "${class2}"}`;
    }
  }
];

// Directories to process
const dirs = [
  'shared/components/**/*.tsx',
  'shared/screens/**/*.tsx',
  'web/src/**/*.tsx',
  'web/src/**/*.jsx'
];

let totalFixed = 0;
let filesProcessed = 0;

dirs.forEach(pattern => {
  const files = glob.sync(pattern, { cwd: __dirname });

  files.forEach(filePath => {
    const fullPath = path.join(__dirname, filePath);
    let content = fs.readFileSync(fullPath, 'utf8');
    let modified = false;
    let fileFixCount = 0;

    patterns.forEach(({ regex, replacement }) => {
      const matches = content.match(regex);
      if (matches) {
        content = content.replace(regex, (...args) => {
          fileFixCount++;
          modified = true;
          return replacement(...args);
        });
      }
    });

    if (modified) {
      fs.writeFileSync(fullPath, content, 'utf8');
      console.log(`✅ Fixed ${fileFixCount} interpolations in ${filePath}`);
      totalFixed += fileFixCount;
      filesProcessed++;
    }
  });
});

console.log(`\n🎉 Complete! Fixed ${totalFixed} interpolations across ${filesProcessed} files.`);
console.log(`\nNext steps:`);
console.log(`1. Review the changes: git diff`);
console.log(`2. Test the build: cd web && npm run build`);
console.log(`3. Start dev server: npm run start`);
