// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts/**
 * Manual validation script for multimedia integration
 * This script validates that the integration layer works correctly
 */

import { MultimediaIntegration, MultimediaFallbackFeature } from './MultimediaIntegration';
import { FeatureRegistry } from '../features/FeatureRegistry';

console.log('Starting multimedia integration validation...');

// Test 1: Check if multimedia integration is available
console.log('1. Testing multimedia availability:');
console.log(`   Initial availability: ${MultimediaIntegration.isAvailable()}`);

// Test 2: Test fallback feature creation
console.log('2. Testing fallback features:');
const fallbackFeatures = [
  'video-introduction',
  'generate-podcast',
  'embed-qr-code',
  'portfolio-gallery'
] as const;

for (const featureType of fallbackFeatures) {
  try {
    const fallback = new MultimediaFallbackFeature(featureType);
    console.log(`   ✓ ${featureType} fallback created successfully`);

    // Test generate method
    const content = await fallback.generate({
      personalInfo: { name: 'Test User' }
    } as any, 'test-job-id', {});

    console.log(`   ✓ ${featureType} fallback generates content: ${content.length} chars`);
  } catch (error) {
    console.log(`   ✗ ${featureType} fallback failed:`, error);
  }
}

// Test 3: Test FeatureRegistry integration
console.log('3. Testing FeatureRegistry integration:');
try {
  const supportedTypes = FeatureRegistry.getSupportedTypes();
  console.log(`   ✓ Supported feature types: ${supportedTypes.length}`);

  // Test multimedia feature creation through registry
  const multimediaTypes = ['video-introduction', 'generate-podcast', 'embed-qr-code', 'portfolio-gallery'];

  for (const type of multimediaTypes) {
    if (FeatureRegistry.isSupported(type)) {
      console.log(`   ✓ ${type} is supported by registry`);
    } else {
      console.log(`   ✗ ${type} is not supported by registry`);
    }
  }
} catch (error) {
  console.log('   ✗ FeatureRegistry integration failed:', error);
}

console.log('Multimedia integration validation completed.');

export {};