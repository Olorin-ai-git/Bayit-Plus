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
     * Implementations should refresh expired tokens before returning.
     * Throwing indicates a transient failure (keystore unavailable, network error
     * during refresh). A null return means "unauthenticated on purpose".
     */
    suspend fun getToken(): String?

    /**
     * Forces a token refresh and returns the new token.
     *
     * Called by [AuthInterceptor] when the server responds with 401,
     * allowing a single transparent retry with a fresh token.
     */
    suspend fun refreshToken(): String?

    /**
     * Clears stored tokens, typically on explicit logout.
     */
    suspend fun clearToken()
}
