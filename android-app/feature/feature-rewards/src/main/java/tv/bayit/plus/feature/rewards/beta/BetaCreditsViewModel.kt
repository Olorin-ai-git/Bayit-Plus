package tv.bayit.plus.feature.rewards.beta

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import tv.bayit.plus.core.common.BayitResult
import tv.bayit.plus.core.common.logging.BayitLogger
import tv.bayit.plus.core.data.repository.BetaCreditsRepository
import javax.inject.Inject

@HiltViewModel
class BetaCreditsViewModel @Inject constructor(
    private val betaCreditsRepository: BetaCreditsRepository,
    private val logger: BayitLogger,
) : ViewModel() {

    private val _uiState = MutableStateFlow<BetaCreditsUiState>(BetaCreditsUiState.Loading)
    val uiState: StateFlow<BetaCreditsUiState> = _uiState.asStateFlow()

    init {
        loadCredits()
    }

    fun refresh() {
        val current = _uiState.value
        if (current is BetaCreditsUiState.Success) {
            _uiState.value = current.copy(isRefreshing = true)
        }
        loadCredits()
    }

    fun retry() {
        _uiState.value = BetaCreditsUiState.Loading
        loadCredits()
    }

    fun redeemCredits(amount: Int, featureId: String) {
        val current = _uiState.value as? BetaCreditsUiState.Success ?: return
        _uiState.value = current.copy(redeemingFeatureId = featureId)

        viewModelScope.launch {
            logger.debug("Redeeming credits", mapOf("amount" to amount.toString(), "featureId" to featureId))
            when (val result = betaCreditsRepository.redeemCredits(amount, featureId)) {
                is BayitResult.Success -> {
                    logger.info("Credits redeemed", mapOf("featureId" to featureId))
                    loadCredits()
                }
                is BayitResult.Error -> {
                    logger.error("Credit redemption failed", result.exception, mapOf("featureId" to featureId))
                    _uiState.value = current.copy(redeemingFeatureId = null)
                }
                is BayitResult.Loading -> Unit
            }
        }
    }

    private fun loadCredits() {
        viewModelScope.launch {
            logger.debug("Loading beta credits")

            when (val balanceResult = betaCreditsRepository.getBalance()) {
                is BayitResult.Success -> {
                    val balance = balanceResult.data

                    val history = when (val historyResult = betaCreditsRepository.getTransactionHistory()) {
                        is BayitResult.Success -> historyResult.data
                        else -> emptyList()
                    }

                    val features = when (val featuresResult = betaCreditsRepository.getEligibleFeatures()) {
                        is BayitResult.Success -> featuresResult.data
                        else -> emptyList()
                    }

                    logger.info(
                        "Beta credits loaded",
                        mapOf(
                            "balance" to balance.toString(),
                            "historyCount" to history.size.toString(),
                            "featuresCount" to features.size.toString(),
                        ),
                    )

                    _uiState.value = BetaCreditsUiState.Success(
                        balance = balance,
                        transactions = history,
                        eligibleFeatures = features,
                        isRefreshing = false,
                        redeemingFeatureId = null,
                    )
                }
                is BayitResult.Error -> {
                    logger.error("Beta credits load failed", balanceResult.exception)
                    _uiState.value = BetaCreditsUiState.Error(
                        message = balanceResult.message ?: balanceResult.exception.message.orEmpty(),
                    )
                }
                is BayitResult.Loading -> Unit
            }
        }
    }
}

sealed interface BetaCreditsUiState {
    data object Loading : BetaCreditsUiState

    data class Success(
        val balance: Int,
        val transactions: List<Any>,
        val eligibleFeatures: List<Any>,
        val isRefreshing: Boolean = false,
        val redeemingFeatureId: String? = null,
    ) : BetaCreditsUiState

    data class Error(val message: String) : BetaCreditsUiState
}
