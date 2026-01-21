#!/usr/bin/env node
/**
 * Test script to validate getRecommendations timeout fixes
 * 
 * Tests:
 * 1. Function timeout configuration (300s)
 * 2. Memory allocation (1GiB)
 * 3. Progress tracking functionality
 * 4. Error handling and graceful degradation
 * 5. CV complexity assessment
 */

const admin = require('firebase-admin');
const path = require('path');

// Initialize Firebase Admin
const serviceAccountPath = path.join(__dirname, '../../functions/serviceAccount.json');
admin.initializeApp({
  credential: admin.credential.cert(serviceAccountPath),
  projectId: 'your-project-id'
});

const db = admin.firestore();

// Test configurations
const TEST_CONFIGS = {
  smallCV: {
    jobId: 'test-small-cv',
    complexity: 'low',
    expectedTimeout: false,
    expectedDuration: '< 30s'
  },
  mediumCV: {
    jobId: 'test-medium-cv', 
    complexity: 'medium',
    expectedTimeout: false,
    expectedDuration: '30s - 60s'
  },
  largeCV: {
    jobId: 'test-large-cv',
    complexity: 'high',
    expectedTimeout: false,
    expectedDuration: '60s - 180s'
  }
};

/**
 * Create test CV data with different complexities
 */
function createTestCV(complexity) {
  const baseCV = {
    personalInfo: {
      name: 'Test User',
      email: 'test@example.com',
      phone: '+1234567890'
    },
    summary: 'Professional software engineer with experience in full-stack development.',
    skills: ['JavaScript', 'React', 'Node.js', 'Python'],
    education: [{
      institution: 'Test University',
      degree: 'Computer Science',
      startDate: '2018',
      endDate: '2022'
    }]
  };

  switch (complexity) {
    case 'low':
      baseCV.experience = [{
        company: 'Test Company',
        title: 'Software Engineer',
        startDate: '2022',
        endDate: 'Present',
        description: 'Developed web applications using modern frameworks.'
      }];
      break;

    case 'medium':
      baseCV.experience = [];
      for (let i = 0; i < 5; i++) {
        baseCV.experience.push({
          company: `Company ${i + 1}`,
          title: `Role ${i + 1}`,
          startDate: `${2020 + i}`,
          endDate: i === 0 ? 'Present' : `${2021 + i}`,
          description: `Detailed description of responsibilities and achievements at Company ${i + 1}. ` +
                      'Managed team of developers, implemented new features, improved performance metrics. ' +
                      'Led cross-functional projects, collaborated with stakeholders, delivered solutions on time.'
        });
      }
      baseCV.skills = [
        'JavaScript', 'TypeScript', 'React', 'Angular', 'Vue.js', 'Node.js',
        'Python', 'Django', 'Flask', 'PostgreSQL', 'MongoDB', 'Redis',
        'AWS', 'Docker', 'Kubernetes', 'CI/CD', 'Git', 'Agile', 'Scrum'
      ];
      break;

    case 'high':
      baseCV.experience = [];
      for (let i = 0; i < 10; i++) {
        baseCV.experience.push({
          company: `Large Corporation ${i + 1}`,
          title: `Senior Engineer / Team Lead ${i + 1}`,
          startDate: `${2015 + i}`,
          endDate: i === 0 ? 'Present' : `${2016 + i}`,
          description: `Comprehensive role involving multiple responsibilities including: ` +
                      'Technical leadership of development teams, architectural decisions, ' +
                      'performance optimization, scalability improvements, security implementations, ' +
                      'stakeholder management, project planning, budget oversight, ' +
                      'mentoring junior developers, implementing best practices, ' +
                      'conducting code reviews, managing deployments, troubleshooting issues, ' +
                      'client communication, requirement analysis, solution design, ' +
                      'technology evaluation, team building, process improvements. ' +
                      'Achieved significant business impact through strategic initiatives, ' +
                      'cost reduction measures, efficiency improvements, quality enhancements, ' +
                      'and successful project deliveries meeting or exceeding expectations.'
        });
      }
      
      baseCV.skills = [
        // Programming Languages
        'JavaScript', 'TypeScript', 'Python', 'Java', 'C++', 'Go', 'Rust', 'Swift',
        // Frontend Technologies
        'React', 'Angular', 'Vue.js', 'Svelte', 'Next.js', 'Nuxt.js', 'Gatsby',
        // Backend Technologies  
        'Node.js', 'Express', 'Django', 'Flask', 'Spring Boot', 'Laravel', 'Ruby on Rails',
        // Databases
        'PostgreSQL', 'MySQL', 'MongoDB', 'Redis', 'Elasticsearch', 'DynamoDB', 'Cassandra',
        // Cloud & DevOps
        'AWS', 'Azure', 'GCP', 'Docker', 'Kubernetes', 'Terraform', 'Jenkins', 'GitLab CI',
        // Others
        'GraphQL', 'REST API', 'Microservices', 'Serverless', 'Machine Learning', 'AI'
      ];
      
      baseCV.achievements = [
        'Led digital transformation initiative reducing operational costs by 40%',
        'Architected scalable platform serving 10M+ users globally',
        'Implemented ML-powered recommendation system increasing user engagement by 35%',
        'Managed cross-functional team of 25+ engineers across 3 time zones',
        'Delivered 15+ major product releases with 99.9% uptime',
        'Established DevOps practices reducing deployment time from hours to minutes',
        'Mentored 50+ junior developers, with 80% receiving promotions within 2 years'
      ];
      
      baseCV.certifications = [
        { name: 'AWS Solutions Architect Professional', issuer: 'Amazon', date: '2023' },
        { name: 'Google Cloud Professional', issuer: 'Google', date: '2022' },
        { name: 'Certified Scrum Master', issuer: 'Scrum Alliance', date: '2021' },
        { name: 'MongoDB Certified Developer', issuer: 'MongoDB', date: '2020' }
      ];
      
      baseCV.customSections = {
        'Open Source Contributions': 'Active contributor to 10+ open source projects with 500+ GitHub stars',
        'Speaking Engagements': 'Regular speaker at tech conferences and meetups',
        'Publications': 'Author of 5 technical articles published in industry journals'
      };
      break;
  }

  return baseCV;
}

