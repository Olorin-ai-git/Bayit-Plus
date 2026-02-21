package tv.bayit.plus.core.auth

import app.cash.turbine.test
import com.google.common.truth.Truth.assertThat
import io.mockk.mockk
import kotlinx.coroutines.test.runTest
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.extension.ExtendWith
import tv.bayit.plus.core.common.logging.NoOpBayitLogger
import tv.bayit.plus.core.network.api.BayitApiClient
import tv.bayit.plus.core.testing.CoroutineTestRule
import tv.bayit.plus.core.testing.FakeAuthTokenStorage

/**
 * Unit tests for [OlorinAuthService] auth state and token-lifecycle logic.
 *
 * Validates: initial auth state detection, token expiry derivation from server response,
 * refresh token storage, and sign-out behaviour.
 */
@ExtendWith(CoroutineTestRule::class)
class OlorinAuthServiceTest {

    private lateinit var tokenStorage: FakeAuthTokenStorage
    private val apiClient: BayitApiClient = mockk(relaxed = true)
    private val logger = NoOpBayitLogger()

    @BeforeEach
    fun setup() {
        tokenStorage = FakeAuthTokenStorage()
    }

    @Test
    fun `init - starts Unauthenticated when no stored token`() = runTest {
        val service = buildService()

        service.authState.test {
            assertThat(awaitItem()).isEqualTo(AuthState.Unauthenticated)
            cancelAndIgnoreRemainingEvents()
        }
    }

    @Test
    fun `init - starts Authenticated when valid access token in storage`() = runTest {
        tokenStorage.saveAccessToken("existing-token", expiresAt = Long.MAX_VALUE)
        val service = buildService()

        service.authState.test {
            assertThat(awaitItem()).isEqualTo(AuthState.Authenticated)
            cancelAndIgnoreRemainingEvents()
        }
    }

    @Test
    fun `init - starts Unauthenticated when stored token is already expired`() = runTest {
        tokenStorage.saveAccessToken("expired-token", expiresAt = 1_000L)
        val service = buildService()

        service.authState.test {
            assertThat(awaitItem()).isEqualTo(AuthState.Unauthenticated)
            cancelAndIgnoreRemainingEvents()
        }
    }

    @Test
    fun `storeAuthTokens - transitions to Authenticated`() = runTest {
        val service = buildService()

        service.storeAuthTokens(authResponse())

        service.authState.test {
            assertThat(awaitItem()).isEqualTo(AuthState.Authenticated)
            cancelAndIgnoreRemainingEvents()
        }
    }

    @Test
    fun `storeAuthTokens - persists access token with server-provided expiry`() = runTest {
        val service = buildService()
        val beforeMs = System.currentTimeMillis()
        val expiresInSeconds = 7200

        service.storeAuthTokens(authResponse(expiresIn = expiresInSeconds))

        val storedExpiry = tokenStorage.getStoredAccessExpiresAt()
        val expectedMin = beforeMs + (expiresInSeconds * 1_000L)
        assertThat(storedExpiry).isAtLeast(expectedMin)
    }

    @Test
    fun `storeAuthTokens - uses 1-hour fallback when expiresIn is null`() = runTest {
        val service = buildService()
        val beforeMs = System.currentTimeMillis()

        service.storeAuthTokens(authResponse(expiresIn = null))

        val storedExpiry = tokenStorage.getStoredAccessExpiresAt()
        val oneHourFromNow = beforeMs + (3_600 * 1_000L)
        assertThat(storedExpiry).isAtLeast(oneHourFromNow)
    }

    @Test
    fun `storeAuthTokens - persists refresh token when present in response`() = runTest {
        val service = buildService()

        service.storeAuthTokens(authResponse(refreshToken = "rt-abc"))

        assertThat(tokenStorage.hasRefreshToken()).isTrue()
    }

    @Test
    fun `storeAuthTokens - skips refresh token when null in response`() = runTest {
        val service = buildService()

        service.storeAuthTokens(authResponse(refreshToken = null))

        assertThat(tokenStorage.hasRefreshToken()).isFalse()
    }

    @Test
    fun `signOut - transitions to Unauthenticated`() = runTest {
        val service = buildService()
        service.storeAuthTokens(authResponse())

        service.signOut()

        service.authState.test {
            assertThat(awaitItem()).isEqualTo(AuthState.Unauthenticated)
            cancelAndIgnoreRemainingEvents()
        }
    }

    @Test
    fun `signOut - clears both access and refresh tokens from storage`() = runTest {
        val service = buildService()
        service.storeAuthTokens(authResponse(refreshToken = "refresh"))

        service.signOut()

        assertThat(tokenStorage.hasAccessToken()).isFalse()
        assertThat(tokenStorage.hasRefreshToken()).isFalse()
    }

    @Test
    fun `storeAuthTokens then signOut - state toggles correctly`() = runTest {
        val service = buildService()

        service.authState.test {
            assertThat(awaitItem()).isEqualTo(AuthState.Unauthenticated)

            service.storeAuthTokens(authResponse())
            assertThat(awaitItem()).isEqualTo(AuthState.Authenticated)

            service.signOut()
            assertThat(awaitItem()).isEqualTo(AuthState.Unauthenticated)

            cancelAndIgnoreRemainingEvents()
        }
    }

    // --- helpers ---

    private fun buildService() = OlorinAuthService(apiClient, tokenStorage, logger)

    private fun authResponse(
        accessToken: String = "access-token",
        refreshToken: String? = "refresh-token",
        expiresIn: Int? = 3600,
    ) = OlorinAuthService.AuthResponse(
        accessToken = accessToken,
        refreshToken = refreshToken,
        user = OlorinAuthService.UserData(
            id = "user-1",
            email = "user@test.com",
            name = "Test User",
            role = "user",
            isActive = true,
        ),
        expiresIn = expiresIn,
    )
}
