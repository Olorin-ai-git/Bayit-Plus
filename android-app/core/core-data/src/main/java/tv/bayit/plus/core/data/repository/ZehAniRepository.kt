package tv.bayit.plus.core.data.repository

import tv.bayit.plus.core.common.BayitResult
import tv.bayit.plus.core.model.zehani.AvatarMesh
import tv.bayit.plus.core.model.zehani.BiometricConsent
import tv.bayit.plus.core.model.zehani.BiometricConsentStatusResponse
import tv.bayit.plus.core.model.zehani.HighlightGenerateResponse
import tv.bayit.plus.core.model.zehani.HighlightReel
import tv.bayit.plus.core.model.zehani.MagicMirrorGreeting
import tv.bayit.plus.core.model.zehani.MeshGlbUrl
import tv.bayit.plus.core.model.zehani.V2VSessionListResponse
import tv.bayit.plus.core.model.zehani.V2VTransformResult
import tv.bayit.plus.core.model.zehani.WhatsAppContact
import tv.bayit.plus.core.model.zehani.FeedbackItem

/**
 * Repository interface for all Zeh Ani feature operations.
 *
 * Provides typed results for mesh generation, magic mirror,
 * biometric consent, V2V voice practice, highlight reels,
 * WhatsApp contacts, and feedback.
 */
interface ZehAniRepository {

    // -- Mesh --
    suspend fun generateMesh(profileId: String, pin: String): BayitResult<AvatarMesh>
    suspend fun getMeshStatus(avatarId: String): BayitResult<AvatarMesh>
    suspend fun getMeshGlbUrl(avatarId: String): BayitResult<MeshGlbUrl>
    suspend fun uploadGlbMesh(
        avatarId: String,
        profileId: String,
        pin: String,
        glbBytes: ByteArray,
    ): BayitResult<AvatarMesh>

    // -- Magic Mirror --
    suspend fun getDailyGreeting(profileId: String): BayitResult<MagicMirrorGreeting>
    suspend fun refreshGreeting(profileId: String): BayitResult<MagicMirrorGreeting>

    // -- Biometric Consent --
    suspend fun grantBiometricConsent(
        profileId: String,
        consentType: String,
        pin: String,
    ): BayitResult<BiometricConsent>
    suspend fun checkBiometricConsent(profileId: String): BayitResult<BiometricConsentStatusResponse>

    // -- V2V --
    suspend fun transformVoice(
        avatarId: String,
        profileId: String,
        audioBase64: String,
        targetPhraseHe: String,
    ): BayitResult<V2VTransformResult>
    suspend fun getV2VSessions(profileId: String): BayitResult<V2VSessionListResponse>

    // -- Highlights --
    suspend fun generateHighlightReel(avatarId: String, profileId: String): BayitResult<HighlightGenerateResponse>
    suspend fun listHighlightReels(profileId: String): BayitResult<List<HighlightReel>>
    suspend fun sendHighlightReelToContacts(reelId: String): BayitResult<Int>

    // -- Contacts --
    suspend fun listContacts(profileId: String): BayitResult<List<WhatsAppContact>>
    suspend fun addContact(
        profileId: String,
        phoneNumber: String,
        displayName: String,
        relationship: String,
        language: String,
        pin: String,
    ): BayitResult<WhatsAppContact>
    suspend fun deleteContact(contactId: String): BayitResult<Unit>

    // -- Feedback --
    suspend fun getFeedback(profileId: String): BayitResult<List<FeedbackItem>>
    suspend fun submitFeedback(profileId: String, feedback: String, rating: Int): BayitResult<Unit>
}
