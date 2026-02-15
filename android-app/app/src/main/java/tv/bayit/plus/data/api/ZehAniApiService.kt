package tv.bayit.plus.data.api

import retrofit2.http.*
import tv.bayit.plus.data.model.zehani.*

interface ZehAniApiService {

    // Avatar Mesh Generation
    @POST("zeh-ani/mesh/generate")
    suspend fun generateMesh(
        @Body request: MeshGenerationRequest
    ): AvatarMesh

    @GET("zeh-ani/mesh/{avatarId}")
    suspend fun getMeshStatus(
        @Path("avatarId") avatarId: String
    ): AvatarMesh

    @GET("zeh-ani/mesh/{avatarId}/glb")
    suspend fun getGlbUrl(
        @Path("avatarId") avatarId: String
    ): MeshGlbUrl

    @Multipart
    @POST("zeh-ani/mesh/upload-glb")
    suspend fun uploadGlbMesh(
        @Part("avatar_id") avatarId: String,
        @Part("profile_id") profileId: String,
        @Part("pin") pin: String,
        @Part glbFile: okhttp3.MultipartBody.Part
    ): AvatarMesh

    // Magic Mirror
    @GET("zeh-ani/magic-mirror/{profileId}")
    suspend fun getMagicMirrorGreeting(
        @Path("profileId") profileId: String
    ): MagicMirrorGreeting

    @POST("zeh-ani/magic-mirror/{profileId}/refresh")
    suspend fun refreshMagicMirrorGreeting(
        @Path("profileId") profileId: String
    ): MagicMirrorGreeting

    // Biometric Consent
    @POST("zeh-ani/consent/biometric")
    suspend fun grantBiometricConsent(
        @Body request: BiometricConsentRequest
    ): BiometricConsentResponse

    @GET("zeh-ani/consent/biometric/{profileId}")
    suspend fun getBiometricConsentStatus(
        @Path("profileId") profileId: String
    ): BiometricConsentStatus

    // Voice-to-Voice (V2V)
    @POST("zeh-ani/v2v/transform")
    suspend fun transformVoice(
        @Body request: V2VTransformRequest
    ): V2VTransformResult

    @GET("zeh-ani/v2v/sessions/{profileId}")
    suspend fun getV2VSessions(
        @Path("profileId") profileId: String,
        @Query("limit") limit: Int = 20,
        @Query("offset") offset: Int = 0
    ): List<V2VSession>

    // Highlight Reels
    @POST("zeh-ani/highlights/generate")
    suspend fun generateHighlightReel(
        @Body request: HighlightReelGenerateRequest
    ): HighlightReel

    @GET("zeh-ani/highlights/{profileId}")
    suspend fun getHighlightReels(
        @Path("profileId") profileId: String
    ): List<HighlightReel>

    @GET("zeh-ani/highlights/reel/{reelId}")
    suspend fun getHighlightReel(
        @Path("reelId") reelId: String
    ): HighlightReel

    // WhatsApp Contacts
    @GET("zeh-ani/contacts/{profileId}")
    suspend fun getContacts(
        @Path("profileId") profileId: String
    ): List<WhatsAppContact>

    @POST("zeh-ani/contacts")
    suspend fun addContact(
        @Body request: AddContactRequest
    ): WhatsAppContact

    @DELETE("zeh-ani/contacts/{contactId}")
    suspend fun removeContact(
        @Path("contactId") contactId: String
    ): Map<String, Boolean>

    // Feedback
    @GET("zeh-ani/feedback")
    suspend fun getFeedback(
        @Query("profile_id") profileId: String
    ): List<FeedbackItem>
}
