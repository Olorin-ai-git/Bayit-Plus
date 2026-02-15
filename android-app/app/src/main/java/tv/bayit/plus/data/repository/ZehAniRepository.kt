package tv.bayit.plus.data.repository

import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.flow
import okhttp3.MultipartBody
import tv.bayit.plus.data.api.ZehAniApiService
import tv.bayit.plus.data.model.zehani.*
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class ZehAniRepository @Inject constructor(
    private val apiService: ZehAniApiService
) {

    // Avatar Mesh
    fun generateMesh(profileId: String, pin: String): Flow<Result<AvatarMesh>> = flow {
        try {
            val request = MeshGenerationRequest(profileId, pin)
            val mesh = apiService.generateMesh(request)
            emit(Result.success(mesh))
        } catch (e: Exception) {
            emit(Result.failure(e))
        }
    }

    fun getMeshStatus(avatarId: String): Flow<Result<AvatarMesh>> = flow {
        try {
            val mesh = apiService.getMeshStatus(avatarId)
            emit(Result.success(mesh))
        } catch (e: Exception) {
            emit(Result.failure(e))
        }
    }

    fun getGlbUrl(avatarId: String): Flow<Result<MeshGlbUrl>> = flow {
        try {
            val url = apiService.getGlbUrl(avatarId)
            emit(Result.success(url))
        } catch (e: Exception) {
            emit(Result.failure(e))
        }
    }

    fun uploadGlbMesh(
        avatarId: String,
        profileId: String,
        pin: String,
        glbFile: MultipartBody.Part
    ): Flow<Result<AvatarMesh>> = flow {
        try {
            val mesh = apiService.uploadGlbMesh(avatarId, profileId, pin, glbFile)
            emit(Result.success(mesh))
        } catch (e: Exception) {
            emit(Result.failure(e))
        }
    }

    // Magic Mirror
    fun getMagicMirrorGreeting(profileId: String): Flow<Result<MagicMirrorGreeting>> = flow {
        try {
            val greeting = apiService.getMagicMirrorGreeting(profileId)
            emit(Result.success(greeting))
        } catch (e: Exception) {
            emit(Result.failure(e))
        }
    }

    fun refreshMagicMirrorGreeting(profileId: String): Flow<Result<MagicMirrorGreeting>> = flow {
        try {
            val greeting = apiService.refreshMagicMirrorGreeting(profileId)
            emit(Result.success(greeting))
        } catch (e: Exception) {
            emit(Result.failure(e))
        }
    }

    // Biometric Consent
    fun grantBiometricConsent(
        profileId: String,
        consentType: String,
        pin: String
    ): Flow<Result<BiometricConsentResponse>> = flow {
        try {
            val request = BiometricConsentRequest(profileId, consentType, pin)
            val response = apiService.grantBiometricConsent(request)
            emit(Result.success(response))
        } catch (e: Exception) {
            emit(Result.failure(e))
        }
    }

    fun getBiometricConsentStatus(profileId: String): Flow<Result<BiometricConsentStatus>> = flow {
        try {
            val status = apiService.getBiometricConsentStatus(profileId)
            emit(Result.success(status))
        } catch (e: Exception) {
            emit(Result.failure(e))
        }
    }

    // V2V Voice Transformation
    fun transformVoice(
        avatarId: String,
        profileId: String,
        audioBase64: String,
        targetPhraseHe: String
    ): Flow<Result<V2VTransformResult>> = flow {
        try {
            val request = V2VTransformRequest(avatarId, profileId, audioBase64, targetPhraseHe)
            val result = apiService.transformVoice(request)
            emit(Result.success(result))
        } catch (e: Exception) {
            emit(Result.failure(e))
        }
    }

    fun getV2VSessions(
        profileId: String,
        limit: Int = 20,
        offset: Int = 0
    ): Flow<Result<List<V2VSession>>> = flow {
        try {
            val sessions = apiService.getV2VSessions(profileId, limit, offset)
            emit(Result.success(sessions))
        } catch (e: Exception) {
            emit(Result.failure(e))
        }
    }

    // Highlight Reels
    fun generateHighlightReel(
        avatarId: String,
        profileId: String
    ): Flow<Result<HighlightReel>> = flow {
        try {
            val request = HighlightReelGenerateRequest(avatarId, profileId)
            val reel = apiService.generateHighlightReel(request)
            emit(Result.success(reel))
        } catch (e: Exception) {
            emit(Result.failure(e))
        }
    }

    fun getHighlightReels(profileId: String): Flow<Result<List<HighlightReel>>> = flow {
        try {
            val reels = apiService.getHighlightReels(profileId)
            emit(Result.success(reels))
        } catch (e: Exception) {
            emit(Result.failure(e))
        }
    }

    fun getHighlightReel(reelId: String): Flow<Result<HighlightReel>> = flow {
        try {
            val reel = apiService.getHighlightReel(reelId)
            emit(Result.success(reel))
        } catch (e: Exception) {
            emit(Result.failure(e))
        }
    }

    // Contacts
    fun getContacts(profileId: String): Flow<Result<List<WhatsAppContact>>> = flow {
        try {
            val contacts = apiService.getContacts(profileId)
            emit(Result.success(contacts))
        } catch (e: Exception) {
            emit(Result.failure(e))
        }
    }

    fun addContact(
        profileId: String,
        phoneNumber: String,
        displayName: String,
        relationship: String,
        language: String,
        pin: String
    ): Flow<Result<WhatsAppContact>> = flow {
        try {
            val request = AddContactRequest(
                profileId, phoneNumber, displayName, relationship, language, pin
            )
            val contact = apiService.addContact(request)
            emit(Result.success(contact))
        } catch (e: Exception) {
            emit(Result.failure(e))
        }
    }

    fun removeContact(contactId: String): Flow<Result<Boolean>> = flow {
        try {
            val response = apiService.removeContact(contactId)
            emit(Result.success(response["success"] ?: false))
        } catch (e: Exception) {
            emit(Result.failure(e))
        }
    }

    // Feedback
    fun getFeedback(profileId: String): Flow<Result<List<FeedbackItem>>> = flow {
        try {
            val feedback = apiService.getFeedback(profileId)
            emit(Result.success(feedback))
        } catch (e: Exception) {
            emit(Result.failure(e))
        }
    }
}
