package tv.bayit.plus.feature.discover.data

import tv.bayit.plus.core.common.BayitResult

interface DiscoverRepository {
    suspend fun fetchConfig(): BayitResult<DiscoverConfigDto>
    suspend fun recordWalkthroughComplete(
        featureId: String,
        stepsCompleted: Int,
        skipped: Boolean,
    ): BayitResult<Unit>
    suspend fun characterGenerationStatus(): BayitResult<CharacterGenerationStatusDto>
    suspend fun generateCharacters(contentId: String): BayitResult<CharacterJobDto>
}
