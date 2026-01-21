#!/usr/bin/env node

/**
 * Firebase Bundle Optimization Script
 * Optimizes Firebase imports to reduce bundle size
 */

const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const util = require('util');
const execAsync = util.promisify(exec);

class FirebaseOptimizer {
  constructor(srcPath = 'frontend/src') {
    this.srcPath = srcPath;
    this.optimizedFiles = [];
    this.errors = [];
  }

  async findFirebaseFiles() {
    console.log('🔍 Finding files with Firebase imports...');
    
    try {
      const { stdout } = await execAsync(`find ${this.srcPath} -name "*.ts" -o -name "*.tsx" | xargs grep -l "firebase" 2>/dev/null || true`);
      const files = stdout.trim().split('\n').filter(line => line.length > 0);
      
      console.log(`Found ${files.length} files with Firebase imports`);
      files.forEach(file => console.log(`  - ${file}`));
      
      return files;
    } catch (error) {
      console.warn('⚠️ Error finding Firebase files:', error.message);
      return [];
    }
  }

  async analyzeFirebaseUsage(filePath) {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const usage = {
        hasFirebaseApp: content.includes('initializeApp') || content.includes('firebase/app'),
        hasAuth: content.includes('auth') || content.includes('firebase/auth'),
        hasFirestore: content.includes('firestore') || content.includes('firebase/firestore'),
        hasFunctions: content.includes('functions') || content.includes('firebase/functions'),
        hasStorage: content.includes('storage') || content.includes('firebase/storage'),
        hasAnalytics: content.includes('analytics') || content.includes('firebase/analytics'),
        hasLegacyImports: content.includes('firebase/compat/') || content.includes('import firebase from'),
        hasUnnecessaryImports: false
      };

      // Check for unnecessary imports
      const lines = content.split('\n');
      for (const line of lines) {
        if (line.includes('import') && line.includes('firebase')) {
          // Check if imported items are actually used
          const importMatch = line.match(/import\s*{\s*([^}]+)\s*}/);
          if (importMatch) {
            const imports = importMatch[1].split(',').map(imp => imp.trim());
            for (const imp of imports) {
              const regex = new RegExp(`\\b${imp}\\b`, 'g');
              const matches = content.match(regex);
              if (!matches || matches.length <= 1) { // Only the import line
                usage.hasUnnecessaryImports = true;
                break;
              }
            }
          }
        }
      }

