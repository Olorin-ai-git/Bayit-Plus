/**
 * Quick script to check upload queue status
 * Run with: node check-uploads.js
 */

const API_URL = process.env.VITE_API_URL || 'http://localhost:8000/api/v1';

async function checkUploadQueue() {
  try {
    // Get auth token from localStorage (if running in browser context)
    // For CLI, you'd need to pass the token as an environment variable
    const token = process.env.AUTH_TOKEN;

    const headers = {
      'Content-Type': 'application/json',
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_URL}/admin/uploads/queue`, {
      method: 'GET',
      headers,
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    console.log('\n📊 Upload Queue Status\n');
    console.log('─'.repeat(60));

    // Stats
    console.log('\n📈 Statistics:');
    console.log(`  Total Jobs: ${data.stats.total_jobs}`);
    console.log(`  Queued: ${data.stats.queued}`);
    console.log(`  Processing: ${data.stats.processing}`);
    console.log(`  Completed: ${data.stats.completed}`);
    console.log(`  Failed: ${data.stats.failed}`);
    console.log(`  Cancelled: ${data.stats.cancelled}`);

    if (data.stats.skipped) {
      console.log(`  Skipped: ${data.stats.skipped}`);
    }

    const totalSizeMB = (data.stats.total_size_bytes / (1024 * 1024)).toFixed(2);
    const uploadedMB = (data.stats.uploaded_bytes / (1024 * 1024)).toFixed(2);
    const percentComplete = data.stats.total_size_bytes > 0
      ? ((data.stats.uploaded_bytes / data.stats.total_size_bytes) * 100).toFixed(1)
      : '0.0';

    console.log(`  Total Size: ${totalSizeMB} MB`);
    console.log(`  Uploaded: ${uploadedMB} MB (${percentComplete}%)`);

    // Queue status
    if (data.queue_paused) {
      console.log(`\n⏸️  Queue Status: PAUSED`);
      if (data.pause_reason) {
        console.log(`  Reason: ${data.pause_reason}`);
      }
    } else {
      console.log(`\n▶️  Queue Status: ACTIVE`);
    }

    // Active job
    if (data.active_job) {
      console.log('\n🔄 Currently Processing:');
      console.log(`  Job ID: ${data.active_job.job_id}`);
      console.log(`  File: ${data.active_job.filename}`);
      console.log(`  Type: ${data.active_job.type}`);
      console.log(`  Status: ${data.active_job.status}`);
      console.log(`  Progress: ${data.active_job.progress.toFixed(1)}%`);

      if (data.active_job.upload_speed) {
        const speedMBps = (data.active_job.upload_speed / (1024 * 1024)).toFixed(2);
        console.log(`  Speed: ${speedMBps} MB/s`);
      }

      if (data.active_job.eta_seconds) {
        const eta = formatETA(data.active_job.eta_seconds);
        console.log(`  ETA: ${eta}`);
      }
    } else {
      console.log('\n✅ No active upload job');
    }

    // Queued jobs
    if (data.queue && data.queue.length > 0) {
      console.log(`\n📋 Queued Jobs (${data.queue.length}):`);
      data.queue.slice(0, 5).forEach((job, index) => {
        const sizeMB = job.file_size ? (job.file_size / (1024 * 1024)).toFixed(2) : '?';
        console.log(`  ${index + 1}. ${job.filename} (${sizeMB} MB) - ${job.status}`);
      });

      if (data.queue.length > 5) {
        console.log(`  ... and ${data.queue.length - 5} more`);
      }
    } else {
      console.log('\n✅ No jobs in queue');
    }

    // Recent completed
    if (data.recent_completed && data.recent_completed.length > 0) {
      console.log(`\n✅ Recently Completed (${data.recent_completed.length}):`);
      data.recent_completed.slice(0, 3).forEach((job, index) => {
        console.log(`  ${index + 1}. ${job.filename} - ${job.status}`);
      });
    }

    console.log('\n' + '─'.repeat(60) + '\n');

    // Summary
    const hasActiveUploads = data.active_job !== null || (data.queue && data.queue.length > 0);
    if (hasActiveUploads) {
      console.log('🚀 Active uploads detected in the queue!');
    } else {
      console.log('💤 No active uploads in the queue');
    }

  } catch (error) {
    console.error('\n❌ Error checking upload queue:', error.message);
    console.error('\nMake sure:');
    console.error('  1. The API server is running');
    console.error('  2. You have set AUTH_TOKEN environment variable if authentication is required');
    console.error('  3. The API URL is correct (current: ' + API_URL + ')');
  }
}

function formatETA(seconds) {
  if (seconds < 60) return `${Math.round(seconds)}s`;
  if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
  const hours = Math.floor(seconds / 3600);
  const mins = Math.round((seconds % 3600) / 60);
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
}

checkUploadQueue();
