const admin = require('firebase-admin');

if (!admin.apps.length) {
  admin.initializeApp({
    projectId: 'getmycv-ai',
    storageBucket: 'getmycv-ai.appspot.com'
  });
}

process.env.FIREBASE_AUTH_EMULATOR_HOST = '127.0.0.1:9099';
process.env.FIREBASE_STORAGE_EMULATOR_HOST = '127.0.0.1:9199';
process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8090';

async function debugStoragePermissions() {
  console.log('Debug: Starting Storage Permission Debug...');
  
  try {
    const testUserId = 'uUtOw6pM3xBfPaFAeYEr6tS589JZ';
    const testJobId = 'test-job-123';
    const testFilename = 'career-podcast.mp3';
    const filePath = 'users/' + testUserId + '/podcasts/' + testJobId + '/' + testFilename;
    
    console.log('Debug: Test file path:', filePath);
    
    const bucket = admin.storage().bucket();
    const file = bucket.file(filePath);
    
    const testContent = Buffer.from('This is a test audio file');
    await file.save(testContent, {
      metadata: {
        contentType: 'audio/mpeg'
      }
    });
    
    console.log('Debug: Test file created');
    
    const [exists] = await file.exists();
    console.log('Debug: File exists:', exists);
    
    if (exists) {
      const [metadata] = await file.getMetadata();
      console.log('Debug: File name:', metadata.name);
      console.log('Debug: Content type:', metadata.contentType);
    }
    
  } catch (error) {
    console.error('Debug: Error:', error.message);
  }
}

debugStoragePermissions();
