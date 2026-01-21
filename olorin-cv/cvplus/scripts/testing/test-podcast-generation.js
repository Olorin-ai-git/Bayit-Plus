#!/usr/bin/env node

/**
 * Test script to verify podcast generation functionality
 * Usage: node test-podcast-generation.js [jobId]
 */

const admin = require('firebase-admin');

// Initialize Firebase Admin if not already initialized
if (!admin.apps.length) {
  admin.initializeApp();
}

const jobId = process.argv[2] || 'test-job-podcast';

async function testPodcastGeneration() {
  try {
    console.log('🎙️ Testing podcast generation for job:', jobId);
    
    // Check if job exists
    const jobDoc = await admin.firestore().collection('jobs').doc(jobId).get();
    
    if (!jobDoc.exists) {
      console.log('📝 Job not found, creating test job...');
      
      // Create a test job with mock CV data
      const mockJob = {
        id: jobId,
        userId: 'test-user',
        filename: 'test-cv.pdf',
        uploadedAt: admin.firestore.FieldValue.serverTimestamp(),
        status: 'processed',
        parsedData: {
          personalInfo: {
            name: "Gil Klainert",
            email: "gil.klainert@gmail.com",
            title: "Software Engineer & AI Specialist"
          },
          experience: [
            {
              position: "Senior Software Engineer",
              company: "Tech Company",
              duration: "2020-Present",
              achievements: ["Led development of AI-powered applications using modern web technologies"]
            }
          ],
          skills: {
            technical: ["JavaScript", "Python", "AI/ML", "React", "Node.js", "Firebase"]
          },
          education: [
            {
              degree: "Computer Science",
              institution: "University",
              year: "2018"
            }
          ]
        },
        podcastStatus: 'not-started'
      };
      
      await admin.firestore().collection('jobs').doc(jobId).set(mockJob);
      console.log('✅ Test job created');
    }
    
    const jobData = jobDoc.exists ? jobDoc.data() : await admin.firestore().collection('jobs').doc(jobId).get().then(doc => doc.data());
    
    console.log('📊 Current job status:');
    console.log('  - Job status:', jobData.status);
    console.log('  - Podcast status:', jobData.podcastStatus || 'not-started');
    console.log('  - Has parsed data:', !!jobData.parsedData);
    
    if (jobData.parsedData) {
      console.log('  - Candidate name:', jobData.parsedData.personalInfo?.name);
    }
    
    // Check for existing podcast
    if (jobData.podcast && jobData.podcast.url) {
      console.log('🎵 Existing podcast found:');
      console.log('  - Audio URL:', jobData.podcast.url);
      console.log('  - Duration:', jobData.podcast.duration);
      console.log('  - Generated at:', jobData.podcast.generatedAt?.toDate?.());
    }
    
    // Check enhanced features
    if (jobData.enhancedFeatures?.podcast) {
      console.log('🔧 Enhanced podcast features:');
      console.log('  - Enabled:', jobData.enhancedFeatures.podcast.enabled);
      console.log('  - Status:', jobData.enhancedFeatures.podcast.status);
      console.log('  - Data available:', !!jobData.enhancedFeatures.podcast.data);
    }
    
    // Check for career podcast in enhanced features
    if (jobData.enhancedFeatures?.careerPodcast) {
      console.log('🎭 Career podcast (mediaGeneration):');
      console.log('  - Status:', jobData.enhancedFeatures.careerPodcast.status);
      console.log('  - Data available:', !!jobData.enhancedFeatures.careerPodcast.data);
    }
    
    return jobData;
    
  } catch (error) {
    console.error('❌ Error testing podcast generation:', error);
    throw error;
  }
}

async function simulatePodcastGeneration() {
  try {
    console.log('\n🚀 Simulating podcast generation workflow...');
    
    // Update status to generating
    await admin.firestore().collection('jobs').doc(jobId).update({
      podcastStatus: 'generating',
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    console.log('⏳ Status updated to "generating"');
    
    // Simulate processing time
    console.log('⏱️ Simulating 3-second processing...');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Update status to completed with mock data
    const mockPodcastData = {
      url: `https://storage.googleapis.com/test-bucket/podcasts/${jobId}/career-podcast.mp3`,
      transcript: 'Welcome to this career podcast featuring Gil Klainert, a talented Software Engineer and AI Specialist...',
      duration: '3:45',
      chapters: [
        { title: 'Introduction', startTime: 0, endTime: 30 },
        { title: 'Career Overview', startTime: 30, endTime: 120 },
        { title: 'Key Achievements', startTime: 120, endTime: 180 },
        { title: 'Future Goals', startTime: 180, endTime: 225 }
      ],
      generatedAt: admin.firestore.FieldValue.serverTimestamp()
    };
    
    await admin.firestore().collection('jobs').doc(jobId).update({
      podcastStatus: 'completed',
      podcast: mockPodcastData,
      'enhancedFeatures.podcast': {
        enabled: true,
        status: 'completed',
        data: {
          url: mockPodcastData.url,
          duration: mockPodcastData.duration
        }
      },
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    console.log('✅ Status updated to "completed" with mock podcast data');
    console.log('🎵 Mock audio URL:', mockPodcastData.url);
    
    return mockPodcastData;
    
  } catch (error) {
    console.error('❌ Error simulating podcast generation:', error);
    throw error;
  }
}

// Run the tests
if (require.main === module) {
  Promise.resolve()
    .then(() => testPodcastGeneration())
    .then(() => simulatePodcastGeneration())
    .then(() => {
      console.log('\n🎉 Podcast generation test completed successfully!');
      console.log('\n📋 Next steps to test in frontend:');
      console.log('1. Load the results page with job ID:', jobId);
      console.log('2. Check that podcast shows as "ready" status');
      console.log('3. Verify audio player is displayed');
      console.log('4. Test transcript display functionality');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n💥 Test failed:', error);
      process.exit(1);
    });
}

module.exports = { testPodcastGeneration, simulatePodcastGeneration };