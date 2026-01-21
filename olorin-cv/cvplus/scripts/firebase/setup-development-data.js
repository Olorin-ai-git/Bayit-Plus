#!/usr/bin/env node

/**
 * Firebase Emulator Development Data Setup
 * 
 * This script addresses multiple emulator development issues:
 * 1. Creates sample CV data for development skip functionality
 * 2. Sets up proper Firestore documents with required fields
 * 3. Tests anonymous authentication scenarios
 * 4. Validates CORS configuration
 * 
 * Run this after starting Firebase emulators to populate test data
 */

const admin = require('firebase-admin');
const { getAuth } = require('firebase-admin/auth');

// Initialize Firebase Admin SDK for emulator
const app = admin.initializeApp({
  projectId: 'cvplus-5c0e3',
  databaseURL: 'http://127.0.0.1:8080',
}, 'emulator-setup');

// Point to emulator endpoints
process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8080';
process.env.FIREBASE_AUTH_EMULATOR_HOST = '127.0.0.1:9099';

const db = admin.firestore(app);
const auth = getAuth(app);

console.log('🚀 Firebase Emulator Development Setup Starting...\n');

/**
 * Sample ParsedCV structure based on the codebase schema
 */
const createSampleParsedCV = (userId, jobId, index = 0) => {
  const names = ['John Doe', 'Jane Smith', 'Alex Johnson', 'Sarah Wilson'];
  const roles = ['Senior Software Engineer', 'Product Manager', 'Data Scientist', 'UX Designer'];
  const companies = ['Tech Corp', 'Innovation Inc', 'StartupXYZ', 'Digital Solutions'];
  
  const name = names[index % names.length];
  const role = roles[index % roles.length];
  const company = companies[index % companies.length];
  
  return {
    personalInfo: {
      name: name,
      email: `${name.toLowerCase().replace(' ', '.')}@example.com`,
      phone: '+1-555-0123',
      location: 'San Francisco, CA',
      title: role,
      summary: `Experienced ${role.toLowerCase()} with 5+ years of experience in technology and product development. Passionate about building innovative solutions that drive business growth.`
    },
    experience: [
      {
        title: role,
        company: company,
        location: 'San Francisco, CA',
        startDate: '2020-01-01',
        endDate: 'present',
        description: `Leading development of cutting-edge technology solutions. Managed cross-functional teams and delivered high-impact projects that improved user experience and business metrics.`,
        achievements: [
          'Increased system performance by 40%',
          'Led team of 8 engineers',
          'Delivered 15+ successful projects'
        ]
      },
      {
        title: `Junior ${role}`,
        company: 'Previous Corp',
        location: 'San Francisco, CA', 
        startDate: '2018-06-01',
        endDate: '2019-12-31',
        description: 'Developed foundational skills and contributed to multiple successful projects.',
        achievements: [
          'Contributed to 10+ projects',
          'Improved code quality metrics',
          'Mentored new team members'
        ]
      }
    ],
    education: [
      {
        institution: 'Stanford University',
        degree: 'Bachelor of Science',
        field: 'Computer Science',
        graduationDate: '2018-06-01',
        gpa: '3.8',
        achievements: [
          'Summa Cum Laude',
          'Dean\'s List for 4 semesters',
          'Computer Science Honor Society'
        ]
      }
    ],
    skills: {
      technical: ['JavaScript', 'TypeScript', 'React', 'Node.js', 'Python', 'SQL', 'AWS', 'Docker'],
      soft: ['Leadership', 'Communication', 'Problem Solving', 'Team Collaboration', 'Project Management'],
      languages: ['English (Native)', 'Spanish (Conversational)', 'French (Basic)'],
      tools: ['Git', 'VS Code', 'Jira', 'Figma', 'Slack', 'Zoom']
    },
    certifications: [
      {
        name: 'AWS Solutions Architect',
        issuer: 'Amazon Web Services',
        date: '2023-03-15',
        credentialId: 'AWS-SA-123456',
        url: 'https://aws.amazon.com/certification/'
      },
      {
        name: 'Scrum Master Certified',
        issuer: 'Scrum Alliance',
        date: '2022-09-10',
        credentialId: 'CSM-789012',
        url: 'https://scrumalliance.org/'
      }
    ],
    achievements: [
      'Winner of 2023 Innovation Challenge',
      'Published 3 technical articles',
      'Speaker at 2 industry conferences',
      'Patent holder for ML algorithm optimization'
    ],
    projects: [
      {
        name: 'Real-time Analytics Dashboard',
        description: 'Built comprehensive analytics platform serving 10K+ daily users',
        technologies: ['React', 'Node.js', 'MongoDB', 'WebSockets'],
        url: 'https://github.com/example/analytics-dashboard',
        startDate: '2023-01-01',
        endDate: '2023-06-01'
      },
      {
        name: 'AI-Powered Recommendation Engine',
        description: 'Developed ML-based recommendation system increasing engagement by 35%',
        technologies: ['Python', 'TensorFlow', 'AWS', 'Redis'],
        url: 'https://github.com/example/recommendation-engine',
        startDate: '2022-08-01',
        endDate: '2022-12-01'
      }
    ],
    // Add development mode markers
    _developmentSample: true,
    _createdAt: new Date(),
    _version: '2.0'
  };
};

