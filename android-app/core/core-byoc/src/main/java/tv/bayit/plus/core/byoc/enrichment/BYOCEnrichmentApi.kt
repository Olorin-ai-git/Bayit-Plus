package tv.bayit.plus.core.byoc.enrichment

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable
import retrofit2.http.Body
import retrofit2.http.POST
import tv.bayit.plus.core.byoc.models.BYOCEnrichmentResult

interface BYOCEnrichmentApi {
    @POST("api/v1/byoc/enrich")
    suspend fun enrich(@Body request: EnrichRequest): BYOCEnrichmentResult

    @POST("api/v1/byoc/enrich/batch")
    suspend fun enrichBatch(@Body request: BatchEnrichRequest): List<BYOCEnrichmentResult>
}

@Serializable
data class EnrichRequest(
    @SerialName("external_id") val externalId: String,
    val title: String,
    @SerialName("source_type") val sourceType: String,
    val year: Int? = null,
    @SerialName("duration_seconds") val durationSeconds: Int? = null,
    @SerialName("imdb_id") val imdbId: String? = null,
    @SerialName("tmdb_id") val tmdbId: Int? = null,
    @SerialName("subtitle_languages_requested") val subtitleLanguagesRequested: List<String> = listOf("en", "he", "es"),
)

@Serializable
data class BatchEnrichRequest(
    val items: List<EnrichRequest>,
)
