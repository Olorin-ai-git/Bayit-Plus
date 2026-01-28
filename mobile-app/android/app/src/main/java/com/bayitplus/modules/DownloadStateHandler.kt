package com.bayitplus.modules

import android.app.DownloadManager
import com.facebook.react.bridge.Arguments

/**
 * DownloadStateHandler.kt - Download State Transition Handler
 * Handles download state changes and emits appropriate events
 */
class DownloadStateHandler(
    private val eventEmitter: (String, Map<String, Any?>) -> Unit,
    private val onCleanup: (String) -> Unit,
) {

    /**
     * Handle download state transition
     * @param status Current download status from DownloadManager
     * @param filename Download filename
     * @param downloadId Download ID
     * @param event Download progress event with speed/ETA
     * @param activeDownloads Map of active downloads to clean up
     * @param progressTimers Map of progress timers to cancel
     */
    fun handleStateTransition(
        status: Int,
        filename: String,
        downloadId: Long,
        event: DownloadProgressEvent,
        activeDownloads: MutableMap<String, Long>,
        progressTimers: MutableMap<String, java.util.Timer>,
    ) {
        when (status) {
            DownloadManager.STATUS_SUCCESSFUL -> {
                progressTimers[filename]?.cancel()
                eventEmitter("download_completed", mapOf(
                    "filename" to filename,
                    "downloadId" to downloadId,
                    "progress" to 100,
                    "size" to event.totalBytes,
                ))
                cleanup(filename, activeDownloads, progressTimers)
            }
            DownloadManager.STATUS_FAILED -> {
                progressTimers[filename]?.cancel()
                eventEmitter("download_failed", mapOf(
                    "filename" to filename,
                    "downloadId" to downloadId,
                ))
                cleanup(filename, activeDownloads, progressTimers)
            }
            DownloadManager.STATUS_RUNNING -> {
                eventEmitter("download_progress", mapOf(
                    "filename" to filename,
                    "progress" to event.progress,
                    "bytesDownloaded" to event.bytesDownloaded,
                    "totalBytes" to event.totalBytes,
                    "speed" to event.getSpeedFormatted(),
                    "eta" to event.getEtaFormatted(),
                ))
            }
            DownloadManager.STATUS_PAUSED -> {
                eventEmitter("download_paused", mapOf("filename" to filename))
            }
        }
    }

    private fun cleanup(
        filename: String,
        activeDownloads: MutableMap<String, Long>,
        progressTimers: MutableMap<String, java.util.Timer>,
    ) {
        activeDownloads.remove(filename)
        progressTimers.remove(filename)
        onCleanup(filename)
    }
}
