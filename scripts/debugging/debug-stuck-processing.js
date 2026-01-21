/**
 * Debug script for stuck processing jobs
 * Run this with: node debug-stuck-processing.js <jobId>
 */

const admin = require('firebase-admin');

// Initialize Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

async function debugStuckJob(jobId) {
  if (!jobId) {
    console.error('Please provide a job ID: node debug-stuck-processing.js <jobId>');
    process.exit(1);
  }

  console.log(`🔍 Debugging stuck job: ${jobId}`);
  console.log(`⏰ Current time: ${new Date().toISOString()}`);
  console.log('');

  try {
    // Get job document
    const jobDoc = await db.collection('jobs').doc(jobId).get();
    
    if (!jobDoc.exists) {
      console.error('❌ Job not found');
      return;
    }

    const jobData = jobDoc.data();
    
    console.log('📊 Job Status Analysis:');
    console.log(`   Status: ${jobData.status}`);
    console.log(`   Created: ${jobData.createdAt?.toDate?.() || jobData.createdAt}`);
    console.log(`   Updated: ${jobData.updatedAt?.toDate?.() || jobData.updatedAt}`);
    console.log(`   User ID: ${jobData.userId}`);
    console.log(`   Has Parsed Data: ${!!jobData.parsedData}`);
    console.log(`   Has Improved CV: ${!!jobData.improvedCV}`);
    console.log(`   Improvements Applied: ${!!jobData.improvementsApplied}`);
    console.log('');

    // Check recommendations
    if (jobData.recommendations) {
      console.log('📝 Recommendations Analysis:');
      console.log(`   Total Recommendations: ${jobData.recommendations.length}`);
      console.log(`   Applied Recommendations: ${jobData.appliedRecommendations?.length || 0}`);
      console.log('');
    }

    // Check enhanced features
    if (jobData.enhancedFeatures) {
      console.log('✨ Enhanced Features Status:');
      for (const [featureName, featureData] of Object.entries(jobData.enhancedFeatures)) {
        console.log(`   ${featureName}: ${featureData.status} (${featureData.progress || 0}%)`);
      }
      console.log('');
    }

    // Check file URLs
    console.log('📁 File Information:');
    console.log(`   Original File: ${jobData.fileUrl ? '✅' : '❌'}`);
    console.log(`   Generated HTML: ${jobData.generatedFileUrl ? '✅' : '❌'}`);
    console.log(`   Generated PDF: ${jobData.pdfUrl ? '✅' : '❌'}`);
    console.log('');

    // Provide recommendations
    console.log('🔧 Diagnostic Recommendations:');
    
    if (jobData.status === 'processing') {
      console.log('   ⚠️  Job is stuck in processing status');
      console.log('   💡 Try manually setting status to "completed" in Firestore');
      console.log('   💡 Check Firebase Functions logs for errors');
    } else if (jobData.status === 'completed' || jobData.status === 'improved') {
      console.log('   ✅ Job status indicates completion');
      console.log('   💡 Frontend should navigate to analysis page');
      console.log('   💡 Check browser console for navigation errors');
    } else {
      console.log(`   ❓ Unusual status: ${jobData.status}`);
    }

    // Quick fix command
    if (jobData.status === 'processing' && jobData.parsedData) {
      console.log('');
      console.log('🚀 Quick Fix Commands:');
      console.log('   To manually complete the job:');
      console.log(`   firebase firestore:shell`);
      console.log(`   > db.collection('jobs').doc('${jobId}').update({status: 'completed', updatedAt: new Date()})`);
    }

  } catch (error) {
    console.error('❌ Error debugging job:', error.message);
  }
}

// Get job ID from command line args
const jobId = process.argv[2];
debugStuckJob(jobId).then(() => {
  console.log('🏁 Debug completed');
  process.exit(0);
});