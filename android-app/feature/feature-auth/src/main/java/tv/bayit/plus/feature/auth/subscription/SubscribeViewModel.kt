package tv.bayit.plus.feature.auth.subscription

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import tv.bayit.plus.core.common.BayitResult
import tv.bayit.plus.core.common.logging.BayitLogger
import tv.bayit.plus.core.data.repository.SubscriptionRepository
import javax.inject.Inject

@HiltViewModel
class SubscribeViewModel @Inject constructor(
    private val subscriptionRepository: SubscriptionRepository,
    private val logger: BayitLogger,
) : ViewModel() {

    private val _uiState = MutableStateFlow<SubscribeUiState>(SubscribeUiState.Loading)
    val uiState: StateFlow<SubscribeUiState> = _uiState.asStateFlow()

    private val _selectedPlanId = MutableStateFlow<String?>(null)
    val selectedPlanId: StateFlow<String?> = _selectedPlanId.asStateFlow()

    private val _selectedBillingPeriod = MutableStateFlow("monthly")
    val selectedBillingPeriod: StateFlow<String> = _selectedBillingPeriod.asStateFlow()

    init {
        loadPlans()
    }

    fun selectPlan(planId: String) {
        _selectedPlanId.value = planId
        logger.debug("Plan selected", mapOf("planId" to planId))
    }

    fun selectBillingPeriod(period: String) {
        _selectedBillingPeriod.value = period
        logger.debug("Billing period selected", mapOf("period" to period))
    }

    fun startCheckout() {
        val planId = _selectedPlanId.value
        if (planId == null) {
            val current = _uiState.value as? SubscribeUiState.Success ?: return
            _uiState.value = current.copy(checkoutError = "Please select a plan")
            return
        }

        viewModelScope.launch {
            val current = _uiState.value as? SubscribeUiState.Success ?: return@launch
            _uiState.value = current.copy(isProcessingCheckout = true, checkoutError = null)

            logger.debug("Starting checkout", mapOf("planId" to planId, "billingPeriod" to _selectedBillingPeriod.value))

            when (val result = subscriptionRepository.createCheckout(planId, _selectedBillingPeriod.value)) {
                is BayitResult.Success -> {
                    val checkoutUrl = result.data
                    logger.info("Checkout URL created", mapOf("planId" to planId))
                    _uiState.value = current.copy(
                        isProcessingCheckout = false,
                        checkoutUrl = checkoutUrl,
                        checkoutError = null,
                    )
                }
                is BayitResult.Error -> {
                    logger.error("Checkout creation failed", result.exception)
                    _uiState.value = current.copy(
                        isProcessingCheckout = false,
                        checkoutError = result.message ?: result.exception.message,
                    )
                }
                is BayitResult.Loading -> Unit
            }
        }
    }

    fun retry() {
        _uiState.value = SubscribeUiState.Loading
        loadPlans()
    }

    private fun loadPlans() {
        viewModelScope.launch {
            logger.debug("Loading subscription plans")
            when (val result = subscriptionRepository.getPlans()) {
                is BayitResult.Success -> {
                    val plans = result.data
                    logger.info("Subscription plans loaded", mapOf("count" to plans.size.toString()))
                    _uiState.value = SubscribeUiState.Success(
                        plans = plans,
                        isProcessingCheckout = false,
                        checkoutUrl = null,
                        checkoutError = null,
                    )
                }
                is BayitResult.Error -> {
                    logger.error("Plans load failed", result.exception)
                    _uiState.value = SubscribeUiState.Error(
                        message = result.message ?: result.exception.message.orEmpty(),
                    )
                }
                is BayitResult.Loading -> Unit
            }
        }
    }
}

sealed interface SubscribeUiState {
    data object Loading : SubscribeUiState

    data class Success(
        val plans: List<Any>,
        val isProcessingCheckout: Boolean,
        val checkoutUrl: String?,
        val checkoutError: String?,
    ) : SubscribeUiState

    data class Error(val message: String) : SubscribeUiState
}
