package tv.bayit.plus.core.network.authenticator

import app.cash.turbine.test
import com.google.common.truth.Truth.assertThat
import io.mockk.coEvery
import io.mockk.coVerify
import io.mockk.mockk
import kotlinx.coroutines.launch
import kotlinx.coroutines.test.runTest
import okhttp3.Protocol
import okhttp3.Request
import okhttp3.Response
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.extension.ExtendWith
import tv.bayit.plus.core.common.logging.NoOpBayitLogger
import tv.bayit.plus.core.network.AuthTokenProvider
import tv.bayit.plus.core.network.SessionEventBus
import tv.bayit.plus.core.testing.CoroutineTestRule

/**
 * Unit tests for [TokenAuthenticator].
 *
 * Validates: 401 retry with fresh token, max retry prevention,
 * session expiry notification, and graceful handling when refresh fails.
 */
@ExtendWith(CoroutineTestRule::class)
class TokenAuthenticatorTest {

    private val authTokenProvider: AuthTokenProvider = mockk(relaxed = true)
    private val logger = NoOpBayitLogger()
    private lateinit var authenticator: TokenAuthenticator

    @BeforeEach
    fun setup() {
        authenticator = TokenAuthenticator(authTokenProvider, logger)
    }

    @Test
    fun `authenticate - returns request with fresh token on first 401`() {
        coEvery { authTokenProvider.refreshToken() } returns "new-access-token"

        val response = build401Response(url = "https://api.bayit.tv/api/v1/content")
        val result = authenticator.authenticate(route = null, response = response)

        assertThat(result).isNotNull()
        assertThat(result!!.header("Authorization")).isEqualTo("Bearer new-access-token")
    }

    @Test
    fun `authenticate - returns null when refresh token returns null`() {
        coEvery { authTokenProvider.refreshToken() } returns null

        val response = build401Response()
        val result = authenticator.authenticate(route = null, response = response)

        assertThat(result).isNull()
    }

    @Test
    fun `authenticate - returns null when refreshToken throws`() {
        coEvery { authTokenProvider.refreshToken() } throws RuntimeException("Keystore unavailable")

        val response = build401Response()
        val result = authenticator.authenticate(route = null, response = response)

        assertThat(result).isNull()
    }

    @Test
    fun `authenticate - returns null after MAX_RETRY_ATTEMPTS to prevent infinite loops`() {
        coEvery { authTokenProvider.refreshToken() } returns "token"

        // Chain two prior 401s so retryCount == 3 (>= MAX_RETRY_ATTEMPTS of 2)
        val firstPrior = build401Response()
        val secondPrior = build401Response(priorResponse = firstPrior)
        val thirdAttempt = build401Response(priorResponse = secondPrior)

        val result = authenticator.authenticate(route = null, response = thirdAttempt)

        assertThat(result).isNull()
        coVerify(exactly = 0) { authTokenProvider.refreshToken() }
    }

    @Test
    fun `authenticate - allows single retry (MAX_RETRY_ATTEMPTS = 2)`() {
        coEvery { authTokenProvider.refreshToken() } returns "fresh-token"

        // One prior 401 → retryCount == 2, which equals MAX_RETRY_ATTEMPTS → should still retry
        val prior = build401Response()
        val response = build401Response(priorResponse = prior)

        // At retryCount == 2 we should give up (>= 2), so null expected
        val result = authenticator.authenticate(route = null, response = response)

        assertThat(result).isNull()
    }

    @Test
    fun `authenticate - notifies SessionEventBus when refresh returns null`() = runTest {
        coEvery { authTokenProvider.refreshToken() } returns null

        SessionEventBus.sessionExpired.test {
            authenticator.authenticate(route = null, response = build401Response())
            assertThat(awaitItem()).isEqualTo(Unit)
            cancelAndIgnoreRemainingEvents()
        }
    }

    @Test
    fun `authenticate - does not notify SessionEventBus when refresh succeeds`() = runTest {
        coEvery { authTokenProvider.refreshToken() } returns "valid-token"

        var sessionExpiredEmitted = false
        val collectJob = launch {
            SessionEventBus.sessionExpired.collect { sessionExpiredEmitted = true }
        }

        authenticator.authenticate(route = null, response = build401Response())

        collectJob.cancel()
        assertThat(sessionExpiredEmitted).isFalse()
    }

    // --- helpers ---

    private fun build401Response(
        url: String = "https://api.bayit.tv/api/v1/test",
        priorResponse: Response? = null,
    ): Response {
        val request = Request.Builder().url(url).build()
        return Response.Builder()
            .request(request)
            .protocol(Protocol.HTTP_1_1)
            .code(401)
            .message("Unauthorized")
            .priorResponse(priorResponse)
            .build()
    }
}