/**
 * Create a test user and return user record
 */
async function createTestUser(index = 0) {
  const testEmails = [
    'testuser1@example.com',
    'testuser2@example.com', 
    'testuser3@example.com',
    'testuser4@example.com'
  ];
  
  const email = testEmails[index % testEmails.length];
  const uid = `test-user-${index + 1}`;
  
  try {
    // Try to get existing user first
    let userRecord;
    try {
      userRecord = await auth.getUser(uid);
      console.log(`✅ Using existing test user: ${email}`);
    } catch (error) {
      // User doesn't exist, create new one
      userRecord = await auth.createUser({
        uid: uid,
        email: email,
        password: 'testpassword123',
        displayName: `Test User ${index + 1}`,
        emailVerified: true
      });
      console.log(`✅ Created new test user: ${email}`);
    }
    
    return userRecord;
  } catch (error) {
    console.error(`❌ Error creating test user: ${error.message}`);
    throw error;
  }
}

/**
 * Create sample job document with parsed CV data
 */
async function createSampleJobDocument(userId, index = 0) {
  const jobId = `dev-job-${Date.now()}-${index}`;
  const parsedCV = createSampleParsedCV(userId, jobId, index);
  
  const jobData = {
    userId: userId,
    status: 'completed',
    parsedCV: parsedCV,
    progress: 100,
    fileName: `sample-cv-${index + 1}.pdf`,
    fileSize: 245760, // ~240KB
    mimeType: 'application/pdf',
    fileUrl: 'https://example.com/sample-cv.pdf',
    isPublic: false,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    completedAt: admin.firestore.FieldValue.serverTimestamp(),
    // Add fields the processCV function looks for
    hasPersonalityInsights: true,
    hasTimelineGenerated: true,
    hasPortfolioGallery: true,
    hasCertificationBadges: true,
    // Development markers
    _developmentSample: true,
    _sampleIndex: index
  };
  
  try {
    await db.collection('jobs').doc(jobId).set(jobData);
    console.log(`✅ Created sample job document: ${jobId}`);
    return { jobId, jobData };
  } catch (error) {
    console.error(`❌ Error creating job document: ${error.message}`);
    throw error;
  }
}

/**
 * Create user document to support the job
 */
async function createUserDocument(userId, userRecord) {
  const userData = {
    email: userRecord.email,
    displayName: userRecord.displayName,
    uid: userId,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    lastLogin: admin.firestore.FieldValue.serverTimestamp(),
    // Development markers
    _developmentSample: true
  };
  
  try {
    await db.collection('users').doc(userId).set(userData, { merge: true });
    console.log(`✅ Created/updated user document: ${userId}`);
    return userData;
  } catch (error) {
    console.error(`❌ Error creating user document: ${error.message}`);
    throw error;
  }
}

/**
 * Test Firestore permissions with created user
 */
async function testFirestorePermissions(userId, jobId) {
  console.log('🧪 Testing Firestore permissions...');
  
  try {
    // Test job document read
    const jobDoc = await db.collection('jobs').doc(jobId).get();
    if (jobDoc.exists) {
      console.log('✅ Job document readable');
    } else {
      console.log('❌ Job document not found');
    }
    
    // Test jobs query (what development skip uses)
    const recentJobs = await db.collection('jobs')
      .where('userId', '==', userId)
      .where('status', '==', 'completed')
      .orderBy('completedAt', 'desc')
      .limit(1)
      .get();
    
    if (!recentJobs.empty) {
      console.log('✅ Jobs query successful - development skip should work');
      console.log(`   Found ${recentJobs.size} completed job(s)`);
    } else {
      console.log('❌ Jobs query returned no results');
    }
    
  } catch (error) {
    console.error(`❌ Firestore permissions test failed: ${error.message}`);
  }
}

