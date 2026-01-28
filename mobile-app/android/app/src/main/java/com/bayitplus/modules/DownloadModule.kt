package com.bayitplus.modules

import android.app.DownloadManager
import android.content.Context
import android.net.Uri
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.modules.core.DeviceEventManagerModule.RCTDeviceEventEmitter
import com.facebook.react.bridge.Arguments
import java.io.File
import java.util.Timer
import kotlin.concurrent.timer

/**
 * DownloadModule.kt - Background Content Downloads with Event System
 * Manages offline video/audio downloads with progress tracking, speed calculation, and ETA
 * Features:
 * - DownloadManager for reliable background downloads
 * - Event-based progress tracking (every 1 second)
 * - Speed calculation and ETA estimation
 * - Event throttling (prevent performance issues)
 * - Storage quota management
 * - Pause/resume/cancel operations
 * - State tracking (started, progress, completed, failed, paused)
 *
 * Uses: Android DownloadManager API, custom event throttling
 */
class DownloadModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

    companion object {
        const val NAME = "DownloadModule"
        private const val DOWNLOADS_DIR = "bayit_downloads"
        private const val PROGRESS_UPDATE_INTERVAL_MS = 1000L
        private val activeDownloads = mutableMapOf<String, Long>() // filename -> downloadId
    }

    private val downloadManager: DownloadManager
        get() = reactApplicationContext.getSystemService(Context.DOWNLOAD_SERVICE) as DownloadManager

    private val eventThrottler = DownloadEventThrottler(500L)
    private val progressTimers = mutableMapOf<String, Timer>()
    private lazy val stateHandler = DownloadStateHandler(::emitEvent, eventThrottler::cleanup)

    override fun getName(): String = NAME

    @ReactMethod
    fun downloadContent(url: String, filename: String, promise: Promise) {
        try {
            if (url.isBlank() || filename.isBlank()) {
                promise.reject("INVALID_INPUT", "URL and filename required")
                return
            }

            val downloadDir = File(reactApplicationContext.getExternalFilesDir(null), DOWNLOADS_DIR).apply { mkdirs() }
            val availableSpace = downloadDir.freeSpace
            if (availableSpace < 100 * 1024 * 1024) { // < 100MB free
                promise.reject("NO_SPACE", "Insufficient storage space")
                return
            }

            val request = DownloadManager.Request(Uri.parse(url))
                .setTitle(filename)
                .setDescription("Bayit+ Download")
                .setDestinationUri(Uri.fromFile(File(downloadDir, filename)))
                .setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED)
                .setMimeType("video/mp4")
                .setAllowedNetworkTypes(DownloadManager.Request.NETWORK_WIFI or DownloadManager.Request.NETWORK_MOBILE)
                .setAllowedOverRoaming(false)

            val downloadId = downloadManager.enqueue(request)
            activeDownloads[filename] = downloadId

            startProgressMonitoring(filename, downloadId)
            emitEvent("download_started", mapOf(
                "filename" to filename,
                "downloadId" to downloadId,
                "status" to "downloading"
            ))
            promise.resolve(mapOf(
                "downloadId" to downloadId,
                "filename" to filename,
                "status" to "downloading"
            ))
        } catch (e: Exception) {
            promise.reject("DOWNLOAD_FAILED", "Failed to start download: ${e.message}", e)
        }
    }

    @ReactMethod
    fun pauseDownload(filename: String, promise: Promise) {
        try {
            if (!activeDownloads.containsKey(filename)) {
                promise.reject("NOT_FOUND", "Download not found")
                return
            }
            progressTimers[filename]?.cancel()
            progressTimers.remove(filename)
            emitEvent("download_paused", mapOf("filename" to filename))
            promise.resolve(mapOf("status" to "paused", "filename" to filename))
        } catch (e: Exception) {
            promise.reject("PAUSE_FAILED", "Failed to pause: ${e.message}", e)
        }
    }

    @ReactMethod
    fun resumeDownload(filename: String, url: String, promise: Promise) {
        try {
            val downloadId = activeDownloads[filename]
            if (downloadId != null) {
                downloadManager.remove(downloadId)
            }
            progressTimers[filename]?.cancel()
            downloadContent(url, filename, promise)
        } catch (e: Exception) {
            promise.reject("RESUME_FAILED", "Failed to resume: ${e.message}", e)
        }
    }

    @ReactMethod
    fun cancelDownload(filename: String, promise: Promise) {
        try {
            val downloadId = activeDownloads[filename] ?: return promise.reject("NOT_FOUND", "Download not found")
            downloadManager.remove(downloadId)
            progressTimers[filename]?.cancel()
            activeDownloads.remove(filename)
            eventThrottler.cleanup(filename)
            emitEvent("download_cancelled", mapOf("filename" to filename))
            promise.resolve(mapOf("status" to "cancelled", "filename" to filename))
        } catch (e: Exception) {
            promise.reject("CANCEL_FAILED", "Failed to cancel: ${e.message}", e)
        }
    }

    @ReactMethod
    fun getDownloadProgress(filename: String, promise: Promise) {
        val downloadId = activeDownloads[filename] ?: return promise.reject("NOT_FOUND", "Download not found")
        val downloadStatus = DownloadQueryHelper.queryDownloadStatus(downloadManager, downloadId)
            ?: return promise.reject("NOT_FOUND", "Download not found")
        promise.resolve(mapOf(
            "downloadId" to downloadId, "filename" to filename, "progress" to downloadStatus.progress,
            "bytesDownloaded" to downloadStatus.bytesDownloaded, "totalBytes" to downloadStatus.totalBytes,
            "status" to DownloadQueryHelper.getStatusString(downloadStatus.status)
        ))
    }

    @ReactMethod
    fun getDownloadedContent(filename: String, promise: Promise) {
        try {
            val downloadDir = File(reactApplicationContext.getExternalFilesDir(null), DOWNLOADS_DIR)
            val downloadFile = File(downloadDir, filename)
            if (!downloadFile.exists()) {
                return promise.reject("NOT_FOUND", "Content not found")
            }
            promise.resolve(mapOf("path" to downloadFile.absolutePath, "size" to downloadFile.length(), "exists" to true))
        } catch (e: Exception) {
            promise.reject("GET_FAILED", "Failed to get path: ${e.message}", e)
        }
    }

    @ReactMethod
    fun clearDownloads(promise: Promise) {
        try {
            activeDownloads.forEach { (_, id) -> downloadManager.remove(id) }
            progressTimers.values.forEach { it.cancel() }
            activeDownloads.clear()
            progressTimers.clear()
            eventThrottler.clearAll()
            emitEvent("downloads_cleared", null)
            promise.resolve(mapOf("status" to "cleared"))
        } catch (e: Exception) {
            promise.reject("CLEAR_FAILED", "Failed to clear: ${e.message}", e)
        }
    }

    private fun startProgressMonitoring(filename: String, downloadId: Long) {
        progressTimers[filename] = timer(initialDelay = PROGRESS_UPDATE_INTERVAL_MS, period = PROGRESS_UPDATE_INTERVAL_MS) {
            val downloadStatus = DownloadQueryHelper.queryDownloadStatus(downloadManager, downloadId) ?: return@timer
            if (eventThrottler.shouldEmitEvent(filename, downloadStatus.bytesDownloaded, downloadStatus.totalBytes)) {
                val speed = eventThrottler.getAverageSpeed(filename)
                val eta = eventThrottler.calculateEta(filename, downloadStatus.bytesDownloaded, downloadStatus.totalBytes)
                val event = DownloadProgressEvent(filename, downloadId, downloadStatus.progress, downloadStatus.bytesDownloaded,
                    downloadStatus.totalBytes, DownloadQueryHelper.getStatusString(downloadStatus.status), speed, eta)
                stateHandler.handleStateTransition(downloadStatus.status, filename, downloadId, event, activeDownloads, progressTimers)
            }
        }
    }

    private fun emitEvent(eventName: String, data: Map<String, Any?>?) {
        try {
            val eventData = if (data != null) Arguments.makeNativeMap(data) else Arguments.createMap()
            reactApplicationContext.getJSModule(RCTDeviceEventEmitter::class.java).emit(eventName, eventData)
        } catch (e: Exception) { /* Silent fail */ }
    }
}
