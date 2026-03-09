package tv.bayit.plus.feature.onboarding

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable
import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.POST
import retrofit2.http.PUT
import retrofit2.http.Query

interface OnboardingTourApi {

    @GET("api/v1/onboarding/tour/state")
    suspend fun getTourState(): TourStateResponse

    @PUT("api/v1/onboarding/tour/state")
    suspend fun updateTourState(@Body request: UpdateTourStateRequest): TourStateResponse

    @POST("api/v1/onboarding/tour/complete")
    suspend fun completeTour(@Body request: CompleteTourRequest): CompleteTourResponse

    @POST("api/v1/onboarding/tour/skip")
    suspend fun skipTour(@Body request: SkipTourRequest): TourStateResponse

    @GET("api/v1/onboarding/tour/cards")
    suspend fun getFeatureCards(
        @Query("platform") platform: String,
        @Query("since_version") sinceVersion: Int? = null,
    ): FeatureCardsResponse
}

@Serializable
data class TourStateResponse(
    @SerialName("user_id") val userId: String,
    val platform: String,
    @SerialName("tour_version") val tourVersion: Int,
    @SerialName("current_card_index") val currentCardIndex: Int,
    @SerialName("completed_cards") val completedCards: List<String>,
    @SerialName("demo_cards_tapped") val demoCardsTapped: List<String>,
    @SerialName("completion_status") val completionStatus: String,
    val language: String? = null,
    @SerialName("started_at") val startedAt: String? = null,
    @SerialName("completed_at") val completedAt: String? = null,
    @SerialName("skipped_at") val skippedAt: String? = null,
)

@Serializable
data class UpdateTourStateRequest(
    val platform: String,
    @SerialName("current_card_index") val currentCardIndex: Int? = null,
    @SerialName("card_viewed") val cardViewed: String? = null,
    @SerialName("demo_tapped") val demoTapped: String? = null,
    val language: String? = null,
)

@Serializable
data class CompleteTourRequest(
    val platform: String,
    @SerialName("tour_version") val tourVersion: Int,
    val preferences: Map<String, String>? = null,
)

@Serializable
data class SkipTourRequest(
    val platform: String,
    @SerialName("last_card_viewed") val lastCardViewed: String? = null,
)

@Serializable
data class CompleteTourResponse(
    val status: String,
    @SerialName("recommendations_updated") val recommendationsUpdated: Boolean,
)

@Serializable
data class FeatureCardsResponse(
    @SerialName("tour_version") val tourVersion: Int,
    val cards: List<FeatureCardDto>,
)

@Serializable
data class FeatureCardDto(
    @SerialName("feature_key") val featureKey: String,
    val order: Int,
    @SerialName("demo_type") val demoType: String,
    @SerialName("introduced_in_version") val introducedInVersion: Int,
    val platforms: List<String>,
    @SerialName("is_new") val isNew: Boolean = false,
)
