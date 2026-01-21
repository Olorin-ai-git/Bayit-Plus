#!/usr/bin/env node

/**
 * Fix Secrets Configuration Script
 * 
 * This script:
 * 1. Identifies functions with secret configuration issues
 * 2. Updates function definitions to properly use Firebase Secrets
 * 3. Ensures consistent secret usage across all functions
 */

const fs = require('fs');
const path = require('path');
const glob = require('glob');

class SecretsConfigFixer {
  constructor() {
    this.functionsDir = path.join(__dirname, '..', '..', 'functions', 'src', 'functions');
    this.fixes = [];
  }

  /**
   * Find all TypeScript function files
   */
  getFunctionFiles() {
    return glob.sync('**/*.ts', { cwd: this.functionsDir });
  }

  /**
   * Analyze a function file for secret configuration
   */
  analyzeFunctionFile(filePath) {
    const fullPath = path.join(this.functionsDir, filePath);
    const content = fs.readFileSync(fullPath, 'utf8');
    
    const analysis = {
      file: filePath,
      hasSecrets: content.includes('secrets:'),
      hasOpenAIUsage: content.includes('OPENAI_API_KEY') || content.includes('OpenAI'),
      hasAnthropicUsage: content.includes('ANTHROPIC_API_KEY') || content.includes('Anthropic'),
      hasElevenLabsUsage: content.includes('ELEVENLABS_API_KEY') || content.includes('ElevenLabs'),
      currentSecrets: this.extractSecretsConfig(content),
      needsSecrets: []
    };

    // Determine what secrets are needed
    if (analysis.hasOpenAIUsage) analysis.needsSecrets.push('OPENAI_API_KEY');
    if (analysis.hasAnthropicUsage) analysis.needsSecrets.push('ANTHROPIC_API_KEY');
    if (analysis.hasElevenLabsUsage) analysis.needsSecrets.push('ELEVENLABS_API_KEY');

    return analysis;
  }

  /**
   * Extract secrets configuration from function content
   */
  extractSecretsConfig(content) {
    const secretsMatch = content.match(/secrets:\s*\[(.*?)\]/s);
    if (secretsMatch) {
      return secretsMatch[1]
        .split(',')
        .map(s => s.trim().replace(/['"]/g, ''))
        .filter(s => s.length > 0);
    }
    return [];
  }

  /**
   * Fix secrets configuration in a function file
   */
  fixFunctionSecrets(analysis) {
    if (analysis.needsSecrets.length === 0) {
      return null; // No secrets needed
    }

    const fullPath = path.join(this.functionsDir, analysis.file);
    let content = fs.readFileSync(fullPath, 'utf8');
    let modified = false;

    // Check if secrets are properly configured
    const missingSecrets = analysis.needsSecrets.filter(
      secret => !analysis.currentSecrets.includes(secret)
    );

    if (missingSecrets.length === 0 && analysis.hasSecrets) {
      return null; // Already properly configured
    }

    // Add or update secrets configuration
    const allNeededSecrets = [...new Set(analysis.needsSecrets)];
    const secretsArray = allNeededSecrets.map(s => `'${s}'`).join(', ');

    if (analysis.hasSecrets) {
      // Update existing secrets configuration
      content = content.replace(
        /secrets:\s*\[.*?\]/s,
        `secrets: [${secretsArray}]`
      );
      modified = true;
    } else {
      // Add secrets configuration
      // Look for the function configuration object
      const configMatch = content.match(/(export\s+const\s+\w+\s*=\s*onCall\s*\(\s*{[^}]*)(})/s);
      if (configMatch) {
        const beforeClosing = configMatch[1];
        const closing = configMatch[2];
        
        // Check if there's already a comma before the closing brace
        const needsComma = !beforeClosing.trim().endsWith(',');
        const secretsConfig = `${needsComma ? ',' : ''}\n    secrets: [${secretsArray}]`;
        
        content = content.replace(configMatch[0], `${beforeClosing}${secretsConfig}\n  ${closing}`);
        modified = true;
      }
    }

    if (modified) {
      fs.writeFileSync(fullPath, content);
      return {
        file: analysis.file,
        addedSecrets: allNeededSecrets,
        action: analysis.hasSecrets ? 'updated' : 'added'
      };
    }

    return null;
  }

  /**
   * Run the fixing process
   */
  async run() {
    console.log('🔧 Fixing Firebase Functions Secrets Configuration');
    console.log('================================================');

    const functionFiles = this.getFunctionFiles();
    console.log(`Found ${functionFiles.length} function files to analyze`);

    let totalFixed = 0;

    for (const file of functionFiles) {
      try {
        console.log(`\n📁 Analyzing: ${file}`);
        
        const analysis = this.analyzeFunctionFile(file);
        console.log(`  Needs secrets: ${analysis.needsSecrets.join(', ') || 'None'}`);
        console.log(`  Current secrets: ${analysis.currentSecrets.join(', ') || 'None'}`);
        
        const fix = this.fixFunctionSecrets(analysis);
        if (fix) {
          console.log(`  ✅ ${fix.action.toUpperCase()}: ${fix.addedSecrets.join(', ')}`);
          this.fixes.push(fix);
          totalFixed++;
        } else {
          console.log(`  ✓ Already configured correctly`);
        }

      } catch (error) {
        console.log(`  ❌ Error processing ${file}:`, error.message);
      }
    }

    // Summary
    console.log('\n📊 Summary');
    console.log('==========');
    console.log(`Files processed: ${functionFiles.length}`);
    console.log(`Files fixed: ${totalFixed}`);
    
    if (this.fixes.length > 0) {
      console.log('\n🔧 Applied fixes:');
      this.fixes.forEach(fix => {
        console.log(`  ${fix.file}: ${fix.action} secrets [${fix.addedSecrets.join(', ')}]`);
      });

      console.log('\n📝 Next steps:');
      console.log('1. Review the changes made to function files');
      console.log('2. Build functions: npm run build');
      console.log('3. Deploy with batch script: npm run deploy:batch');
      console.log('4. Verify deployment: firebase functions:list');
    } else {
      console.log('\n✅ All functions are already properly configured');
    }
  }
}

// Check if glob is available, if not provide instructions
try {
  require('glob');
} catch (e) {
  console.log('Installing required dependencies...');
  require('child_process').execSync('npm install glob --save-dev', { stdio: 'inherit' });
  console.log('Dependencies installed. Rerun this script.');
  process.exit(0);
}

// Run the fixer if this script is executed directly
if (require.main === module) {
  const fixer = new SecretsConfigFixer();
  fixer.run().catch(error => {
    console.error('💥 Script failed:', error.message);
    process.exit(1);
  });
}

module.exports = SecretsConfigFixer;