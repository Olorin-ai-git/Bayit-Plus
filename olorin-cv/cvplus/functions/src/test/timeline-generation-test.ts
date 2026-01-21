/**
 * Timeline Generation Test
 * Comprehensive test to identify and fix timeline generation 500 errors
  */

import { timelineGenerationService } from '../services/timeline-generation.service';
import { SafeFirestoreService } from '../utils/safe-firestore.service';
import { FirestoreValidationService } from '../utils/firestore-validation.service';
import * as admin from 'firebase-admin';

// Mock ParsedCV data for testing
const mockParsedCV = {
  personalInfo: {
    name: 'John Doe',
    email: 'john@example.com'
  },
  experience: [
    {
      position: 'Senior Software Engineer',
      company: 'Tech Corp',
      duration: '2020 - 2023',
      startDate: '2020-01-01',
      endDate: '2023-12-31',
      description: 'Led development of web applications',
      achievements: ['Improved performance by 50%', 'Led team of 5 developers'],
      technologies: ['React', 'Node.js', 'TypeScript']
    },
    {
      position: 'Software Engineer',
      company: 'StartupCo',
      duration: '2018 - 2019',
      startDate: '2018-06-01',
      endDate: '2019-12-31',
      description: 'Full-stack development'
    }
  ],
  education: [
    {
      degree: 'Bachelor of Science',
      field: 'Computer Science',
      institution: 'University of Tech',
      graduationDate: '2018-05-31',
      startDate: '2014-09-01',
      endDate: '2018-05-31',
      gpa: '3.8'
    }
  ],
  certifications: [
    {
      name: 'AWS Certified Developer',
      issuer: 'Amazon Web Services',
      date: '2021-03-15',
      credentialId: 'AWS-123456'
    }
  ],
  achievements: [
    'Winner of Best Innovation Award at Tech Corp 2022',
    'Published research paper on AI algorithms 2021'
  ],
  skills: {
    technical: ['JavaScript', 'Python', 'React', 'Node.js'],
    soft: ['Leadership', 'Communication'],
    tools: ['Git', 'Docker', 'AWS']
  }
};

/**
 * Test timeline generation end-to-end
  */
async function testTimelineGeneration() {
  console.log('\n=== TIMELINE GENERATION TEST ===');
  
  try {
    console.log('1. Testing timeline generation service...');
    
    // Test the timeline generation
    const timelineData = await timelineGenerationService.generateTimeline(mockParsedCV, 'test-job-123');
    
    console.log('✅ Timeline generated successfully');
    console.log('Events:', timelineData.events.length);
    console.log('Summary:', timelineData.summary);
    console.log('Insights:', timelineData.insights);
    
    // Test data validation
    console.log('\n2. Testing Firestore validation...');
    const validation = FirestoreValidationService.validateForFirestore(
      timelineData,
      'timeline-test',
      'update',
      {
        strict: false,
        sanitizeOnValidation: true,
        allowUndefined: false,
        allowNullValues: true
      }
    );
    
    console.log('Validation result:');
    console.log('- Valid:', validation.isValid);
    console.log('- Errors:', validation.errors.length);
    console.log('- Warnings:', validation.warnings.length);
    console.log('- Undefined fields removed:', validation.validationContext.undefinedFieldsRemoved);
    
    if (validation.errors.length > 0) {
      console.log('❌ Validation errors:');
      validation.errors.forEach((error, index) => {
        console.log(`  ${index + 1}. ${error}`);
      });
    }
    
    if (validation.warnings.length > 0) {
      console.log('⚠️  Validation warnings:');
      validation.warnings.forEach((warning, index) => {
        console.log(`  ${index + 1}. ${warning}`);
      });
    }
    
    // Test JSON serialization (common source of errors)
    console.log('\n3. Testing JSON serialization...');
    const jsonString = JSON.stringify(timelineData);
    const hasUndefined = jsonString.includes('undefined');
    
    if (hasUndefined) {
      console.log('❌ Timeline data contains undefined values after serialization');
      
      // Find undefined values
      const findUndefined = (obj: any, path = ''): string[] => {
        const issues: string[] = [];
        if (obj === undefined) {
          issues.push(`${path}: undefined value`);
        } else if (obj && typeof obj === 'object') {
          for (const [key, value] of Object.entries(obj)) {
            const currentPath = path ? `${path}.${key}` : key;
            issues.push(...findUndefined(value, currentPath));
          }
        }
        return issues;
      };
      
      const undefinedPaths = findUndefined(timelineData);
      console.log('Undefined value locations:');
      undefinedPaths.forEach(path => console.log(`  - ${path}`));
    } else {
      console.log('✅ No undefined values found in serialized data');
    }
    
    // Test timeline update structure
    console.log('\n4. Testing timeline update structure...');
    const timelineUpdateData = {
      'enhancedFeatures.timeline.status': 'completed',
      'enhancedFeatures.timeline.progress': 100,
      'enhancedFeatures.timeline.data': timelineData,
      'enhancedFeatures.timeline.processedAt': admin.firestore.FieldValue.serverTimestamp()
    };
    
    const updateValidation = FirestoreValidationService.validateForFirestore(
      timelineUpdateData,
      'timeline-update-test',
      'update',
      {
        strict: false,
        sanitizeOnValidation: true,
        allowUndefined: false,
        allowNullValues: true
      }
    );
    
    console.log('Update validation result:');
    console.log('- Valid:', updateValidation.isValid);
    console.log('- Errors:', updateValidation.errors.length);
    console.log('- Warnings:', updateValidation.warnings.length);
    
    if (updateValidation.errors.length > 0) {
      console.log('❌ Update validation errors:');
      updateValidation.errors.forEach((error, index) => {
        console.log(`  ${index + 1}. ${error}`);
      });
    }
    
    // Test specific problem areas
    console.log('\n5. Testing specific problem areas...');
    
    // Test date handling
    const dateIssues = timelineData.events.filter(event => {
      try {
        new Date(event.startDate).toISOString();
        if (event.endDate) {
          new Date(event.endDate).toISOString();
        }
        return false;
      } catch {
        return true;
      }
    });
    
    if (dateIssues.length > 0) {
      console.log(`❌ Found ${dateIssues.length} events with invalid dates`);
      dateIssues.forEach((event, index) => {
        console.log(`  ${index + 1}. Event ${event.id}: startDate=${event.startDate}, endDate=${event.endDate}`);
      });
    } else {
      console.log('✅ All event dates are valid ISO strings');
    }
    
    // Test field completeness
    const incompleteEvents = timelineData.events.filter(event => 
      !event.id || !event.type || !event.title || !event.organization || !event.startDate
    );
    
    if (incompleteEvents.length > 0) {
      console.log(`❌ Found ${incompleteEvents.length} incomplete events`);
      incompleteEvents.forEach((event, index) => {
        console.log(`  ${index + 1}. Event missing required fields:`, {
          hasId: !!event.id,
          hasType: !!event.type,
          hasTitle: !!event.title,
          hasOrganization: !!event.organization,
          hasStartDate: !!event.startDate
        });
      });
    } else {
      console.log('✅ All events have required fields');
    }
    
    console.log('\n=== TIMELINE TEST COMPLETED ===');
    return {
      success: true,
      timelineData,
      validationResult: validation,
      updateValidationResult: updateValidation
    };
    
  } catch (error: any) {
    console.error('❌ Timeline generation test failed:', error);
    console.error('Error details:');
    console.error('- Message:', error.message);
    console.error('- Stack:', error.stack);
    
    return {
      success: false,
      error: error.message,
      stack: error.stack
    };
  }
}

