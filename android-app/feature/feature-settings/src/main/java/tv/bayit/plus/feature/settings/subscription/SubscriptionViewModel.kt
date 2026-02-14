package tv.bayit.plus.feature.settings.subscription

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import tv.bayit.plus.core.common.BayitResult
import tv.bayit.plus.core.common.logging.BayitLogger
import tv.bayit.plus.core.data.repository.UserRepository
import tv.bayit.plus.core.model.UserResponse
import javax.inject.Inject

@HiltViewModel
class SubscriptionViewModel @Inject constructor(
    private val userRepository: UserRepository,
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
            when (val result = userRepository.getCurrentUser()) {
                is BayitResult.Success -> {
                    val user = result.data as? UserResponse
                    val sub = user?.subscription
                    _uiState.value = SubscriptionUiState.Success(
                        plan = sub?.plan ?: "Free",
                        status = sub?.status ?: "active",
                        startDate = sub?.startDate.orEmpty(),
                        endDate = sub?.endDate.orEmpty(),
                        isBetaUser = user?.isBetaUser == true,
                    )
                    logger.info("Subscription loaded", mapOf("plan" to (sub?.plan ?: "free")))
                }
                is BayitResult.Error -> {
                    logger.error("Failed to load subscription", result.exception)
                    _uiState.value = SubscriptionUiState.Error(
                        message = result.message ?: result.exception.message.orEmpty(),
                    )
                }
                is BayitResult.Loading -> Unit
            }
        }
    }

    fun retry() {
        _uiState.value = SubscriptionUiState.Loading
        loadSubscription()
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
    ) : SubscriptionUiState

    data class Error(val message: String) : SubscriptionUiState
}
