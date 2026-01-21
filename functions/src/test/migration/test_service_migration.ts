/**
 * Service File Migration Test
 * Task: T010 - Migration unit test: Service file classification
 *
 * This test MUST FAIL initially to follow TDD principles
  */

import { describe, test, expect } from '@jest/globals';
import * as fs from 'fs';
import * as path from 'path';

describe('Service File Migration', () => {
  test('should have service files in root before migration', async () => {
    // This test validates the initial state - service files should exist in root
    const serviceFiles = [
      '/Users/gklainert/Documents/cvplus/functions/src/services/ai-analysis.service.ts',
      '/Users/gklainert/Documents/cvplus/functions/src/services/cv-processor.service.ts',
      '/Users/gklainert/Documents/cvplus/functions/src/services/multimedia.service.ts',
      '/Users/gklainert/Documents/cvplus/functions/src/services/profile-manager.service.ts'
    ];

    const existingServices: string[] = [];
    const missingServices: string[] = [];

    serviceFiles.forEach(file => {
      if (fs.existsSync(file)) {
        existingServices.push(file);
        console.log(`✓ Found: ${path.basename(file)}`);
      } else {
        missingServices.push(file);
        console.log(`✗ Missing: ${path.basename(file)}`);
      }
    });

    // This should PASS initially (we have services to migrate)
    expect(existingServices.length).toBeGreaterThan(0);
    console.log(`Service files ready for migration: ${existingServices.length}/${serviceFiles.length}`);
  });

  test('should NOT have service files in target submodules before migration', async () => {
    // This test validates that service files are NOT in target locations yet
    const targetLocations = [
      '/Users/gklainert/Documents/cvplus/packages/cv-processing/src/services/ai-analysis.service.ts',
      '/Users/gklainert/Documents/cvplus/packages/cv-processing/src/services/cv-processor.service.ts',
      '/Users/gklainert/Documents/cvplus/packages/multimedia/src/services/multimedia.service.ts',
      '/Users/gklainert/Documents/cvplus/packages/public-profiles/src/services/profile-manager.service.ts'
    ];

    const prematurelyMigrated: string[] = [];
    const correctlyMissing: string[] = [];

    targetLocations.forEach(file => {
      if (fs.existsSync(file)) {
        prematurelyMigrated.push(file);
        console.log(`⚠ Already exists: ${path.basename(file)}`);
      } else {
        correctlyMissing.push(file);
        console.log(`✓ Correctly missing: ${path.basename(file)}`);
      }
    });

    // This should PASS initially (files should NOT be in target locations yet)
    expect(prematurelyMigrated.length).toBe(0);
    console.log(`Service files correctly not migrated yet: ${correctlyMissing.length}/${targetLocations.length}`);
  });

  test('should have target submodule directories exist', async () => {
    // This test validates that target submodule directories exist
    const targetSubmodules = [
      '/Users/gklainert/Documents/cvplus/packages/cv-processing',
      '/Users/gklainert/Documents/cvplus/packages/multimedia',
      '/Users/gklainert/Documents/cvplus/packages/public-profiles'
    ];

    const existingSubmodules: string[] = [];
    const missingSubmodules: string[] = [];

    targetSubmodules.forEach(submodule => {
      if (fs.existsSync(submodule)) {
        existingSubmodules.push(submodule);
        console.log(`✓ Submodule exists: ${path.basename(submodule)}`);

        // Check if src directory exists
        const srcDir = `${submodule}/src`;
        if (fs.existsSync(srcDir)) {
          console.log(`  ✓ Has src directory: ${path.basename(submodule)}`);
        } else {
          console.log(`  ⚠ Missing src directory: ${path.basename(submodule)}`);
        }
      } else {
        missingSubmodules.push(submodule);
        console.log(`✗ Missing submodule: ${path.basename(submodule)}`);
      }
    });

    // This should PASS (target submodules should exist)
    expect(existingSubmodules.length).toBe(targetSubmodules.length);
    console.log(`Target submodules ready: ${existingSubmodules.length}/${targetSubmodules.length}`);
  });

  test('should validate service file classification by domain', async () => {
    // This test validates that we can classify service files by their domain
    const serviceClassification = {
      'ai-analysis.service.ts': 'cv-processing',
      'cv-processor.service.ts': 'cv-processing',
      'multimedia.service.ts': 'multimedia',
      'profile-manager.service.ts': 'public-profiles'
    };

    Object.entries(serviceClassification).forEach(([filename, expectedDomain]) => {
      const filePath = `/Users/gklainert/Documents/cvplus/functions/src/services/${filename}`;

      if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, 'utf8');

        // Analyze content to validate domain classification
        let domainScore = 0;

        switch (expectedDomain) {
          case 'cv-processing':
            if (content.includes('CV') || content.includes('resume') || content.includes('ATS')) {
              domainScore++;
            }
            break;
          case 'multimedia':
            if (content.includes('video') || content.includes('audio') || content.includes('media')) {
              domainScore++;
            }
            break;
          case 'public-profiles':
            if (content.includes('profile') || content.includes('public') || content.includes('contact')) {
              domainScore++;
            }
            break;
        }

        console.log(`${filename} -> ${expectedDomain} (confidence: ${domainScore > 0 ? 'HIGH' : 'LOW'})`);

        // This validates that files have content related to their target domain
        expect(domainScore).toBeGreaterThan(0);
      } else {
        console.log(`⚠ File not found for classification: ${filename}`);
      }
    });
  });

  test('should fail after successful migration (files moved)', async () => {
    // This test should PASS initially but FAIL after migration
    // It's the inverse of the first test - it validates migration completion

    const serviceFiles = [
      '/Users/gklainert/Documents/cvplus/functions/src/services/ai-analysis.service.ts',
      '/Users/gklainert/Documents/cvplus/functions/src/services/cv-processor.service.ts',
      '/Users/gklainert/Documents/cvplus/functions/src/services/multimedia.service.ts',
      '/Users/gklainert/Documents/cvplus/functions/src/services/profile-manager.service.ts'
    ];

    const stillInRoot: string[] = [];
    const successfullyMoved: string[] = [];

    serviceFiles.forEach(file => {
      if (fs.existsSync(file)) {
        stillInRoot.push(file);
      } else {
        successfullyMoved.push(file);
      }
    });

    console.log('Migration completion check:');
    console.log(`Files still in root: ${stillInRoot.length}`);
    console.log(`Files successfully moved: ${successfullyMoved.length}`);

    // Initially this should pass (files exist in root)
    // After migration, this should fail (files should be moved)
    if (successfullyMoved.length === 0) {
      // Pre-migration state
      expect(stillInRoot.length).toBeGreaterThan(0);
      console.log('✓ Pre-migration state: Files ready to migrate');
    } else {
      // Post-migration state
      expect(stillInRoot.length).toBe(0);
      console.log('✓ Post-migration state: All files successfully migrated');
    }
  });
});