package tv.bayit.plus.feature.tv.watchnext

import android.content.Context
import androidx.hilt.work.HiltWorker
import androidx.work.Constraints
import androidx.work.CoroutineWorker
import androidx.work.ExistingPeriodicWorkPolicy
import androidx.work.ExistingWorkPolicy
import androidx.work.NetworkType
import androidx.work.OneTimeWorkRequestBuilder
import androidx.work.PeriodicWorkRequestBuilder
import androidx.work.WorkManager
import androidx.work.WorkerParameters
import dagger.assisted.Assisted
import dagger.assisted.AssistedInject
import timber.log.Timber
import java.util.concurrent.TimeUnit

/**
 * A [CoroutineWorker] that periodically purges stale Watch Next entries from the Android TV
 * Watch Next channel via [WatchNextManager.removeStaleEntries].
 *
 * Scheduled via [enqueuePeriodicSync] (every 15 minutes, idle + any network) or triggered
 * immediately via [enqueueSingleSync] for on-demand maintenance.
 */
@HiltWorker
public class WatchNextSyncWorker @AssistedInject constructor(
    @Assisted appContext: Context,
    @Assisted workerParams: WorkerParameters,
    private val watchNextManager: WatchNextManager,
) : CoroutineWorker(appContext, workerParams) {

    override suspend fun doWork(): Result {
        Timber.d("WatchNextSyncWorker: starting stale entry cleanup")
        return try {
            watchNextManager.removeStaleEntries()
            Timber.d("WatchNextSyncWorker: cleanup complete")
            Result.success()
        } catch (e: Exception) {
            Timber.e(e, "WatchNextSyncWorker: cleanup failed attempt=%d", runAttemptCount)
            Result.retry()
        }
    }

    public companion object {

        /** Unique name used to identify the periodic sync chain in [WorkManager]. */
        public const val WORK_NAME: String = "watch_next_sync"

        private val syncConstraints = Constraints.Builder()
            .setRequiredNetworkType(NetworkType.CONNECTED)
            .setRequiresDeviceIdle(false)
            .build()

        /**
         * Enqueues a periodic [WatchNextSyncWorker] that runs every 15 minutes.
         *
         * Uses [ExistingPeriodicWorkPolicy.KEEP] so an already-scheduled chain is not
         * restarted when this is called multiple times (e.g. on each app launch).
         *
         * @param context Application context used to obtain the [WorkManager] instance.
         */
        public fun enqueuePeriodicSync(context: Context) {
            val request = PeriodicWorkRequestBuilder<WatchNextSyncWorker>(
                repeatInterval = 15L,
                repeatIntervalTimeUnit = TimeUnit.MINUTES,
            )
                .setConstraints(syncConstraints)
                .build()

            WorkManager.getInstance(context).enqueueUniquePeriodicWork(
                WORK_NAME,
                ExistingPeriodicWorkPolicy.KEEP,
                request,
            )
            Timber.d("WatchNextSyncWorker: periodic sync enqueued policy=KEEP interval=15min")
        }

        /**
         * Enqueues a one-time [WatchNextSyncWorker] for immediate execution.
         *
         * Useful after a playback session ends or when the app returns to the foreground,
         * ensuring Watch Next reflects current watch state without waiting for the next
         * periodic interval.
         *
         * @param context Application context used to obtain the [WorkManager] instance.
         */
        public fun enqueueSingleSync(context: Context) {
            val request = OneTimeWorkRequestBuilder<WatchNextSyncWorker>()
                .setConstraints(syncConstraints)
                .build()

            WorkManager.getInstance(context).enqueueUniqueWork(
                "${WORK_NAME}_once",
                ExistingWorkPolicy.REPLACE,
                request,
            )
            Timber.d("WatchNextSyncWorker: single sync enqueued policy=REPLACE")
        }
    }
}
