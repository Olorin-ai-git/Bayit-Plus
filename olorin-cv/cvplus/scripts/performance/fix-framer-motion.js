#!/usr/bin/env node

/**
 * Fix Framer Motion Imports
 * Replaces framer-motion usage with CSS classes
 */

const fs = require('fs');
const path = require('path');

const frontendPath = 'frontend/src';

const frameworkReplacements = {
  // Common framer-motion patterns to CSS classes
  'motion.div': 'div className="animate-fade-in"',
  'motion.span': 'span className="animate-fade-in"',
  'motion.button': 'button className="animate-scale-in hover-scale"',
  'motion.section': 'section className="animate-slide-in"',
  'motion.article': 'article className="animate-fade-in"',
  
  // Animation props to CSS classes
  'initial={{ opacity: 0 }}': '',
  'animate={{ opacity: 1 }}': '',
  'initial={{ opacity: 0, y: 20 }}': '',
  'animate={{ opacity: 1, y: 0 }}': '',
  'initial={{ scale: 0.8 }}': '',
  'animate={{ scale: 1 }}': '',
  'whileHover={{ scale: 1.05 }}': '',
  'whileHover={{ y: -2 }}': '',
  
  // Remove transition props
  'transition={{ duration: 0.3 }}': '',
  'transition={{ duration: 0.5 }}': '',
  'transition={{ type: "spring" }}': '',
  
  // AnimatePresence patterns
  '<AnimatePresence>': '<div>',
  '</AnimatePresence>': '</div>',
  
  // Exit animations (remove - CSS can't handle exit animations easily)
  'exit={{ opacity: 0 }}': '',
  'exit={{ scale: 0.8 }}': ''
};

function replaceFramerMotionInFile(filePath) {
  console.log(`🔧 Processing ${filePath}...`);
  
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;
    const originalContent = content;

    // Remove framer-motion import
    const importRegex = /import\s*{\s*[^}]*motion[^}]*}\s*from\s*['"]framer-motion['"];?\s*\n?/g;
    const newContent = content.replace(importRegex, '');
    if (newContent !== content) {
      content = newContent;
      modified = true;
    }

    // Apply replacements
    for (const [pattern, replacement] of Object.entries(frameworkReplacements)) {
      const regex = new RegExp(pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
      const replaced = content.replace(regex, replacement);
      if (replaced !== content) {
        content = replaced;
        modified = true;
      }
    }

    // Clean up multiple spaces and empty lines
    content = content.replace(/\s+className=""/g, '');
    content = content.replace(/\n\s*\n\s*\n/g, '\n\n');

    if (modified) {
      // Create backup
      const backupPath = `${filePath}.framer-backup`;
      fs.writeFileSync(backupPath, originalContent);
      
      // Write updated content
      fs.writeFileSync(filePath, content);
      console.log(`✅ Updated ${filePath}`);
      return true;
    } else {
      console.log(`ℹ️ No changes needed for ${filePath}`);
      return false;
    }
  } catch (error) {
    console.warn(`⚠️ Error processing ${filePath}: ${error.message}`);
    return false;
  }
}

function findFramerMotionFiles() {
  const { exec } = require('child_process');
  const util = require('util');
  const execAsync = util.promisify(exec);
  
  return execAsync(`find ${frontendPath} -name "*.tsx" -o -name "*.ts" | xargs grep -l "framer-motion" 2>/dev/null || true`)
    .then(({ stdout }) => {
      return stdout.trim().split('\n').filter(line => line.length > 0);
    })
    .catch(() => []);
}

async function main() {
  console.log('🚀 Fixing Framer Motion imports...\n');

  try {
    // Change to frontend directory
    process.chdir(path.join(__dirname, '../../frontend'));
    
    const files = await findFramerMotionFiles();
    console.log(`Found ${files.length} files with framer-motion imports`);

    let updatedCount = 0;
    for (const file of files) {
      if (replaceFramerMotionInFile(file)) {
        updatedCount++;
      }
    }

    console.log(`\n✅ Updated ${updatedCount} files`);
    console.log('🏗️ Run npm run build to test the changes');

    if (updatedCount > 0) {
      console.log('\n⚠️ Please review the changes and test functionality:');
      console.log('- Some animations may behave differently with CSS');
      console.log('- Complex animations may need manual adjustment');
      console.log('- Test interactive elements thoroughly');
    }

  } catch (error) {
    console.error('❌ Failed to fix framer-motion imports:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { replaceFramerMotionInFile, frameworkReplacements };