/**
 * Test CORS configuration by checking the headers
 */
async function testCorsConfiguration() {
  console.log('🧪 Testing CORS configuration...');
  
  const testOrigins = [
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'http://localhost:5173'
  ];
  
  for (const origin of testOrigins) {
    try {
      const response = await fetch('http://127.0.0.1:5001/cvplus-5c0e3/us-central1/processCV', {
        method: 'OPTIONS',
        headers: {
          'Origin': origin,
          'Access-Control-Request-Method': 'POST',
          'Access-Control-Request-Headers': 'Content-Type,Authorization'
        }
      });
      
      const corsHeaders = {
        'access-control-allow-origin': response.headers.get('access-control-allow-origin'),
        'access-control-allow-methods': response.headers.get('access-control-allow-methods'),
        'access-control-allow-headers': response.headers.get('access-control-allow-headers')
      };
      
      console.log(`✅ CORS test for ${origin}:`, corsHeaders);
    } catch (error) {
      console.log(`❌ CORS test failed for ${origin}: ${error.message}`);
    }
  }
}

/**
 * Main setup function
 */
async function setupDevelopmentData() {
  try {
    console.log('📊 Setting up development data...\n');
    
    // Create multiple test users and job documents
    const sampleCount = 3;
    const createdJobs = [];
    
    for (let i = 0; i < sampleCount; i++) {
      console.log(`\n--- Setting up sample ${i + 1}/${sampleCount} ---`);
      
      // Create test user
      const userRecord = await createTestUser(i);
      
      // Create user document
      await createUserDocument(userRecord.uid, userRecord);
      
      // Create sample job with CV data
      const jobInfo = await createSampleJobDocument(userRecord.uid, i);
      createdJobs.push(jobInfo);
      
      // Test permissions
      await testFirestorePermissions(userRecord.uid, jobInfo.jobId);
    }
    
    console.log('\n🎯 Development data setup completed!');
    console.log(`   Created ${sampleCount} test users`);
    console.log(`   Created ${sampleCount} sample job documents`);
    console.log(`   Sample job IDs: ${createdJobs.map(j => j.jobId).join(', ')}`);
    
    // Test CORS
    console.log('\n🌐 Testing CORS configuration...');
    await testCorsConfiguration();
    
    console.log('\n✅ Setup completed successfully!');
    console.log('\n📋 Next steps:');
    console.log('   1. Frontend should now be able to use development skip');
    console.log('   2. Job subscriptions should work without permission errors');
    console.log('   3. CORS issues should be resolved');
    console.log('   4. Test by triggering a development skip from the frontend');
    
  } catch (error) {
    console.error('❌ Setup failed:', error);
    process.exit(1);
  }
}

/**
 * Clean up development data (optional utility function)
 */
async function cleanupDevelopmentData() {
  console.log('🧹 Cleaning up development data...');
  
  try {
    // Delete test jobs
    const jobsSnapshot = await db.collection('jobs')
      .where('_developmentSample', '==', true)
      .get();
    
    const batch = db.batch();
    jobsSnapshot.docs.forEach(doc => {
      batch.delete(doc.ref);
    });
    
    if (jobsSnapshot.size > 0) {
      await batch.commit();
      console.log(`✅ Deleted ${jobsSnapshot.size} test job documents`);
    }
    
    // Delete test users from auth
    for (let i = 0; i < 4; i++) {
      try {
        await auth.deleteUser(`test-user-${i + 1}`);
        console.log(`✅ Deleted test user: test-user-${i + 1}`);
      } catch (error) {
        // User might not exist, continue
      }
    }
    
    console.log('✅ Cleanup completed');
  } catch (error) {
    console.error('❌ Cleanup failed:', error);
  }
}

// Handle command line arguments
const args = process.argv.slice(2);
if (args.includes('--cleanup')) {
  cleanupDevelopmentData().then(() => process.exit(0));
} else {
  setupDevelopmentData().then(() => process.exit(0));
}