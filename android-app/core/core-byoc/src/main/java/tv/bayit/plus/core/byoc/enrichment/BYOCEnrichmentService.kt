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

    suspend fun enrich(externalId: String, title: String, sourceType: String): BayitResult<BYOCEnrichmentResult> {
        val cached = enrichmentDao.getByExternalId(externalId)
        if (cached != null) {
            return BayitResult.Success(
                BYOCEnrichmentResult(
                    contentId = cached.externalId,
                    availableSubtitleLanguages = cached.subtitleLanguages.split(",").filter { it.isNotBlank() },
                    enrichmentStatus = cached.enrichmentStatus,
                )
            )
        }

        return try {
            val result = apiClient.safeApiCall {
                api.enrich(EnrichRequest(externalId, title, sourceType))
            }
            enrichmentDao.upsert(
                BYOCEnrichmentEntity(
                    externalId = externalId,
                    subtitleLanguages = result.availableSubtitleLanguages.joinToString(","),
                    enrichmentStatus = result.enrichmentStatus,
                    updatedAt = System.currentTimeMillis(),
                )
            )
            BayitResult.Success(result)
        } catch (e: Exception) {
            logger.error("BYOC enrichment failed", error = e, metadata = mapOf("externalId" to externalId))
            BayitResult.Error(e.message ?: "Enrichment failed", e)
        }
    }
}
