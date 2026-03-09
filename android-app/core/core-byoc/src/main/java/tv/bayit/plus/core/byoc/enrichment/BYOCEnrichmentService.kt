package tv.bayit.plus.core.byoc.enrichment

import tv.bayit.plus.core.byoc.models.BYOCEnrichmentResult
import tv.bayit.plus.core.common.BayitResult
import tv.bayit.plus.core.common.logging.BayitLogger
import tv.bayit.plus.core.network.api.BayitApiClient
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class BYOCEnrichmentService @Inject constructor(
    private val apiClient: BayitApiClient,
    private val enrichmentDao: BYOCEnrichmentDao,
    private val logger: BayitLogger,
) {
    private val api: BYOCEnrichmentApi by lazy { apiClient.createService() }

    suspend fun enrich(
        externalId: String,
        title: String,
        sourceType: String,
        year: Int? = null,
        durationSeconds: Int? = null,
        imdbId: String? = null,
        tmdbId: Int? = null,
    ): BayitResult<BYOCEnrichmentResult> {
        val cached = enrichmentDao.getByExternalId(externalId)
        if (cached != null && cached.backendContentId.isNotBlank()) {
            val cachedLangs = cached.subtitleLanguages.split(",").filter { it.isNotBlank() }
            val hasNewMetadata = imdbId != null || tmdbId != null
            if (cachedLangs.isNotEmpty() || !hasNewMetadata) {
                return BayitResult.Success(
                    BYOCEnrichmentResult(
                        contentId = cached.backendContentId,
                        availableSubtitleLanguages = cachedLangs,
                        enrichmentStatus = cached.enrichmentStatus,
                    )
                )
            }
            logger.info("BYOC enrichment cache bypass: have new metadata", mapOf("externalId" to externalId))
        }

        return try {
            val result = apiClient.safeApiCall {
                api.enrich(EnrichRequest(externalId, title, sourceType, year, durationSeconds, imdbId, tmdbId))
            }
            enrichmentDao.upsert(
                BYOCEnrichmentEntity(
                    externalId = externalId,
                    backendContentId = result.contentId,
                    subtitleLanguages = result.availableSubtitleLanguages.joinToString(","),
                    enrichmentStatus = result.enrichmentStatus,
                    updatedAt = System.currentTimeMillis(),
                )
            )
            BayitResult.Success(result)
        } catch (e: Exception) {
            logger.error("BYOC enrichment failed", error = e, metadata = mapOf("externalId" to externalId))
            BayitResult.Error(e, e.message ?: "Enrichment failed")
        }
    }
}
