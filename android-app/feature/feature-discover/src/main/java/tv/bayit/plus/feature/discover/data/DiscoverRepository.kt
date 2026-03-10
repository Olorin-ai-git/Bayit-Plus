package tv.bayit.plus.feature.discover.data

import tv.bayit.plus.core.common.BayitResult

/**
 * Repository contract for Discover tab data.
 *
 * Callers receive [BayitResult] wrappers rather than raw exceptions so that
 * the ViewModel can pattern-match on [BayitResult.Success] / [BayitResult.Error]
 * without needing try/catch blocks. This mirrors the pattern used by all
 * repositories in `core-data`.
 */
interface DiscoverRepository {

    /**
     * Fetches the server-side feature configuration.
     *
     * On success, returns a [DiscoverConfigDto] whose [DiscoverConfigDto.features]
     * list can be joined against [tv.bayit.plus.feature.discover.model.DiscoverFeatureCatalog]
     * by feature ID to hydrate the UI.
     *
     * Failures are wrapped in [BayitResult.Error] and must not throw.
     */
    suspend fun fetchConfig(): BayitResult<DiscoverConfigDto>

    /**
     * Records that the user completed or skipped a feature walkthrough.
     *
     * This call is best-effort. Failures are logged internally and are not
     * propagated to the caller; the walkthrough completion state is already
     * persisted locally via [tv.bayit.plus.feature.discover.walkthrough.WalkthroughStateMachine].
     *
     * @param featureId      The feature ID from [tv.bayit.plus.feature.discover.model.DiscoverFeature.id].
     * @param stepsCompleted Number of walkthrough steps completed before the session ended.
     * @param skipped        True when the user tapped "Skip" rather than completing all steps.
     */
    suspend fun recordWalkthroughComplete(featureId: String, stepsCompleted: Int, skipped: Boolean)
}
