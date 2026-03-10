package tv.bayit.plus.feature.auth.subscription

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import tv.bayit.plus.core.common.BayitResult
import tv.bayit.plus.core.common.i18n.BayitStringProvider
import tv.bayit.plus.core.common.logging.BayitLogger
import tv.bayit.plus.core.data.repository.SubscriptionRepository
import javax.inject.Inject

@HiltViewModel
class SubscriptionGateViewModel @Inject constructor(
    private val subscriptionRepository: SubscriptionRepository,
    private val logger: BayitLogger,
    private val stringProvider: BayitStringProvider,
) : ViewModel() {

    private val _uiState = MutableStateFlow<SubscriptionGateUiState>(SubscriptionGateUiState.Loading)
    val uiState: StateFlow<SubscriptionGateUiState> = _uiState.asStateFlow()

    init {
        checkSubscriptionStatus()
    }

    fun retry() {
        _uiState.value = SubscriptionGateUiState.Loading
        checkSubscriptionStatus()
    }

    private fun checkSubscriptionStatus() {
        viewModelScope.launch {
            logger.debug("Checking subscription status for gate")
            when (val result = subscriptionRepository.getCurrentSubscription()) {
                is BayitResult.Success -> {
                    val subscription = result.data
                    logger.info("Subscription status retrieved", mapOf("hasSubscription" to (subscription != null).toString()))
                    _uiState.value = SubscriptionGateUiState.GateRequired(
                        featureName = stringProvider.string("subscription.gate.defaultFeature"),
                        requiresSubscription = subscription == null,
                    )
                }
                is BayitResult.Error -> {
                    logger.error("Subscription status check failed", result.exception)
                    _uiState.value = SubscriptionGateUiState.Error(
                        message = result.message ?: result.exception.message.orEmpty(),
                    )
                }
                is BayitResult.Loading -> Unit
            }
        }
    }
}

sealed interface SubscriptionGateUiState {
    data object Loading : SubscriptionGateUiState

    data class GateRequired(
        val featureName: String,
        val requiresSubscription: Boolean,
    ) : SubscriptionGateUiState

    data class Error(val message: String) : SubscriptionGateUiState
}
