const admin = require('firebase-admin');
const axios = require('axios');

if (!admin.apps.length) {
  admin.initializeApp({
    projectId: 'getmycv-ai',
    storageBucket: 'getmycv-ai.appspot.com'
  });
}

process.env.FIREBASE_AUTH_EMULATOR_HOST = '127.0.0.1:9099';

async function debugAuthToken() {
  console.log('Debug: Analyzing auth token details...');
  
  const testUserId = 'uUtOw6pM3xBfPaFAeYEr6tS589JZ';
  
  try {
    // Create custom token
    const customToken = await admin.auth().createCustomToken(testUserId);
    console.log('Debug: Custom token length:', customToken.length);
    
    // Exchange for ID token
    const authResponse = await axios.post(
      'http://localhost:9099/identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=fake-api-key',
      {
        token: customToken,
        returnSecureToken: true
      },
      {
        headers: { 'Content-Type': 'application/json' }
      }
    );
    
    const authData = authResponse.data;
    console.log('Debug: Auth response keys:', Object.keys(authData));
    console.log('Debug: localId:', authData.localId);
    console.log('Debug: uid:', authData.uid);
    console.log('Debug: idToken length:', authData.idToken ? authData.idToken.length : 'undefined');
    
    // Verify the ID token
    if (authData.idToken) {
      try {
        const decodedToken = await admin.auth().verifyIdToken(authData.idToken);
        console.log('Debug: Decoded token UID:', decodedToken.uid);
        console.log('Debug: Decoded token sub:', decodedToken.sub);
        console.log('Debug: Decoded token user_id:', decodedToken.user_id);
        console.log('Debug: Token claims:', Object.keys(decodedToken));
      } catch (verifyError) {
        console.error('Debug: Token verification failed:', verifyError.message);
      }
    }
    
  } catch (error) {
    console.error('Debug: Error:', error.message);
    if (error.response) {
      console.error('Debug: Response data:', error.response.data);
    }
  }
}

debugAuthToken();
