// @ts-nocheck
/**
 * Test script to verify that CV recommendations no longer contain fabricated metrics
 * This test ensures that the AI hallucination issue has been resolved
  */

import { CVTransformationService } from '../services/cv-transformation.service';
import { ParsedCV } from '../types/job';

// Mock parsed CV for testing
const mockCV: ParsedCV = {
  personalInfo: {
    name: 'John Doe',
    email: 'john@example.com',
    phone: '+1-555-0123',
    location: 'New York, NY'
  },
  experience: [
    {
      company: 'Tech Company',
      position: 'Software Developer',
      startDate: '2020-01',
      endDate: '2023-12',
      description: 'Responsible for managing team and developing software projects'
    }
  ],
  skills: ['JavaScript', 'React', 'Node.js'],
  education: [
    {
      institution: 'University',
      degree: 'Computer Science',
      startDate: '2016-09',
      endDate: '2020-05'
    }
  ]
};

/**
 * Tests that recommendations don't contain fabricated specific metrics
  */
async function testRecommendationHallucination() {
  console.log('🧪 Testing recommendation hallucination fix...');
  
  const transformationService = new CVTransformationService();
  
  try {
    // Generate recommendations
    const recommendations = await transformationService.generateDetailedRecommendations(
      mockCV,
      'Senior Software Engineer',
      ['React', 'TypeScript', 'AWS']
    );
    
    console.log(`📊 Generated ${recommendations.length} recommendations`);
    
    // Check for fabricated metrics patterns
    const fabricatedPatterns = [
      /\d+M\+/,  // 45M+, 2M+, etc.
      /\$\d+M/,  // $8M, $2.3M, etc.
      /\d+% accuracy/,  // 92% accuracy
      /team of \d+ developers/,  // team of 12 developers
      /worth \$\d+[\.\d]*[KM]/,  // worth $2.3M
      /\d+% improvement.*efficiency/,  // 25% improvement in operational efficiency
      /\d+ weeks? ahead of schedule/,  // 2 weeks ahead of schedule
      /\d+% cost savings/  // 15% cost savings
    ];
    
    let fabricatedCount = 0;
    const fabricatedRecs: any[] = [];
    
    recommendations.forEach(rec => {
      const content = (rec.suggestedContent || '') + ' ' + (rec.description || '');
      
      fabricatedPatterns.forEach(pattern => {
        if (pattern.test(content)) {
          fabricatedCount++;
          fabricatedRecs.push({
            id: rec.id,
            title: rec.title,
            content,
            pattern: pattern.toString()
          });
        }
      });
    });
    
    console.log('\n=== HALLUCINATION TEST RESULTS ===');
    
    if (fabricatedCount === 0) {
      console.log('✅ SUCCESS: No fabricated metrics found in recommendations!');
      console.log('✅ AI hallucination issue has been resolved');
      
      // Show examples of proper placeholder usage
      const placeholderExamples = recommendations.filter(rec => 
        (rec.suggestedContent || '').includes('[INSERT') || 
        (rec.suggestedContent || '').includes('[ADD')
      );
      
      if (placeholderExamples.length > 0) {
        console.log(`\n✅ Found ${placeholderExamples.length} recommendations using proper placeholders:`);
        placeholderExamples.slice(0, 3).forEach(rec => {
          console.log(`  - ${rec.title}: "${rec.suggestedContent?.substring(0, 100)}..."`);
        });
      }
    } else {
      console.log(`❌ FAILURE: Found ${fabricatedCount} instances of fabricated metrics:`);
      fabricatedRecs.forEach(rec => {
        console.log(`  - ${rec.id}: ${rec.title}`);
        console.log(`    Pattern: ${rec.pattern}`);
        console.log(`    Content: "${rec.content.substring(0, 150)}..."`);
        console.log('');
      });
    }
    
    console.log('==================================\n');
    
    return fabricatedCount === 0;
    
  } catch (error) {
    console.error('❌ Test failed with error:', error);
    return false;
  }
}

/**
 * Tests that fallback recommendations also don't contain fabricated metrics
  */
function testFallbackRecommendations() {
  console.log('🧪 Testing fallback recommendations...');
  
  const transformationService = new CVTransformationService();
  
  // Access the private method for testing (TypeScript will complain but it will work)
  const fallbackRecs = (transformationService as any).generateFallbackRecommendations(mockCV);
  
  console.log(`📊 Generated ${fallbackRecs.length} fallback recommendations`);
  
  const fabricatedPatterns = [
    /team of \d+ members/,
    /\d+% productivity/,
    /\d+ weeks?.*time/
  ];
  
  let fabricatedCount = 0;
  
  fallbackRecs.forEach((rec: any) => {
    const content = (rec.suggestedContent || '') + ' ' + (rec.description || '');
    
    fabricatedPatterns.forEach((pattern: RegExp) => {
      if (pattern.test(content)) {
        fabricatedCount++;
        console.log(`❌ Found fabricated metric in fallback: ${pattern} in "${content}"`);
      }
    });
  });
  
  if (fabricatedCount === 0) {
    console.log('✅ SUCCESS: No fabricated metrics in fallback recommendations!');
  }
  
  return fabricatedCount === 0;
}

// Run the tests if this file is executed directly
if (require.main === module) {
  async function runTests() {
    console.log('🚀 Starting CV Recommendation Hallucination Tests\n');
    
    const test1 = await testRecommendationHallucination();
    const test2 = testFallbackRecommendations();
    
    console.log('\n📋 FINAL TEST SUMMARY:');
    console.log(`Recommendation Generation Test: ${test1 ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`Fallback Recommendations Test: ${test2 ? '✅ PASS' : '❌ FAIL'}`);
    
    if (test1 && test2) {
      console.log('\n🎉 ALL TESTS PASSED! Hallucination issue has been resolved.');
    } else {
      console.log('\n⚠️  Some tests failed. Additional fixes may be needed.');
    }
  }
  
  runTests().catch(console.error);
}

export { testRecommendationHallucination, testFallbackRecommendations };