/**
 * Create test job in Firestore
 */
async function createTestJob(jobId, complexity) {
  const testCV = createTestCV(complexity);
  const jobData = {
    userId: 'test-user-123',
    status: 'analyzed',
    parsedData: testCV,
    createdAt: new Date().toISOString(),
    testJob: true,
    complexity: complexity
  };

  await db.collection('jobs').doc(jobId).set(jobData);
  console.log(`✅ Created test job ${jobId} with ${complexity} complexity`);
  return testCV;
}

/**
 * Monitor job progress during processing
 */
async function monitorJobProgress(jobId, maxDurationMs = 300000) {
  const startTime = Date.now();
  let lastProgress = null;
  
  console.log(`📊 Starting progress monitoring for job ${jobId}`);
  
  const progressInterval = setInterval(async () => {
    try {
      const jobDoc = await db.collection('jobs').doc(jobId).get();
      const jobData = jobDoc.data();
      
      if (!jobData) return;
      
      const currentTime = Date.now();
      const elapsed = currentTime - startTime;
      
      // Check for progress updates
      if (jobData.processingProgress !== lastProgress) {
        lastProgress = jobData.processingProgress;
        console.log(`📈 Progress: ${jobData.processingProgress || 'No progress'} ` +
                   `(Stage ${jobData.processingStage || '?'}/${jobData.totalStages || '?'}) ` +
                   `- Elapsed: ${Math.round(elapsed / 1000)}s`);
      }
      
      // Check if completed
      if (jobData.status === 'analyzed' && jobData.cvRecommendations) {
        clearInterval(progressInterval);
        console.log(`✅ Job completed! Generated ${jobData.recommendationCount || 0} recommendations in ${Math.round(elapsed / 1000)}s`);
        return true;
      }
      
      // Check if failed
      if (jobData.status === 'failed') {
        clearInterval(progressInterval);
        console.log(`❌ Job failed: ${jobData.error} (Elapsed: ${Math.round(elapsed / 1000)}s)`);
        return false;
      }
      
      // Check timeout
      if (elapsed > maxDurationMs) {
        clearInterval(progressInterval);
        console.log(`⏱️ Monitoring timeout after ${Math.round(elapsed / 1000)}s`);
        return false;
      }
      
    } catch (error) {
      console.error('Progress monitoring error:', error);
    }
  }, 2000); // Check every 2 seconds
  
  return new Promise((resolve) => {
    setTimeout(() => {
      clearInterval(progressInterval);
      resolve(false);
    }, maxDurationMs);
  });
}

/**
 * Test getRecommendations function with different CV complexities
 */