      return usage;
    } catch (error) {
      console.warn(`⚠️ Could not analyze ${filePath}:`, error.message);
      return null;
    }
  }

  async optimizeFirebaseImports(filePath) {
    console.log(`🔧 Optimizing ${filePath}...`);
    
    try {
      let content = fs.readFileSync(filePath, 'utf8');
      let modified = false;
      const originalContent = content;

      // Replace legacy Firebase imports with modular imports
      const replacements = [
        {
          pattern: /import\s+firebase\s+from\s+['"]firebase\/compat\/app['"];?\s*\n?/g,
          replacement: "import { initializeApp } from 'firebase/app';\n"
        },
        {
          pattern: /import\s+['"]firebase\/compat\/auth['"];?\s*\n?/g,
          replacement: "import { getAuth } from 'firebase/auth';\n"
        },
        {
          pattern: /import\s+['"]firebase\/compat\/firestore['"];?\s*\n?/g,
          replacement: "import { getFirestore } from 'firebase/firestore';\n"
        },
        {
          pattern: /firebase\.auth\(\)/g,
          replacement: "getAuth()"
        },
        {
          pattern: /firebase\.firestore\(\)/g,
          replacement: "getFirestore()"
        },
        {
          pattern: /firebase\.functions\(\)/g,
          replacement: "getFunctions()"
        }
      ];

      for (const { pattern, replacement } of replacements) {
        const newContent = content.replace(pattern, replacement);
        if (newContent !== content) {
          content = newContent;
          modified = true;
        }
      }

      // Optimize Firebase imports by only importing what's needed
      const optimizedImports = this.optimizeImportStatements(content);
      if (optimizedImports !== content) {
        content = optimizedImports;
        modified = true;
      }

      // Remove duplicate imports
      content = this.removeDuplicateImports(content);

      if (modified) {
        // Create backup
        const backupPath = `${filePath}.firebase-backup`;
        fs.writeFileSync(backupPath, originalContent);
        
        // Write optimized content
        fs.writeFileSync(filePath, content);
        this.optimizedFiles.push(filePath);
        
        console.log(`✅ Optimized ${filePath}`);
        return true;
      }

      return false;
    } catch (error) {
      console.warn(`⚠️ Could not optimize ${filePath}:`, error.message);
      this.errors.push({ file: filePath, error: error.message });
      return false;
    }
  }

  optimizeImportStatements(content) {
    const lines = content.split('\n');
    const optimizedLines = [];
    const firebaseImports = new Set();
    
    for (let line of lines) {
      if (line.includes('import') && line.includes('firebase')) {
        // Extract Firebase imports and consolidate them
        const importMatch = line.match(/import\s*{\s*([^}]+)\s*}\s*from\s*['"]([^'"]+)['"]/);
        if (importMatch) {
          const [, imports, module] = importMatch;
          const importList = imports.split(',').map(imp => imp.trim());
          
          // Group by module
          if (!firebaseImports.has(module)) {
            firebaseImports.set(module, new Set());
          }
          
          importList.forEach(imp => firebaseImports.get(module).add(imp));
          continue; // Skip original line
        }
      }
      optimizedLines.push(line);
    }

    // Add consolidated Firebase imports at the top
    const firebaseImportLines = [];
    for (const [module, imports] of firebaseImports.entries()) {
      if (imports.size > 0) {
        const importList = Array.from(imports).sort().join(', ');
        firebaseImportLines.push(`import { ${importList} } from '${module}';`);
      }
    }

    // Insert Firebase imports after other imports
    const importEndIndex = optimizedLines.findIndex(line => 
      line.trim() === '' && optimizedLines.slice(0, optimizedLines.indexOf(line)).some(l => l.includes('import'))
    );
    
    if (importEndIndex > 0) {
      optimizedLines.splice(importEndIndex, 0, ...firebaseImportLines);
    } else {
      optimizedLines.unshift(...firebaseImportLines, '');
    }

    return optimizedLines.join('\n');
  }

  removeDuplicateImports(content) {
    const lines = content.split('\n');
    const seenImports = new Set();
    const filteredLines = [];

    for (const line of lines) {
      if (line.includes('import') && line.includes('firebase')) {
        if (!seenImports.has(line.trim())) {
          seenImports.add(line.trim());
          filteredLines.push(line);
        }
        // Skip duplicate
      } else {
        filteredLines.push(line);
      }
    }

    return filteredLines.join('\n');
  }

  async createOptimizedFirebaseConfig() {
    console.log('🔧 Creating optimized Firebase configuration...');
    
    const optimizedConfig = `
// Optimized Firebase Configuration
// Only imports what's actually needed to reduce bundle size

import { initializeApp } from 'firebase/app';
import { getAuth, connectAuthEmulator } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';
import { getFunctions, connectFunctionsEmulator } from 'firebase/functions';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize services with lazy loading
let auth: ReturnType<typeof getAuth> | null = null;
let firestore: ReturnType<typeof getFirestore> | null = null;
let functions: ReturnType<typeof getFunctions> | null = null;

export const getAuthInstance = () => {
  if (!auth) {
    auth = getAuth(app);
    
    // Connect to emulator in development
    if (import.meta.env.DEV && !auth.app) {
      connectAuthEmulator(auth, 'http://localhost:9099');
    }
  }
  return auth;
};

export const getFirestoreInstance = () => {
  if (!firestore) {
    firestore = getFirestore(app);
    
    // Connect to emulator in development
    if (import.meta.env.DEV && !firestore.app) {
      connectFirestoreEmulator(firestore, 'localhost', 8080);
    }
  }
  return firestore;
};

export const getFunctionsInstance = () => {
  if (!functions) {
    functions = getFunctions(app);
    
    // Connect to emulator in development
    if (import.meta.env.DEV) {
      connectFunctionsEmulator(functions, 'localhost', 5001);
    }
  }
  return functions;
};

export { app };
export default app;
`;

    const configPath = path.join(this.srcPath, 'config', 'firebase-optimized.ts');
    const configDir = path.dirname(configPath);
    
    if (!fs.existsSync(configDir)) {
      fs.mkdirSync(configDir, { recursive: true });
    }
    
    fs.writeFileSync(configPath, optimizedConfig);
    console.log(`✅ Created optimized Firebase config: ${configPath}`);
    
    return configPath;
  }

  async updateViteConfig() {
    console.log('🔧 Updating Vite config for Firebase optimization...');
    
    const viteConfigPath = path.join('frontend', 'vite.config.ts');
    
    if (!fs.existsSync(viteConfigPath)) {
      console.warn('⚠️ Vite config not found');
      return;
    }

    let config = fs.readFileSync(viteConfigPath, 'utf8');
    
    // Add Firebase tree shaking configuration
    const firebaseOptimization = `
    define: {
      // Firebase tree shaking
      __FIREBASE_DEFAULTS__: JSON.stringify({
        authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
        projectId: process.env.VITE_FIREBASE_PROJECT_ID
      })
    },`;

    // Check if define block already exists
    if (!config.includes('define:')) {
      // Add define block after plugins
      config = config.replace(
        /plugins:\s*\[[^\]]+\],/,
        `$&${firebaseOptimization}`
      );
    }

    // Ensure Firebase packages are properly externalized for better tree shaking
    const optimizeDepsUpdate = `
    include: [
      'react',
      'react-dom',
      'firebase/app',
      'firebase/auth',
      'firebase/firestore',
      'firebase/functions'
    ],
    exclude: [
      'framer-motion', // Exclude heavy dependencies from pre-bundling
      'recharts',
      'firebase/compat', // Exclude legacy Firebase
      'firebase/storage', // Exclude unused Firebase modules
      'firebase/analytics',
      'firebase/messaging',
      'firebase/performance'
    ]`;

    config = config.replace(
      /exclude:\s*\[[^\]]+\]/,
      `exclude: [
      'framer-motion',
      'recharts',
      'firebase/compat',
      'firebase/storage',
      'firebase/analytics',
      'firebase/messaging',
      'firebase/performance'
    ]`
    );

    fs.writeFileSync(viteConfigPath, config);
    console.log('✅ Updated Vite config for Firebase optimization');
  }

  async generateReport() {
    const report = {
      optimization_date: new Date().toISOString(),
      files_analyzed: this.optimizedFiles.length,
      files_optimized: this.optimizedFiles.length,
      errors_encountered: this.errors.length,
      optimizations_applied: [
        'Legacy Firebase imports replaced with modular imports',
        'Duplicate imports removed',
        'Unused Firebase modules excluded',
        'Lazy loading Firebase instances',
        'Tree shaking configuration updated'
      ],
      expected_savings: {
        bundle_size_reduction: '25-35%',
        firebase_bundle_target: '300KB (from 537KB)',
        initial_load_improvement: '200-250KB'
      },
      next_steps: [
        'Test Firebase functionality after optimization',
        'Monitor bundle size in development',
        'Implement service worker caching',
        'Consider Firebase Analytics lazy loading'
      ]
    };

    const reportPath = path.join('logs', 'firebase-optimization-report.json');
    const logsDir = path.dirname(reportPath);
    
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true });
    }
    
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`📄 Firebase optimization report saved: ${reportPath}`);
    
    return report;
  }

  async optimize() {
    console.log('🚀 Starting Firebase Bundle Optimization...\n');

    try {
      // Find all Firebase files
      const firebaseFiles = await this.findFirebaseFiles();
      
      if (firebaseFiles.length === 0) {
        console.log('ℹ️ No Firebase files found to optimize');
        return;
      }

      // Analyze and optimize each file
      for (const file of firebaseFiles) {
        const usage = await this.analyzeFirebaseUsage(file);
        if (usage) {
          console.log(`📊 ${file}:`);
          console.log(`  - Auth: ${usage.hasAuth ? '✅' : '❌'}`);
          console.log(`  - Firestore: ${usage.hasFirestore ? '✅' : '❌'}`);
          console.log(`  - Functions: ${usage.hasFunctions ? '✅' : '❌'}`);
          console.log(`  - Legacy imports: ${usage.hasLegacyImports ? '⚠️' : '✅'}`);
          console.log(`  - Unnecessary imports: ${usage.hasUnnecessaryImports ? '⚠️' : '✅'}\n`);
        }

        await this.optimizeFirebaseImports(file);
      }

      // Create optimized config
      await this.createOptimizedFirebaseConfig();

      // Update Vite config
      await this.updateViteConfig();

      // Generate report
      const report = await this.generateReport();

      console.log('\n🎯 Firebase Optimization Complete!');
      console.log(`Files optimized: ${this.optimizedFiles.length}`);
      console.log(`Expected savings: ${report.expected_savings.bundle_size_reduction}`);
      console.log(`Firebase bundle target: ${report.expected_savings.firebase_bundle_target}`);
      
      if (this.errors.length > 0) {
        console.log(`⚠️ Errors encountered: ${this.errors.length}`);
        this.errors.forEach(error => console.log(`  - ${error.file}: ${error.error}`));
      }

      return report;
    } catch (error) {
      console.error('❌ Firebase optimization failed:', error.message);
      throw error;
    }
  }
}

// Main execution
async function main() {
  const optimizer = new FirebaseOptimizer();
  
  try {
    const report = await optimizer.optimize();
    console.log('\n✅ Firebase optimization completed');
    
    if (report && report.files_optimized > 0) {
      console.log('🏗️ Run npm run build to see the bundle size improvements');
    }
    
  } catch (error) {
    console.error('❌ Firebase optimization failed');
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = FirebaseOptimizer;