package com.bayitplus.modules

import org.junit.Test
import kotlin.test.assertEquals
import kotlin.test.assertTrue

/**
 * Unit tests for DownloadProgressEvent
 * Tests speed/ETA calculations and formatting
 */
class DownloadProgressEventTest {

    @Test
    fun testDownloadProgressEventCreation() {
        val event = DownloadProgressEvent(
            filename = "video.mp4",
            downloadId = 123L,
            progress = 50,
            bytesDownloaded = 500_000_000L,
            totalBytes = 1_000_000_000L,
            status = "running",
            speed = 5_000_000L, // 5 MB/s
            eta = 100L, // 100 seconds
        )

        assertEquals("video.mp4", event.filename)
        assertEquals(50, event.progress)
        assertEquals(500_000_000L, event.bytesDownloaded)
        assertEquals(1_000_000_000L, event.totalBytes)
    }

    @Test
    fun testGetProgressPercent() {
        val event = DownloadProgressEvent(
            filename = "test.mp4",
            downloadId = 1L,
            progress = 75,
            bytesDownloaded = 750L,
            totalBytes = 1000L,
            status = "running",
        )
        assertEquals(75.0, event.getProgressPercent())
    }

    @Test
    fun testGetSpeedFormattedMB() {
        val event = DownloadProgressEvent(
            filename = "test.mp4",
            downloadId = 1L,
            progress = 50,
            bytesDownloaded = 500L,
            totalBytes = 1000L,
            status = "running",
            speed = 2_500_000L, // 2.5 MB/s
        )
        val formatted = event.getSpeedFormatted()
        assertTrue(formatted.contains("MB/s"))
        assertTrue(formatted.contains("2.5"))
    }

    @Test
    fun testGetSpeedFormattedKB() {
        val event = DownloadProgressEvent(
            filename = "test.mp4",
            downloadId = 1L,
            progress = 50,
            bytesDownloaded = 500L,
            totalBytes = 1000L,
            status = "running",
            speed = 500_000L, // 500 KB/s
        )
        val formatted = event.getSpeedFormatted()
        assertTrue(formatted.contains("KB/s"))
    }

    @Test
    fun testGetEtaFormattedSeconds() {
        val event = DownloadProgressEvent(
            filename = "test.mp4",
            downloadId = 1L,
            progress = 50,
            bytesDownloaded = 500L,
            totalBytes = 1000L,
            status = "running",
            eta = 45L, // 45 seconds
        )
        val formatted = event.getEtaFormatted()
        assertEquals("45s", formatted)
    }

    @Test
    fun testGetEtaFormattedMinutes() {
        val event = DownloadProgressEvent(
            filename = "test.mp4",
            downloadId = 1L,
            progress = 50,
            bytesDownloaded = 500L,
            totalBytes = 1000L,
            status = "running",
            eta = 330L, // 5 minutes 30 seconds
        )
        val formatted = event.getEtaFormatted()
        assertTrue(formatted.contains("m"))
        assertTrue(formatted.contains("30s"))
    }

    @Test
    fun testGetEtaFormattedHours() {
        val event = DownloadProgressEvent(
            filename = "test.mp4",
            downloadId = 1L,
            progress = 50,
            bytesDownloaded = 500L,
            totalBytes = 1000L,
            status = "running",
            eta = 8100L, // 2 hours 15 minutes
        )
        val formatted = event.getEtaFormatted()
        assertTrue(formatted.contains("h"))
        assertTrue(formatted.contains("15m"))
    }

    @Test
    fun testFormatBytesGB() {
        val bytes = 1_500_000_000L // 1.5 GB
        val formatted = DownloadProgressEvent.formatBytes(bytes)
        assertTrue(formatted.contains("GB"))
        assertTrue(formatted.contains("1.5"))
    }

    @Test
    fun testFormatBytesMB() {
        val bytes = 250_000_000L // 250 MB
        val formatted = DownloadProgressEvent.formatBytes(bytes)
        assertTrue(formatted.contains("MB"))
        assertTrue(formatted.contains("250"))
    }

    @Test
    fun testFormatBytesKB() {
        val bytes = 512_000L // 512 KB
        val formatted = DownloadProgressEvent.formatBytes(bytes)
        assertTrue(formatted.contains("KB"))
        assertTrue(formatted.contains("512"))
    }

    @Test
    fun testFormatBytesB() {
        val bytes = 1024L // 1024 B
        val formatted = DownloadProgressEvent.formatBytes(bytes)
        assertTrue(formatted.contains("B"))
    }

    @Test
    fun testZeroEtaFormatting() {
        val event = DownloadProgressEvent(
            filename = "test.mp4",
            downloadId = 1L,
            progress = 100,
            bytesDownloaded = 1000L,
            totalBytes = 1000L,
            status = "successful",
            eta = 0L,
        )
        val formatted = event.getEtaFormatted()
        assertEquals("calculating...", formatted)
    }

    @Test
    fun testNegativeEtaFormatting() {
        val event = DownloadProgressEvent(
            filename = "test.mp4",
            downloadId = 1L,
            progress = 100,
            bytesDownloaded = 1000L,
            totalBytes = 1000L,
            status = "successful",
            eta = -10L,
        )
        val formatted = event.getEtaFormatted()
        assertEquals("calculating...", formatted)
    }

    @Test
    fun testEventTimestamp() {
        val beforeTime = System.currentTimeMillis()
        val event = DownloadProgressEvent(
            filename = "test.mp4",
            downloadId = 1L,
            progress = 50,
            bytesDownloaded = 500L,
            totalBytes = 1000L,
            status = "running",
        )
        val afterTime = System.currentTimeMillis()

        assertTrue(event.timestamp >= beforeTime)
        assertTrue(event.timestamp <= afterTime)
    }
}
