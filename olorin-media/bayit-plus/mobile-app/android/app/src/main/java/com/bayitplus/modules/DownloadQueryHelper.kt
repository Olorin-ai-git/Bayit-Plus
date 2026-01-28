package com.bayitplus.modules

import android.app.DownloadManager
import android.content.Context
import com.facebook.react.bridge.Promise

/**
 * DownloadQueryHelper.kt - DownloadManager Query Helper
 * Encapsulates common DownloadManager queries and result handling
 */
object DownloadQueryHelper {

    data class DownloadStatus(
        val status: Int,
        val bytesDownloaded: Long,
        val totalBytes: Long,
        val progress: Int,
    )

    fun queryDownloadStatus(
        downloadManager: DownloadManager,
        downloadId: Long,
    ): DownloadStatus? {
        return try {
            val query = DownloadManager.Query().setFilterById(downloadId)
            val cursor = downloadManager.query(query) ?: return null
            if (!cursor.moveToFirst()) {
                cursor.close()
                return null
            }
            val status = cursor.getInt(cursor.getColumnIndex(DownloadManager.COLUMN_STATUS))
            val bytesDownloaded = cursor.getLong(cursor.getColumnIndex(DownloadManager.COLUMN_BYTES_DOWNLOADED_SO_FAR))
            val totalBytes = cursor.getLong(cursor.getColumnIndex(DownloadManager.COLUMN_TOTAL_SIZE_BYTES))
            val progress = if (totalBytes > 0) (bytesDownloaded * 100 / totalBytes).toInt() else 0
            cursor.close()
            DownloadStatus(status, bytesDownloaded, totalBytes, progress)
        } catch (e: Exception) {
            null
        }
    }

    fun getStatusString(status: Int): String = when (status) {
        DownloadManager.STATUS_RUNNING -> "running"
        DownloadManager.STATUS_SUCCESSFUL -> "successful"
        DownloadManager.STATUS_PAUSED -> "paused"
        DownloadManager.STATUS_PENDING -> "pending"
        DownloadManager.STATUS_FAILED -> "failed"
        else -> "unknown"
    }
}
