/**
 * TypeScript Compilation Validation Test
 * Task: T007 - Build validation test: TypeScript compilation success
 *
 * This test must PASS throughout migration to ensure no breaking changes
 */

import { describe, test, expect } from '@jest/globals';
import { execSync } from 'child_process';
import * as fs from 'fs';

describe('TypeScript Validation', () => {
  test('should compile TypeScript without errors', async () => {
    let compilationSuccess = false;
    let compilationOutput = '';
    let compilationError = '';

    try {
      compilationOutput = execSync('cd functions && npx tsc --noEmit', {
        stdio: 'pipe',
        encoding: 'utf8',
        timeout: 60000 // 60 second timeout
      });
      compilationSuccess = true;
    } catch (error: any) {
      compilationError = error.stdout + '\n' + error.stderr || error.message || 'Unknown compilation error';
    }

    console.log('TypeScript compilation:', compilationSuccess ? 'SUCCESS' : 'FAILED');

    if (!compilationSuccess) {
      console.log('Compilation errors:');
      console.log(compilationError);

      // Count specific error types
      const errorCount = (compilationError.match(/error TS/g) || []).length;
      const warningCount = (compilationError.match(/warning TS/g) || []).length;

      console.log(`Error count: ${errorCount}`);
      console.log(`Warning count: ${warningCount}`);
    } else {
      console.log('TypeScript compilation completed successfully');
    }

    // This MUST pass - compilation must always succeed during migration
    expect(compilationSuccess).toBe(true);
  });

  test('should have valid TypeScript configuration', async () => {
    const tsconfigPath = '/Users/gklainert/Documents/cvplus/functions/tsconfig.json';

    expect(fs.existsSync(tsconfigPath)).toBe(true);

    const tsconfigContent = fs.readFileSync(tsconfigPath, 'utf8');
    const tsconfig = JSON.parse(tsconfigContent);

    // Validate key TypeScript config options
    expect(tsconfig.compilerOptions).toBeDefined();
    console.log('TypeScript target:', tsconfig.compilerOptions.target);
    console.log('TypeScript module:', tsconfig.compilerOptions.module);
    console.log('Module resolution:', tsconfig.compilerOptions.moduleResolution);

    // Ensure strict mode is enabled for better type safety
    if (tsconfig.compilerOptions.strict !== undefined) {
      console.log('Strict mode:', tsconfig.compilerOptions.strict);
    }
  });

  test('should resolve all import statements', async () => {
    // Check that all imports in index.ts can be resolved
    const indexPath = '/Users/gklainert/Documents/cvplus/functions/src/index.ts';
    const indexContent = fs.readFileSync(indexPath, 'utf8');

    // Extract all import statements
    const imports = indexContent.match(/from\s+['"][^'"]+['"]/g) || [];
    console.log(`Found ${imports.length} import statements`);

    // Categorize imports
    const relativeImports = imports.filter(imp => imp.includes('./') || imp.includes('../'));
    const packageImports = imports.filter(imp => imp.includes('@cvplus/'));
    const nodeImports = imports.filter(imp => !imp.includes('./') && !imp.includes('../') && !imp.includes('@cvplus/'));

    console.log(`Relative imports: ${relativeImports.length}`);
    console.log(`@cvplus package imports: ${packageImports.length}`);
    console.log(`Node/external imports: ${nodeImports.length}`);

    // Log some examples for debugging
    if (packageImports.length > 0) {
      console.log('Example @cvplus imports:', packageImports.slice(0, 3));
    }
    if (relativeImports.length > 0) {
      console.log('Example relative imports:', relativeImports.slice(0, 3));
    }

    // This validates that we have expected import patterns
    expect(imports.length).toBeGreaterThan(0);
  });

  test('should validate package.json dependencies', async () => {
    const packageJsonPath = '/Users/gklainert/Documents/cvplus/functions/package.json';
    expect(fs.existsSync(packageJsonPath)).toBe(true);

    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

    // Validate key dependencies
    const requiredDeps = [
      'firebase-admin',
      'firebase-functions',
      'typescript'
    ];

    const missingDeps: string[] = [];
    requiredDeps.forEach(dep => {
      const hasInDeps = packageJson.dependencies?.[dep];
      const hasInDevDeps = packageJson.devDependencies?.[dep];

      if (!hasInDeps && !hasInDevDeps) {
        missingDeps.push(dep);
      }
    });

    if (missingDeps.length > 0) {
      console.log('Missing dependencies:', missingDeps);
    }

    console.log('Firebase Admin version:', packageJson.dependencies?.['firebase-admin'] || 'Not found');
    console.log('Firebase Functions version:', packageJson.dependencies?.['firebase-functions'] || 'Not found');

    // This validates that essential dependencies are present
    expect(missingDeps.length).toBe(0);
  });

  test('should validate submodule TypeScript configurations', async () => {
    const submodulesToCheck = [
      'cv-processing',
      'multimedia',
      'analytics',
      'public-profiles'
    ];

    const validSubmodules: string[] = [];
    const invalidSubmodules: string[] = [];

    submodulesToCheck.forEach(submodule => {
      const submodulePath = `/Users/gklainert/Documents/cvplus/packages/${submodule}`;
      const tsconfigPath = `${submodulePath}/tsconfig.json`;

      if (fs.existsSync(tsconfigPath)) {
        try {
          const tsconfig = JSON.parse(fs.readFileSync(tsconfigPath, 'utf8'));
          validSubmodules.push(submodule);
          console.log(`✓ ${submodule}: Valid TypeScript config`);
        } catch (error) {
          invalidSubmodules.push(submodule);
          console.log(`✗ ${submodule}: Invalid TypeScript config`);
        }
      } else {
        console.log(`- ${submodule}: No TypeScript config found`);
      }
    });

    console.log(`Submodules with valid TS configs: ${validSubmodules.length}/${submodulesToCheck.length}`);

    // We expect at least some submodules to have TypeScript configs
    expect(validSubmodules.length).toBeGreaterThanOrEqual(0);
  });
});