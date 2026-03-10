package tv.bayit.plus.feature.discover.data

import tv.bayit.plus.core.common.BayitResult
import tv.bayit.plus.core.common.runCatchingResult
import tv.bayit.plus.core.network.api.BayitApiClient
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class ApiDiscoverRepository @Inject constructor(
    private val client: BayitApiClient,
) : DiscoverRepository {

    private val api: DiscoverApi = client.createService()

    override suspend fun fetchConfig(): BayitResult<DiscoverConfigDto> =
        runCatchingResult {
            client.safeApiCall { api.getConfig() }
        }

    override suspend fun recordWalkthroughComplete(
        featureId: String,
        stepsCompleted: Int,
        skipped: Boolean,
    ): BayitResult<Unit> = runCatchingResult {
        client.safeApiCall {
            api.recordWalkthroughComplete(
                WalkthroughCompleteDto(
                    featureId = featureId,
                    stepsCompleted = stepsCompleted,
                    skipped = skipped,
                ),
            )
        }
    }

    override suspend fun characterGenerationStatus(): BayitResult<CharacterGenerationStatusDto> =
        runCatchingResult {
            client.safeApiCall { api.getCharacterGenerationStatus() }
        }

    override suspend fun generateCharacters(contentId: String): BayitResult<CharacterJobDto> =
        runCatchingResult {
            client.safeApiCall { api.generateCharacters(contentId) }
        }
}
