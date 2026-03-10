package tv.bayit.plus.feature.discover.data

import tv.bayit.plus.core.common.BayitResult
import tv.bayit.plus.core.common.logging.BayitLogger
import tv.bayit.plus.core.common.runCatchingResult
import tv.bayit.plus.core.network.api.BayitApiClient
import javax.inject.Inject

/**
 * Production implementation of [DiscoverRepository] backed by [BayitApiClient].
 *
 * Delegates HTTP communication to [BayitApiClient.safeApiCall], which maps HTTP
 * errors, network failures, and serialization errors into typed
 * [tv.bayit.plus.core.network.ApiException] instances. Each public method wraps
 * the network call in [runCatchingResult] so callers receive [BayitResult] rather
 * than raw exceptions.
 *
 * Structured logging uses [logger] exclusively; no print or console output.
 */
class ApiDiscoverRepository @Inject constructor(
    private val client: BayitApiClient,
    private val logger: BayitLogger,
) : DiscoverRepository {

    private val api: DiscoverApi = client.createService()

    override suspend fun fetchConfig(): BayitResult<DiscoverConfigDto> = runCatchingResult {
        logger.debug("discover_config_fetch_start")
        val config = client.safeApiCall { api.getConfig() }
        logger.info(
            "discover_config_fetch_success",
            mapOf("feature_count" to config.features.size.toString()),
        )
        config
    }

    /**
     * Records walkthrough completion or skip. The result is not propagated to
     * the caller because the local walkthrough state machine already persists
     * completion via [tv.bayit.plus.feature.discover.walkthrough.WalkthroughStateMachine].
     */
    override suspend fun recordWalkthroughComplete(
        featureId: String,
        stepsCompleted: Int,
        skipped: Boolean,
    ) {
        val body = WalkthroughCompleteDto(
            featureId = featureId,
            stepsCompleted = stepsCompleted,
            skipped = skipped,
        )
        runCatchingResult {
            client.safeApiCall { api.recordWalkthroughComplete(body) }
        }.also { result ->
            if (result is BayitResult.Error) {
                logger.warning(
                    "discover_walkthrough_complete_failed",
                    mapOf(
                        "feature_id" to featureId,
                        "error" to (result.exception.message ?: "unknown"),
                    ),
                )
            }
        }
    }
}
