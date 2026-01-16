/**
 * Browser Console Script to Check Upload Queue
 *
 * HOW TO USE:
 * 1. Open your Bayit+ web app in the browser
 * 2. Press F12 to open Developer Tools
 * 3. Go to the "Console" tab
 * 4. Copy and paste this entire script
 * 5. Press Enter
 */

(async function checkUploads() {
  console.clear();
  console.log('%c📊 Bayit+ Upload Queue Status', 'font-size: 20px; font-weight: bold; color: #a855f7');
  console.log('═'.repeat(80));

  try {
    // Get auth token from localStorage
    const authData = JSON.parse(localStorage.getItem('bayit-auth') || '{}');
    const token = authData?.state?.token;

    if (!token) {
      console.error('%c❌ Not authenticated', 'color: red; font-weight: bold');
      console.log('Please login first, then run this script again.');
      return;
    }

    // Determine API URL
    const API_URL = window.location.origin.includes('localhost')
      ? 'http://localhost:8000/api/v1'
      : `${window.location.origin}/api/v1`;

    console.log(`%c🔗 API URL: ${API_URL}`, 'color: #888');
    console.log('─'.repeat(80));

    // Fetch upload queue
    const response = await fetch(`${API_URL}/admin/uploads/queue`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();

    // Display Statistics
    console.log('\n%c📈 Queue Statistics', 'font-size: 16px; font-weight: bold; color: #10b981');
    console.table({
      'Total Jobs': data.stats.total_jobs,
      'Queued': `${data.stats.queued} 📋`,
      'Processing': `${data.stats.processing} 🔄`,
      'Completed': `${data.stats.completed} ✅`,
      'Failed': `${data.stats.failed} ❌`,
      'Cancelled': `${data.stats.cancelled} ⛔`,
      'Skipped': data.stats.skipped || 0
    });

    // File size info
    const totalSizeMB = (data.stats.total_size_bytes / (1024 * 1024)).toFixed(2);
    const uploadedMB = (data.stats.uploaded_bytes / (1024 * 1024)).toFixed(2);
    const percentComplete = data.stats.total_size_bytes > 0
      ? ((data.stats.uploaded_bytes / data.stats.total_size_bytes) * 100).toFixed(1)
      : '0.0';

    console.log(`\n%c💾 Data Transfer`, 'font-size: 14px; font-weight: bold; color: #3b82f6');
    console.log(`   Total Size: ${totalSizeMB} MB`);
    console.log(`   Uploaded: ${uploadedMB} MB`);
    console.log(`   Progress: ${percentComplete}%`);

    // Queue status
    if (data.queue_paused) {
      console.log(`\n%c⏸️  QUEUE PAUSED`, 'font-size: 16px; font-weight: bold; color: #f59e0b');
      if (data.pause_reason) {
        console.log(`   Reason: ${data.pause_reason}`);
      }
    } else {
      console.log(`\n%c▶️  QUEUE ACTIVE`, 'font-size: 16px; font-weight: bold; color: #10b981');
    }

    // Active job
    if (data.active_job) {
      console.log('\n%c🔄 Currently Processing', 'font-size: 16px; font-weight: bold; color: #8b5cf6');
      console.log('─'.repeat(80));

      const job = data.active_job;
      const fileSizeMB = job.file_size ? (job.file_size / (1024 * 1024)).toFixed(2) : '?';
      const uploadedMB = (job.bytes_uploaded / (1024 * 1024)).toFixed(2);
      const speedMBps = job.upload_speed ? (job.upload_speed / (1024 * 1024)).toFixed(2) : '?';
      const eta = job.eta_seconds ? formatETA(job.eta_seconds) : '?';

      console.table({
        'Job ID': job.job_id,
        'Filename': job.filename,
        'Type': job.type,
        'Status': job.status,
        'Progress': `${job.progress.toFixed(1)}%`,
        'File Size': `${fileSizeMB} MB`,
        'Uploaded': `${uploadedMB} MB`,
        'Speed': `${speedMBps} MB/s`,
        'ETA': eta,
        'Started': job.started_at ? new Date(job.started_at).toLocaleString() : 'N/A'
      });

      // Visual progress bar
      const barLength = 50;
      const filled = Math.round((job.progress / 100) * barLength);
      const empty = barLength - filled;
      const progressBar = '█'.repeat(filled) + '░'.repeat(empty);
      console.log(`\n   ${progressBar} ${job.progress.toFixed(1)}%`);

    } else {
      console.log('\n%c✅ No active upload job', 'color: #10b981; font-weight: bold');
    }

    // Queued jobs
    if (data.queue && data.queue.length > 0) {
      console.log(`\n%c📋 Queued Jobs (${data.queue.length})`, 'font-size: 16px; font-weight: bold; color: #3b82f6');
      console.log('─'.repeat(80));

      const queueTable = data.queue.slice(0, 10).map((job, index) => ({
        '#': index + 1,
        'Filename': job.filename.length > 40 ? job.filename.substring(0, 37) + '...' : job.filename,
        'Type': job.type,
        'Size (MB)': job.file_size ? (job.file_size / (1024 * 1024)).toFixed(2) : '?',
        'Status': job.status,
        'Created': new Date(job.created_at).toLocaleTimeString()
      }));

      console.table(queueTable);

      if (data.queue.length > 10) {
        console.log(`   ... and ${data.queue.length - 10} more jobs in queue`);
      }
    } else {
      console.log('\n%c✅ No jobs in queue', 'color: #10b981; font-weight: bold');
    }

    // Recent completed
    if (data.recent_completed && data.recent_completed.length > 0) {
      console.log(`\n%c✅ Recently Completed (${data.recent_completed.length})`, 'font-size: 14px; font-weight: bold; color: #10b981');
      console.log('─'.repeat(80));

      const completedTable = data.recent_completed.slice(0, 5).map((job, index) => ({
        '#': index + 1,
        'Filename': job.filename.length > 40 ? job.filename.substring(0, 37) + '...' : job.filename,
        'Type': job.type,
        'Status': job.status,
        'Completed': job.completed_at ? new Date(job.completed_at).toLocaleTimeString() : 'N/A'
      }));

      console.table(completedTable);
    }

    // Summary
    console.log('\n' + '═'.repeat(80));
    const hasActiveUploads = data.active_job !== null || (data.queue && data.queue.length > 0);

    if (hasActiveUploads) {
      console.log('%c🚀 Active uploads detected in the queue!', 'font-size: 18px; font-weight: bold; color: #10b981');
      if (data.active_job) {
        console.log(`   Currently uploading: ${data.active_job.filename}`);
      }
      if (data.queue.length > 0) {
        console.log(`   ${data.queue.length} job(s) waiting in queue`);
      }
    } else {
      console.log('%c💤 No active uploads in the queue', 'font-size: 18px; font-weight: bold; color: #888');
    }

    console.log('═'.repeat(80));
    console.log('\n%cℹ️  Tip: Re-run this script anytime to refresh the status', 'color: #3b82f6');

  } catch (error) {
    console.error('%c❌ Error checking upload queue', 'color: red; font-weight: bold');
    console.error(error);
    console.log('\n%cTroubleshooting:', 'font-weight: bold');
    console.log('  1. Make sure the API server is running');
    console.log('  2. Check that you are logged in');
    console.log('  3. Verify you have admin permissions');
  }

  function formatETA(seconds) {
    if (seconds < 60) return `${Math.round(seconds)}s`;
    if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
    const hours = Math.floor(seconds / 3600);
    const mins = Math.round((seconds % 3600) / 60);
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  }
})();