/**
 * Test SafeFirestoreService operations
  */
async function testSafeFirestoreOperations() {
  console.log('\n=== SAFE FIRESTORE TEST ===');
  
  try {
    // Test data that might cause issues
    const problematicData = {
      'enhancedFeatures.timeline.data': {
        events: [
          {
            id: 'test-1',
            type: 'work',
            title: 'Test Position',
            organization: 'Test Company',
            startDate: new Date().toISOString(),
            undefinedField: undefined, // This should be removed
            nullField: null, // This should be kept
            description: 'Valid description'
          }
        ],
        summary: {
          totalYearsExperience: 5,
          companiesWorked: 2,
          degreesEarned: 1,
          certificationsEarned: 1,
          careerHighlights: ['Test highlight']
        },
        insights: {
          careerProgression: 'Steady growth',
          industryFocus: ['Technology'],
          skillEvolution: 'Continuous learning',
          nextSteps: ['Senior role']
        }
      },
      'enhancedFeatures.timeline.status': 'completed',
      'enhancedFeatures.timeline.progress': 100
    };
    
    console.log('Testing SafeFirestoreService validation...');
    
    const result = SafeFirestoreService.createSafeTimelineUpdate(problematicData);
    
    console.log('Safe timeline update result:');
    console.log('- Validation passed:', result.validation.isValid);
    console.log('- Errors:', result.validation.errors.length);
    console.log('- Warnings:', result.validation.warnings.length);
    console.log('- Undefined fields removed:', result.validation.validationContext.undefinedFieldsRemoved);
    
    // Check if undefined fields were properly removed
    const serialized = JSON.stringify(result.data);
    const hasUndefined = serialized.includes('undefined');
    
    if (hasUndefined) {
      console.log('❌ Sanitized data still contains undefined values');
    } else {
      console.log('✅ All undefined values successfully removed');
    }
    
    console.log('\n=== SAFE FIRESTORE TEST COMPLETED ===');
    return { success: true, result };
    
  } catch (error: any) {
    console.error('❌ Safe Firestore test failed:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Main test execution
  */
async function runTests() {
  console.log('Starting Timeline Generation Diagnostic Tests...');
  console.log('='.repeat(50));
  
  const results = {
    timelineGeneration: await testTimelineGeneration(),
    safeFirestore: await testSafeFirestoreOperations()
  };
  
  console.log('\n' + '='.repeat(50));
  console.log('TEST SUMMARY:');
  console.log('- Timeline Generation:', results.timelineGeneration.success ? '✅ PASSED' : '❌ FAILED');
  console.log('- Safe Firestore:', results.safeFirestore.success ? '✅ PASSED' : '❌ FAILED');
  
  if (!results.timelineGeneration.success) {
    console.log('\nTimeline Generation Error:', results.timelineGeneration.error);
  }
  
  if (!results.safeFirestore.success) {
    console.log('\nSafe Firestore Error:', results.safeFirestore.error);
  }
  
  return results;
}

// Export the test functions
export { testTimelineGeneration, testSafeFirestoreOperations, runTests };

// For direct execution
if (require.main === module) {
  runTests().then(() => {
    console.log('\nTests completed');
    process.exit(0);
  }).catch(error => {
    console.error('Test execution failed:', error);
    process.exit(1);
  });
}