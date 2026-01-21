const axios = require('axios');

async function testStorageAccess() {
  console.log('Testing: Storage file access...');
  
  const testUserId = 'uUtOw6pM3xBfPaFAeYEr6tS589JZ';
  const testJobId = 'test-job-123';
  const testFilename = 'career-podcast.mp3';
  const filePath = 'users/' + testUserId + '/podcasts/' + testJobId + '/' + testFilename;
  
  // Encode the file path for URL
  const encodedPath = encodeURIComponent(filePath);
  const emulatorUrl = 'http://localhost:9199/v0/b/getmycv-ai.appspot.com/o/' + encodedPath + '?alt=media';
  
  console.log('Testing: File path:', filePath);
  console.log('Testing: Encoded path:', encodedPath);
  console.log('Testing: Emulator URL:', emulatorUrl);
  
  try {
    // Test accessing the file without authentication
    console.log('Testing: Accessing file without authentication...');
    const response = await axios.get(emulatorUrl, {
      validateStatus: () => true // Accept all status codes
    });
    
    console.log('Testing: Response status:', response.status);
    console.log('Testing: Response headers:', response.headers);
    console.log('Testing: Response data:', typeof response.data === 'string' ? response.data : 'Binary data');
    
  } catch (error) {
    console.error('Testing: Error accessing file:', error.message);
    if (error.response) {
      console.error('Testing: Error status:', error.response.status);
      console.error('Testing: Error data:', error.response.data);
    }
  }
}

testStorageAccess();
