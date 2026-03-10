package tv.bayit.plus.feature.auth.tvlogin

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable
import retrofit2.http.Body
import retrofit2.http.POST
import tv.bayit.plus.core.auth.AuthState
import tv.bayit.plus.core.auth.OlorinAuthService
import tv.bayit.plus.core.common.logging.BayitLogger
import tv.bayit.plus.core.common.i18n.BayitStringProvider
import tv.bayit.plus.core.network.api.BayitApiClient
import javax.inject.Inject

@HiltViewModel
class TVLoginViewModel @Inject constructor(
    private val olorinAuthService: OlorinAuthService,
    private val apiClient: BayitApiClient,
    private val logger: BayitLogger,
    private val stringProvider: BayitStringProvider,
) : ViewModel() {

    private val _uiState = MutableStateFlow<TVLoginUiState>(TVLoginUiState.Idle)
    val uiState: StateFlow<TVLoginUiState> = _uiState.asStateFlow()

    val authState: StateFlow<AuthState> = olorinAuthService.authState

    private val pairingApi: DevicePairingApi by lazy { apiClient.createService() }

    fun initiate(sessionId: String, token: String) {
        viewModelScope.launch { verifyAndConnect(sessionId, token) }
    }

    fun retry(sessionId: String, token: String) {
        viewModelScope.launch { verifyAndConnect(sessionId, token) }
    }

    fun completeAuthentication(sessionId: String) {
        if (olorinAuthService.authState.value !is AuthState.Authenticated) {
            logger.warning("User not authenticated for TV login completion")
            _uiState.value = TVLoginUiState.Failed(stringProvider.string("auth.tvLogin.signInFirst"))
            return
        }
        viewModelScope.launch {
            _uiState.value = TVLoginUiState.Authenticating
            try {
                apiClient.safeApiCall {
                    pairingApi.completeToken(CompleteTokenRequest(sessionId = sessionId))
                }
                logger.info("TV login completed", mapOf("session_id" to sessionId))
                _uiState.value = TVLoginUiState.Authenticated
            } catch (e: Exception) {
                logger.error("TV login completion failed", error = e, metadata = mapOf("session_id" to sessionId))
                _uiState.value = TVLoginUiState.Failed(e.message ?: stringProvider.string("auth.tvLogin.completionFailed"))
            }
        }
    }

    private suspend fun verifyAndConnect(sessionId: String, token: String) {
        _uiState.value = TVLoginUiState.Loading
        try {
            val verified = apiClient.safeApiCall {
                pairingApi.verify(VerifyRequest(sessionId = sessionId, token = token))
            }
            if (!verified.valid) {
                _uiState.value = if (verified.status == "expired") TVLoginUiState.Expired
                    else TVLoginUiState.Failed(stringProvider.string("auth.tvLogin.invalidSession"))
                return
            }
            apiClient.safeApiCall {
                pairingApi.companionConnect(
                    CompanionConnectRequest(sessionId = sessionId, deviceType = "android"),
                )
            }
            logger.info("TV companion connected", mapOf("session_id" to sessionId))
            _uiState.value = TVLoginUiState.CompanionConnected
        } catch (e: Exception) {
            logger.error("TV login verification failed", error = e, metadata = mapOf("session_id" to sessionId))
            _uiState.value = TVLoginUiState.Failed(e.message ?: stringProvider.string("auth.tvLogin.verificationFailed"))
        }
    }

    private interface DevicePairingApi {
        @POST("api/v1/auth/device-pairing/verify")
        suspend fun verify(@Body body: VerifyRequest): VerifyResponse

        @POST("api/v1/auth/device-pairing/companion-connect")
        suspend fun companionConnect(@Body body: CompanionConnectRequest)

        @POST("api/v1/auth/device-pairing/v2/complete-token")
        suspend fun completeToken(@Body body: CompleteTokenRequest)
    }

    @Serializable
    private data class VerifyRequest(
        @SerialName("session_id") val sessionId: String,
        val token: String,
    )

    @Serializable
    private data class VerifyResponse(
        val valid: Boolean,
        @SerialName("session_id") val sessionId: String,
        val status: String,
        @SerialName("expires_at") val expiresAt: String,
    )

    @Serializable
    private data class CompanionConnectRequest(
        @SerialName("session_id") val sessionId: String,
        @SerialName("device_type") val deviceType: String,
    )

    @Serializable
    private data class CompleteTokenRequest(
        @SerialName("session_id") val sessionId: String,
    )
}

sealed interface TVLoginUiState {
    data object Idle : TVLoginUiState
    data object Loading : TVLoginUiState
    data object CompanionConnected : TVLoginUiState
    data object Authenticating : TVLoginUiState
    data object Authenticated : TVLoginUiState
    data class Failed(val message: String) : TVLoginUiState
    data object Expired : TVLoginUiState
}
