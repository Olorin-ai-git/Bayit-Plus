package tv.bayit.plus.core.testing

/**
 * Mock implementation of Analytics Tracker for testing.
 *
 * Captures all analytics events for verification in tests.
 *
 * Usage:
 * ```
 * val analytics = MockAnalyticsTracker()
 * viewModel.loadContent()  // This triggers analytics events
 *
 * // Verify events were tracked
 * assertThat(analytics.trackedScreens).contains("vod_loaded")
 * assertThat(analytics.trackedEvents).hasSize(3)
 * assertThat(analytics.getEvent("content_clicked")?.get("content_id")).isEqualTo("123")
 * ```
 */
class MockAnalyticsTracker {

    private val _trackedScreens = mutableListOf<String>()
    private val _trackedEvents = mutableListOf<TrackedEvent>()
    private val _trackedErrors = mutableListOf<TrackedError>()

    /**
     * List of tracked screen names.
     */
    val trackedScreens: List<String> get() = _trackedScreens.toList()

    /**
     * List of tracked events.
     */
    val trackedEvents: List<TrackedEvent> get() = _trackedEvents.toList()

    /**
     * List of tracked errors.
     */
    val trackedErrors: List<TrackedError> get() = _trackedErrors.toList()

    /**
     * Track a screen view.
     */
    fun trackScreen(screenName: String) {
        _trackedScreens.add(screenName)
    }

    /**
     * Track an event with parameters.
     */
    fun trackEvent(eventName: String, parameters: Map<String, Any> = emptyMap()) {
        _trackedEvents.add(TrackedEvent(eventName, parameters))
    }

    /**
     * Track an error.
     */
    fun trackError(errorName: String, error: Throwable) {
        _trackedErrors.add(TrackedError(errorName, error))
    }

    /**
     * Track an error with message.
     */
    fun trackError(errorName: String, errorMessage: String) {
        _trackedErrors.add(TrackedError(errorName, Exception(errorMessage)))
    }

    /**
     * Get a specific tracked event by name.
     */
    fun getEvent(eventName: String): TrackedEvent? {
        return _trackedEvents.find { it.name == eventName }
    }

    /**
     * Get all events with a specific name.
     */
    fun getEvents(eventName: String): List<TrackedEvent> {
        return _trackedEvents.filter { it.name == eventName }
    }

    /**
     * Check if a screen was tracked.
     */
    fun wasScreenTracked(screenName: String): Boolean {
        return screenName in _trackedScreens
    }

    /**
     * Check if an event was tracked.
     */
    fun wasEventTracked(eventName: String): Boolean {
        return _trackedEvents.any { it.name == eventName }
    }

    /**
     * Check if an error was tracked.
     */
    fun wasErrorTracked(errorName: String): Boolean {
        return _trackedErrors.any { it.name == errorName }
    }

    /**
     * Get count of how many times a screen was tracked.
     */
    fun getScreenTrackCount(screenName: String): Int {
        return _trackedScreens.count { it == screenName }
    }

    /**
     * Get count of how many times an event was tracked.
     */
    fun getEventTrackCount(eventName: String): Int {
        return _trackedEvents.count { it.name == eventName }
    }

    /**
     * Clear all tracked data.
     */
    fun clear() {
        _trackedScreens.clear()
        _trackedEvents.clear()
        _trackedErrors.clear()
    }

    /**
     * Represents a tracked event with its parameters.
     */
    data class TrackedEvent(
        val name: String,
        val parameters: Map<String, Any> = emptyMap()
    )

    /**
     * Represents a tracked error.
     */
    data class TrackedError(
        val name: String,
        val error: Throwable
    )
}
