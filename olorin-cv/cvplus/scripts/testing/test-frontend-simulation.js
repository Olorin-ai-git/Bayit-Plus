const axios = require('axios');

async function simulateFrontendRequest() {
  console.log('Frontend Sim: Simulating frontend file access...');
  
  // This simulates what the frontend would do
  const testUserId = 'uUtOw6pM3xBfPaFAeYEr6tS589JZ';
  const testJobId = 'test-job-123';
  const filePath = 'users/' + testUserId + '/podcasts/' + testJobId + '/career-podcast.mp3';
  
  // This is how the podcast service generates URLs
  const emulatorUrl = 'http://localhost:9199/v0/b/getmycv-ai.appspot.com/o/' + encodeURIComponent(filePath) + '?alt=media';
  
  console.log('Frontend Sim: Testing URL:', emulatorUrl);
  
  try {
    // Test 1: Direct access (no auth - should fail)
    console.log('Frontend Sim: Test 1 - No auth (should fail)...');
    const response1 = await axios.get(emulatorUrl, { validateStatus: () => true });
    console.log('Frontend Sim: No auth status:', response1.status);
    console.log('Frontend Sim: No auth response:', response1.data);
    
    // Test 2: With fake token (should still fail)
    console.log('Frontend Sim: Test 2 - Fake token (should fail)...');
    const response2 = await axios.get(emulatorUrl, { 
      validateStatus: () => true,
      headers: { 'Authorization': 'Bearer fake-token' }
    });
    console.log('Frontend Sim: Fake token status:', response2.status);
    console.log('Frontend Sim: Fake token response:', response2.data);
    
    // Test 3: Check if file exists via different path
    console.log('Frontend Sim: Test 3 - Alternative access patterns...');
    
    // Try the old path pattern (backward compatibility)
    const oldPath = 'podcasts/' + testJobId + '/career-podcast.mp3';
    const oldUrl = 'http://localhost:9199/v0/b/getmycv-ai.appspot.com/o/' + encodeURIComponent(oldPath) + '?alt=media';
    console.log('Frontend Sim: Testing old path:', oldUrl);
    
    const response3 = await axios.get(oldUrl, { validateStatus: () => true });
    console.log('Frontend Sim: Old path status:', response3.status);
    console.log('Frontend Sim: Old path response:', response3.data);
    
  } catch (error) {
    console.error('Frontend Sim: Error:', error.message);
  }
}

simulateFrontendRequest();
