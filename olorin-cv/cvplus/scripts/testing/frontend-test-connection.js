// Simple test to verify Firebase emulator connectivity
import { testEmulatorConnectivity } from './src/lib/firebase.js';

(async () => {
  console.log('🔍 Testing Firebase emulator connectivity...');
  
  try {
    const results = await testEmulatorConnectivity();
    
    console.log('📊 Test Results:');
    console.log('- Firestore:', results.firestore ? '✅ OK' : '❌ FAIL');
    console.log('- Functions:', results.functions ? '✅ OK' : '❌ FAIL');
    console.log('- Auth:', results.auth ? '✅ OK' : '❌ FAIL');
    console.log('- Storage:', results.storage ? '✅ OK' : '❌ FAIL');
    
    if (!results.firestore) {
      console.error('❌ Firestore connection failed:', results.details.firestore);
    }
    
    const allWorking = results.firestore && results.functions && results.auth && results.storage;
    console.log('\n🎯 Overall Status:', allWorking ? '✅ ALL SERVICES OK' : '⚠️ SOME ISSUES DETECTED');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
})();
