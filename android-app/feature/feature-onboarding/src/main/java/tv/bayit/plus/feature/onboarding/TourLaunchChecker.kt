package tv.bayit.plus.feature.onboarding

import tv.bayit.plus.core.common.logging.BayitLogger
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Determines whether the feature tour should be shown on app launch.
 * Reads from the local DataStore to avoid blocking on network calls.
 */
@Singleton
class TourLaunchChecker @Inject constructor(
    private val tourDataStore: TourDataStore,
    private val logger: BayitLogger,
) {
    /**
     * Returns true if the tour has not been completed or skipped.
     */
    suspend fun shouldShowTour(): Boolean {
        val state = tourDataStore.load()
        val show = state.completionStatus == "not_started" ||
            state.completionStatus == "in_progress"
        logger.debug(
            "Tour launch check",
            mapOf("status" to state.completionStatus, "shouldShow" to show.toString()),
        )
        return show
    }
}
