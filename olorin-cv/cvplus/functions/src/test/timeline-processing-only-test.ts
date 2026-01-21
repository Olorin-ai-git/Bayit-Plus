/**
 * Timeline Processing Only Test
 * Test timeline generation without Firebase storage to verify the fix
  */

import { timelineGenerationServiceV2 } from '../services/timeline-generation.service';

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
 * Test timeline processing without storage
  */
async function testTimelineProcessingOnly() {
  console.log('\n=== TIMELINE PROCESSING ONLY TEST ===');
  
  try {
    console.log('1. Testing timeline generation without storage...');
    
    // Test the timeline generation without storage
    const timelineData = await timelineGenerationServiceV2.generateTimeline(mockParsedCV, 'test-job-123', false);
    
    console.log('✅ Timeline generated successfully (without storage)');
    console.log('Events generated:', timelineData.events.length);
    console.log('Summary generated:', !!timelineData.summary);
    console.log('Insights generated:', !!timelineData.insights);
    
    // Verify data structure
    console.log('\n2. Verifying timeline data structure...');
    
    // Check events
    if (!Array.isArray(timelineData.events)) {
      throw new Error('Timeline events is not an array');
    }
    
    for (const [index, event] of timelineData.events.entries()) {
      if (!event.id || !event.type || !event.title || !event.organization || !event.startDate) {
        throw new Error(`Event ${index} is missing required fields`);
      }
      
      // Verify dates are valid ISO strings
      try {
        new Date(event.startDate).toISOString();
        if (event.endDate) {
          new Date(event.endDate).toISOString();
        }
      } catch {
        throw new Error(`Event ${index} has invalid date format`);
      }
    }
    
    console.log('✅ All events have valid structure and dates');
    
    // Check summary
    if (!timelineData.summary || typeof timelineData.summary !== 'object') {
      throw new Error('Timeline summary is invalid');
    }
    
    const summary = timelineData.summary;
    if (typeof summary.totalYearsExperience !== 'number' ||
        typeof summary.companiesWorked !== 'number' ||
        typeof summary.degreesEarned !== 'number' ||
        typeof summary.certificationsEarned !== 'number' ||
        !Array.isArray(summary.careerHighlights)) {
      throw new Error('Timeline summary has invalid structure');
    }
    
    console.log('✅ Summary has valid structure');
    
    // Check insights
    if (!timelineData.insights || typeof timelineData.insights !== 'object') {
      throw new Error('Timeline insights is invalid');
    }
    
    const insights = timelineData.insights;
    if (typeof insights.careerProgression !== 'string' ||
        !Array.isArray(insights.industryFocus) ||
        typeof insights.skillEvolution !== 'string' ||
        !Array.isArray(insights.nextSteps)) {
      throw new Error('Timeline insights has invalid structure');
    }
    
    console.log('✅ Insights have valid structure');
    
    // Test JSON serialization
    console.log('\n3. Testing JSON serialization safety...');
    const jsonString = JSON.stringify(timelineData);
    
    if (jsonString.includes('undefined')) {
      throw new Error('Timeline data contains undefined values after serialization');
    }
    
    console.log('✅ Timeline data serializes safely without undefined values');
    
    // Test data completeness
    console.log('\n4. Testing data completeness...');
    console.log(`- Events: ${timelineData.events.length} (expected: 6)`);
    console.log(`- Years of experience: ${summary.totalYearsExperience} years`);
    console.log(`- Companies worked: ${summary.companiesWorked}`);
    console.log(`- Degrees earned: ${summary.degreesEarned}`);
    console.log(`- Certifications earned: ${summary.certificationsEarned}`);
    console.log(`- Career highlights: ${summary.careerHighlights.length}`);
    console.log(`- Industry focus areas: ${insights.industryFocus.length}`);
    console.log(`- Next steps suggestions: ${insights.nextSteps.length}`);
    
    console.log('\n=== TIMELINE PROCESSING TEST COMPLETED SUCCESSFULLY ===');
    
    return {
      success: true,
      timelineData,
      eventsCount: timelineData.events.length,
      summary: timelineData.summary,
      insights: timelineData.insights
    };
    
  } catch (error: any) {
    console.error('❌ Timeline processing test failed:', error.message);
    console.error('Stack:', error.stack);
    
    return {
      success: false,
      error: error.message,
      stack: error.stack
    };
  }
}

// Run the test
if (require.main === module) {
  testTimelineProcessingOnly().then((result) => {
    if (result.success) {
      console.log('\n🎉 Timeline processing is working correctly!');
      console.log('The 500 errors should now be fixed.');
    } else {
      console.log('\n❌ Timeline processing still has issues.');
      console.log('Error:', result.error);
    }
    process.exit(result.success ? 0 : 1);
  });
}

export { testTimelineProcessingOnly };