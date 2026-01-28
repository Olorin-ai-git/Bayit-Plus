package com.bayitplus.modules

/**
 * DownloadProgressEvent.kt - Structured Download Progress Data
 * Represents a single download progress update with speed and ETA calculations
 */
data class DownloadProgressEvent(
    val filename: String,
    val downloadId: Long,
    val progress: Int,
    val bytesDownloaded: Long,
    val totalBytes: Long,
    val status: String,
    val speed: Long = 0L, // bytes per second
    val eta: Long = 0L, // seconds remaining
    val timestamp: Long = System.currentTimeMillis(),
) {
    /**
     * Get human-readable progress (0.0 - 100.0)
     */
    fun getProgressPercent(): Double = (progress / 100.0) * 100.0

    /**
     * Get human-readable speed (e.g., "1.5 MB/s")
     */
    fun getSpeedFormatted(): String {
        return when {
            speed >= 1_000_000 -> String.format("%.1f MB/s", speed / 1_000_000.0)
            speed >= 1_000 -> String.format("%.1f KB/s", speed / 1_000.0)
            else -> "$speed B/s"
        }
    }

    /**
     * Get human-readable ETA (e.g., "5m 30s" or "2h 15m")
     */
    fun getEtaFormatted(): String {
        return when {
            eta <= 0 -> "calculating..."
            eta < 60 -> "${eta}s"
            eta < 3600 -> {
                val minutes = eta / 60
                val seconds = eta % 60
                "${minutes}m ${seconds}s"
            }
            else -> {
                val hours = eta / 3600
                val minutes = (eta % 3600) / 60
                "${hours}h ${minutes}m"
            }
        }
    }

    /**
     * Get human-readable bytes (e.g., "250 MB" or "1.5 GB")
     */
    companion object {
        fun formatBytes(bytes: Long): String {
            return when {
                bytes >= 1_000_000_000 -> String.format("%.1f GB", bytes / 1_000_000_000.0)
                bytes >= 1_000_000 -> String.format("%.1f MB", bytes / 1_000_000.0)
                bytes >= 1_000 -> String.format("%.1f KB", bytes / 1_000.0)
                else -> "$bytes B"
            }
        }
    }
}
