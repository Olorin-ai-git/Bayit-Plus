#!/usr/bin/env node

/**
 * Quick Firebase Emulator Setup - Creates minimal sample data for development skip
 */

const admin = require('firebase-admin');

// Initialize Firebase Admin SDK for emulator
const app = admin.initializeApp({
  projectId: 'cvplus-5c0e3',
  databaseURL: 'http://127.0.0.1:8080',
}, 'emulator-setup');

// Point to emulator endpoints
process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8090';
process.env.FIREBASE_AUTH_EMULATOR_HOST = '127.0.0.1:9099';

const db = admin.firestore(app);

console.log('🚀 Quick Setup: Creating sample CV data...');

async function createSampleData() {
  const jobId = `dev-sample-${Date.now()}`;
  const userId = 'test-user-dev';
  
  // Sample parsed CV data
  const sampleParsedCV = {
    personalInfo: {
      name: 'John Doe',
      email: 'john.doe@example.com',
      phone: '+1-555-0123',
      location: 'San Francisco, CA',
      title: 'Senior Software Engineer',
      summary: 'Experienced software engineer with 5+ years of experience.'
    },
    experience: [
      {
        title: 'Senior Software Engineer',
        company: 'Tech Corp',
        location: 'San Francisco, CA',
        startDate: '2020-01-01',
        endDate: 'present',
        description: 'Leading development of cutting-edge technology solutions.',
        achievements: ['Increased system performance by 40%', 'Led team of 8 engineers']
      }
    ],
    education: [
      {
        institution: 'Stanford University',
        degree: 'Bachelor of Science',
        field: 'Computer Science',
        graduationDate: '2018-06-01',
        gpa: '3.8'
      }
    ],
    skills: {
      technical: ['JavaScript', 'TypeScript', 'React', 'Node.js', 'Python'],
      soft: ['Leadership', 'Communication', 'Problem Solving'],
      languages: ['English (Native)', 'Spanish (Conversational)']
    },
    certifications: [
      {
        name: 'AWS Solutions Architect',
        issuer: 'Amazon Web Services',
        date: '2023-03-15'
      }
    ],
    _developmentSample: true
  };

  const jobData = {
    userId: userId,
    status: 'completed',
    parsedData: sampleParsedCV,  // This is what processCV looks for
    progress: 100,
    fileName: 'sample-cv.pdf',
    fileSize: 245760,
    mimeType: 'application/pdf',
    fileUrl: 'https://example.com/sample-cv.pdf',
    isPublic: false,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    completedAt: admin.firestore.FieldValue.serverTimestamp(),
    _developmentSample: true
  };

  try {
    await db.collection('jobs').doc(jobId).set(jobData);
    console.log(`✅ Created sample job: ${jobId}`);
    
    // Verify it was created
    const doc = await db.collection('jobs').doc(jobId).get();
    if (doc.exists) {
      console.log('✅ Verified: Sample data exists');
      console.log(`   User ID: ${userId}`);
      console.log(`   Job ID: ${jobId}`);
      console.log(`   Status: ${doc.data().status}`);
      console.log(`   Has parsedData: ${!!doc.data().parsedData}`);
      console.log('');
      console.log('🎯 Development skip should now work!');
    } else {
      console.log('❌ Failed to verify sample data');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

createSampleData().then(() => {
  console.log('✅ Quick setup complete!');
  process.exit(0);
});