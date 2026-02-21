package tv.bayit.plus.core.network

/**
 * Provides the current authentication token for Bearer header injection.
 *
 * The host app implements this -- reading RS256 tokens from secure storage --
 * so the networking layer never depends on a specific auth SDK.
 *
 * Mirrors the iOS [AuthTokenProvider] protocol from BayitNetworking.
 */
interface AuthTokenProvider {

    /**
     * Returns the current Bearer token, or null if the user is not authenticated.
     *
     * This is intentionally non-suspend: the underlying implementation reads from
     * EncryptedSharedPreferences (synchronous), so no coroutine overhead is needed
     * and OkHttp interceptors can call it without runBlocking.
     *
     * A null return means "unauthenticated on purpose".
     */
    fun getToken(): String?

    /**
     * Forces a token refresh and returns the new token.
     *
     * Called by [tv.bayit.plus.core.network.authenticator.TokenAuthenticator] when
     * the server responds with 401, allowing a single transparent retry with a fresh
     * token. Suspend because it makes a network call.
     */
    suspend fun refreshToken(): String?

    /**
     * Clears stored tokens, typically on explicit logout.
     */
    suspend fun clearToken()
}
