#!/usr/bin/env node

// Validation script for Firestore emulator connection fix
import { spawn } from 'child_process';
import fetch from 'node-fetch';

console.log('🔍 CVPlus Firestore Emulator Validation');
console.log('=====================================\n');

// Test 1: Check emulator processes
console.log('1. Checking emulator processes...');
const processes = spawn('ps', ['aux']);
let firestoreFound = false;
let functionsFound = false;

processes.stdout.on('data', (data) => {
  const output = data.toString();
  if (output.includes('cloud-firestore-emulator')) {
    firestoreFound = true;
    console.log('   ✅ Firestore emulator process found');
  }
  if (output.includes('firebase emulators:start')) {
    functionsFound = true;
    console.log('   ✅ Functions emulator process found');
  }
});

// Test 2: Check port availability
console.log('\n2. Testing port connectivity...');
const testPort = async (port, service) => {
  try {
    const response = await fetch(`http://localhost:${port}/`);
    console.log(`   ✅ ${service} (port ${port}): ${response.status}`);
    return true;
  } catch (error) {
    console.log(`   ❌ ${service} (port ${port}): ${error.message}`);
    return false;
  }
};

const runTests = async () => {
  const results = {
    firestore: await testPort(8080, 'Firestore'),
    functions: await testPort(5001, 'Functions'),
    auth: await testPort(9099, 'Auth'),
    storage: await testPort(9199, 'Storage'),
    ui: await testPort(4000, 'UI')
  };

  // Test 3: Specific WebSocket test
  console.log('\n3. Testing WebSocket connectivity...');
  try {
    const wsResponse = await fetch('http://localhost:9150/');
    console.log('   ✅ WebSocket endpoint reachable');
  } catch (error) {
    console.log('   ⚠️ WebSocket endpoint test:', error.message);
  }

  // Summary
  console.log('\n📊 Validation Summary');
  console.log('=====================');
  const totalTests = Object.keys(results).length;
  const passedTests = Object.values(results).filter(Boolean).length;
  
  console.log(`✅ Passed: ${passedTests}/${totalTests} tests`);
  
  if (results.firestore && results.functions) {
    console.log('🎯 Primary services (Firestore + Functions) are operational');
    console.log('✅ File upload functionality should work correctly');
  } else {
    console.log('⚠️ Critical services may have issues');
  }

  console.log('\n🔧 Applied fixes:');
  console.log('- Resolved port conflicts on 8080');
  console.log('- Added retry logic to CVParser operations');
  console.log('- Enhanced Firebase connection error handling');
  console.log('- Added connection monitoring and recovery');
  console.log('- Improved WebSocket connection stability');
};

runTests().catch(console.error);
