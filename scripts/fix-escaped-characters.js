#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Files that need escaped character fixes
const filesToFix = [
  'src/components/common/Button.tsx',
  'src/components/common/Input.tsx',
  'src/components/common/Card.tsx'
];

// Fix escaped characters in a file
function fixEscapedCharacters(filePath) {
  try {
    console.log(`Fixing escaped characters in: ${filePath}`);
    
    // Read the file
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Fix escaped quotes
    content = content.replace(/\\"/g, '"');
    content = content.replace(/\\'/g, "'");
    
    // Fix other common escape sequences that shouldn't be escaped in JSX
    content = content.replace(/\\>/g, '>');
    content = content.replace(/\\</g, '<');
    content = content.replace(/\\=/g, '=');
    
    // Write the corrected content back
    fs.writeFileSync(filePath, content, 'utf8');
    
    console.log(`✅ Fixed escaped characters: ${filePath}`);
  } catch (error) {
    console.error(`❌ Error fixing ${filePath}:`, error.message);
  }
}

// Main execution
function main() {
  const frontendDir = path.join(__dirname, '../frontend');
  
  console.log('🔧 Starting escaped character fixes...\n');
  
  // Fix files with escaped character issues
  for (const file of filesToFix) {
    const fullPath = path.join(frontendDir, file);
    if (fs.existsSync(fullPath)) {
      fixEscapedCharacters(fullPath);
    } else {
      console.log(`⚠️  File not found: ${fullPath}`);
    }
  }
  
  console.log('\n✅ Escaped character fixes completed!');
}

if (require.main === module) {
  main();
}

module.exports = { fixEscapedCharacters };