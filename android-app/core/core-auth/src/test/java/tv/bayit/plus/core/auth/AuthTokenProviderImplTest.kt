package tv.bayit.plus.core.auth

import com.google.common.truth.Truth.assertThat
import dagger.Lazy
import io.mockk.coEvery
import io.mockk.mockk
import kotlinx.coroutines.test.runTest
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.extension.ExtendWith
import tv.bayit.plus.core.common.logging.NoOpBayitLogger
import tv.bayit.plus.core.common.result.BayitResult
import tv.bayit.plus.core.testing.CoroutineTestRule
import tv.bayit.plus.core.testing.FakeAuthTokenStorage

/**
 * Unit tests for [AuthTokenProviderImpl].
 *
 * Validates: token reads from storage, refresh delegation, and clear-on-signout.
 */
@ExtendWith(CoroutineTestRule::class)
class AuthTokenProviderImplTest {

    private lateinit var tokenStorage: FakeAuthTokenStorage
    private val authService: OlorinAuthService = mockk(relaxed = true)
    private val logger = NoOpBayitLogger()

    @BeforeEach
    fun setup() {
        tokenStorage = FakeAuthTokenStorage()
    }

    @Test
    fun `getToken - returns null when storage is empty`() {
        val provider = buildProvider()

        assertThat(provider.getToken()).isNull()
    }

    @Test
    fun `getToken - returns stored access token when valid`() {
        tokenStorage.saveAccessToken("bearer-xyz", expiresAt = Long.MAX_VALUE)
        val provider = buildProvider()

        assertThat(provider.getToken()).isEqualTo("bearer-xyz")
    }

    @Test
    fun `getToken - returns null when stored access token is expired`() {
        tokenStorage.saveAccessToken("old-token", expiresAt = 1_000L) // epoch ms
        val provider = buildProvider()

        assertThat(provider.getToken()).isNull()
    }

    @Test
    fun `refreshToken - returns null when no refresh token in storage`() = runTest {
        val provider = buildProvider()

        val result = provider.refreshToken()

        assertThat(result).isNull()
    }

    @Test
    fun `refreshToken - delegates to OlorinAuthService and returns new access token`() = runTest {
        tokenStorage.saveRefreshToken("refresh-token", expiresAt = Long.MAX_VALUE)
        coEvery { authService.refreshAccessToken("refresh-token") } returns BayitResult.success("new-access-token")
        val provider = buildProvider()

        val result = provider.refreshToken()

        assertThat(result).isEqualTo("new-access-token")
    }

    @Test
    fun `refreshToken - clears tokens and returns null when OlorinAuthService fails`() = runTest {
        tokenStorage.saveAccessToken("at", Long.MAX_VALUE)
        tokenStorage.saveRefreshToken("rt", Long.MAX_VALUE)
        coEvery { authService.refreshAccessToken("rt") } returns BayitResult.failure(
            tv.bayit.plus.core.common.result.BayitError.Authentication("expired", null)
        )
        val provider = buildProvider()

        val result = provider.refreshToken()

        assertThat(result).isNull()
        assertThat(tokenStorage.hasAccessToken()).isFalse()
        assertThat(tokenStorage.hasRefreshToken()).isFalse()
    }

    @Test
    fun `clearToken - removes stored tokens`() = runTest {
        tokenStorage.saveAccessToken("at", Long.MAX_VALUE)
        tokenStorage.saveRefreshToken("rt", Long.MAX_VALUE)
        val provider = buildProvider()

        provider.clearToken()

        assertThat(tokenStorage.hasAccessToken()).isFalse()
        assertThat(tokenStorage.hasRefreshToken()).isFalse()
    }

    // --- helpers ---

    private fun buildProvider(): AuthTokenProviderImpl {
        val lazyAuth = Lazy { authService }
        return AuthTokenProviderImpl(tokenStorage, lazyAuth, logger)
    }
}
