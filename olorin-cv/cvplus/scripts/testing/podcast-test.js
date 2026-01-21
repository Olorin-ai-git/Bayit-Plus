#!/usr/bin/env node

/**
 * Simple script to test podcast generation
 * Usage: node podcast-test.js
 */

const admin = require('firebase-admin');

// Initialize Firebase Admin if not already initialized
if (!admin.apps.length) {
  admin.initializeApp();
}

const { podcastGenerationService } = require('./lib/services/podcast-generation.service');

// Mock CV data for testing
const mockCVData = {
  personalInfo: {
    name: "Gil Klainert",
    email: "gil.klainert@gmail.com",
    title: "Software Engineer & AI Specialist"
  },
  experience: [
    {
      title: "Senior Software Engineer",
      company: "Tech Company",
      duration: "2020-Present",
      description: "Led development of AI-powered applications using modern web technologies"
    }
  ],
  skills: ["JavaScript", "Python", "AI/ML", "React", "Node.js", "Firebase"],
  education: [
    {
      degree: "Computer Science",
      institution: "University",
      year: "2018"
    }
  ]
};

async function generateTestPodcast() {
  try {
    console.log('🎙️ Starting podcast generation test...');
    
    // Mock job data
    const jobData = {
      parsedData: mockCVData,
      userId: 'test-user',
      id: 'test-job-' + Date.now()
    };
    
    console.log('📄 Using mock CV data for:', mockCVData.personalInfo.name);
    
    // Generate podcast
    const result = await podcastGenerationService.generatePodcast(
      mockCVData,      // parsedCV data
      jobData.id,      // jobId
      {
        duration: 'medium',  // short, medium, long
        style: 'professional',  // professional, casual, enthusiastic
        focus: 'balanced'    // achievements, journey, skills, balanced
      }
    );
    
    console.log('✅ Podcast generated successfully!');
    console.log('🎵 Audio URL:', result.audioUrl);
    console.log('📝 Transcript preview:', result.transcript?.substring(0, 200) + '...');
    console.log('⏱️ Duration:', result.duration + ' seconds');
    
    return result;
    
  } catch (error) {
    console.error('❌ Error generating podcast:', error.message);
    throw error;
  }
}

// Run the test
if (require.main === module) {
  generateTestPodcast()
    .then(result => {
      console.log('\n🎉 Podcast generation completed!');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n💥 Podcast generation failed:', error);
      process.exit(1);
    });
}

module.exports = { generateTestPodcast };