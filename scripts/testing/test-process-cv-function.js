#!/usr/bin/env node

/**
 * Test the actual processCV Firebase Function with Gil Klainert's CV
 * This simulates the complete flow that would happen in production
 */

const admin = require('firebase-admin');

// Gil's CV content
const GIL_CV_TEXT = `
Gil Klainert
CONTACT: 185 Madison, Cresskill, NJ 07626, (201) 397-9142, test@example.com

EXPERTISE: GenAI & Advanced AI Software Solution Development, Front End & Full Stack Management, Group & Team Leadership, Business-Oriented Decision Making, Technical Project Management, Technologies: Angular 9, JavaScript, C#, HTML5, CSS, TypeScript, NodeJS, .Net, ES6

PROFILE: A highly skilled group leader with 25 years of experience blending deep technical, managerial, and business acumen. Expert in leveraging Generative AI (GenAI) to develop impactful software solutions.

EXPERIENCE:
- R&D Group Manager at INTUIT (2021-Present): Lead R&D group with 3 teams focused on fraud prevention, leverage GenAI for anti-fraud features
- Front End Team Lead at INTEL (2021): Lead Front-End Engineers for location-based services using Cesium
- Software Team Leader at Easysend (2019-2020): Managed 7 developers, full stack team
- Software Team Leader at Microsoft (2015-2018): Led front-end team for Advanced eDiscovery in Office365
- Software Team Leader at Equivio (2011-2015): Managed cross-functional teams
- Senior Front End Developer at Pie Finances (2007-2011): Led UI development with Angular/.NET

EDUCATION: EMBA Northwestern/Tel Aviv (2019), M.A. Organizational Development (2006), B.A. Computer Science (Incomplete), B.A. Business and Human Resources (1993)
`;

