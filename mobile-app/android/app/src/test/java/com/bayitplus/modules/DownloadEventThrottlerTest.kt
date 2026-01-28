package com.bayitplus.modules

import org.junit.Before
import org.junit.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertTrue

/**
 * Unit tests for DownloadEventThrottler
 * Tests event throttling, speed calculation, and ETA estimation
 */
class DownloadEventThrottlerTest {

    private lateinit var throttler: DownloadEventThrottler

    @Before
    fun setUp() {
        throttler = DownloadEventThrottler(500L) // 500ms throttle window
    }

    @Test
    fun testFirstEventAlwaysEmitted() {
        val filename = "test.mp4"
        val shouldEmit = throttler.shouldEmitEvent(filename, 1000L, 10000L)
        assertTrue(shouldEmit)
    }

    @Test
    fun testEventThrottledWithinWindow() {
        val filename = "test.mp4"
        throttler.shouldEmitEvent(filename, 1000L, 10000L)

        // Try to emit again immediately - should be throttled
        val shouldEmit = throttler.shouldEmitEvent(filename, 2000L, 10000L)
        assertFalse(shouldEmit)
    }

    @Test
    fun testEventEmittedAfterThrottleWindow() {
        val filename = "test.mp4"
        throttler.shouldEmitEvent(filename, 1000L, 10000L)

        // Wait for throttle window
        Thread.sleep(600)

        // Should emit now
        val shouldEmit = throttler.shouldEmitEvent(filename, 5000L, 10000L)
        assertTrue(shouldEmit)
    }

    @Test
    fun testSpeedCalculation() {
        val filename = "test.mp4"
        throttler.shouldEmitEvent(filename, 0L, 10_000_000L)

        Thread.sleep(100) // 100ms

        throttler.shouldEmitEvent(filename, 1_000_000L, 10_000_000L) // 1MB in 100ms = 10MB/s
        val speed = throttler.getAverageSpeed(filename)

        // Speed should be approximately 10MB/s
        assertTrue(speed > 0)
    }

    @Test
    fun testEtaCalculation() {
        val filename = "test.mp4"
        throttler.shouldEmitEvent(filename, 0L, 10_000_000L)

        Thread.sleep(100)

        throttler.shouldEmitEvent(filename, 1_000_000L, 10_000_000L)

        // 9MB remaining at 10MB/s = ~0.9 seconds
        val eta = throttler.calculateEta(filename, 1_000_000L, 10_000_000L)
        assertTrue(eta >= 0)
    }

    @Test
    fun testZeroSpeedEta() {
        val filename = "test.mp4"
        val eta = throttler.calculateEta(filename, 100L, 1000L)

        // No speed samples yet - should return 0
        assertEquals(0L, eta)
    }

    @Test
    fun testFullyDownloadedEta() {
        val filename = "test.mp4"
        throttler.shouldEmitEvent(filename, 1000L, 10000L)

        // When bytes downloaded >= total bytes, ETA should be 0
        val eta = throttler.calculateEta(filename, 10000L, 10000L)
        assertEquals(0L, eta)
    }

    @Test
    fun testCleanup() {
        val filename = "test.mp4"
        throttler.shouldEmitEvent(filename, 1000L, 10000L)

        throttler.cleanup(filename)

        // After cleanup, should emit again on next call
        val shouldEmit = throttler.shouldEmitEvent(filename, 2000L, 10000L)
        assertTrue(shouldEmit)
    }

    @Test
    fun testClearAll() {
        val file1 = "test1.mp4"
        val file2 = "test2.mp4"

        throttler.shouldEmitEvent(file1, 1000L, 10000L)
        throttler.shouldEmitEvent(file2, 1000L, 10000L)

        throttler.clearAll()

        // Both should emit again after clear
        assertTrue(throttler.shouldEmitEvent(file1, 2000L, 10000L))
        assertTrue(throttler.shouldEmitEvent(file2, 2000L, 10000L))
    }

    @Test
    fun testGetStats() {
        val filename = "test.mp4"
        throttler.shouldEmitEvent(filename, 1000L, 10000L)

        val stats = throttler.getStats(filename)

        assertTrue(stats.containsKey("lastEventTime"))
        assertTrue(stats.containsKey("lastSpeed"))
        assertTrue(stats.containsKey("speedSamples"))
        assertTrue(stats.containsKey("averageSpeed"))
    }

    @Test
    fun testMultipleDownloads() {
        val file1 = "test1.mp4"
        val file2 = "test2.mp4"

        throttler.shouldEmitEvent(file1, 100L, 1000L)
        throttler.shouldEmitEvent(file2, 200L, 2000L)

        // Should not emit for file1 within window
        assertFalse(throttler.shouldEmitEvent(file1, 150L, 1000L))

        // Should not emit for file2 within window
        assertFalse(throttler.shouldEmitEvent(file2, 250L, 2000L))

        Thread.sleep(600)

        // Both should emit after window
        assertTrue(throttler.shouldEmitEvent(file1, 300L, 1000L))
        assertTrue(throttler.shouldEmitEvent(file2, 400L, 2000L))
    }

    @Test
    fun testAverageSpeedMultipleSamples() {
        val filename = "test.mp4"

        // First event
        throttler.shouldEmitEvent(filename, 1_000_000L, 10_000_000L)

        Thread.sleep(100)

        // Second event
        throttler.shouldEmitEvent(filename, 3_000_000L, 10_000_000L)

        val speed = throttler.getAverageSpeed(filename)

        // Should have calculated speed
        assertTrue(speed > 0)
    }
}