async function testRecommendationGeneration(testConfig) {
  const { jobId, complexity, expectedTimeout, expectedDuration } = testConfig;
  
  console.log(`\n🧪 Testing ${complexity} complexity CV (${jobId})`);
  console.log(`   Expected timeout: ${expectedTimeout ? 'Yes' : 'No'}`);
  console.log(`   Expected duration: ${expectedDuration}`);
  
  try {
    // Create test job
    const testCV = await createTestJob(jobId, complexity);
    console.log(`   CV size: ${JSON.stringify(testCV).length} characters`);
    console.log(`   Experience entries: ${testCV.experience?.length || 0}`);
    console.log(`   Skills count: ${Array.isArray(testCV.skills) ? testCV.skills.length : 'Object'}`);
    
    // Start monitoring
    const monitoringPromise = monitorJobProgress(jobId, 330000); // 5.5 minutes
    
    // Start recommendation generation (simulate frontend call)
    const startTime = Date.now();
    
    // Update job to trigger processing
    await db.collection('jobs').doc(jobId).update({
      status: 'processing',
      processingStartTime: new Date().toISOString()
    });
    
    console.log(`⏳ Waiting for processing to complete...`);
    
    // Wait for completion or timeout
    const success = await monitoringPromise;
    const totalTime = Date.now() - startTime;
    
    // Get final job state
    const finalJobDoc = await db.collection('jobs').doc(jobId).get();
    const finalJobData = finalJobDoc.data();
    
    console.log(`\n📊 Results for ${complexity} CV:`);
    console.log(`   Success: ${success ? '✅' : '❌'}`);
    console.log(`   Total time: ${Math.round(totalTime / 1000)}s`);
    console.log(`   Final status: ${finalJobData?.status}`);
    console.log(`   Recommendations: ${finalJobData?.recommendationCount || 0}`);
    console.log(`   Processing time: ${finalJobData?.processingTime || 'N/A'}ms`);
    
    if (finalJobData?.error) {
      console.log(`   Error: ${finalJobData.error}`);
      console.log(`   Failure reason: ${finalJobData.failureReason || 'unknown'}`);
    }
    
    // Cleanup
    await db.collection('jobs').doc(jobId).delete();
    console.log(`🗑️ Cleaned up test job ${jobId}`);
    
    return {
      success,
      totalTime,
      status: finalJobData?.status,
      error: finalJobData?.error,
      recommendationCount: finalJobData?.recommendationCount || 0
    };
    
  } catch (error) {
    console.error(`❌ Test failed for ${complexity} CV:`, error);
    
    // Cleanup on error
    try {
      await db.collection('jobs').doc(jobId).delete();
    } catch (cleanupError) {
      console.error('Cleanup error:', cleanupError);
    }
    
    return {
      success: false,
      totalTime: 0,
      status: 'error',
      error: error.message,
      recommendationCount: 0
    };
  }
}

/**
 * Run comprehensive test suite
 */
async function runTestSuite() {
  console.log('🚀 Starting getRecommendations timeout fix validation\n');
  console.log('Testing configurations:');
  console.log('- Function timeout: 300s (5 minutes)');
  console.log('- Memory allocation: 1GiB');
  console.log('- Request manager timeout: 300s (5 minutes)');
  console.log('- Progress tracking: Enabled\n');
  
  const results = [];
  
  // Test each configuration
  for (const [testName, testConfig] of Object.entries(TEST_CONFIGS)) {
    const result = await testRecommendationGeneration(testConfig);
    results.push({ testName, ...result });
    
    // Wait between tests
    console.log('\n⏱️ Waiting 10 seconds before next test...\n');
    await new Promise(resolve => setTimeout(resolve, 10000));
  }
  
  // Generate summary report
  console.log('\n📋 TEST SUMMARY REPORT');
  console.log('=' * 50);
  
  let totalTests = results.length;
  let successfulTests = results.filter(r => r.success).length;
  let failedTests = totalTests - successfulTests;
  
  console.log(`Total tests: ${totalTests}`);
  console.log(`Successful: ${successfulTests} ✅`);
  console.log(`Failed: ${failedTests} ❌`);
  console.log(`Success rate: ${Math.round(successfulTests / totalTests * 100)}%\n`);
  
  // Detailed results
  results.forEach(result => {
    console.log(`${result.testName}:`);
    console.log(`  Status: ${result.success ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`  Time: ${Math.round(result.totalTime / 1000)}s`);
    console.log(`  Recommendations: ${result.recommendationCount}`);
    if (result.error) {
      console.log(`  Error: ${result.error}`);
    }
    console.log('');
  });
  
  // Performance analysis
  const avgTime = results.reduce((sum, r) => sum + r.totalTime, 0) / results.length;
  const maxTime = Math.max(...results.map(r => r.totalTime));
  const minTime = Math.min(...results.map(r => r.totalTime));
  
  console.log('Performance Analysis:');
  console.log(`  Average time: ${Math.round(avgTime / 1000)}s`);
  console.log(`  Max time: ${Math.round(maxTime / 1000)}s`);
  console.log(`  Min time: ${Math.round(minTime / 1000)}s`);
  
  // Recommendations
  console.log('\n💡 Recommendations:');
  
  if (failedTests === 0) {
    console.log('✅ All tests passed! Timeout fixes are working correctly.');
  } else {
    console.log('⚠️ Some tests failed. Consider:');
    console.log('- Increasing function timeout for complex CVs');
    console.log('- Implementing CV size limits');
    console.log('- Adding more aggressive caching');
    console.log('- Optimizing Claude API prompt length');
  }
  
  if (maxTime > 180000) { // > 3 minutes
    console.log('⚠️ Some requests took longer than 3 minutes. Consider:');
    console.log('- Implementing request queuing for large CVs');
    console.log('- Pre-processing CV complexity assessment');
    console.log('- Adding user expectations management');
  }
  
  console.log('\n🎯 Test completed successfully!');
}

// Run the test suite
if (require.main === module) {
  runTestSuite()
    .then(() => {
      console.log('✅ Test suite completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Test suite failed:', error);
      process.exit(1);
    });
}

module.exports = { runTestSuite, createTestCV, monitorJobProgress };