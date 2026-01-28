package com.bayitplus.modules

import android.util.Log

/**
 * DownloadEventThrottler.kt - Event Emission Throttling
 * Prevents performance issues by limiting download progress event frequency
 * Uses time-based throttling with adaptive backpressure
 */
class DownloadEventThrottler(private val throttleMs: Long = 500L) {

    private data class ThrottleState(
        var lastEventTime: Long = 0,
        var lastBytesDownloaded: Long = 0,
        var lastSpeed: Long = 0,
        var speedSamples: MutableList<Long> = mutableListOf(),
    )

    private val throttleStates = mutableMapOf<String, ThrottleState>()
    private companion object {
        private const val TAG = "DownloadEventThrottler"
        private const val MAX_SPEED_SAMPLES = 5 // Keep last 5 speed measurements
    }

    /**
     * Determine if event should be emitted based on throttle timing and progress change
     * @param filename Download filename
     * @param bytesDownloaded Current bytes downloaded
     * @param totalBytes Total bytes to download
     * @return true if event should be emitted, false if throttled
     */
    fun shouldEmitEvent(filename: String, bytesDownloaded: Long, totalBytes: Long): Boolean {
        val now = System.currentTimeMillis()
        val state = throttleStates.getOrPut(filename) { ThrottleState() }

        // Always emit if not yet emitted
        if (state.lastEventTime == 0L) {
            state.lastEventTime = now
            state.lastBytesDownloaded = bytesDownloaded
            return true
        }

        val timeSinceLastEvent = now - state.lastEventTime
        val bytesSinceLastEvent = bytesDownloaded - state.lastBytesDownloaded

        // Emit if minimum throttle time has passed
        if (timeSinceLastEvent >= throttleMs) {
            // Calculate current speed
            val speed = if (timeSinceLastEvent > 0) {
                (bytesSinceLastEvent * 1000) / timeSinceLastEvent
            } else {
                state.lastSpeed
            }

            // Update speed samples for averaging
            state.speedSamples.add(speed)
            if (state.speedSamples.size > MAX_SPEED_SAMPLES) {
                state.speedSamples.removeAt(0)
            }

            state.lastSpeed = speed
            state.lastEventTime = now
            state.lastBytesDownloaded = bytesDownloaded

            return true
        }

        // Don't emit - still within throttle window
        return false
    }

    /**
     * Calculate download speed (average of recent measurements)
     * @param filename Download filename
     * @return Average speed in bytes per second
     */
    fun getAverageSpeed(filename: String): Long {
        val state = throttleStates[filename] ?: return 0L
        if (state.speedSamples.isEmpty()) return state.lastSpeed

        val average = state.speedSamples.sum() / state.speedSamples.size
        return average
    }

    /**
     * Calculate estimated time to completion
     * @param filename Download filename
     * @param bytesDownloaded Bytes downloaded so far
     * @param totalBytes Total bytes to download
     * @return Estimated seconds remaining
     */
    fun calculateEta(filename: String, bytesDownloaded: Long, totalBytes: Long): Long {
        if (bytesDownloaded >= totalBytes) return 0L

        val speed = getAverageSpeed(filename)
        if (speed <= 0) return 0L

        val bytesRemaining = totalBytes - bytesDownloaded
        return bytesRemaining / speed
    }

    /**
     * Clean up throttle state for completed download
     * @param filename Download filename
     */
    fun cleanup(filename: String) {
        throttleStates.remove(filename)
    }

    /**
     * Clear all throttle states
     */
    fun clearAll() {
        throttleStates.clear()
    }

    /**
     * Get throttle statistics for debugging
     * @param filename Download filename
     */
    fun getStats(filename: String): Map<String, Any> {
        val state = throttleStates[filename] ?: return emptyMap()
        return mapOf(
            "lastEventTime" to state.lastEventTime,
            "lastSpeed" to state.lastSpeed,
            "speedSamples" to state.speedSamples.size,
            "averageSpeed" to getAverageSpeed(filename),
        )
    }
}
