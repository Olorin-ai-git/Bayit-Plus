package tv.bayit.plus.core.data.api

import okhttp3.MultipartBody
import okhttp3.RequestBody
import retrofit2.http.Body
import retrofit2.http.DELETE
import retrofit2.http.GET
import retrofit2.http.Multipart
import retrofit2.http.POST
import retrofit2.http.Part
import retrofit2.http.Path
import retrofit2.http.Query
import tv.bayit.plus.core.model.MessageResponse
import tv.bayit.plus.core.model.zehani.AvatarMesh
import tv.bayit.plus.core.model.zehani.BiometricConsent
import tv.bayit.plus.core.model.zehani.BiometricConsentRequest
import tv.bayit.plus.core.model.zehani.BiometricConsentStatusResponse
import tv.bayit.plus.core.model.zehani.DeleteContactResponse
import tv.bayit.plus.core.model.zehani.FeedbackListResponse
import tv.bayit.plus.core.model.zehani.HighlightGenerateResponse
import tv.bayit.plus.core.model.zehani.HighlightReel
import tv.bayit.plus.core.model.zehani.MagicMirrorGreeting
import tv.bayit.plus.core.model.zehani.MeshGenerationRequest
import tv.bayit.plus.core.model.zehani.MeshGlbUrl
import tv.bayit.plus.core.model.zehani.SubmitFeedbackRequest
import tv.bayit.plus.core.model.zehani.V2VSessionListResponse
import tv.bayit.plus.core.model.zehani.V2VTransformRequest
import tv.bayit.plus.core.model.zehani.V2VTransformResult
import tv.bayit.plus.core.model.zehani.WhatsAppContact
import tv.bayit.plus.core.model.zehani.AddWhatsAppContactRequest
import tv.bayit.plus.core.model.zehani.CharacterQuestionsResponse
import tv.bayit.plus.core.model.zehani.InteractableMovie
import tv.bayit.plus.core.model.zehani.MovieTagRequest
import tv.bayit.plus.core.model.zehani.MovieTagStatus

/**
 * Retrofit service interface for all Zeh Ani API endpoints.
 *
 * Endpoint paths mirror the backend FastAPI routes defined in
 * `backend/app/api/routes/zeh_ani/`.
 */
interface ZehAniApiService {

    // -- Mesh --

    @POST("api/v1/zeh-ani/mesh/generate")
    suspend fun generateMesh(
        @Body request: MeshGenerationRequest,
    ): AvatarMesh

    @GET("api/v1/zeh-ani/avatar/{avatarId}")
    suspend fun getMeshStatus(
        @Path("avatarId") avatarId: String,
    ): AvatarMesh

    @GET("api/v1/zeh-ani/mesh/{avatarId}/glb")
    suspend fun getMeshGlbUrl(
        @Path("avatarId") avatarId: String,
    ): MeshGlbUrl

    @Multipart
    @POST("api/v1/zeh-ani/mesh/upload-glb")
    suspend fun uploadGlbMesh(
        @Part("avatar_id") avatarId: RequestBody,
        @Part("profile_id") profileId: RequestBody,
        @Part("pin") pin: RequestBody,
        @Part glbFile: MultipartBody.Part,
    ): AvatarMesh

    // -- Magic Mirror --

    @GET("api/v1/zeh-ani/magic-mirror/{profileId}")
    suspend fun getDailyGreeting(
        @Path("profileId") profileId: String,
    ): MagicMirrorGreeting

    @POST("api/v1/zeh-ani/magic-mirror/{profileId}/refresh")
    suspend fun refreshGreeting(
        @Path("profileId") profileId: String,
    ): MagicMirrorGreeting

    // -- Biometric Consent --

    @POST("api/v1/zeh-ani/consent/biometric")
    suspend fun grantBiometricConsent(
        @Body request: BiometricConsentRequest,
    ): BiometricConsent

    @GET("api/v1/zeh-ani/consent/biometric/{profileId}")
    suspend fun checkBiometricConsent(
        @Path("profileId") profileId: String,
    ): BiometricConsentStatusResponse

    // -- V2V --

    @POST("api/v1/zeh-ani/v2v/transform")
    suspend fun transformVoice(
        @Body request: V2VTransformRequest,
    ): V2VTransformResult

    @GET("api/v1/zeh-ani/v2v/sessions/{profileId}")
    suspend fun getV2VSessions(
        @Path("profileId") profileId: String,
        @Query("limit") limit: Int = 20,
        @Query("offset") offset: Int = 0,
    ): V2VSessionListResponse

    // -- Highlights --

    @POST("api/v1/zeh-ani/highlights/generate")
    suspend fun generateHighlightReel(
        @Query("avatar_id") avatarId: String,
        @Query("profile_id") profileId: String,
    ): HighlightGenerateResponse

    @GET("api/v1/zeh-ani/highlights/{profileId}")
    suspend fun listHighlightReels(
        @Path("profileId") profileId: String,
    ): List<HighlightReel>

    // -- Contacts --

    @GET("api/v1/zeh-ani/contacts/{profileId}")
    suspend fun listContacts(
        @Path("profileId") profileId: String,
    ): List<WhatsAppContact>

    @POST("api/v1/zeh-ani/contacts")
    suspend fun addContact(
        @Body request: AddWhatsAppContactRequest,
    ): WhatsAppContact

    @DELETE("api/v1/zeh-ani/contacts/{contactId}")
    suspend fun deleteContact(
        @Path("contactId") contactId: String,
    ): DeleteContactResponse

    // -- Feedback --

    @GET("api/v1/zeh-ani/feedback")
    suspend fun getFeedback(
        @Query("profile_id") profileId: String,
    ): FeedbackListResponse

    @POST("api/v1/zeh-ani/feedback")
    suspend fun submitFeedback(
        @Body request: SubmitFeedbackRequest,
    ): MessageResponse

    // -- Highlight sharing --

    @POST("api/v1/zeh-ani/highlights/reel/{reelId}/send")
    suspend fun sendHighlightReelToContacts(
        @Path("reelId") reelId: String,
    ): tv.bayit.plus.core.model.zehani.SendToContactsResponse

    // -- Movie Interactions --

    @GET("api/v1/movie-interactions/movies")
    suspend fun listInteractableMovies(): List<InteractableMovie>

    @POST("api/v1/movie-interactions/tag")
    suspend fun tagMovie(
        @Body request: MovieTagRequest,
    ): MovieTagStatus

    @GET("api/v1/movie-interactions/tag/{contentId}")
    suspend fun getMovieTagStatus(
        @Path("contentId") contentId: String,
    ): MovieTagStatus

    @GET("api/v1/movie-interactions/characters/{contentId}/questions")
    suspend fun getCharacterQuestions(
        @Path("contentId") contentId: String,
        @Query("character_name") characterName: String,
    ): CharacterQuestionsResponse
}
