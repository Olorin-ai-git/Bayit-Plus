package tv.bayit.plus.core.byoc.enrichment

import retrofit2.http.Body
import retrofit2.http.POST
import tv.bayit.plus.core.byoc.models.BYOCEnrichmentResult

interface BYOCEnrichmentApi {
    @POST("api/v1/byoc/enrich")
    suspend fun enrich(@Body request: EnrichRequest): BYOCEnrichmentResult

    @POST("api/v1/byoc/enrich/batch")
    suspend fun enrichBatch(@Body request: BatchEnrichRequest): List<BYOCEnrichmentResult>
}

@kotlinx.serialization.Serializable
data class EnrichRequest(
    val externalId: String,
    val title: String,
    val sourceType: String,
)

@kotlinx.serialization.Serializable
data class BatchEnrichRequest(
    val items: List<EnrichRequest>,
)
