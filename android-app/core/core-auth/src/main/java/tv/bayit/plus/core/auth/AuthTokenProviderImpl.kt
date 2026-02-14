package tv.bayit.plus.core.auth

import tv.bayit.plus.core.common.result.BayitResult
import tv.bayit.plus.core.network.AuthTokenProvider
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class AuthTokenProviderImpl @Inject constructor(
    private val firebaseAuthService: FirebaseAuthService,
) : AuthTokenProvider {

    override suspend fun getToken(): String? {
        return when (val result = firebaseAuthService.getIdToken(forceRefresh = false)) {
            is BayitResult.Success -> result.data
            is BayitResult.Failure -> null
        }
    }

    override suspend fun refreshToken(): String? {
        return when (val result = firebaseAuthService.getIdToken(forceRefresh = true)) {
            is BayitResult.Success -> result.data
            is BayitResult.Failure -> null
        }
    }

    override suspend fun clearToken() {
        firebaseAuthService.signOut()
    }
}
