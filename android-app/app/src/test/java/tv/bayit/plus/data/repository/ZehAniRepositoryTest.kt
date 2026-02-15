package tv.bayit.plus.data.repository

import io.mockk.coEvery
import io.mockk.mockk
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Before
import org.junit.Test
import tv.bayit.plus.data.api.ZehAniApiService
import tv.bayit.plus.data.model.zehani.*

class ZehAniRepositoryTest {

    private lateinit var apiService: ZehAniApiService
    private lateinit var repository: ZehAniRepository

    @Before
    fun setup() {
        apiService = mockk()
        repository = ZehAniRepository(apiService)
    }

    @Test
    fun `getDailyGreeting returns greeting from API`() = runTest {
        val mockGreeting = MagicMirrorGreeting(
            id = "greeting-123",
            userId = "user-456",
            profileId = "profile-789",
            greetingHebrew = "שלום",
            greetingEnglish = "Hello",
            vocabularyWord = "שלום",
            vocabularyTranslation = "hello/peace",
            date = "2026-02-15",
            avatarPoseUrl = null,
            audioUrl = null
        )

        coEvery { apiService.getDailyGreeting("profile-789") } returns mockGreeting

        val result = repository.getDailyGreeting("profile-789").first()

        assertEquals(mockGreeting, result)
        assertEquals("שלום", result.greetingHebrew)
    }

    @Test
    fun `getMeshStatus returns mesh data`() = runTest {
        val mockMesh = AvatarMesh(
            id = "mesh-123",
            avatarId = "avatar-456",
            status = MeshStatus.READY,
            glbUrl = "https://example.com/mesh.glb",
            blendShapeNames = listOf("mouthOpen", "eyeBlink"),
            vertexCount = 5000,
            boneCount = 25,
            source = MeshSource.ARKIT,
            readyPlayerMeUrl = null,
            errorMessage = null,
            generatedAt = null,
            version = 1
        )

        coEvery { apiService.getMeshStatus("avatar-456") } returns mockMesh

        val result = repository.getMeshStatus("avatar-456").first()

        assertEquals(MeshStatus.READY, result.status)
        assertEquals(5000, result.vertexCount)
    }

    @Test
    fun `grantConsent calls API with correct params`() = runTest {
        val request = BiometricConsentRequest(
            profileId = "profile-123",
            consentType = "mesh_generation",
            pin = "123456"
        )

        val response = BiometricConsentResponse(success = true)

        coEvery { apiService.grantBiometricConsent(request) } returns response

        val result = repository.grantConsent(
            profileId = "profile-123",
            consentType = "mesh_generation",
            pin = "123456"
        ).first()

        assertEquals(true, result.success)
    }

    @Test
    fun `startV2VSession creates new session`() = runTest {
        val request = V2VStartRequest(
            avatarId = "avatar-123",
            profileId = "profile-456",
            targetPhrase = "שלום"
        )

        val mockSession = V2VSession(
            id = "session-789",
            avatarId = "avatar-123",
            profileId = "profile-456",
            targetPhrase = "שלום",
            status = "ready",
            score = null,
            audioUrl = null,
            transformedAudioUrl = null,
            feedback = null,
            createdAt = "2026-02-15T10:00:00Z"
        )

        coEvery { apiService.startV2VSession(request) } returns mockSession

        val result = repository.startV2VSession(
            avatarId = "avatar-123",
            profileId = "profile-456",
            targetPhrase = "שלום"
        ).first()

        assertEquals("session-789", result.id)
        assertEquals("ready", result.status)
    }
}
