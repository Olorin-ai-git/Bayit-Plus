const admin = require('firebase-admin');
const axios = require('axios');

if (!admin.apps.length) {
  admin.initializeApp({
    projectId: 'getmycv-ai',
    storageBucket: 'getmycv-ai.appspot.com'
  });
}

process.env.FIREBASE_AUTH_EMULATOR_HOST = '127.0.0.1:9099';
process.env.FIREBASE_STORAGE_EMULATOR_HOST = '127.0.0.1:9199';

async function testAuthenticatedAccess() {
  console.log('Auth Test: Starting authenticated storage access test...');
  
  const testUserId = 'uUtOw6pM3xBfPaFAeYEr6tS589JZ';
  const testJobId = 'test-job-123';
  const testFilename = 'career-podcast.mp3';
  const filePath = 'users/' + testUserId + '/podcasts/' + testJobId + '/' + testFilename;
  
  try {
    // Step 1: Create a custom token for the test user
    console.log('Auth Test: Creating custom token for user:', testUserId);
    const customToken = await admin.auth().createCustomToken(testUserId);
    console.log('Auth Test: Custom token created successfully');
    
    // Step 2: Exchange custom token for ID token using Auth emulator
    console.log('Auth Test: Exchanging custom token for ID token...');
    const authResponse = await axios.post(
      'http://localhost:9099/identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=fake-api-key',
      {
        token: customToken,
        returnSecureToken: true
      },
      {
        validateStatus: () => true,
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );
    
    console.log('Auth Test: Auth response status:', authResponse.status);
    
    if (authResponse.status !== 200) {
      console.error('Auth Test: Failed to get ID token:', authResponse.data);
      return;
    }
    
    const authData = authResponse.data;
    console.log('Auth Test: Got ID token for localId:', authData.localId);
    
    // Step 3: Test accessing storage with authentication
    console.log('Auth Test: Testing authenticated storage access...');
    
    const encodedPath = encodeURIComponent(filePath);
    const storageUrl = 'http://localhost:9199/v0/b/getmycv-ai.appspot.com/o/' + encodedPath + '?alt=media';
    
    const storageResponse = await axios.get(storageUrl, {
      validateStatus: () => true,
      headers: {
        'Authorization': 'Bearer ' + authData.idToken
      }
    });
    
    console.log('Auth Test: Storage response status:', storageResponse.status);
    console.log('Auth Test: Storage response headers:', Object.keys(storageResponse.headers));
    
    if (storageResponse.status === 200) {
      console.log('Auth Test: SUCCESS! File accessed successfully');
      console.log('Auth Test: Content type:', storageResponse.headers['content-type']);
      console.log('Auth Test: Content length:', storageResponse.headers['content-length']);
    } else {
      console.log('Auth Test: FAILED! Response data:', storageResponse.data);
    }
    
    // Step 4: Test the rules logic
    console.log('Auth Test: Testing rules matching...');
    console.log('Auth Test: User ID from token:', authData.localId);
    console.log('Auth Test: User ID in path:', testUserId);
    console.log('Auth Test: Are they equal?', authData.localId === testUserId);
    console.log('Auth Test: File path:', filePath);
    console.log('Auth Test: Rules pattern: users/{userId}/podcasts/{jobId}/{fileName}');
    
  } catch (error) {
    console.error('Auth Test: Error:', error.message);
    if (error.response) {
      console.error('Auth Test: Error response:', error.response.data);
    }
  }
}

testAuthenticatedAccess();
