package tv.bayit.plus.feature.settings.subscription

import android.content.Context
import android.content.Intent
import android.net.Uri
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.async
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import tv.bayit.plus.core.common.BayitResult
import tv.bayit.plus.core.common.logging.BayitLogger
import tv.bayit.plus.core.data.repository.BetaCreditsRepository
import tv.bayit.plus.core.data.repository.UserRepository
import tv.bayit.plus.core.model.UserResponse
import javax.inject.Inject

@HiltViewModel
class SubscriptionViewModel @Inject constructor(
    private val userRepository: UserRepository,
    private val betaCreditsRepository: BetaCreditsRepository,
    private val logger: BayitLogger,
) : ViewModel() {

    private val _uiState = MutableStateFlow<SubscriptionUiState>(SubscriptionUiState.Loading)
    val uiState: StateFlow<SubscriptionUiState> = _uiState.asStateFlow()

    init {
        loadSubscription()
    }

    private fun loadSubscription() {
        viewModelScope.launch {
            logger.debug("Loading subscription info")
            val userDeferred = async { userRepository.getCurrentUser() }
            val creditsDeferred = async { betaCreditsRepository.getBalance() }

            val userResult = userDeferred.await()
            val creditsResult = creditsDeferred.await()

            when (userResult) {
                is BayitResult.Success -> {
                    val user = userResult.data as? UserResponse
                    val sub = user?.subscription
                    val remaining = (creditsResult as? BayitResult.Success)?.data ?: 0
                    _uiState.value = SubscriptionUiState.Success(
                        plan = sub?.plan ?: "Free",
                        status = sub?.status ?: "active",
                        startDate = sub?.startDate.orEmpty(),
                        endDate = sub?.endDate.orEmpty(),
                        isBetaUser = user?.isBetaUser == true,
                        remainingCredits = remaining,
                        totalCredits = BETA_CREDITS_TOTAL,
                    )
                    logger.info("Subscription loaded", mapOf("plan" to (sub?.plan ?: "free"), "credits" to remaining.toString()))
                }
                is BayitResult.Error -> {
                    logger.error("Failed to load subscription", userResult.exception)
                    _uiState.value = SubscriptionUiState.Error(
                        message = userResult.message ?: userResult.exception.message.orEmpty(),
                    )
                }
                is BayitResult.Loading -> Unit
            }
        }
    }

    /**
     * Opens the Google Play subscription management page for Bayit+.
     */
    fun manageSubscription(context: Context) {
        val uri = Uri.parse(PLAY_SUBSCRIPTION_DEEPLINK)
        val intent = Intent(Intent.ACTION_VIEW, uri).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK
        }
        context.startActivity(intent)
        logger.info("Opened Play Store subscription management")
    }

    fun retry() {
        _uiState.value = SubscriptionUiState.Loading
        loadSubscription()
    }

    companion object {
        private const val PLAY_SUBSCRIPTION_DEEPLINK =
            "https://play.google.com/store/account/subscriptions?package=tv.bayit.plus"

        /** Free tier one-time AI credit allocation per user. */
        internal const val BETA_CREDITS_TOTAL = 50
    }
}

sealed interface SubscriptionUiState {
    data object Loading : SubscriptionUiState

    data class Success(
        val plan: String,
        val status: String,
        val startDate: String,
        val endDate: String,
        val isBetaUser: Boolean,
        val remainingCredits: Int = 0,
        val totalCredits: Int = 0,
    ) : SubscriptionUiState

    data class Error(val message: String) : SubscriptionUiState
}
