#!/usr/bin/env node
/**
 * Comprehensive getRecommendations API Debugging Script
 * 
 * This script tests the getRecommendations Firebase function with real data
 * to identify why the frontend is not making successful API calls.
 */

const admin = require('firebase-admin');
const { initializeApp } = require('firebase/app');
const { getAuth, signInWithEmailAndPassword } = require('firebase/auth');
const { getFunctions, httpsCallable } = require('firebase/functions');

// Firebase configuration for emulator
const firebaseConfig = {
  projectId: 'getmycv-ai',
  apiKey: 'demo-key',
  authDomain: 'demo.firebaseapp.com',
  databaseURL: 'http://localhost:8080'
};

// Test data from your logs
const TEST_DATA = {
  jobId: 'HS7MAXk3GHaqdXjrujkP',
  userId: 'A55XGJdp3rZ0ybkT90EJUPBl22mM',
  targetRole: 'Software Engineer',
  industryKeywords: ['JavaScript', 'React', 'Node.js']
};

async function testGetRecommendations() {
  console.log('\n🔍 Starting Comprehensive getRecommendations API Debug Test');
  console.log('=' .repeat(80));
  
  try {
    // Initialize Firebase for client-side testing
    const app = initializeApp(firebaseConfig);
    const auth = getAuth(app);
    const functions = getFunctions(app);
    
    // Connect to emulator
    if (process.env.NODE_ENV !== 'production') {
      console.log('🔗 Connecting to Firebase emulators...');
      const { connectAuthEmulator } = require('firebase/auth');
      const { connectFunctionsEmulator } = require('firebase/functions');
      
      try {
        connectAuthEmulator(auth, 'http://localhost:9099');
        connectFunctionsEmulator(functions, 'localhost', 5001);
        console.log('✅ Connected to Firebase emulators');
      } catch (emulatorError) {
        console.log('⚠️  Emulator connection warning:', emulatorError.message);
      }
    }
    
    console.log('\n📋 Test Configuration:');
    console.log('  Job ID:', TEST_DATA.jobId);
    console.log('  User ID:', TEST_DATA.userId);
    console.log('  Target Role:', TEST_DATA.targetRole);
    console.log('  Industry Keywords:', TEST_DATA.industryKeywords);
    
    // Test 1: Direct HTTP call to function endpoint
    console.log('\n🔵 TEST 1: Direct HTTP Request to getRecommendations');
    console.log('-'.repeat(60));
    
    try {
      const fetch = (await import('node-fetch')).default;
      const baseUrl = 'http://localhost:5001/getmycv-ai/us-central1';
      
      console.log('Making HTTP request to:', `${baseUrl}/getRecommendations`);
      
      const httpResponse = await fetch(`${baseUrl}/getRecommendations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // Note: In emulator mode, auth might be bypassed
        },
        body: JSON.stringify({
          data: {
            jobId: TEST_DATA.jobId,
            targetRole: TEST_DATA.targetRole,
            industryKeywords: TEST_DATA.industryKeywords,
            forceRegenerate: false
          }
        })
      });
      
      console.log('HTTP Response Status:', httpResponse.status);
      console.log('HTTP Response Headers:', Object.fromEntries(httpResponse.headers.entries()));
      
      const httpResponseText = await httpResponse.text();
      console.log('HTTP Response Body (first 500 chars):', httpResponseText.substring(0, 500));
      
      if (httpResponse.ok) {
        try {
          const httpData = JSON.parse(httpResponseText);
          console.log('✅ HTTP Request succeeded');
          console.log('Response data structure:', Object.keys(httpData));
          if (httpData.result?.data?.recommendations) {
            console.log(`Found ${httpData.result.data.recommendations.length} recommendations`);
          }
        } catch (parseError) {
          console.log('❌ Failed to parse HTTP response as JSON');
        }
      } else {
        console.log('❌ HTTP Request failed with status:', httpResponse.status);
        console.log('Error response:', httpResponseText);
      }
      
    } catch (httpError) {
      console.log('❌ HTTP Request failed:', httpError.message);
    }
    
    // Test 2: Firebase callable function (requires auth)
    console.log('\n🔵 TEST 2: Firebase Callable Function');
    console.log('-'.repeat(60));
    
    try {
      // Create a test user session (emulator allows anonymous calls)
      console.log('Attempting to call Firebase callable function...');
      
      const getRecommendationsCallable = httpsCallable(functions, 'getRecommendations');
      const callableResult = await getRecommendationsCallable({
        jobId: TEST_DATA.jobId,
        targetRole: TEST_DATA.targetRole,
        industryKeywords: TEST_DATA.industryKeywords,
        forceRegenerate: false
      });
      
      console.log('✅ Callable function succeeded');
      console.log('Result data structure:', Object.keys(callableResult.data));
      
      if (callableResult.data.success && callableResult.data.data?.recommendations) {
        console.log(`Found ${callableResult.data.data.recommendations.length} recommendations`);
        console.log('First recommendation sample:', {
          id: callableResult.data.data.recommendations[0]?.id,
          title: callableResult.data.data.recommendations[0]?.title,
          category: callableResult.data.data.recommendations[0]?.category
        });
      }
      
    } catch (callableError) {
      console.log('❌ Callable function failed:', callableError.message);
      console.log('Error code:', callableError.code);
      console.log('Error details:', callableError.details);
    }
    
    // Test 3: Verify job document exists in Firestore
    console.log('\n🔵 TEST 3: Verify Job Document in Firestore');
    console.log('-'.repeat(60));
    
    try {
      // Initialize Admin SDK for Firestore access
      const adminApp = admin.initializeApp({
        projectId: 'getmycv-ai'
      }, 'admin-app');
      
      const firestore = admin.firestore(adminApp);
      firestore.settings({
        host: 'localhost:8080',
        ssl: false
      });
      
      const jobDoc = await firestore.collection('jobs').doc(TEST_DATA.jobId).get();
      
      if (jobDoc.exists) {
        const jobData = jobDoc.data();
        console.log('✅ Job document found');
        console.log('Job status:', jobData.status);
        console.log('User ID:', jobData.userId);
        console.log('Has parsed data:', !!jobData.parsedData);
        console.log('Has CV recommendations:', !!jobData.cvRecommendations);
        console.log('CV recommendations count:', jobData.cvRecommendations?.length || 0);
        console.log('Last recommendation generation:', jobData.lastRecommendationGeneration);
        
        // Check if user IDs match
        if (jobData.userId !== TEST_DATA.userId) {
          console.log('⚠️  WARNING: Job userId does not match test userId');
          console.log('  Job userId:', jobData.userId);
          console.log('  Test userId:', TEST_DATA.userId);
        }
        
      } else {
        console.log('❌ Job document not found in Firestore');
        console.log('Checking all jobs in collection...');
        
        const allJobs = await firestore.collection('jobs').limit(5).get();
        console.log(`Found ${allJobs.size} job documents:`);
        allJobs.forEach(doc => {
          const data = doc.data();
          console.log(`  - ${doc.id}: user=${data.userId}, status=${data.status}`);
        });
      }
      
    } catch (firestoreError) {
      console.log('❌ Firestore check failed:', firestoreError.message);
    }
    
    // Test 4: Check emulator logs for function calls
    console.log('\n🔵 TEST 4: Function Execution Summary');
    console.log('-'.repeat(60));
    
    console.log('To check Firebase emulator logs, run:');
    console.log('  firebase functions:log --only getRecommendations');
    console.log('');
    console.log('Look for these patterns in the logs:');
    console.log('  - "Beginning execution of us-central1-getRecommendations"');
    console.log('  - "[getRecommendations] Starting for job"');
    console.log('  - Error messages or stack traces');
    
  } catch (error) {
    console.log('❌ Test script failed:', error.message);
    console.log('Stack trace:', error.stack);
  }
  
  console.log('\n' + '='.repeat(80));
  console.log('🏁 Debug test completed');
  console.log('\nNext steps based on results:');
  console.log('1. If HTTP request works but callable fails → Auth issue');  
  console.log('2. If job document missing → Data consistency issue');
  console.log('3. If both requests fail → Function implementation issue');
  console.log('4. If requests work but frontend fails → Frontend code issue');
}

// Test 5: Frontend simulation test
async function testFrontendSimulation() {
  console.log('\n🔵 TEST 5: Simulate Frontend Call Pattern');
  console.log('-'.repeat(60));
  
  try {
    const fetch = (await import('node-fetch')).default;
    
    // Simulate the exact frontend call pattern
    const requests = [];
    
    // Create 3 simultaneous requests (simulating React StrictMode)
    for (let i = 0; i < 3; i++) {
      requests.push(
        fetch('http://localhost:5001/getmycv-ai/us-central1/getRecommendations', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            data: {
              jobId: TEST_DATA.jobId,
              targetRole: TEST_DATA.targetRole,
              industryKeywords: TEST_DATA.industryKeywords,
              forceRegenerate: false
            }
          })
        }).then(async (response) => {
          const text = await response.text();
          return {
            requestNumber: i + 1,
            status: response.status,
            success: response.ok,
            responseLength: text.length,
            hasData: text.includes('recommendations'),
            firstChars: text.substring(0, 100)
          };
        }).catch(error => ({
          requestNumber: i + 1,
          error: error.message
        }))
      );
    }
    
    const results = await Promise.all(requests);
    
    console.log('Simultaneous request results:');
    results.forEach(result => {
      if (result.error) {
        console.log(`Request ${result.requestNumber}: ERROR - ${result.error}`);
      } else {
        console.log(`Request ${result.requestNumber}: Status ${result.status}, Success: ${result.success}, Has data: ${result.hasData}`);
      }
    });
    
    // Check for cache behavior
    const successfulResults = results.filter(r => r.success);
    if (successfulResults.length > 1) {
      const firstResponse = successfulResults[0].firstChars;
      const allSame = successfulResults.every(r => r.firstChars === firstResponse);
      console.log('Response consistency:', allSame ? '✅ All responses identical (good caching)' : '⚠️  Responses differ');
    }
    
  } catch (error) {
    console.log('❌ Frontend simulation failed:', error.message);
  }
}

// Run the tests
async function main() {
  await testGetRecommendations();
  await testFrontendSimulation();
  
  // Clean exit
  process.exit(0);
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { testGetRecommendations, testFrontendSimulation };