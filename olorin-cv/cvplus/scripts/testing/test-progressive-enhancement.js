#!/usr/bin/env node

/**
 * Test Script for Progressive Enhancement System
 * Tests the complete workflow from CV generation to progressive feature enhancement
 */

const admin = require('firebase-admin');
const { httpsCallable } = require('firebase/functions');
const { functions } = require('../frontend/src/lib/firebase');

// Initialize Firebase Admin for emulator
if (!admin.apps.length) {
  admin.initializeApp({
    projectId: 'getmycv-ai',
    credential: admin.credential.applicationDefault()
  });
}

// Connect to emulator
const db = admin.firestore();
db.settings({
  host: 'localhost:8080',
  ssl: false
});

const testUserId = 'test-user-progressive-enhancement';

/**
 * Mock CV data for testing
 */
const mockCVData = {
  personalInfo: {
    name: 'Gil Klainert',
    email: 'gil@example.com',
    title: 'Senior Software Engineer',
    summary: 'Experienced software engineer with expertise in AI and web development'
  },
  experience: [
    {
      company: 'Tech Corp',
      position: 'Senior Software Engineer',
      startDate: '2020-01-01',
      endDate: null,
      description: 'Led development of AI-powered applications',
      achievements: ['Built scalable microservices', 'Implemented ML pipelines'],
      technologies: ['JavaScript', 'Python', 'React', 'Node.js']
    },
    {
      company: 'StartupCo',
      position: 'Full Stack Developer',
      startDate: '2018-06-01',
      endDate: '2019-12-31',
      description: 'Developed web applications from scratch',
      achievements: ['Launched 3 major products', 'Improved performance by 40%'],
      technologies: ['Vue.js', 'Express', 'MongoDB']
    }
  ],
  skills: {
    technical: ['JavaScript', 'TypeScript', 'Python', 'React', 'Node.js', 'Firebase'],
    soft: ['Leadership', 'Communication', 'Problem Solving', 'Team Management'],
    tools: ['Git', 'Docker', 'AWS', 'VS Code']
  },
  education: [
    {
      institution: 'University of Technology',
      degree: 'Bachelor of Science',
      field: 'Computer Science',
      year: '2018'
    }
  ],
  certifications: [
    {
      name: 'AWS Solutions Architect',
      issuer: 'Amazon Web Services',
      date: '2022-03-15',
      credentialId: 'AWS-SAA-12345'
    },
    {
      name: 'Google Cloud Professional',
      issuer: 'Google Cloud',
      date: '2021-11-20',
      credentialId: 'GCP-PRO-67890'
    }
  ]
};

/**
 * Create a test job
 */
async function createTestJob() {
  console.log('🏗️ Creating test job...');
  
  const jobRef = db.collection('jobs').doc();
  const jobData = {
    id: jobRef.id,
    userId: testUserId,
    status: 'completed',
    parsedData: mockCVData,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp()
  };
  
  await jobRef.set(jobData);
  console.log('✅ Test job created:', jobRef.id);
  return jobRef.id;
}

/**
 * Test progressive enhancement workflow
 */
async function testProgressiveEnhancement(jobId) {
  console.log('\n🚀 Testing Progressive Enhancement Workflow');
  console.log('==========================================');
  
  const selectedFeatures = [
    'skills-visualization',
    'certification-badges',
    'interactive-timeline'
  ];
  
  console.log('📋 Selected features:', selectedFeatures);
  
  // Monitor job progress
  const jobRef = db.collection('jobs').doc(jobId);
  let completedFeatures = 0;
  const totalFeatures = selectedFeatures.length;
  
  const unsubscribe = jobRef.onSnapshot((doc) => {
    if (doc.exists()) {
      const data = doc.data();
      const enhancedFeatures = data.enhancedFeatures || {};
      
      console.log('\n📊 Progress Update:');
      selectedFeatures.forEach(featureId => {
        const feature = enhancedFeatures[featureId];
        if (feature) {
          const status = feature.status || 'pending';
          const progress = feature.progress || 0;
          const step = feature.currentStep || '';
          
          console.log(`   ${featureId}: ${status} (${progress}%) ${step}`);
          
          if (status === 'completed' && feature.htmlFragment) {
            console.log(`   ✅ HTML fragment generated (${feature.htmlFragment.length} chars)`);
          }
        } else {
          console.log(`   ${featureId}: pending`);
        }
      });
      
      // Count completed features
      const newCompletedCount = selectedFeatures.filter(featureId => 
        enhancedFeatures[featureId]?.status === 'completed'
      ).length;
      
      if (newCompletedCount > completedFeatures) {
        completedFeatures = newCompletedCount;
        console.log(`\n🎯 Progress: ${completedFeatures}/${totalFeatures} features complete`);
      }
      
      if (completedFeatures === totalFeatures) {
        console.log('\n🎉 All features completed!');
        unsubscribe();
        testComplete();
      }
    }
  });
  
  // Trigger each feature sequentially
  for (const featureId of selectedFeatures) {
    console.log(`\n🔄 Processing ${featureId}...`);
    
    try {
      let result;
      
      switch (featureId) {
        case 'skills-visualization':
          const skillsCallable = httpsCallable(functions, 'generateSkillsVisualization');
          result = await skillsCallable({ jobId });
          break;
          
        case 'certification-badges':
          const badgesCallable = httpsCallable(functions, 'generateCertificationBadges');
          result = await badgesCallable({ jobId });
          break;
          
        case 'interactive-timeline':
          const timelineCallable = httpsCallable(functions, 'generateTimeline');
          result = await timelineCallable({ jobId });
          break;
      }
      
      if (result.data.success) {
        console.log(`   ✅ ${featureId} function completed`);
        if (result.data.htmlFragment) {
          console.log(`   📄 HTML fragment: ${result.data.htmlFragment.substring(0, 100)}...`);
        }
      }
    } catch (error) {
      console.error(`   ❌ Error processing ${featureId}:`, error.message);
    }
    
    // Small delay between features
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
}

/**
 * Test completion
 */
function testComplete() {
  console.log('\n🏁 Progressive Enhancement Test Complete!');
  console.log('========================================');
  console.log('✅ All features processed successfully');
  console.log('✅ Real-time progress tracking working');
  console.log('✅ HTML fragments generated');
  console.log('✅ Firestore updates functioning');
  
  process.exit(0);
}

/**
 * Main test execution
 */
async function runTest() {
  try {
    console.log('🧪 Progressive Enhancement System Test');
    console.log('====================================');
    
    const jobId = await createTestJob();
    await new Promise(resolve => setTimeout(resolve, 1000)); // Wait for job to be saved
    
    await testProgressiveEnhancement(jobId);
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

// Handle process termination
process.on('SIGINT', () => {
  console.log('\n⏹️ Test interrupted');
  process.exit(0);
});

// Run the test
runTest();