package tv.bayit.plus.core.data.download

import android.content.Context
import android.os.StatFs
import dagger.hilt.android.qualifiers.ApplicationContext
import tv.bayit.plus.core.common.logging.BayitLogger
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Monitors available internal storage and returns a [StorageStatus]
 * indicating whether downloads should proceed, warn, or be blocked.
 */
@Singleton
class StorageMonitor @Inject constructor(
    @ApplicationContext private val context: Context,
    private val logger: BayitLogger,
) {

    fun checkStorage(): StorageStatus {
        val stat = StatFs(context.filesDir.absolutePath)
        val availableBytes = stat.availableBytes
        logger.debug(
            "Storage check",
            mapOf("availableBytes" to availableBytes.toString()),
        )
        return when {
            availableBytes < CRITICAL_THRESHOLD_BYTES -> StorageStatus.CRITICAL
            availableBytes < WARNING_THRESHOLD_BYTES -> StorageStatus.WARNING
            else -> StorageStatus.OK
        }
    }

    fun availableStorageMb(): Long {
        val stat = StatFs(context.filesDir.absolutePath)
        return stat.availableBytes / BYTES_PER_MB
    }

    fun usedDownloadStorageMb(): Long {
        val dir = context.filesDir.resolve(DOWNLOADS_DIR)
        if (!dir.exists()) return 0L
        val totalBytes = dir.walkTopDown().filter { it.isFile }.sumOf { it.length() }
        return totalBytes / BYTES_PER_MB
    }

    companion object {
        private const val WARNING_THRESHOLD_BYTES = 5L * 1024 * 1024 * 1024
        private const val CRITICAL_THRESHOLD_BYTES = 500L * 1024 * 1024
        private const val BYTES_PER_MB = 1024L * 1024
        private const val DOWNLOADS_DIR = "BayitDownloads"
    }
}

enum class StorageStatus {
    OK,
    WARNING,
    CRITICAL,
}