async function testProcessCVFunction() {
  console.log('🧪 Testing processCV Function with Gil Klainert CV');
  console.log('=================================================\n');

  try {
    // Initialize Firebase
    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.applicationDefault(),
        projectId: process.env.FIREBASE_PROJECT_ID || 'cvplus-8d919'
      });
    }

    console.log('Environment Check:');
    console.log(`Firebase Project: ${admin.app().options.projectId}`);
    console.log(`Anthropic API: ${process.env.ANTHROPIC_API_KEY ? '✅' : '❌'}\n`);

    // Create test job with Gil's CV as text content
    const testJobId = `test-processCV-${Date.now()}`;
    const jobRef = admin.firestore().collection('jobs').doc(testJobId);

    console.log(`Creating test job: ${testJobId}`);
    await jobRef.set({
      id: testJobId,
      userId: 'test-gil-user',
      status: 'uploaded',
      cvContent: GIL_CV_TEXT,
      quickCreate: true,
      userInstructions: 'Focus on leadership experience and GenAI expertise',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      testRun: true
    });

    console.log('✅ Test job created');

    // Simulate file upload by creating a text file in storage
    const bucket = admin.storage().bucket();
    const fileName = `test-cvs/${testJobId}/gil-cv.txt`;
    const file = bucket.file(fileName);

    await file.save(GIL_CV_TEXT, {
      metadata: {
        contentType: 'text/plain',
        metadata: {
          testFile: 'true',
          jobId: testJobId
        }
      }
    });

    console.log('✅ Test CV file uploaded to storage');

    // Get file download URL
    const [fileUrl] = await file.getSignedUrl({
      action: 'read',
      expires: Date.now() + 1000 * 60 * 60 // 1 hour
    });

    console.log('✅ File URL generated');

    // Now test the processCV function directly
    const { processCV } = require('./lib/functions/processCV');

    // Mock request object
    const mockRequest = {
      auth: {
        uid: 'test-gil-user',
        token: {
          firebase: {
            identities: {},
            sign_in_provider: 'custom'
          }
        }
      },
      data: {
        jobId: testJobId,
        fileUrl: fileUrl,
        mimeType: 'text/plain',
        isUrl: false
      }
    };

    console.log('🚀 Calling processCV function...\n');
    const startTime = Date.now();

    try {
      const result = await processCV(mockRequest);
      const processingTime = Date.now() - startTime;

      console.log(`✅ processCV completed in ${processingTime}ms`);
      console.log('Result:', JSON.stringify(result, null, 2));

      // Verify job was updated
      const updatedJob = await jobRef.get();
      const jobData = updatedJob.data();

      console.log('\n📊 Job Processing Results:');
      console.log('=========================');
      console.log(`Status: ${jobData.status}`);
      console.log(`Name: ${jobData.parsedData?.personalInfo?.name}`);
      console.log(`Email: ${jobData.parsedData?.personalInfo?.email}`);
      console.log(`Experience entries: ${jobData.parsedData?.experience?.length || 0}`);
      console.log(`Skills extracted: ${jobData.parsedData?.skills?.technical?.length || 0}`);
      console.log(`PII detected: ${jobData.piiDetection?.hasPII}`);
      console.log(`PII types: ${jobData.piiDetection?.detectedTypes?.join(', ') || 'none'}`);

      // Validate specific Gil Klainert data
      console.log('\n🔍 Validation Results:');
      console.log('=====================');
      const validations = {
        nameCorrect: jobData.parsedData?.personalInfo?.name === 'Gil Klainert',
        emailCorrect: jobData.parsedData?.personalInfo?.email === 'test@example.com',
        phoneCorrect: jobData.parsedData?.personalInfo?.phone === '(201) 397-9142',
        hasIntuitExperience: jobData.parsedData?.experience?.some(exp => exp.company === 'INTUIT'),
        hasMicrosoftExperience: jobData.parsedData?.experience?.some(exp => exp.company === 'Microsoft'),
        hasJavaScript: jobData.parsedData?.skills?.technical?.some(skill => 
          skill.toLowerCase().includes('javascript')),
        hasGenAIExpertise: jobData.parsedData?.summary?.toLowerCase().includes('genai') ||
                          jobData.parsedData?.experience?.some(exp => 
                            exp.description?.toLowerCase().includes('genai')),
        rightExperienceCount: jobData.parsedData?.experience?.length === 6,
        hasEducation: jobData.parsedData?.education?.length > 0
      };

      console.log(`✅ Name extracted correctly: ${validations.nameCorrect}`);
      console.log(`✅ Email extracted correctly: ${validations.emailCorrect}`);
      console.log(`✅ Phone extracted correctly: ${validations.phoneCorrect}`);
      console.log(`✅ INTUIT experience found: ${validations.hasIntuitExperience}`);
      console.log(`✅ Microsoft experience found: ${validations.hasMicrosoftExperience}`);
      console.log(`✅ JavaScript skill found: ${validations.hasJavaScript}`);
      console.log(`✅ GenAI expertise identified: ${validations.hasGenAIExpertise}`);
      console.log(`✅ Correct experience count: ${validations.rightExperienceCount}`);
      console.log(`✅ Education extracted: ${validations.hasEducation}`);

      const allValidationsPassed = Object.values(validations).every(v => v === true);
      
      if (allValidationsPassed) {
        console.log('\n🎉 ALL VALIDATIONS PASSED! CVPlus is correctly processing Gil Klainert\'s CV.');
      } else {
        console.log('\n⚠️  Some validations failed. Check the parsing logic.');
        console.log('Failed validations:', Object.entries(validations)
          .filter(([_, value]) => value === false)
          .map(([key, _]) => key)
        );
      }

    } catch (functionError) {
      console.error('❌ processCV function failed:', functionError.message);
      
      // Check if it's an API key issue
      if (functionError.message.includes('API key') || functionError.message.includes('401')) {
        console.log('\n💡 This appears to be an API key issue.');
        console.log('Make sure ANTHROPIC_API_KEY is set in your environment.');
      }
    }

    // Cleanup
    console.log('\n🧹 Cleaning up test data...');
    await jobRef.delete();
    await file.delete();
    console.log('✅ Test data cleaned up');

  } catch (error) {
    console.error('💥 Test setup failed:', error.message);
    process.exit(1);
  }
}

// Check environment and run
if (!process.env.ANTHROPIC_API_KEY) {
  console.error('❌ ANTHROPIC_API_KEY environment variable is required');
  console.log('Please set this in your .env file or environment and try again.');
  process.exit(1);
}

testProcessCVFunction().catch(error => {
  console.error('💥 Unexpected error:', error);
  process.exit(1);
});