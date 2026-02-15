package tv.bayit.plus.core.data.repository.impl

import okhttp3.MediaType.Companion.toMediaType
import okhttp3.MultipartBody
import okhttp3.RequestBody.Companion.toRequestBody
import tv.bayit.plus.core.common.BayitResult
import tv.bayit.plus.core.common.runCatchingResult
import tv.bayit.plus.core.data.api.ZehAniApiService
import tv.bayit.plus.core.data.repository.ZehAniRepository
import tv.bayit.plus.core.model.zehani.AvatarMesh
import tv.bayit.plus.core.model.zehani.BiometricConsent
import tv.bayit.plus.core.model.zehani.BiometricConsentRequest
import tv.bayit.plus.core.model.zehani.BiometricConsentStatusResponse
import tv.bayit.plus.core.model.zehani.FeedbackItem
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
import tv.bayit.plus.core.network.api.BayitApiClient

private val TEXT_PLAIN = "text/plain".toMediaType()
private val OCTET_STREAM = "application/octet-stream".toMediaType()

/**
 * Production implementation of [ZehAniRepository] backed by Retrofit.
 *
 * Delegates HTTP communication to [BayitApiClient], which handles auth
 * headers, correlation IDs, retry, rate limiting, and structured error
 * mapping. Every public method wraps the network call in [runCatchingResult]
 * so callers receive a [BayitResult] instead of raw exceptions.
 */
class ApiZehAniRepository(
    private val client: BayitApiClient,
) : ZehAniRepository {

    private val service: ZehAniApiService = client.createService()

    override suspend fun generateMesh(profileId: String, pin: String): BayitResult<AvatarMesh> =
        runCatchingResult {
            client.safeApiCall {
                service.generateMesh(MeshGenerationRequest(profileId, pin))
            }
        }

    override suspend fun getMeshStatus(avatarId: String): BayitResult<AvatarMesh> =
        runCatchingResult { client.safeApiCall { service.getMeshStatus(avatarId) } }

    override suspend fun getMeshGlbUrl(avatarId: String): BayitResult<MeshGlbUrl> =
        runCatchingResult { client.safeApiCall { service.getMeshGlbUrl(avatarId) } }

    override suspend fun uploadGlbMesh(
        avatarId: String,
        profileId: String,
        pin: String,
        glbBytes: ByteArray,
    ): BayitResult<AvatarMesh> = runCatchingResult {
        val glbPart = MultipartBody.Part.createFormData(
            "glb_file", "mesh.glb", glbBytes.toRequestBody(OCTET_STREAM),
        )
        client.safeApiCall {
            service.uploadGlbMesh(
                avatarId = avatarId.toRequestBody(TEXT_PLAIN),
                profileId = profileId.toRequestBody(TEXT_PLAIN),
                pin = pin.toRequestBody(TEXT_PLAIN),
                glbFile = glbPart,
            )
        }
    }

    override suspend fun getDailyGreeting(profileId: String): BayitResult<MagicMirrorGreeting> =
        runCatchingResult { client.safeApiCall { service.getDailyGreeting(profileId) } }

    override suspend fun refreshGreeting(profileId: String): BayitResult<MagicMirrorGreeting> =
        runCatchingResult { client.safeApiCall { service.refreshGreeting(profileId) } }

    override suspend fun grantBiometricConsent(
        profileId: String,
        consentType: String,
        pin: String,
    ): BayitResult<BiometricConsent> = runCatchingResult {
        client.safeApiCall {
            service.grantBiometricConsent(
                BiometricConsentRequest(profileId, consentType, pin),
            )
        }
    }

    override suspend fun checkBiometricConsent(
        profileId: String,
    ): BayitResult<BiometricConsentStatusResponse> =
        runCatchingResult { client.safeApiCall { service.checkBiometricConsent(profileId) } }

    override suspend fun transformVoice(
        avatarId: String,
        profileId: String,
        audioBase64: String,
        targetPhraseHe: String,
    ): BayitResult<V2VTransformResult> = runCatchingResult {
        client.safeApiCall {
            service.transformVoice(
                V2VTransformRequest(avatarId, profileId, audioBase64, targetPhraseHe),
            )
        }
    }

    override suspend fun getV2VSessions(profileId: String): BayitResult<V2VSessionListResponse> =
        runCatchingResult { client.safeApiCall { service.getV2VSessions(profileId) } }

    override suspend fun generateHighlightReel(
        avatarId: String,
        profileId: String,
    ): BayitResult<HighlightGenerateResponse> = runCatchingResult {
        client.safeApiCall { service.generateHighlightReel(avatarId, profileId) }
    }

    override suspend fun listHighlightReels(profileId: String): BayitResult<List<HighlightReel>> =
        runCatchingResult { client.safeApiCall { service.listHighlightReels(profileId) } }

    override suspend fun listContacts(profileId: String): BayitResult<List<WhatsAppContact>> =
        runCatchingResult { client.safeApiCall { service.listContacts(profileId) } }

    override suspend fun addContact(
        profileId: String,
        phoneNumber: String,
        displayName: String,
        relationship: String,
        language: String,
        pin: String,
    ): BayitResult<WhatsAppContact> = runCatchingResult {
        client.safeApiCall {
            service.addContact(
                AddWhatsAppContactRequest(profileId, phoneNumber, displayName, relationship, language, pin),
            )
        }
    }

    override suspend fun deleteContact(contactId: String): BayitResult<Unit> =
        runCatchingResult {
            client.safeApiCall { service.deleteContact(contactId) }
            Unit
        }

    override suspend fun getFeedback(profileId: String): BayitResult<List<FeedbackItem>> =
        runCatchingResult {
            val response = client.safeApiCall { service.getFeedback(profileId) }
            response.items
        }

    override suspend fun submitFeedback(
        profileId: String,
        feedback: String,
        rating: Int,
    ): BayitResult<Unit> = runCatchingResult {
        client.safeApiCall {
            service.submitFeedback(SubmitFeedbackRequest(profileId, feedback, rating))
        }
        Unit
    }
}
