#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Files with parsing errors that need corruption fixes
const corruptedFiles = [
  'src/components/common/Button.tsx',
  'src/components/common/Card.tsx', 
  'src/components/common/Input.tsx',
  'src/components/common/index.ts'
];

// Fix file corruption by converting literal \n to actual newlines
function fixFileCorruption(filePath) {
  try {
    console.log(`Fixing corruption in: ${filePath}`);
    
    // Read the raw file
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Replace literal \n with actual newlines
    content = content.replace(/\\n/g, '\n');
    
    // Also fix any other literal escape sequences
    content = content.replace(/\\t/g, '\t');
    content = content.replace(/\\r/g, '\r');
    
    // Write the corrected content back
    fs.writeFileSync(filePath, content, 'utf8');
    
    console.log(`✅ Fixed: ${filePath}`);
  } catch (error) {
    console.error(`❌ Error fixing ${filePath}:`, error.message);
  }
}

// Main execution
function main() {
  const frontendDir = path.join(__dirname, '../frontend');
  
  console.log('🔧 Starting file corruption fixes...\n');
  
  // Fix known corrupted files
  for (const file of corruptedFiles) {
    const fullPath = path.join(frontendDir, file);
    if (fs.existsSync(fullPath)) {
      fixFileCorruption(fullPath);
    } else {
      console.log(`⚠️  File not found: ${fullPath}`);
    }
  }
  
  console.log('\n✅ File corruption fixes completed!');
}

if (require.main === module) {
  main();
}

module.exports = { fixFileCorruption };