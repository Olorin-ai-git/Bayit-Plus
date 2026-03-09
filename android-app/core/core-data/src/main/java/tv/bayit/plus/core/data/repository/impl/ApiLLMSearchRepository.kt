package tv.bayit.plus.core.data.repository.impl

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable
import retrofit2.http.Body
import retrofit2.http.DELETE
import retrofit2.http.GET
import retrofit2.http.POST
import retrofit2.http.Query
import tv.bayit.plus.core.common.BayitResult
import tv.bayit.plus.core.common.runCatchingResult
import tv.bayit.plus.core.data.repository.LLMSearchRepository
import tv.bayit.plus.core.model.MessageResponse
import tv.bayit.plus.core.network.api.BayitApiClient
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Production implementation of [LLMSearchRepository] backed by Retrofit.
 *
 * Delegates HTTP communication to [BayitApiClient], which handles auth headers,
 * correlation IDs, retry, rate limiting, and structured error mapping. Every
 * public method wraps the network call in [runCatchingResult] so callers receive
 * a [BayitResult] instead of raw exceptions.
 *
 * Endpoint paths mirror the iOS APILLMSearchRepository and web api.js.
 * LLM search requires Plus or Beta 500 access.
 */
@Singleton
class ApiLLMSearchRepository @Inject constructor(
    private val client: BayitApiClient,
) : LLMSearchRepository {

    private val service: LLMSearchService = client.createService()

    override suspend fun semanticSearch(
        query: String,
    ): BayitResult<List<Any>> = runCatchingResult {
        val body = SemanticSearchBody(query = query)
        val response = client.safeApiCall {
            service.semanticSearch(body)
        }
        response.results
    }

    override suspend fun getSearchSuggestions(
        partialQuery: String,
    ): BayitResult<List<String>> = runCatchingResult {
        val response = client.safeApiCall {
            service.getAiSuggestions(partialQuery)
        }
        response.suggestions
    }

    override suspend fun askQuestion(
        question: String,
        contextMediaId: String?,
    ): BayitResult<Any> = runCatchingResult {
        val body = AskQuestionBody(
            query = question,
            contextMediaId = contextMediaId,
        )
        client.safeApiCall { service.askQuestion(body) }
    }

    override suspend fun getSearchHistory(): BayitResult<List<Any>> =
        runCatchingResult {
            val response = client.safeApiCall {
                service.getAiSearchHistory()
            }
            response.entries
        }

    override suspend fun clearSearchHistory(): BayitResult<Unit> =
        runCatchingResult {
            client.safeApiCall { service.clearAiSearchHistory() }
            Unit
        }
}

private interface LLMSearchService {

    @POST("api/v1/search/llm")
    suspend fun semanticSearch(
        @Body body: SemanticSearchBody,
    ): LLMSearchResultsResponse

    @GET("api/v1/search/ai/suggestions")
    suspend fun getAiSuggestions(
        @Query("query") query: String,
    ): AiSuggestionsResponse

    @POST("api/v1/search/ai/ask")
    suspend fun askQuestion(
        @Body body: AskQuestionBody,
    ): AskQuestionResponse

    @GET("api/v1/search/ai/history")
    suspend fun getAiSearchHistory(): AiSearchHistoryResponse

    @DELETE("api/v1/search/ai/history")
    suspend fun clearAiSearchHistory(): MessageResponse
}

/** Request body for the semantic (LLM) search endpoint. */
@Serializable
private data class SemanticSearchBody(
    val query: String,
    val limit: Int? = null,
    @SerialName("include_user_context") val includeUserContext: Boolean? = null,
)

/** Response from the LLM search endpoint. */
@Serializable
private data class LLMSearchResultsResponse(
    val success: Boolean? = null,
    val results: List<LLMSearchResultItem> = emptyList(),
    @SerialName("total_results") val totalResults: Int? = null,
    val interpretation: LLMInterpretation? = null,
    @SerialName("execution_time_ms") val executionTimeMs: Int? = null,
)

/** A single result from the LLM search. */
@Serializable
private data class LLMSearchResultItem(
    val id: String,
    val title: String? = null,
    val description: String? = null,
    val thumbnail: String? = null,
    val type: String? = null,
    val category: String? = null,
    val score: Float? = null,
    @SerialName("relevance_explanation") val relevanceExplanation: String? = null,
)

/** LLM interpretation metadata for a semantic search. */
@Serializable
private data class LLMInterpretation(
    val text: String? = null,
    val confidence: Float? = null,
    @SerialName("extracted_criteria") val extractedCriteria: Map<String, String>? = null,
)

/** Response from the AI suggestions endpoint. */
@Serializable
private data class AiSuggestionsResponse(
    val suggestions: List<String> = emptyList(),
)

/** Request body for the AI ask endpoint. */
@Serializable
private data class AskQuestionBody(
    val query: String,
    @SerialName("context_media_id") val contextMediaId: String? = null,
)

/** Response from the AI ask endpoint. */
@Serializable
private data class AskQuestionResponse(
    val answer: String? = null,
    val sources: List<AskQuestionSource>? = null,
    val confidence: Float? = null,
    @SerialName("follow_up_suggestions") val followUpSuggestions: List<String>? = null,
)

/** A source reference in the AI ask response. */
@Serializable
private data class AskQuestionSource(
    val id: String,
    val title: String? = null,
    val type: String? = null,
)

/** Response from the AI search history endpoint. */
@Serializable
private data class AiSearchHistoryResponse(
    val entries: List<AiSearchHistoryEntry> = emptyList(),
)

/** A single entry in the AI search history. */
@Serializable
private data class AiSearchHistoryEntry(
    val query: String,
    @SerialName("searched_at") val searchedAt: String? = null,
    @SerialName("result_count") val resultCount: Int? = null,
)
